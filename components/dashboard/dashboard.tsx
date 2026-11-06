import { AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import { Card, Badge } from "@/components/ui/card";
import { PaymentMixChart, ProductSalesChart, RevenueTrendChart } from "@/components/charts/sales-chart";
import { formatNumber } from "@/lib/format";
import type { DashboardData } from "@/lib/queries/dashboard";
import type { Insight } from "@/lib/queries/insights";

export function Dashboard({ data, insights }: { data: DashboardData; insights: Insight[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <Card className="transition hover:-translate-y-1 hover:shadow-xl" key={kpi.label}>
            <p className="text-sm font-semibold text-slate-500">{kpi.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{kpi.value}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">7-day revenue trend</h2>
              <p className="text-sm text-slate-500">Reconciled sales totals for this station.</p>
            </div>
            <Badge>Live</Badge>
          </div>
          {data.revenueTrend.length ? (
            <RevenueTrendChart data={data.revenueTrend} />
          ) : (
            <p className="py-16 text-center text-sm font-semibold text-slate-400">No sales recorded yet.</p>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-black text-slate-950">Manager recommendations</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Computed from variance, stock, and credit data.</p>
          <div className="mt-5 space-y-3">
            {insights.map((item, i) => (
              <div className="flex gap-3 rounded-2xl bg-slate-50 p-3" key={i}>
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm font-semibold leading-6 text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black text-slate-950">Product-wise litres sold</h2>
          <p className="mt-1 text-sm text-slate-500">Last 7 days.</p>
          {data.productSales.length ? (
            <ProductSalesChart data={data.productSales} />
          ) : (
            <p className="py-16 text-center text-sm font-semibold text-slate-400">No readings recorded yet.</p>
          )}
        </Card>
        <Card>
          <h2 className="text-xl font-black text-slate-950">Cash vs card vs credit</h2>
          <p className="mt-1 text-sm text-slate-500">Last 7 days.</p>
          {data.paymentMix.some((m) => m.value > 0) ? (
            <PaymentMixChart data={data.paymentMix} />
          ) : (
            <p className="py-16 text-center text-sm font-semibold text-slate-400">No sales recorded yet.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">Inventory remaining</h2>
          <Badge tone="orange">{formatNumber(data.tankLevels.reduce((s, t) => s + t.capacityL, 0))} L capacity</Badge>
        </div>
        <div className="space-y-4">
          {data.tankLevels.map((tank) => (
            <div key={tank.id}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-800">
                  {tank.name} · {tank.product}
                </span>
                <span className={tank.low ? "font-black text-orange-600" : "font-bold text-slate-600"}>
                  {formatNumber(tank.currentL)} L / {formatNumber(tank.capacityL)} L
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={tank.low ? "h-full bg-orange-500" : "h-full bg-emerald-500"} style={{ width: `${tank.pctRemaining}%` }} />
              </div>
            </div>
          ))}
          {data.tankLevels.length === 0 ? <p className="text-sm font-semibold text-slate-400">No tanks configured.</p> : null}
        </div>
      </Card>

      {data.varianceAlerts.length ? (
        <Card className="border-orange-200 bg-orange-50">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-orange-600" />
            <div>
              <h2 className="font-black text-orange-950">Loss alerts ({data.flaggedCount})</h2>
              <ul className="mt-2 space-y-1 text-sm font-semibold text-orange-800">
                {data.varianceAlerts.map((a, i) => (
                  <li key={i}>
                    {a.tank} · {a.date}: {a.varianceL.toLocaleString()} L ({a.variancePct.toFixed(1)}%)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            <p className="text-sm font-bold text-emerald-900">No fuel-loss variance flagged within tolerance.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
