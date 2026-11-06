import { ModulePage } from "@/components/forms/module-page";
import { createStaff } from "@/app/actions/admin";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { staffFields } from "@/lib/queries/forms";
import { listStaff } from "@/lib/queries/lists";

export default async function StaffPage() {
  const ctx = await requireViewContext();
  const rows = await listStaff(ctx.branchId);

  return (
    <ModulePage
      eyebrow="People"
      title="Staff management"
      description="Manage managers, cashiers, fillers, and guards with shift and attendance status."
      formTitle="Add staff member"
      formDescription="New staff become selectable across shift, reading, and sale forms."
      fields={staffFields()}
      action={createStaff}
      canCreate={can(ctx.session.role, "manageStaff")}
      rows={rows}
      columns={[
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "shift", label: "Shift" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status" },
      ]}
      tableTitle="Staff roster"
    />
  );
}
