import { describe, expect, it } from "vitest";
import { mobilProfitPaisa, reconcileSales } from "@/lib/domain/sales";
import { nozzleAmountPaisa, nozzleLitres, dipLitres } from "@/lib/domain/readings";
import { toPaisa } from "@/lib/money";

describe("reconcileSales", () => {
  it("totals payment channels and computes the cash difference", () => {
    const r = reconcileSales({
      cashPaisa: toPaisa(735000),
      cardPaisa: toPaisa(488200),
      creditPaisa: toPaisa(140000),
      cashInHandPaisa: toPaisa(736500),
    });
    expect(r.totalPaisa).toBe(toPaisa(1363200));
    expect(r.diffPaisa).toBe(toPaisa(1500));
  });

  it("reports a negative difference when the drawer is short", () => {
    const r = reconcileSales({
      cashPaisa: toPaisa(615200),
      cardPaisa: toPaisa(494200),
      creditPaisa: toPaisa(211900),
      cashInHandPaisa: toPaisa(613000),
    });
    expect(r.diffPaisa).toBe(toPaisa(-2200));
  });
});

describe("readings", () => {
  it("computes litres and amount", () => {
    expect(nozzleLitres(128900, 130540)).toBe(1640);
    expect(nozzleAmountPaisa(1640, toPaisa(170))).toBe(toPaisa(278800));
  });

  it("never returns negative litres", () => {
    expect(nozzleLitres(100, 90)).toBe(0);
    expect(dipLitres(90, 100)).toBe(0);
  });
});

describe("mobilProfitPaisa", () => {
  it("multiplies unit margin by quantity", () => {
    expect(mobilProfitPaisa(toPaisa(1800), toPaisa(2250), 18)).toBe(toPaisa(8100));
  });
});
