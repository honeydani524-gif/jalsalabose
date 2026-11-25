import { useMemo } from "react";
import { useStore } from "../store/AppStore";
import { useQuick } from "../ui/quick";
import { Badge, Btn, Card, CardTitle, Donut, Empty, Icon, Money, Row, Spark, Bars } from "../ui/kit";
import {
  fmtAmount,
  fmtDate,
  fmtDay,
  fmtPct,
  fmtSigned,
  groupBy,
  monthKey,
  monthLabel,
  pctChange,
  rateOf,
  sum,
} from "../domain/calc";

export default function HomeScreen() {
  const { data, nw } = useStore();
  const quick = useQuick();
  const s = data.settings;

  const history = useMemo(
    () =>
      data.nwHistory.map((p) => ({
        ...p,
        v: (p.value / rateOf(s, p.base)) * rateOf(s, s.base),
      })),
    [data.nwHistory, s],
  );

  const thisMonth = monthKey(Date.now());
  const monthTx = data.transactions.filter((t) => monthKey(t.date) === thisMonth);
  const income = sum(monthTx.filter((t) => t.type === "income").map((t) => t.amountBase));
  const expense = sum(monthTx.filter((t) => t.type === "expense").map((t) => t.amountBase));

  const months = useMemo(() => {
    const out: { label: string; a: number; b: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = monthKey(d.getTime());
      const list = data.transactions.filter((t) => monthKey(t.date) === k);
      out.push({
        label: `${d.getMonth() + 1}월`,
        a: sum(list.filter((t) => t.type === "income").map((t) => t.amountBase)),
        b: sum(list.filter((t) => t.type === "expense").map((t) => t.amountBase)),
      });
    }
    return out;
  }, [data.transactions]);

  const recent = [...data.transactions].sort((a, b) => b.date - a.date).slice(0, 8);

  const change = nw.total - nw.opening;
  const changePct = pctChange(nw.total, nw.opening);

  /* 전일 대비: 오늘 00:00 이전 마지막 기록과 비교 */
  const dayDelta = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const prev = data.nwHistory.filter((p) => p.t < todayStart.getTime());
    if (prev.length === 0) return null;
    const p = prev[prev.length - 1];
    return (nw.total - p.value / rateOf(s, p.base) * rateOf(s, s.base));
  }, [data.nwHistory, nw.total, s]);

  /* 자산 요약 */
  const cashWallet = sum(
    data.cashLocations.filter((c) => c.kind === "wallet").map((c) => nw.rows.find((r) => r.id === c.id)?.base ?? 0),
  );
  const cashSafe = nw.cash - cashWallet;
  const propNominal = sum(data.propAccounts.map((p) => p.nominalSize));
  const propUnpaid = sum(data.propAccounts.map((p) => p.payoutRequested));
  const openChips = sum(nw.excluded.filter((r) => r.group === "제외 · 카지노").map((r) => r.base));

  const summaries = [
    { label: "은행 · 일반 계좌", value: nw.bank, icon: "bank", to: "assets" },
    { label: "지갑 현금", value: cashWallet, icon: "wallet", to: "assets" },
    { label: "집 금고 · 보관", value: cashSafe, icon: "wallet", to: "assets" },
    { label: "실제 투자 계좌", value: nw.invest, icon: "chart", to: "invest" },
    { label: "암호화폐", value: nw.crypto, icon: "coin", to: "assets" },
  ];

  const countryRows = useMemo(() => {
    const byCountry = groupBy(
      nw.rows.filter((r) => r.included !== false),
      (r) => r.group,
    );
    return Object.entries(byCountry)
      .map(([g, rows]) => ({ label: g, value: sum(rows.map((r) => r.base)) }))
      .sort((a, b) => b.value - a.value);
  }, [nw.rows]);

  const empty = data.accounts.length === 0 && data.cashLocations.length === 0;

  return (
    <div className="space-y-4">
      {/* 순자산 히어로 */}
      <Card className="relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-muted">전체 순자산</p>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
              <span className="font-serif text-[40px] leading-none font-black tracking-tight text-ink tnum md:text-[54px]">
                <Money v={nw.total} settings={s} serif />
              </span>
              <span className="font-mono text-[13px] text-muted">{s.base}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[13px]">
              <span className={change >= 0 ? "text-pos" : "text-warn"}>
                시작 대비 {fmtSigned(change, s)} ({fmtPct(changePct)})
              </span>
              <span className={dayDelta === null ? "text-muted" : dayDelta >= 0 ? "text-pos" : "text-warn"}>
                {dayDelta === null ? "전일 기록 없음" : `전일 대비 ${fmtSigned(dayDelta, s)}`}
              </span>
              <span className="text-muted">시작 잔액 {fmtAmount(nw.opening, s.base)}</span>
            </div>
          </div>
          <div className="text-right">
            <Badge tone="green">실제 소유 자산만</Badge>
            <p className="mt-2 font-mono text-[11px] text-muted">
              기록 {history.length}일 · {fmtDay(Date.now())}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Spark values={history.map((h) => h.v)} height={84} />
        </div>

        {empty && (
          <div className="mt-4">
            <Empty
              title="아직 자산이 없습니다"
              desc="계좌, 현금 보관 장소를 등록하면 순자산이 자동 계산됩니다. 먼저 계좌 하나를 만들어 보세요."
              action={
                <>
                  <Btn onClick={() => (window.location.hash = "/assets")}>계좌 만들기</Btn>
                  <Btn variant="outline" onClick={() => quick("transfer")}>
                    이체 기록
                  </Btn>
                </>
              }
            />
          </div>
        )}
      </Card>

      {/* 자산 요약 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {summaries.map((c) => (
          <button
            key={c.label}
            onClick={() => (window.location.hash = `/${c.to}`)}
            className="cursor-pointer rounded-2xl border border-rule bg-white p-4 text-left transition hover:border-brand"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef4ff] text-brand">
              <Icon name={c.icon} className="h-4 w-4" />
            </span>
            <span className="mt-2.5 block text-[12.5px] text-muted">{c.label}</span>
            <span className="mt-1 block font-mono text-[16.5px] font-bold text-ink tnum">
              <Money v={c.value} settings={s} />
            </span>
          </button>
        ))}
      </div>

      {/* 별도 관리 지표 */}
      {(propNominal > 0 || propUnpaid > 0 || openChips > 0) && (
        <Card className="bg-[#f9fbfd]">
          <CardTitle sub="아래 금액은 실제 소유 자산이 아니므로 순자산에 포함하지 않습니다">
            별도 관리 지표 · 순자산 미포함
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "프랍 명목 계정", v: propNominal, tone: "amber" as const },
              { label: "프랍 미지급 수익", v: propUnpaid, tone: "amber" as const },
              { label: "카지노 진행 중 칩", v: openChips, tone: "red" as const },
            ].map((x) => (
              <div key={x.label} className="rounded-xl border border-rule bg-white px-3.5 py-3">
                <p className="text-[12.5px] text-muted">{x.label}</p>
                <p className="mt-1 font-mono text-[19px] font-bold text-muted tnum line-through">
                  {fmtAmount(x.v, s.base)}
                </p>
                <span className="mt-1 inline-block">
                  <Badge tone={x.tone}>미포함</Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 빠른 입력 */}
      <Card>
        <CardTitle sub="3초 안에 기록 · 어디서든 동일">빠른 입력</CardTitle>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            { a: "income" as const, l: "수입", i: "up" },
            { a: "expense" as const, l: "지출", i: "down" },
            { a: "transfer" as const, l: "이체", i: "chev" },
            { a: "snapshot" as const, l: "투자 잔액", i: "chart" },
            { a: "buyin" as const, l: "Buy-in", i: "dice" },
            { a: "prop" as const, l: "프랍 지급", i: "target" },
          ].map((b) => (
            <button
              key={b.l}
              onClick={() => quick(b.a)}
              className="cursor-pointer rounded-xl border border-rule bg-white px-2 py-3 text-center transition hover:border-brand hover:bg-[#f9fbfd]"
            >
              <Icon name={b.i} className="mx-auto h-5 w-5 text-brand" />
              <span className="mt-1.5 block text-[12.5px] font-bold text-ink">{b.l}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 수입 · 지출 */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle sub={`이번 달 · ${monthLabel(thisMonth)}`} right={<Badge tone="blue">{s.base}</Badge>}>
            수입 · 지출
          </CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#e8f6ee] px-3.5 py-3">
              <p className="text-[12.5px] text-muted">수입</p>
              <p className="mt-1 font-mono text-[19px] font-bold text-pos tnum">
                <Money v={income} settings={s} />
              </p>
            </div>
            <div className="rounded-xl bg-[#fef4e6] px-3.5 py-3">
              <p className="text-[12.5px] text-muted">지출</p>
              <p className="mt-1 font-mono text-[19px] font-bold text-warn tnum">
                <Money v={expense} settings={s} />
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-rule pt-3">
            <span className="text-[13px] text-muted">저축액</span>
            <span className="font-mono text-[15px] font-bold text-ink tnum">
              <Money v={income - expense} settings={s} signed />
            </span>
          </div>
          <div className="mt-4">
            <Bars data={months} />
          </div>
          <div className="mt-2 flex items-center gap-4 font-mono text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-pos" /> 수입
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-warn" /> 지출
            </span>
          </div>
        </Card>

        <Card>
          <CardTitle sub="국가 · 그룹별 실제 소유 자산">자산 구성</CardTitle>
          {countryRows.length === 0 ? (
            <p className="py-8 text-center text-[13.5px] text-muted">자산을 등록하면 구성비가 표시됩니다.</p>
          ) : (
            <Donut items={countryRows.slice(0, 6)} />
          )}
          <div className="mt-4 border-t border-rule pt-3 font-mono text-[11.5px] leading-relaxed text-muted">
            프랍 명목 · 미지급 수익 · 진행 중 칩은 이 구성에서 제외됩니다.
          </div>
        </Card>
      </div>

      {/* 최근 거래 */}
      <Card pad={false} className="overflow-hidden p-4 md:p-5">
        <CardTitle
          right={
            <Btn variant="ghost" size="sm" onClick={() => (window.location.hash = "/tx")}>
              전체 보기
            </Btn>
          }
        >
          최근 거래
        </CardTitle>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">아직 거래가 없습니다. ‘빠른 입력’으로첫 거래를 남겨보세요.</p>
        ) : (
          <div>
            {recent.map((t) => {
              const cat = data.categories.find((c) => c.id === t.categoryId);
              const acc =
                t.type === "income" || t.type === "expense"
                  ? data.accounts.find((a) => a.id === t.accountId)
                  : undefined;
              const label =
                t.type === "transfer"
                  ? "이체"
                  : t.type === "adjust"
                    ? "잔액 조정"
                    : t.type === "casino"
                      ? "카지노"
                      : (cat?.name ?? (t.type === "income" ? "수입" : "지출"));
              const tone =
                t.type === "income" ? "text-pos" : t.type === "expense" ? "text-warn" : "text-ink";
              return (
                <Row
                  key={t.id}
                  left={
                    <>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          t.type === "income"
                            ? "bg-[#e8f6ee] text-pos"
                            : t.type === "expense"
                              ? "bg-[#fef4e6] text-warn"
                              : "bg-[#eef4ff] text-brand"
                        }`}
                      >
                        <Icon
                          name={t.type === "income" ? "up" : t.type === "expense" ? "down" : "chev"}
                          className="h-4 w-4"
                        />
                      </span>
                      {label}
                    </>
                  }
                  sub={`${acc?.alias ?? t.memo ?? ""} · ${fmtDate(t.date)}`}
                  right={
                    <span className={`font-mono text-[15px] font-bold tnum ${tone}`}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                      <Money v={t.amount} settings={s} cur={t.currency} />
                    </span>
                  }
                />
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
