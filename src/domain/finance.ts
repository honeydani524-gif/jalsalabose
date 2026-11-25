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
