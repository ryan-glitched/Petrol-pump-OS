import { prisma } from "@/lib/db";
import { asPaisa, formatPKR } from "@/lib/money";

export type Option = { value: string; label: string };

export async function nozzleOptions(branchId: string): Promise<Option[]> {
  const nozzles = await prisma.nozzle.findMany({
    where: { branchId, active: true, dispenser: { active: true }, tank: { active: true } },
    include: { dispenser: true, product: true },
    orderBy: { label: "asc" },
  });
  return nozzles.map((n) => ({ value: n.id, label: `${n.dispenser.label} · ${n.label} (${n.product.name})` }));
}

export async function tankOptions(branchId: string): Promise<Option[]> {
  const tanks = await prisma.tank.findMany({ where: { branchId, active: true }, include: { product: true }, orderBy: { name: "asc" } });
  return tanks.map((t) => ({ value: t.id, label: `${t.name} (${t.product.name})` }));
}

export async function productOptions(branchId: string, kind?: "FUEL" | "LUBE"): Promise<Option[]> {
  void branchId;
  const products = await prisma.product.findMany({ where: kind ? { kind } : undefined, orderBy: { name: "asc" } });
  return products.map((p) => ({ value: p.id, label: p.name }));
}

export async function staffOptions(branchId: string): Promise<Option[]> {
  const staff = await prisma.staff.findMany({ where: { branchId }, orderBy: { name: "asc" } });
  return staff.map((s) => ({ value: s.id, label: `${s.name} (${s.role})` }));
}

export async function shiftOptions(branchId: string): Promise<Option[]> {
  const shifts = await prisma.shift.findMany({ where: { branchId, status: "OPEN" }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 20 });
  return shifts.map((s) => ({ value: s.id, label: `${s.date} · ${s.shiftSlot}` }));
}

export async function priceOptionsWithCurrent(
  branchId: string,
): Promise<{ productId: string; product: string; current: string; margin: string }[]> {
  const products = await prisma.product.findMany({ where: { kind: "FUEL" }, orderBy: { name: "asc" } });
  const out: { productId: string; product: string; current: string; margin: string }[] = [];
  for (const p of products) {
    const latest = await prisma.fuelPrice.findFirst({ where: { branchId, productId: p.id }, orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }] });
    out.push({
      productId: p.id,
      product: p.name,
      current: latest ? `${formatPKR(asPaisa(latest.ratePaisa))} / L` : "Not set",
      margin: latest ? `${formatPKR(asPaisa(latest.dealerMarginPaisaPerL))} / L` : "Not set",
    });
  }
  return out;
}
