import { ModulePage } from "@/components/forms/module-page";
import { createCreditSale } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { creditFields } from "@/lib/queries/forms";
import { listCreditSales } from "@/lib/queries/lists";

export default async function CreditCustomersPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([creditFields(ctx.branchId), listCreditSales(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Receivables"
      title="Credit customers"
      description="Track customer vehicle, product, litres, amount, payment status, and due date."
      formTitle="Credit sale entry"
      formDescription="Customers are created on first sale and reused by name + vehicle."
      fields={fields}
      action={createCreditSale}
      canCreate={can(ctx.session.role, "credit")}
      rows={rows}
      columns={[
        { key: "customer", label: "Customer" },
        { key: "vehicle", label: "Vehicle" },
        { key: "fuel", label: "Product" },
        { key: "litres", label: "Litres" },
        { key: "amount", label: "Amount" },
        { key: "paid", label: "Paid" },
        { key: "status", label: "Status" },
        { key: "dueDate", label: "Due date" },
      ]}
      tableTitle="Credit customer ledger"
    />
  );
}
