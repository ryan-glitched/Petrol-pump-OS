import { AppShell } from "@/components/shell/app-shell";
import { Card, SectionHeader } from "@/components/ui/card";
import { DataEntryForm } from "@/components/forms/data-entry-form";
import { DataTable } from "@/components/ui/data-table";
import { createFuelPrice, updateVarianceTolerance } from "@/app/actions/admin";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { fuelPriceFields } from "@/lib/queries/forms";
import { priceOptionsWithCurrent } from "@/lib/queries/options";
import { ROLE_LABELS, ROLES, CAPABILITIES } from "@/lib/constants";

export default async function SettingsPage() {
  const ctx = await requireViewContext();
  const [priceFields, prices] = await Promise.all([
    fuelPriceFields(ctx.branchId),
    priceOptionsWithCurrent(ctx.branchId),
  ]);

  const canPrices = can(ctx.session.role, "managePrices");
  const canSettings = can(ctx.session.role, "settings");

  const priceRows = prices.map((p) => ({ product: p.product, current: p.current, margin: p.margin }));

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Configuration"
        title="Settings"
        description="Station profile, fuel pricing, variance tolerance, and the role permission matrix."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Station setup</h2>
          <div className="mt-5 grid gap-4">
            {[
              ["Company", ctx.branch.company],
              ["Station", ctx.branch.name],
              ["Manager", ctx.branch.managerName],
              ["Variance tolerance", `${ctx.branch.varianceTolerancePct}%`],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-slate-50 p-4" key={label}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <p className="mt-1 font-black text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Current fuel rates</h2>
          <div className="mt-5">
            <DataTable
              title="Active rates"
              rows={priceRows}
              columns={[
                { key: "product", label: "Product" },
                { key: "current", label: "Current rate" },
                { key: "margin", label: "Dealer margin" },
              ]}
            />
          </div>
        </Card>
      </div>

      {canPrices ? (
        <div className="mt-6">
          <DataEntryForm
            title="Update fuel rate"
            description="Save a new selling rate and PKR-per-litre margin. Historical readings remain unchanged."
            fields={priceFields}
            action={createFuelPrice}
            submitLabel="Save rate"
          />
        </div>
      ) : null}

      {canSettings ? (
        <div className="mt-6">
          <DataEntryForm
            title="Variance tolerance"
            description="Book-vs-dip variance above this percentage is flagged as a possible loss."
            fields={[
              {
                name: "varianceTolerancePct",
                label: "Tolerance (%)",
                type: "number",
                required: true,
                step: "0.1",
                defaultValue: String(ctx.branch.varianceTolerancePct),
              },
            ]}
            action={updateVarianceTolerance}
            submitLabel="Update tolerance"
          />
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="text-xl font-black">Role permissions</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 font-bold">Capability</th>
                {ROLES.map((role) => (
                  <th className="px-3 py-2 font-bold" key={role}>
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(CAPABILITIES).map(([cap, roles]) => (
                <tr key={cap}>
                  <td className="px-3 py-2 font-semibold text-slate-700">{cap}</td>
                  {ROLES.map((role) => (
                    <td className="px-3 py-2" key={role}>
                      {(roles as readonly string[]).includes(role) ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
