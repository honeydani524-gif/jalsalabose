/* ────────────────────────────────────────────────────────────
   src/store/AppStore.tsx — 애플리케이션 상태 + 유스케이스 (L2)
   원칙:
   · 모든 변경은 상태 갱신과 IndexedDB 저장을 같은 흐름에서 수행
   · 내부 이체는 ΣΔ = 0 (income/expense 로 만들지 않는다)
   · 프랍 명목/미지급, 진행 중 칩은 순자산에서 제외
   · 시세 동기화는 cryptoAssets.quantity 를 절대 건드리지 않는다
   ──────────────────────────────────────────────────────────── */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  allRows,
  clearAll,
  clearStore,
  delRow,
  putRow,
  putRows,
  STORE_LIST,
  uid,
  type StoreName,
} from "../data/db";
import {
  DEFAULT_SETTINGS,
  dayKey,
  rateOf,
  round,
  toBase,
  type Settings,
} from "../domain/calc";
import { convertAtRates, rateAt as historicalRateAt, toSessionCurrency } from "../domain/finance";
import {
  computeNetWorth,
  casinoSessionTotals,
  type Account,
  type Asset,
  type BuyIn,
  type CashLocation,
  type CashOut,
  type Casino,
  type Category,
  type Country,
  type ExchangeRate,
  type Institution,
  type InvSnapshot,
  type Leg,
  type NwResult,
  type Price,
  type PropAccount,
  type PropPayout,
  type RelKind,
  type Session,
  type Tag,
  type Tx,
  type TxType,
  type Wallet,
} from "../domain/entities";

export type Data = {
  settings: Settings;
  countries: Country[];
  institutions: Institution[];
  accountTypes: import("../domain/entities").AccountType[];
  accounts: Account[];
  cashLocations: CashLocation[];
  transactions: Tx[];
  categories: Category[];
  tags: Tag[];
  exchangeRates: ExchangeRate[];
  invSnapshots: InvSnapshot[];
  propAccounts: PropAccount[];
  propPayouts: PropPayout[];
  cryptoWallets: Wallet[];
  cryptoAssets: Asset[];
  cryptoPrices: Price[];
  cryptoTx: import("../domain/entities").CryptoTx[];
  casinos: Casino[];
  casinoSessions: Session[];
  casinoBuyIns: BuyIn[];
  casinoCashOuts: CashOut[];
  nwHistory: import("../domain/entities").NwPoint[];
};

export type TxInput = {
  type: TxType;
  amount: number;
  currency: string;
  date: number;
  accountId?: string;
  from?: { kind: "account" | "cash"; id: string };
  legs?: Leg[];
  categoryId?: string;
  tagIds?: string[];
  memo?: string;
  counterparty?: string;
  sessionId?: string;
  reason?: string;
};

type Persist = [StoreName, { id: string }?][];

const Ctx = createContext<StoreValue | null>(null);

export type StoreValue = {
  data: Data;
  ready: boolean;
  error: string | null;
  clearError: () => void;
  nw: NwResult;
  save: (store: StoreName, row: { id: string } & Record<string, unknown>) => Promise<void>;
  remove: (store: StoreName, id: string) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
  applyTx: (input: TxInput) => Promise<void>;
  setBalance: (kind: "account" | "cash", id: string, next: number, reason: string) => Promise<void>;
  recordSnapshot: (input: {
    accountId: string;
    date: string;
    endBalance: number;
    deposit: number;
    withdrawal: number;
    memo?: string;
    fromId?: string;
    fromKind?: "account" | "cash";
  }) => Promise<void>;
  addBuyIn: (input: {
    casinoId: string;
    sessionId?: string;
    from: { kind: RelKind; id: string };
    amount: number;
    currency: string;
    chipAmount: number;
    fee: number;
    date: number;
    memo?: string;
    symbol?: string;
  }) => Promise<string>;
  addCashOut: (input: {
    sessionId: string;
    totalAmount: number;
    currency: string;
    fee: number;
    date: number;
    memo?: string;
    legs: { kind: RelKind; id: string; amount: number }[];
    symbol?: string;
  }) => Promise<void>;
  closeSession: (id: string, force?: boolean) => Promise<{ ok: boolean; message?: string }>;
  addPropPayout: (input: {
    propAccountId: string;
    amount: number;
    currency: string;
    to: { kind: "account" | "cash"; id: string };
    fee: number;
    receivedAt: number;
    memo?: string;
  }) => Promise<void>;
  exportJSON: () => string;
  importJSON: (text: string) => Promise<void>;
  resetAll: () => Promise<void>;
  loadSample: () => Promise<void>;
};

/* ── 시드: 마스터 데이터 (계좌/거래는 절대 시드하지 않는다) ── */
function seed(): Pick<
  Data,
  | "countries"
  | "institutions"
  | "accountTypes"
  | "categories"
  | "tags"
  | "exchangeRates"
  | "settings"
> {
  const now = Date.now();
  const countries: Country[] = [
    { id: "kr", code: "KR", name: "한국", symbol: "₩", sortOrder: 1 },
    { id: "kh", code: "KH", name: "캄보디아", symbol: "៛", sortOrder: 2 },
    { id: "us", code: "US", name: "미국", symbol: "$", sortOrder: 3 },
    { id: "etc", code: "ETC", name: "기타", symbol: "", sortOrder: 9 },
  ];
  const mk = (
    id: string,
    countryId: string,
    name: string,
    kind: Institution["kind"],
    sortOrder: number,
  ): Institution => ({ id, countryId, name, kind, sortOrder });
  const institutions: Institution[] = [
    mk("kb", "kr", "국민은행", "bank", 1),
    mk("shinhan", "kr", "신한은행", "bank", 2),
    mk("hana", "kr", "하나은행", "bank", 3),
    mk("woori", "kr", "우리은행", "bank", 4),
    mk("kakao", "kr", "카카오뱅크", "bank", 5),
    mk("toss", "kr", "토스뱅크", "bank", 6),
    mk("nh", "kr", "농협은행", "bank", 7),
    mk("kiwoom", "kr", "키움증권", "broker", 10),
    mk("mirae", "kr", "미래에셋증권", "broker", 11),
    mk("samsung", "kr", "삼성증권", "broker", 12),
    mk("koreainv", "kr", "한국투자증권", "broker", 13),
    mk("upbit", "kr", "업비트", "exchange", 20),
    mk("bithumb", "kr", "빗썸", "exchange", 21),
    mk("aba", "kh", "ABA Bank", "bank", 1),
    mk("acleda", "kh", "ACLEDA Bank", "bank", 2),
    mk("wing", "kh", "Wing", "bank", 3),
    mk("prince", "kh", "Prince Bank", "bank", 4),
    mk("boa", "us", "Bank of America", "bank", 1),
    mk("chase", "us", "Chase", "bank", 2),
    mk("schwab", "us", "Charles Schwab", "broker", 10),
    mk("ibkr", "us", "Interactive Brokers", "broker", 11),
    mk("binance", "us", "Binance", "exchange", 20),
    mk("okx", "us", "OKX", "exchange", 21),
    mk("ftmo", "etc", "FTMO", "prop", 1),
    mk("fundednext", "etc", "FundedNext", "prop", 2),
    mk("topstep", "us", "Topstep", "prop", 3),
  ];
  const at = (
    id: string,
    code: string,
    label: string,
    group: import("../domain/entities").AccountType["group"],
    inc: boolean,
    icon: string,
    sortOrder: number,
  ): import("../domain/entities").AccountType => ({
    id,
    code,
    label,
    group,
    includesInNetWorth: inc,
    icon,
    sortOrder,
  });
  const accountTypes = [
    at("checking", "checking", "일반 입출금 계좌", "bank", true, "bank", 1),
    at("savings", "savings", "저축 계좌", "bank", true, "bank", 2),
    at("fx", "fx", "외화 계좌", "bank", true, "bank", 3),
    at("living", "living", "생활비 계좌", "bank", true, "wallet", 4),
    at("stock", "stock", "주식 계좌", "invest", true, "chart", 5),
    at("stock_ovs", "stock_ovs", "해외 주식 계좌", "invest", true, "chart", 6),
    at("futures", "futures", "선물 계좌", "invest", true, "chart", 7),
    at("securities", "securities", "종합 증권 계좌", "invest", true, "chart", 8),
    at("prop", "prop", "프랍 트레이딩 계정", "prop", false, "target", 9),
    at("cex_kr", "cex_kr", "한국 암호화폐 거래소", "crypto", true, "coin", 10),
    at("cex_ovs", "cex_ovs", "해외 암호화폐 거래소", "crypto", true, "coin", 11),
    at("wallet", "wallet", "개인 암호화폐 지갑", "crypto", true, "coin", 12),
    at("cash", "cash", "현금 보관 장소", "cash", true, "cash", 13),
    at("other", "other", "기타", "other", true, "dots", 14),
  ];
  const cat = (id: string, kind: Category["kind"], name: string, sortOrder: number): Category => ({
    id,
    kind,
    name,
    sortOrder,
  });
  const categories: Category[] = [
    cat("in-salary", "income", "월급", 1),
    cat("in-biz", "income", "사업수입", 2),
    cat("in-remittance", "income", "가족송금", 3),
    cat("in-invest", "income", "투자수익", 4),
    cat("in-casino", "income", "카지노 수익", 5),
    cat("in-etc", "income", "기타", 6),
    cat("ex-food", "expense", "식비", 1),
    cat("ex-house", "expense", "주거비", 2),
    cat("ex-trans", "expense", "교통비", 3),
    cat("ex-comm", "expense", "통신비", 4),
    cat("ex-shop", "expense", "쇼핑", 5),
    cat("ex-med", "expense", "의료비", 6),
    cat("ex-fun", "expense", "여가", 7),
    cat("ex-fee", "expense", "수수료 · 비용", 8),
    cat("ex-etc", "expense", "기타", 9),
  ];
  const exchangeRates: ExchangeRate[] = [
    { id: "rate-KRW", base: "KRW", rate: 1385, effectiveAt: now, source: "manual", memo: "초기 설정" },
    { id: "rate-KHR", base: "KHR", rate: 4050, effectiveAt: now, source: "manual", memo: "초기 설정" },
  ];
  return {
    countries,
    institutions,
    accountTypes,
    categories,
    tags: [],
    exchangeRates,
    settings: { ...DEFAULT_SETTINGS, id: "settings" } as Settings & { id: string },
  };
}

function upsert<T extends { id: string }>(rows: T[], row: T): T[] {
  const i = rows.findIndex((r) => r.id === row.id);
  if (i < 0) return [...rows, row];
  const copy = rows.slice();
  copy[i] = row;
  return copy;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Data | null>(null);
  const histLock = useRef(false);

  const commit = useCallback((next: Data, persist: Persist = []) => {
    ref.current = next;
    setData(next);
    persist.forEach(([store, row]) => {
      if (row) putRow(store, row).catch((e) => setError(String(e?.message ?? e)));
    });
  }, []);

  /* ── 순자산 이력 기록 (같은 날은 마지막 값만 갱신) ── */
  const recordHistory = useCallback((d: Data): Data => {
    if (histLock.current) return d;
    const nw = computeNetWorth(d);
    const now = Date.now();
    const pts = d.nwHistory.slice();
    const last = pts[pts.length - 1];
    if (last && dayKey(last.t) === dayKey(now)) {
      if (Math.abs(last.value - nw.total) <= 0.004) return d; // 변화 없음
      if (now - last.t >= 60000) {
        // 같은 날이라도 1분 이상 간격이면 새 포인트 (인traday 추이)
        pts.push({ id: uid(), t: now, value: nw.total, base: d.settings.base });
      } else {
        pts[pts.length - 1] = { ...last, t: now, value: nw.total, base: d.settings.base };
      }
    } else {
      pts.push({ id: uid(), t: now, value: nw.total, base: d.settings.base });
    }
    const next = { ...d, nwHistory: pts };
    putRow("nwHistory", pts[pts.length - 1]).catch(() => undefined);
    return next;
  }, []);

  /* ── 초기 로드 + 시드 ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await Promise.all(
          STORE_LIST.map((s) => allRows<never>(s).catch(() => [] as never[])),
        );
        const map = Object.fromEntries(STORE_LIST.map((s, i) => [s, rows[i]])) as unknown as Record<
          StoreName,
          unknown[]
        >;
        let loaded = {
          settings: { ...DEFAULT_SETTINGS, ...((map.kv[0] as Partial<Settings>) ?? {}) } as Settings,
          countries: map.countries as Country[],
          institutions: map.institutions as Institution[],
          accountTypes: map.accountTypes as Data["accountTypes"],
          accounts: map.accounts as Account[],
          cashLocations: map.cashLocations as CashLocation[],
          transactions: map.transactions as Tx[],
          categories: map.categories as Category[],
          tags: map.tags as Tag[],
          exchangeRates: map.exchangeRates as ExchangeRate[],
          invSnapshots: map.invSnapshots as InvSnapshot[],
          propAccounts: map.propAccounts as PropAccount[],
          propPayouts: map.propPayouts as PropPayout[],
          cryptoWallets: map.cryptoWallets as Wallet[],
          cryptoAssets: map.cryptoAssets as Asset[],
          cryptoPrices: map.cryptoPrices as Price[],
          cryptoTx: map.cryptoTx as Data["cryptoTx"],
          casinos: map.casinos as Casino[],
          casinoSessions: map.casinoSessions as Session[],
          casinoBuyIns: map.casinoBuyIns as BuyIn[],
          casinoCashOuts: map.casinoCashOuts as CashOut[],
          nwHistory: map.nwHistory as Data["nwHistory"],
        } as Data;

        if (loaded.countries.length === 0 || loaded.accountTypes.length === 0) {
          const s = seed();
          await putRows("countries", s.countries);
          await putRows("institutions", s.institutions);
          await putRows("accountTypes", s.accountTypes);
          await putRows("categories", s.categories);
          await putRows("exchangeRates", s.exchangeRates);
          await putRow("kv", s.settings as unknown as { id: string });
          loaded = { ...loaded, ...s } as Data;
        }
        if (loaded.casinoBuyIns === undefined) loaded.casinoBuyIns = [];
        if (!alive) return;
        ref.current = loaded;
        setData(recordHistory(loaded));
      } catch (e) {
        if (alive) setError(`데이터 로드 실패: ${String((e as Error)?.message ?? e)}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [recordHistory]);

  const save = useCallback(
    async (store: StoreName, row: { id: string } & Record<string, unknown>) => {
      const d = ref.current;
      if (!d) return;
      const list = (d as unknown as Record<StoreName, { id: string }[]>)[store] ?? [];
      const next = { ...d, [store]: upsert(list, row) } as Data;
      commit(recordHistory(next), [[store, row]]);
    },
    [commit, recordHistory],
  );

  const remove = useCallback(
    async (store: StoreName, id: string) => {
      const d = ref.current;
      if (!d) return;
      const list = (d as unknown as Record<StoreName, { id: string }[]>)[store] ?? [];
      const next = { ...d, [store]: list.filter((r) => r.id !== id) } as Data;
      commit(recordHistory(next));
      delRow(store, id).catch(() => undefined);
    },
    [commit, recordHistory],
  );

  const setSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const d = ref.current;
      if (!d) return;
      const row = { ...d.settings, ...patch, id: "settings" } as Settings & { id: string };
      const next = { ...d, settings: row } as Data;
      commit(next, [["kv", row]]);
    },
    [commit],
  );

  /* ── 잔액 변동 헬퍼 ── */
  const bumpRel = (
    d: Data,
    kind: "account" | "cash",
    id: string,
    delta: number,
    pers: Persist,
  ): Data => {
    if (kind === "account") {
      const accounts = d.accounts.map((a) =>
        a.id === id ? { ...a, balance: round(a.balance + delta, 6) } : a,
      );
      const row = accounts.find((a) => a.id === id);
      pers.push(["accounts", row]);
      return { ...d, accounts };
    }
    const cashLocations = d.cashLocations.map((c) =>
      c.id === id ? { ...c, balance: round(c.balance + delta, 6) } : c,
    );
    const row = cashLocations.find((c) => c.id === id);
    pers.push(["cashLocations", row]);
    return { ...d, cashLocations };
  };

  const bumpCrypto = (
    d: Data,
    walletId: string,
    symbol: string,
    qty: number,
    pers: Persist,
  ): Data => {
    const idx = d.cryptoAssets.findIndex((a) => a.walletId === walletId && a.symbol === symbol);
    if (idx < 0) {
      if (qty < 0) throw new Error(`${symbol} 보유량이 부족합니다.`);
      const row: Asset = { id: uid(), walletId, symbol, quantity: round(qty, 8) };
      pers.push(["cryptoAssets", row]);
      return { ...d, cryptoAssets: [...d.cryptoAssets, row] };
    }
    const cur = d.cryptoAssets[idx];
    const nextQty = round(cur.quantity + qty, 8);
    if (nextQty < -1e-8) throw new Error(`${symbol} 보유량이 부족합니다.`);
    const list = d.cryptoAssets.slice();
    list[idx] = { ...cur, quantity: Math.max(0, nextQty) };
    pers.push(["cryptoAssets", list[idx]]);
    return { ...d, cryptoAssets: list };
  };

  const assertBalance = (d: Data, kind: "account" | "cash", id: string, amount: number) => {
    const row =
      kind === "account" ? d.accounts.find((a) => a.id === id) : d.cashLocations.find((c) => c.id === id);
    if (!row) throw new Error("출발 자산을 찾을 수 없습니다.");
    const label = "alias" in row ? row.alias : row.name;
    if (row.balance + 1e-8 < amount)
      throw new Error(`${label} 잔액이 부족합니다. (${row.balance})`);
    return row;
  };

  const rateAtTx = (d: Data, currency: string, timestamp: number) =>
    historicalRateAt(currency, timestamp, d.exchangeRates, d.settings.rates);
  const toBaseAtTx = (d: Data, amount: number, currency: string, timestamp: number) =>
    round(
      (amount / rateAtTx(d, currency, timestamp)) * rateAtTx(d, d.settings.base, timestamp),
      6,
    );

  /* ── 거래 (수입 · 지출 · 이체 · 조정) ── */
  const applyTx = useCallback(
    async (input: TxInput) => {
      const d = ref.current;
      if (!d) return;
      if (input.type === "income" || input.type === "expense") {
        if (!input.accountId) throw new Error("계좌를 선택하세요.");
        if (input.amount <= 0) throw new Error("금액은 0보다 커야 합니다.");
      }
      let normalizedLegs: Leg[] | undefined;
      if (input.type === "transfer") {
        if (!input.from) throw new Error("출발 자산을 선택하세요.");
        if (input.amount <= 0) throw new Error("출발 금액은 0보다 커야 합니다.");
        const sourceRow = input.from.kind === "account"
          ? d.accounts.find((a) => a.id === input.from!.id)
          : d.cashLocations.find((a) => a.id === input.from!.id);
        if (!sourceRow) throw new Error("출발 자산을 찾을 수 없습니다.");
        if (sourceRow.currency !== input.currency)
          throw new Error("출발 자산의 통화가 입력한 통화와 다릅니다.");
        const legs = input.legs ?? [];
        if (legs.length === 0) throw new Error("도착 자산을 추가하세요.");
        normalizedLegs = legs.map((leg) => {
          if (leg.amount <= 0) throw new Error("도착 금액은 0보다 커야 합니다.");
          const destination = leg.kind === "account"
            ? d.accounts.find((a) => a.id === leg.id)
            : d.cashLocations.find((a) => a.id === leg.id);
          if (!destination) throw new Error("도착 자산을 찾을 수 없습니다.");
          if (input.from!.kind === leg.kind && input.from!.id === leg.id)
            throw new Error("출발 자산과 도착 자산은 달라야 합니다.");
          const currency = destination.currency;
          const fxRate = rateAtTx(d, currency, input.date);
          return {
            ...leg,
            currency,
            fxRate,
            amountBase: toBaseAtTx(d, leg.amount, currency, input.date),
          };
        });
        const sourceBase = input.amount / rateAtTx(d, input.currency, input.date);
        const destinationBase = normalizedLegs.reduce((sum, leg) => sum + leg.amount / (leg.fxRate ?? 1), 0);
        if (Math.abs(sourceBase - destinationBase) > 0.00001)
          throw new Error(`환산 기준 도착 합계(${round(destinationBase, 6)})가 출발 금액(${round(sourceBase, 6)})과 다릅니다.`);
        assertBalance(d, input.from.kind, input.from.id, input.amount);
      }

      const fxRate = rateAtTx(d, input.currency, input.date);
      const tx: Tx = {
        id: uid(),
        type: input.type,
        amount: round(input.amount, 6),
        currency: input.currency,
        fxRate,
        amountBase: toBaseAtTx(d, input.amount, input.currency, input.date),
        date: input.date,
        accountId: input.accountId,
        from: input.from,
        legs: normalizedLegs ?? input.legs,
        categoryId: input.categoryId,
        tagIds: input.tagIds ?? [],
        memo: input.memo,
        counterparty: input.counterparty,
        sessionId: input.sessionId,
        reason: input.reason,
        createdAt: Date.now(),
      };

      const pers: Persist = [["transactions", tx]];
      let next: Data = { ...d, transactions: [...d.transactions, tx] };

      if (input.type === "income" && input.accountId)
        next = bumpRel(next, "account", input.accountId, input.amount, pers);
      if (input.type === "expense" && input.accountId) {
        assertBalance(d, "account", input.accountId, input.amount);
        next = bumpRel(next, "account", input.accountId, -input.amount, pers);
      }
      if (input.type === "transfer" && input.from) {
        next = bumpRel(next, input.from.kind, input.from.id, -input.amount, pers);
        normalizedLegs!.forEach((l) => {
          next = bumpRel(next, l.kind, l.id, l.amount, pers);
        });
      }
      if (input.type === "adjust" && input.from) {
        next = bumpRel(next, input.from.kind, input.from.id, input.amount, pers);
      }
      if (input.type === "casino" && input.from) {
        assertBalance(d, input.from.kind, input.from.id, input.amount);
        next = bumpRel(next, input.from.kind, input.from.id, -input.amount, pers);
      }

      commit(recordHistory(next), pers);
    },
    [commit, recordHistory],
  );

  const setBalance = useCallback(
    async (kind: "account" | "cash", id: string, next: number, reason: string) => {
      const d = ref.current;
      if (!d) return;
      const row = kind === "account" ? d.accounts.find((a) => a.id === id) : d.cashLocations.find((c) => c.id === id);
      if (!row) return;
      const delta = round(next - row.balance, 6);
      if (delta === 0) return;
      const tx: Tx = {
        id: uid(),
        type: "adjust",
        amount: delta,
        currency: row.currency,
        fxRate: rateOf(d.settings, row.currency),
        amountBase: round(toBase(delta, row.currency, d.settings), 6),
        date: Date.now(),
        from: { kind, id },
        tagIds: [],
        reason,
        memo: `${"alias" in row ? row.alias : row.name} 잔액 조정`,
        createdAt: Date.now(),
      };
      const pers: Persist = [["transactions", tx]];
      let next2: Data = { ...d, transactions: [...d.transactions, tx] };
      next2 = bumpRel(next2, kind, id, delta, pers);
      commit(recordHistory(next2), pers);
    },
    [commit, recordHistory],
  );

  /* ── 투자 일일 평가잔액 ── */
  const recordSnapshot = useCallback(
    async (input: {
      accountId: string;
      date: string;
      endBalance: number;
      deposit: number;
      withdrawal: number;
      memo?: string;
      fromId?: string;
      fromKind?: "account" | "cash";
    }) => {
      const d = ref.current;
      if (!d) return;
      const acc = d.accounts.find((a) => a.id === input.accountId);
      if (!acc) throw new Error("계좌를 찾을 수 없습니다.");
      if (input.endBalance < 0 || input.deposit < 0 || input.withdrawal < 0)
        throw new Error("잔액과 입출금은 음수일 수 없습니다.");
      if ((input.deposit > 0 || input.withdrawal > 0) && !input.fromId)
        throw new Error("입출금 자금이 이동할 계좌 또는 현금을 선택하세요.");
      if (input.fromId && input.fromKind === undefined)
        throw new Error("자금 이동 자산 유형을 확인할 수 없습니다.");
      if (input.fromId && input.fromKind === "account" && input.fromId === input.accountId)
        throw new Error("투자 계좌 자신을 자금 이동 대상으로 선택할 수 없습니다.");

      const previousSnapshot = d.invSnapshots
        .filter((s) => s.accountId === input.accountId && s.date < input.date)
        .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const previousBalance = previousSnapshot?.endBalance ?? acc.openingBalance;
      if (input.withdrawal > previousBalance + input.deposit + 1e-6)
        throw new Error("이전 평가잔액과 입금액보다 큰 금액을 출금할 수 없습니다.");
      const existing = d.invSnapshots.find(
        (s) => s.accountId === input.accountId && s.date === input.date,
      );
      const snap: InvSnapshot = {
        id: existing?.id ?? uid(),
        accountId: input.accountId,
        date: input.date,
        endBalance: input.endBalance,
        deposit: input.deposit,
        withdrawal: input.withdrawal,
        memo: input.memo,
        createdAt: Date.now(),
      };
      const oldSnapshotTxs = d.transactions.filter((tx) => tx.snapshotId === snap.id);
      let next: Data = {
        ...d,
        invSnapshots: existing
          ? d.invSnapshots.map((s) => (s.id === snap.id ? snap : s))
          : [...d.invSnapshots, snap],
        transactions: d.transactions.filter((tx) => tx.snapshotId !== snap.id),
        accounts: d.accounts.map((a) =>
          a.id === input.accountId ? { ...a, balance: round(input.endBalance, 6) } : a,
        ),
      };
      const pers: Persist = [["invSnapshots", snap]];
      const accRow = next.accounts.find((a) => a.id === input.accountId)!;
      pers.push(["accounts", accRow]);

      // Reverse any earlier flow rows for this same snapshot before replacing them.
      oldSnapshotTxs.forEach((tx) => {
        if (tx.from) next = bumpRel(next, tx.from.kind, tx.from.id, tx.amount, []);
        (tx.legs ?? []).forEach((leg) => {
          next = bumpRel(next, leg.kind, leg.id, -leg.amount, []);
        });
      });
      // The snapshot's ending balance is authoritative, including when an older
      // snapshot is edited and its previously generated flow rows are reversed.
      next = {
        ...next,
        accounts: next.accounts.map((a) =>
          a.id === input.accountId ? { ...a, balance: round(input.endBalance, 6) } : a,
        ),
      };
      const authoritativeAccount = next.accounts.find((a) => a.id === input.accountId)!;
      pers.push(["accounts", authoritativeAccount]);

      if ((input.deposit > 0 || input.withdrawal > 0) && input.fromId) {
        const fromKind = input.fromKind ?? "account";
        const sourceRow =
          fromKind === "account"
            ? next.accounts.find((a) => a.id === input.fromId)
            : next.cashLocations.find((a) => a.id === input.fromId);
        if (!sourceRow) throw new Error("자금 이동 자산을 찾을 수 없습니다.");
        const sourceCurrency = sourceRow.currency;
        const txDate = new Date(`${input.date}T12:00:00`).getTime();
        const sourceFx = rateAtTx(d, sourceCurrency, txDate);
        const investmentFx = rateAtTx(d, acc.currency, txDate);
        const baseFx = rateAtTx(d, d.settings.base, txDate);

        if (input.deposit > 0) {
          const sourceAmount = round(convertAtRates(input.deposit, investmentFx, sourceFx), 6);
          assertBalance(next, fromKind, input.fromId, sourceAmount);
          const tx: Tx = {
            id: uid(), type: "transfer", amount: sourceAmount, currency: sourceCurrency,
            fxRate: sourceFx, amountBase: round((sourceAmount / sourceFx) * baseFx, 6),
            date: txDate, from: { kind: fromKind, id: input.fromId },
            legs: [{
              kind: "account", id: input.accountId, amount: round(input.deposit, 6),
              currency: acc.currency, fxRate: investmentFx,
              amountBase: round((input.deposit / investmentFx) * baseFx, 6),
            }],
            tagIds: [], memo: `${input.date} 투자 입금`, snapshotId: snap.id, createdAt: Date.now(),
          };
          next = { ...next, transactions: [...next.transactions, tx] };
          next = bumpRel(next, fromKind, input.fromId, -sourceAmount, pers);
          pers.push(["transactions", tx]);
        }

        if (input.withdrawal > 0) {
          const destinationAmount = round(convertAtRates(input.withdrawal, investmentFx, sourceFx), 6);
          const tx: Tx = {
            id: uid(), type: "transfer", amount: round(input.withdrawal, 6), currency: acc.currency,
            fxRate: investmentFx, amountBase: round((input.withdrawal / investmentFx) * baseFx, 6),
            date: txDate, from: { kind: "account", id: input.accountId },
            legs: [{
              kind: fromKind, id: input.fromId, amount: destinationAmount,
              currency: sourceCurrency, fxRate: sourceFx,
              amountBase: round((destinationAmount / sourceFx) * baseFx, 6),
            }],
            tagIds: [], memo: `${input.date} 투자 출금`, snapshotId: snap.id, createdAt: Date.now(),
          };
          next = { ...next, transactions: [...next.transactions, tx] };
          // The investment account is already set to the authoritative ending balance above.
          next = bumpRel(next, fromKind, input.fromId, destinationAmount, pers);
          pers.push(["transactions", tx]);
        }
      }

      await Promise.all(oldSnapshotTxs.map((tx) => delRow("transactions", tx.id)));
      commit(recordHistory(next), pers);
    },
    [commit, recordHistory],
  );

  /* ── 카지노 ── */
  const addBuyIn = useCallback(
    async (input: {
      casinoId: string;
      sessionId?: string;
      from: { kind: RelKind; id: string };
      amount: number;
      currency: string;
      chipAmount: number;
      fee: number;
      date: number;
      memo?: string;
      symbol?: string;
    }) => {
      const d = ref.current;
      if (!d) throw new Error("데이터가 준비되지 않았습니다.");
      if (input.amount <= 0 || input.fee < 0) throw new Error("금액 또는 수수료를 확인하세요.");

      let sessionId = input.sessionId;
      const pers: Persist = [];
      let next: Data = d;
      if (!sessionId) {
        const open = next.casinoSessions.find(
          (s) => s.casinoId === input.casinoId && s.status === "ongoing",
        );
        if (open) sessionId = open.id;
      }

      let session = sessionId ? next.casinoSessions.find((s) => s.id === sessionId) : undefined;
      if (sessionId && !session) throw new Error("카지노 세션을 찾을 수 없습니다.");
      if (!session) {
        const sessionFxRate = rateAtTx(d, input.currency, input.date);
        session = {
          id: uid(),
          casinoId: input.casinoId,
          startedAt: input.date,
          status: "ongoing",
          currency: input.currency,
          fxRate: sessionFxRate,
          memo: input.memo,
        };
        sessionId = session.id;
        next = { ...next, casinoSessions: [...next.casinoSessions, session] };
        pers.push(["casinoSessions", session]);
      } else if (session.status !== "ongoing") {
        throw new Error("종료된 세션에는 Buy-in을 추가할 수 없습니다.");
      }

      const sourceRow = input.from.kind === "account"
        ? d.accounts.find((a) => a.id === input.from.id)
        : input.from.kind === "cash"
          ? d.cashLocations.find((a) => a.id === input.from.id)
          : d.cryptoWallets.find((a) => a.id === input.from.id);
      if (!sourceRow) throw new Error("Buy-in 출발 자산을 찾을 수 없습니다.");
      const sourceCurrency = input.from.kind === "crypto" ? "USD" : sourceRow.currency;
      if (sourceCurrency !== input.currency)
        throw new Error("Buy-in 금액 통화가 출발 자산 통화와 다릅니다.");

      const fxRate = rateAtTx(d, input.currency, input.date);
      const sessionFxRate =
        session.fxRate ??
        d.casinoBuyIns.find((b) => b.sessionId === sessionId)?.fxRate ??
        rateAtTx(d, session.currency, session.startedAt);
      const bi: BuyIn = {
        id: uid(),
        sessionId: sessionId!,
        from: input.from,
        amount: round(input.amount, 6),
        currency: input.currency,
        fxRate,
        sessionAmount: round(toSessionCurrency(input.amount, fxRate, sessionFxRate), 6),
        chipAmount: round(input.chipAmount, 6),
        fee: round(input.fee, 6),
        date: input.date,
        memo: input.memo,
      };
      next = { ...next, casinoBuyIns: [...next.casinoBuyIns, bi] };
      pers.push(["casinoBuyIns", bi]);

      // Deduct from the source asset. Crypto Buy-ins are denominated in USD/USDT.
      if (input.from.kind === "crypto") {
        const symbol = input.symbol ?? "USDT";
        next = bumpCrypto(next, input.from.id, symbol, -(input.amount + input.fee), pers);
      } else {
        assertBalance(next, input.from.kind, input.from.id, input.amount + input.fee);
        next = bumpRel(next, input.from.kind, input.from.id, -(input.amount + input.fee), pers);
      }

      commit(recordHistory(next), pers);
      return sessionId!;
    },
    [commit, recordHistory],
  );

  const addCashOut = useCallback(
    async (input: {
      sessionId: string;
      totalAmount: number;
      currency: string;
      fee: number;
      date: number;
      memo?: string;
      legs: { kind: RelKind; id: string; amount: number }[];
      symbol?: string;
    }) => {
      const d = ref.current;
      if (!d) throw new Error("데이터가 준비되지 않았습니다.");
      const session = d.casinoSessions.find((s) => s.id === input.sessionId);
      if (!session) throw new Error("카지노 세션을 찾을 수 없습니다.");
      if (session.status !== "ongoing") throw new Error("종료된 세션에는 Cash-out을 추가할 수 없습니다.");
      if (input.currency !== session.currency)
        throw new Error("Cash-out 입력 통화는 세션 기준 통화와 같아야 합니다.");
      if (input.totalAmount <= 0 || input.fee < 0 || input.fee > input.totalAmount)
        throw new Error("Cash-out 금액 또는 수수료를 확인하세요.");
      if (input.legs.length === 0) throw new Error("도착지를 추가하세요.");

      const sessionFxRate =
        session.fxRate ??
        d.casinoBuyIns.find((b) => b.sessionId === session.id)?.fxRate ??
        rateAtTx(d, session.currency, session.startedAt);
      const cashOutFxRate = rateAtTx(d, input.currency, input.date);
      const enrichedLegs = input.legs.map((leg) => {
        if (leg.amount <= 0) throw new Error("도착 금액은 0보다 커야 합니다.");
        const destination = leg.kind === "account"
          ? d.accounts.find((a) => a.id === leg.id)
          : leg.kind === "cash"
            ? d.cashLocations.find((a) => a.id === leg.id)
            : d.cryptoWallets.find((a) => a.id === leg.id);
        if (!destination) throw new Error("Cash-out 도착 자산을 찾을 수 없습니다.");
        const currency = leg.kind === "crypto" ? "USD" : destination.currency;
        const fxRate = rateAtTx(d, currency, input.date);
        return {
          ...leg,
          currency,
          fxRate,
          amount: round(leg.amount, 6),
          amountSession: round(toSessionCurrency(leg.amount, fxRate, sessionFxRate), 6),
        };
      });
      const netSessionAmount = input.totalAmount - input.fee;
      const destinationSessionAmount = enrichedLegs.reduce((sum, leg) => sum + (leg.amountSession ?? 0), 0);
      if (Math.abs(netSessionAmount - destinationSessionAmount) > 0.01)
        throw new Error(
          `도착지 합계(${round(destinationSessionAmount, 6)} ${session.currency})가 실수령액(${round(netSessionAmount, 6)} ${session.currency})과 다릅니다.`,
        );

      const co: CashOut = {
        id: uid(),
        sessionId: input.sessionId,
        totalAmount: round(input.totalAmount, 6),
        currency: input.currency,
        fxRate: cashOutFxRate,
        sessionAmount: round(toSessionCurrency(input.totalAmount, cashOutFxRate, sessionFxRate), 6),
        fee: round(input.fee, 6),
        date: input.date,
        memo: input.memo,
        legs: enrichedLegs,
      };
      const pers: Persist = [["casinoCashOuts", co]];
      let next: Data = { ...d, casinoCashOuts: [...d.casinoCashOuts, co] };
      enrichedLegs.forEach((leg) => {
        if (leg.kind === "crypto")
          next = bumpCrypto(next, leg.id, input.symbol ?? "USDT", leg.amount, pers);
        else next = bumpRel(next, leg.kind, leg.id, leg.amount, pers);
      });
      commit(recordHistory(next), pers);
    },
    [commit, recordHistory],
  );

  const closeSession = useCallback(
    async (id: string, force = false) => {
      const d = ref.current;
      if (!d) return { ok: false };
      const ses = d.casinoSessions.find((s) => s.id === id);
      if (!ses) return { ok: false, message: "세션을 찾을 수 없습니다." };
      const open = casinoSessionTotals(id, d.casinoBuyIns, d.casinoCashOuts).open;
      if (open > 1e-6 && !force)
        return { ok: false, message: `정산되지 않은 금액 ${open} 이 있습니다. Cash-out을 먼저 기록하세요.` };

      const row: Session = { ...ses, status: "closed", endedAt: Date.now() };
      const next = {
        ...d,
        casinoSessions: d.casinoSessions.map((s) => (s.id === id ? row : s)),
      } as Data;
      commit(recordHistory(next), [["casinoSessions", row]]);
      return { ok: true };
    },
    [commit, recordHistory],
  );

  /* ── 프랍 실제 지급 수익 ── */
  const addPropPayout = useCallback(
    async (input: {
      propAccountId: string;
      amount: number;
      currency: string;
      to: { kind: "account" | "cash"; id: string };
      fee: number;
      receivedAt: number;
      memo?: string;
    }) => {
      const d = ref.current;
      if (!d) return;
      const pa = d.propAccounts.find((p) => p.id === input.propAccountId);
      if (!pa) throw new Error("프랍 계정을 찾을 수 없습니다.");
      if (input.amount <= 0) throw new Error("금액은 0보다 커야 합니다.");

      const payout: PropPayout = {
        id: uid(),
        propAccountId: input.propAccountId,
        amount: round(input.amount, 6),
        currency: input.currency,
        fxRate: rateOf(d.settings, input.currency),
        receivedAt: input.receivedAt,
        to: input.to,
        fee: round(input.fee, 6),
        memo: input.memo,
      };

      // 수령 자산 통화 기준으로 입금 (내부 환산)
      const baseAmt = toBase(input.amount, input.currency, d.settings);
      const target =
        input.to.kind === "account"
          ? d.accounts.find((a) => a.id === input.to.id)
          : d.cashLocations.find((c) => c.id === input.to.id);
      if (!target) throw new Error("수령 자산을 찾을 수 없습니다.");
      const credit = baseAmt / rateOf(d.settings, target.currency);

      const tx: Tx = {
        id: uid(),
        type: "income",
        amount: round(credit, 6),
        currency: target.currency,
        fxRate: rateOf(d.settings, target.currency),
        amountBase: round(baseAmt, 6),
        date: input.receivedAt,
        accountId: input.to.kind === "account" ? input.to.id : undefined,
        from: input.to.kind === "cash" ? input.to : undefined,
        categoryId: "in-invest",
        tagIds: [],
        counterparty: pa.firm,
        memo: `${pa.firm} ${pa.alias} 지급${input.memo ? ` · ${input.memo}` : ""}`,
        createdAt: Date.now(),
      };
      // 현금 수령이면 legs 로 기록
      if (input.to.kind === "cash") {
        tx.type = "transfer";
        tx.from = { kind: "account", id: "prop-clearing" };
        tx.legs = [{ kind: "cash", id: input.to.id, amount: round(credit, 6) }];
      }

      const pers: Persist = [
        ["propPayouts", payout],
        ["transactions", tx],
      ];
      let next: Data = {
        ...d,
        propPayouts: [...d.propPayouts, payout],
        transactions: [...d.transactions, tx],
      };

      const accounts = next.accounts.map((a) =>
        a.id === input.to.id ? { ...a, balance: round(a.balance + credit, 6) } : a,
      );
      const cashLocations = next.cashLocations.map((c) =>
        c.id === input.to.id ? { ...c, balance: round(c.balance + credit, 6) } : c,
      );
      const paList = next.propAccounts.map((p) =>
        p.id === input.propAccountId
          ? { ...p, payoutRequested: Math.max(0, round(p.payoutRequested - input.amount, 6)) }
          : p,
      );
      next = { ...next, accounts, cashLocations, propAccounts: paList };
      const accRow = accounts.find((a) => a.id === input.to.id);
      const cashRow = cashLocations.find((c) => c.id === input.to.id);
      const paRow = paList.find((p) => p.id === input.propAccountId)!;
      if (accRow) pers.push(["accounts", accRow]);
      if (cashRow) pers.push(["cashLocations", cashRow]);
      pers.push(["propAccounts", paRow]);

      commit(recordHistory(next), pers);
    },
    [commit, recordHistory],
  );

  /* ── 백업 / 복원 / 초기화 ── */
  const exportJSON = useCallback(() => {
    const d = ref.current;
    if (!d) return "";
    const payload: Record<string, unknown> = {
      meta: {
        app: "JalSalAboSe",
        schemaVersion: 1,
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        counts: Object.fromEntries(
          STORE_LIST.map((s) => [s, ((d as unknown as Record<string, unknown[]>)[s] ?? []).length]),
        ),
      },
    };
    STORE_LIST.forEach((s) => {
      payload[s] = (d as unknown as Record<string, unknown>)[s];
    });
    // 설정(기준 통화·환율·표시 옵션)은 Data.settings 에 있으므로 kv 로 명시 저장
    payload.kv = [{ id: "settings", ...d.settings }];
    return JSON.stringify(payload, null, 2);
  }, []);

  const importJSON = useCallback(
    async (text: string) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("올바른 JSON 파일이 아닙니다.");
      }
      const meta = parsed.meta as { app?: string; schemaVersion?: number } | undefined;
      if (!meta || meta.app !== "JalSalAboSe") throw new Error("잘살아보세 백업 파일이 아닙니다.");
      if (typeof meta.schemaVersion === "number" && meta.schemaVersion > 1)
        throw new Error("이 앱보다 높은 데이터 버전입니다. 앱을 먼저 업그레이드하세요.");

      await clearAll();
      for (const s of STORE_LIST) {
        const rows = parsed[s];
        if (Array.isArray(rows) && rows.length) await putRows(s, rows as { id: string }[]);
      }
      const fresh = Object.fromEntries(
        STORE_LIST.map((s) => [s, []]),
      ) as unknown as Record<StoreName, never[]>;
      const settings = (parsed.kv as Settings[] | undefined)?.[0] ?? DEFAULT_SETTINGS;
      const rebuilt = { ...fresh, settings } as unknown as Data;
      // 전체 재로드
      const rows2 = await Promise.all(STORE_LIST.map((s) => allRows<never>(s)));
      const map = Object.fromEntries(STORE_LIST.map((s, i) => [s, rows2[i]])) as unknown as Record<
        StoreName,
        never[]
      >;
      const merged = { ...(rebuilt as unknown as Record<string, unknown>), ...map } as unknown as Data;
      ref.current = merged;
      setData(merged);
      void settings;
    },
    [],
  );

  const resetAll = useCallback(async () => {
    await clearAll();
    const s = seed();
    await putRows("countries", s.countries);
    await putRows("institutions", s.institutions);
    await putRows("accountTypes", s.accountTypes);
    await putRows("categories", s.categories);
    await putRows("exchangeRates", s.exchangeRates);
    await putRow("kv", s.settings as unknown as { id: string });
    const fresh = { ...(s as unknown as Data), ...emptyTables() } as Data;
    ref.current = fresh;
    setData(fresh);
  }, []);

  /* ── 샘플 데이터 (사용자가 직접 생성 · 삭제 가능) ── */
  const loadSample = useCallback(async () => {
    const d = ref.current;
    if (!d) return;
    const now = Date.now();
    const day = 86400000;
    const acc = (a: Partial<Account> & { id: string; alias: string; currency: string }): Account => ({
      accountTypeId: "checking",
      countryId: "kr",
      openingBalance: 0,
      balance: 0,
      createdAt: now,
      ...a,
    });
    const accounts: Account[] = [
      acc({ id: uid(), alias: "KB 원화", currency: "KRW", accountTypeId: "checking", institutionId: "kb", openingBalance: 12_000_000, balance: 15_400_000 }),
      acc({ id: uid(), alias: "ABA 생활비", currency: "USD", accountTypeId: "checking", countryId: "kh", institutionId: "aba", openingBalance: 3000, balance: 5240 }),
      acc({ id: uid(), alias: "IB 해외선물", currency: "USD", accountTypeId: "futures", countryId: "us", institutionId: "ibkr", openingBalance: 10000, balance: 12480 }),
    ];
    const investId = accounts[2].id;
    const cash: CashLocation[] = [
      { id: uid(), name: "지갑 현금", kind: "wallet", currency: "USD", openingBalance: 300, balance: 800, sortOrder: 1 },
      { id: uid(), name: "집 금고", kind: "safe", currency: "USD", openingBalance: 5000, balance: 6300, sortOrder: 2 },
    ];
    const wallet: Wallet = { id: uid(), name: "SafePal", kind: "hardware", sortOrder: 1 };
    const assets: Asset[] = [
      { id: uid(), walletId: wallet.id, symbol: "BTC", quantity: 0.014 },
      { id: uid(), walletId: wallet.id, symbol: "USDT", quantity: 1480 },
    ];
    const prices: Price[] = [
      { id: "BTC", symbol: "BTC", price: 71400, currency: "USD", source: "manual", fetchedAt: now, isStale: true },
      { id: "USDT", symbol: "USDT", price: 1, currency: "USD", source: "manual", fetchedAt: now, isStale: true },
    ];
    const snaps: InvSnapshot[] = [0, 1, 2, 3, 4].map((i) => ({
      id: uid(),
      accountId: investId,
      date: dayKey(now - (4 - i) * 7 * day),
      endBalance: 10000 + i * 620 + (i % 2) * 180,
      deposit: i === 2 ? 1000 : 0,
      withdrawal: 0,
      createdAt: now,
    }));
    accounts[2] = { ...accounts[2], balance: snaps[snaps.length - 1].endBalance };

    const prop: PropAccount = {
      id: uid(),
      firm: "FTMO",
      alias: "100K Phase2",
      kind: "evaluation",
      nominalSize: 100000,
      opening: 100000,
      balance: 104320,
      target: 10000,
      maxDailyLoss: 5000,
      maxTotalLoss: 10000,
      status: "거래 중",
      fee: 99,
      feeCurrency: "USD",
      payoutRequested: 2150,
      payoutCurrency: "USD",
      createdAt: now,
    };
    const casino: Casino = { id: uid(), name: "나가1", city: "프놈펜", sortOrder: 1 };
    const ses1: Session = { id: uid(), casinoId: casino.id, startedAt: now - 6 * day, status: "closed", currency: "USD", endedAt: now - 6 * day + 4 * 3600000 };
    const bi1: BuyIn = { id: uid(), sessionId: ses1.id, from: { kind: "account", id: accounts[1].id }, amount: 2000, currency: "USD", fxRate: 1, chipAmount: 2000, fee: 0, date: now - 6 * day };
    const bi2: BuyIn = { id: uid(), sessionId: ses1.id, from: { kind: "cash", id: cash[0].id }, amount: 500, currency: "USD", fxRate: 1, chipAmount: 500, fee: 0, date: now - 6 * day + 600000 };
    const co1: CashOut = { id: uid(), sessionId: ses1.id, totalAmount: 3000, currency: "USD", fxRate: 1, fee: 0, date: now - 6 * day + 4 * 3600000, legs: [{ kind: "account", id: accounts[1].id, amount: 2000 }, { kind: "cash", id: cash[1].id, amount: 1000 }] };

    accounts[1] = { ...accounts[1], balance: accounts[1].balance - 2000 + 2000 };
    cash[0] = { ...cash[0], balance: cash[0].balance - 500 };
    cash[1] = { ...cash[1], balance: cash[1].balance + 1000 };

    // 거래 14건 — 실제 잔액과 정합되도록 생성 (장부가 항상 맞물려 있게)
    const cats = d.categories;
    const txs: Tx[] = [];
    const deltas = [0, 0]; // accounts[0] KRW, accounts[1] USD
    for (let i = 0; i < 14; i++) {
      const isIncome = i % 3 === 0;
      const date = now - i * 4 * day;
      const accIdx = isIncome ? i % 2 : 1; // 지출은 생활비(USD) 계좌에서
      const a = accounts[accIdx];
      const amount = isIncome ? (a.currency === "KRW" ? 1_200_000 : 850) : 18 + (i % 5) * 12;
      const catList = cats.filter((c) => c.kind === (isIncome ? "income" : "expense"));
      const category = catList[i % catList.length];
      deltas[accIdx] += isIncome ? amount : -amount;
      txs.push({
        id: uid(),
        type: isIncome ? "income" : "expense",
        amount,
        currency: a.currency,
        fxRate: rateOf(d.settings, a.currency),
        amountBase: toBase(amount, a.currency, d.settings),
        date,
        accountId: a.id,
        categoryId: category?.id,
        tagIds: [],
        memo: isIncome ? (a.currency === "KRW" ? "월급" : "외화 입금") : `${category?.name ?? "지출"}`,
        createdAt: date,
      });
    }
    accounts[0] = { ...accounts[0], balance: round(accounts[0].balance + deltas[0], 6) };
    accounts[1] = { ...accounts[1], balance: round(accounts[1].balance + deltas[1], 6) };

    const next: Data = {
      ...d,
      accounts,
      cashLocations: cash,
      cryptoWallets: [wallet],
      cryptoAssets: assets,
      cryptoPrices: prices,
      invSnapshots: snaps,
      propAccounts: [prop],
      casinos: [casino],
      casinoSessions: [ses1],
      casinoBuyIns: [bi1, bi2],
      casinoCashOuts: [co1],
      transactions: [...d.transactions, ...txs],
      settings: { ...d.settings, sampleLoaded: true },
      nwHistory: [],
    };
    await clearStore("nwHistory"); // 기존 이력과 섞이지 않도록 초기화
    const withHist = recordHistory({ ...next, nwHistory: [] });
    commit(withHist);
    STORE_LIST.forEach((s) => {
      const rows = (withHist as unknown as Record<string, { id: string }[]>)[s];
      if (Array.isArray(rows) && rows.length) putRows(s, rows).catch(() => undefined);
    });
  }, [commit, recordHistory]);

  const value = useMemo<StoreValue | null>(() => {
    if (!data) return null;
    const nw = computeNetWorth(data);
    return {
      data,
      ready: true,
      error,
      clearError: () => setError(null),
      nw,
      save,
      remove,
      setSettings,
      applyTx,
      setBalance,
      recordSnapshot,
      addBuyIn,
      addCashOut,
      closeSession,
      addPropPayout,
      exportJSON,
      importJSON,
      resetAll,
      loadSample,
    };
  }, [
    data,
    error,
    save,
    remove,
    setSettings,
    applyTx,
    setBalance,
    recordSnapshot,
    addBuyIn,
    addCashOut,
    closeSession,
    addPropPayout,
    exportJSON,
    importJSON,
    resetAll,
    loadSample,
  ]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-rule border-t-brand" />
          <p className="font-mono text-[13px] text-muted">데이터 로딩 중…</p>
          {error && <p className="mt-2 text-[13px] text-stamp">{error}</p>}
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function emptyTables(): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  STORE_LIST.forEach((s) => (o[s] = []));
  return o;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppStoreProvider 가 없습니다.");
  return v;
}
