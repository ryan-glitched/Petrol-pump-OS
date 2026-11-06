// Pure tank-balance and low-stock logic. UI-agnostic, unit-tested.

export type TankSpec = {
  capacityL: number;
  safeLevelL: number;
};

export type StockMoveLike = {
  /** signed litres: + for delivery/adjust-up, - for sale/adjust-down */
  litres: number;
};

/**
 * Running tank balance from an opening level plus signed stock moves.
 * Clamped to [0, capacity] so a balance can never be physically impossible.
 */
export function tankBalanceL(tank: TankSpec, openingL: number, moves: StockMoveLike[]): number {
  const raw = moves.reduce((bal, m) => bal + m.litres, openingL);
  return Math.min(tank.capacityL, Math.max(0, raw));
}

export type LowStock = {
  warn: boolean;
  /** suggested litres to order back up to capacity (rounded down to 100 L) */
  reorderL: number;
  pctRemaining: number;
};

export function lowStock(tank: TankSpec, balanceL: number): LowStock {
  const warn = balanceL < tank.safeLevelL;
  const reorderL = warn ? Math.floor((tank.capacityL - balanceL) / 100) * 100 : 0;
  const pctRemaining = tank.capacityL > 0 ? Math.round((balanceL / tank.capacityL) * 100) : 0;
  return { warn, reorderL, pctRemaining };
}
