import { prisma } from "@/lib/db";
import { asPaisa, formatPKR, formatSignedPKR } from "@/lib/money";

export type Row = Record<string, string>;

async function staffNameMap(branchId: string): Promise<Map<string, string>> {
  const staff = await prisma.staff.findMany({ where: { branchId } });
  return new Map(staff.map((s) => [s.id, s.name]));
}

const PAGE = 100;

export async function listShifts(branchId: string): Promise<Row[]> {
  const names = await staffNameMap(branchId);
  const rows = await prisma.shift.findMany({ where: { branchId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PAGE });
  return rows.map((s) => ({
    date: s.date,
    shift: s.shiftSlot,
    manager: s.managerId ? names.get(s.managerId) ?? "—" : "—",
    cashier: s.cashierId ? names.get(s.cashierId) ?? "—" : "—",
    openingCash: formatPKR(asPaisa(s.openingCashPaisa)),
    closingCash: formatPKR(asPaisa(s.closingCashPaisa)),
  }));
}

export async function listNozzleReadings(branchId: string): Promise<Row[]> {
  const names = await staffNameMap(branchId);
  const rows = await prisma.nozzleReading.findMany({
    where: { branchId },
    include: { nozzle: { include: { dispenser: true } }, product: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: PAGE,
  });
  return rows.map((r) => ({
    date: r.date,
    dispenser: r.nozzle.dispenser.label,
    nozzle: r.nozzle.label,
    fuel: r.product.name,
    opening: r.opening.toLocaleString(),
    closing: r.closing.toLocaleString(),
    litres: `${r.litres.toLocaleString()} L`,
    amount: formatPKR(asPaisa(r.amountPaisa)),
    staff: r.staffId ? names.get(r.staffId) ?? "—" : "—",
  }));
}

export async function listTankDips(branchId: string): Promise<Row[]> {
  const rows = await prisma.tankDip.findMany({ where: { branchId }, include: { tank: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PAGE });
  return rows.map((d) => ({
    date: d.date,
    tank: d.tank.name,
    openingDip: `${d.openingDip.toLocaleString()} L`,
    closingDip: `${d.closingDip.toLocaleString()} L`,
    litres: `${d.litres.toLocaleString()} L`,
    notes: d.notes ?? "—",
  }));
}

export async function listDeliveries(branchId: string): Promise<Row[]> {
  const rows = await prisma.delivery.findMany({ where: { branchId }, include: { product: true, tank: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PAGE });
  return rows.map((d) => ({
    date: d.date,
    supplier: d.supplier,
    fuel: d.product.name,
    tank: d.tank.name,
    quantity: `${d.quantityL.toLocaleString()} L`,
    rate: `${formatPKR(asPaisa(d.ratePaisa))} / L`,
    cost: formatPKR(asPaisa(d.costPaisa)),
    invoice: d.invoice,
  }));
}

export async function listSales(branchId: string): Promise<Row[]> {
  const rows = await prisma.salesEntry.findMany({ where: { branchId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PAGE });
  return rows.map((s) => ({
    date: s.date,
    cash: formatPKR(asPaisa(s.cashPaisa)),
    card: formatPKR(asPaisa(s.cardPaisa)),
    credit: formatPKR(asPaisa(s.creditPaisa)),
    total: formatPKR(asPaisa(s.totalPaisa)),
    cashInHand: formatPKR(asPaisa(s.cashInHandPaisa)),
    difference: formatSignedPKR(asPaisa(s.diffPaisa)),
  }));
}

export async function listMobilOil(branchId: string): Promise<Row[]> {
  const names = await staffNameMap(branchId);
  const rows = await prisma.mobilOilSale.findMany({ where: { branchId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PAGE });
  return rows.map((m) => ({
    date: m.date,
    product: m.productName,
    quantity: `${m.qty}`,
    purchase: formatPKR(asPaisa(m.purchasePaisa)),
    selling: formatPKR(asPaisa(m.sellingPaisa)),
    profit: formatPKR(asPaisa(m.profitPaisa)),
    staff: m.staffId ? names.get(m.staffId) ?? "—" : "—",
  }));
}

export async function listExpenses(branchId: string): Promise<Row[]> {
  const rows = await prisma.expense.findMany({ where: { branchId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PAGE });
  return rows.map((e) => ({
    date: e.date,
    category: e.category,
    amount: formatPKR(asPaisa(e.amountPaisa)),
    paidBy: e.paidBy,
    description: e.description,
  }));
}

export async function listCreditSales(branchId: string): Promise<Row[]> {
  const rows = await prisma.creditSale.findMany({ where: { branchId }, include: { customer: true, product: true }, orderBy: [{ createdAt: "desc" }], take: PAGE });
  return rows.map((c) => ({
    customer: c.customer.name,
    vehicle: c.customer.vehicle,
    fuel: c.product.name,
    litres: `${c.litres.toLocaleString()} L`,
    amount: formatPKR(asPaisa(c.amountPaisa)),
    paid: formatPKR(asPaisa(c.paidPaisa)),
    status: c.status,
    dueDate: c.dueDate,
  }));
}

export async function listStaff(branchId: string): Promise<Row[]> {
  const rows = await prisma.staff.findMany({ where: { branchId }, orderBy: { name: "asc" }, take: PAGE });
  return rows.map((s) => ({
    name: s.name,
    role: s.role,
    shift: s.shiftSlot,
    phone: s.phone,
    status: s.status,
  }));
}
