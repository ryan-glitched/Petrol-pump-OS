"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import { asPaisa, formatPKR, toPaisa } from "@/lib/money";
import {
  addDaysISO,
  allocatePayment,
  billingDaysFor,
  normalizePlate,
  outstanding,
  type BillingCycle,
  type OpenItem,
} from "@/lib/domain/credit";
import {
  creditCustomerInput,
  creditCustomerUpdateInput,
  creditPaymentInput,
  creditSaleInput,
  creditVehicleInput,
} from "@/lib/validation/schemas";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const NAME_TAKEN: ActionState = { ok: false, errors: { name: "A customer with this name already exists" } };

// The (branch, lower(name)) unique index catches a duplicate that slips past nameTaken in a race.
function creditError(err: unknown): ActionState {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return NAME_TAKEN;
  return toActionError(err);
}

function refresh() {
  revalidatePath("/credit-customers");
  revalidatePath("/");
}

const plates = (list?: string) =>
  [...new Set((list ?? "").split(/[,\n]/).map(normalizePlate).filter(Boolean))];

async function nameTaken(branchId: string, name: string, exceptId?: string) {
  const hit = await prisma.creditCustomer.findFirst({
    where: { branchId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(hit);
}

/** Everything the customer still owes, oldest first: the opening balance, then unpaid credit sales. */
async function openItems(tx: Tx, customerId: string): Promise<OpenItem[]> {
  const [customer, sales] = await Promise.all([
    tx.creditCustomer.findUniqueOrThrow({ where: { id: customerId } }),
    tx.creditSale.findMany({ where: { customerId, status: { in: ["Due", "Partial"] } }, orderBy: [{ dueDate: "asc" }, { date: "asc" }, { createdAt: "asc" }] }),
  ]);
  const items: OpenItem[] = sales.map((s) => ({ id: s.id, date: s.date, dueDate: s.dueDate, amountPaisa: s.amountPaisa, paidPaisa: s.paidPaisa }));
  if (customer.openingBalancePaisa > customer.openingPaidPaisa) {
    const date = customer.openingDate ?? customer.createdAt.toISOString().slice(0, 10);
    items.unshift({ id: null, date, dueDate: date, amountPaisa: customer.openingBalancePaisa, paidPaisa: customer.openingPaidPaisa });
  }
  return items;
}

export async function createCreditCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("manageCredit");
    const parsed = parseForm(creditCustomerInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    if (await nameTaken(branchId, d.name)) return NAME_TAKEN;

    const row = await prisma.creditCustomer.create({
      data: {
        branchId,
        name: d.name,
        company: d.company,
        phone: d.phone,
        cnic: d.cnic,
        ntn: d.ntn,
        address: d.address,
        notes: d.notes,
        creditLimitPaisa: d.creditLimit === undefined ? null : toPaisa(d.creditLimit),
        openingBalancePaisa: d.openingBalance ? toPaisa(d.openingBalance) : 0,
        openingDate: d.openingBalance ? d.openingDate : null,
        billingCycle: d.billingCycle,
        billingDays: billingDaysFor(d.billingCycle, d.billingDays),
        vehicles: { create: plates(d.vehicles).map((plate) => ({ plate })) },
      },
      include: { vehicles: true },
    });
    await writeAudit({ session, action: "create", entity: "CreditCustomer", entityId: row.id, branchId, after: row });
    refresh();
    return { ok: true, message: `${row.name} added${row.vehicles.length ? ` with ${row.vehicles.length} vehicle(s)` : ""}.` };
  } catch (err) {
    return creditError(err);
  }
}

export async function updateCreditCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("manageCredit");
    const parsed = parseForm(creditCustomerUpdateInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const before = await prisma.creditCustomer.findFirst({ where: { id: d.customerId, branchId } });
    if (!before) return { ok: false, errors: { customerId: "Select a customer" } };
    if (d.name && (await nameTaken(branchId, d.name, before.id))) return NAME_TAKEN;
    const cycle = (d.billingCycle ?? before.billingCycle) as BillingCycle;
    const row = await prisma.creditCustomer.update({
      where: { id: before.id },
      data: {
        name: d.name ?? before.name,
        company: d.company ?? before.company,
        phone: d.phone ?? before.phone,
        cnic: d.cnic ?? before.cnic,
        ntn: d.ntn ?? before.ntn,
        address: d.address ?? before.address,
        creditLimitPaisa: d.removeLimit ? null : d.creditLimit === undefined ? before.creditLimitPaisa : toPaisa(d.creditLimit),
        billingCycle: cycle,
        billingDays: d.billingCycle || d.billingDays ? billingDaysFor(cycle, d.billingDays ?? before.billingDays) : before.billingDays,
        active: d.active ? d.active === "true" : before.active,
      },
    });
    await writeAudit({ session, action: "update", entity: "CreditCustomer", entityId: row.id, branchId, before, after: row });
    refresh();
    return { ok: true, message: `${row.name} saved.` };
  } catch (err) {
    return creditError(err);
  }
}

export async function addCreditVehicle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("credit");
    const parsed = parseForm(creditVehicleInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const customer = await prisma.creditCustomer.findFirst({ where: { id: parsed.data.customerId, branchId } });
    if (!customer) return { ok: false, errors: { customerId: "Select a customer" } };
    const plate = normalizePlate(parsed.data.plate);
    const existing = await prisma.creditVehicle.findUnique({ where: { customerId_plate: { customerId: customer.id, plate } } });
    if (existing) return { ok: false, errors: { plate: `${plate} is already on ${customer.name}'s account` } };
    const row = await prisma.creditVehicle.create({ data: { customerId: customer.id, plate } });
    await writeAudit({ session, action: "create", entity: "CreditVehicle", entityId: row.id, branchId, after: row });
    refresh();
    return { ok: true, message: `${plate} added to ${customer.name}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createCreditSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("credit");
    const parsed = parseForm(creditSaleInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;

    const customer = await prisma.creditCustomer.findFirst({ where: { id: d.customerId, branchId, active: true }, include: { vehicles: { where: { active: true } } } });
    if (!customer) return { ok: false, errors: { customerId: "Select an active customer" } };
    if (customer.vehicles.length > 0 && !d.vehicleId) return { ok: false, errors: { vehicleId: "Select the vehicle that was filled" } };
    if (d.vehicleId && !customer.vehicles.some((v) => v.id === d.vehicleId)) {
      return { ok: false, errors: { vehicleId: `This vehicle isn't on ${customer.name}'s account` } };
    }
    const product = await prisma.product.findFirst({ where: { id: d.productId, kind: "FUEL", active: true }, select: { id: true } });
    if (!product) return { ok: false, errors: { productId: "Select an active fuel product" } };

    const amountPaisa = toPaisa(d.amount);
    const { row, owedBefore } = await prisma.$transaction(async (tx) => {
      const owedBefore = (await openItems(tx, customer.id)).reduce((sum, i) => sum + outstanding(i), 0);
      const row = await tx.creditSale.create({
        data: {
          branchId,
          customerId: customer.id,
          vehicleId: d.vehicleId || null,
          productId: d.productId,
          date: d.date,
          litres: d.litres,
          amountPaisa,
          paidPaisa: 0,
          status: "Due",
          dueDate: addDaysISO(d.date, customer.billingDays),
        },
      });
      return { row, owedBefore };
    });
    await writeAudit({ session, action: "create", entity: "CreditSale", entityId: row.id, branchId, after: row });
    refresh();

    const owed = owedBefore + amountPaisa;
    const overBy = customer.creditLimitPaisa === null ? 0 : owed - customer.creditLimitPaisa;
    const base = `Credit sale saved. ${customer.name} now owes ${formatPKR(asPaisa(owed))}, due by ${row.dueDate}.`;
    return { ok: true, message: overBy > 0 ? `${base} Warning: over the credit limit by ${formatPKR(asPaisa(overBy))}.` : base };
  } catch (err) {
    return toActionError(err);
  }
}

export async function recordCreditPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("credit");
    const parsed = parseForm(creditPaymentInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const customer = await prisma.creditCustomer.findFirst({ where: { id: d.customerId, branchId } });
    if (!customer) return { ok: false, errors: { customerId: "Select a customer" } };
    const amountPaisa = toPaisa(d.amount);

    const result = await prisma.$transaction(async (tx) => {
      // One payment at a time per customer, so two cashiers can't apply money to the same bill twice.
      await tx.$queryRaw`SELECT "id" FROM "CreditCustomer" WHERE "id" = ${customer.id} FOR UPDATE`;
      const items = await openItems(tx, customer.id);
      const owed = items.reduce((sum, i) => sum + outstanding(i), 0);
      if (amountPaisa > owed) return { ok: false as const, owed };

      const { allocations } = allocatePayment(items, amountPaisa);
      for (const a of allocations) {
        if (a.id === null) {
          await tx.creditCustomer.update({ where: { id: customer.id }, data: { openingPaidPaisa: a.paidPaisa } });
        } else {
          await tx.creditSale.update({ where: { id: a.id }, data: { paidPaisa: a.paidPaisa, status: a.fullyPaid ? "Paid" : "Partial" } });
        }
      }
      const payment = await tx.creditPayment.create({
        data: { branchId, customerId: customer.id, date: d.date, amountPaisa, method: d.method, reference: d.reference, notes: d.notes },
      });
      return { ok: true as const, owed, payment, bills: allocations.filter((a) => a.id !== null).length };
    });
    if (!result.ok) {
      return {
        ok: false,
        errors: { amount: result.owed === 0 ? `${customer.name} owes nothing right now` : `${customer.name} only owes ${formatPKR(asPaisa(result.owed))}` },
      };
    }
    await writeAudit({ session, action: "create", entity: "CreditPayment", entityId: result.payment.id, branchId, after: result.payment });
    refresh();
    const left = result.owed - amountPaisa;
    return { ok: true, message: `Payment of ${formatPKR(asPaisa(amountPaisa))} saved. ${customer.name} now owes ${formatPKR(asPaisa(left))}.` };
  } catch (err) {
    return toActionError(err);
  }
}
