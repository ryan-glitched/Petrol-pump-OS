// Transparent statistical forecasting. V1 default is a moving average with a
// linear-trend nudge — no external deps, fully explainable. A real ML/LLM model
// can be swapped in later behind the ForecastEngine interface.

export type HistoryPoint = { date: string; litres: number };

export type ForecastPoint = {
  date: string;
  litres: number;
  /** 0..1 confidence; shrinks with volatility and grows with history depth. */
  confidence: number;
};

export interface ForecastEngine {
  readonly name: string;
  predict(args: { history: HistoryPoint[]; horizonDays: number }): ForecastPoint[];
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Least-squares slope of y over index 0..n-1. */
function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const xm = (n - 1) / 2;
  const ym = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (ys[i] - ym);
    den += (i - xm) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const movingAverageEngine: ForecastEngine = {
  name: "Moving average + trend (v1)",
  predict({ history, horizonDays }) {
    const litres = history.map((h) => h.litres);
    const window = litres.slice(-7);
    const base = mean(window.length ? window : litres);
    const trend = slope(litres.slice(-14));
    const volatility = stddev(window);
    const cov = base > 0 ? volatility / base : 1;
    const confidence = Math.max(0.3, Math.min(0.95, 0.95 - cov - (history.length < 7 ? 0.2 : 0)));

    const lastDate = history.length ? history[history.length - 1].date : new Date().toISOString().slice(0, 10);
    const out: ForecastPoint[] = [];
    for (let i = 1; i <= horizonDays; i++) {
      const projected = Math.max(0, base + trend * i);
      out.push({
        date: addDays(lastDate, i),
        litres: Math.round(projected),
        confidence: Math.round(confidence * 100) / 100,
      });
    }
    return out;
  },
};
