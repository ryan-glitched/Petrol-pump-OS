import { mulPaisa, type Paisa } from "@/lib/money";

/** Litres dispensed by a nozzle over a shift = closing meter - opening meter. */
export function nozzleLitres(opening: number, closing: number): number {
  return Math.max(0, closing - opening);
}

/** Amount billed for a nozzle reading = litres * rate (paisa per litre). */
export function nozzleAmountPaisa(litres: number, ratePaisa: Paisa): Paisa {
  return mulPaisa(ratePaisa, litres);
}

/** Litres consumed per the dip stick = opening dip - closing dip (level drop). */
export function dipLitres(openingDip: number, closingDip: number): number {
  return Math.max(0, openingDip - closingDip);
}
