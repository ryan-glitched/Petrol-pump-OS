/**
 * Format a rupee amount as "PKR 95,550" (same style as formatPKR, without a
 * paisa round-trip). For DB values in paisa, prefer formatPKR from lib/money.
 */
export function formatCurrency(rupees: number) {
  const sign = rupees < 0 ? "-" : "";
  const grouped = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Math.abs(Math.round(rupees)));
  return `${sign}PKR ${grouped}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PK").format(value);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
