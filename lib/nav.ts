import type { Capability } from "@/lib/constants";

export type NavItem = {
  label: string;
  href: string;
  icon: string; // key resolved to a lucide icon in the client
  capability?: Capability; // when set, only roles with the capability see the item
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Shift Management", href: "/shifts", icon: "ShieldCheck", capability: "shifts" },
  { label: "Nozzle Readings", href: "/nozzle-readings", icon: "Droplets", capability: "readings" },
  { label: "Tank Dip Readings", href: "/tank-dips", icon: "Gauge", capability: "readings" },
  { label: "Fuel Deliveries", href: "/fuel-deliveries", icon: "PackagePlus", capability: "deliveries" },
  { label: "Sales", href: "/sales", icon: "WalletCards", capability: "salesEntry" },
  { label: "Mobil Oil Sales", href: "/mobil-oil", icon: "Fuel", capability: "mobilOil" },
  { label: "Expenses", href: "/expenses", icon: "ReceiptText", capability: "expenses" },
  { label: "Credit Customers", href: "/credit-customers", icon: "CreditCard", capability: "credit" },
  { label: "Inventory", href: "/inventory", icon: "BarChart3" },
  { label: "Reports", href: "/reports", icon: "FileBarChart", capability: "viewReports" },
  { label: "Forecasting", href: "/forecasting", icon: "TrendingUp", capability: "viewReports" },
  { label: "Staff Management", href: "/staff", icon: "Users", capability: "manageStaff" },
  { label: "Branches / Stations", href: "/branches", icon: "Building2", capability: "manageBranches" },
  { label: "Settings", href: "/settings", icon: "Settings" },
];
