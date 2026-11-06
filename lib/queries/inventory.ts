import { prisma } from "@/lib/db";
import { lowStock } from "@/lib/domain/inventory";

export type TankLevel = {
  id: string;
  name: string;
  product: string;
  capacityL: number;
  safeLevelL: number;
  currentL: number;
  pctRemaining: number;
  low: boolean;
  reorderL: number;
};

/**
 * Current tank level = the latest physical dip's closing level plus any signed
 * stock moves recorded after that dip (e.g. a delivery logged post-dip), or
 * reconstructed purely from stock moves when no dip exists yet.
 */
export async function getTankLevels(branchId: string): Promise<TankLevel[]> {
  const tanks = await prisma.tank.findMany({
    where: { branchId },
    include: { product: true },
    orderBy: { name: "asc" },
  });

  const levels: TankLevel[] = [];
  for (const tank of tanks) {
    const latestDip = await prisma.tankDip.findFirst({
      where: { branchId, tankId: tank.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    let currentL: number;
    if (latestDip) {
      const movesAfter = await prisma.stockMove.findMany({
        where: { branchId, tankId: tank.id, at: { gt: latestDip.createdAt } },
      });
      const delta = movesAfter.reduce((sum, m) => sum + m.litres, 0);
      currentL = Math.min(tank.capacityL, Math.max(0, latestDip.closingDip + delta));
    } else {
      const moves = await prisma.stockMove.findMany({ where: { branchId, tankId: tank.id } });
      currentL = Math.max(0, moves.reduce((sum, m) => sum + m.litres, 0));
    }
    const ls = lowStock({ capacityL: tank.capacityL, safeLevelL: tank.safeLevelL }, currentL);
    levels.push({
      id: tank.id,
      name: tank.name,
      product: tank.product.name,
      capacityL: tank.capacityL,
      safeLevelL: tank.safeLevelL,
      currentL,
      pctRemaining: ls.pctRemaining,
      low: ls.warn,
      reorderL: ls.reorderL,
    });
  }
  return levels;
}
