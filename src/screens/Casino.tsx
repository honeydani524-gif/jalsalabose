import { useMemo, useState } from "react";
import { useStore } from "../store/AppStore";
import { BuyInForm } from "./forms";
import { Badge, Btn, Card, Empty, Field, Icon, Input, Modal, Money, Row, Segmented, Select, Textarea } from "../ui/kit";
import { fmtAmount, fmtDate, fmtDateTime, round, toBase } from "../domain/calc";
import { rateAt as historicalRateAt, toSessionCurrency } from "../domain/finance";
import { uid } from "../data/db";
import { casinoSessionTotals, type RelKind } from "../domain/entities";

/* ── Cash-out (분할 수령) ────────────────────────────── */
function CashOutForm({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data, addCashOut } = useStore();
  const ses = data.casinoSessions.find((s) => s.id === sessionId);
  const bi = data.casinoBuyIns.filter((b) => b.sessionId === sessionId);
  const currency = ses?.currency ?? "USD";
  const sessionTotals = casinoSessionTotals(sessionId, data.casinoBuyIns, data.casinoCashOuts);
  const bought = sessionTotals.open;
  const sessionFxRate = ses?.fxRate ?? bi[0]?.fxRate ?? 1;

  const [total, setTotal] = useState<number | "">(bought > 0 ? bought : "");
  const [fee, setFee] = useState<number | "">(0);
  const [legs, setLegs] = useState<{ kind: RelKind; id: string; amount: number }[]>([
    { kind: "account", id: "", amount: 0 },
  ]);
  const [dt, setDt] = useState(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  });
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const transactionTime = new Date(dt).getTime();
  const rateAt = (cur: string) =>
    historicalRateAt(cur, transactionTime, data.exchangeRates, data.settings.rates);
  const legCurrency = (leg: (typeof legs)[number]) =>
    leg.kind === "crypto"
      ? "USD"
      : leg.kind === "account"
        ? data.accounts.find((a) => a.id === leg.id)?.currency ?? "USD"
        : data.cashLocations.find((a) => a.id === leg.id)?.currency ?? "USD";
  const sumLegs = round(
    legs.reduce((sum, leg) => {
      const cur = legCurrency(leg);
      return sum + toSessionCurrency(Number(leg.amount) || 0, rateAt(cur), sessionFxRate);
    }, 0),
    6,
  );
  const net = (Number(total) || 0) - (Number(fee) || 0);
  const diff = round(net - sumLegs, 6);

  const setLeg = (i: number, patch: Partial<(typeof legs)[number]>) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    setErr(null);
    try {
      if (!total || total <= 0) throw new Error("Cash-out 금액을 입력하세요.");
      if (legs.some((l) => !l.id)) throw new Error("도착지를 모두 선택하세요.");
      if (Math.abs(diff) > 0.01) throw new Error(`환산 후 도착 합계가 실수령액과 다릅니다. (차이 ${fmtAmount(diff, currency)})`);
      await addCashOut({
        sessionId,
        totalAmount: Number(total),
        currency,
        fee: Number(fee) || 0,
        date: new Date(dt).getTime(),
        memo: memo || undefined,
        legs: legs.map((l) => ({ ...l, amount: Number(l.amount) })),
        symbol: "USDT",
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      title="Cash-out 기록"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onClose}>취소</Btn>
          <Btn full onClick={submit}>기록</Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        {err && <p className="rounded-xl bg-[#fdeceb] px-3 py-2.5 text-[13.5px] text-stamp">{err}</p>}
        <div className="rounded-xl bg-[#f6f8fa] px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-ink/75">
          미정산 칩 {fmtAmount(bought, currency)} · 세션 총 Buy-in {fmtAmount(sessionTotals.buyIn, currency)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cash-out 총액" required>
            <Input type="number" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value === "" ? "" : Number(e.target.value))} className="text-right font-mono tnum" autoFocus />
          </Field>
          <Field label="수수료 · 환전 차액">
            <Input type="number" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value === "" ? "" : Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
        </div>

        <div className="rounded-xl border border-rule bg-[#f9fbfd] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-ink/70">도착지 (분할 가능)</span>
            <button onClick={() => setLegs([...legs, { kind: "cash", id: "", amount: 0 }])} className="cursor-pointer font-mono text-[12px] font-bold text-brand">
              + 도착지 추가
            </button>
          </div>
          <div className="space-y-2">
            {legs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Select value={l.kind} onChange={(e) => setLeg(i, { kind: e.target.value as never, id: "" })} className="w-[104px] shrink-0">
                  <option value="account">계좌</option>
                  <option value="cash">현금·금고</option>
                  <option value="crypto">지갑</option>
                </Select>
                <Select value={l.id} onChange={(e) => setLeg(i, { id: e.target.value })} className="min-w-0 flex-1">
                  <option value="">선택</option>
                  {l.kind === "account"
                    ? data.accounts.filter((a) => !a.archivedAt).map((a) => <option key={a.id} value={a.id}>{a.alias}</option>)
                    : l.kind === "cash"
                      ? data.cashLocations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                      : data.cryptoWallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
                <div className="w-[116px] shrink-0">
                  <input
                    type="number" inputMode="decimal" value={l.amount || ""} placeholder="0"
                    onChange={(e) => setLeg(i, { amount: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-rule px-2.5 py-2 text-right font-mono text-[14px] tnum outline-none focus:border-brand"
                  />
                  <p className="mt-0.5 text-right font-mono text-[10px] text-muted">{legCurrency(l)}</p>
                </div>
                {legs.length > 1 && (
                  <button onClick={() => setLegs(legs.filter((_, j) => j !== i))} aria-label="삭제" className="cursor-pointer px-1 text-muted hover:text-stamp">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-between border-t border-rule pt-2 font-mono text-[12.5px]">
            <span className="text-muted">실수령 {fmtAmount(net, currency)} / 환산 도착 합계 {fmtAmount(sumLegs, currency)}</span>
            <span className={Math.abs(diff) < 1e-6 ? "font-bold text-pos" : "font-bold text-stamp"}>
              {Math.abs(diff) < 0.01 ? "환산 일치 ✓" : `차이 ${fmtAmount(diff, currency)}`}
            </span>
          </div>
        </div>

        <Field label="날짜 · 시간">
          <Input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
        </Field>
        <Field label="메모">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        <p className="font-mono text-[11.5px] leading-relaxed text-muted">
          도착 계좌/금고 잔액이 정확히 올라가고, 순자산에는 Cash-out 금액만큼 반영됩니다. 칩 잔액은 0이 됩니다.
        </p>
      </div>
    </Modal>
  );
}

/* ── 세션 상세 ───────────────────────────────────────── */
function SessionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, closeSession } = useStore();
  const [buyOpen, setBuyOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ses = data.casinoSessions.find((s) => s.id === id);
  if (!ses) return null;
  const casino = data.casinos.find((c) => c.id === ses.casinoId);
  const bi = data.casinoBuyIns.filter((b) => b.sessionId === id).sort((a, b) => a.date - b.date);
  const co = data.casinoCashOuts.filter((c) => c.sessionId === id).sort((a, b) => a.date - b.date);
  const sessionTotals = casinoSessionTotals(id, data.casinoBuyIns, data.casinoCashOuts);
  const totalIn = sessionTotals.buyIn;
  const totalOut = sessionTotals.cashOut;
  const pnl = round(totalOut - totalIn, 6);
  const open = sessionTotals.open;
  const sessionFxRate = ses.fxRate ?? bi[0]?.fxRate ?? 1;
  const ongoing = ses.status === "ongoing";
  const currency = ses.currency;

  const relName = (kind: RelKind, rid: string) =>
    kind === "account"
      ? data.accounts.find((a) => a.id === rid)?.alias ?? "삭제된 계좌"
      : kind === "cash"
        ? data.cashLocations.find((c) => c.id === rid)?.name ?? "삭제된 장소"
        : data.cryptoWallets.find((w) => w.id === rid)?.name ?? "삭제된 지갑";

  return (
    <Modal
      open
      wide
      title={`${casino?.name ?? "카지노"} 세션`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="ghost" full onClick={() => setBuyOpen(true)}>추가 Buy-in</Btn>
          <Btn variant="outline" full onClick={() => setCashOpen(true)}>Cash-out</Btn>
          <Btn
            full
            onClick={async () => {
              const r = await closeSession(id);
              if (!r.ok) setMsg(r.message ?? "종료할 수 없습니다.");
              else onClose();
            }}
          >
            세션 종료
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        {msg && <p className="rounded-xl bg-[#fef4e6] px-3 py-2.5 text-[13.5px] text-warn">{msg}</p>}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#f6f8fa] px-3 py-3 text-center">
            <p className="text-[11.5px] text-muted">총 Buy-in</p>
            <p className="mt-1 font-mono text-[17px] font-bold text-ink tnum">
              <Money v={totalIn} settings={data.settings} cur={currency} />
            </p>
          </div>
          <div className="rounded-xl bg-[#f6f8fa] px-3 py-3 text-center">
            <p className="text-[11.5px] text-muted">총 Cash-out</p>
            <p className="mt-1 font-mono text-[17px] font-bold text-ink tnum">
              <Money v={totalOut} settings={data.settings} cur={currency} />
            </p>
          </div>
          <div className={`rounded-xl px-3 py-3 text-center ${ongoing ? "bg-[#f1f3f5]" : pnl >= 0 ? "bg-[#e8f6ee]" : "bg-[#fef4e6]"}`}>
            <p className="text-[11.5px] text-muted">세션 손익 {ongoing && <span className="text-warn">· 미확정</span>}</p>
            <p className={`mt-1 font-mono text-[17px] font-bold tnum ${pnl >= 0 ? "text-pos" : "text-warn"}`}>
              <Money v={pnl} settings={data.settings} cur={currency} signed />
            </p>
          </div>
        </div>

        {ongoing && open > 1e-6 && (
          <div className="rounded-xl border border-warn/50 bg-[#fef4e6] px-3.5 py-2.5 text-[13.5px] text-ink/80">
            미정산 칩 <b>{fmtAmount(open, currency)}</b> — 종료 전에 Cash-out으로 정산하세요. 순자산에는 포함되지 않습니다.
          </div>
        )}

        <div>
          <p className="mb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-muted">거래 흐름</p>
          {[...bi.map((b) => ({
              k: "in" as const, d: b.date,
              amt: b.sessionAmount ?? toSessionCurrency(b.amount + (b.fee || 0), b.fxRate || sessionFxRate, sessionFxRate),
              from: relName(b.from.kind, b.from.id), memo: b.memo,
            })),
            ...co.map((x) => ({
              k: "out" as const, d: x.date,
              amt: x.sessionAmount ?? toSessionCurrency(x.totalAmount - (x.fee || 0), x.fxRate || sessionFxRate, sessionFxRate),
              from: x.legs.map((l) => relName(l.kind, l.id)).join(" + "), memo: x.memo,
            }))]
            .sort((a, b) => b.d - a.d)
            .map((x, i) => (
              <Row
                key={i}
                left={
                  <span className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${x.k === "in" ? "bg-[#fef4e6] text-warn" : "bg-[#e8f6ee] text-pos"}`}>
                      <Icon name={x.k === "in" ? "up" : "down"} className="h-4 w-4" />
                    </span>
                    {x.k === "in" ? "Buy-in" : "Cash-out"}
                  </span>
                }
                sub={`${x.from}${x.memo ? ` · ${x.memo}` : ""} · ${fmtDateTime(x.d)}`}
                right={
                  <span className={`font-mono text-[15px] font-bold tnum ${x.k === "in" ? "text-warn" : "text-pos"}`}>
                    {x.k === "in" ? "−" : "+"}
                    <Money v={x.amt} settings={data.settings} cur={currency} />
                  </span>
                }
              />
            ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-rule pt-3 font-mono text-[11.5px] text-muted">
          <span>시작 {fmtDate(ses.startedAt)}</span>
          {ses.endedAt && <span>종료 {fmtDate(ses.endedAt)}</span>}
          <Badge tone={ongoing ? "amber" : "green"}>{ongoing ? "진행 중" : "종료"}</Badge>
        </div>
      </div>

      {buyOpen && <BuyInForm casinoId={ses.casinoId} sessionId={id} onClose={() => setBuyOpen(false)} />}
      {cashOpen && <CashOutForm sessionId={id} onClose={() => setCashOpen(false)} />}
    </Modal>
  );
}

/* ── 카지노 등록 ─────────────────────────────────────── */
function CasinoForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const ex = id ? data.casinos.find((c) => c.id === id) : undefined;
  const [name, setName] = useState(ex?.name ?? "");
  const [city, setCity] = useState(ex?.city ?? "");
  const [memo, setMemo] = useState(ex?.memo ?? "");
  return (
    <Modal
      open
      title={ex ? "카지노 수정" : "카지노 추가"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {ex && (
            <Btn variant="danger" onClick={async () => { await remove("casinos", ex.id); onClose(); }}>삭제</Btn>
          )}
          <Btn variant="outline" full onClick={onClose}>취소</Btn>
          <Btn
            full
            onClick={async () => {
              if (!name.trim()) return;
              await save("casinos", {
                id: ex?.id ?? uid(), name: name.trim(), city: city || undefined,
                memo: memo || undefined, sortOrder: ex?.sortOrder ?? data.casinos.length + 1,
              });
              onClose();
            }}
          >
            저장
          </Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="카지노 이름" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 나가1" autoFocus />
        </Field>
        <Field label="도시">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="예: 프놈펜" />
        </Field>
        <Field label="메모">
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ── 메인 ────────────────────────────────────────────── */
export default function CasinoScreen() {
  const { data } = useStore();
  const [tab, setTab] = useState<"casino" | "session">("casino");
  const [detail, setDetail] = useState<string | null>(null);
  const [form, setForm] = useState<string | null | undefined>(undefined);
  const [buyOpen, setBuyOpen] = useState(false);

  const stats = useMemo(
    () =>
      data.casinos.map((c) => {
        const sessions = data.casinoSessions.filter((s) => s.casinoId === c.id);
        const ids = new Set(sessions.map((s) => s.id));
        const ins = data.casinoBuyIns.filter((b) => ids.has(b.sessionId));
        const outs = data.casinoCashOuts.filter((o) => ids.has(o.sessionId));
        const usdToBase = toBase(1, "USD", data.settings);
        const totalIn = ins.reduce((s, b) => s + (b.amount + (b.fee || 0)) / (b.fxRate || 1), 0) * usdToBase;
        const totalOut = outs.reduce((s, o) => s + (o.totalAmount - (o.fee || 0)) / (o.fxRate || 1), 0) * usdToBase;
        return {
          c,
          visits: sessions.length,
          ongoing: sessions.some((s) => s.status === "ongoing"),
          totalIn,
          totalOut,
          pnl: round(totalOut - totalIn, 6),
        };
      }),
    [data.casinos, data.casinoSessions, data.casinoBuyIns, data.casinoCashOuts, data.settings],
  );

  const ongoingSessions = data.casinoSessions.filter((s) => s.status === "ongoing");
  const grandIn = stats.reduce((s, x) => s + x.totalIn, 0);
  const grandOut = stats.reduce((s, x) => s + x.totalOut, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "casino" as const, label: `카지노 ${data.casinos.length}` },
            { value: "session" as const, label: `세션 ${data.casinoSessions.length}` },
          ]}
          size="sm"
        />
        <div className="ml-auto flex gap-2">
          <Btn size="sm" variant="outline" onClick={() => setForm(null)}>+ 카지노</Btn>
          <Btn size="sm" onClick={() => setBuyOpen(true)}>Buy-in</Btn>
        </div>
      </div>

      {ongoingSessions.length > 0 && (
        <div className="rounded-2xl border border-warn/50 bg-[#fef4e6] p-4">
          <p className="mb-2 flex items-center gap-2 font-mono text-[12px] font-bold text-warn">
            <Icon name="clock" className="h-4 w-4" /> 진행 중인 세션 {ongoingSessions.length}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ongoingSessions.map((s) => {
              const totals = casinoSessionTotals(s.id, data.casinoBuyIns, data.casinoCashOuts);
              const bi = totals.buyIn;
              const co = totals.cashOut;
              return (
                <button key={s.id} onClick={() => setDetail(s.id)} className="cursor-pointer rounded-xl border border-warn/40 bg-white px-3.5 py-3 text-left transition hover:border-warn">
                  <p className="text-[14.5px] font-bold text-ink">{data.casinos.find((c) => c.id === s.casinoId)?.name}</p>
                  <p className="mt-1 font-mono text-[12.5px] text-muted tnum">
                    Buy-in {fmtAmount(bi, s.currency)} · Cash-out {fmtAmount(co, s.currency)} · 손익{" "}
                    <span className={co - bi >= 0 ? "text-pos" : "text-warn"}>{fmtAmount(co - bi, s.currency)}</span>
                  </p>
                  <span className="mt-1.5 inline-block"><Badge tone="amber">미정산</Badge></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "casino" && (
        <>
          <Card>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[12px] text-muted">누적 Buy-in</p>
                <p className="mt-1 font-mono text-[17px] font-bold text-warn tnum">
                  <Money v={grandIn} settings={data.settings} />
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted">누적 Cash-out</p>
                <p className="mt-1 font-mono text-[17px] font-bold text-pos tnum">
                  <Money v={grandOut} settings={data.settings} />
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted">누적 손익</p>
                <p className={`mt-1 font-mono text-[17px] font-bold tnum ${grandOut - grandIn >= 0 ? "text-pos" : "text-warn"}`}>
                  <Money v={grandOut - grandIn} settings={data.settings} signed />
                </p>
              </div>
            </div>
          </Card>

          {stats.length === 0 ? (
            <Empty
              title="등록된 카지노가 없습니다"
              desc="카지노는 계좌가 아니라 장소입니다. 별도 잔액을 두지 않고, Buy-in은 기존 계좌·현금·지갑에서 출발합니다."
              action={
                <>
                  <Btn onClick={() => setForm(null)}>카지노 추가</Btn>
                  <Btn variant="outline" onClick={() => setBuyOpen(true)}>Buy-in 기록</Btn>
                </>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((s) => (
                <Card key={s.c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-[16.5px] font-bold text-ink">{s.c.name}</p>
                      <p className="mt-0.5 font-mono text-[12px] text-muted">
                        {s.c.city ?? ""} · 방문 {s.visits}회
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {s.ongoing && <Badge tone="amber">진행 중</Badge>}
                      <button onClick={() => setForm(s.c.id)} className="cursor-pointer text-muted hover:text-brand" aria-label="수정">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-[#f6f8fa] py-2">
                      <p className="text-[11px] text-muted">Buy-in</p>
                      <p className="font-mono text-[13.5px] font-bold text-ink tnum">
                        <Money v={s.totalIn} settings={data.settings} />
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f6f8fa] py-2">
                      <p className="text-[11px] text-muted">Cash-out</p>
                      <p className="font-mono text-[13.5px] font-bold text-ink tnum">
                        <Money v={s.totalOut} settings={data.settings} />
                      </p>
                    </div>
                    <div className={`rounded-lg py-2 ${s.pnl >= 0 ? "bg-[#e8f6ee]" : "bg-[#fef4e6]"}`}>
                      <p className="text-[11px] text-muted">손익</p>
                      <p className={`font-mono text-[13.5px] font-bold tnum ${s.pnl >= 0 ? "text-pos" : "text-warn"}`}>
                        <Money v={s.pnl} settings={data.settings} signed />
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "session" && (
        <>
          {data.casinoSessions.length === 0 ? (
            <Empty
              title="세션이 없습니다"
              desc="첫 Buy-in을 기록하면 세션이 자동 생성됩니다. 한 세션에서 여러 차례 Buy-in과 분할 Cash-out을 기록할 수 있습니다."
              action={<Btn onClick={() => setBuyOpen(true)}>Buy-in 기록</Btn>}
            />
          ) : (
            <Card pad={false} className="overflow-hidden p-4 md:p-5">
              {[...data.casinoSessions].sort((a, b) => b.startedAt - a.startedAt).map((s) => {
                const totals = casinoSessionTotals(s.id, data.casinoBuyIns, data.casinoCashOuts);
                const bi = totals.buyIn;
                const co = totals.cashOut;
                return (
                  <Row
                    key={s.id}
                    onClick={() => setDetail(s.id)}
                    badge={s.status === "ongoing" ? <Badge tone="amber">진행 중</Badge> : <Badge tone="green">종료</Badge>}
                    left={data.casinos.find((c) => c.id === s.casinoId)?.name ?? "삭제된 카지노"}
                    sub={`${fmtDate(s.startedAt)} · Buy-in ${fmtAmount(bi, s.currency)} / Cash-out ${fmtAmount(co, s.currency)}`}
                    right={
                      <span className={`font-mono text-[15.5px] font-bold tnum ${co - bi >= 0 ? "text-pos" : "text-warn"}`}>
                        <Money v={co - bi} settings={data.settings} cur={s.currency} signed />
                      </span>
                    }
                  />
                );
              })}
            </Card>
          )}
        </>
      )}

      {detail && <SessionDetail id={detail} onClose={() => setDetail(null)} />}
      {form !== undefined && <CasinoForm id={form ?? undefined} onClose={() => setForm(undefined)} />}
      {buyOpen && <BuyInForm onClose={() => setBuyOpen(false)} />}
    </div>
  );
}
