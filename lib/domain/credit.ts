// Credit (udhaar) ledger maths: due dates, paying off oldest bills first, and overdue buckets.

export const BILLING_CYCLES = ["FIFTEEN_DAYS", "MONTHLY", "CUSTOM"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  FIFTEEN_DAYS: "Every 15 days",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

export function billingDaysFor(cycle: BillingCycle, customDays?: number): number {
  if (cycle === "FIFTEEN_DAYS") return 15;
  if (cycle === "MONTHLY") return 30;
  return customDays && customDays > 0 ? customDays : 30;
}

export function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** An amount the customer owes: a credit sale, or the opening balance (id = null). */
export type OpenItem = { id: string | null; date: string; dueDate: string; amountPaisa: number; paidPaisa: number };

export const outstanding = (i: OpenItem) => Math.max(0, i.amountPaisa - i.paidPaisa);

/** Applies a payment to the oldest unpaid items first. Returns each touched item's new paid total. */
export function allocatePayment(items: OpenItem[], amountPaisa: number) {
  const ordered = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.date.localeCompare(b.date));
  let left = amountPaisa;
  const allocations: { id: string | null; paidPaisa: number; fullyPaid: boolean }[] = [];
  for (const item of ordered) {
    if (left <= 0) break;
    const owed = outstanding(item);
    if (owed === 0) continue;
    const take = Math.min(owed, left);
    left -= take;
    allocations.push({ id: item.id, paidPaisa: item.paidPaisa + take, fullyPaid: take === owed });
  }
  return { allocations, unappliedPaisa: left };
}

export type Aging = {
  notDuePaisa: number;
  d1to15Paisa: number;
  d16to30Paisa: number;
  d31to60Paisa: number;
  d60plusPaisa: number;
  totalPaisa: number;
  overduePaisa: number;
};

/** Groups what is still owed by how many days past its due date it is. */
export function ageBalance(items: OpenItem[], today: string): Aging {
  const a: Aging = { notDuePaisa: 0, d1to15Paisa: 0, d16to30Paisa: 0, d31to60Paisa: 0, d60plusPaisa: 0, totalPaisa: 0, overduePaisa: 0 };
  for (const item of items) {
    const owed = outstanding(item);
    if (owed === 0) continue;
    const late = daysBetween(item.dueDate, today);
    if (late <= 0) a.notDuePaisa += owed;
    else if (late <= 15) a.d1to15Paisa += owed;
    else if (late <= 30) a.d16to30Paisa += owed;
    else if (late <= 60) a.d31to60Paisa += owed;
    else a.d60plusPaisa += owed;
    a.totalPaisa += owed;
    if (late > 0) a.overduePaisa += owed;
  }
  return a;
}

export type LedgerEntry = { date: string; kind: "Opening balance" | "Credit sale" | "Payment"; detail: string; debitPaisa: number; creditPaisa: number; order: number };

/** Sorts sales (+) and payments (−) by date and adds a running balance. */
export function withRunningBalance(entries: LedgerEntry[]) {
  const rank = { "Opening balance": 0, "Credit sale": 1, Payment: 2 } as const;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || rank[a.kind] - rank[b.kind] || a.order - b.order);
  let balance = 0;
  return sorted.map((e) => {
    balance += e.debitPaisa - e.creditPaisa;
    return { ...e, balancePaisa: balance };
  });
}

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, " ").replace(/\s*-\s*/g, "-");
}
