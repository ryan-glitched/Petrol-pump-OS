import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Card, SectionHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { buildReport, REPORTS, type ReportKey } from "@/lib/reports";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; from?: string; to?: string }>;
}) {
  const ctx = await requireViewContext();
  const sp = await searchParams;
  const canRun = can(ctx.session.role, "runReports");
  if (!can(ctx.session.role, "viewReports")) redirect("/");

  const activeKey: ReportKey = (REPORTS.find((r) => r.key === sp.report)?.key ?? "daily-sales") as ReportKey;
  const preview = await buildReport(ctx.branchId, activeKey, sp.from, sp.to);

  const qs = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  const columns = preview.columns.map((label, i) => ({ key: String(i), label }));
  const rows = preview.rows.map((row) => Object.fromEntries(row.map((cell, i) => [String(i), cell])));

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Management reporting"
        title="Reports"
        description="Date-filtered reports for sales, variance, credit, expenses, deliveries, and lubricants — exportable to CSV."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-4" method="get">
          <input type="hidden" name="report" value={activeKey} />
          <label className="text-sm font-bold text-slate-700">
            From
            <input
              className="mt-1 block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:border-emerald-400"
              type="date"
              name="from"
              defaultValue={sp.from}
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            To
            <input
              className="mt-1 block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:border-emerald-400"
              type="date"
              name="to"
              defaultValue={sp.to}
            />
          </label>
          <button className="rounded-2xl bg-emerald-600 px-5 py-2 text-sm font-black text-white hover:bg-emerald-500" type="submit">
            Apply filter
          </button>
        </form>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <Card className="flex flex-col justify-between" key={report.key}>
            <div>
              <FileText className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-4 text-lg font-black">{report.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{report.description}</p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                href={`/reports${qs({ report: report.key })}`}
              >
                Preview
              </Link>
              {canRun ? (
                <a
                  className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                  href={`/api/reports/${report.key}${qs({})}`}
                >
                  <Download className="h-4 w-4" /> CSV
                </a>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <DataTable title={`${preview.title} preview`} description="Filtered by the date range above." rows={rows} columns={columns} />
      </div>
    </AppShell>
  );
}
