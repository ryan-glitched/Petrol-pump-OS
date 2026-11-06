"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import { toPaisa } from "@/lib/money";
import { fuelPriceInput, staffInput } from "@/lib/validation/schemas";

export async function createFuelPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("managePrices");
    const parsed = parseForm(fuelPriceInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const product = await prisma.product.findFirst({
      where: { id: d.productId, kind: "FUEL", active: true },
      select: { id: true },
    });
    if (!product) return { ok: false, errors: { productId: "Select an active fuel product" } };
    const ratePaisa = toPaisa(d.rate);
    const dealerMarginPaisaPerL = toPaisa(d.dealerMargin);
    const row = await prisma.fuelPrice.create({
      data: {
        branchId,
        productId: d.productId,
        ratePaisa,
        dealerMarginPaisaPerL,
        purchaseCostPaisaPerL: ratePaisa - dealerMarginPaisaPerL,
        effectiveFrom: d.effectiveFrom,
        source: "MANUAL",
      },
    });
    await writeAudit({ session, action: "create", entity: "FuelPrice", entityId: row.id, branchId, after: row });
    revalidatePath("/settings");
    revalidatePath("/nozzle-readings");
    return { ok: true, message: "New rate saved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("manageStaff");
    const parsed = parseForm(staffInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const row = await prisma.staff.create({
      data: { branchId, name: d.name, role: d.role, shiftSlot: d.shiftSlot, phone: d.phone, status: d.status },
    });
    await writeAudit({ session, action: "create", entity: "Staff", entityId: row.id, branchId, after: row });
    revalidatePath("/staff");
    return { ok: true, message: "Staff member added." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateVarianceTolerance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("settings");
    const pct = Number(formData.get("varianceTolerancePct"));
    if (!Number.isFinite(pct) || pct < 0 || pct > 10) {
      return { ok: false, errors: { varianceTolerancePct: "Enter a tolerance between 0 and 10%." } };
    }
    const row = await prisma.branch.update({ where: { id: branchId }, data: { varianceTolerancePct: pct } });
    await writeAudit({ session, action: "update", entity: "Branch", entityId: row.id, branchId, after: { varianceTolerancePct: pct } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, message: "Variance tolerance updated." };
  } catch (err) {
    return toActionError(err);
  }
}
