// Allowed enum-like values shared across validation, seed, and UI.

export const ROLES = ["SuperAdmin", "Owner", "Manager", "Cashier", "Filler"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SuperAdmin: "Super Admin",
  Owner: "Owner",
  Manager: "Manager",
  Cashier: "Cashier",
  Filler: "Staff/Filler",
};

export const SHIFT_SLOTS = ["Shift 1 (6:00 AM - 6:00 PM)", "Shift 2 (6:00 PM - 6:00 AM)"] as const;

export const PRODUCT_KINDS = ["FUEL", "LUBE"] as const;

export const EXPENSE_CATEGORIES = ["Utilities", "Maintenance", "Staff", "Office", "Other"] as const;

export const CREDIT_STATUSES = ["Due", "Partial", "Paid"] as const;

export const STAFF_STATUSES = ["Present", "Off Duty", "Leave"] as const;

export const STAFF_ROLES = ["Manager", "Cashier", "Filler", "Guard"] as const;

export const STOCK_MOVE_TYPES = ["DELIVERY", "SALE", "ADJUST"] as const;

// Which roles may perform which capability. Enforced server-side in lib/auth/guard.ts.
export const CAPABILITIES = {
  manageBranches: ["SuperAdmin", "Owner"],
  manageStaff: ["SuperAdmin", "Owner"],
  settings: ["SuperAdmin", "Owner"],
  managePrices: ["SuperAdmin", "Owner", "Manager"],
  viewReports: ["SuperAdmin", "Owner", "Manager", "Cashier"],
  runReports: ["SuperAdmin", "Owner", "Manager"],
  salesEntry: ["SuperAdmin", "Owner", "Manager", "Cashier"],
  readings: ["SuperAdmin", "Owner", "Manager", "Cashier", "Filler"],
  shifts: ["SuperAdmin", "Owner", "Manager"],
  deliveries: ["SuperAdmin", "Owner", "Manager"],
  expenses: ["SuperAdmin", "Owner", "Manager", "Cashier"],
  mobilOil: ["SuperAdmin", "Owner", "Manager", "Cashier"],
  credit: ["SuperAdmin", "Owner", "Manager", "Cashier"],
  allBranches: ["SuperAdmin", "Owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;
