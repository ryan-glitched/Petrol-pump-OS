import { ModulePage } from "@/components/forms/module-page";
import { createTankDip } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { tankDipFields } from "@/lib/queries/forms";
import { listTankDips } from "@/lib/queries/lists";

export default async function TankDipsPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([tankDipFields(ctx.branchId), listTankDips(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Inventory control"
      title="Tank dip readings"
      description="Capture opening and closing tank dips to compare physical stock against calculated book stock."
      formTitle="Tank dip entry"
      formDescription="Dips feed the daily book-vs-dip variance engine."
      fields={fields}
      action={createTankDip}
      canCreate={can(ctx.session.role, "readings")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "tank", label: "Tank" },
        { key: "openingDip", label: "Opening dip" },
        { key: "closingDip", label: "Closing dip" },
        { key: "litres", label: "Calculated litres" },
        { key: "notes", label: "Notes" },
      ]}
      tableTitle="Recent tank readings"
    />
  );
}
