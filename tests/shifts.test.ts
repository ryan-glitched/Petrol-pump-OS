import { describe, expect, it } from "vitest";
import { checkShift, meterMatches } from "@/lib/domain/shifts";

describe("meterMatches", () => {
  it("accepts the same reading and rejects a gap", () => {
    expect(meterMatches(12580.25, 12580.25)).toBe(true);
    expect(meterMatches(12580, 12850)).toBe(false);
  });
});

describe("checkShift", () => {
  const base = { meterLitres: 100, meterAmountPaisa: 2_800_000, creditLedgerPaisa: 500_000 };
  it("is OK when collections, credit and cash match", () => {
    const c = checkShift({ ...base, sales: { totalPaisa: 2_800_000, creditPaisa: 500_000, diffPaisa: 0 } });
    expect(c).toEqual({ salesGapPaisa: 0, creditGapPaisa: 0, problems: [] });
  });
  it("flags short collections, unrecorded credit and cash short", () => {
    const c = checkShift({ ...base, sales: { totalPaisa: 2_700_000, creditPaisa: 600_000, diffPaisa: -20_000 } });
    expect(c.salesGapPaisa).toBe(-100_000);
    expect(c.creditGapPaisa).toBe(100_000);
    expect(c.problems).toHaveLength(3);
  });
  it("flags a missing sales entry only when fuel was sold", () => {
    expect(checkShift({ ...base, sales: null }).problems).toEqual(["No sales entry saved"]);
    expect(checkShift({ ...base, meterAmountPaisa: 0, sales: null }).problems).toEqual([]);
  });
});
