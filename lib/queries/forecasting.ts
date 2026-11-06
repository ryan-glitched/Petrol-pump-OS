import { prisma } from "@/lib/db";
import { movingAverageEngine, type HistoryPoint } from "@/lib/forecast/engine";

const FUEL_KEYS: Record<string, "hiSuper" | "hobc" | "diesel"> = {
  "Hi Super": "hiSuper",
  HOBC: "hobc",
  Diesel: "diesel",
};

export type ProductForecast = {
  product: string;
  avgDailyL: number;
  next7DaysL: number;
  confidence: number;
};

export type ForecastData = {
  chart: Array<Record<string, string | number>>;
  products: ProductForecast[];
  engineName: string;
};

/** Build per-product daily litre history and project 7 days forward. */
export async function getForecast(branchId: string): Promise<ForecastData> {
  const readings = await prisma.nozzleReading.findMany({
    where: { branchId },
    include: { product: true },
    orderBy: { date: "asc" },
  });

  const products = await prisma.product.findMany({ where: { kind: "FUEL" }, orderBy: { name: "asc" } });

  // history[productName] = Map<date, litres>
  const history = new Map<string, Map<string, number>>();
  for (const p of products) history.set(p.name, new Map());
  for (const r of readings) {
    const m = history.get(r.product.name);
    if (m) m.set(r.date, (m.get(r.date) ?? 0) + r.litres);
  }

  const forecasts = new Map<string, ReturnType<typeof movingAverageEngine.predict>>();
  const summary: ProductForecast[] = [];

  for (const p of products) {
    const series: HistoryPoint[] = [...(history.get(p.name) ?? new Map())].map(([date, litres]) => ({ date, litres }));
    const predictions = movingAverageEngine.predict({ history: series, horizonDays: 7 });
    forecasts.set(p.name, predictions);
    const next7 = predictions.reduce((sum, x) => sum + x.litres, 0);
    summary.push({
      product: p.name,
      avgDailyL: Math.round(next7 / 7),
      next7DaysL: next7,
      confidence: predictions.length ? predictions[0].confidence : 0,
    });
  }

  // Assemble a chart keyed by forecast day, one bar per known fuel key.
  const horizonDates = forecasts.values().next().value?.map((p) => p.date) ?? [];
  const chart: Array<Record<string, string | number>> = horizonDates.map((date: string, i: number) => {
    const row: Record<string, string | number> = { day: date.slice(5) };
    for (const p of products) {
      const key = FUEL_KEYS[p.name];
      if (key) row[key] = forecasts.get(p.name)?.[i]?.litres ?? 0;
    }
    return row;
  });

  return { chart, products: summary, engineName: movingAverageEngine.name };
}
