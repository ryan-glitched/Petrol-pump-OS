import { CAPABILITIES, type Capability, type Role } from "@/lib/constants";
import { getActiveBranchId, getSession, type SessionUser } from "@/lib/auth/session";
import { AuthError, ForbiddenError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";

export { AuthError, ForbiddenError };

/**
 * The JWT carries identity from login time; re-read role, branchIds and the
 * active flag from the DB so admin-side changes apply without waiting for re-login.
 * Returns null when unauthenticated or the account has been deactivated.
 */
export async function getFreshSession(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      active: true,
      name: true,
      email: true,
      role: true,
      sessionVersion: true,
      branches: { select: { branchId: true } },
    },
  });
  if (!user?.active || user.sessionVersion !== session.sessionVersion) return null;
  return {
    ...session,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    branchIds: user.branches.map((b) => b.branchId),
  };
}

export function can(role: Role, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}

/** Require a logged-in, still-active user; throws AuthError otherwise. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getFreshSession();
  if (!session) throw new AuthError("Not authenticated");
  return session;
}

/** Require a capability; throws ForbiddenError if the role lacks it. */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const session = await requireSession();
  if (!can(session.role, capability)) {
    throw new ForbiddenError(`Role ${session.role} lacks capability ${capability}`);
  }
  return session;
}

/**
 * Resolve the branch a write/read must be scoped to.
 * - SuperAdmin/Owner may target any branch they belong to.
 * - Others are pinned to their active branch.
 * Throws ForbiddenError if the requested branch is outside the user's access.
 */
export async function scopedBranchId(requested?: string): Promise<{ session: SessionUser; branchId: string }> {
  const session = await requireSession();
  const active = await getActiveBranchId(session);
  const branchId = requested ?? active;
  if (!branchId) throw new ForbiddenError("No branch assigned to this user");
  if (!session.branchIds.includes(branchId)) {
    throw new ForbiddenError("Branch outside user access");
  }
  return { session, branchId };
}
