import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader } from "@/components/ui/card";
import { DataEntryForm } from "@/components/forms/data-entry-form";
import { DataTable } from "@/components/ui/data-table";
import {
  createDispenser,
  createNozzle,
  createTank,
  createUser,
  updateNozzle,
  updateTank,
  updateUser,
} from "@/app/actions/station";
import { can } from "@/lib/auth/guard";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { requireViewContext } from "@/lib/queries/context";
import { productOptions } from "@/lib/queries/options";
import { LOGIN_ROLES } from "@/lib/validation/schemas";

const STATUS_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Switched off" },
];
const KEEP = "Leave blank to keep as is";
const status = (active: boolean) => (active ? "Active" : "Switched off");
const litres = (n: number) => `${n.toLocaleString("en-PK")} L`;

export default async function StationSetupPage() {
  const ctx = await requireViewContext();
  if (!can(ctx.session.role, "settings")) redirect("/");
  const branchId = ctx.branchId;

  const [tanks, dispensers, nozzles, users, fuels] = await Promise.all([
    prisma.tank.findMany({ where: { branchId }, include: { product: true }, orderBy: { name: "asc" } }),
    prisma.dispenser.findMany({ where: { branchId }, orderBy: { label: "asc" } }),
    prisma.nozzle.findMany({
      where: { branchId },
      include: { dispenser: true, tank: true, product: true },
      orderBy: [{ dispenser: { label: "asc" } }, { label: "asc" }],
    }),
    prisma.user.findMany({ where: { branches: { some: { branchId } } }, orderBy: { name: "asc" } }),
    productOptions(branchId, "FUEL"),
  ]);

  const activeTankOptions = tanks.filter((t) => t.active).map((t) => ({ value: t.id, label: `${t.name} (${t.product.name})` }));
  const allTankOptions = tanks.map((t) => ({ value: t.id, label: `${t.name} (${t.product.name})${t.active ? "" : " – off"}` }));
  const dispenserOptions = dispensers.filter((d) => d.active).map((d) => ({ value: d.id, label: d.label }));
  const nozzleOptions = nozzles.map((n) => ({
    value: n.id,
    label: `${n.dispenser.label} · ${n.label} → ${n.tank.name}${n.active ? "" : " – off"}`,
  }));
  const otherUsers = users
    .filter((u) => u.id !== ctx.session.userId)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));
  const roleOptions = LOGIN_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r as Role] }));

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Configuration"
        title="Tanks, nozzles & logins"
        description="Set up the station's tanks, the nozzles on each dispenser and which tank each nozzle pumps from, and the logins for your staff."
      />

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <DataTable
          title="Tanks"
          rows={tanks.map((t) => ({
            name: t.name,
            fuel: t.product.name,
            capacity: litres(t.capacityL),
            low: litres(t.safeLevelL),
            status: status(t.active),
          }))}
          columns={[
            { key: "name", label: "Tank" },
            { key: "fuel", label: "Fuel" },
            { key: "capacity", label: "Capacity" },
            { key: "low", label: "Low-stock warning" },
            { key: "status", label: "Status" },
          ]}
        />
        <DataTable
          title="Nozzles"
          description="Each nozzle's sales are taken out of the tank shown here when the loss check runs."
          rows={nozzles.map((n) => ({
            dispenser: n.dispenser.label,
            nozzle: n.label,
            tank: n.tank.name,
            fuel: n.product.name,
            status: status(n.active && n.dispenser.active),
          }))}
          columns={[
            { key: "dispenser", label: "Dispenser" },
            { key: "nozzle", label: "Nozzle" },
            { key: "tank", label: "Pumps from" },
            { key: "fuel", label: "Fuel" },
            { key: "status", label: "Status" },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <DataEntryForm
          title="Add a tank"
          description="One row per separately dipped tank or tank section."
          action={createTank}
          submitLabel="Add tank"
          fields={[
            { name: "name", label: "Tank name", type: "text", required: true, placeholder: "e.g. Tank 3-A (Hi Super)" },
            { name: "productId", label: "Fuel", type: "select", required: true, options: fuels },
            { name: "capacityL", label: "Capacity (litres)", type: "number", required: true, step: "1" },
            { name: "safeLevelL", label: "Warn when stock falls below (litres)", type: "number", required: true, step: "1" },
          ]}
        />
        <DataEntryForm
          title="Change a tank"
          description={`Pick the tank, then fill only what you want to change. ${KEEP}.`}
          action={updateTank}
          submitLabel="Save tank"
          fields={[
            { name: "tankId", label: "Tank", type: "select", required: true, options: allTankOptions },
            { name: "name", label: "New name", type: "text", placeholder: KEEP },
            { name: "capacityL", label: "Capacity (litres)", type: "number", step: "1", placeholder: KEEP },
            { name: "safeLevelL", label: "Low-stock warning (litres)", type: "number", step: "1", placeholder: KEEP },
            { name: "active", label: "Status", type: "select", options: STATUS_OPTIONS },
          ]}
        />
        <DataEntryForm
          title="Add a dispenser"
          description="A dispenser is one pump machine. Add its nozzles below after saving."
          action={createDispenser}
          submitLabel="Add dispenser"
          fields={[{ name: "label", label: "Dispenser name", type: "text", required: true, placeholder: "e.g. Dispenser 5" }]}
        />
        <DataEntryForm
          title="Add a nozzle"
          description="Choose the dispenser it's on and the tank it pumps from. The fuel comes from the tank."
          action={createNozzle}
          submitLabel="Add nozzle"
          fields={[
            { name: "dispenserId", label: "Dispenser", type: "select", required: true, options: dispenserOptions },
            { name: "label", label: "Nozzle name", type: "text", required: true, placeholder: "e.g. Nozzle 1" },
            { name: "tankId", label: "Pumps from tank", type: "select", required: true, options: activeTankOptions },
          ]}
        />
        <DataEntryForm
          title="Change a nozzle"
          description={`Move a nozzle to another tank, rename it, or switch it off. ${KEEP}. Once a nozzle has readings it can't be moved; switch it off and add a new one instead.`}
          action={updateNozzle}
          submitLabel="Save nozzle"
          fields={[
            { name: "nozzleId", label: "Nozzle", type: "select", required: true, options: nozzleOptions },
            { name: "label", label: "New name", type: "text", placeholder: KEEP },
            { name: "tankId", label: "Pumps from tank", type: "select", options: activeTankOptions },
            { name: "active", label: "Status", type: "select", options: STATUS_OPTIONS },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <DataTable
          title="Logins"
          rows={users.map((u) => ({
            name: u.name,
            email: u.email,
            role: ROLE_LABELS[u.role as Role] ?? u.role,
            status: u.active ? "Active" : "Blocked",
          }))}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
          ]}
        />
        <div className="grid gap-6">
          <DataEntryForm
            title="Add a login"
            description="Creates a sign-in for a staff member. A temporary password is shown once; give it to them and they change it in Settings."
            action={createUser}
            submitLabel="Create login"
            fields={[
              { name: "name", label: "Name", type: "text", required: true },
              { name: "email", label: "Email", type: "text", required: true },
              { name: "role", label: "Role", type: "select", required: true, options: roleOptions },
            ]}
          />
          <DataEntryForm
            title="Change or block a login"
            description={`Changes apply immediately and sign the person out of every device. ${KEEP}.`}
            action={updateUser}
            submitLabel="Save login"
            fields={[
              { name: "userId", label: "Login", type: "select", required: true, options: otherUsers },
              { name: "role", label: "Role", type: "select", options: roleOptions },
              {
                name: "active",
                label: "Status",
                type: "select",
                options: [
                  { value: "true", label: "Active" },
                  { value: "false", label: "Blocked" },
                ],
              },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}
