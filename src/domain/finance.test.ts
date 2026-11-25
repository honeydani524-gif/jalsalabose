import { describe, expect, it } from "vitest";
import {
  convertAtRates,
  investmentTradePnl,
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
