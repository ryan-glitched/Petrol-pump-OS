import { ModulePage } from "@/components/forms/module-page";
import { createShift } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { shiftFields } from "@/lib/queries/forms";
import { listShifts } from "@/lib/queries/lists";

export default async function ShiftsPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([shiftFields(ctx.branchId), listShifts(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Operations"
      title="Shift management"
      description="Record managers, cashiers, fillers, guards, opening cash, closing cash, and shift notes."
      formTitle="New shift entry"
      formDescription="Open a shift to anchor the day's readings and sales."
      fields={fields}
      action={createShift}
      canCreate={can(ctx.session.role, "shifts")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "shift", label: "Shift" },
        { key: "manager", label: "Manager" },
        { key: "cashier", label: "Cashier" },
        { key: "openingCash", label: "Opening cash" },
        { key: "closingCash", label: "Closing cash" },
      ]}
      tableTitle="Recent shift records"
    />
  );
}
