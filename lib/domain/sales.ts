import { addPaisa, asPaisa, subPaisa, type Paisa } from "@/lib/money";

export type SalesBreakdown = {
  cashPaisa: Paisa;
  cardPaisa: Paisa;
  creditPaisa: Paisa;
  cashInHandPaisa: Paisa;
};

export type SalesReconciliation = {
  totalPaisa: Paisa;
  /** cashInHand - cash. Positive = excess in drawer, negative = short. */
  diffPaisa: Paisa;
};

export function reconcileSales(b: SalesBreakdown): SalesReconciliation {
  const totalPaisa = addPaisa(b.cashPaisa, b.cardPaisa, b.creditPaisa);
  const diffPaisa = subPaisa(b.cashInHandPaisa, b.cashPaisa);
  return { totalPaisa, diffPaisa };
}

/** Profit on a lubricant sale = (selling - purchase) * qty. */
export function mobilProfitPaisa(purchasePaisa: Paisa, sellingPaisa: Paisa, qty: number): Paisa {
  const unit = subPaisa(sellingPaisa, purchasePaisa);
  return asPaisa(unit * qty);
}
