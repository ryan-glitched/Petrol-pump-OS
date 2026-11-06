import { redirect } from "next/navigation";
import { ShellChrome } from "@/components/shell/shell-chrome";
import { NAV_ITEMS } from "@/lib/nav";
import { can } from "@/lib/auth/guard";
import { getViewContext } from "@/lib/queries/context";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");

  const navItems = NAV_ITEMS.filter((item) => !item.capability || can(ctx.session.role, item.capability));

  return (
    <ShellChrome
      navItems={navItems}
      branches={ctx.branches}
      activeBranchId={ctx.branchId}
      user={{ name: ctx.session.name, role: ctx.session.role }}
    >
      {children}
    </ShellChrome>
  );
}
