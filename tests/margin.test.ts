import { describe, expect, it } from "vitest";
import { groupMargin, type MarginReading } from "@/lib/domain/margin";

const r = (o: Partial<MarginReading>): MarginReading => ({
  date: "2026-11-05",
  shift: "Shift 1",
  dispenser: "Dispenser 1",
  nozzle: "Nozzle 1",
  fuel: "HSD",
  litres: 100,
  amountPaisa: 2_800_000,
  dealerMarginPaisaPerL: 700,
  ...o,
});

describe("groupMargin", () => {
  const readings = [
    r({}),
    r({ nozzle: "Nozzle 2", litres: 50, amountPaisa: 1_400_000 }),
    r({ dispenser: "Dispenser 4", fuel: "HOBC", litres: 10, amountPaisa: 330_000, dealerMarginPaisaPerL: 800 }),
  ];

  it("uses Rs 7/L margin per litre sold and totals all rows", () => {
    const { rows, total } = groupMargin(readings, "fuel");
    expect(rows.map((x) => [x.label, x.marginPaisa])).toEqual([
      ["HOBC", 8_000],
      ["HSD", 105_000],
    ]);
    expect(total).toMatchObject({ litres: 160, marginPaisa: 113_000, salesPaisa: 4_530_000 });
  });

  it("groups by dispenser, nozzle, shift and day", () => {
    expect(groupMargin(readings, "dispenser").rows).toHaveLength(2);
    expect(groupMargin(readings, "nozzle").rows).toHaveLength(3);
    expect(groupMargin([...readings, r({ shift: null })], "shift").rows.map((x) => x.label)).toEqual([
      "2026-11-05 · Shift 1",
      "2026-11-05 · No shift",
    ]);
    expect(groupMargin(readings, "day").rows).toHaveLength(1);
  });
});
