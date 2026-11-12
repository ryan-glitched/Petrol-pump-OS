import { prisma } from "@/lib/db";
import { bookVsDipVariance } from "@/lib/domain/variance";

/**
 * Rebuild the VarianceLog row for one tank/day from the ledger:
 * opening/closing dips, deliveries, and nozzle sales for that date.
 * Clears the row when the day has no live dip (variance needs a physical reading).
 * Runs under a per-tank/day lock so concurrent edits can't leave an older snapshot written last.
 */
export async function recomputeVariance(branchId: string, tankId: string, date: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`variance:${tankId}:${date}`}))`;

    const dips = await tx.tankDip.findMany({
      where: { branchId, tankId, date, voidedAt: null },
      orderBy: { createdAt: "asc" },
    });
    await tx.varianceLog.deleteMany({ where: { branchId, tankId, date } });
    if (dips.length === 0) return;
    const openingDipL = dips[0].openingDip;
    const closingDipL = dips[dips.length - 1].closingDip;

    const branch = await tx.branch.findUnique({ where: { id: branchId } });
    const deliveries = await tx.delivery.aggregate({ where: { branchId, tankId, date, voidedAt: null }, _sum: { quantityL: true } });
    const readings = await tx.nozzleReading.findMany({
      where: { branchId, date, voidedAt: null, nozzle: { tankId } },
      select: { litres: true },
    });
    const deliveriesL = deliveries._sum.quantityL ?? 0;
    const soldL = readings.reduce((sum, r) => sum + r.litres, 0);

    const v = bookVsDipVariance({
      openingDipL,
      deliveriesL,
      soldL,
      closingDipL,
      tolerancePct: branch?.varianceTolerancePct,
    });

    await tx.varianceLog.create({
      data: {
        branchId,
        tankId,
        date,
        expectedL: v.expectedL,
        actualL: v.actualL,
        varianceL: v.varianceL,
        variancePct: v.variancePct,
        flagged: v.flagged,
      },
    });
  });
}
