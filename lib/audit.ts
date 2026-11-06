import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";

type AuditArgs = {
  session: SessionUser | null;
  action: string; // e.g. "create"
  entity: string; // e.g. "NozzleReading"
  entityId?: string;
  branchId?: string;
  after?: unknown;
  before?: unknown;
};

/** Append-only audit trail: who did what, when, to which record. */
export async function writeAudit(args: AuditArgs): Promise<void> {
  const asJson = (value: unknown): Prisma.InputJsonValue | undefined =>
    value === undefined ? undefined : JSON.parse(JSON.stringify(value));

  await prisma.auditLog.create({
    data: {
      userId: args.session?.userId,
      userName: args.session?.name,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      branchId: args.branchId,
      before: asJson(args.before),
      after: asJson(args.after),
    },
  });
}
