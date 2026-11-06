import { ModulePage } from "@/components/forms/module-page";
import { createNozzleReading } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { nozzleFields } from "@/lib/queries/forms";
import { listNozzleReadings } from "@/lib/queries/lists";

export default async function NozzleReadingsPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([nozzleFields(ctx.branchId), listNozzleReadings(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Fuel sales"
      title="Nozzle readings"
      description="Enter opening and closing nozzle readings; litres and amount are computed against the active fuel rate."
      formTitle="Nozzle reading entry"
      formDescription="Litres auto-calculate from closing minus opening; amount uses the current product rate."
      fields={fields}
      action={createNozzleReading}
      mode="nozzle"
      canCreate={can(ctx.session.role, "readings")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "dispenser", label: "Dispenser" },
        { key: "nozzle", label: "Nozzle" },
        { key: "fuel", label: "Fuel" },
        { key: "opening", label: "Opening" },
        { key: "closing", label: "Closing" },
        { key: "litres", label: "Litres" },
        { key: "amount", label: "Amount" },
        { key: "staff", label: "Staff" },
      ]}
      tableTitle="Recent nozzle readings"
      tableDescription="Most recent dispenser-level readings for this branch."
    />
  );
}
