// Money is stored and computed as integer paisa everywhere internally.
// 1 rupee (PKR) = 100 paisa. Formatting to a human string only happens at the edge.

export type Paisa = number & { readonly __brand: "Paisa" };

function assertSafeInt(value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Money value must be finite, received ${value}`);
  }
}

/** Convert a rupee amount (possibly fractional) to integer paisa. 95550 -> 9555000. */
export function toPaisa(rupees: number): Paisa {
  assertSafeInt(rupees);
  return Math.round(rupees * 100) as Paisa;
}

/** Treat an already-integer paisa value as Paisa (e.g. from the DB). */
export function asPaisa(paisa: number): Paisa {
  assertSafeInt(paisa);
  return Math.round(paisa) as Paisa;
}

/** Convert paisa back to a rupee number (for charts/aggregates that expect rupees). */
export function toRupees(paisa: Paisa): number {
  return paisa / 100;
}

export function addPaisa(...vals: Paisa[]): Paisa {
  return vals.reduce((sum, v) => sum + v, 0) as Paisa;
}

export function subPaisa(a: Paisa, b: Paisa): Paisa {
  return (a - b) as Paisa;
}

/** Multiply a paisa amount by a unitless quantity, rounding to the nearest paisa. */
export function mulPaisa(p: Paisa, qty: number): Paisa {
  assertSafeInt(qty);
  return Math.round(p * qty) as Paisa;
}

/** Format paisa as a PKR string. 9555000 -> "PKR 95,550". */
export function formatPKR(p: Paisa): string {
  const rupees = toRupees(p);
  const sign = rupees < 0 ? "-" : "";
  const grouped = new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(rupees)));
  return `${sign}PKR ${grouped}`;
}

/** Format paisa with an explicit leading +/- sign (used for cash differences). */
export function formatSignedPKR(p: Paisa): string {
  if (p > 0) return `+${formatPKR(p)}`;
  return formatPKR(p);
}
