// Book-vs-dip variance: the core "catch losses" calculation.
// Expected closing level (book) is reconstructed from physical events; the actual
// closing dip is what the stick says. The gap, as a % of throughput, is the loss signal.

export type VarianceArgs = {
  openingDipL: number;
  deliveriesL: number;
  soldL: number;
  closingDipL: number;
  /** |variance%| strictly greater than this is flagged. Defaults to 1.0%. */
  tolerancePct?: number;
};

export type VarianceResult = {
  expectedL: number;
  actualL: number;
  varianceL: number;
  variancePct: number;
  flagged: boolean;
};

export function bookVsDipVariance(args: VarianceArgs): VarianceResult {
  const tolerancePct = args.tolerancePct ?? 1.0;
  const expectedL = args.openingDipL + args.deliveriesL - args.soldL;
  const actualL = args.closingDipL;
  const varianceL = actualL - expectedL;

  // Percent is taken against throughput (sold + deliveries) so a busy day with a
  // large absolute gap isn't over-flagged, and a quiet day isn't under-flagged.
  const throughput = Math.abs(args.soldL) + Math.abs(args.deliveriesL);
  const base = throughput > 0 ? throughput : Math.max(1, args.openingDipL);
  const variancePct = (varianceL / base) * 100;

  return {
    expectedL: round2(expectedL),
    actualL: round2(actualL),
    varianceL: round2(varianceL),
    variancePct: round2(variancePct),
    flagged: Math.abs(variancePct) > tolerancePct,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
