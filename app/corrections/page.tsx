import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader } from "@/components/ui/card";
import { DataEntryForm } from "@/components/forms/data-entry-form";
import { DataTable } from "@/components/ui/data-table";
import { voidEntry } from "@/app/actions/corrections";
import { can } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { asPaisa, formatPKR } from "@/lib/money";
import { requireViewContext } from "@/lib/queries/context";

const RECENT = 40;
const pkr = (paisa: number) => formatPKR(asPaisa(paisa));
const L = (litres: number) => `${litres.toLocaleString()} L`;

export default async function CorrectionsPage() {
  const ctx = await requireViewContext();
  if (!can(ctx.session.role, "voidEntries")) redirect("/");
  const branchId = ctx.branchId;
  const recent = { orderBy: [{ date: "desc" as const }, { createdAt: "desc" as const }], take: RECENT };
  const voided = { orderBy: { voidedAt: "desc" as const }, take: RECENT };

  const [readings, dips, deliveries, sales, expenses, vReadings, vDips, vDeliveries, vSales, vExpenses] = await Promise.all([
    prisma.nozzleReading.findMany({ where: { branchId, voidedAt: null }, include: { nozzle: true }, ...recent }),
    prisma.tankDip.findMany({ where: { branchId, voidedAt: null }, include: { tank: true }, ...recent }),
    prisma.delivery.findMany({ where: { branchId, voidedAt: null }, include: { tank: true }, ...recent }),
    prisma.salesEntry.findMany({ where: { branchId, voidedAt: null }, include: { shift: true }, ...recent }),
    prisma.expense.findMany({ where: { branchId, voidedAt: null }, ...recent }),
    prisma.nozzleReading.findMany({ where: { branchId, voidedAt: { not: null } }, include: { nozzle: true }, ...voided }),
    prisma.tankDip.findMany({ where: { branchId, voidedAt: { not: null } }, include: { tank: true }, ...voided }),
    prisma.delivery.findMany({ where: { branchId, voidedAt: { not: null } }, include: { tank: true }, ...voided }),
    prisma.salesEntry.findMany({ where: { branchId, voidedAt: { not: null } }, ...voided }),
    prisma.expense.findMany({ where: { branchId, voidedAt: { not: null } }, ...voided }),
  ]);

  const readingText = (r: (typeof readings)[number]) => `Nozzle reading · ${r.date} · ${r.nozzle.label} · ${r.opening}→${r.closing} (${L(r.litres)})`;
  const dipText = (d: (typeof dips)[number]) => `Tank dip · ${d.date} · ${d.tank.name} · ${L(d.openingDip)}→${L(d.closingDip)}`;
  const deliveryText = (d: (typeof deliveries)[number]) => `Delivery · ${d.date} · ${d.tank.name} · ${L(d.quantityL)} · invoice ${d.invoice}`;
  const salesText = (s: { date: string; totalPaisa: number; cashInHandPaisa: number }) =>
    `Sales entry · ${s.date} · total ${pkr(s.totalPaisa)} · cash in hand ${pkr(s.cashInHandPaisa)}`;
  const expenseText = (e: (typeof expenses)[number]) => `Expense · ${e.date} · ${e.category} · ${pkr(e.amountPaisa)} · ${e.description}`;

  const options = [
    ...readings.map((r) => ({ value: `reading:${r.id}`, label: readingText(r) })),
    ...dips.map((d) => ({ value: `dip:${d.id}`, label: dipText(d) })),
    ...deliveries.map((d) => ({ value: `delivery:${d.id}`, label: deliveryText(d) })),
    ...sales.map((s) => ({ value: `sales:${s.id}`, label: `${salesText(s)}${s.shift ? ` · ${s.shift.shiftSlot}` : ""}` })),
    ...expenses.map((e) => ({ value: `expense:${e.id}`, label: expenseText(e) })),
  ];

  const history = [
    ...vReadings.map((r) => ({ at: r.voidedAt!, by: r.voidedById, reason: r.voidReason, entry: readingText(r) })),
    ...vDips.map((d) => ({ at: d.voidedAt!, by: d.voidedById, reason: d.voidReason, entry: dipText(d) })),
    ...vDeliveries.map((d) => ({ at: d.voidedAt!, by: d.voidedById, reason: d.voidReason, entry: deliveryText(d) })),
    ...vSales.map((s) => ({ at: s.voidedAt!, by: s.voidedById, reason: s.voidReason, entry: salesText(s) })),
    ...vExpenses.map((e) => ({ at: e.voidedAt!, by: e.voidedById, reason: e.voidReason, entry: expenseText(e) })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, RECENT);
  const userIds = [...new Set(history.map((h) => h.by).filter((v): v is string => Boolean(v)))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const userName = new Map(users.map((u) => [u.id, u.name || u.email]));

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Fixing mistakes"
        title="Corrections"
        description="Entered something wrong? Void it here with the reason, then enter the right figures again on the normal page. Voided entries stay on record but stop counting in stock, the loss check, sales and reports."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] [&>*]:min-w-0">
        <DataEntryForm
          title="Void an entry"
          description={`Shows the latest ${RECENT} entries of each kind.`}
          action={voidEntry}
          submitLabel="Void entry"
          fields={[
            { name: "entry", label: "Entry", type: "select", required: true, options },
            { name: "reason", label: "Why is it wrong?", type: "textarea", required: true, placeholder: "e.g. closing meter typed as 12850 instead of 12580" },
          ]}
        />
        <DataTable
          title="Voided entries"
          description="Every void, who did it and why."
          rows={history.map((h) => ({
            when: h.at.toLocaleString("en-PK", { timeZone: "Asia/Karachi" }),
            entry: h.entry,
            reason: h.reason ?? "—",
            by: (h.by && userName.get(h.by)) || "—",
          }))}
          columns={[
            { key: "when", label: "Voided at" },
            { key: "entry", label: "Entry" },
            { key: "reason", label: "Reason" },
            { key: "by", label: "By" },
          ]}
        />
      </div>
    </AppShell>
  );
}
