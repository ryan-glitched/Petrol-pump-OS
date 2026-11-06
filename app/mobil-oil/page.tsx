import { ModulePage } from "@/components/forms/module-page";
import { createMobilOilSale } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { mobilOilFields } from "@/lib/queries/forms";
import { listMobilOil } from "@/lib/queries/lists";

export default async function MobilOilPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([mobilOilFields(ctx.branchId), listMobilOil(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Lubricants"
      title="Mobil oil sales"
      description="Track lubricant quantity, buying price, selling price, staff member, and profit."
      formTitle="Mobil oil sale"
      formDescription="Profit is computed from selling minus purchase price times quantity."
      fields={fields}
      action={createMobilOilSale}
      mode="mobilOil"
      canCreate={can(ctx.session.role, "mobilOil")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "product", label: "Product" },
        { key: "quantity", label: "Quantity" },
        { key: "purchase", label: "Purchase" },
        { key: "selling", label: "Selling" },
        { key: "profit", label: "Profit" },
        { key: "staff", label: "Staff" },
      ]}
      tableTitle="Recent mobil oil sales"
    />
  );
}
