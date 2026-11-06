import { prisma } from "@/lib/db";
import { asPaisa, formatPKR } from "@/lib/money";

export type ReportKey =
  | "daily-sales"
  | "variance"
  | "credit"
  | "expenses"
  | "deliveries"
  | "mobil-oil";

export type ReportDef = {
  key: ReportKey;
  title: string;
  description: string;
};

export const REPORTS: ReportDef[] = [
  { key: "daily-sales", title: "Daily sales report", description: "Cash, card, credit, totals and drawer variance per reconciled day." },
  { key: "variance", title: "Fuel variance report", description: "Book-vs-dip variance per tank with loss flags." },
  { key: "credit", title: "Credit ledger report", description: "Outstanding and settled customer credit by status." },
  { key: "expenses", title: "Expense report", description: "Operating expenses by category and payer." },
  { key: "deliveries", title: "Stock-in report", description: "Fuel deliveries received with cost and supplier." },
  { key: "mobil-oil", title: "Lubricant sales report", description: "Mobil oil units, pricing, and profit." },
];

export type ReportResult = { title: string; columns: string[]; rows: string[][] };

function dateFilter(from?: string, to?: string) {
  const f: { gte?: string; lte?: string } = {};
  if (from) f.gte = from;
  if (to) f.lte = to;
  return Object.keys(f).length ? f : undefined;
}

export async function buildReport(
  branchId: string,
  key: ReportKey,
  from?: string,
  to?: string,
): Promise<ReportResult> {
  const date = dateFilter(from, to);

  switch (key) {
    case "daily-sales": {
      const rows = await prisma.salesEntry.findMany({ where: { branchId, ...(date ? { date } : {}) }, orderBy: { date: "desc" } });
      return {
        title: "Daily sales report",
        columns: ["Date", "Cash", "Card", "Credit", "Total", "Cash in drawer", "Difference"],
        rows: rows.map((r) => [
          r.date,
          formatPKR(asPaisa(r.cashPaisa)),
          formatPKR(asPaisa(r.cardPaisa)),
          formatPKR(asPaisa(r.creditPaisa)),
          formatPKR(asPaisa(r.totalPaisa)),
          formatPKR(asPaisa(r.cashInHandPaisa)),
          formatPKR(asPaisa(r.diffPaisa)),
        ]),
      };
    }
    case "variance": {
      const rows = await prisma.varianceLog.findMany({ where: { branchId, ...(date ? { date } : {}) }, include: { tank: true }, orderBy: { date: "desc" } });
      return {
        title: "Fuel variance report",
        columns: ["Date", "Tank", "Expected litres", "Actual litres", "Variance L", "Variance %", "Flagged"],
        rows: rows.map((r) => [
          r.date,
          r.tank.name,
          r.expectedL.toLocaleString(),
          r.actualL.toLocaleString(),
          r.varianceL.toLocaleString(),
          `${r.variancePct.toFixed(2)}%`,
          r.flagged ? "YES" : "no",
        ]),
      };
    }
    case "credit": {
      const rows = await prisma.creditSale.findMany({ where: { branchId, ...(date ? { dueDate: date } : {}) }, include: { customer: true, product: true }, orderBy: { createdAt: "desc" } });
      return {
        title: "Credit ledger report",
        columns: ["Customer", "Vehicle", "Product", "Litres", "Amount", "Paid", "Status", "Due date"],
        rows: rows.map((r) => [
          r.customer.name,
          r.customer.vehicle,
          r.product.name,
          r.litres.toLocaleString(),
          formatPKR(asPaisa(r.amountPaisa)),
          formatPKR(asPaisa(r.paidPaisa)),
          r.status,
          r.dueDate,
        ]),
      };
    }
    case "expenses": {
      const rows = await prisma.expense.findMany({ where: { branchId, ...(date ? { date } : {}) }, orderBy: { date: "desc" } });
      return {
        title: "Expense report",
        columns: ["Date", "Category", "Amount", "Paid by", "Description"],
        rows: rows.map((r) => [r.date, r.category, formatPKR(asPaisa(r.amountPaisa)), r.paidBy, r.description]),
      };
    }
    case "deliveries": {
      const rows = await prisma.delivery.findMany({ where: { branchId, ...(date ? { date } : {}) }, include: { product: true, tank: true }, orderBy: { date: "desc" } });
      return {
        title: "Stock-in report",
        columns: ["Date", "Supplier", "Product", "Tank", "Quantity (L)", "Rate", "Total cost", "Invoice"],
        rows: rows.map((r) => [
          r.date,
          r.supplier,
          r.product.name,
          r.tank.name,
          r.quantityL.toLocaleString(),
          formatPKR(asPaisa(r.ratePaisa)),
          formatPKR(asPaisa(r.costPaisa)),
          r.invoice,
        ]),
      };
    }
    case "mobil-oil": {
      const rows = await prisma.mobilOilSale.findMany({ where: { branchId, ...(date ? { date } : {}) }, orderBy: { date: "desc" } });
      return {
        title: "Lubricant sales report",
        columns: ["Date", "Product", "Quantity", "Purchase", "Selling", "Profit"],
        rows: rows.map((r) => [
          r.date,
          r.productName,
          String(r.qty),
          formatPKR(asPaisa(r.purchasePaisa)),
          formatPKR(asPaisa(r.sellingPaisa)),
          formatPKR(asPaisa(r.profitPaisa)),
        ]),
      };
    }
  }
}

/** Serialize a report to CSV, escaping quotes/commas/newlines per RFC 4180. */
export function toCSV(result: ReportResult): string {
  const escape = (raw: string) => {
    const cell = /^[=+\-@\t\r]/.test(raw) && !/^-?\d/.test(raw) ? `'${raw}` : raw;
    if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  const lines = [result.columns.map(escape).join(","), ...result.rows.map((row) => row.map(escape).join(","))];
  return lines.join("\n");
}
