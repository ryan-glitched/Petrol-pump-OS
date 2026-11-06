import {
  EXPENSE_CATEGORIES,
  SHIFT_SLOTS,
  STAFF_ROLES,
  STAFF_STATUSES,
} from "@/lib/constants";
import type { FieldDef } from "@/types";
import {
  nozzleOptions,
  productOptions,
  shiftOptions,
  staffOptions,
  tankOptions,
} from "@/lib/queries/options";

/** Today's date in Asia/Karachi as an ISO yyyy-mm-dd string, for form defaults. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
}

const enumOpts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

export async function shiftFields(branchId: string): Promise<FieldDef[]> {
  const [staff] = await Promise.all([staffOptions(branchId)]);
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "shiftSlot", label: "Shift", type: "select", required: true, options: enumOpts(SHIFT_SLOTS) },
    { name: "managerId", label: "Manager", type: "select", options: staff },
    { name: "cashierId", label: "Cashier", type: "select", options: staff },
    { name: "fillers", label: "Fillers (names)", type: "text", placeholder: "Comma separated" },
    { name: "guards", label: "Guards (names)", type: "text", placeholder: "Comma separated" },
    { name: "openingCash", label: "Opening cash (PKR)", type: "number", required: true, step: "1" },
    { name: "closingCash", label: "Closing cash (PKR)", type: "number", required: true, step: "1" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export async function nozzleFields(branchId: string): Promise<FieldDef[]> {
  const [nozzles, shifts, staff] = await Promise.all([
    nozzleOptions(branchId),
    shiftOptions(branchId),
    staffOptions(branchId),
  ]);
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "shiftId", label: "Shift", type: "select", options: shifts },
    { name: "nozzleId", label: "Nozzle", type: "select", required: true, options: nozzles },
    { name: "openingReading", label: "Opening reading", type: "number", required: true, step: "0.01" },
    { name: "closingReading", label: "Closing reading", type: "number", required: true, step: "0.01" },
    { name: "staffId", label: "Filler", type: "select", options: staff },
  ];
}

export async function tankDipFields(branchId: string): Promise<FieldDef[]> {
  const [tanks, shifts] = await Promise.all([tankOptions(branchId), shiftOptions(branchId)]);
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "shiftId", label: "Shift", type: "select", options: shifts },
    { name: "tankId", label: "Tank", type: "select", required: true, options: tanks },
    { name: "openingDip", label: "Opening dip (L)", type: "number", required: true, step: "1" },
    { name: "closingDip", label: "Closing dip (L)", type: "number", required: true, step: "1" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export async function deliveryFields(branchId: string): Promise<FieldDef[]> {
  const [products, tanks] = await Promise.all([productOptions(branchId, "FUEL"), tankOptions(branchId)]);
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "supplier", label: "Supplier", type: "text", required: true, placeholder: "PARCO / Gunvor depot" },
    { name: "productId", label: "Fuel", type: "select", required: true, options: products },
    { name: "tankId", label: "Tank", type: "select", required: true, options: tanks },
    { name: "quantity", label: "Quantity (L)", type: "number", required: true, step: "1" },
    { name: "purchaseRate", label: "Purchase rate (PKR/L)", type: "number", required: true, step: "0.01" },
    { name: "invoice", label: "Invoice #", type: "text", required: true },
    { name: "vehicle", label: "Tanker / vehicle", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export async function salesFields(branchId: string): Promise<FieldDef[]> {
  const shifts = await shiftOptions(branchId);
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "shiftId", label: "Shift", type: "select", options: shifts },
    { name: "cashSales", label: "Cash sales (PKR)", type: "number", required: true, step: "1" },
    { name: "cardSales", label: "Card sales (PKR)", type: "number", required: true, step: "1" },
    { name: "creditSales", label: "Credit sales (PKR)", type: "number", required: true, step: "1" },
    { name: "cashInHand", label: "Cash in drawer (PKR)", type: "number", required: true, step: "1" },
  ];
}

export async function mobilOilFields(branchId: string): Promise<FieldDef[]> {
  const [products, staff] = await Promise.all([productOptions(branchId, "LUBE"), staffOptions(branchId)]);
  const productNames = products.map((p) => ({ value: p.label, label: p.label }));
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "productName", label: "Product", type: productNames.length ? "select" : "text", required: true, options: productNames.length ? productNames : undefined },
    { name: "quantity", label: "Quantity (units)", type: "number", required: true, step: "1" },
    { name: "purchasePrice", label: "Purchase price (PKR/unit)", type: "number", required: true, step: "0.01" },
    { name: "sellingPrice", label: "Selling price (PKR/unit)", type: "number", required: true, step: "0.01" },
    { name: "staffId", label: "Sold by", type: "select", options: staff },
  ];
}

export function expenseFields(): FieldDef[] {
  return [
    { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
    { name: "category", label: "Category", type: "select", required: true, options: enumOpts(EXPENSE_CATEGORIES) },
    { name: "amount", label: "Amount (PKR)", type: "number", required: true, step: "1" },
    { name: "paidBy", label: "Paid by", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea", required: true },
  ];
}

export function staffFields(): FieldDef[] {
  return [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "role", label: "Role", type: "select", required: true, options: enumOpts(STAFF_ROLES) },
    { name: "shiftSlot", label: "Shift", type: "select", required: true, options: enumOpts(SHIFT_SLOTS) },
    { name: "phone", label: "Phone", type: "text", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: enumOpts(STAFF_STATUSES) },
  ];
}

export async function fuelPriceFields(branchId: string): Promise<FieldDef[]> {
  const products = await productOptions(branchId, "FUEL");
  return [
    { name: "productId", label: "Fuel", type: "select", required: true, options: products },
    { name: "rate", label: "Rate (PKR/L)", type: "number", required: true, step: "0.01" },
    { name: "dealerMargin", label: "Dealer margin (PKR/L)", type: "number", required: true, step: "0.01", defaultValue: "7" },
    { name: "effectiveFrom", label: "Effective from", type: "date", required: true, defaultValue: todayISO() },
  ];
}
