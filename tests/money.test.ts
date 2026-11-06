import { describe, expect, it } from "vitest";
import { addPaisa, asPaisa, formatPKR, formatSignedPKR, mulPaisa, subPaisa, toPaisa, toRupees } from "@/lib/money";

describe("money (paisa)", () => {
  it("converts rupees to integer paisa", () => {
    expect(toPaisa(95550)).toBe(9555000);
    expect(toPaisa(12.34)).toBe(1234);
    expect(toPaisa(0)).toBe(0);
  });

  it("rounds fractional paisa to the nearest integer", () => {
    expect(toPaisa(12.345)).toBe(1235);
    expect(toPaisa(12.344)).toBe(1234);
  });

  it("round-trips to rupees", () => {
    expect(toRupees(asPaisa(9555000))).toBe(95550);
  });

  it("adds, subtracts and multiplies paisa", () => {
    expect(addPaisa(toPaisa(100), toPaisa(50), toPaisa(25))).toBe(17500);
    expect(subPaisa(toPaisa(100), toPaisa(30))).toBe(7000);
    expect(mulPaisa(toPaisa(20), 3)).toBe(6000);
  });

  it("formats PKR without decimals", () => {
    expect(formatPKR(toPaisa(95550))).toContain("95,550");
    expect(formatPKR(toPaisa(95550))).toContain("PKR");
  });

  it("formats signed PKR for cash differences", () => {
    expect(formatSignedPKR(toPaisa(1500))).toMatch(/^\+/);
    expect(formatSignedPKR(toPaisa(-2200))).toMatch(/^-/);
  });

  it("throws on non-finite input", () => {
    expect(() => toPaisa(Number.NaN)).toThrow();
    expect(() => toPaisa(Number.POSITIVE_INFINITY)).toThrow();
  });
});
