import { asPaisa, formatPKR, formatSignedPKR } from "@/lib/money";

export const SHIFT_CHANGES = {
  close: { from: "OPEN", to: "CLOSED", label: "Close shift" },
  approve: { from: "CLOSED", to: "APPROVED", label: "Approve shift" },
  reopen: { from: "CLOSED", to: "OPEN", label: "Reopen shift" },
} as const;
export type ShiftChange = keyof typeof SHIFT_CHANGES;

/** Meters are read to 2 decimals; anything closer than half a hundredth is the same reading. */
export function meterMatches(previousClosing: number, opening: number): boolean {
  return Math.abs(previousClosing - opening) < 0.005;
}

export type ShiftTotals = {
  meterLitres: number;
  meterAmountPaisa: number;
  /** null when no sales entry has been saved for the shift */
  sales: { totalPaisa: number; creditPaisa: number; diffPaisa: number } | null;
  creditLedgerPaisa: number;
};

export type ShiftCheck = { salesGapPaisa: number | null; creditGapPaisa: number | null; problems: string[] };

/** Compares what the meters say was sold with what was collected (cash + card + credit) and the credit ledger. */
export function checkShift(t: ShiftTotals): ShiftCheck {
  const problems: string[] = [];
  if (!t.sales) {
    if (t.meterAmountPaisa > 0) problems.push("No sales entry saved");
    return { salesGapPaisa: null, creditGapPaisa: null, problems };
  }
  const salesGapPaisa = t.sales.totalPaisa - t.meterAmountPaisa;
  const creditGapPaisa = t.sales.creditPaisa - t.creditLedgerPaisa;
  if (salesGapPaisa !== 0) {
    problems.push(`Collected ${salesGapPaisa < 0 ? "less" : "more"} than meters by ${formatPKR(asPaisa(Math.abs(salesGapPaisa)))}`);
  }
  if (creditGapPaisa !== 0) {
    problems.push(`Credit in sales entry vs credit sales recorded: ${formatSignedPKR(asPaisa(creditGapPaisa))}`);
  }
  if (t.sales.diffPaisa !== 0) {
    problems.push(`Cash ${t.sales.diffPaisa < 0 ? "short" : "over"} by ${formatPKR(asPaisa(Math.abs(t.sales.diffPaisa)))}`);
  }
  return { salesGapPaisa, creditGapPaisa, problems };
}
