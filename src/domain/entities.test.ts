import { describe, expect, it } from "vitest";
import { casinoSessionTotals, computeNetWorth, transactionReversalDeltas } from "./entities";
import { DEFAULT_SETTINGS } from "./calc";

describe("casino session currency accounting", () => {
  it("converts each Buy-in and Cash-out using its stored transaction FX", () => {
    const buyIns = [
      {
        id: "b1", sessionId: "s1", from: { kind: "account" as const, id: "a1" },
        amount: 100, currency: "USD", fxRate: 1, sessionAmount: 102,
        chipAmount: 100, chipSessionAmount: 100, fee: 2, date: 1,
      },
      {
        id: "b2", sessionId: "s1", from: { kind: "account" as const, id: "a2" },
        amount: 140_000, currency: "KRW", fxRate: 1_400, sessionAmount: 100,
        chipAmount: 140_000, chipSessionAmount: 100, fee: 0, date: 2,
      },
    ];
    const cashOuts = [
      {
        id: "c1", sessionId: "s1", totalAmount: 200_000, currency: "KHR",
        fxRate: 4_000, sessionAmount: 49, fee: 1, date: 3,
        legs: [{ kind: "account" as const, id: "a3", amount: 200_000, currency: "KHR", fxRate: 4_000, amountSession: 50 }],
      },
    ];
    expect(casinoSessionTotals("s1", buyIns, cashOuts)).toEqual({
      currency: "USD",
      buyIn: 202,
      cashOut: 49,
      open: 150,
    });
  });

  it("supports legacy records without session-currency snapshots using stored FX rates", () => {
    const buyIns = [
      {
        id: "b1", sessionId: "s1", from: { kind: "account" as const, id: "a1" },
        amount: 4_000, currency: "KHR", fxRate: 4_000, chipAmount: 4_000, fee: 0, date: 1,
      },
      {
        id: "b2", sessionId: "s1", from: { kind: "account" as const, id: "a2" },
        amount: 140_000, currency: "KRW", fxRate: 1_400, chipAmount: 140_000, fee: 0, date: 2,
      },
    ];
    const cashOuts = [
      {
        id: "c1", sessionId: "s1", totalAmount: 2_000, currency: "KHR",
        fxRate: 4_000, fee: 0, date: 3,
        legs: [{ kind: "account" as const, id: "a3", amount: 2_000 }],
      },
    ];
    expect(casinoSessionTotals("s1", buyIns, cashOuts)).toEqual({
      currency: "KHR",
      buyIn: 404_000,
      cashOut: 2_000,
      open: 402_000,
    });
  });
});


describe("casino session uses its persisted first-buy-in currency", () => {
  it("does not change session currency when a later Buy-in is backdated", () => {
    const session = { currency: "KHR", fxRate: 4000 };
    const buyIns = [
      {
        id: "original", sessionId: "s2", from: { kind: "account" as const, id: "a1" },
        amount: 100, currency: "USD", fxRate: 1, sessionAmount: 400000,
        chipAmount: 100, chipSessionAmount: 400000, fee: 0, date: 200,
      },
      {
        id: "backdated", sessionId: "s2", from: { kind: "account" as const, id: "a2" },
        amount: 140000, currency: "KRW", fxRate: 1400, sessionAmount: 400000,
        chipAmount: 140000, chipSessionAmount: 400000, fee: 0, date: 100,
      },
    ];
    const cashOuts = [
      {
        id: "out", sessionId: "s2", totalAmount: 200000, currency: "KHR",
        fxRate: 4000, fee: 0, date: 300, legs: [],
      },
    ];
    const totals = casinoSessionTotals("s2", buyIns, cashOuts, session);
    expect(totals.currency).toBe("KHR");
    expect(totals.open).toBe(600000);
  });
});


describe("transaction deletion balance reversal", () => {
  it("reverses income and expense in the linked account currency", () => {
    expect(transactionReversalDeltas({
      id: "income", type: "income", amount: 75, currency: "USD", fxRate: 1,
      amountBase: 75, date: 1, accountId: "a1", tagIds: [], createdAt: 1,
    })).toEqual([{ kind: "account", id: "a1", delta: -75 }]);
    expect(transactionReversalDeltas({
      id: "expense", type: "expense", amount: 20, currency: "USD", fxRate: 1,
      amountBase: 20, date: 1, accountId: "a1", tagIds: [], createdAt: 1,
    })).toEqual([{ kind: "account", id: "a1", delta: 20 }]);
  });

  it("reverses every leg of a multi-destination transfer", () => {
    expect(transactionReversalDeltas({
      id: "transfer", type: "transfer", amount: 100, currency: "USD", fxRate: 1,
      amountBase: 100, date: 1, from: { kind: "account", id: "source" },
      legs: [
        { kind: "account", id: "target-krw", amount: 60000 },
        { kind: "cash", id: "target-khr", amount: 160000 },
      ],
      tagIds: [], createdAt: 1,
    })).toEqual([
      { kind: "account", id: "source", delta: 100 },
      { kind: "account", id: "target-krw", delta: -60000 },
      { kind: "cash", id: "target-khr", delta: -160000 },
    ]);
  });

  it("reverses positive and negative balance adjustments", () => {
    expect(transactionReversalDeltas({
      id: "adjust", type: "adjust", amount: -30, currency: "USD", fxRate: 1,
      amountBase: -30, date: 1, from: { kind: "cash", id: "safe" },
      tagIds: [], createdAt: 1,
    })).toEqual([{ kind: "cash", id: "safe", delta: 30 }]);
  });
});


describe("external payout transfer reversal", () => {
  it("reverses the credited cash leg without touching the virtual clearing account", () => {
    expect(transactionReversalDeltas({
      id: "payout", type: "transfer", amount: 500, currency: "KHR", fxRate: 4000,
      amountBase: 0.125, baseCurrency: "USD", date: 1,
      from: { kind: "account", id: "prop-clearing" },
      legs: [{ kind: "cash", id: "wallet", amount: 500, currency: "KHR", fxRate: 4000 }],
      categoryId: "in-invest", tagIds: [], createdAt: 1,
    }, true)).toEqual([{ kind: "cash", id: "wallet", delta: -500 }]);
  });
});


describe("crypto net-worth row currency", () => {
  it("keeps the native USD amount separate from the selected base-currency value", () => {
    const result = computeNetWorth({
      settings: {
        ...DEFAULT_SETTINGS,
        base: "KRW",
        rates: { ...DEFAULT_SETTINGS.rates, KRW: 1400 },
      },
      accounts: [],
      accountTypes: [],
      institutions: [],
      countries: [],
      cashLocations: [],
      cryptoWallets: [{ id: "wallet-1", name: "Cold wallet", kind: "hardware", sortOrder: 1 }],
      cryptoAssets: [{ id: "btc-1", walletId: "wallet-1", symbol: "BTC", quantity: 0.1 }],
      cryptoPrices: [{
        id: "BTC", symbol: "BTC", price: 60000, currency: "USD",
        source: "manual", fetchedAt: 1, isStale: false,
      }],
      propAccounts: [],
      propPayouts: [],
      casinoSessions: [],
      casinoBuyIns: [],
      casinoCashOuts: [],
    });

    expect(result.rows).toContainEqual(expect.objectContaining({
      id: "wallet-1",
      currency: "USD",
      amount: 6000,
      base: 8400000,
    }));
    expect(result.total).toBe(8400000);
  });
});
