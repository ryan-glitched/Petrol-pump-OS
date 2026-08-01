import { z } from "zod";
import {
  CREDIT_STATUSES,
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
  }, "Enter a valid calendar date");
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
  })
  .refine((v) => v.closingReading >= v.openingReading, {
    path: ["closingReading"],
    message: "Closing reading must be greater than or equal to opening reading",
  });

export const tankDipInput = z
  .object({
    date: isoDate,
    shiftId: z.string().optional(),
    tankId: id,
    openingDip: litres,
    closingDip: litres,
    notes: z.string().optional(),
  })
  .refine((v) => v.openingDip >= v.closingDip, {
    path: ["closingDip"],
    message: "Closing dip cannot exceed opening dip",
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

export const creditSaleInput = z.object({
  date: isoDate,
  customerName: z.string().min(1, "Customer name is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  productId: id,
  litres: litres.refine((v) => v > 0, "Litres must be greater than 0"),
  amount: money.refine((v) => v > 0, "Amount must be greater than 0"),
  status: z.enum(CREDIT_STATUSES),
  dueDate: isoDate,
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

export type ShiftInput = z.infer<typeof shiftInput>;
export type NozzleReadingInput = z.infer<typeof nozzleReadingInput>;
export type TankDipInput = z.infer<typeof tankDipInput>;
export type DeliveryInput = z.infer<typeof deliveryInput>;
export type SalesInput = z.infer<typeof salesInput>;
export type MobilOilInput = z.infer<typeof mobilOilInput>;
export type ExpenseInput = z.infer<typeof expenseInput>;
export type CreditSaleInput = z.infer<typeof creditSaleInput>;
export type StaffInput = z.infer<typeof staffInput>;
export type FuelPriceInput = z.infer<typeof fuelPriceInput>;
