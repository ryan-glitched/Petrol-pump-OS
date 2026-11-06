import { ModulePage } from "@/components/forms/module-page";
import { createExpense } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { expenseFields } from "@/lib/queries/forms";
import { listExpenses } from "@/lib/queries/lists";

export default async function ExpensesPage() {
  const ctx = await requireViewContext();
  const rows = await listExpenses(ctx.branchId);

  return (
    <ModulePage
      eyebrow="Finance"
      title="Expenses"
      description="Record operating expenses, who paid, and descriptions."
      formTitle="Expense entry"
      formDescription="Expenses feed daily cash reconciliation and reports."
      fields={expenseFields()}
      action={createExpense}
      canCreate={can(ctx.session.role, "expenses")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount" },
        { key: "paidBy", label: "Paid by" },
        { key: "description", label: "Description" },
      ]}
      tableTitle="Recent expenses"
    />
  );
}
