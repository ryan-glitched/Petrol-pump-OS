import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TableColumn } from "@/types";

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description?: string;
  columns: TableColumn<T>[];
  rows: T[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Search className="h-4 w-4" />
            <input className="w-full bg-transparent outline-none" placeholder="Search or filter" />
          </label>
          <button className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">
            Export
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {columns.map((column) => (
                <th className="whitespace-nowrap px-5 py-3 font-bold" key={String(column.key)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-5 py-10 text-center text-sm font-semibold text-slate-400" colSpan={columns.length}>
                  No records yet. Saved entries will appear here.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr className="transition hover:bg-emerald-50/40" key={index}>
                  {columns.map((column) => (
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700" key={String(column.key)}>
                      {String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
