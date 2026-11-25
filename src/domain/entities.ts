/* ────────────────────────────────────────────────────────────
   src/domain/entities.ts — 엔티티 타입 + 순수 자산 계산
   소유하지 않은 자산(프랍 명목·미지급 수익·진행 중 칩)은절대
   netWorth 에 합산하지 않는다. 이 파일이 유일한 판단 기준이다.
   ──────────────────────────────────────────────────────────── */
import { round, toBase, type Settings } from "./calc";
import { toSessionCurrency } from "./finance";

export type RelKind = "account" | "cash" | "crypto";

export type Country = { id: string; code: string; name: string; symbol: string; sortOrder: number };
export type Institution = {
  id: string;
  countryId: string;
  name: string;
  kind: "bank" | "broker" | "exchange" | "prop" | "other";
  sortOrder: number;
};
export type AccountType = {
  id: string;
  code: string;
  label: string;
  group: "bank" | "cash" | "invest" | "crypto" | "prop" | "other";
  includesInNetWorth: boolean;
  icon: string;
  sortOrder: number;
};
export type Account = {
  id: string;
  alias: string;
  accountTypeId: string;
  institutionId?: string;
  countryId: string;
  currency: string;
  openingBalance: number;
  balance: number;
  memo?: string;
  favorite?: boolean;
  createdAt: number;
  archivedAt?: number;
};
export type CashLocation = {
  id: string;
  name: string;
  kind: "wallet" | "safe" | "office" | "other";
  currency: string;
  openingBalance: number;
  balance: number;
  memo?: string;
  sortOrder: number;
};
export type Category = {
  id: string;
  kind: "income" | "expense";
  name: string;
  sortOrder: number;
  archivedAt?: number;
};
export type Tag = { id: string; name: string; color: string; sortOrder: number; archivedAt?: number };

export type Leg = {
  kind: "account" | "cash";
  id: string;
  amount: number;
  /** Transaction-time destination currency and FX snapshot (optional for legacy rows). */
  currency?: string;
  fxRate?: number;
  amountBase?: number;
  baseCurrency?: string;
};

export type TxType = "income" | "expense" | "transfer" | "casino" | "adjust";
export type Tx = {
  id: string;
  type: TxType;
  amount: number;
  currency: string;
  fxRate: number;
  amountBase: number;
  baseCurrency?: string;
  date: number;
  accountId?: string;
  from?: { kind: "account" | "cash"; id: string };
  legs?: Leg[];
  categoryId?: string;
  tagIds: string[];
  memo?: string;
  counterparty?: string;
  sessionId?: string;
  reason?: string;
  /** Links internally generated transfer rows to an investment snapshot. */
  snapshotId?: string;
  createdAt: number;
};

export type ExchangeRate = {
  id: string;
  base: string;
  rate: number;
  effectiveAt: number;
  source: "manual" | "import";
  memo?: string;
};
export type InvSnapshot = {
  id: string;
  accountId: string;
  date: string; // YYYY-MM-DD (로컬)
  endBalance: number;
  deposit: number;
  withdrawal: number;
  memo?: string;
  createdAt: number;
};
export type PropAccount = {
  id: string;
  firm: string;
  alias: string;
  kind: "evaluation" | "funded";
  nominalSize: number;
  opening: number;
  balance: number;
  target?: number;
  maxDailyLoss?: number;
  maxTotalLoss?: number;
  status: "평가" | "펀딩" | "거래 중" | "통과" | "탈락" | "종료";
  fee: number;
  feeCurrency: string;
  payoutRequested: number;
  payoutCurrency: string;
  memo?: string;
  createdAt: number;
};
export type PropPayout = {
  id: string;
  propAccountId: string;
  amount: number;
  currency: string;
  fxRate: number;
  receivedAt: number;
  to: { kind: "account" | "cash"; id: string };
  fee: number;
  memo?: string;
};
export type Wallet = {
  id: string;
  name: string;
  kind: "krExchange" | "overseasExchange" | "software" | "hardware" | "paper";
  countryId?: string;
  memo?: string;
  sortOrder: number;
};
export type Asset = {
  id: string;
  walletId: string;
  symbol: string;
  quantity: number;
  manualPrice?: number;
  note?: string;
};
export type Price = {
  id: string; // symbol
  symbol: string;
  price: number;
  currency: string;
  source: "api" | "manual";
  fetchedAt: number;
  isStale: boolean;
};
export type CryptoTx = {
  id: string;
  walletId: string;
  type: "deposit" | "withdrawal" | "transfer" | "fee";
  symbol: string;
  quantity: number;
  feeSymbol?: string;
  feeQuantity?: number;
  fromWalletId?: string;
  toWalletId?: string;
  counterparty?: string;
  date: number;
  memo?: string;
};
export type Casino = { id: string; name: string; countryId?: string; city?: string; memo?: string; sortOrder: number };
export type Session = {
  id: string;
  casinoId: string;
  startedAt: number;
  endedAt?: number;
  status: "ongoing" | "closed";
  currency: string;
  /** Units of session currency per USD, captured when the first Buy-in created the session. */
  fxRate?: number;
  memo?: string;
};
export type BuyIn = {
  id: string;
  sessionId: string;
  from: { kind: RelKind; id: string };
  amount: number;
  currency: string;
  fxRate: number;
  /** Buy-in amount expressed in the fixed session currency at transaction time. */
  sessionAmount?: number;
  /** Actual chips received, expressed in the fixed session currency. */
  chipSessionAmount?: number;
  chipAmount: number;
  fee: number;
  date: number;
  memo?: string;
};
export type CashOut = {
  id: string;
  sessionId: string;
  totalAmount: number;
  currency: string;
  fxRate: number;
  fee: number;
  date: number;
  memo?: string;
  /** Cash-out total expressed in the fixed session currency at transaction time. */
  sessionAmount?: number;
  legs: {
    kind: RelKind;
    id: string;
    amount: number;
    currency?: string;
    fxRate?: number;
    /** Leg amount expressed in session currency at transaction time. */
    amountSession?: number;
  }[];
};
export type NwPoint = { id: string; t: number; value: number; base: string };

/* ── 시세 평가 ─────────────────────────────────────────── */
export function assetPrice(asset: Asset, prices: Price[]): number {
  if (typeof asset.manualPrice === "number" && asset.manualPrice > 0) return asset.manualPrice;
  const p = prices.find((x) => x.symbol === asset.symbol);
  return p ? p.price : 0;
}

export function walletValueIn(
  walletId: string,
  assets: Asset[],
  prices: Price[],
  settings: Settings,
): number {
  return round(
    assets
      .filter((a) => a.walletId === walletId)
      .reduce((s, a) => s + toBase(a.quantity * assetPrice(a, prices), "USD", settings), 0),
    6,
  );
}

export function cryptoTotalBase(assets: Asset[], prices: Price[], settings: Settings): number {
  return round(assets.reduce((s, a) => s + toBase(a.quantity * assetPrice(a, prices), "USD", settings), 0), 6);
}

/* ── 세션 통화 기준 금액 (과거 데이터 호환) ─────────────── */
export function casinoSessionTotals(
  sessionId: string,
  buyIns: BuyIn[],
  cashOuts: CashOut[],
  session?: Pick<Session, "currency" | "fxRate">,
): { currency: string; buyIn: number; cashOut: number; open: number } {
  const sessionBuyIns = buyIns.filter((b) => b.sessionId === sessionId).sort((a, b) => a.date - b.date);
  const sessionCashOuts = cashOuts.filter((c) => c.sessionId === sessionId);
  const first = sessionBuyIns[0];
  // The persisted session is authoritative: a later Buy-in may be entered with an earlier date.
  const currency = session?.currency ?? first?.currency ?? "USD";
  const sessionFxRate = session?.fxRate ?? first?.fxRate ?? 1;
  const buyIn = sessionBuyIns.reduce(
    (sum, b) => sum + (typeof b.sessionAmount === "number"
      ? b.sessionAmount
      : toSessionCurrency(b.amount + (b.fee || 0), b.fxRate || sessionFxRate, sessionFxRate)),
    0,
  );
  const cashOut = sessionCashOuts.reduce(
    (sum, c) => sum + (typeof c.sessionAmount === "number"
      ? c.sessionAmount
      : toSessionCurrency(c.totalAmount - (c.fee || 0), c.fxRate || sessionFxRate, sessionFxRate)),
    0,
  );
  const chipIn = sessionBuyIns.reduce(
    (sum, b) => sum + (typeof b.chipSessionAmount === "number"
      ? b.chipSessionAmount
      : toSessionCurrency(b.chipAmount ?? b.amount, b.fxRate || sessionFxRate, sessionFxRate)),
    0,
  );
  const chipOut = sessionCashOuts.reduce(
    (sum, c) => sum + toSessionCurrency(c.totalAmount, c.fxRate || sessionFxRate, sessionFxRate),
    0,
  );
  return {
    currency,
    buyIn: round(buyIn, 6),
    cashOut: round(cashOut, 6),
    open: round(chipIn - chipOut, 6),
  };
}

/* ── 진행 중 칩 (미정산) ────────────────────────────────── */
export function ongoingChipBase(
  sessionId: string,
  buyIns: BuyIn[],
  cashOuts: CashOut[],
  settings: Settings,
  session?: Pick<Session, "currency" | "fxRate">,
): number {
  const totals = casinoSessionTotals(sessionId, buyIns, cashOuts, session);
  return round(toBase(Math.max(0, totals.open), totals.currency, settings), 6);
}

/* ── 순자산 ────────────────────────────────────────────── */
export type NwRow = {
  id: string;
  group: string;
  label: string;
  currency: string;
  amount: number;
  base: number;
  included: boolean;
  reason?: string;
};

export type NwResult = {
  total: number;
  opening: number;
  rows: NwRow[];
  excluded: NwRow[];
  bank: number;
  cash: number;
  invest: number;
  crypto: number;
};

export type DataSlice = {
  settings: Settings;
  accounts: Account[];
  accountTypes: AccountType[];
  institutions: Institution[];
  countries: Country[];
  cashLocations: CashLocation[];
  cryptoWallets: Wallet[];
  cryptoAssets: Asset[];
  cryptoPrices: Price[];
  propAccounts: PropAccount[];
  propPayouts: PropPayout[];
  casinoSessions: Session[];
  casinoBuyIns: BuyIn[];
  casinoCashOuts: CashOut[];
};

export function computeNetWorth(d: DataSlice): NwResult {
  const s = d.settings;
  const typeOf = (id?: string) => d.accountTypes.find((t) => t.id === id);
  const instOf = (id?: string) => d.institutions.find((i) => i.id === id);
  const rows: NwRow[] = [];

  let bank = 0,
    invest = 0,
    cash = 0,
    opening = 0;

  d.accounts
    .filter((a) => !a.archivedAt)
    .forEach((a) => {
      const t = typeOf(a.accountTypeId);
      const included = t ? t.includesInNetWorth : true;
      const group =
        t?.group === "invest" ? "투자 계좌" : t?.group === "crypto" ? "암호화폐" : "은행 · 일반 계좌";
      const base = toBase(a.balance, a.currency, s);
      const openBase = toBase(a.openingBalance, a.currency, s);
      if (included) {
        if (t?.group === "invest") invest += base;
        else bank += base;
        opening += openBase;
      }
      rows.push({
        id: a.id,
        group,
        label: `${a.alias}${instOf(a.institutionId) ? ` · ${instOf(a.institutionId)!.name}` : ""}`,
        currency: a.currency,
        amount: a.balance,
        base: round(base, 6),
        included,
        reason: included ? undefined : "순자산 미포함",
      });
    });

  d.cashLocations.forEach((c) => {
    const base = toBase(c.balance, c.currency, s);
    cash += base;
    opening += toBase(c.openingBalance, c.currency, s);
    rows.push({
      id: c.id,
      group: c.kind === "wallet" ? "지갑 현금" : "금고 · 보관",
      label: c.name,
      currency: c.currency,
      amount: c.balance,
      base: round(base, 6),
      included: true,
    });
  });

  const crypto = cryptoTotalBase(d.cryptoAssets, d.cryptoPrices, s);
  d.cryptoWallets.forEach((w) => {
    const v = walletValueIn(w.id, d.cryptoAssets, d.cryptoPrices, s);
    const qty = d.cryptoAssets.filter((a) => a.walletId === w.id);
    if (qty.length === 0) return;
    rows.push({
      id: w.id,
      group: "암호화폐",
      label: w.name,
      currency: "USD",
      amount: round(v / (s.base === "USD" ? 1 : 1), 6),
      base: round(v, 6),
      included: true,
    });
  });

  /* 제외: 프랍 명목 · 미지급 수익 · 진행 중 칩 */
  const excluded: NwRow[] = [];
  d.propAccounts.forEach((p) => {
    excluded.push({
      id: `${p.id}-nominal`,
      group: "제외 · 프랍",
      label: `${p.firm} ${p.alias} 명목 계정`,
      currency: "USD",
      amount: p.nominalSize,
      base: round(toBase(p.nominalSize, "USD", s), 6),
      included: false,
      reason: "타인 자금",
    });
    const unpaid = Math.max(0, p.payoutRequested - 0);
    if (unpaid > 0)
      excluded.push({
        id: `${p.id}-unpaid`,
        group: "제외 · 프랍",
        label: `${p.firm} ${p.alias} 출금 가능 수익`,
        currency: p.payoutCurrency || "USD",
        amount: unpaid,
        base: round(toBase(unpaid, p.payoutCurrency || "USD", s), 6),
        included: false,
        reason: "수령 전",
      });
  });

  d.casinoSessions
    .filter((x) => x.status === "ongoing")
    .forEach((ses) => {
      const v = ongoingChipBase(ses.id, d.casinoBuyIns, d.casinoCashOuts, s, ses);
      if (v <= 0) return;
      const totals = casinoSessionTotals(ses.id, d.casinoBuyIns, d.casinoCashOuts, ses);
      excluded.push({
        id: `${ses.id}-chip`,
        group: "제외 · 카지노",
        label: `진행 중 세션 칩`,
        currency: totals.currency,
        amount: totals.open,
        base: round(v, 6),
        included: false,
        reason: "미정산",
      });
    });

  const total = round(
    bank + cash + invest + crypto,
    6,
  );

  return { total, opening, rows, excluded, bank, cash, invest, crypto };
}

/** 실제 수령받은 프랍 수익 총액 (수령 계좌 잔액에 이미 반영됨) */
export function payoutReceivedTotal(payouts: PropPayout[]): number {
  return payouts.reduce((s, p) => s + p.amount, 0);
}
