import type { ZodType } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError, ForbiddenError } from "@/lib/auth/errors";

export type FieldErrors = Record<string, string>;

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
};

export const idleState: ActionState = { ok: false };

/** Parse FormData against a Zod schema into either field errors or typed data. */
export function parseForm<T>(schema: ZodType<T>, formData: FormData):
  | { success: true; data: T }
  | { success: false; errors: FieldErrors } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "form";
    if (!errors[path]) errors[path] = issue.message;
  }
  return { success: false, errors };
}

const DUPLICATE_MESSAGES: { fields: string[]; message: string }[] = [
  { fields: ["invoice"], message: "This invoice number is already recorded." },
  { fields: ["shiftSlot"], message: "This shift is already open for that date." },
  { fields: ["effectiveFrom"], message: "A rate for this fuel already starts on that date." },
  { fields: ["nozzleId"], message: "A reading for this nozzle is already saved for this shift/day." },
  { fields: ["tankId"], message: "A dip for this tank is already saved for this shift/day." },
  { fields: ["employeeCode"], message: "This employee code is already in use." },
  { fields: ["email"], message: "A login with this email already exists." },
  { fields: ["label"], message: "That name is already used here. Pick a different one." },
  { fields: ["name"], message: "That name is already used. Pick a different one." },
];

/** Turn a unique-constraint violation into a message the user can act on. */
export function duplicateMessage(target: unknown): string {
  const fields = Array.isArray(target) ? target.map(String) : typeof target === "string" ? [target] : [];
  const match = DUPLICATE_MESSAGES.find((d) => d.fields.some((f) => fields.some((t) => t.includes(f))));
  return match?.message ?? "This entry has already been saved.";
}

/** Thrown inside an entry transaction when its shift was closed meanwhile. */
export class ShiftClosedError extends Error {}

/** Holds a shared lock on the shift for the rest of the transaction, so it can't be closed mid-save. */
export async function assertShiftOpen(tx: Prisma.TransactionClient, shiftId: string | null | undefined): Promise<void> {
  if (!shiftId) return;
  const [shift] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "Shift" WHERE "id" = ${shiftId} FOR SHARE`;
  if (shift && shift.status !== "OPEN") throw new ShiftClosedError();
}

/** Map auth/forbidden/duplicate errors to friendly form messages; rethrow the rest. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof ShiftClosedError) {
    return { ok: false, errors: { shiftId: "This shift has been closed. Pick an open shift, or ask the Owner to reopen it." } };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return { ok: false, message: duplicateMessage(err.meta?.target) };
  }
  if (err instanceof AuthError) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { ok: false, message: "You do not have permission to perform this action." };
  }
  throw err;
}
