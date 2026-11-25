/* 빠른 입력 폼 — 수입 · 지출 · 이체 · 투자 잔액 · 카지노 Buy-in · 프랍 지급
   입력 항목은 설계 문서 10-4 표의 최소 필드를 그대로 따른다. */
import { useMemo, useState } from "react";
import { useStore } from "../store/AppStore";
import { dayKey, fmtAmount, round, toBase } from "../domain/calc";
import { Badge, Btn, Field, Input, Modal, NumInput, Segmented, Select, Textarea } from "../ui/kit";
import type { QuickAction } from "../ui/quick";

const todayISO = () => dayKey(Date.now());
const toTs = (iso: string, end = false) => {
  const d = new Date(`${iso}T${end ? "23:59" : "00:00"}:00`);
  return d.getTime();
};

function ErrBox({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="rounded-xl bg-[#fdeceb] px-3 py-2.5 text-[13.5px] leading-relaxed text-stamp">{msg}</p>
  );
}

/** 출발/도착 자산 선택 (계좌 · 현금/금고 · 암호화폐 지갑) */
export function RelSelect({
  value,
  onChange,
  allowCrypto = false,
  label,
}: {
  value: { kind: "account" | "cash" | "crypto"; id: string } | null;
  onChange: (v: { kind: "account" | "cash" | "crypto"; id: string }) => void;
  allowCrypto?: boolean;
  label: string;
}) {
  const { data } = useStore();
  const pick = (kind: string, id: string) => onChange({ kind: kind as never, id });
  const cur = value
    ? value.kind === "account"
      ? data.accounts.find((a) => a.id === value.id)?.currency
      : value.kind === "cash"
        ? data.cashLocations.find((c) => c.id === value.id)?.currency
        : "USD"
    : undefined;

  return (
    <div>
      <Field label={label} required>
        <div className="grid grid-cols-2 gap-2">
          <Select value={value?.kind ?? ""} onChange={(e) => pick(e.target.value, value?.id ?? "")}>
            <option value="">유형</option>
            <option value="account">계좌</option>
            <option value="cash">현금 · 금고</option>
            {allowCrypto && <option value="crypto">암호화폐 지갑</option>}
          </Select>
          <Select
            value={value?.id ?? ""}
            onChange={(e) => {
              const kind = (value?.kind ?? "account") as "account" | "cash" | "crypto";
              if (!e.target.value) return onChange({ kind, id: "" });
              onChange({ kind, id: e.target.value });
            }}
          >
            <option value="">자산 선택</option>
            {value?.kind === "account" &&
              data.accounts
                .filter((a) => !a.archivedAt)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.alias} ({fmtAmount(a.balance, a.currency)})
                  </option>
                ))}
            {value?.kind === "cash" &&
              data.cashLocations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({fmtAmount(c.balance, c.currency)})
                </option>
              ))}
            {value?.kind === "crypto" &&
              data.cryptoWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </Select>
        </div>
      </Field>
      {cur && <p className="mt-1 font-mono text-[11.5px] text-muted">통화 {cur}</p>}
    </div>
  );
}

function TagPicker({ sel, onSel }: { sel: string[]; onSel: (v: string[]) => void }) {
  const { data } = useStore();
  if (data.tags.length === 0) return null;
  return (
    <Field label="태그">
      <div className="flex flex-wrap gap-1.5">
        {data.tags.map((t) => {
          const on = sel.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onSel(on ? sel.filter((x) => x !== t.id) : [...sel, t.id])}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12.5px] transition ${
                on ? "border-brand bg-[#eef4ff] text-brand" : "border-rule text-ink/60"
              }`}
            >
              #{t.name}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/* ── 수입 / 지출 ─────────────────────────────────────── */
function TxForm({ kind, onClose }: { kind: "income" | "expense"; onClose: () => void }) {
  const { data, applyTx } = useStore();
  const [amount, setAmount] = useState<number | "">("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const accounts = data.accounts.filter((a) => !a.archivedAt);
  const acc = accounts.find((a) => a.id === accountId);
  const cats = data.categories.filter((c) => c.kind === kind && !c.archivedAt);

  const submit = async () => {
    setErr(null);
    try {
      if (!accountId) throw new Error("계좌를 선택하세요.");
      if (!amount || amount <= 0) throw new Error("금액을 입력하세요.");
      await applyTx({
        type: kind,
        amount,
        currency: acc!.currency,
        date: date === todayISO() ? Date.now() : toTs(date),
        accountId,
        categoryId: categoryId || undefined,
        tagIds,
        memo: memo || undefined,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      title={kind === "income" ? "수입 입력" : "지출 입력"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onClose}>
            취소
          </Btn>
          <Btn full onClick={submit}>
            저장
          </Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        <ErrBox msg={err} />
        <Field label="금액" required>
          <NumInput
            value={amount}
            onChange={setAmount}
            currency={acc?.currency ?? "USD"}
            autoFocus
          />
        </Field>
        <Field label="계좌" required>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">계좌 선택</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.alias} · {fmtAmount(a.balance, a.currency)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="카테고리">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">선택 안 함</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="날짜" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <TagPicker sel={tagIds} onSel={setTagIds} />
        <Field label="메모">
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 3월 급여" />
        </Field>
        {acc && amount ? (
          <p className="font-mono text-[12px] text-muted">
            {kind === "income" ? "예상 잔액" : "예상 잔액"}{" "}
            {fmtAmount(acc.balance + (kind === "income" ? amount : -amount), acc.currency)} · 기준 통화 환산{" "}
            {fmtAmount(
              toBase(acc.balance + (kind === "income" ? amount : -amount), acc.currency, data.settings),
              data.settings.base,
            )}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

/* ── 계좌 이체 (다중 도착지 · ΔΣ=0 검증) ─────────────── */
function TransferForm({ onClose }: { onClose: () => void }) {
  const { data, applyTx } = useStore();
  const [from, setFrom] = useState<{ kind: "account" | "cash"; id: string } | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [legs, setLegs] = useState<{ kind: "account" | "cash"; id: string; amount: number }[]>([
    { kind: "account", id: "", amount: 0 },
  ]);
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const fromRow = from
    ? from.kind === "account"
      ? data.accounts.find((a) => a.id === from.id)
      : data.cashLocations.find((c) => c.id === from.id)
    : undefined;
  const currency = fromRow?.currency ?? "USD";
  const legSum = round(legs.reduce((s, l) => s + (Number(l.amount) || 0), 0), 6);
  const diff = round((Number(amount) || 0) - legSum, 6);

  const setLeg = (i: number, patch: Partial<(typeof legs)[number]>) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    setErr(null);
    try {
      if (!from?.id) throw new Error("출발 자산을 선택하세요.");
      if (!amount || amount <= 0) throw new Error("금액을 입력하세요.");
      if (legs.some((l) => !l.id)) throw new Error("도착 자산을 모두 선택하세요.");
      if (Math.abs(diff) > 1e-6) throw new Error(`도착 합계가 출발 금액과 다릅니다. (차이 ${diff})`);
      await applyTx({
        type: "transfer",
        amount,
        currency,
        date: date === todayISO() ? Date.now() : toTs(date),
        from,
        legs,
        memo: memo || undefined,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      title="계좌 이체 · 자산 이동"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onClose}>
            취소
          </Btn>
          <Btn full onClick={submit}>
            저장 (총자산 변화 0)
          </Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        <ErrBox msg={err} />
        <RelSelect
          label="출발 자산"
          value={from}
          onChange={(v) => setFrom(v.kind === "crypto" ? null : (v as never))}
        />
        <Field label="금액" required hint="출발 자산의 통화로 입력합니다">
          <NumInput value={amount} onChange={setAmount} currency={currency} autoFocus />
        </Field>

        <div className="rounded-xl border border-rule bg-[#f9fbfd] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-ink/70">도착 자산</span>
            <button
              onClick={() => setLegs([...legs, { kind: "account", id: "", amount: 0 }])}
              className="cursor-pointer font-mono text-[12px] font-bold text-brand"
            >
              + 도착지 추가
            </button>
          </div>
          <div className="space-y-2">
            {legs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Select
                  value={l.kind}
                  onChange={(e) => setLeg(i, { kind: e.target.value as never, id: "" })}
                  className="w-[104px] shrink-0"
                >
                  <option value="account">계좌</option>
                  <option value="cash">현금·금고</option>
                </Select>
                <Select
                  value={l.id}
                  onChange={(e) => setLeg(i, { id: e.target.value })}
                  className="min-w-0 flex-1"
                >
                  <option value="">선택</option>
                  {l.kind === "account"
                    ? data.accounts
                        .filter((a) => !a.archivedAt)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.alias}
                          </option>
                        ))
                    : data.cashLocations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                </Select>
                <input
                  type="number"
                  inputMode="decimal"
                  value={l.amount || ""}
                  placeholder="0"
                  onChange={(e) => setLeg(i, { amount: Number(e.target.value) || 0 })}
                  className="w-[104px] shrink-0 rounded-xl border border-rule px-2.5 py-2 text-right font-mono text-[14px] tnum outline-none focus:border-brand"
                />
                {legs.length > 1 && (
                  <button
                    onClick={() => setLegs(legs.filter((_, j) => j !== i))}
                    aria-label="도착지 삭제"
                    className="cursor-pointer px-1 text-muted hover:text-stamp"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex justify-between border-t border-rule pt-2 font-mono text-[12.5px]">
            <span className="text-muted">
              출발 {fmtAmount(Number(amount) || 0, currency)} / 도착 {fmtAmount(legSum, currency)}
            </span>
            <span className={Math.abs(diff) < 1e-6 ? "font-bold text-pos" : "font-bold text-stamp"}>
              {Math.abs(diff) < 1e-6 ? "일치 ✓" : `차이 ${diff}`}
            </span>
          </div>
        </div>

        <Field label="날짜">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="메모">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: ABA → 지갑·금고" />
        </Field>
        <p className="font-mono text-[11.5px] leading-relaxed text-muted">
          내부 이체는 수입·지출로 기록되지 않습니다. 전체 순자산 변화 = 0.
        </p>
      </div>
    </Modal>
  );
}

/* ── 투자 일일 평가잔액 ──────────────────────────────── */
function SnapshotForm({ onClose }: { onClose: () => void }) {
  const { data, recordSnapshot } = useStore();
  const investAccounts = data.accounts.filter((a) => {
    const t = data.accountTypes.find((x) => x.id === a.accountTypeId);
    return t?.group === "invest" && !a.archivedAt;
  });
  const [accountId, setAccountId] = useState(investAccounts[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [end, setEnd] = useState<number | "">("");
  const [dep, setDep] = useState<number | "">(0);
  const [wd, setWd] = useState<number | "">(0);
  const [fromId, setFromId] = useState("");
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const acc = investAccounts.find((a) => a.id === accountId);
  const prev = useMemo(() => {
    const list = data.invSnapshots
      .filter((s) => s.accountId === accountId && s.date < date)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return list[0]?.endBalance ?? acc?.openingBalance ?? 0;
  }, [data.invSnapshots, accountId, date, acc]);

  const pnl = (Number(end) || 0) - prev - (Number(dep) || 0) + (Number(wd) || 0);
  const currency = acc?.currency ?? "USD";

  const submit = async () => {
    setErr(null);
    try {
      if (!accountId) throw new Error("투자 계좌를 선택하세요.");
      if (end === "") throw new Error("평가잔액을 입력하세요.");
      await recordSnapshot({
        accountId,
        date,
        endBalance: Number(end),
        deposit: Number(dep) || 0,
        withdrawal: Number(wd) || 0,
        memo: memo || undefined,
        fromId: fromId || undefined,
        fromKind: "account",
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      title="오늘 투자 잔액 입력"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onClose}>
            취소
          </Btn>
          <Btn full onClick={submit}>
            저장
          </Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        <ErrBox msg={err} />
        {investAccounts.length === 0 ? (
          <p className="text-[14px] text-muted">
            투자 계좌가 없습니다. 자산 탭에서 ‘주식·선물·증권’ 유형의 계좌를 먼저 만드세요.
          </p>
        ) : (
          <>
            <Field label="계좌" required>
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {investAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.alias}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="날짜" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="마지막 평가잔액" required>
              <NumInput value={end} onChange={setEnd} currency={currency} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="당일 입금">
                <NumInput value={dep} onChange={setDep} currency={currency} />
              </Field>
              <Field label="당일 출금">
                <NumInput value={wd} onChange={setWd} currency={currency} />
              </Field>
            </div>
            <Field label="입출금 출처 (선택)" hint="선택하면 계좌 간 이체 1건이 함께 생성됩니다">
              <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">외부 자금 (별도 이체 없음)</option>
                {data.accounts
                  .filter((a) => a.id !== accountId && !a.archivedAt)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.alias}
                    </option>
                  ))}
                {data.cashLocations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="rounded-xl bg-[#eef4ff] px-3.5 py-3">
              <div className="font-mono text-[11.5px] uppercase tracking-wider text-brand">자동 계산</div>
              <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[13.5px] tnum">
                <span className="text-muted">전일 {fmtAmount(prev, currency)}</span>
                <span className="text-ink">
                  매매손익{" "}
                  <b className={pnl >= 0 ? "text-pos" : "text-warn"}>{fmtAmount(pnl, currency)}</b>
                </span>
                <span className="text-muted">기준 통화 {fmtAmount(toBase(pnl, currency, data.settings), data.settings.base)}</span>
              </div>
            </div>
            <Field label="메모">
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── 카지노 Buy-in ───────────────────────────────────── */
export function BuyInForm({
  onClose,
  casinoId,
  sessionId,
}: {
  onClose: () => void;
  casinoId?: string;
  sessionId?: string;
}) {
  const { data, addBuyIn, save } = useStore();
  const [cid, setCid] = useState(casinoId ?? data.casinos[0]?.id ?? "");
  const [from, setFrom] = useState<{ kind: "account" | "cash" | "crypto"; id: string } | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [chip, setChip] = useState<number | "">("");
  const [fee, setFee] = useState<number | "">(0);
  const [symbol, setSymbol] = useState("USDT");
  const [dt, setDt] = useState(() => {
    const d = new Date();
    return `${dayKey(Date.now())}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const src = from
    ? from.kind === "account"
      ? data.accounts.find((a) => a.id === from.id)
      : from.kind === "cash"
        ? data.cashLocations.find((c) => c.id === from.id)
        : data.cryptoWallets.find((w) => w.id === from.id)
    : undefined;
  const currency = from?.kind === "crypto" ? "USD" : (src as { currency?: string } | undefined)?.currency ?? "USD";

  const submit = async () => {
    setErr(null);
    try {
      if (!cid) throw new Error("카지노를 선택하세요.");
      if (!from?.id) throw new Error("출발 자산을 선택하세요.");
      if (!amount || amount <= 0) throw new Error("금액을 입력하세요.");
      await addBuyIn({
        casinoId: cid,
        sessionId,
        from,
        amount,
        currency,
        chipAmount: Number(chip) || amount,
        fee: Number(fee) || 0,
        date: new Date(dt).getTime(),
        memo: memo || undefined,
        symbol,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      title="카지노 Buy-in"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onClose}>
            취소
          </Btn>
          <Btn full onClick={submit}>
            기록
          </Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        <ErrBox msg={err} />
        <Field label="카지노" required>
          <div className="flex gap-2">
            <Select value={cid} onChange={(e) => setCid(e.target.value)}>
              <option value="">선택</option>
              {data.casinos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 카지노 이름"
            />
            <Btn
              variant="outline"
              onClick={async () => {
                const name = newName.trim();
                if (!name) return;
                const id = `casino-${Date.now().toString(36)}`;
                await save("casinos", {
                  id,
                  name,
                  sortOrder: data.casinos.length + 1,
                });
                setCid(id);
                setNewName("");
              }}
            >
              추가
            </Btn>
          </div>
        </Field>

        <RelSelect label="출발 자산" value={from} onChange={setFrom} allowCrypto />
        {from?.kind === "crypto" && (
          <Field label="전송 코인" hint="네트워크 수수료는 아래에 별도 입력">
            <Select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {["USDT", "USDC", "BTC", "ETH", "SOL"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="금액" required>
          <NumInput value={amount} onChange={setAmount} currency={currency} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="실제 칩 교환액">
            <NumInput value={chip} onChange={setChip} currency={currency} />
          </Field>
          <Field label="환전 수수료 · 차액">
            <NumInput value={fee} onChange={setFee} currency={currency} />
          </Field>
        </div>
        <Field label="날짜 · 시간">
          <Input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
        </Field>
        <Field label="메모">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        <p className="font-mono text-[11.5px] leading-relaxed text-muted">
          Buy-in은 수입/지출이 아닙니다. 출발 자산만 차감되며 진행 중 칩은 순자산에서 제외됩니다.
        </p>
      </div>
    </Modal>
  );
}

/* ── 프랍 실제 지급 수익 ─────────────────────────────── */
function PropPayoutForm({ onClose }: { onClose: () => void }) {
  const { data, addPropPayout } = useStore();
  const [pid, setPid] = useState(data.propAccounts[0]?.id ?? "");
  const [amount, setAmount] = useState<number | "">("");
  const [to, setTo] = useState<{ kind: "account" | "cash"; id: string } | null>(null);
  const [fee, setFee] = useState<number | "">(0);
  const [date, setDate] = useState(todayISO());
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const pa = data.propAccounts.find((p) => p.id === pid);

  const submit = async () => {
    setErr(null);
    try {
      if (!pa) throw new Error("프랍 계정을 선택하세요.");
      if (!to?.id) throw new Error("수령 자산을 선택하세요.");
      if (!amount || amount <= 0) throw new Error("금액을 입력하세요.");
      await addPropPayout({
        propAccountId: pid,
        amount,
        currency: pa.payoutCurrency || "USD",
        to,
        fee: Number(fee) || 0,
        receivedAt: toTs(date, true),
        memo: memo || undefined,
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      title="프랍 수익 실제 지급"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onClose}>
            취소
          </Btn>
          <Btn full onClick={submit}>
            지급 기록
          </Btn>
        </div>
      }
    >
      <div className="space-y-3.5">
        <ErrBox msg={err} />
        {data.propAccounts.length === 0 ? (
          <p className="text-[14px] text-muted">등록된 프랍 계정이 없습니다. 투자 탭에서 먼저 등록하세요.</p>
        ) : (
          <>
            <Field label="프랍 계정" required>
              <Select value={pid} onChange={(e) => setPid(e.target.value)}>
                {data.propAccounts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firm} · {p.alias}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="지급 금액" required hint={`출금 가능 ${fmtAmount(pa?.payoutRequested ?? 0, pa?.payoutCurrency ?? "USD")}`}>
              <NumInput value={amount} onChange={setAmount} currency={pa?.payoutCurrency ?? "USD"} autoFocus />
            </Field>
            <Field label="수령 자산" required>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={to?.kind ?? ""}
                  onChange={(e) => setTo({ kind: e.target.value as never, id: to?.id ?? "" })}
                >
                  <option value="">유형</option>
                  <option value="account">계좌</option>
                  <option value="cash">현금 · 금고</option>
                </Select>
                <Select value={to?.id ?? ""} onChange={(e) => setTo({ kind: (to?.kind ?? "account") as never, id: e.target.value })}>
                  <option value="">선택</option>
                  {to?.kind === "cash"
                    ? data.cashLocations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : data.accounts
                        .filter((a) => !a.archivedAt)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.alias}
                          </option>
                        ))}
                </Select>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="수수료">
                <NumInput value={fee} onChange={setFee} currency="USD" />
              </Field>
              <Field label="수령일">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            <Field label="메모">
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
            </Field>
            <div className="rounded-xl bg-[#e8f6ee] px-3.5 py-3 text-[13.5px] leading-relaxed text-ink/80">
              실제 수령분만 수입으로 기록되고 수령 자산 잔액이 올라갑니다. 프랍 명목 잔액은 순자산에 포함되지 않습니다.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── 빠른 입력 라우터 ────────────────────────────────── */
export function QuickForms({ action, onClose }: { action: QuickAction; onClose: () => void }) {
  if (!action) return null;
  if (action === "income" || action === "expense") return <TxForm kind={action} onClose={onClose} />;
  if (action === "transfer") return <TransferForm onClose={onClose} />;
  if (action === "snapshot") return <SnapshotForm onClose={onClose} />;
  if (action === "buyin") return <BuyInForm onClose={onClose} />;
  if (action === "prop") return <PropPayoutForm onClose={onClose} />;
  return null;
}

export { Segmented, Badge };
