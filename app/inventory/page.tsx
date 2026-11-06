import { AppShell } from "@/components/shell/app-shell";
import { Card, Badge, SectionHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { requireViewContext } from "@/lib/queries/context";
import { getTankLevels } from "@/lib/queries/inventory";
import { formatNumber } from "@/lib/format";

export default async function InventoryPage() {
  const ctx = await requireViewContext();
  const tankLevels = await getTankLevels(ctx.branchId);

  const inventoryRows = tankLevels.map((tank) => ({
    tank: tank.name,
    product: tank.product,
    capacity: `${formatNumber(tank.capacityL)} L`,
    current: `${formatNumber(tank.currentL)} L`,
    safeLevel: `${formatNumber(tank.safeLevelL)} L`,
    reorder: tank.low ? `${formatNumber(tank.reorderL)} L` : "—",
    status: tank.low ? "Low stock" : "Healthy",
  }));

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Stock control"
        title="Inventory / stock"
        description="Tank balances reconstructed from deliveries, sales, and the latest physical dip, with low-stock reorder suggestions."
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">Tank levels</h2>
            <Badge tone="orange">Low stock rules active</Badge>
          </div>
          <div className="space-y-5">
            {tankLevels.map((tank) => (
              <div key={tank.id}>
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span>
                    {tank.name} · {tank.product}
                  </span>
                  <span className={tank.low ? "text-orange-600" : "text-emerald-700"}>{tank.pctRemaining}%</span>
                </div>
                <div className="h-4 rounded-full bg-slate-100">
                  <div
                    className={tank.low ? "h-4 rounded-full bg-orange-500" : "h-4 rounded-full bg-emerald-500"}
                    style={{ width: `${tank.pctRemaining}%` }}
                  />
                </div>
              </div>
            ))}
            {tankLevels.length === 0 ? <p className="text-sm font-semibold text-slate-400">No tanks configured for this branch.</p> : null}
          </div>
        </Card>
        <DataTable
          title="Tank stock table"
          description="Current balance and reorder suggestion per tank."
          rows={inventoryRows}
          columns={[
            { key: "tank", label: "Tank" },
            { key: "product", label: "Product" },
            { key: "capacity", label: "Capacity" },
            { key: "current", label: "Current" },
            { key: "safeLevel", label: "Safe level" },
            { key: "reorder", label: "Reorder" },
            { key: "status", label: "Status" },
          ]}
        />
      </div>
    </AppShell>
  );
}
