/**
 * Transaction-time currency conversions.
 * FX rates use the app convention: units of currency per 1 USD.
 */
export function convertAtRates(
  amount: number,
  sourceRate: number,
  destinationRate: number,
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(sourceRate) || !Number.isFinite(destinationRate)) {
    throw new Error("환율 또는 금액이 올바르지 않습니다.");
  }
  if (sourceRate <= 0 || destinationRate <= 0) {
    throw new Error("환율은 0보다 커야 합니다.");
  }
  return (amount / sourceRate) * destinationRate;
}

/** Convert a transaction amount into the fixed currency of its casino session. */
export function toSessionCurrency(
  amount: number,
  transactionFxRate: number,
  sessionFxRate: number,
): number {
  return convertAtRates(amount, transactionFxRate, sessionFxRate);
}

/** Compare transfers using their transaction-time base-currency equivalents. */
export function transferDifference(sourceBase: number, destinationBase: number[]): number {
  return sourceBase - destinationBase.reduce((sum, value) => sum + value, 0);
}

/** Snapshot performance excludes external deposits and includes withdrawals. */
export function investmentTradePnl(
  previousBalance: number,
  endingBalance: number,
  deposit: number,
  withdrawal: number,
): number {
  return endingBalance - previousBalance - deposit + withdrawal;
}

export type HistoricalRate = { base: string; rate: number; effectiveAt: number };

/** Latest known 1 USD = currency rate at the transaction timestamp. */
export function rateAt(
  currency: string,
  timestamp: number,
  history: HistoricalRate[],
  fallbackRates: Record<string, number>,
): number {
  if (!currency || currency === "USD") return 1;
  const historical = history
    .filter((item) => item.base === currency && item.effectiveAt <= timestamp && item.rate > 0)
    .sort((a, b) => b.effectiveAt - a.effectiveAt)[0];
  const fallback = fallbackRates[currency];
  const value = historical?.rate ?? fallback;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
}


/** Convert a historical transaction amount into the currently selected display base. */
export function amountAtBaseCurrency(
  amount: number,
  transactionCurrency: string,
  transactionFxRate: number | undefined,
  timestamp: number,
  displayBaseCurrency: string,
  history: HistoricalRate[],
  fallbackRates: Record<string, number>,
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(timestamp))
    throw new Error("거래 금액 또는 날짜가 올바르지 않습니다.");
  const sourceRate = typeof transactionFxRate === "number" &&
    Number.isFinite(transactionFxRate) && transactionFxRate > 0
    ? transactionFxRate
    : rateAt(transactionCurrency, timestamp, history, fallbackRates);
  const displayRate = rateAt(displayBaseCurrency, timestamp, history, fallbackRates);
  return Math.round(((amount / sourceRate) * displayRate) * 1e6) / 1e6;
}

/** Convert a USD-denominated payout fee into the payout currency and subtract it. */
export function netPayoutAfterUsdFee(
  grossAmount: number,
  payoutCurrencyPerUsd: number,
  feeUsd: number,
): number {
  if (
    !Number.isFinite(grossAmount) ||
    !Number.isFinite(payoutCurrencyPerUsd) ||
    !Number.isFinite(feeUsd) ||
    grossAmount <= 0 ||
    payoutCurrencyPerUsd <= 0 ||
    feeUsd < 0
  ) {
    throw new Error("지급 금액, 수수료 또는 환율이 올바르지 않습니다.");
  }
  const net = grossAmount - feeUsd * payoutCurrencyPerUsd;
  if (net <= 0) throw new Error("수수료를 차감한 실제 지급액은 0보다 커야 합니다.");
  return net;
}
