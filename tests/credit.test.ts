import { describe, expect, it } from "vitest";
import { addDaysISO, ageBalance, allocatePayment, billingDaysFor, normalizePlate, withRunningBalance, type OpenItem } from "@/lib/domain/credit";
import { creditCustomerInput, creditPaymentInput } from "@/lib/validation/schemas";

const item = (id: string | null, dueDate: string, amountPaisa: number, paidPaisa = 0): OpenItem => ({ id, date: dueDate, dueDate, amountPaisa, paidPaisa });

describe("credit due dates", () => {
  it("uses 15 / 30 / custom days", () => {
    expect(billingDaysFor("FIFTEEN_DAYS")).toBe(15);
    expect(billingDaysFor("MONTHLY")).toBe(30);
    expect(billingDaysFor("CUSTOM", 45)).toBe(45);
  });
  it("adds days across month ends", () => {
    expect(addDaysISO("2026-01-25", 15)).toBe("2026-02-09");
  });
});

describe("allocatePayment", () => {
  it("pays the oldest bill first and splits a part payment", () => {
    const r = allocatePayment([item("b", "2026-02-10", 5000), item("a", "2026-02-01", 3000, 1000)], 4000);
    expect(r.allocations).toEqual([
      { id: "a", paidPaisa: 3000, fullyPaid: true },
      { id: "b", paidPaisa: 2000, fullyPaid: false },
    ]);
    expect(r.unappliedPaisa).toBe(0);
  });
  it("reports money left over when paying more than owed", () => {
    expect(allocatePayment([item("a", "2026-02-01", 1000)], 1500).unappliedPaisa).toBe(500);
  });
});

describe("ageBalance", () => {
  it("buckets by days past due", () => {
    const a = ageBalance(
      [item("x", "2026-03-10", 100), item("y", "2026-03-01", 200), item("z", "2026-02-10", 300), item("w", "2026-01-01", 400), item(null, "2026-03-20", 50)],
      "2026-03-15"
    );
    expect(a).toMatchObject({ d1to15Paisa: 300, d31to60Paisa: 300, d60plusPaisa: 400, notDuePaisa: 50, totalPaisa: 1050, overduePaisa: 1000 });
  });
});

describe("ledger", () => {
  it("keeps a running balance in date order", () => {
    const rows = withRunningBalance([
      { date: "2026-03-05", kind: "Payment", detail: "", debitPaisa: 0, creditPaisa: 400, order: 0 },
      { date: "2026-03-01", kind: "Credit sale", detail: "", debitPaisa: 1000, creditPaisa: 0, order: 0 },
    ]);
    expect(rows.map((r) => r.balancePaisa)).toEqual([1000, 600]);
  });
  it("normalises plates", () => {
    expect(normalizePlate("  les 4471 ")).toBe("LES 4471");
    expect(normalizePlate("les - 4471")).toBe("LES-4471");
  });
});

describe("credit inputs", () => {
  it("requires days for a custom billing cycle", () => {
    expect(creditCustomerInput.safeParse({ name: "A", billingCycle: "CUSTOM", billingDays: "" }).success).toBe(false);
    expect(creditCustomerInput.safeParse({ name: "A", billingCycle: "CUSTOM", billingDays: "45" }).success).toBe(true);
  });
  it("requires a date with an opening balance", () => {
    expect(creditCustomerInput.safeParse({ name: "A", billingCycle: "MONTHLY", openingBalance: "5000", openingDate: "" }).success).toBe(false);
  });
  it("rejects a zero payment", () => {
    expect(creditPaymentInput.safeParse({ date: "2026-03-01", customerId: "c", amount: "0", method: "Cash" }).success).toBe(false);
  });
});
