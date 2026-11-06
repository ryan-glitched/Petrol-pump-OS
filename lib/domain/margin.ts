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
  /** The shift's own id and date: a night shift's readings may be dated the next morning. */
  shiftId: string | null;
  shiftDate: string | null;
  shift: string | null;
  dispenserId: string;
  dispenser: string;
  nozzleId: string;
  nozzle: string;
  fuel: string;
  litres: number;
  amountPaisa: number;
  dealerMarginPaisaPerL: number;
};

export type MarginRow = { label: string; litres: number; salesPaisa: number; marginPaisa: number };

/** Rows are grouped by stable ids; names are only for display. */
function keyFor(r: MarginReading, by: MarginGroup): string {
  switch (by) {
    case "fuel":
      return `fuel:${r.fuel}`;
    case "dispenser":
      return `dispenser:${r.dispenserId}`;
    case "nozzle":
      return `nozzle:${r.nozzleId}`;
    case "shift":
      return r.shiftId ? `shift:${r.shiftId}` : `none:${r.date}`;
    case "day":
      return `day:${r.date}`;
  }
}

function labelFor(r: MarginReading, by: MarginGroup): string {
  switch (by) {
    case "fuel":
      return r.fuel;
    case "dispenser":
      return r.dispenser;
    case "nozzle":
      return `${r.dispenser} · ${r.nozzle} (${r.fuel})`;
    case "shift":
      return `${r.shiftDate ?? r.date} · ${r.shift ?? "No shift"}`;
    case "day":
      return r.date;
  }
}

/** Dealer margin = litres sold × the margin per litre that was in force when each reading was saved. */
export function groupMargin(readings: MarginReading[], by: MarginGroup): { rows: MarginRow[]; total: MarginRow } {
  const groups = new Map<string, MarginRow>();
  const total: MarginRow = { label: "Total", litres: 0, salesPaisa: 0, marginPaisa: 0 };
  for (const r of readings) {
    const key = keyFor(r, by);
    const row = groups.get(key) ?? { label: labelFor(r, by), litres: 0, salesPaisa: 0, marginPaisa: 0 };
    const margin = fuelGrossMarginPaisa(r.litres, asPaisa(r.dealerMarginPaisaPerL));
    for (const target of [row, total]) {
      target.litres += r.litres;
      target.salesPaisa += r.amountPaisa;
      target.marginPaisa += margin;
    }
    groups.set(key, row);
  }
  const rows = [...groups.values()].sort((a, b) =>
    by === "day" || by === "shift" ? b.label.localeCompare(a.label) : a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  return { rows, total };
}
