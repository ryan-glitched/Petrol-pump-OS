import { AppShell } from "@/components/shell/app-shell";
import { DataEntryForm } from "@/components/forms/data-entry-form";
import { DataTable } from "@/components/ui/data-table";
import { SectionHeader } from "@/components/ui/card";
import type { ActionState } from "@/lib/actions/helpers";
import type { FieldDef, TableColumn } from "@/types";

export function ModulePage<T extends Record<string, unknown>>({
  eyebrow,
  title,
  description,
  formTitle,
  formDescription,
  fields,
  action,
  rows,
  columns,
  tableTitle,
  tableDescription,
  mode,
  submitLabel,
  canCreate = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  formTitle: string;
  formDescription: string;
  fields: FieldDef[];
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  rows: T[];
  columns: TableColumn<T>[];
  tableTitle: string;
  tableDescription?: string;
  mode?: "nozzle" | "sales" | "mobilOil" | "delivery";
  submitLabel?: string;
  canCreate?: boolean;
}) {
  return (
    <AppShell>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        {canCreate ? (
          <DataEntryForm
            title={formTitle}
            description={formDescription}
            fields={fields}
            action={action}
            mode={mode}
            submitLabel={submitLabel}
          />
        ) : null}
        <DataTable title={tableTitle} description={tableDescription} columns={columns} rows={rows} />
      </div>
    </AppShell>
  );
}
