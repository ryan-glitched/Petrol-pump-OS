import { describe, expect, it } from "vitest";
import { movingAverageEngine, type HistoryPoint } from "@/lib/forecast/engine";

function makeHistory(values: number[], start = "2026-06-01"): HistoryPoint[] {
  return values.map((litres, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), litres };
  });
}

describe("movingAverageEngine", () => {
  it("produces the requested horizon", () => {
    const out = movingAverageEngine.predict({ history: makeHistory([100, 110, 120, 130, 140, 150, 160]), horizonDays: 5 });
    expect(out).toHaveLength(5);
    expect(out[0].date).toBe("2026-06-08");
  });

  it("projects an upward trend for rising history", () => {
    const out = movingAverageEngine.predict({ history: makeHistory([100, 120, 140, 160, 180, 200, 220]), horizonDays: 3 });
    expect(out[2].litres).toBeGreaterThan(out[0].litres);
  });

  it("returns confidence within [0,1]", () => {
    const out = movingAverageEngine.predict({ history: makeHistory([100, 100, 100, 100, 100, 100, 100]), horizonDays: 2 });
    expect(out[0].confidence).toBeGreaterThan(0);
    expect(out[0].confidence).toBeLessThanOrEqual(1);
  });

  it("never predicts negative litres", () => {
    const out = movingAverageEngine.predict({ history: makeHistory([500, 400, 300, 200, 100, 50, 10]), horizonDays: 10 });
    for (const p of out) expect(p.litres).toBeGreaterThanOrEqual(0);
  });
});
