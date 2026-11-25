import { describe, expect, it } from "vitest";
import { casinoSessionTotals } from "./entities";

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
      buyIn: 8_000,
      cashOut: 2_000,
      open: 6_000,
    });
  });
});
