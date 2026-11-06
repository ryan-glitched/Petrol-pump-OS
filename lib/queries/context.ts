import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFreshSession } from "@/lib/auth/guard";
import { getActiveBranchId, type SessionUser } from "@/lib/auth/session";

export type BranchLite = { id: string; name: string; status: string };

export type ViewContext = {
  session: SessionUser;
  branchId: string;
  branch: { id: string; name: string; company: string; managerName: string; varianceTolerancePct: number };
  branches: BranchLite[];
};

/**
 * Resolve everything a page/shell needs: the session, the active branch, and the
 * list of branches the user may switch to. Returns null when not authenticated so
 * callers can redirect to /login.
 */
export async function getViewContext(): Promise<ViewContext | null> {
  const session = await getFreshSession();
  if (!session) return null;

  const branchId = await getActiveBranchId(session);
  if (!branchId) return null;

  const branches = await prisma.branch.findMany({
    where: { id: { in: session.branchIds } },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true, company: true, managerName: true, varianceTolerancePct: true },
  });
  if (!branch) return null;

  return { session, branchId, branch, branches };
}

/** Like getViewContext but redirects to /login when unauthenticated. */
export async function requireViewContext(): Promise<ViewContext> {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  return ctx;
}
