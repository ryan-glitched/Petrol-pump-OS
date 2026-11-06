import { Brain, TrendingUp } from "lucide-react";
import { ForecastChart } from "@/components/charts/sales-chart";
import { AppShell } from "@/components/shell/app-shell";
import { Badge, Card, SectionHeader } from "@/components/ui/card";
import { requireViewContext } from "@/lib/queries/context";
import { getForecast } from "@/lib/queries/forecasting";
import { getInsights } from "@/lib/queries/insights";
import { formatNumber } from "@/lib/format";

export default async function ForecastingPage() {
  const ctx = await requireViewContext();
  const [forecast, insights] = await Promise.all([getForecast(ctx.branchId), getInsights(ctx.branchId)]);

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Forecasting"
        title="Demand forecast & recommendations"
        description={`Transparent statistical projection (${forecast.engineName}) over recorded nozzle readings. A richer model can be swapped in behind the same interface.`}
      />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">7-day litres forecast</h2>
            <Badge>{forecast.engineName}</Badge>
          </div>
          {forecast.chart.length ? (
            <ForecastChart data={forecast.chart} />
          ) : (
            <p className="py-16 text-center text-sm font-semibold text-slate-400">Not enough reading history to forecast yet.</p>
          )}
        </Card>
        <Card className="bg-slate-950 text-white">
          <Brain className="h-7 w-7 text-emerald-300" />
          <h2 className="mt-5 text-2xl font-black">Next 7 days demand</h2>
          <div className="mt-5 space-y-4">
            {forecast.products.map((p) => (
              <div key={p.product}>
                <p className="text-sm text-slate-300">
                  {p.product} demand · {Math.round(p.confidence * 100)}% confidence
                </p>
                <p className="text-3xl font-black">{formatNumber(p.next7DaysL)} L</p>
                <p className="text-xs text-slate-400">~{formatNumber(p.avgDailyL)} L/day</p>
              </div>
            ))}
            {forecast.products.length === 0 ? <p className="text-sm text-slate-300">No fuel products configured.</p> : null}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-3">
        {insights.map((item, i) => (
          <Card className="flex items-start gap-3" key={i}>
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="font-semibold text-slate-700">{item.text}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
