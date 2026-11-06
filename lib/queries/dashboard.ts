import { prisma } from "@/lib/db";
import { asPaisa, formatPKR, formatSignedPKR, toRupees, type Paisa } from "@/lib/money";
import { getTankLevels } from "@/lib/queries/inventory";
import { fuelGrossMarginPaisa } from "@/lib/domain/pricing";

const PRODUCT_COLORS: Record<string, string> = {
  "Hi Super": "#16a34a",
  HOBC: "#0284c7",
  Diesel: "#f97316",
  "Mobil Oil": "#9333ea",
};

export type DashboardData = {
  latestDate: string | null;
  kpis: { label: string; value: string; sub: string }[];
  revenueTrend: { date: string; revenue: number }[];
  productSales: { product: string; litres: number; color: string }[];
  paymentMix: { name: string; value: number }[];
  tankLevels: Awaited<ReturnType<typeof getTankLevels>>;
  varianceAlerts: { tank: string; date: string; variancePct: number; varianceL: number }[];
  flaggedCount: number;
};

function lastNDates(dates: string[], n: number): string[] {
  return Array.from(new Set(dates)).sort().slice(-n);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Days of history the dashboard loads; KPIs use the latest day, charts the last 7. */
const DASHBOARD_WINDOW_DAYS = 30;

export async function getDashboard(branchId: string): Promise<DashboardData> {
  const [latestSale, latestReading] = await Promise.all([
    prisma.salesEntry.findFirst({ where: { branchId }, orderBy: { date: "desc" }, select: { date: true } }),
    prisma.nozzleReading.findFirst({ where: { branchId }, orderBy: { date: "desc" }, select: { date: true } }),
  ]);
  const latestDate =
    [latestSale?.date, latestReading?.date].filter((d): d is string => Boolean(d)).sort().slice(-1)[0] ?? null;
  const window = latestDate ? { date: { gte: addDaysIso(latestDate, -DASHBOARD_WINDOW_DAYS) } } : {};

  const [sales, readings, mobil, tankLevels, varianceLogs] = await Promise.all([
    prisma.salesEntry.findMany({ where: { branchId, ...window } }),
    prisma.nozzleReading.findMany({ where: { branchId, ...window }, include: { product: true } }),
    prisma.mobilOilSale.findMany({ where: { branchId, ...window } }),
    getTankLevels(branchId),
    prisma.varianceLog.findMany({ where: { branchId, ...window }, include: { tank: true }, orderBy: { date: "desc" } }),
  ]);

  // ---- today KPIs --------------------------------------------------------
  const todaySales = sales.filter((s) => s.date === latestDate);
  const todayReadings = readings.filter((r) => r.date === latestDate);
  const todayMobil = mobil.filter((m) => m.date === latestDate);

  const todayRevenue = asPaisa(todaySales.reduce((sum, s) => sum + s.totalPaisa, 0));
  const todayLitres = todayReadings.reduce((sum, r) => sum + r.litres, 0);
  const todayFuelMargin = todayReadings.reduce(
    (sum, reading) =>
      sum + fuelGrossMarginPaisa(reading.litres, asPaisa(reading.dealerMarginPaisaPerL)),
    0,
  );
  const todayProfit = asPaisa(todayFuelMargin + todayMobil.reduce((sum, m) => sum + m.profitPaisa, 0));
  const todayDiff = asPaisa(todaySales.reduce((sum, s) => sum + s.diffPaisa, 0));

  const flagged = varianceLogs.filter((v) => v.flagged);

  const kpis = [
    { label: "Today's revenue", value: formatPKR(todayRevenue), sub: latestDate ?? "No data yet" },
    { label: "Litres sold today", value: `${todayLitres.toLocaleString()} L`, sub: `${todayReadings.length} nozzle readings` },
    { label: "Est. gross profit", value: formatPKR(todayProfit), sub: "Recorded Rs/L margin + lubricants" },
    { label: "Cash variance", value: formatSignedPKR(todayDiff), sub: todayDiff === 0 ? "Balanced" : "Drawer vs cash sales" },
  ];

  // ---- 7-day revenue trend ----------------------------------------------
  const trendDates = lastNDates(sales.map((s) => s.date), 7);
  const revenueTrend = trendDates.map((date) => ({
    date: date.slice(5),
    revenue: toRupees(asPaisa(sales.filter((s) => s.date === date).reduce((sum, s) => sum + s.totalPaisa, 0))),
  }));

  // ---- product sales (last 7 days, litres) ------------------------------
  const windowDates = new Set(lastNDates(readings.map((r) => r.date), 7));
  const litresByProduct = new Map<string, number>();
  for (const r of readings) {
    if (windowDates.has(r.date)) {
      litresByProduct.set(r.product.name, (litresByProduct.get(r.product.name) ?? 0) + r.litres);
    }
  }
  const productSales = [...litresByProduct.entries()].map(([product, litres]) => ({
    product,
    litres: Math.round(litres),
    color: PRODUCT_COLORS[product] ?? "#64748b",
  }));

  // ---- payment mix (last 7 days) ----------------------------------------
  const salesWindow = new Set(lastNDates(sales.map((s) => s.date), 7));
  const mix = sales.filter((s) => salesWindow.has(s.date));
  const sumPaisa = (sel: (s: (typeof mix)[number]) => number): Paisa => asPaisa(mix.reduce((sum, s) => sum + sel(s), 0));
  const paymentMix = [
    { name: "Cash", value: toRupees(sumPaisa((s) => s.cashPaisa)) },
    { name: "Card", value: toRupees(sumPaisa((s) => s.cardPaisa)) },
    { name: "Credit", value: toRupees(sumPaisa((s) => s.creditPaisa)) },
  ];

  const varianceAlerts = flagged.slice(0, 5).map((v) => ({
    tank: v.tank.name,
    date: v.date,
    variancePct: v.variancePct,
    varianceL: v.varianceL,
  }));

  return {
    latestDate,
    kpis,
    revenueTrend,
    productSales,
    paymentMix,
    tankLevels,
    varianceAlerts,
    flaggedCount: flagged.length,
  };
}
