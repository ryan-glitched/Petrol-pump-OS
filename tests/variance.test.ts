import { describe, expect, it } from "vitest";
import { bookVsDipVariance } from "@/lib/domain/variance";

describe("bookVsDipVariance", () => {
  it("reports zero variance when dip matches the book", () => {
    const r = bookVsDipVariance({ openingDipL: 20000, deliveriesL: 10000, soldL: 5000, closingDipL: 25000 });
    expect(r.expectedL).toBe(25000);
    expect(r.actualL).toBe(25000);
    expect(r.varianceL).toBe(0);
    expect(r.variancePct).toBe(0);
    expect(r.flagged).toBe(false);
  });

  it("flags a shortfall beyond tolerance", () => {
    // expected 25000, actual 24600 -> short 400 L on 15000 throughput = -2.67%
    const r = bookVsDipVariance({ openingDipL: 20000, deliveriesL: 10000, soldL: 5000, closingDipL: 24600, tolerancePct: 1 });
    expect(r.varianceL).toBe(-400);
    expect(r.variancePct).toBeLessThan(0);
    expect(r.flagged).toBe(true);
  });

  it("does not flag a tiny variance within tolerance", () => {
    // 50 L on 15000 throughput = 0.33% < 1%
    const r = bookVsDipVariance({ openingDipL: 20000, deliveriesL: 10000, soldL: 5000, closingDipL: 24950, tolerancePct: 1 });
    expect(r.flagged).toBe(false);
  });

  it("respects a per-branch tolerance", () => {
    const args = { openingDipL: 20000, deliveriesL: 0, soldL: 10000, closingDipL: 9900 } as const;
    expect(bookVsDipVariance({ ...args, tolerancePct: 0.5 }).flagged).toBe(true);
    expect(bookVsDipVariance({ ...args, tolerancePct: 2 }).flagged).toBe(false);
  });
});
