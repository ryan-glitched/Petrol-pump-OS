"use server";

import { SHIFT_SLOTS } from "@/lib/constants";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import { asPaisa, toPaisa } from "@/lib/money";
import { dipLitres, nozzleAmountPaisa, nozzleLitres } from "@/lib/domain/readings";
import { mobilProfitPaisa, reconcileSales } from "@/lib/domain/sales";
import { recomputeVariance } from "@/lib/queries/variance";
import {
  deliveryInput,
  expenseInput,
  mobilOilInput,
  nozzleReadingInput,
  salesInput,
  shiftInput,
  tankDipInput,
} from "@/lib/validation/schemas";

async function resolveFuelPrice(branchId: string, productId: string, date: string) {
  return prisma.fuelPrice.findFirst({
    where: { branchId, productId, effectiveFrom: { lte: date } },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
  });
}

function previousDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function recordBelongsToBranch(
  model: "shift" | "staff",
  id: string | undefined,
  branchId: string,
  date?: string,
): Promise<boolean> {
  if (!id) return true;
  const record =
    model === "shift"
      ? await prisma.shift.findFirst({
          // The night shift spans midnight, so it may have started the previous day.
          where: {
            id,
            branchId,
            ...(date ? { OR: [{ date }, { date: previousDay(date), shiftSlot: SHIFT_SLOTS[1] }] } : {}),
          },
          select: { id: true },
        })
      : await prisma.staff.findFirst({ where: { id, branchId, active: true }, select: { id: true } });
  return Boolean(record);
}

export async function createShift(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("shifts");
    const parsed = parseForm(shiftInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const [managerValid, cashierValid] = await Promise.all([
      recordBelongsToBranch("staff", d.managerId, branchId),
      recordBelongsToBranch("staff", d.cashierId, branchId),
    ]);
    if (!managerValid) return { ok: false, errors: { managerId: "Manager is not active at this branch" } };
    if (!cashierValid) return { ok: false, errors: { cashierId: "Cashier is not active at this branch" } };
    const row = await prisma.shift.create({
      data: {
        branchId,
        date: d.date,
        shiftSlot: d.shiftSlot,
        managerId: d.managerId || null,
        cashierId: d.cashierId || null,
        fillers: d.fillers || null,
        guards: d.guards || null,
        openingCashPaisa: toPaisa(d.openingCash),
        closingCashPaisa: toPaisa(d.closingCash),
        notes: d.notes || null,
      },
    });
    await writeAudit({ session, action: "create", entity: "Shift", entityId: row.id, branchId, after: row });
    revalidatePath("/shifts");
    return { ok: true, message: "Shift opened." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createNozzleReading(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("readings");
    const parsed = parseForm(nozzleReadingInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;

    const nozzle = await prisma.nozzle.findFirst({ where: { id: d.nozzleId, branchId } });
    if (!nozzle) return { ok: false, errors: { nozzleId: "Unknown nozzle for this branch" } };
    if (!(await recordBelongsToBranch("shift", d.shiftId, branchId, d.date))) {
      return { ok: false, errors: { shiftId: "Pick a shift from this branch with the same date" } };
    }
    if (!(await recordBelongsToBranch("staff", d.staffId, branchId))) {
      return { ok: false, errors: { staffId: "Staff member is not active at this branch" } };
    }

    const fuelPrice = await resolveFuelPrice(branchId, nozzle.productId, d.date);
    if (!fuelPrice) {
      return { ok: false, message: "No fuel price is set for this product. Add a rate in Settings first." };
    }
    const litres = nozzleLitres(d.openingReading, d.closingReading);
    const amountPaisa = nozzleAmountPaisa(litres, asPaisa(fuelPrice.ratePaisa));

    const row = await prisma.$transaction(async (tx) => {
      // Shares a row lock with updateNozzle so a nozzle can't move tanks while a reading is being saved.
      const [locked] = await tx.$queryRaw<{ tankId: string; active: boolean }[]>`
        SELECT "tankId", "active" FROM "Nozzle" WHERE "id" = ${nozzle.id} FOR SHARE`;
      if (!locked?.active || locked.tankId !== nozzle.tankId) return null;
      const reading = await tx.nozzleReading.create({
        data: {
          branchId,
          shiftId: d.shiftId || null,
          nozzleId: nozzle.id,
          productId: nozzle.productId,
          fuelPriceId: fuelPrice.id,
          opening: d.openingReading,
          closing: d.closingReading,
          litres,
          ratePaisa: fuelPrice.ratePaisa,
          dealerMarginPaisaPerL: fuelPrice.dealerMarginPaisaPerL,
          amountPaisa,
          staffId: d.staffId || null,
          date: d.date,
        },
      });
      if (litres > 0) {
        await tx.stockMove.create({
          data: { branchId, tankId: nozzle.tankId, type: "SALE", litres: -litres, refId: reading.id },
        });
      }
      return reading;
    });
    if (!row) {
      return { ok: false, errors: { nozzleId: "This nozzle was just changed or switched off. Reload the page and try again." } };
    }

    await recomputeVariance(branchId, nozzle.tankId, d.date);
    await writeAudit({ session, action: "create", entity: "NozzleReading", entityId: row.id, branchId, after: row });
    revalidatePath("/nozzle-readings");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, message: `Saved ${litres.toLocaleString()} L.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createTankDip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("readings");
    const parsed = parseForm(tankDipInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const tank = await prisma.tank.findFirst({ where: { id: d.tankId, branchId } });
    if (!tank) return { ok: false, errors: { tankId: "Unknown tank for this branch" } };
    if (!(await recordBelongsToBranch("shift", d.shiftId, branchId, d.date))) {
      return { ok: false, errors: { shiftId: "Pick a shift from this branch with the same date" } };
    }

    const row = await prisma.tankDip.create({
      data: {
        branchId,
        shiftId: d.shiftId || null,
        tankId: tank.id,
        date: d.date,
        openingDip: d.openingDip,
        closingDip: d.closingDip,
        litres: dipLitres(d.openingDip, d.closingDip),
        notes: d.notes || null,
      },
    });
    await recomputeVariance(branchId, tank.id, d.date);
    await writeAudit({ session, action: "create", entity: "TankDip", entityId: row.id, branchId, after: row });
    revalidatePath("/tank-dips");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, message: "Tank dip recorded." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createDelivery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("deliveries");
    const parsed = parseForm(deliveryInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const tank = await prisma.tank.findFirst({ where: { id: d.tankId, branchId } });
    if (!tank) return { ok: false, errors: { tankId: "Unknown tank for this branch" } };
    if (tank.productId !== d.productId) {
      return { ok: false, errors: { productId: "Selected fuel does not match the selected tank" } };
    }

    const ratePaisa = toPaisa(d.purchaseRate);
    const costPaisa = Math.round(ratePaisa * d.quantity);

    const row = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.create({
        data: {
          branchId,
          date: d.date,
          supplier: d.supplier,
          productId: d.productId,
          tankId: tank.id,
          quantityL: d.quantity,
          ratePaisa,
          costPaisa,
          invoice: d.invoice,
          vehicle: d.vehicle || null,
          notes: d.notes || null,
        },
      });
      await tx.stockMove.create({
        data: { branchId, tankId: tank.id, type: "DELIVERY", litres: d.quantity, refId: delivery.id },
      });
      return delivery;
    });

    await recomputeVariance(branchId, tank.id, d.date);
    await writeAudit({ session, action: "create", entity: "Delivery", entityId: row.id, branchId, after: row });
    revalidatePath("/fuel-deliveries");
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, message: "Delivery recorded and stock updated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createSalesEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("salesEntry");
    const parsed = parseForm(salesInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    if (!(await recordBelongsToBranch("shift", d.shiftId, branchId, d.date))) {
      return { ok: false, errors: { shiftId: "Pick a shift from this branch with the same date" } };
    }
    const { totalPaisa, diffPaisa } = reconcileSales({
      cashPaisa: toPaisa(d.cashSales),
      cardPaisa: toPaisa(d.cardSales),
      creditPaisa: toPaisa(d.creditSales),
      cashInHandPaisa: toPaisa(d.cashInHand),
    });
    const row = await prisma.salesEntry.create({
      data: {
        branchId,
        shiftId: d.shiftId || null,
        date: d.date,
        cashPaisa: toPaisa(d.cashSales),
        cardPaisa: toPaisa(d.cardSales),
        creditPaisa: toPaisa(d.creditSales),
        totalPaisa,
        cashInHandPaisa: toPaisa(d.cashInHand),
        diffPaisa,
      },
    });
    await writeAudit({ session, action: "create", entity: "SalesEntry", entityId: row.id, branchId, after: row });
    revalidatePath("/sales");
    revalidatePath("/");
    return { ok: true, message: "Sales entry reconciled and saved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createMobilOilSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("mobilOil");
    const parsed = parseForm(mobilOilInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    if (!(await recordBelongsToBranch("staff", d.staffId, branchId))) {
      return { ok: false, errors: { staffId: "Staff member is not active at this branch" } };
    }
    const purchasePaisa = toPaisa(d.purchasePrice);
    const sellingPaisa = toPaisa(d.sellingPrice);
    const row = await prisma.mobilOilSale.create({
      data: {
        branchId,
        date: d.date,
        productName: d.productName,
        qty: d.quantity,
        purchasePaisa,
        sellingPaisa,
        profitPaisa: mobilProfitPaisa(purchasePaisa, sellingPaisa, d.quantity),
        staffId: d.staffId || null,
      },
    });
    await writeAudit({ session, action: "create", entity: "MobilOilSale", entityId: row.id, branchId, after: row });
    revalidatePath("/mobil-oil");
    revalidatePath("/");
    return { ok: true, message: "Mobil oil sale saved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("expenses");
    const parsed = parseForm(expenseInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;

    const row = await prisma.expense.create({
      data: {
        branchId,
        date: d.date,
        category: d.category,
        amountPaisa: toPaisa(d.amount),
        paidBy: d.paidBy,
        description: d.description,
        receiptUrl: d.receiptUrl || null,
      },
    });
    await writeAudit({ session, action: "create", entity: "Expense", entityId: row.id, branchId, after: row });
    revalidatePath("/expenses");
    revalidatePath("/");
    return { ok: true, message: "Expense recorded." };
  } catch (err) {
    return toActionError(err);
  }
}

