import { useMemo, useState } from "react";
import { useStore } from "../store/AppStore";
import { amountAtBaseCurrency } from "../domain/finance";
import { Badge, Bars, Btn, Card, CardTitle, Chip, Donut, Empty, Icon, Money, Row, Segmented, Spark } from "../ui/kit";
import {
  fmtAmount,
  fmtDate,
  fmtPct,
  groupBy,
  monthKey,
  round,
  sum,
  toBase,
  tradePnl,
} from "../domain/calc";

type Period = "1m" | "3m" | "6m" | "1y" | "all";

const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: "1m", label: "1개월", days: 30 },
  { value: "3m", label: "3개월", days: 90 },
  { value: "6m", label: "6개월", days: 180 },
  { value: "1y", label: "1년", days: 365 },
  { value: "all", label: "전체", days: 99999 },
];

function fromOf(p: Period) {
  const d = PERIODS.find((x) => x.value === p)!.days;
  return Date.now() - d * 86400000;
}

/* ═══════════ 분석 ═══════════ */
export function AnalysisScreen() {
  const { data, nw } = useStore();
  const [period, setPeriod] = useState<Period>("3m");
  const from = fromOf(period);
  const s = data.settings;
  const txBase = (t: (typeof data.transactions)[number]) => amountAtBaseCurrency(
    t.amount, t.currency, t.fxRate, t.date, s.base, data.exchangeRates, s.rates, t.amountBase, t.baseCurrency,
  );

  const history = useMemo(
    () => data.nwHistory.filter((p) => p.t >= from).map((p) => amountAtBaseCurrency(p.value, p.base, 1, p.t, s.base, data.exchangeRates, s.rates, p.value, p.base)),
    [data.nwHistory, data.exchangeRates, from, s],
  );

  const txs = useMemo(() => data.transactions.filter((t) => t.date >= from), [data.transactions, from]);
  const income = sum(txs.filter((t) => t.type === "income").map((t) => txBase(t)));
  const expense = sum(txs.filter((t) => t.type === "expense").map((t) => txBase(t)));

  const monthBars = useMemo(() => {
    const out: { label: string; a: number; b: number }[] = [];
    const n = period === "1m" ? 4 : period === "3m" ? 6 : period === "6m" ? 6 : 12;
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = monthKey(d.getTime());
      const list = txs.filter((t) => monthKey(t.date) === k);
      out.push({
        label: `${d.getMonth() + 1}월`,
        a: sum(list.filter((t) => t.type === "income").map((t) => txBase(t))),
        b: sum(list.filter((t) => t.type === "expense").map((t) => txBase(t))),
      });
    }
    return out;
  }, [txs, period, data.exchangeRates, s.base, s.rates]);

  const catRows = useMemo(() => {
    const exp = txs.filter((t) => t.type === "expense" && t.categoryId);
    const g = groupBy(exp, (t) => t.categoryId!);
    return Object.entries(g)
      .map(([id, list]) => ({
        label: data.categories.find((c) => c.id === id)?.name ?? "기타",
        value: sum(list.map((t) => txBase(t))),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [txs, data.categories, data.exchangeRates, s.base, s.rates]);

  const composition = useMemo(() => {
    const g = groupBy(nw.rows.filter((r) => r.included), (r) => r.group);
    return Object.entries(g)
      .map(([label, rows]) => ({ label, value: sum(rows.map((r) => r.base)) }))
      .sort((a, b) => b.value - a.value);
  }, [nw.rows]);

  const countryRows = useMemo(() => {
    const map = new Map<string, number>();
    data.accounts
      .filter((a) => !a.archivedAt)
      .forEach((a) => {
        const name = data.countries.find((c) => c.id === a.countryId)?.name ?? "기타";
        map.set(name, (map.get(name) ?? 0) + toBase(a.balance, a.currency, s));
      });
    data.cashLocations.forEach((c) => map.set("현금 · 금고", (map.get("현금 · 금고") ?? 0) + toBase(c.balance, c.currency, s)));
    const cw = data.cryptoAssets.reduce(
      (acc, a) => acc + toBase(a.quantity * (a.manualPrice ?? data.cryptoPrices.find((p) => p.symbol === a.symbol)?.price ?? 0), "USD", s),
      0,
    );
    if (cw) map.set("암호화폐", (map.get("암호화폐") ?? 0) + cw);
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, s]);

  const investRows = useMemo(() => {
    return data.accounts
      .filter((a) => {
        const t = data.accountTypes.find((x) => x.id === a.accountTypeId);
        return t?.group === "invest" && !a.archivedAt;
      })
      .map((a) => {
        const snaps = data.invSnapshots.filter((x) => x.accountId === a.id).sort((x, y) => (x.date < y.date ? -1 : 1));
        let cum = 0;
        let flow = 0;
        let prev = a.openingBalance;
        snaps.forEach((x) => {
          cum += tradePnl(prev, x.endBalance, x.deposit, x.withdrawal);
          flow += x.deposit - x.withdrawal;
          prev = x.endBalance;
        });
        return { a, cum, roi: a.openingBalance + flow !== 0 ? cum / (a.openingBalance + flow) : 0, days: snaps.length };
      });
  }, [data.accounts, data.invSnapshots, data.accountTypes]);

  const casinoRows = useMemo(
    () =>
      data.casinos.map((c) => {
        const ids = new Set(data.casinoSessions.filter((x) => x.casinoId === c.id).map((x) => x.id));
        const ins = sum(data.casinoBuyIns.filter((b) => ids.has(b.sessionId)).map((b) =>
          amountAtBaseCurrency(b.amount + (b.fee || 0), b.currency, b.fxRate, b.date, s.base, data.exchangeRates, s.rates),
        ));
        const outs = sum(data.casinoCashOuts.filter((o) => ids.has(o.sessionId)).map((o) =>
          amountAtBaseCurrency(o.totalAmount - (o.fee || 0), o.currency, o.fxRate, o.date, s.base, data.exchangeRates, s.rates),
        ));
        return { name: c.name, visits: ids.size, pnl: round(outs - ins, 6) };
      }),
    [data.casinos, data.casinoSessions, data.casinoBuyIns, data.casinoCashOuts, data.exchangeRates, s],
  );

  const topTags = useMemo(() => {
    const g = groupBy(
      txs.filter((t) => t.tagIds.length > 0),
      (t) => t.tagIds.join(","),
    );
    return Object.entries(g)
      .map(([ids, list]) => ({
        label: ids.split(",").map((id) => `#${data.tags.find((t) => t.id === id)?.name ?? ""}`).join(" "),
        value: sum(list.map((t) => txBase(t))),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [txs, data.tags, data.exchangeRates, s.base, s.rates]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} size="sm" />
        <span className="font-mono text-[12px] text-muted">
          {fmtDate(from)} ~ {fmtDate(Date.now())}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12.5px] text-muted">순자산</p>
          <p className="mt-1 font-serif text-[24px] font-black text-ink tnum">
            <Money v={nw.total} settings={s} serif />
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-muted">프랍·진행 중 칩 제외</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-muted">기간 수입</p>
          <p className="mt-1 font-serif text-[24px] font-black text-pos tnum">
            <Money v={income} settings={s} serif />
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-muted">{txs.filter((t) => t.type === "income").length}건</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-muted">기간 지출</p>
          <p className="mt-1 font-serif text-[24px] font-black text-warn tnum">
            <Money v={expense} settings={s} serif />
          </p>
          <p className="mt-1 font-mono text-[11.5px] text-muted">{txs.filter((t) => t.type === "expense").length}건</p>
        </Card>
      </div>

      <Card>
        <CardTitle sub="기록된 순자산 이력 · 기준 통화 환산">자산 추이</CardTitle>
        <Spark values={history} height={120} />
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle sub="실제 소유 자산만">자산 구성</CardTitle>
          {composition.length ? <Donut items={composition} /> : <p className="py-6 text-center text-[13.5px] text-muted">데이터 없음</p>}
        </Card>
        <Card>
          <CardTitle sub="계좌 잔액 기준 · 기준 통화 환산">국가별 자산</CardTitle>
          {countryRows.length ? (
            <Donut items={countryRows} />
          ) : (
            <p className="py-6 text-center text-[13.5px] text-muted">데이터 없음</p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle sub="수입(초록) · 지출(주황)">월별 수입 · 지출</CardTitle>
        <Bars data={monthBars} height={150} />
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle sub="지출 카테고리 Top">지출 구성</CardTitle>
          {catRows.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-muted">기간 내 지출이 없습니다.</p>
          ) : (
            catRows.map((c) => {
              const max = Math.max(...catRows.map((x) => x.value)) || 1;
              return (
                <div key={c.label} className="mb-2.5">
                  <div className="mb-1 flex justify-between text-[13.5px]">
                    <span className="text-ink/80">{c.label}</span>
                    <span className="font-mono text-ink tnum">
                      <Money v={c.value} settings={s} />
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#f1f3f5]">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${(c.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })
          )}
          {topTags.length > 0 && (
            <div className="mt-4 border-t border-rule pt-3">
              <p className="mb-2 font-mono text-[11.5px] uppercase text-muted">태그별 지출</p>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map((t) => (
                  <span key={t.label} className="rounded-full bg-[#f6f8fa] px-2.5 py-1 font-mono text-[12px] text-ink/75">
                    {t.label} · <b>{fmtAmount(t.value, s.base)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle sub="입출금을 제외한 실제 매매손익">투자 성과</CardTitle>
          {investRows.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-muted">투자 계좌가 없습니다.</p>
          ) : (
            investRows.map((r) => (
              <Row
                key={r.a.id}
                left={r.a.alias}
                sub={`기록 ${r.days}일 · 수익률 ${fmtPct(r.roi)}`}
                right={
                  <span className={`font-mono text-[15px] font-bold tnum ${r.cum >= 0 ? "text-pos" : "text-warn"}`}>
                    <Money v={r.cum} settings={s} cur={r.a.currency} signed />
                  </span>
                }
              />
            ))
          )}
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle sub="명목 잔액은 순자산이 아닙니다">프랍 성과</CardTitle>
          {data.propAccounts.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-muted">프랍 계정이 없습니다.</p>
          ) : (
            data.propAccounts.map((p) => (
              <Row
                key={p.id}
                left={`${p.firm} · ${p.alias}`}
                sub={`명목 $${p.nominalSize.toLocaleString()} · ${p.status}`}
                right={
                  <div className="text-right">
                    <div className="font-mono text-[14.5px] font-bold text-ink tnum">${p.balance.toLocaleString()}</div>
                    <div className={`font-mono text-[12px] tnum ${p.balance >= p.opening ? "text-pos" : "text-warn"}`}>
                      {fmtPct(p.opening ? (p.balance - p.opening) / p.opening : 0)}
                    </div>
                  </div>
                }
              />
            ))
          )}
          <div className="mt-3 rounded-xl bg-[#fef4e6] px-3 py-2 font-mono text-[11.5px] text-ink/70">
            실제 지급 수익 합계{" "}
            <b>{fmtAmount(sum(data.propPayouts.map((x) => amountAtBaseCurrency(x.amount, x.currency, x.fxRate, x.receivedAt, s.base, data.exchangeRates, s.rates))), s.base)}</b> (수령 계좌에 반영됨)
          </div>
        </Card>

        <Card>
          <CardTitle sub="총 Cash-out − 총 Buy-in">카지노 손익</CardTitle>
          {casinoRows.length === 0 ? (
            <p className="py-6 text-center text-[13.5px] text-muted">카지노 기록이 없습니다.</p>
          ) : (
            casinoRows.map((c) => (
              <Row
                key={c.name}
                left={c.name}
                sub={`방문 ${c.visits}회`}
                right={
                  <span className={`font-mono text-[15px] font-bold tnum ${c.pnl >= 0 ? "text-pos" : "text-warn"}`}>
                    <Money v={c.pnl} settings={s} signed />
                  </span>
                }
              />
            ))
          )}
        </Card>
      </div>

      {txs.length === 0 && data.nwHistory.length < 2 && (
        <Empty
          title="분석할 데이터가 부족합니다"
          desc="거래와 자산 기록이 쌓이면 기간별 통계와 구성비가 표시됩니다. 설정에서 샘플 데이터로 먼저 화면을 확인할 수 있습니다."
          action={<Btn onClick={() => (window.location.hash = "/settings")}>설정으로 이동</Btn>}
        />
      )}
    </div>
  );
}

/* ═══════════ AI 분석 프롬프트 ═══════════ */
type Kind = "asset" | "cashflow" | "invest" | "domestic" | "overseas" | "prop" | "crypto" | "casino" | "total";

const KINDS: { value: Kind; label: string }[] = [
  { value: "total", label: "종합 재무 분석" },
  { value: "asset", label: "전체 자산 분석" },
  { value: "cashflow", label: "수입 · 지출 분석" },
  { value: "invest", label: "투자 성과 분석" },
  { value: "domestic", label: "한국 증권사 성과" },
  { value: "overseas", label: "해외 브로커 성과" },
  { value: "prop", label: "프랍 트레이딩 성과" },
  { value: "crypto", label: "암호화폐 보유 현황" },
  { value: "casino", label: "카지노 손익 분석" },
];

const DATASETS = [
  { key: "asset", label: "자산 추이 · 구성" },
  { key: "cashflow", label: "수입 · 지출" },
  { key: "invest", label: "투자 성과" },
  { key: "prop", label: "프랍 성과" },
  { key: "crypto", label: "암호화폐 보유" },
  { key: "casino", label: "카지노 손익" },
] as const;

export function AIScreen() {
  const { data, nw } = useStore();
  const s = data.settings;
  const txBase = (t: (typeof data.transactions)[number]) => amountAtBaseCurrency(
    t.amount, t.currency, t.fxRate, t.date, s.base, data.exchangeRates, s.rates, t.amountBase, t.baseCurrency,
  );
  const [kind, setKind] = useState<Kind>("total");
  const [days, setDays] = useState<Period>("3m");
  const [picked, setPicked] = useState<string[]>(DATASETS.map((d) => d.key));
  const [mask, setMask] = useState(true);
  const [copied, setCopied] = useState(false);
  const from = fromOf(days);

  const label = (alias: string, cur: string) => (mask ? `계좌(원장#${alias.length % 97}, ${cur})` : `${alias} (${cur})`);
  const casinoName = (n: string, i: number) => (mask ? `카지노${i + 1}` : n);

  const prompt = useMemo(() => {
    const cur = s.base;
    const fmt = (v: number) => fmtAmount(v, cur);
    const L: string[] = [];
    L.push(`[잘살아보세(JalSalAboSe) AI 분석 요청]`);
    L.push(`분석 종류: ${KINDS.find((k) => k.value === kind)!.label}`);
    L.push(`분석 기간: ${fmtDate(from)} ~ ${fmtDate(Date.now())}`);
    L.push(`기준 통화: ${cur} · 환율(수동): ${Object.entries(s.rates)
      .filter(([k]) => k !== "USD")
      .map(([k, v]) => `1 USD = ${v.toLocaleString("ko-KR")} ${k}`)
      .join(", ") || "USD 고정"}`);
    L.push(`데이터 출처: 사용자가 직접 기록한 로컬 장부 (추정치·외부 전망 없음)`);
    L.push(`민감정보 마스킹: ${mask ? "켜짐 (계좌 별칭·카지노명 제거)" : "꺼짐"}`);
    L.push("");

    if (picked.includes("asset")) {
      L.push(`## 1. 순자산 (실제 소유 자산만)`);
      L.push(`- 총 순자산: ${fmt(nw.total)}  (시작 잔액 합계 ${fmt(nw.opening)} 대비 ${fmt(nw.total - nw.opening)})`);
      L.push(
        `- 구성: 은행·일반 ${fmt(nw.bank)} / 현금·금고 ${fmt(nw.cash)} / 투자 ${fmt(nw.invest)} / 암호화폐 ${fmt(nw.crypto)}`,
      );
      const ex = nw.excluded.filter((r) => r.base > 0);
      L.push(
        `- 순자산에서 제외한 항목: ${
          ex.length ? ex.map((r) => `${r.label} ${fmt(r.base)} (${r.reason})`).join(", ") : "없음"
        }`,
      );
      L.push(`- 계좌 목록:`);
      nw.rows
        .filter((r) => r.included)
        .forEach((r) => L.push(`  · ${label(r.label, r.currency)}: ${fmtAmount(r.amount, r.currency)} → ${fmt(r.base)}`));
      L.push("");
    }

    if (picked.includes("cashflow")) {
      const txs = data.transactions.filter((t) => t.date >= from);
      const inc = sum(txs.filter((t) => t.type === "income").map((t) => txBase(t)));
      const exp = sum(txs.filter((t) => t.type === "expense").map((t) => txBase(t)));
      L.push(`## 2. 수입 · 지출`);
      L.push(`- 수입 ${fmt(inc)} (${txs.filter((t) => t.type === "income").length}건) / 지출 ${fmt(exp)} (${txs.filter((t) => t.type === "expense").length}건) / 잡금 ${fmt(inc - exp)}`);
      const g = groupBy(txs.filter((t) => t.type === "expense" && t.categoryId), (t) => t.categoryId!);
      const rows = Object.entries(g)
        .map(([id, list]) => ({ n: data.categories.find((c) => c.id === id)?.name ?? "기타", v: sum(list.map((t) => txBase(t))) }))
        .sort((a, b) => b.v - a.v);
      if (rows.length) L.push(`- 지출 카테고리: ${rows.map((r) => `${r.n} ${fmt(r.v)}`).join(", ")}`);
      else L.push(`- 지출 카테고리: 데이터 부족`);
      L.push(`- 내부 이체 ${txs.filter((t) => t.type === "transfer").length}건 (수입/지출로 집계하지 않음)`);
      L.push("");
    }

    if (picked.includes("invest")) {
      L.push(`## 3. 투자 성과 (입출금 제외 실제 매매손익)`);
      const list = data.accounts.filter((a) => data.accountTypes.find((t) => t.id === a.accountTypeId)?.group === "invest");
      if (list.length === 0) L.push(`- 데이터 부족: 투자 계좌 없음`);
      list.forEach((a) => {
        const snaps = data.invSnapshots.filter((x) => x.accountId === a.id).sort((x, y) => (x.date < y.date ? -1 : 1));
        let cum = 0, flow = 0, prev = a.openingBalance;
        snaps.forEach((x) => { cum += tradePnl(prev, x.endBalance, x.deposit, x.withdrawal); flow += x.deposit - x.withdrawal; prev = x.endBalance; });
        const roi = a.openingBalance + flow !== 0 ? cum / (a.openingBalance + flow) : 0;
        L.push(`- ${label(a.alias, a.currency)}: 시작 ${fmtAmount(a.openingBalance, a.currency)}, 현재 ${fmtAmount(a.balance, a.currency)}, 누적 매매손익 ${fmtAmount(cum, a.currency)} (${fmtPct(roi)}), 기록 ${snaps.length}일`);
      });
      L.push("");
    }

    if (picked.includes("prop")) {
      L.push(`## 4. 프랍 트레이딩 (명목 계정은 자산이 아님)`);
      if (data.propAccounts.length === 0) L.push(`- 데이터 부족: 프랍 계정 없음`);
      data.propAccounts.forEach((p) => {
        L.push(`- ${p.firm} ${p.alias}: 명목 $${p.nominalSize.toLocaleString()}, 평가잔액 $${p.balance.toLocaleString()} (${fmtPct(p.opening ? (p.balance - p.opening) / p.opening : 0)}), 상태 ${p.status}, 목표 $${(p.target ?? 0).toLocaleString()}, 일한 최대 손실 한도 $${(p.maxDailyLoss ?? 0).toLocaleString()}`);
      });
      const paid = sum(data.propPayouts.filter((p) => p.receivedAt >= from).map((p) =>
        amountAtBaseCurrency(p.amount, p.currency, p.fxRate, p.receivedAt, s.base, data.exchangeRates, s.rates),
      ));
      L.push(`- 기간 내 실제 지급받은 수익: ${fmt(paid)} (이것만 실제 자산에 반영됨)`);
      L.push(`- 미수령 가능 금액: ${fmt(sum(data.propAccounts.map((p) => p.payoutRequested)))} (순자산에서 제외)`);
      L.push("");
    }

    if (picked.includes("crypto")) {
      L.push(`## 5. 암호화폐 보유`);
      if (data.cryptoAssets.length === 0) L.push(`- 데이터 부족: 보유 코인 없음`);
      data.cryptoWallets.forEach((w) => {
        const as = data.cryptoAssets.filter((a) => a.walletId === w.id);
        if (!as.length) return;
        L.push(`- ${w.name} (${w.kind}): ${as.map((a) => `${a.symbol} ${a.quantity}`).join(", ")}`);
      });
      L.push(`- 평가액 합계: ${fmt(nw.crypto)} · 시세 출처: ${
        data.cryptoPrices.some((p) => p.source === "api") ? "외부 API" : "수동 입력"
      }`);
      L.push("");
    }

    if (picked.includes("casino")) {
      L.push(`## 6. 카지노 손익 (총 Cash-out − 총 Buy-in)`);
      if (data.casinos.length === 0) L.push(`- 데이터 부족: 카지노 기록 없음`);
      data.casinos.forEach((c, i) => {
        const ids = new Set(data.casinoSessions.filter((x) => x.casinoId === c.id).map((x) => x.id));
        const bi = sum(data.casinoBuyIns.filter((b) => ids.has(b.sessionId)).map((b) =>
          amountAtBaseCurrency(b.amount + (b.fee || 0), b.currency, b.fxRate, b.date, s.base, data.exchangeRates, s.rates),
        ));
        const co = sum(data.casinoCashOuts.filter((o) => ids.has(o.sessionId)).map((o) =>
          amountAtBaseCurrency(o.totalAmount - (o.fee || 0), o.currency, o.fxRate, o.date, s.base, data.exchangeRates, s.rates),
        ));
        L.push(`- ${casinoName(c.name, i)}: 방문 ${ids.size}회, Buy-in ${fmt(bi)}, Cash-out ${fmt(co)}, 손익 ${fmt(co - bi)}`);
      });
      const ongoing = data.casinoSessions.filter((x) => x.status === "ongoing").length;
      L.push(`- 진행 중 세션: ${ongoing}건 (미정산이므로 순자산에서 제외)`);
      L.push("");
    }

    L.push(`[분석 지시사항]`);
    L.push(`1. 위에 제공된 수치만 근거로 분석할 것. 없는 정보는 추측하지 말 것.`);
    L.push(`2. 표본이 부족하면 "데이터 부족: <항목>" 형태로 명시하고, 그 항목은 분석하지 말 것.`);
    L.push(`3. 모든 수치에 통화와 기간을 함께 적을 것.`);
    L.push(`4. 투자 원금(입출금)과 실제 매매손익을 구분해서 설명할 것.`);
    L.push(`5. 프랍 명목 계정 잔액을 개인 자산으로 취급하지 말 것.`);
    L.push(`6. 한국식 표기(예: 2026. 3. 12.)와 한국어로 답할 것.`);
    return L.join("\n");
  }, [kind, days, picked, mask, data, nw, s, from]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const lines = prompt.split("\n").length;
  const words = prompt.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle sub="외부 AI API 연결 없이 동작합니다 — 생성된 프롬프트를 GPT·Claude·Gemini에 붙여넣으세요">
          분석 종류
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
              {k.label}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle>분석 기간</CardTitle>
          <Segmented value={days} onChange={setDays} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} size="sm" />
          <p className="mt-2.5 font-mono text-[12.5px] text-muted">
            {fmtDate(from)} ~ {fmtDate(Date.now())}
          </p>
        </Card>
        <Card>
          <CardTitle>포함할 데이터</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {DATASETS.map((d) => {
              const on = picked.includes(d.key);
              return (
                <Chip
                  key={d.key}
                  active={on}
                  onClick={() => setPicked(on ? picked.filter((x) => x !== d.key) : [...picked, d.key])}
                >
                  {d.label}
                </Chip>
              );
            })}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[14px] text-ink/80">
            <input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} className="h-4 w-4 accent-[#3182F6]" />
            민감정보 마스킹 (계좌 별칭 · 카지노명)
          </label>
        </Card>
      </div>

      <Card>
        <CardTitle
          sub={`${lines}줄 · ${words.toLocaleString()}자 · 기준 통화 ${s.base}`}
          right={
            <div className="flex gap-2">
              <Btn size="sm" variant="outline" onClick={() => setKind("total")}>
                종합으로
              </Btn>
              <Btn size="sm" onClick={copy}>
                <Icon name="copy" className="h-4 w-4" /> {copied ? "복사됨" : "전체 복사"}
              </Btn>
            </div>
          }
        >
          프롬프트 미리보기
        </CardTitle>
        <pre className="max-h-[420px] overflow-auto rounded-xl border border-rule bg-[#f6f8fa] px-4 py-3.5 font-mono text-[12.5px] leading-[1.75] whitespace-pre-wrap text-ink/85">
          {prompt}
        </pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="green">실제 기록 데이터만</Badge>
          <Badge tone="blue">부족하면 추측 금지 지시 포함</Badge>
          {mask && <Badge tone="amber">민감정보 마스킹</Badge>}
        </div>
      </Card>

      <Card>
        <CardTitle sub="저장된 데이터가 부족하면 프롬프트에 그대로 표시됩니다">데이터 상태</CardTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { l: "계좌", v: data.accounts.length },
            { l: "거래", v: data.transactions.length },
            { l: "투자 스냅샷", v: data.invSnapshots.length },
            { l: "카지노 세션", v: data.casinoSessions.length },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-[#f6f8fa] px-3 py-2.5 text-center">
              <p className="font-mono text-[19px] font-bold text-ink tnum">{x.v}</p>
              <p className="text-[11.5px] text-muted">{x.l}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
