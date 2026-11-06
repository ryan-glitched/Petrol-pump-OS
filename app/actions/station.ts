"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCapability, scopedBranchId } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { writeAudit } from "@/lib/audit";
import { getTankLevels } from "@/lib/queries/inventory";
import { type ActionState, parseForm, toActionError } from "@/lib/actions/helpers";
import {
  dispenserInput,
  nozzleInput,
  nozzleUpdateInput,
  tankInput,
  tankUpdateInput,
  userInput,
  userUpdateInput,
} from "@/lib/validation/schemas";

const PAGE = "/station-setup";

function refresh() {
  for (const path of [PAGE, "/", "/inventory", "/nozzle-readings", "/tank-dips", "/fuel-deliveries"]) revalidatePath(path);
}

async function context() {
  const { session, branchId } = await scopedBranchId();
  await requireCapability("settings");
  return { session, branchId };
}

export async function createTank(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(tankInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const fuel = await prisma.product.findFirst({ where: { id: d.productId, kind: "FUEL", active: true }, select: { id: true } });
    if (!fuel) return { ok: false, errors: { productId: "Select a fuel" } };
    const row = await prisma.tank.create({ data: { branchId, ...d } });
    await writeAudit({ session, action: "create", entity: "Tank", entityId: row.id, branchId, after: row });
    refresh();
    return { ok: true, message: `${row.name} added.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateTank(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(tankUpdateInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const before = await prisma.tank.findFirst({ where: { id: d.tankId, branchId } });
    if (!before) return { ok: false, errors: { tankId: "Select a tank" } };
    const capacityL = d.capacityL ?? before.capacityL;
    const safeLevelL = d.safeLevelL ?? before.safeLevelL;
    if (capacityL <= 0) return { ok: false, errors: { capacityL: "Capacity must be greater than 0" } };
    if (safeLevelL > capacityL) return { ok: false, errors: { safeLevelL: "Low-stock level can't exceed capacity" } };
    if (capacityL < before.capacityL) {
      const level = (await getTankLevels(branchId)).find((t) => t.id === before.id);
      if (level && capacityL < level.currentL) {
        return {
          ok: false,
          errors: { capacityL: `This tank currently holds about ${Math.round(level.currentL).toLocaleString("en-PK")} L, so capacity can't be lower than that.` },
        };
      }
    }
    if (d.active === "false") {
      const live = await prisma.nozzle.count({ where: { tankId: before.id, active: true } });
      if (live > 0) return { ok: false, errors: { active: "Move or switch off this tank's nozzles first" } };
    }
    const row = await prisma.tank.update({
      where: { id: before.id },
      data: { name: d.name ?? before.name, capacityL, safeLevelL, active: d.active ? d.active === "true" : before.active },
    });
    await writeAudit({ session, action: "update", entity: "Tank", entityId: row.id, branchId, before, after: row });
    refresh();
    return { ok: true, message: `${row.name} updated.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createDispenser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(dispenserInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const row = await prisma.dispenser.create({ data: { branchId, label: parsed.data.label } });
    await writeAudit({ session, action: "create", entity: "Dispenser", entityId: row.id, branchId, after: row });
    refresh();
    return { ok: true, message: `${row.label} added. Now add its nozzles.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createNozzle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(nozzleInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const [dispenser, tank] = await Promise.all([
      prisma.dispenser.findFirst({ where: { id: d.dispenserId, branchId, active: true } }),
      prisma.tank.findFirst({ where: { id: d.tankId, branchId, active: true } }),
    ]);
    if (!dispenser) return { ok: false, errors: { dispenserId: "Select a dispenser" } };
    if (!tank) return { ok: false, errors: { tankId: "Select a tank" } };
    const row = await prisma.nozzle.create({
      data: { branchId, dispenserId: dispenser.id, tankId: tank.id, productId: tank.productId, label: d.label },
    });
    await writeAudit({ session, action: "create", entity: "Nozzle", entityId: row.id, branchId, after: row });
    refresh();
    return { ok: true, message: `${dispenser.label} · ${row.label} added, pumping from ${tank.name}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateNozzle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(nozzleUpdateInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const before = await prisma.nozzle.findFirst({ where: { id: d.nozzleId, branchId } });
    if (!before) return { ok: false, errors: { nozzleId: "Select a nozzle" } };
    let tank: { id: string; productId: string } | null = null;
    if (d.tankId && d.tankId !== before.tankId) {
      tank = await prisma.tank.findFirst({ where: { id: d.tankId, branchId, active: true }, select: { id: true, productId: true } });
      if (!tank) return { ok: false, errors: { tankId: "Select a tank" } };
    }
    const active = d.active ? d.active === "true" : before.active;
    if (active && !tank) {
      const current = await prisma.tank.findUnique({ where: { id: before.tankId }, select: { active: true } });
      if (!current?.active) return { ok: false, errors: { tankId: "Its tank is switched off. Pick an active tank to switch this nozzle on." } };
    }
    const row = await prisma.$transaction(async (tx) => {
      // Locks the nozzle so no reading can be saved between the history check and the move (see createNozzleReading).
      await tx.$queryRaw`SELECT "id" FROM "Nozzle" WHERE "id" = ${before.id} FOR UPDATE`;
      // Past variance is computed through nozzle -> tank, so moving a nozzle with history would rewrite old results.
      if (tank && (await tx.nozzleReading.count({ where: { nozzleId: before.id } })) > 0) return null;
      return tx.nozzle.update({
        where: { id: before.id },
        data: {
          label: d.label ?? before.label,
          tankId: tank?.id ?? before.tankId,
          productId: tank?.productId ?? before.productId,
          active,
        },
      });
    });
    if (!row) {
      return {
        ok: false,
        errors: { tankId: "This nozzle already has readings. Switch it off and add a new nozzle for the other tank." },
      };
    }
    await writeAudit({ session, action: "update", entity: "Nozzle", entityId: row.id, branchId, before, after: row });
    refresh();
    return { ok: true, message: "Nozzle updated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(userInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    const tempPassword = randomBytes(9).toString("base64url");
    const row = await prisma.user.create({
      data: {
        email: d.email,
        name: d.name,
        role: d.role,
        passwordHash: await hashPassword(tempPassword),
        branches: { create: [{ branchId }] },
      },
    });
    await writeAudit({
      session,
      action: "create",
      entity: "User",
      entityId: row.id,
      branchId,
      after: { email: row.email, name: row.name, role: row.role },
    });
    refresh();
    return {
      ok: true,
      message: `Login created for ${row.email}. Temporary password (shown only once, write it down): ${tempPassword}`,
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { session, branchId } = await context();
    const parsed = parseForm(userUpdateInput, formData);
    if (!parsed.success) return { ok: false, errors: parsed.errors };
    const d = parsed.data;
    if (d.userId === session.userId) {
      return { ok: false, errors: { userId: "You can't change your own login here." } };
    }
    const before = await prisma.user.findFirst({
      where: { id: d.userId, branches: { some: { branchId } } },
      select: { id: true, email: true, role: true, active: true, branches: { select: { branchId: true } } },
    });
    if (!before) return { ok: false, errors: { userId: "Select a login" } };
    // Role and active status apply to every station the login can open, so all of them must be yours.
    if (session.role !== "SuperAdmin" && before.branches.some((b) => !session.branchIds.includes(b.branchId))) {
      return { ok: false, errors: { userId: "This login also works at a station you don't manage. Ask a Super Admin." } };
    }
    if (before.role === "SuperAdmin" && session.role !== "SuperAdmin") {
      return { ok: false, errors: { userId: "Only a Super Admin can change this login." } };
    }
    const role = d.role ?? before.role;
    const active = d.active ? d.active === "true" : before.active;
    const row = await prisma.user.update({
      where: { id: before.id },
      // Bumping the version signs the person out everywhere so the change applies immediately.
      data: { role, active, sessionVersion: { increment: 1 }, ...(active ? {} : { lockedUntil: null, failedLogins: 0 }) },
      select: { id: true, email: true, role: true, active: true },
    });
    await writeAudit({
      session,
      action: "update",
      entity: "User",
      entityId: row.id,
      branchId,
      before: { id: before.id, email: before.email, role: before.role, active: before.active },
      after: row,
    });
    refresh();
    return { ok: true, message: `${row.email} updated and signed out of all devices.` };
  } catch (err) {
    return toActionError(err);
  }
}
