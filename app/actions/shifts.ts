"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import { SHIFT_CHANGES, checkShift } from "@/lib/domain/shifts";
import { shiftTotals } from "@/lib/queries/lists";
import { shiftStatusInput } from "@/lib/validation/schemas";

/** Close (Manager+), then approve or reopen (Owner). Closed and approved shifts take no new entries or voids. */
export async function changeShiftStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await scopedBranchId();
    const parsed = parseForm(shiftStatusInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const { shiftId, change } = parsed.data;
    await requireCapability(change === "close" ? "shifts" : "approveShifts");
    const step = SHIFT_CHANGES[change];

    const result = await prisma.$transaction(async (tx) => {
      // Exclusive lock: waits for in-flight entries (which hold FOR SHARE) and blocks new ones until done.
      const [locked] = await tx.$queryRaw<{ status: string }[]>`
        SELECT "status" FROM "Shift" WHERE "id" = ${shiftId} AND "branchId" = ${branchId} FOR UPDATE`;
      if (!locked) return { error: "Unknown shift for this branch" };
      if (locked.status !== step.from) return { error: `This shift is ${locked.status.toLowerCase()}, so it can't be changed this way.` };
      const shift = await tx.shift.findUniqueOrThrow({
        where: { id: shiftId },
        include: {
          readings: { where: { voidedAt: null }, select: { litres: true, amountPaisa: true } },
          sales: { where: { voidedAt: null } },
          creditSales: { where: { status: { not: "VOID" } }, select: { amountPaisa: true } },
        },
      });
      const check = checkShift(shiftTotals(shift));
      const now = new Date();
      const updated = await tx.shift.update({
        where: { id: shiftId },
        data: {
          status: step.to,
          ...(change === "close" ? { closedAt: now } : {}),
          ...(change === "approve" ? { approvedAt: now } : {}),
          ...(change === "reopen" ? { closedAt: null } : {}),
        },
      });
      return { before: { status: locked.status }, after: { status: updated.status, problems: check.problems }, problems: check.problems };
    });
    if ("error" in result) return { ok: false, errors: { shiftId: result.error ?? "Shift could not be changed" } };

    await writeAudit({ session, action: change, entity: "Shift", entityId: shiftId, branchId, before: result.before, after: result.after });
    revalidatePath("/shifts");
    revalidatePath("/nozzle-readings");
    revalidatePath("/tank-dips");
    revalidatePath("/sales");
    revalidatePath("/corrections");
    const done = { close: "Shift closed.", approve: "Shift approved.", reopen: "Shift reopened for corrections." }[change];
    return { ok: true, message: result.problems.length && change !== "reopen" ? `${done} Still to check: ${result.problems.join("; ")}.` : done };
  } catch (err) {
    return toActionError(err);
  }
}
