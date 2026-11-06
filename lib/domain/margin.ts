import { asPaisa } from "@/lib/money";
import { fuelGrossMarginPaisa } from "@/lib/domain/pricing";

export const MARGIN_GROUPS = {
  fuel: "Fuel",
  dispenser: "Dispenser",
  nozzle: "Nozzle",
  shift: "Shift",
  day: "Day",
} as const;
export type MarginGroup = keyof typeof MARGIN_GROUPS;

export type MarginReading = {
  date: string;
  shift: string | null;
  dispenser: string;
  nozzle: string;
  fuel: string;
  litres: number;
  amountPaisa: number;
  dealerMarginPaisaPerL: number;
};

export type MarginRow = { label: string; litres: number; salesPaisa: number; marginPaisa: number };

function labelFor(r: MarginReading, by: MarginGroup): string {
  switch (by) {
    case "fuel":
      return r.fuel;
    case "dispenser":
      return r.dispenser;
    case "nozzle":
      return `${r.dispenser} · ${r.nozzle} (${r.fuel})`;
    case "shift":
      return `${r.date} · ${r.shift ?? "No shift"}`;
    case "day":
      return r.date;
  }
}

/** Dealer margin = litres sold × the margin per litre that was in force when each reading was saved. */
export function groupMargin(readings: MarginReading[], by: MarginGroup): { rows: MarginRow[]; total: MarginRow } {
  const groups = new Map<string, MarginRow>();
  const total: MarginRow = { label: "Total", litres: 0, salesPaisa: 0, marginPaisa: 0 };
  for (const r of readings) {
    const label = labelFor(r, by);
    const row = groups.get(label) ?? { label, litres: 0, salesPaisa: 0, marginPaisa: 0 };
    const margin = fuelGrossMarginPaisa(r.litres, asPaisa(r.dealerMarginPaisaPerL));
    for (const target of [row, total]) {
      target.litres += r.litres;
      target.salesPaisa += r.amountPaisa;
      target.marginPaisa += margin;
    }
    groups.set(label, row);
  }
  const rows = [...groups.values()].sort((a, b) =>
    by === "day" || by === "shift" ? b.label.localeCompare(a.label) : a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  return { rows, total };
}
