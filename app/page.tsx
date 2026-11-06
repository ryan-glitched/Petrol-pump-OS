import { Dashboard } from "@/components/dashboard/dashboard";
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader } from "@/components/ui/card";
import { requireViewContext } from "@/lib/queries/context";
import { getDashboard } from "@/lib/queries/dashboard";
import { getInsights } from "@/lib/queries/insights";

export default async function Home() {
  const ctx = await requireViewContext();
  const [data, insights] = await Promise.all([getDashboard(ctx.branchId), getInsights(ctx.branchId)]);

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Station dashboard"
        title={`${ctx.branch.name} overview`}
        description="Operational KPIs, stock levels, fuel-loss variance, and manager recommendations — all computed from recorded data."
      />
      <Dashboard data={data} insights={insights} />
    </AppShell>
  );
}
