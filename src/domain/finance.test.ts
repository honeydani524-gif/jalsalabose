import { describe, expect, it } from "vitest";
import {
  amountAtBaseCurrency,
  convertAtRates,
  investmentTradePnl,
  netPayoutAfterUsdFee,
  rateAt,
  toSessionCurrency,
  transferDifference,
} from "./finance";

describe("transaction-time FX calculations", () => {
  it("converts a transfer using the source and destination rates", () => {
    // 1 USD = 4,000 KHR; 1 USD = 1,400 KRW
    expect(convertAtRates(400_000, 4_000, 1_400)).toBe(140_000);
  });

  it("reconciles mixed-currency transfer legs in a common base", () => {
    expect(transferDifference(100, [60, 40])).toBe(0);
    expect(transferDifference(100, [60, 39.5])).toBeCloseTo(0.5);
  });

  it("keeps casino session currency fixed using rates captured at each event", () => {
    // Session KHR rate at first Buy-in: 4,000 KHR/USD.
    // Later Buy-in is KRW at 1,400 KRW/USD.
    expect(toSessionCurrency(140_000, 1_400, 4_000)).toBe(400_000);
    // Changing today's rate table cannot affect these stored snapshot rates.
    expect(toSessionCurrency(140_000, 1_400, 4_000)).toBe(400_000);
  });

  it("calculates investment P/L after removing deposits and adding withdrawals", () => {
    expect(investmentTradePnl(1_000, 1_250, 200, 50)).toBe(100);
    expect(investmentTradePnl(1_000, 1_000, 200, 200)).toBe(0);
  });
});

describe("historical rate lookup", () => {
  it("uses the latest rate effective on or before the transaction date", () => {
    const history = [
      { base: "KHR", rate: 4000, effectiveAt: 100 },
      { base: "KHR", rate: 4100, effectiveAt: 200 },
      { base: "KHR", rate: 4200, effectiveAt: 300 },
    ];
    expect(rateAt("KHR", 250, history, { KHR: 9999 })).toBe(4100);
    expect(rateAt("KHR", 150, history, { KHR: 9999 })).toBe(4000);
    expect(rateAt("KHR", 50, history, { KHR: 9999 })).toBe(9999);
  });
});

describe("prop payout net receipt", () => {
  it("subtracts a USD fee after converting it at the payout-date FX rate", () => {
    // 1 USD = 4,000 KHR; a $2 fee reduces a 500,000 KHR gross payout by 8,000 KHR.
    expect(netPayoutAfterUsdFee(500_000, 4_000, 2)).toBe(492_000);
  });

  it("rejects fees that consume the entire payout", () => {
    expect(() => netPayoutAfterUsdFee(8_000, 4_000, 2)).toThrow();
  });

  it("rejects negative or invalid fee inputs", () => {
    expect(() => netPayoutAfterUsdFee(100, 4_000, -1)).toThrow();
  });
});


describe("historical transaction display currency", () => {
  const history = [
    { base: "KRW", rate: 1400, effectiveAt: 100 },
    { base: "KHR", rate: 4000, effectiveAt: 100 },
    { base: "KHR", rate: 4100, effectiveAt: 200 },
  ];

  it("converts a saved transaction into the selected base using rates effective on its date", () => {
    expect(amountAtBaseCurrency(140000, "KRW", 1400, 250, "KHR", history, { KHR: 5000 })).toBe(410000);
    expect(amountAtBaseCurrency(140000, "KRW", 1400, 250, "USD", history, { USD: 1 })).toBe(100);
  });

  it("falls back to the transaction-date source rate for legacy rows without fxRate", () => {
    expect(amountAtBaseCurrency(140000, "KRW", undefined, 150, "KHR", history, { KRW: 1, KHR: 5000 })).toBe(400000);
  });
});
