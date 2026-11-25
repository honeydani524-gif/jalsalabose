import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store/AppStore";
import { useQuick } from "../ui/quick";
import {
  Badge,
  Btn,
  Card,
  CardTitle,
  Chip,
  Empty,
  Field,
  Icon,
  Input,
  Modal,
  Money,
  Row,
  Segmented,
  Select,
  Textarea,
} from "../ui/kit";
import { fmtAmount, fmtDate, fmtPct, round, toBase } from "../domain/calc";
import { uid } from "../data/db";
import { amountAtBaseCurrency } from "../domain/finance";

type Tab = "account" | "cash" | "crypto" | "prop";

const GROUP_LABEL: Record<string, string> = {
  bank: "은행 · 일반",
  invest: "투자 · 증권",
  crypto: "암호화폐 거래소",
  prop: "프랍",
  cash: "현금 보관",
  other: "기타",
};

/* ── 계좌 등록/수정 ──────────────────────────────────── */
function AccountForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const ex = id ? data.accounts.find((a) => a.id === id) : undefined;
  const [countryId, setCountryId] = useState(ex?.countryId ?? data.countries[0]?.id ?? "");
  const [institutionId, setInstitutionId] = useState(ex?.institutionId ?? "");
  const [alias, setAlias] = useState(ex?.alias ?? "");
  const [accountTypeId, setAccountTypeId] = useState(ex?.accountTypeId ?? "checking");
  const [currency, setCurrency] = useState(ex?.currency ?? "USD");
  const [opening, setOpening] = useState<number | "">(ex?.openingBalance ?? "");
  const [memo, setMemo] = useState(ex?.memo ?? "");
  const [fav, setFav] = useState(!!ex?.favorite);
  const [newInst, setNewInst] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const insts = data.institutions.filter((i) => i.countryId === countryId);
  const type = data.accountTypes.find((t) => t.id === accountTypeId);

  const submit = async () => {
    setErr(null);
    try {
      if (!alias.trim()) throw new Error("계좌 별칭을 입력하세요.");
      if (!countryId) throw new Error("국가를 선택하세요.");
      let inst = institutionId;
      if (newInst.trim()) {
        inst = `inst-${uid().slice(0, 8)}`;
        await save("institutions", {
          id: inst,
          countryId,
          name: newInst.trim(),
          kind: type?.group === "invest" ? "broker" : "bank",
          sortOrder: data.institutions.length + 1,
        });
      }
      await save("accounts", {
        id: ex?.id ?? uid(),
        alias: alias.trim(),
        accountTypeId,
        institutionId: inst || undefined,
        countryId,
        currency,
        openingBalance: Number(opening) || 0,
        balance: ex ? ex.balance : Number(opening) || 0,
        memo: memo || undefined,
        favorite: fav,
        createdAt: ex?.createdAt ?? Date.now(),
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Modal
      open
      wide
      title={ex ? "계좌 수정" : "계좌 등록"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {ex && (
            <Btn
              variant="danger"
              onClick={async () => {
                try {
                  await remove("accounts", ex.id);
                  onClose();
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            >
              삭제
            </Btn>
          )}
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
        {err && (
          <p className="rounded-xl bg-[#fdeceb] px-3 py-2.5 text-[13.5px] text-stamp">{err}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="국가" required>
            <Select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              {data.countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="금융기관">
            <Select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">직접 입력 / 없음</option>
              {insts.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
            <div className="mt-1.5 flex gap-2">
              <Input
                value={newInst}
                onChange={(e) => setNewInst(e.target.value)}
                placeholder="새 금융기관 이름"
              />
            </div>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="계좌 별칭" required>
            <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="예: ABA 생활비" />
          </Field>
          <Field label="계좌 유형" required hint={type?.includesInNetWorth ? "순자산 포함" : "순자산 제외"}>
            <Select value={accountTypeId} onChange={(e) => setAccountTypeId(e.target.value)}>
              {data.accountTypes
                .filter((t) => t.group !== "prop" || true)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {GROUP_LABEL[t.group]} · {t.label}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="통화" required hint="계좌 잔액의 단위">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["USD", "KRW", "KHR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="시작 잔액">
            <Input
              type="number"
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value === "" ? "" : Number(e.target.value))}
              className="text-right font-mono tnum"
            />
          </Field>
        </div>
        <Field label="메모">
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-[14px] text-ink/80">
          <input type="checkbox" checked={fav} onChange={(e) => setFav(e.target.checked)} className="h-4 w-4 accent-[#3182F6]" />
          즐겨찾기에 추가
        </label>
        {ex && (
          <Btn variant="outline" full onClick={() => onClose()}>
            닫기
          </Btn>
        )}
      </div>
    </Modal>
  );
}

/* ── 잔액 상세 ───────────────────────────────────────── */
function BalanceDetail({ kind, id, onClose }: { kind: "account" | "cash"; id: string; onClose: () => void }) {
  const { data, setBalance, remove, save } = useStore();
  const row =
    kind === "account" ? data.accounts.find((a) => a.id === id) : data.cashLocations.find((c) => c.id === id);
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState<number | "">(row?.balance ?? "");
  const [reason, setReason] = useState("오기입 교정");
  const [err, setErr] = useState<string | null>(null);
  if (!row) return null;
  const label = "alias" in row ? row.alias : row.name;
  const txs = data.transactions
    .filter(
      (t) =>
        t.accountId === id ||
        t.from?.id === id ||
        t.legs?.some((l) => l.id === id),
    )
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);

  return (
    <Modal
      open
      title={label}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={() => setEdit(true)}>
            잔액 수정
          </Btn>
          <Btn
            full
            onClick={() => {
              if (kind === "account") onClose();
              else window.location.hash = "/tx";
            }}
          >
            {kind === "account" ? "수정" : "거래 보기"}
          </Btn>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#f6f8fa] px-4 py-4 text-center">
          <p className="font-mono text-[11.5px] uppercase tracking-wider text-muted">현재 잔액</p>
          <p className="mt-1 font-serif text-[32px] font-black text-ink tnum">
            <Money v={row.balance} settings={data.settings} cur={row.currency} />
          </p>
          <p className="mt-1.5 font-mono text-[12.5px] text-muted">
            시작 {fmtAmount(row.openingBalance, row.currency)} · 증감{" "}
            <span className={row.balance >= row.openingBalance ? "text-pos" : "text-warn"}>
              {fmtPct(
                row.openingBalance === 0 ? 0 : (row.balance - row.openingBalance) / Math.abs(row.openingBalance),
              )}
            </span>
          </p>
          <p className="mt-1 font-mono text-[12.5px] text-muted">
            기준 통화 환산 {fmtAmount(toBase(row.balance, row.currency, data.settings), data.settings.base)}
          </p>
        </div>

        {edit && (
          <div className="rounded-xl border border-brand p-3">
            <Field label={`새 잔액 (${row.currency})`} hint="차액은 ‘잔액 조정’ 거래로 남아 이력이 보존됩니다">
              <Input
                type="number"
                inputMode="decimal"
                value={val}
                onChange={(e) => setVal(e.target.value === "" ? "" : Number(e.target.value))}
                className="text-right font-mono tnum"
                autoFocus
              />
            </Field>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {["오기입 교정", "입출금 반영", "환율 평가", "기타"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
              <Btn
                onClick={async () => {
                  setErr(null);
                  try {
                    await setBalance(kind, id, Number(val), reason);
                    setEdit(false);
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}
              >
                적용
              </Btn>
            </div>
            {err && <p className="mt-2 text-[13px] text-stamp">{err}</p>}
          </div>
        )}

        <div>
          <p className="mb-1 font-mono text-[11.5px] uppercase tracking-wider text-muted">최근 움직임</p>
          {txs.length === 0 ? (
            <p className="py-3 text-[13.5px] text-muted">관련 거래가 없습니다.</p>
          ) : (
            txs.map((t) => (
              <Row
                key={t.id}
                left={t.memo ?? (t.type === "transfer" ? "이체" : "거래")}
                sub={fmtDate(t.date)}
                right={
                  <span className="font-mono text-[13.5px] tnum">
                    <Money v={amountAtBaseCurrency(
                      t.amount, t.currency, t.fxRate, t.date, data.settings.base,
                      data.exchangeRates, data.settings.rates, t.amountBase, t.baseCurrency,
                    )} settings={data.settings} signed={t.type === "adjust"} />
                  </span>
                }
              />
            ))
          )}
        </div>

        <div className="flex gap-2 border-t border-rule pt-3">
          {kind === "account" && (
            <Btn
              variant="outline"
              onClick={async () => {
                await save("accounts", {
                  id: row.id,
                  ...(row as unknown as Record<string, unknown>),
                  archivedAt: Date.now(),
                });
                onClose();
              }}
            >
              보관 (숨김)
            </Btn>
          )}
          <Btn
            variant="danger"
            onClick={async () => {
              try {
                await remove(kind === "account" ? "accounts" : "cashLocations", id);
                onClose();
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            삭제
          </Btn>
        </div>
        {err && <p className="text-[13px] text-stamp">{err}</p>}
      </div>
    </Modal>
  );
}

/* ── 메인 ────────────────────────────────────────────── */
export default function AssetsScreen() {
  const { data, save, remove } = useStore();
  const quick = useQuick();
  const [tab, setTab] = useState<Tab>("account");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [detail, setDetail] = useState<{ kind: "account" | "cash"; id: string } | null>(null);
  const [cashEdit, setCashEdit] = useState<string | null | undefined>(undefined);
  const [walletEdit, setWalletEdit] = useState<string | null | undefined>(undefined);
  const [propEdit, setPropEdit] = useState<string | null | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = data.accounts.filter((a) => !a.archivedAt);
    if (group !== "all") list = list.filter((a) => data.accountTypes.find((t) => t.id === a.accountTypeId)?.group === group);
    if (q.trim())
      list = list.filter((a) => {
        const inst = data.institutions.find((i) => i.id === a.institutionId)?.name ?? "";
        return (a.alias + inst + (a.memo ?? "")).toLowerCase().includes(q.trim().toLowerCase());
      });
    return list.sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  }, [data.accounts, data.accountTypes, data.institutions, group, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((a) => {
      const c = data.countries.find((x) => x.id === a.countryId)?.name ?? "기타";
      const inst = data.institutions.find((i) => i.id === a.institutionId)?.name ?? "직접 등록";
      const key = `${c} / ${inst}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered, data.countries, data.institutions]);

  /* 설정에서 자동 동기화를 켜두면 첫 진입 시 1회 시도 (실패 시 마지막 정상가 유지) */
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current) return;
    if (!data.settings.autoPrice || data.cryptoAssets.length === 0) return;
    autoTried.current = true;
    void syncPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncPrices = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const symbols = Array.from(new Set(data.cryptoAssets.map((a) => a.symbol.toUpperCase())));
    const ids: Record<string, string> = {
      BTC: "bitcoin", ETH: "ethereum", USDT: "tether", USDC: "usd-coin",
      SOL: "solana", XRP: "ripple", BNB: "binancecoin", DOGE: "dogecoin", ADA: "cardano",
    };
    try {
      const unknown = symbols.filter((s) => !ids[s]);
      const known = symbols.filter((s) => ids[s]);
      if (known.length === 0) throw new Error("지원하지 않는 심볼입니다. 수동 가격을 입력하세요.");
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${known
        .map((s) => ids[s])
        .join(",")}&vs_currencies=usd`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`API 응답 오류 (${res.status})`);
      const json = (await res.json()) as Record<string, { usd: number }>;
      const now = Date.now();
      for (const s of known) {
        const p = json[ids[s]]?.usd;
        if (typeof p !== "number") continue;
        await save("cryptoPrices", {
          id: s, symbol: s, price: p, currency: "USD", source: "api", fetchedAt: now, isStale: false,
        });
      }
      setSyncMsg(
        `동기화 완료 · ${known.length}종${unknown.length ? ` · 미지원 ${unknown.join(", ")}는 수동 가격` : ""}`,
      );
    } catch (e) {
      setSyncMsg(`동기화 실패 — 마지막 정상 가격 유지 (${(e as Error).message})`);
    } finally {
      setSyncing(false);
    }
  };

  const tabOptions = [
    { value: "account" as Tab, label: `계좌 ${data.accounts.filter((a) => !a.archivedAt).length}` },
    { value: "cash" as Tab, label: `현금·금고 ${data.cashLocations.length}` },
    { value: "crypto" as Tab, label: `암호화폐 ${data.cryptoWallets.length}` },
    { value: "prop" as Tab, label: `프랍 ${data.propAccounts.length}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={tab} onChange={setTab} options={tabOptions} />
        <div className="flex gap-2">
          <div className="relative">
            <Icon name="search" className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="계좌 검색"
              className="w-[180px] pl-9"
            />
          </div>
          {tab === "account" && (
            <Btn onClick={() => setEditing(null)}>
              <Icon name="plus" className="h-4 w-4" /> 계좌
            </Btn>
          )}
          {tab === "cash" && <Btn onClick={() => setCashEdit(null)}>+ 보관 장소</Btn>}
          {tab === "crypto" && <Btn onClick={() => setWalletEdit(null)}>+ 지갑</Btn>}
          {tab === "prop" && <Btn onClick={() => setPropEdit(null)}>+ 프랍 계정</Btn>}
        </div>
      </div>

      {/* 계좌 */}
      {tab === "account" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {[{ v: "all", l: "전체" }, ...Object.entries(GROUP_LABEL).map(([v, l]) => ({ v, l }))].map((g) => (
              <Chip key={g.v} active={group === g.v} onClick={() => setGroup(g.v)}>
                {g.l}
              </Chip>
            ))}
          </div>
          {grouped.length === 0 ? (
            <Empty
              title="등록된 계좌가 없습니다"
              desc="국가 · 금융기관 · 통화 · 유형을 각각 독립적으로 지정해 계좌를 등록합니다. 한국 은행의 USD 외화계좌도 그대로 등록할 수 있습니다."
              action={<Btn onClick={() => setEditing(null)}>첫 계좌 만들기</Btn>}
            />
          ) : (
            grouped.map(([key, list]) => {
              const total = list.reduce((s, a) => s + toBase(a.balance, a.currency, data.settings), 0);
              return (
                <Card key={key} pad={false} className="overflow-hidden p-4 md:p-5">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <p className="font-mono text-[12.5px] font-bold text-ink">{key}</p>
                    <p className="font-mono text-[13px] text-muted tnum">
                      <Money v={total} settings={data.settings} />
                    </p>
                  </div>
                  {list.map((a) => {
                    const t = data.accountTypes.find((x) => x.id === a.accountTypeId);
                    const inst = data.institutions.find((i) => i.id === a.institutionId)?.name;
                    const base = toBase(a.balance, a.currency, data.settings);
                    return (
                      <Row
                        key={a.id}
                        onClick={() => setDetail({ kind: "account", id: a.id })}
                        badge={
                          <span className="ml-1 flex items-center gap-1.5">
                            {a.favorite && <Icon name="check" className="h-3.5 w-3.5 text-brand" />}
                            {!t?.includesInNetWorth && <Badge tone="amber">미포함</Badge>}
                          </span>
                        }
                        left={
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4ff] text-brand">
                              <Icon name={t?.group === "invest" ? "chart" : t?.group === "crypto" ? "coin" : "bank"} className="h-4.5 w-4.5" />
                            </span>
                            {a.alias}
                          </span>
                        }
                        sub={`${inst ?? ""} · ${t?.label ?? ""} · ${a.currency}`}
                        right={
                          <div>
                            <div className="font-mono text-[15.5px] font-bold text-ink tnum">
                              <Money v={a.balance} settings={data.settings} cur={a.currency} />
                            </div>
                            <div className="font-mono text-[11.5px] text-muted tnum">
                              {fmtAmount(base, data.settings.base)}
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </Card>
              );
            })
          )}
        </>
      )}

      {/* 현금 · 금고 */}
      {tab === "cash" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["wallet", "safe", "office", "other"] as const)
              .map((k) => ({ k, rows: data.cashLocations.filter((c) => c.kind === k) }))
              .filter((g) => g.rows.length > 0)
              .map((g) => (
                <Card key={g.k}>
                  <CardTitle>
                    {g.k === "wallet" ? "지갑 현금" : g.k === "safe" ? "집 금고" : g.k === "office" ? "사무실 금고" : "기타 보관"}
                  </CardTitle>
                  <div className="space-y-2">
                    {g.rows.map((c) => (
                      <Row
                        key={c.id}
                        onClick={() => setCashEdit(c.id)}
                        left={c.name}
                        sub={c.currency}
                        right={
                          <span className="font-mono text-[15px] font-bold text-ink tnum">
                            <Money v={c.balance} settings={data.settings} cur={c.currency} />
                          </span>
                        }
                      />
                    ))}
                  </div>
                </Card>
              ))}
          </div>
          {data.cashLocations.length === 0 && (
            <Empty
              title="현금 보관 장소가 없습니다"
              desc="지갑 현금과 금고는 별도의 잔액을 가집니다. 계좌에서 인출하면 ‘계좌 이체’로 기록해 총자산이 변하지 않게 합니다."
              action={<Btn onClick={() => setCashEdit(null)}>보관 장소 추가</Btn>}
            />
          )}
          <Card>
            <CardTitle sub="이체는 출발지와 도착지를 함께 기록합니다">현금 이동 예시</CardTitle>
            <p className="font-mono text-[12.5px] leading-relaxed text-muted">
              ABA에서 $5,000 인출 → 지갑 $2,000 + 집 금고 $3,000
              <br />
              Δ총자산 = −5,000 + 2,000 + 3,000 = <span className="text-pos">0</span> · 수입/지출 0건
            </p>
            <div className="mt-3">
              <Btn variant="ghost" onClick={() => quick("transfer")}>
                이체 기록하기
              </Btn>
            </div>
          </Card>
        </>
      )}

      {/* 암호화폐 */}
      {tab === "crypto" && (
        <>
          <Card>
            <CardTitle
              sub="시세는 가격만 갱신합니다 — 보유 수량과 거래 기록은 절대 변경되지 않습니다"
              right={
                <Btn size="sm" variant="outline" onClick={syncPrices} disabled={syncing}>
                  {syncing ? "동기화 중…" : "시세 동기화"}
                </Btn>
              }
            >
              코인 시세
            </CardTitle>
            {syncMsg && <p className="mb-3 rounded-xl bg-[#f6f8fa] px-3 py-2 font-mono text-[12.5px] text-ink/75">{syncMsg}</p>}
            {data.cryptoPrices.length === 0 ? (
              <p className="text-[13.5px] text-muted">아직 시세가 없습니다. 동기화하거나 수동 가격을 입력하세요.</p>
            ) : (
              data.cryptoPrices.map((p) => (
                <Row
                  key={p.id}
                  left={p.symbol}
                  sub={`${p.source === "api" ? "API" : "수동"} · ${new Date(p.fetchedAt).toLocaleString("ko-KR")}`}
                  badge={p.isStale ? <Badge tone="amber">stale</Badge> : <Badge tone="green">live</Badge>}
                  right={
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[14px] font-bold tnum">${p.price.toLocaleString("ko-KR")}</span>
                      <input
                        type="number"
                        step="any"
                        aria-label={`${p.symbol} 수동 가격`}
                        defaultValue={p.price}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0 && v !== p.price)
                            save("cryptoPrices", { ...p, price: v, source: "manual", fetchedAt: Date.now(), isStale: false });
                        }}
                        className="w-[92px] rounded-lg border border-rule px-2 py-1 text-right font-mono text-[12.5px] tnum outline-none focus:border-brand"
                      />
                    </div>
                  }
                />
              ))
            )}
          </Card>

          {data.cryptoWallets.length === 0 ? (
            <Empty
              title="등록된 지갑이 없습니다"
              desc="한국 거래소, 해외 거래소, 소프트웨어·하드웨어 지갑을 각각 별도로 등록합니다. 개인키나 시드문구는 요구하지 않습니다."
              action={<Btn onClick={() => setWalletEdit(null)}>지갑 추가</Btn>}
            />
          ) : (
            data.cryptoWallets.map((w) => {
              const assets = data.cryptoAssets.filter((a) => a.walletId === w.id);
              const value = assets.reduce(
                (s, a) => s + toBase(a.quantity * (a.manualPrice ?? data.cryptoPrices.find((p) => p.symbol === a.symbol)?.price ?? 0), "USD", data.settings),
                0,
              );
              return (
                <Card key={w.id} pad={false} className="overflow-hidden p-4 md:p-5">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <p className="font-serif text-[15.5px] font-bold text-ink">
                      {w.name}{" "}
                      <span className="ml-1 font-mono text-[11px] font-normal text-muted">
                        {w.kind === "krExchange" ? "한국 거래소" : w.kind === "overseasExchange" ? "해외 거래소" : w.kind === "hardware" ? "하드웨어" : w.kind === "software" ? "소프트웨어" : "종이 지갑"}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[15px] font-bold text-ink tnum">
                        <Money v={value} settings={data.settings} />
                      </span>
                      <button onClick={() => setWalletEdit(w.id)} className="cursor-pointer text-muted hover:text-brand" aria-label="지갑 수정">
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {assets.length === 0 ? (
                    <p className="px-1 py-2 text-[13px] text-muted">보유 코인이 없습니다.</p>
                  ) : (
                    assets.map((a) => {
                      const price = a.manualPrice ?? data.cryptoPrices.find((p) => p.symbol === a.symbol)?.price ?? 0;
                      return (
                        <Row
                          key={a.id}
                          left={
                            <span className="flex items-center gap-2">
                              <span className="font-mono font-bold">{a.symbol}</span>
                              <span className="font-mono text-[13px] text-muted tnum">
                                {a.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}
                              </span>
                            </span>
                          }
                          sub={`시세 $${price.toLocaleString("ko-KR")}${a.manualPrice ? " · 수동" : ""}`}
                          right={
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[14.5px] font-bold tnum">
                                <Money v={toBase(a.quantity * price, "USD", data.settings)} settings={data.settings} />
                              </span>
                              <button
                                onClick={() => {
                                  const name = window.prompt(`보유량 수정 (${a.symbol})`, String(a.quantity));
                                  if (name === null) return;
                                  const n = Number(name);
                                  if (!Number.isNaN(n)) save("cryptoAssets", { ...a, quantity: n });
                                }}
                                className="cursor-pointer text-muted hover:text-brand"
                                aria-label="보유량 수정"
                              >
                                <Icon name="edit" className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => remove("cryptoAssets", a.id)}
                                className="cursor-pointer text-muted hover:text-stamp"
                                aria-label="보유량 삭제"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            </div>
                          }
                        />
                      );
                    })
                  )}
                  <div className="mt-2 flex gap-2 px-1">
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const symbol = window.prompt("심볼 (예: BTC, USDT)", "USDT");
                        if (!symbol) return;
                        const qty = Number(window.prompt("보유 수량", "0") ?? "0");
                        if (Number.isNaN(qty)) return;
                        await save("cryptoAssets", {
                          id: uid(), walletId: w.id, symbol: symbol.toUpperCase(), quantity: qty,
                        });
                      }}
                    >
                      + 보유 코인
                    </Btn>
                    <Btn size="sm" variant="outline" onClick={() => quick("buyin")}>
                      지갑에서 출금 기록
                    </Btn>
                  </div>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* 프랍 */}
      {tab === "prop" && (
        <>
          <div className="rounded-2xl border border-warn/40 bg-[#fef4e6] px-4 py-3 text-[13.5px] leading-relaxed text-ink/80">
            프랍 계정의 명목 규모와 평가잔액은 <b>순자산에 포함하지 않습니다</b>. 실제 지급받은 수익만 수령 계좌에
            반영됩니다.
          </div>
          {data.propAccounts.length === 0 ? (
            <Empty
              title="등록된 프랍 계정이 없습니다"
              desc="프랍 회사명, 명목 규모, 목표 수익, 최대 손실 한도, 상태를 관리합니다. 참가비는 지출로 기록됩니다."
              action={<Btn onClick={() => setPropEdit(null)}>프랍 계정 등록</Btn>}
            />
          ) : (
            data.propAccounts.map((p) => {
              const perf = p.opening === 0 ? 0 : (p.balance - p.opening) / p.opening;
              const statusTone = p.status === "통과" ? "green" : p.status === "탈락" ? "red" : p.status === "거래 중" ? "blue" : "gray";
              return (
                <Card key={p.id} pad={false} className="overflow-hidden p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                    <div>
                      <p className="font-serif text-[16px] font-bold text-ink">
                        {p.firm} · {p.alias}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone as never}>{p.status}</Badge>
                        <Badge>{p.kind === "evaluation" ? "평가 단계" : "펀딩"}</Badge>
                        <span className="font-mono text-[11.5px] text-muted">
                          명목 ${p.nominalSize.toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[20px] font-bold text-ink tnum">
                        ${p.balance.toLocaleString("ko-KR")}
                      </p>
                      <p className={`font-mono text-[13px] tnum ${perf >= 0 ? "text-pos" : "text-warn"}`}>
                        {fmtPct(perf)} · 성과 지표
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 px-1 sm:grid-cols-4">
                    {[
                      { l: "목표 수익", v: `$${(p.target ?? 0).toLocaleString()}` },
                      { l: "일일 최대 손실", v: `$${(p.maxDailyLoss ?? 0).toLocaleString()}` },
                      { l: "출금 가능", v: `$${p.payoutRequested.toLocaleString()}` },
                      { l: "참가비", v: `${p.feeCurrency} ${p.fee}` },
                    ].map((m) => (
                      <div key={m.l} className="rounded-xl bg-[#f6f8fa] px-3 py-2">
                        <p className="text-[11.5px] text-muted">{m.l}</p>
                        <p className="mt-0.5 font-mono text-[14px] font-bold text-ink tnum">{m.v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 px-1">
                    <Btn size="sm" variant="ghost" onClick={() => quick("prop")}>
                      실제 지급 기록
                    </Btn>
                    <Btn size="sm" variant="outline" onClick={() => setPropEdit(p.id)}>
                      수정
                    </Btn>
                  </div>
                  {data.propPayouts.filter((x) => x.propAccountId === p.id).length > 0 && (
                    <div className="mt-3 border-t border-rule px-1 pt-2">
                      <p className="mb-1 font-mono text-[11.5px] uppercase text-muted">지급 이력</p>
                      {data.propPayouts
                        .filter((x) => x.propAccountId === p.id)
                        .map((x) => (
                          <Row
                            key={x.id}
                            left={x.memo ?? "지급"}
                            sub={fmtDate(x.receivedAt)}
                            right={
                              <span className="font-mono text-[14px] font-bold text-pos tnum">
                                +{fmtAmount(x.amount, x.currency)}
                              </span>
                            }
                          />
                        ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {editing !== undefined && <AccountForm id={editing ?? undefined} onClose={() => setEditing(undefined)} />}
      {detail && <BalanceDetail kind={detail.kind} id={detail.id} onClose={() => setDetail(null)} />}
      {cashEdit !== undefined && <CashForm id={cashEdit ?? undefined} onClose={() => setCashEdit(undefined)} />}
      {walletEdit !== undefined && <WalletForm id={walletEdit ?? undefined} onClose={() => setWalletEdit(undefined)} />}
      {propEdit !== undefined && <PropForm id={propEdit ?? undefined} onClose={() => setPropEdit(undefined)} />}
    </div>
  );
}

/* ── 보관 장소 ───────────────────────────────────────── */
function CashForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const ex = id ? data.cashLocations.find((c) => c.id === id) : undefined;
  const [name, setName] = useState(ex?.name ?? "");
  const [kind, setKind] = useState<string>(ex?.kind ?? "wallet");
  const [currency, setCurrency] = useState(ex?.currency ?? "USD");
  const [balance, setBalance] = useState<number | "">(ex?.balance ?? "");
  const [memo, setMemo] = useState(ex?.memo ?? "");
  return (
    <Modal
      open
      title={ex ? "보관 장소 수정" : "현금 보관 장소 추가"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {ex && (
            <Btn variant="danger" onClick={async () => { await remove("cashLocations", ex.id); onClose(); }}>
              삭제
            </Btn>
          )}
          <Btn variant="outline" full onClick={onClose}>취소</Btn>
          <Btn
            full
            onClick={async () => {
              if (!name.trim()) return;
              await save("cashLocations", {
                id: ex?.id ?? uid(), name: name.trim(), kind: kind as never, currency,
                openingBalance: Number(balance) || 0, balance: Number(balance) || 0,
                memo: memo || undefined, sortOrder: ex?.sortOrder ?? data.cashLocations.length + 1,
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
        <Field label="장소 이름" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 집 금고" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="유형">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="wallet">지갑 현금</option>
              <option value="safe">집 금고</option>
              <option value="office">사무실 금고</option>
              <option value="other">기타</option>
            </Select>
          </Field>
          <Field label="통화">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["USD", "KRW", "KHR"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="현재 잔액">
          <Input type="number" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value === "" ? "" : Number(e.target.value))} className="text-right font-mono tnum" />
        </Field>
        <Field label="메모">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ── 지갑 ────────────────────────────────────────────── */
function WalletForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const ex = id ? data.cryptoWallets.find((w) => w.id === id) : undefined;
  const [name, setName] = useState(ex?.name ?? "");
  const [kind, setKind] = useState<string>(ex?.kind ?? "hardware");
  const [memo, setMemo] = useState(ex?.memo ?? "");
  return (
    <Modal
      open
      title={ex ? "지갑 수정" : "암호화폐 지갑 등록"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {ex && (
            <Btn variant="danger" onClick={async () => { await remove("cryptoWallets", ex.id); onClose(); }}>
              삭제
            </Btn>
          )}
          <Btn variant="outline" full onClick={onClose}>취소</Btn>
          <Btn
            full
            onClick={async () => {
              if (!name.trim()) return;
              await save("cryptoWallets", {
                id: ex?.id ?? uid(), name: name.trim(), kind: kind as never,
                memo: memo || undefined, sortOrder: ex?.sortOrder ?? data.cryptoWallets.length + 1,
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
        <p className="rounded-xl bg-[#f6f8fa] px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
          개인키 · 시드문구는 요구하지도 저장하지 않습니다. 지갑은 이름과 보유 수량만 기록합니다.
        </p>
        <Field label="지갑 이름" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: SafePal" autoFocus />
        </Field>
        <Field label="지갑 종류">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="krExchange">한국 암호화폐 거래소</option>
            <option value="overseasExchange">해외 암호화폐 거래소</option>
            <option value="software">개인 소프트웨어 지갑</option>
            <option value="hardware">하드웨어 지갑</option>
            <option value="paper">종이 지갑</option>
          </Select>
        </Field>
        <Field label="메모">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ── 프랍 계정 ───────────────────────────────────────── */
function PropForm({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const ex = id ? data.propAccounts.find((p) => p.id === id) : undefined;
  const [firm, setFirm] = useState(ex?.firm ?? "");
  const [alias, setAlias] = useState(ex?.alias ?? "");
  const [kind, setKind] = useState<string>(ex?.kind ?? "evaluation");
  const [nominal, setNominal] = useState<number | "">(ex?.nominalSize ?? 100000);
  const [opening, setOpening] = useState<number | "">(ex?.opening ?? 100000);
  const [balance, setBalance] = useState<number | "">(ex?.balance ?? 100000);
  const [target, setTarget] = useState<number | "">(ex?.target ?? 10000);
  const [maxDaily, setMaxDaily] = useState<number | "">(ex?.maxDailyLoss ?? 5000);
  const [status, setStatus] = useState<string>(ex?.status ?? "평가");
  const [fee, setFee] = useState<number | "">(ex?.fee ?? 0);
  const [requested, setRequested] = useState<number | "">(ex?.payoutRequested ?? 0);
  const [memo, setMemo] = useState(ex?.memo ?? "");
  return (
    <Modal
      open
      wide
      title={ex ? "프랍 계정 수정" : "프랍 계정 등록"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {ex && (
            <Btn variant="danger" onClick={async () => { await remove("propAccounts", ex.id); onClose(); }}>
              삭제
            </Btn>
          )}
          <Btn variant="outline" full onClick={onClose}>취소</Btn>
          <Btn
            full
            onClick={async () => {
              if (!firm.trim()) return;
              await save("propAccounts", {
                id: ex?.id ?? uid(), firm: firm.trim(), alias: alias.trim() || "계정", kind: kind as never,
                nominalSize: Number(nominal) || 0, opening: Number(opening) || 0, balance: Number(balance) || 0,
                target: Number(target) || 0, maxDailyLoss: Number(maxDaily) || 0, status: status as never,
                fee: Number(fee) || 0, feeCurrency: "USD", payoutRequested: Number(requested) || 0,
                payoutCurrency: "USD", memo: memo || undefined, createdAt: ex?.createdAt ?? Date.now(),
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
        <div className="rounded-xl bg-[#fdeceb] px-3.5 py-2.5 text-[13px] leading-relaxed text-stamp">
          명목 규모와 평가잔액은 순자산에서 자동 제외됩니다.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="프랍 회사" required>
            <Input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="예: FTMO" autoFocus />
          </Field>
          <Field label="계정 별칭">
            <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="예: 100K Phase2" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="계정 종류">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="evaluation">평가 단계</option>
              <option value="funded">펀딩</option>
            </Select>
          </Field>
          <Field label="명목 계정 규모">
            <Input type="number" value={nominal} onChange={(e) => setNominal(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
          <Field label="상태">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["평가", "펀딩", "거래 중", "통과", "탈락", "종료"].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="시작 평가잔액">
            <Input type="number" value={opening} onChange={(e) => setOpening(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
          <Field label="현재 평가잔액">
            <Input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
          <Field label="출금 가능 수익">
            <Input type="number" value={requested} onChange={(e) => setRequested(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="목표 수익">
            <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
          <Field label="일일 최대 손실">
            <Input type="number" value={maxDaily} onChange={(e) => setMaxDaily(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
          <Field label="참가비 (USD)">
            <Input type="number" value={fee} onChange={(e) => setFee(Number(e.target.value))} className="text-right font-mono tnum" />
          </Field>
        </div>
        <Field label="메모">
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        {Number(fee) > 0 && !ex && (
          <p className="font-mono text-[12px] text-muted">
            참가비는 저장 후 지출 거래로 따로 기록하세요 (총자산 −${round(Number(fee), 2)})
          </p>
        )}
      </div>
    </Modal>
  );
}
