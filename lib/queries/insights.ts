import { prisma } from "@/lib/db";
import { formatPKR, asPaisa } from "@/lib/money";
import { getTankLevels } from "@/lib/queries/inventory";

export type Insight = { kind: "loss" | "stock" | "credit" | "ops"; text: string };

/**
 * Actionable manager recommendations derived from real rows: variance losses,
 * low stock, overdue credit, and the best recent sales day.
 */
export async function getInsights(branchId: string): Promise<Insight[]> {
  const [tankLevels, flagged, overdueCredit, sales] = await Promise.all([
    getTankLevels(branchId),
    prisma.varianceLog.findMany({ where: { branchId, flagged: true }, include: { tank: true }, orderBy: { date: "desc" }, take: 5 }),
    prisma.creditSale.findMany({ where: { branchId, status: { not: "Paid" } }, include: { customer: true } }),
    prisma.salesEntry.findMany({ where: { branchId } }),
  ]);

  const insights: Insight[] = [];

  for (const v of flagged) {
    insights.push({
      kind: "loss",
      text: `Variance on ${v.tank.name} (${v.date}): ${v.varianceL.toLocaleString()} L (${v.variancePct.toFixed(1)}%). Recheck dip and nozzle calibration.`,
    });
  }

  for (const t of tankLevels.filter((t) => t.low)) {
    insights.push({
      kind: "stock",
      text: `${t.name} (${t.product}) is at ${t.pctRemaining}% — reorder ~${t.reorderL.toLocaleString()} L to refill.`,
    });
  }

  const totalDue = overdueCredit.reduce((sum, c) => sum + (c.amountPaisa - c.paidPaisa), 0);
  if (totalDue > 0) {
    insights.push({
      kind: "credit",
      text: `${overdueCredit.length} credit account(s) outstanding totalling ${formatPKR(asPaisa(totalDue))}. Follow up on collections.`,
    });
  }

  const byDate = new Map<string, number>();
  for (const s of sales) byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.totalPaisa);
  const best = [...byDate.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best) {
    insights.push({ kind: "ops", text: `Best recent sales day was ${best[0]} at ${formatPKR(asPaisa(best[1]))}. Staff that shift pattern during peaks.` });
  }

  if (insights.length === 0) {
    insights.push({ kind: "ops", text: "No anomalies detected. Stock, variance, and credit are all within tolerance." });
  }
  return insights;
}
