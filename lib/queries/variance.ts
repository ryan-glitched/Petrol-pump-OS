import { prisma } from "@/lib/db";
import { bookVsDipVariance } from "@/lib/domain/variance";

/**
 * Rebuild the VarianceLog row for one tank/day from the ledger:
 * opening/closing dips, deliveries, and nozzle sales for that date.
 * No-ops when the day has no dip yet (variance needs a physical reading).
 */
export async function recomputeVariance(branchId: string, tankId: string, date: string): Promise<void> {
  const dips = await prisma.tankDip.findMany({
    where: { branchId, tankId, date },
    orderBy: { createdAt: "asc" },
  });
  if (dips.length === 0) return;
  const openingDipL = dips[0].openingDip;
  const closingDipL = dips[dips.length - 1].closingDip;

  const [branch, deliveries, readings] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.delivery.aggregate({ where: { branchId, tankId, date }, _sum: { quantityL: true } }),
    prisma.nozzleReading.findMany({ where: { branchId, date, nozzle: { tankId } }, select: { litres: true } }),
  ]);
  const deliveriesL = deliveries._sum.quantityL ?? 0;
  const soldL = readings.reduce((sum, r) => sum + r.litres, 0);

  const v = bookVsDipVariance({
    openingDipL,
    deliveriesL,
    soldL,
    closingDipL,
    tolerancePct: branch?.varianceTolerancePct,
  });

  await prisma.$transaction([
    prisma.varianceLog.deleteMany({ where: { branchId, tankId, date } }),
    prisma.varianceLog.create({
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
    }),
  ]);
}
