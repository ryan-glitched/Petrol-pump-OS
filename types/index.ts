import type { LucideIcon } from "lucide-react";

export type Role = "Super Admin" | "Owner" | "Manager" | "Cashier" | "Staff/Filler";

export type Product = "Hi Super" | "HOBC" | "Diesel" | "Mobil Oil";

export type Branch = {
  id: string;
  name: string;
  company: string;
  city: string;
  manager: string;
  status: "Live" | "Setup";
};

export type Tank = {
  id: string;
  name: string;
  product: Exclude<Product, "Mobil Oil">;
  capacity: number;
  current: number;
  safeLevel: number;
};

export type StaffMember = {
  id: string;
  name: string;
  role: Role;
  shift: "Shift 1" | "Shift 2";
  phone: string;
  status: "Present" | "Off Duty" | "Leave";
};

export type Metric = {
  label: string;
  value: string;
  change: string;
  tone: "green" | "blue" | "orange" | "red";
  icon: LucideIcon;
};

export type TableColumn<T> = {
  key: keyof T | string;
  label: string;
};

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "file";
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

// Form field bound to a server action / DB-derived options.
export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "password";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
  defaultValue?: string;
  readOnly?: boolean;
};

export type SalesPoint = {
  date: string;
  revenue: number;
  litres: number;
  hiSuper: number;
  hobc: number;
  diesel: number;
};

export type ForecastPoint = {
  day: string;
  hiSuper: number;
  hobc: number;
  diesel: number;
};
