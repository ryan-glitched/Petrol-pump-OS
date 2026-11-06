import { z } from "zod";
import { BILLING_CYCLES } from "@/lib/domain/credit";
import {
  EXPENSE_CATEGORIES,
  SHIFT_SLOTS,
  STAFF_ROLES,
  STAFF_STATUSES,
} from "@/lib/constants";

// One Zod schema per entity, reused by the client form and the server action.
// Inputs come from FormData, so numeric fields are coerced from strings.

const id = z.string().min(1, "required");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use date format YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date")
  .refine((value) => value >= "2000-01-01" && value <= "2099-12-31", "Check the year");
const money = z.coerce.number().min(0, "Must be 0 or more"); // rupees at the edge -> paisa server-side
const litres = z.coerce.number().min(0, "Must be 0 or more");

export const shiftInput = z.object({
  date: isoDate,
  shiftSlot: z.enum(SHIFT_SLOTS),
  managerId: z.string().optional(),
  cashierId: z.string().optional(),
  fillers: z.string().optional(),
  guards: z.string().optional(),
  openingCash: money,
  closingCash: money,
  notes: z.string().optional(),
});

export const nozzleReadingInput = z
  .object({
    date: isoDate,
    shiftId: z.string().optional(),
    nozzleId: id,
    openingReading: z.coerce.number().min(0),
    closingReading: z.coerce.number().min(0),
    staffId: z.string().optional(),
    meterChangeReason: z.string().trim().optional(),
  })
  .refine((v) => v.closingReading >= v.openingReading, {
    path: ["closingReading"],
    message: "Closing reading must be greater than or equal to opening reading",
  });

// Closing dip may be higher than opening on delivery days; the variance engine
// accounts for deliveries, so no ordering rule is enforced here.
export const tankDipInput = z.object({
  date: isoDate,
  shiftId: z.string().optional(),
  tankId: id,
  openingDip: litres,
  closingDip: litres,
  notes: z.string().optional(),
});

export const deliveryInput = z.object({
  date: isoDate,
  supplier: z.string().min(1, "Supplier is required"),
  productId: id,
  tankId: id,
  quantity: litres.refine((v) => v > 0, "Quantity must be greater than 0"),
  purchaseRate: money,
  invoice: z.string().min(1, "Invoice is required"),
  vehicle: z.string().optional(),
  notes: z.string().optional(),
});

export const salesInput = z.object({
  date: isoDate,
  shiftId: z.string().optional(),
  cashSales: money,
  cardSales: money,
  creditSales: money,
  cashInHand: money,
});

export const mobilOilInput = z.object({
  date: isoDate,
  productName: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  purchasePrice: money,
  sellingPrice: money,
  staffId: z.string().optional(),
});

export const expenseInput = z.object({
  date: isoDate,
  category: z.enum(EXPENSE_CATEGORIES),
  amount: money.refine((v) => v > 0, "Amount must be greater than 0"),
  paidBy: z.string().min(1, "Paid by is required"),
  description: z.string().min(1, "Description is required"),
  receiptUrl: z.string().optional(),
});

export const staffInput = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(STAFF_ROLES),
  shiftSlot: z.string().min(1, "Shift is required"),
  phone: z.string().min(1, "Phone is required"),
  status: z.enum(STAFF_STATUSES),
});

export const fuelPriceInput = z
  .object({
    productId: id,
    rate: money.refine((v) => v > 0, "Rate must be greater than 0"),
    dealerMargin: money.refine((v) => v > 0, "Margin must be greater than 0"),
    effectiveFrom: isoDate,
  })
  .refine((v) => v.dealerMargin < v.rate, {
    path: ["dealerMargin"],
    message: "Margin must be lower than the selling rate",
  });

export const loginInput = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(10, "Use at least 10 characters"),
    confirmPassword: z.string().min(1, "Repeat the new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ShiftInput = z.infer<typeof shiftInput>;
export type NozzleReadingInput = z.infer<typeof nozzleReadingInput>;
export type TankDipInput = z.infer<typeof tankDipInput>;
export type DeliveryInput = z.infer<typeof deliveryInput>;
export type SalesInput = z.infer<typeof salesInput>;
export type MobilOilInput = z.infer<typeof mobilOilInput>;
export type ExpenseInput = z.infer<typeof expenseInput>;
export type StaffInput = z.infer<typeof staffInput>;
export type FuelPriceInput = z.infer<typeof fuelPriceInput>;

// ---- Station configuration (tanks, dispensers, nozzles, logins) -----------

const optionalText = z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().min(1).optional());
const optionalNumber = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0, "Must be 0 or more").optional());
const optionalActive = z.preprocess((v) => (v === "" ? undefined : v), z.enum(["true", "false"]).optional());

export const tankInput = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    productId: id,
    capacityL: z.coerce.number().positive("Capacity must be greater than 0"),
    safeLevelL: litres,
  })
  .refine((d) => d.safeLevelL <= d.capacityL, { path: ["safeLevelL"], message: "Low-stock level can't exceed capacity" });

export const tankUpdateInput = z.object({
  tankId: id,
  name: optionalText,
  capacityL: optionalNumber,
  safeLevelL: optionalNumber,
  active: optionalActive,
});

export const dispenserInput = z.object({ label: z.string().trim().min(1, "Name is required") });

export const nozzleInput = z.object({
  dispenserId: id,
  label: z.string().trim().min(1, "Name is required"),
  tankId: id,
});

export const nozzleUpdateInput = z.object({
  nozzleId: id,
  label: optionalText,
  tankId: optionalText,
  active: optionalActive,
});

export const LOGIN_ROLES = ["Owner", "Manager", "Cashier", "Filler"] as const;

export const userInput = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(LOGIN_ROLES),
});

export const userUpdateInput = z.object({
  userId: id,
  role: z.preprocess((v) => (v === "" ? undefined : v), z.enum(LOGIN_ROLES).optional()),
  active: optionalActive,
});

// ---- Credit customers, vehicles, credit sales and payments ----------------

export const PAYMENT_METHODS = ["Cash", "Bank transfer", "Cheque", "Card", "Other"] as const;

const optionalMoney = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0, "Must be 0 or more").optional());
const optionalDate = z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional());
const optionalCycle = z.preprocess((v) => (v === "" ? undefined : v), z.enum(BILLING_CYCLES).optional());
const optionalDays = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().int("Whole days only").min(1, "At least 1 day").max(365, "At most 365 days").optional()
);

const customDaysRule = (d: { billingCycle?: string; billingDays?: number }) => d.billingCycle !== "CUSTOM" || d.billingDays !== undefined;
const customDaysError = { path: ["billingDays"], message: "Enter how many days the customer gets to pay" };

export const creditCustomerInput = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    company: optionalText,
    phone: optionalText,
    cnic: optionalText,
    ntn: optionalText,
    address: optionalText,
    vehicles: optionalText,
    creditLimit: optionalMoney,
    openingBalance: optionalMoney,
    openingDate: optionalDate,
    billingCycle: z.enum(BILLING_CYCLES),
    billingDays: optionalDays,
    notes: optionalText,
  })
  .refine(customDaysRule, customDaysError)
  .refine((d) => !d.openingBalance || d.openingDate !== undefined, {
    path: ["openingDate"],
    message: "Enter the date the opening balance was owed from",
  });

export const creditCustomerUpdateInput = z
  .object({
    customerId: id,
    name: optionalText,
    company: optionalText,
    phone: optionalText,
    cnic: optionalText,
    ntn: optionalText,
    address: optionalText,
    creditLimit: optionalMoney,
    removeLimit: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["true"]).optional()),
    billingCycle: optionalCycle,
    billingDays: optionalDays,
    active: optionalActive,
  })
  .refine(customDaysRule, customDaysError);

export const creditVehicleInput = z.object({
  customerId: id,
  plate: z.string().trim().min(1, "Vehicle number is required"),
});

export const creditSaleInput = z.object({
  date: isoDate,
  customerId: id,
  vehicleId: z.string().optional(),
  productId: id,
  litres: litres.refine((v) => v > 0, "Litres must be greater than 0"),
  amount: money.refine((v) => v > 0, "Amount must be greater than 0"),
});

export const creditPaymentInput = z.object({
  date: isoDate,
  customerId: id,
  amount: money.refine((v) => v > 0, "Amount must be greater than 0"),
  method: z.enum(PAYMENT_METHODS),
  reference: optionalText,
  notes: optionalText,
});

// ---- Corrections (void and re-enter) ---------------------------------------

export const VOIDABLE_KINDS = ["reading", "dip", "delivery", "sales", "expense"] as const;
export type VoidableKind = (typeof VOIDABLE_KINDS)[number];

export const voidEntryInput = z.object({
  entry: z
    .string()
    .regex(/^(reading|dip|delivery|sales|expense):[^:\s]+$/, "Choose the entry to void")
    .transform((v) => {
      const [kind, id] = v.split(":");
      return { kind: kind as VoidableKind, id };
    }),
  reason: z.string().trim().min(5, "Write why this entry is wrong (at least 5 letters)"),
});

// ---- Shift close / approve -------------------------------------------------

export const shiftStatusInput = z.object({
  shiftId: id,
  change: z.enum(["close", "approve", "reopen"], { message: "Choose what to do with the shift" }),
});
