import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/constants";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  branchIds: string[];
  sessionVersion: number;
};

const COOKIE = "pp_session";
const BRANCH_COOKIE = "pp_branch";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(BRANCH_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role,
      branchIds: (payload.branchIds as string[]) ?? [],
      sessionVersion: Number(payload.sessionVersion ?? 0),
    };
  } catch {
    return null;
  }
}

/** The branch the user is currently acting within (cookie), validated against access. */
export async function getActiveBranchId(session: SessionUser): Promise<string | null> {
  const jar = await cookies();
  const requested = jar.get(BRANCH_COOKIE)?.value;
  if (requested && session.branchIds.includes(requested)) return requested;
  return session.branchIds[0] ?? null;
}

export async function setActiveBranchId(branchId: string): Promise<void> {
  const jar = await cookies();
  jar.set(BRANCH_COOKIE, branchId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}
