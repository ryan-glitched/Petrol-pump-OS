import { ModulePage } from "@/components/forms/module-page";
import { createSalesEntry } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { salesFields } from "@/lib/queries/forms";
import { listSales } from "@/lib/queries/lists";

export default async function SalesPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([salesFields(ctx.branchId), listSales(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Finance"
      title="Sales entry"
      description="Capture cash, card, credit, total sales, cash in hand, and shortage or excess."
      formTitle="Daily sales entry"
      formDescription="Total and cash difference are reconciled on save."
      fields={fields}
      action={createSalesEntry}
      mode="sales"
      canCreate={can(ctx.session.role, "salesEntry")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "cash", label: "Cash" },
        { key: "card", label: "Card" },
        { key: "credit", label: "Credit" },
        { key: "total", label: "Total" },
        { key: "cashInHand", label: "Cash in drawer" },
        { key: "difference", label: "Difference" },
      ]}
      tableTitle="Recent sales entries"
    />
  );
}
