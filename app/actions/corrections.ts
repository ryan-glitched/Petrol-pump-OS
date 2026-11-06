"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import { recomputeVariance } from "@/lib/queries/variance";
import { voidEntryInput, type VoidableKind } from "@/lib/validation/schemas";

const ENTITY: Record<VoidableKind, string> = {
  reading: "NozzleReading",
  dip: "TankDip",
  delivery: "Delivery",
  sales: "SalesEntry",
  expense: "Expense",
};

const PAGES: Record<VoidableKind, string> = {
  reading: "/nozzle-readings",
  dip: "/tank-dips",
  delivery: "/fuel-deliveries",
  sales: "/sales",
  expense: "/expenses",
};

const ALREADY = "This entry was already voided. Reload the page.";

/** Marks an entry void (never deletes it), reverses its stock effect and re-runs the loss check for that tank/day. */
export async function voidEntry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    await requireCapability("voidEntries");
    const parsed = parseForm(voidEntryInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const { entry, reason } = parsed.data;
    const { kind, id } = entry;
    const stamp = { voidedAt: new Date(), voidedById: session.userId, voidReason: reason };
    const where = { id, branchId, voidedAt: null };

    const result = await prisma.$transaction(async (tx) => {
      let tankDay: { tankId: string; date: string } | null = null;
      let before: unknown;
      if (kind === "reading") {
        const row = await tx.nozzleReading.findFirst({ where, include: { nozzle: { select: { tankId: true } } } });
        if (!row || (await tx.nozzleReading.updateMany({ where, data: stamp })).count === 0) return null;
        before = row;
        tankDay = { tankId: row.nozzle.tankId, date: row.date };
      } else if (kind === "dip") {
        const row = await tx.tankDip.findFirst({ where });
        if (!row || (await tx.tankDip.updateMany({ where, data: stamp })).count === 0) return null;
        before = row;
        tankDay = { tankId: row.tankId, date: row.date };
      } else if (kind === "delivery") {
        const row = await tx.delivery.findFirst({ where });
        if (!row || (await tx.delivery.updateMany({ where, data: stamp })).count === 0) return null;
        before = row;
        tankDay = { tankId: row.tankId, date: row.date };
      } else if (kind === "sales") {
        const row = await tx.salesEntry.findFirst({ where });
        if (!row || (await tx.salesEntry.updateMany({ where, data: stamp })).count === 0) return null;
        before = row;
      } else {
        const row = await tx.expense.findFirst({ where });
        if (!row || (await tx.expense.updateMany({ where, data: stamp })).count === 0) return null;
        before = row;
      }

      if (kind === "reading" || kind === "delivery") {
        // Reverse the stock move at the original time, so tank levels before and after later dips stay right.
        const moves = await tx.stockMove.findMany({ where: { refId: id, type: { in: ["SALE", "DELIVERY"] } } });
        for (const m of moves) {
          await tx.stockMove.create({
            data: { branchId, tankId: m.tankId, type: "VOID", litres: -m.litres, refId: id, reason, at: m.at },
          });
        }
      }
      return { tankDay, before };
    });
    if (!result) return { ok: false, errors: { entry: ALREADY } };

    if (result.tankDay) await recomputeVariance(branchId, result.tankDay.tankId, result.tankDay.date);
    await writeAudit({ session, action: "void", entity: ENTITY[kind], entityId: id, branchId, before: result.before, after: { ...stamp } });
    revalidatePath("/corrections");
    revalidatePath(PAGES[kind]);
    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true, message: "Entry voided. It no longer counts anywhere. Re-enter the correct figures on its normal page." };
  } catch (err) {
    return toActionError(err);
  }
}
