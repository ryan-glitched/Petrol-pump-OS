import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader } from "@/components/ui/card";
import { DataEntryForm } from "@/components/forms/data-entry-form";
import { DataTable } from "@/components/ui/data-table";
import { createShift } from "@/app/actions/entries";
import { changeShiftStatus } from "@/app/actions/shifts";
import { can } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { SHIFT_CHANGES, type ShiftChange } from "@/lib/domain/shifts";
import { requireViewContext } from "@/lib/queries/context";
import { shiftFields } from "@/lib/queries/forms";
import { listShifts } from "@/lib/queries/lists";

export default async function ShiftsPage() {
  const ctx = await requireViewContext();
  const role = ctx.session.role;
  const canOpen = can(role, "shifts");
  const canApprove = can(role, "approveShifts");
  const changes: ShiftChange[] = [...(canOpen ? (["close"] as const) : []), ...(canApprove ? (["approve", "reopen"] as const) : [])];

  const [fields, rows, pending] = await Promise.all([
    shiftFields(ctx.branchId),
    listShifts(ctx.branchId),
    prisma.shift.findMany({
      where: { branchId: ctx.branchId, status: { in: ["OPEN", "CLOSED"] } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Operations"
        title="Shift management"
        description="Open a shift, enter its readings, dips and sales, then close it. The check compares meter sales with cash + card + credit collected. The Owner approves closed shifts; closed shifts can't be changed unless the Owner reopens them."
      />
      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        {canOpen ? (
          <DataEntryForm title="Open a shift" description="Anchors the shift's readings and sales." action={createShift} fields={fields} submitLabel="Open shift" />
        ) : null}
        {changes.length ? (
          <DataEntryForm
            title="Close or approve a shift"
            description="Closing shows anything that doesn't add up."
            action={changeShiftStatus}
            submitLabel="Save"
            fields={[
              {
                name: "shiftId",
                label: "Shift",
                type: "select",
                required: true,
                options: pending.map((s) => ({ value: s.id, label: `${s.date} · ${s.shiftSlot} · ${s.status}` })),
              },
              {
                name: "change",
                label: "Action",
                type: "select",
                required: true,
                options: changes.map((c) => ({ value: c, label: SHIFT_CHANGES[c].label })),
              },
            ]}
          />
        ) : null}
      </div>
      <div className="mt-6 min-w-0">
        <DataTable
          title="Shifts and checks"
          description="Gap = collected (cash + card + credit) minus meter sales. OK means everything matches."
          rows={rows}
          columns={[
            { key: "date", label: "Date" },
            { key: "shift", label: "Shift" },
            { key: "status", label: "Status" },
            { key: "manager", label: "Manager" },
            { key: "cashier", label: "Cashier" },
            { key: "meter", label: "Meter sales" },
            { key: "collected", label: "Collected" },
            { key: "gap", label: "Gap" },
            { key: "checks", label: "Checks" },
          ]}
        />
      </div>
    </AppShell>
  );
}
