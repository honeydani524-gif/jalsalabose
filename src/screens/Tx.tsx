import { useMemo, useState } from "react";
import { useStore } from "../store/AppStore";
import { useQuick } from "../ui/quick";
import { Btn, Card, Empty, Icon, Modal, Money, Row, Segmented, Select, Input } from "../ui/kit";
import { fmtAmount, fmtDate, groupBy, sum } from "../domain/calc";
import type { Tx } from "../domain/entities";

type Range = "month" | "last" | "quarter" | "all";
type Kind = "all" | "income" | "expense" | "transfer";

export default function TxScreen() {
  const { data, removeTransaction } = useStore();
  const quick = useQuick();
  const [range, setRange] = useState<Range>("month");
  const [kind, setKind] = useState<Kind>("all");
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Tx | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useMemo(() => {
    const now = new Date();
    let from = 0;
    if (range === "month") from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (range === "last")
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    if (range === "quarter") from = now.getTime() - 90 * 86400000;

    let rows = data.transactions.filter((t) => (range === "all" ? true : t.date >= from));
    if (range === "last") {
      const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      rows = data.transactions.filter((t) => t.date >= from && t.date < end);
    }
    if (kind !== "all")
      rows = rows.filter((t) =>
        kind === "transfer" ? t.type === "transfer" || t.type === "adjust" : t.type === kind,
      );
    if (cat) rows = rows.filter((t) => t.categoryId === cat);
    if (tag) rows = rows.filter((t) => t.tagIds.includes(tag));
    if (q.trim())
      rows = rows.filter((t) => (t.memo ?? "").toLowerCase().includes(q.trim().toLowerCase()));
    return rows.sort((a, b) => b.date - a.date);
  }, [data.transactions, range, kind, cat, tag, q]);

  const income = sum(list.filter((t) => t.type === "income").map((t) => t.amountBase));
  const expense = sum(list.filter((t) => t.type === "expense").map((t) => t.amountBase));
  const byDay = groupBy(list, (t) => fmtDate(t.date));

  const ranges: { value: Range; label: string }[] = [
    { value: "month", label: "이번 달" },
    { value: "last", label: "지난 달" },
    { value: "quarter", label: "3개월" },
    { value: "all", label: "전체" },
  ];
  const kinds: { value: Kind; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "income", label: "수입" },
    { value: "expense", label: "지출" },
    { value: "transfer", label: "이체" },
  ];

  const nameOf = (t: Tx) => {
    if (t.type === "transfer") return "계좌 이체";
    if (t.type === "adjust") return "잔액 조정";
    if (t.type === "casino") return "카지노";
    return data.categories.find((c) => c.id === t.categoryId)?.name ?? (t.type === "income" ? "수입" : "지출");
  };
  const accName = (t: Tx) => {
    const a = data.accounts.find((x) => x.id === t.accountId);
    if (a) return a.alias;
    if (t.from) {
      const c = data.cashLocations.find((x) => x.id === t.from!.id);
      return c?.name ?? "";
    }
    if (t.legs?.[0]) {
      const c = data.cashLocations.find((x) => x.id === t.legs![0].id);
      return c?.name ?? "";
    }
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={range} onChange={setRange} options={ranges} size="sm" />
        <Segmented value={kind} onChange={setKind} options={kinds} size="sm" />
        <div className="ml-auto flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => quick("income")}>
            + 수입
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => quick("expense")}>
            + 지출
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => quick("transfer")}>
            + 이체
          </Btn>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto min-w-[150px]">
          <option value="">전체 카테고리</option>
          {[...data.categories].sort((a, b) => a.kind.localeCompare(b.kind)).map((c) => (
            <option key={c.id} value={c.id}>
              {c.kind === "income" ? "수입" : "지출"} · {c.name}
            </option>
          ))}
        </Select>
        <Select value={tag} onChange={(e) => setTag(e.target.value)} className="w-auto min-w-[130px]">
          <option value="">전체 태그</option>
          {data.tags.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.name}
            </option>
          ))}
        </Select>
        <div className="relative min-w-[170px] flex-1">
          <Icon name="search" className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="메모 검색" className="pl-9" />
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[12px] text-muted">수입</p>
            <p className="mt-1 font-mono text-[18px] font-bold text-pos tnum">
              <Money v={income} settings={data.settings} />
            </p>
          </div>
          <div>
            <p className="text-[12px] text-muted">지출</p>
            <p className="mt-1 font-mono text-[18px] font-bold text-warn tnum">
              <Money v={expense} settings={data.settings} />
            </p>
          </div>
          <div>
            <p className="text-[12px] text-muted">합계</p>
            <p className="mt-1 font-mono text-[18px] font-bold text-ink tnum">
              <Money v={income - expense} settings={data.settings} signed />
            </p>
          </div>
        </div>
      </Card>

      {list.length === 0 ? (
        <Empty
          title="조건에 맞는 거래가 없습니다"
          desc="기간·유형·카테고리 필터를 바꾸거나, 새 거래를 입력하세요. 내부 이체는 수입/지출에 잡히지 않습니다."
          action={
            <>
              <Btn onClick={() => quick("income")}>수입 입력</Btn>
              <Btn variant="outline" onClick={() => quick("expense")}>
                지출 입력
              </Btn>
            </>
          }
        />
      ) : (
        Object.entries(byDay).map(([day, rows]) => {
          const dayIn = sum(rows.filter((t) => t.type === "income").map((t) => t.amountBase));
          const dayEx = sum(rows.filter((t) => t.type === "expense").map((t) => t.amountBase));
          return (
            <Card key={day} pad={false} className="overflow-hidden p-4 md:p-5">
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="font-mono text-[12.5px] font-bold text-ink">{day}</p>
                <p className="font-mono text-[12px] text-muted tnum">
                  {dayIn > 0 && <span className="text-pos">+{fmtAmount(dayIn, data.settings.base)} </span>}
                  {dayEx > 0 && <span className="text-warn">−{fmtAmount(dayEx, data.settings.base)}</span>}
                  {dayIn === 0 && dayEx === 0 && "—"}
                </p>
              </div>
              {rows.map((t) => (
                <Row
                  key={t.id}
                  onClick={() => setOpen(t)}
                  left={
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          t.type === "income"
                            ? "bg-[#e8f6ee] text-pos"
                            : t.type === "expense"
                              ? "bg-[#fef4e6] text-warn"
                              : "bg-[#eef4ff] text-brand"
                        }`}
                      >
                        <Icon name={t.type === "income" ? "up" : t.type === "expense" ? "down" : "chev"} className="h-4 w-4" />
                      </span>
                      {nameOf(t)}
                    </span>
                  }
                  sub={`${accName(t)}${t.memo ? ` · ${t.memo}` : ""}`}
                  right={
                    <span className={`font-mono text-[15px] font-bold tnum ${t.type === "income" ? "text-pos" : t.type === "expense" ? "text-warn" : "text-ink"}`}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                      <Money v={t.amount} settings={data.settings} cur={t.currency} />
                    </span>
                  }
                />
              ))}
            </Card>
          );
        })
      )}

      {open && (
        <Modal
          open
          title="거래 상세"
          onClose={() => setOpen(null)}
          footer={
            <div className="flex gap-2">
              <Btn
                variant="danger"
                full
                onClick={async () => {
                  try {
                    await removeTransaction(open.id);
                    setOpen(null);
                    setActionError(null);
                  } catch (e) {
                    setActionError((e as Error).message);
                  }
                }}
              >
                삭제
              </Btn>
              <Btn full onClick={() => setOpen(null)}>
                닫기
              </Btn>
            </div>
          }
        >
          <div className="space-y-3">
            {actionError && <p className="rounded-xl bg-[#fdeceb] px-3 py-2.5 text-[13px] text-stamp">{actionError}</p>}
            <div className="rounded-2xl bg-[#f6f8fa] px-4 py-4 text-center">
              <p className="font-mono text-[11.5px] uppercase tracking-wider text-muted">{nameOf(open)}</p>
              <p className="mt-1 font-serif text-[30px] font-black text-ink tnum">
                <Money v={open.amount} settings={data.settings} cur={open.currency} />
              </p>
              <p className="mt-1.5 font-mono text-[12.5px] text-muted">
                기준 통화 환산 <Money v={open.amountBase} settings={data.settings} /> · 적용 환율{" "}
                {open.fxRate.toLocaleString("ko-KR")}
              </p>
            </div>
            <dl className="divide-y divide-rule rounded-xl border border-rule">
              {[
                ["날짜", fmtDate(open.date)],
                ["유형", open.type === "transfer" ? "계좌 이체 (총자산 변화 0)" : open.type === "adjust" ? "잔액 조정" : open.type === "income" ? "수입" : "지출"],
                ["계좌", accName(open) || "—"],
                ["카테고리", data.categories.find((c) => c.id === open.categoryId)?.name ?? "—"],
                ["태그", open.tagIds.map((id) => `#${data.tags.find((t) => t.id === id)?.name ?? ""}`).join(" ") || "—"],
                ["메모", open.memo ?? "—"],
                ["상대방", open.counterparty ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5 text-[14px]">
                  <dt className="shrink-0 text-muted">{k}</dt>
                  <dd className="text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {open.type === "transfer" && open.legs && (
              <div className="rounded-xl border border-rule p-3">
                <p className="mb-1.5 font-mono text-[11.5px] uppercase text-muted">도착지 분할</p>
                {open.legs.map((l, i) => {
                  const name =
                    l.kind === "account"
                      ? data.accounts.find((a) => a.id === l.id)?.alias
                      : data.cashLocations.find((c) => c.id === l.id)?.name;
                  return (
                    <div key={i} className="flex justify-between py-1 text-[14px]">
                      <span>{name ?? "삭제된 자산"}</span>
                      <span className="font-mono tnum">{fmtAmount(l.amount, open.currency)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="font-mono text-[11.5px] text-muted">
              원본 통화 {open.currency} · 당시 환율 {open.fxRate} · 기준 통화 {data.settings.base} 환산 {fmtAmount(open.amountBase, data.settings.base)}
              <br />
              이후 환율을 바꿔도 이 값은 변하지 않습니다.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}


