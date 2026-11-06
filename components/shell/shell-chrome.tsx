"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  Droplets,
  FileBarChart,
  Fuel,
  Gauge,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { cn } from "@/lib/format";
import { logout, switchBranch } from "@/app/actions/auth";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShieldCheck,
  Droplets,
  Gauge,
  PackagePlus,
  WalletCards,
  Wrench,
  Fuel,
  ReceiptText,
  CreditCard,
  BarChart3,
  FileBarChart,
  TrendingUp,
  Users,
  Building2,
  Settings,
};

type Props = {
  navItems: NavItem[];
  branches: { id: string; name: string; status: string }[];
  activeBranchId: string;
  user: { name: string; role: Role };
  children: React.ReactNode;
};

export function ShellChrome({ navItems, branches, activeBranchId, user, children }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#eef3f1] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-[#071827] text-white xl:flex xl:flex-col">
        <div className="border-b border-white/10 p-6">
          <Link href="/" className="block">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">PGL / PARCO Gunvor</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">PetrolPumpOS</h2>
          </Link>
          <p className="mt-3 rounded-2xl bg-white/8 px-3 py-2 text-xs text-slate-300">
            Signed in as <span className="font-bold text-white">{user.name}</span>
            <br />
            {ROLE_LABELS[user.role]}
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active = pathname === item.href;
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white",
                  active && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/80 bg-white/80 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">{ROLE_LABELS[user.role]} control room</p>
              <h1 className="text-lg font-black text-slate-950 md:text-2xl">{user.name} · PetrolPumpOS</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <form action={switchBranch}>
                <select
                  name="branchId"
                  defaultValue={activeBranchId}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.status !== "Live" ? ` (${branch.status})` : ""}
                    </option>
                  ))}
                </select>
              </form>
              <form action={logout} className="xl:hidden">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {navItems.map((item) => (
              <Link
                className={cn(
                  "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600",
                  pathname === item.href && "border-emerald-500 bg-emerald-50 text-emerald-700",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
