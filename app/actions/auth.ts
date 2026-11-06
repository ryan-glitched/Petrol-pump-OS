"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession, setActiveBranchId } from "@/lib/auth/session";
import type { Role } from "@/lib/constants";
import { changePasswordInput, loginInput } from "@/lib/validation/schemas";
import { requireSession } from "@/lib/auth/guard";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import { writeAudit } from "@/lib/audit";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const LOCKED_MESSAGE = `Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.`;

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginInput, formData);
  if (!parsed.success) return { ok: false, errors: parsed.errors };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { branches: true },
  });
  if (!user || !user.active) {
    return { ok: false, message: "Invalid email or password." };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, message: LOCKED_MESSAGE };
  }
  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    const { failedLogins } = await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: { increment: 1 } },
      select: { failedLogins: true },
    });
    const locked = failedLogins >= MAX_FAILED_LOGINS;
    if (locked) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
      });
    }
    return { ok: false, message: locked ? LOCKED_MESSAGE : "Invalid email or password." };
  }
  if (user.failedLogins > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    branchIds: user.branches.map((b) => b.branchId),
    sessionVersion: user.sessionVersion,
  });
  await writeAudit({
    session: { userId: user.id, email: user.email, name: user.name, role: user.role as Role, branchIds: [], sessionVersion: user.sessionVersion },
    action: "login",
    entity: "User",
    entityId: user.id,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function switchBranch(formData: FormData): Promise<void> {
  const session = await getSession();
  const branchId = String(formData.get("branchId") ?? "");
  if (session && session.branchIds.includes(branchId)) {
    await setActiveBranchId(branchId);
  }
  revalidatePath("/", "layout");
}

/** Change your own password. Bumps sessionVersion so every other device is signed out. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireSession();
    const parsed = parseForm(changePasswordInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return { ok: false, errors: { currentPassword: "Current password is wrong" } };
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword), sessionVersion: { increment: 1 } },
    });
    await createSession({ ...session, sessionVersion: updated.sessionVersion });
    await writeAudit({ session, action: "update", entity: "User", entityId: user.id, after: { passwordChanged: true } });
    return { ok: true, message: "Password changed. Other devices have been signed out." };
  } catch (err) {
    return toActionError(err);
  }
}
