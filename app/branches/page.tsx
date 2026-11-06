import { Building2 } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge, Card, SectionHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { prisma } from "@/lib/db";
import { requireViewContext } from "@/lib/queries/context";

export default async function BranchesPage() {
  const ctx = await requireViewContext();
  const branches = await prisma.branch.findMany({
    where: { id: { in: ctx.session.branchIds } },
    orderBy: { name: "asc" },
  });

  const rows = branches.map((b) => ({
    name: b.name,
    company: b.company,
    city: b.city,
    manager: b.managerName,
    tolerance: `${b.varianceTolerancePct}%`,
    status: b.status,
  }));

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Multi-branch platform"
        title="Branches / stations"
        description="Every operational record is scoped to a branch. You see only the stations your account is assigned to."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <div className="flex items-start justify-between gap-4">
              <Building2 className="h-7 w-7 text-emerald-600" />
              <Badge tone={branch.status === "Live" ? "green" : "slate"}>{branch.status}</Badge>
            </div>
            <h2 className="mt-5 text-2xl font-black">{branch.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{branch.company}</p>
            <p className="mt-4 text-sm font-bold text-slate-700">Manager: {branch.managerName}</p>
            <p className="text-sm text-slate-500">Variance tolerance: {branch.varianceTolerancePct}%</p>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <DataTable
          title="Company and branch registry"
          rows={rows}
          columns={[
            { key: "name", label: "Branch" },
            { key: "company", label: "Company" },
            { key: "city", label: "City" },
            { key: "manager", label: "Manager" },
            { key: "tolerance", label: "Variance tol." },
            { key: "status", label: "Status" },
          ]}
        />
      </div>
    </AppShell>
  );
}
