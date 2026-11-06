import { ModulePage } from "@/components/forms/module-page";
import { createDelivery } from "@/app/actions/entries";
import { can } from "@/lib/auth/guard";
import { requireViewContext } from "@/lib/queries/context";
import { deliveryFields } from "@/lib/queries/forms";
import { listDeliveries } from "@/lib/queries/lists";

export default async function FuelDeliveriesPage() {
  const ctx = await requireViewContext();
  const [fields, rows] = await Promise.all([deliveryFields(ctx.branchId), listDeliveries(ctx.branchId)]);

  return (
    <ModulePage
      eyebrow="Stock in"
      title="Fuel deliveries"
      description="Record supplier invoices, product, tank destination, quantity received, purchase rate, and vehicle details."
      formTitle="Fuel delivery / stock in"
      formDescription="Saving a delivery adds the quantity to tank stock automatically."
      fields={fields}
      action={createDelivery}
      mode="delivery"
      canCreate={can(ctx.session.role, "deliveries")}
      rows={rows}
      columns={[
        { key: "date", label: "Date" },
        { key: "supplier", label: "Supplier" },
        { key: "fuel", label: "Product" },
        { key: "tank", label: "Tank" },
        { key: "quantity", label: "Quantity" },
        { key: "rate", label: "Rate" },
        { key: "cost", label: "Total cost" },
        { key: "invoice", label: "Invoice" },
      ]}
      tableTitle="Recent fuel deliveries"
    />
  );
}
