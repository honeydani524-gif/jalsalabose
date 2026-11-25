/* ────────────────────────────────────────────────────────────
   src/domain/calc.ts — 순수 계산 함수 (L3)
   시간·네트워크·DB에 의존하지 않는다. UI/서비스에서만 호출한다.
   ──────────────────────────────────────────────────────────── */

export type Cur = "USD" | "KRW" | "KHR" | string;

export type Settings = {
  base: Cur;
  rates: Record<string, number>; // 1 USD = x  (rate[USD] ≡ 1)
  mask: boolean; // 금액 숨김
  autoPrice: boolean; // 시세 자동 동기화
  sampleLoaded: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  base: "USD",
  rates: { USD: 1, KRW: 1385, KHR: 4050 },
  mask: false,
  autoPrice: true,
  sampleLoaded: false,
};

export const CUR_LIST = ["USD", "KRW", "KHR"];
export const CUR_SYMBOL: Record<string, string> = { USD: "$", KRW: "₩", KHR: "៛" };

export function rateOf(s: Settings, cur: string): number {
  if (!cur || cur === "USD") return 1;
  const r = s.rates[cur];
  return typeof r === "number" && r > 0 ? r : 1;
}

/** 통화 cur 의 금액을 기준 통화로 환산 */
export function toBase(amount: number, cur: string, s: Settings): number {
  return (amount / rateOf(s, cur)) * rateOf(s, s.base);
}

/** 기준 통화 금액을 cur 로 환산 */
export function fromBase(amount: number, cur: string, s: Settings): number {
  return (amount / rateOf(s, s.base)) * rateOf(s, cur);
}

export function round(v: number, digits = 8): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("ko-KR", { minimumFractionDigits: min, maximumFractionDigits: max });

const n0 = nf(0, 0);
const n2 = nf(2, 2);

export function fmtAmount(v: number, cur: string): string {
  const sym = CUR_SYMBOL[cur] ?? `${cur} `;
  const abs = Math.abs(v);
  const body = cur === "USD" ? n2.format(abs) : n0.format(abs);
  return `${v < 0 ? "−" : ""}${sym}${body}`;
}

export function fmtBase(v: number, s: Settings): string {
  return fmtAmount(v, s.base);
}

export function fmtSigned(v: number, s: Settings): string {
  const sign = v > 0.0049 ? "+" : v < -0.0049 ? "−" : "";
  return sign + fmtAmount(Math.abs(v), s.base);
}

export function fmtPct(v: number): string {
  if (!isFinite(v)) return "—";
  return `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(2)}%`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

export function fmtDateShort(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDateTime(ts: number): string {
  return `${fmtDate(ts)} ${fmtTime(ts)}`;
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
export function fmtDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

/** 로컬 날짜 키 — 시간대 경계로 어긋나지 않도록 로컬 기준 */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}. ${Number(m)}.`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* ── 투자: 입출금과 실제 매매손익 분리 ───────────────────── */
export function tradePnl(prev: number, end: number, deposit: number, withdrawal: number): number {
  return round(end - prev - deposit + withdrawal, 6);
}

export function roi(cumPnl: number, opening: number, netFlow: number): number {
  const denom = opening + netFlow;
  if (denom === 0) return 0;
  return cumPnl / denom;
}

/* ── 카지노: 총 Cash-out − 총 Buy-in ─────────────────────── */
export function sessionPnl(totalCashOut: number, totalBuyIn: number): number {
  return round(totalCashOut - totalBuyIn, 6);
}

/* ── 유틸 ───────────────────────────────────────────────── */
export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function groupBy<T, K extends string>(arr: T[], key: (v: T) => K): Record<K, T[]> {
  return arr.reduce((acc, v) => {
    const k = key(v);
    (acc[k] ||= []).push(v);
    return acc;
  }, {} as Record<K, T[]>);
}

export function pctChange(now: number, before: number): number {
  if (before === 0) return 0;
  return (now - before) / Math.abs(before);
}

/** 최근 n일 날짜 키 배열 (오늘 포함, 오래된 것부터) */
export function lastDays(n: number, from = Date.now()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(from - i * 86400000));
  return out;
}

export function maskValue(v: string): string {
  return v.replace(/[0-9]{4,}/g, (m) => "*".repeat(m.length));
}
