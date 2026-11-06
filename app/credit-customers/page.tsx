import { AppShell } from "@/components/shell/app-shell";
import { Card, SectionHeader } from "@/components/ui/card";
import { DataEntryForm } from "@/components/forms/data-entry-form";
import { DataTable } from "@/components/ui/data-table";
import {
  addCreditVehicle,
  createCreditCustomer,
  createCreditSale,
  recordCreditPayment,
  updateCreditCustomer,
} from "@/app/actions/credit";
import { can } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import {
  BILLING_CYCLE_LABELS,
  BILLING_CYCLES,
  ageBalance,
  withRunningBalance,
  type BillingCycle,
  type LedgerEntry,
  type OpenItem,
} from "@/lib/domain/credit";
import { asPaisa, formatPKR } from "@/lib/money";
import { requireViewContext } from "@/lib/queries/context";
import { todayISO } from "@/lib/queries/forms";
import { listCreditPayments, listCreditSales } from "@/lib/queries/lists";
import { productOptions } from "@/lib/queries/options";
import { PAYMENT_METHODS } from "@/lib/validation/schemas";

const pkr = (paisa: number) => formatPKR(asPaisa(paisa));
const KEEP = "Leave blank to keep as is";
const cycleOptions = BILLING_CYCLES.map((c) => ({ value: c, label: BILLING_CYCLE_LABELS[c] }));
const billingLabel = (cycle: string, days: number) =>
  cycle === "CUSTOM" ? `Custom (${days} days)` : BILLING_CYCLE_LABELS[cycle as BillingCycle] ?? cycle;

export default async function CreditCustomersPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const ctx = await requireViewContext();
  const branchId = ctx.branchId;
  const today = todayISO();
  const selectedId = (await searchParams).customer;
  const canEnter = can(ctx.session.role, "credit");
  const canManage = can(ctx.session.role, "manageCredit");

  const [customers, fuels, saleRows, paymentRows] = await Promise.all([
    prisma.creditCustomer.findMany({
      where: { branchId },
      include: { vehicles: { orderBy: { plate: "asc" } }, sales: { where: { status: { in: ["Due", "Partial"] } } } },
      orderBy: { name: "asc" },
    }),
    productOptions(branchId, "FUEL"),
    listCreditSales(branchId),
    listCreditPayments(branchId),
  ]);

  const summaries = customers.map((c) => {
    const items: OpenItem[] = c.sales.map((s) => ({ id: s.id, date: s.date, dueDate: s.dueDate, amountPaisa: s.amountPaisa, paidPaisa: s.paidPaisa }));
    if (c.openingBalancePaisa > c.openingPaidPaisa) {
      const date = c.openingDate ?? c.createdAt.toISOString().slice(0, 10);
      items.push({ id: null, date, dueDate: date, amountPaisa: c.openingBalancePaisa, paidPaisa: c.openingPaidPaisa });
    }
    return { customer: c, aging: ageBalance(items, today) };
  });

  const activeCustomers = customers.filter((c) => c.active);
  const customerOptions = activeCustomers.map((c) => ({ value: c.id, label: c.name }));
  const allCustomerOptions = customers.map((c) => ({ value: c.id, label: `${c.name}${c.active ? "" : " – blocked"}` }));
  const owingOptions = summaries
    .filter((s) => s.aging.totalPaisa > 0)
    .map((s) => ({ value: s.customer.id, label: `${s.customer.name} (owes ${pkr(s.aging.totalPaisa)})` }));
  const vehicleOptions = activeCustomers.flatMap((c) =>
    c.vehicles.filter((v) => v.active).map((v) => ({ value: v.id, label: `${v.plate} — ${c.name}` }))
  );

  const selected = customers.find((c) => c.id === selectedId);
  let ledger: ReturnType<typeof withRunningBalance> = [];
  if (selected) {
    const [sales, payments] = await Promise.all([
      prisma.creditSale.findMany({ where: { customerId: selected.id }, include: { vehicle: true, product: true }, orderBy: { createdAt: "asc" } }),
      prisma.creditPayment.findMany({ where: { customerId: selected.id }, orderBy: { createdAt: "asc" } }),
    ]);
    const entries: LedgerEntry[] = [];
    if (selected.openingBalancePaisa > 0) {
      entries.push({ date: selected.openingDate ?? "", kind: "Opening balance", detail: "Owed before using the app", debitPaisa: selected.openingBalancePaisa, creditPaisa: 0, order: 0 });
    }
    sales.forEach((s, i) =>
      entries.push({
        date: s.date,
        kind: "Credit sale",
        detail: `${s.vehicle?.plate ?? "—"} · ${s.product.name} · ${s.litres.toLocaleString()} L · due ${s.dueDate}`,
        debitPaisa: s.amountPaisa,
        creditPaisa: 0,
        order: i,
      })
    );
    payments.forEach((p, i) =>
      entries.push({ date: p.date, kind: "Payment", detail: [p.method, p.reference].filter(Boolean).join(" · "), debitPaisa: 0, creditPaisa: p.amountPaisa, order: i })
    );
    ledger = withRunningBalance(entries);
  }
  const selectedAging = summaries.find((s) => s.customer.id === selected?.id)?.aging;

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Receivables"
        title="Credit customers"
        description="Who owes how much, how late it is, and every credit sale and payment. Payments pay off the oldest bill first."
      />

      <DataTable
        title="Balances and overdue"
        description="Overdue days count from each bill's due date (sale date + the customer's billing days)."
        rows={summaries.map(({ customer: c, aging: a }) => ({
          name: `${c.name}${c.active ? "" : " (blocked)"}`,
          vehicles: c.vehicles.map((v) => v.plate).join(", ") || "—",
          billing: billingLabel(c.billingCycle, c.billingDays),
          owed: pkr(a.totalPaisa),
          notDue: pkr(a.notDuePaisa),
          d15: pkr(a.d1to15Paisa),
          d30: pkr(a.d16to30Paisa),
          d60: pkr(a.d31to60Paisa),
          d60plus: pkr(a.d60plusPaisa),
          limit:
            c.creditLimitPaisa === null
              ? "No limit"
              : a.totalPaisa > c.creditLimitPaisa
                ? `OVER by ${pkr(a.totalPaisa - c.creditLimitPaisa)}`
                : `${pkr(c.creditLimitPaisa - a.totalPaisa)} left`,
        }))}
        columns={[
          { key: "name", label: "Customer" },
          { key: "vehicles", label: "Vehicles" },
          { key: "billing", label: "Billing" },
          { key: "owed", label: "Total owed" },
          { key: "notDue", label: "Not due yet" },
          { key: "d15", label: "1–15 days late" },
          { key: "d30", label: "16–30 days" },
          { key: "d60", label: "31–60 days" },
          { key: "d60plus", label: "60+ days" },
          { key: "limit", label: "Credit limit" },
        ]}
      />

      {canEnter ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
          <DataEntryForm
            title="Credit sale"
            description="Fuel given on credit. The due date is set from the customer's billing cycle."
            action={createCreditSale}
            submitLabel="Save credit sale"
            fields={[
              { name: "date", label: "Sale date", type: "date", required: true, defaultValue: today },
              { name: "customerId", label: "Customer", type: "select", required: true, options: customerOptions },
              { name: "vehicleId", label: "Vehicle", type: "select", options: vehicleOptions },
              { name: "productId", label: "Fuel", type: "select", required: true, options: fuels },
              { name: "litres", label: "Litres", type: "number", required: true, step: "0.01" },
              { name: "amount", label: "Amount (PKR)", type: "number", required: true, step: "1" },
            ]}
          />
          <DataEntryForm
            title="Payment received"
            description="Full or part payment. It pays off the oldest unpaid bill first."
            action={recordCreditPayment}
            submitLabel="Save payment"
            fields={[
              { name: "date", label: "Payment date", type: "date", required: true, defaultValue: today },
              { name: "customerId", label: "Customer", type: "select", required: true, options: owingOptions },
              { name: "amount", label: "Amount (PKR)", type: "number", required: true, step: "1" },
              { name: "method", label: "Paid by", type: "select", required: true, options: PAYMENT_METHODS.map((m) => ({ value: m, label: m })) },
              { name: "reference", label: "Cheque / transfer no.", type: "text" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
          />
          <DataEntryForm
            title="Add a vehicle"
            description="Add another vehicle to an existing customer's account."
            action={addCreditVehicle}
            submitLabel="Add vehicle"
            fields={[
              { name: "customerId", label: "Customer", type: "select", required: true, options: customerOptions },
              { name: "plate", label: "Vehicle number", type: "text", required: true, placeholder: "e.g. LES-4471" },
            ]}
          />
          {canManage ? (
            <DataEntryForm
              title="Add a customer"
              description="Opening balance = what they already owed before you started using the app."
              action={createCreditCustomer}
              submitLabel="Add customer"
              fields={[
                { name: "name", label: "Customer name", type: "text", required: true },
                { name: "company", label: "Company", type: "text" },
                { name: "phone", label: "Phone", type: "text" },
                { name: "cnic", label: "CNIC", type: "text" },
                { name: "ntn", label: "NTN", type: "text" },
                { name: "address", label: "Address", type: "text" },
                { name: "vehicles", label: "Vehicle numbers (separate with commas)", type: "text", placeholder: "e.g. LES-4471, ICT-2210" },
                { name: "billingCycle", label: "Pays", type: "select", required: true, options: cycleOptions, defaultValue: "MONTHLY" },
                { name: "billingDays", label: "Days to pay (custom only)", type: "number", step: "1" },
                { name: "creditLimit", label: "Credit limit (PKR, blank = no limit)", type: "number", step: "1" },
                { name: "openingBalance", label: "Opening balance (PKR)", type: "number", step: "1" },
                { name: "openingDate", label: "Opening balance owed since", type: "date" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          ) : null}
          {canManage ? (
            <DataEntryForm
              title="Change a customer"
              description={`Pick the customer, then fill only what you want to change. ${KEEP}.`}
              action={updateCreditCustomer}
              submitLabel="Save customer"
              fields={[
                { name: "customerId", label: "Customer", type: "select", required: true, options: allCustomerOptions },
                { name: "name", label: "New name", type: "text", placeholder: KEEP },
                { name: "company", label: "Company", type: "text", placeholder: KEEP },
                { name: "phone", label: "Phone", type: "text", placeholder: KEEP },
                { name: "cnic", label: "CNIC", type: "text", placeholder: KEEP },
                { name: "ntn", label: "NTN", type: "text", placeholder: KEEP },
                { name: "address", label: "Address", type: "text", placeholder: KEEP },
                { name: "billingCycle", label: "Pays", type: "select", options: cycleOptions },
                { name: "billingDays", label: "Days to pay (custom only)", type: "number", step: "1", placeholder: KEEP },
                { name: "creditLimit", label: "Credit limit (PKR)", type: "number", step: "1", placeholder: KEEP },
                { name: "removeLimit", label: "Remove credit limit", type: "select", options: [{ value: "true", label: "Yes – no limit" }] },
                {
                  name: "active",
                  label: "Status",
                  type: "select",
                  options: [
                    { value: "true", label: "Active" },
                    { value: "false", label: "Blocked (no new credit)" },
                  ],
                },
              ]}
            />
          ) : null}
        </div>
      ) : null}

      <Card className="mt-6">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-semibold text-slate-700">
            Customer statement
            <select
              name="customer"
              defaultValue={selected?.id ?? ""}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Choose a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Show statement</button>
        </form>
        {selected && selectedAging ? (
          <p className="mt-3 text-sm text-slate-600">
            {[selected.company, selected.phone, selected.cnic && `CNIC ${selected.cnic}`, selected.ntn && `NTN ${selected.ntn}`].filter(Boolean).join(" · ") || "No contact details"}
            {" — "}owes <strong>{pkr(selectedAging.totalPaisa)}</strong>, of which <strong>{pkr(selectedAging.overduePaisa)}</strong> is overdue.
          </p>
        ) : null}
      </Card>

      {selected ? (
        <div className="mt-6">
          <DataTable
            title={`Statement: ${selected.name}`}
            rows={ledger.map((e) => ({
              date: e.date || "—",
              kind: e.kind,
              detail: e.detail || "—",
              debit: e.debitPaisa ? pkr(e.debitPaisa) : "",
              credit: e.creditPaisa ? pkr(e.creditPaisa) : "",
              balance: pkr(e.balancePaisa),
            }))}
            columns={[
              { key: "date", label: "Date" },
              { key: "kind", label: "Entry" },
              { key: "detail", label: "Details" },
              { key: "debit", label: "Credit given" },
              { key: "credit", label: "Paid" },
              { key: "balance", label: "Balance" },
            ]}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <DataTable
          title="Recent credit sales"
          rows={saleRows}
          columns={[
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer" },
            { key: "vehicle", label: "Vehicle" },
            { key: "fuel", label: "Fuel" },
            { key: "litres", label: "Litres" },
            { key: "amount", label: "Amount" },
            { key: "paid", label: "Paid" },
            { key: "status", label: "Status" },
            { key: "dueDate", label: "Due date" },
          ]}
        />
        <DataTable
          title="Recent payments"
          rows={paymentRows}
          columns={[
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer" },
            { key: "amount", label: "Amount" },
            { key: "method", label: "Paid by" },
            { key: "reference", label: "Reference" },
          ]}
        />
      </div>
    </AppShell>
  );
}
