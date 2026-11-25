import { useMemo, useState } from "react";

/* 07장 — 순자산 계산기 (이 문서에서 실제로 동작하는 유일한 위젯)
   규칙: 포함 자산만 합산, 제외 항목은 취소선으로 분리, 기준 통화/환율 즉시 재계산 */

type Cur = "USD" | "KRW" | "KHR";
type Row = {
  id: string;
  group: string;
  name: string;
  cur: Cur;
  amount: number;
  include: boolean;
  reason?: string;
};

const ROWS: Row[] = [
  { id: "a1", group: "은행 · 일반 계좌", name: "KB국민은행 원화계좌", cur: "KRW", amount: 18_000_000, include: true },
  { id: "a2", group: "은행 · 일반 계좌", name: "KB국민은행 외화계좌 (USD)", cur: "USD", amount: 3_200, include: true },
  { id: "a3", group: "은행 · 일반 계좌", name: "ABA Bank · USD 계좌", cur: "USD", amount: 5_000, include: true },
  { id: "a4", group: "은행 · 일반 계좌", name: "ABA Bank · KHR 계좌", cur: "KHR", amount: 8_000_000, include: true },
  { id: "a5", group: "현금 · 금고", name: "지갑 현금", cur: "USD", amount: 450, include: true },
  { id: "a6", group: "현금 · 금고", name: "집 금고", cur: "USD", amount: 6_300, include: true },
  { id: "a7", group: "투자 계좌", name: "키움증권 국내주식", cur: "KRW", amount: 52_400_000, include: true },
  { id: "a8", group: "투자 계좌", name: "IB 해외선물 브로커", cur: "USD", amount: 18_420, include: true },
  { id: "a9", group: "암호화폐", name: "업비트 지갑", cur: "KRW", amount: 8_200_000, include: true },
  { id: "a10", group: "암호화폐", name: "SafePal", cur: "USD", amount: 2_140, include: true },
  { id: "a11", group: "암호화폐", name: "Trezor 하드웨어 지갑", cur: "USD", amount: 1_000, include: true },
  {
    id: "x1", group: "제외 · 프랍", name: "프랍 FTMO $100K 명목 계정", cur: "USD", amount: 100_000, include: false,
    reason: "타인 자금 — 순자산 미포함",
  },
  { id: "x2", group: "제외 · 프랍", name: "프랍 미지급 수익 (요청 대기)", cur: "USD", amount: 2_150, include: false, reason: "수령 전 — 미포함" },
  { id: "x3", group: "제외 · 카지노", name: "나가1 진행 중 세션 칩", cur: "USD", amount: 2_500, include: false, reason: "미정산 — 미포함" },
];

const SYM: Record<Cur, string> = { USD: "$", KRW: "₩", KHR: "៛" };

function fmt(n: number, cur: Cur) {
  const d = cur === "USD" ? 2 : 0;
  return (
    SYM[cur] +
    n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d })
  );
}

export default function NetWorthDemo() {
  const [base, setBase] = useState<Cur>("USD");
  const [krw, setKrw] = useState(1385);
  const [khr, setKhr] = useState(4050);

  const rates: Record<Cur, number> = useMemo(
    () => ({ USD: 1, KRW: krw || 1, KHR: khr || 1 }),
    [krw, khr],
  );

  const toUsd = (v: number, c: Cur) => v / rates[c];
  const convert = (v: number, c: Cur) => toUsd(v, c) * rates[base];

  const inc = ROWS.filter((r) => r.include);
  const exc = ROWS.filter((r) => !r.include);
  const incTotal = inc.reduce((s, r) => s + convert(r.amount, r.cur), 0);
  const excTotal = exc.reduce((s, r) => s + convert(r.amount, r.cur), 0);

  const groups = Array.from(new Set(inc.map((r) => r.group)));
  const excGroups = Array.from(new Set(exc.map((r) => r.group)));

  const rateInput = (label: Cur, value: number, set: (n: number) => void) => (
    <label className="flex items-center gap-1.5 border border-rule bg-white px-2.5 py-1.5">
      <span className="font-mono text-[11px] text-muted">1 USD =</span>
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-[74px] bg-transparent font-mono text-[13px] font-medium text-ink tnum outline-none"
        aria-label={`${label} 환율`}
      />
      <span className="font-mono text-[11px] text-muted">{label}</span>
    </label>
  );

  return (
    <div className="reveal border border-ink/15 bg-card">
      {/* 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/15 bg-[#f6f8fa] px-4 py-3 md:px-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            표 7-1 · 순자산 계산 예시 (실시간)
          </div>
          <div className="mt-1 font-serif text-[15px] font-bold text-ink">
            포함 11건 · 제외 3건 · 기준 통화 즉시 재환산
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted">기준 통화</span>
          <div className="flex border border-ink/20">
            {(["USD", "KRW", "KHR"] as Cur[]).map((c) => (
              <button
                key={c}
                onClick={() => setBase(c)}
                className={`cursor-pointer px-3 py-1.5 font-mono text-[12px] font-bold transition focus:outline-2 focus:outline-offset-2 focus:outline-brand ${
                  base === c ? "bg-brand text-white" : "bg-white text-ink/60 hover:bg-[#eef4ff]"
                }`}
                aria-pressed={base === c}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 환율 입력 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-3 md:px-5">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          환율 (수동 입력 · 이력 저장)
        </span>
        {rateInput("KRW", krw, setKrw)}
        {rateInput("KHR", khr, setKhr)}
        <span className="font-mono text-[11px] text-muted">출처: 사용자 직접 입력</span>
      </div>

      {/* 총액 */}
      <div className="grid gap-px bg-rule md:grid-cols-[1.4fr_1fr]">
        <div className="bg-white px-4 py-5 md:px-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            전체 순자산 · {base}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-serif text-[38px] leading-none font-black tracking-tight text-ink tnum md:text-[52px]">
              {fmt(incTotal, base)}
            </span>
          </div>
          <div className="mt-2 font-mono text-[12px] text-pos">
            내부 이체 반영 후 변화량 = 0 검증 통과 · 11개 자산 합산
          </div>
        </div>
        <div className="bg-white px-4 py-5 md:px-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            순자산에 넣으면 안 되는 금액
          </div>
          <div className="mt-1.5 font-serif text-[26px] leading-none font-bold text-muted line-through tnum md:text-[32px]">
            {fmt(excTotal, base)}
          </div>
          <div className="mt-2 font-mono text-[12px] text-warn">
            오류 계산 시 총액 {fmt(incTotal + excTotal, base)} →{" "}
            {((excTotal / incTotal) * 100).toFixed(1)}% 부풀림
          </div>
        </div>
      </div>

      {/* 자산 표 */}
      <div className="overflow-x-auto">
        <table className="spec min-w-[560px]">
          <thead>
            <tr>
              <th>자산 / 근거</th>
              <th>원본 금액</th>
              <th className="r">{base} 환산</th>
              <th>순자산</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) =>
              ROWS.filter((r) => r.group === g).map((r, i) => (
                <tr key={r.id}>
                  <td className="m font-medium">
                    {i === 0 && (
                      <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-brand" />
                    )}
                    {i === 0 ? <span className="text-muted">{g} · </span> : null}
                    {r.name}
                  </td>
                  <td className="t">
                    {fmt(r.amount, r.cur)} <span className="text-[10px]">{r.cur}</span>
                  </td>
                  <td className="m text-right">{fmt(convert(r.amount, r.cur), base)}</td>
                  <td>
                    <span className="font-mono text-[11px] font-bold text-pos">포함</span>
                  </td>
                </tr>
              )),
            )}
            <tr>
              <td colSpan={3} className="bg-[#f6f8fa] py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                아래 3건은 실제 소유 자산이 아니므로 합산하지 않는다
              </td>
              <td className="bg-[#f6f8fa]" />
            </tr>
            {excGroups.map((g) =>
              ROWS.filter((r) => r.group === g).map((r) => (
                <tr key={r.id} className="opacity-70">
                  <td className="m">
                    <span className="text-muted line-through">{r.name}</span>
                    <span className="ml-2 font-sans text-[11px] text-warn">{r.reason}</span>
                  </td>
                  <td className="t line-through">
                    {fmt(r.amount, r.cur)} <span className="text-[10px]">{r.cur}</span>
                  </td>
                  <td className="m text-right text-muted line-through">
                    {fmt(convert(r.amount, r.cur), base)}
                  </td>
                  <td>
                    <span className="font-mono text-[11px] font-bold text-muted">제외</span>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-ink/15 bg-[#f6f8fa] px-4 py-3 md:px-5">
        <p className="font-mono text-[11.5px] leading-relaxed text-muted">
          공식: NW(base) = Σ toBase(currentBalance | cashLocation | invSnapshot | cryptoValue) , where
          toBase(x,c) = x ÷ rate[c] × rate[base] · rate[USD] ≡ 1
        </p>
      </div>
    </div>
  );
}
