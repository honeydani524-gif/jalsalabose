import { useMemo, useState } from "react";
import { useStore } from "../store/AppStore";
import { useQuick } from "../ui/quick";
import { Badge, Btn, Card, CardTitle, Empty, Icon, Money, Row, Segmented, Spark } from "../ui/kit";
import { fmtAmount, fmtPct, tradePnl } from "../domain/calc";

export default function InvestScreen() {
  const { data, remove } = useStore();
  const quick = useQuick();

  const investAccounts = data.accounts.filter((a) => {
    const t = data.accountTypes.find((x) => x.id === a.accountTypeId);
    return t?.group === "invest" && !a.archivedAt;
  });
  const [accId, setAccId] = useState(investAccounts[0]?.id ?? "");
  const acc = investAccounts.find((a) => a.id === accId) ?? investAccounts[0];

  const snaps = useMemo(
    () =>
      data.invSnapshots
        .filter((s) => s.accountId === acc?.id)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [data.invSnapshots, acc],
  );

  const rows = useMemo(() => {
    let cum = 0;
    let flow = 0;
    let prev = acc?.openingBalance ?? 0;
    return snaps.map((s) => {
      const pnl = tradePnl(prev, s.endBalance, s.deposit, s.withdrawal);
      cum += pnl;
      flow += s.deposit - s.withdrawal;
      prev = s.endBalance;
      const roi = acc && acc.openingBalance + flow !== 0 ? cum / (acc.openingBalance + flow) : 0;
      return { ...s, pnl, cum, roi };
    });
  }, [snaps, acc]);

  const latest = rows[rows.length - 1];
  const values = rows.map((r) => r.endBalance);
  const daily = rows.slice(-14).map((r, i) => ({
    label: `${Number(r.date.slice(5, 7))}/${Number(r.date.slice(8, 10))}`,
    a: Math.max(0, r.pnl),
    b: Math.max(0, -r.pnl),
    _i: i,
  }));

  if (investAccounts.length === 0) {
    return (
      <Empty
        title="투자 계좌가 없습니다"
        desc="브로커, 한국 증권사 계좌를 ‘주식·선물·증권’ 유형으로 등록하면 일일 평가잔액을 기록할 수 있습니다. 매매는 입력하지 않고 하루 마지막 잔액만 기록합니다."
        action={<Btn onClick={() => (window.location.hash = "/assets")}>자산 탭에서 계좌 만들기</Btn>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={acc?.id ?? ""}
          onChange={setAccId}
          options={investAccounts.map((a) => ({ value: a.id, label: a.alias }))}
          size="sm"
        />
        <div className="ml-auto flex gap-2">
          <Btn size="sm" onClick={() => quick("snapshot")}>
            <Icon name="plus" className="h-4 w-4" /> 오늘 잔액 입력
          </Btn>
        </div>
      </div>

      {/* 요약 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12.5px] text-muted">최신 평가잔액</p>
          <p className="mt-1 font-serif text-[26px] font-black text-ink tnum">
            <Money v={acc?.balance ?? 0} settings={data.settings} cur={acc?.currency} serif />
          </p>
          <p className="mt-1 font-mono text-[12px] text-muted">시작 {fmtAmount(acc?.openingBalance ?? 0, acc?.currency ?? "USD")}</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-muted">누적 매매손익</p>
          <p className={`mt-1 font-serif text-[26px] font-black tnum ${(latest?.cum ?? 0) >= 0 ? "text-pos" : "text-warn"}`}>
            <Money v={latest?.cum ?? 0} settings={data.settings} cur={acc?.currency} signed serif />
          </p>
          <p className="mt-1 font-mono text-[12px] text-muted">입출금 제외 · 실제 매매로 번 돈</p>
        </Card>
        <Card>
          <p className="text-[12.5px] text-muted">누적 수익률</p>
          <p className={`mt-1 font-serif text-[26px] font-black tnum ${(latest?.roi ?? 0) >= 0 ? "text-pos" : "text-warn"}`}>
            {fmtPct(latest?.roi ?? 0)}
          </p>
          <p className="mt-1 font-mono text-[12px] text-muted">기록 {snaps.length}일</p>
        </Card>
      </div>

      {/* 그래프 */}
      <Card>
        <CardTitle sub="평가잔액 추이 · 스냅샷 기준">성과 그래프</CardTitle>
        <Spark values={values} height={110} />
        {daily.length > 0 && (
          <div className="mt-4 flex items-end gap-1.5" style={{ height: 90 }}>
            {daily.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                  <div className="w-1/2 rounded-t bg-pos/85" style={{ height: `${(d.a / Math.max(1, ...daily.map((x) => Math.max(x.a, x.b)))) * 100}%` }} />
                  <div className="w-1/2 rounded-t bg-warn/85" style={{ height: `${(d.b / Math.max(1, ...daily.map((x) => Math.max(x.a, x.b)))) * 100}%` }} />
                </div>
                <span className="font-mono text-[9.5px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          매매손익 = 오늘 잔액 − 어제 잔액 − 입금 + 출금 (본인 자금 흐름을 제외한 실제 손익)
        </p>
      </Card>

      {/* 스냅샷 목록 */}
      <Card pad={false} className="overflow-hidden p-4 md:p-5">
        <CardTitle sub="하루 마지막 평가잔액만 기록합니다" right={<Badge tone="blue">{acc?.currency}</Badge>}>
          일일 기록
        </CardTitle>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-muted">
            아직 기록이 없습니다. ‘오늘 잔액 입력’으로첫 기록을 남기세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="spec min-w-[620px]">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th className="r">평가잔액</th>
                  <th className="r">입금</th>
                  <th className="r">출금</th>
                  <th className="r">매매손익</th>
                  <th className="r">누적 손익</th>
                  <th className="r">수익률</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.id}>
                    <td className="m">{r.date}</td>
                    <td className="m r font-bold">{fmtAmount(r.endBalance, acc?.currency ?? "USD")}</td>
                    <td className="m r text-pos">{r.deposit ? fmtAmount(r.deposit, acc?.currency ?? "USD") : "—"}</td>
                    <td className="m r text-warn">{r.withdrawal ? fmtAmount(r.withdrawal, acc?.currency ?? "USD") : "—"}</td>
                    <td className={`m r font-bold ${r.pnl >= 0 ? "text-pos" : "text-warn"}`}>
                      {fmtAmount(r.pnl, acc?.currency ?? "USD")}
                    </td>
                    <td className="m r">{fmtAmount(r.cum, acc?.currency ?? "USD")}</td>
                    <td className={`m r ${r.roi >= 0 ? "text-pos" : "text-warn"}`}>{fmtPct(r.roi)}</td>
                    <td className="r">
                      <button
                        onClick={() => remove("invSnapshots", r.id)}
                        className="cursor-pointer text-muted transition hover:text-stamp"
                        aria-label="기록 삭제"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 프랍 요약 */}
      {data.propAccounts.length > 0 && (
        <Card>
          <CardTitle sub="명목 잔액은 순자산에 포함하지 않습니다">프랍 트레이딩 성과</CardTitle>
          {data.propAccounts.map((p) => (
            <Row
              key={p.id}
              left={
                <span className="flex items-center gap-2">
                  {p.firm} · {p.alias}
                  <Badge tone={p.status === "탈락" ? "red" : p.status === "통과" ? "green" : "blue"}>{p.status}</Badge>
                </span>
              }
              sub={`명목 $${p.nominalSize.toLocaleString()} · 성과 지표`}
              right={
                <div className="text-right">
                  <div className="font-mono text-[15px] font-bold text-ink tnum">${p.balance.toLocaleString()}</div>
                  <div className={`font-mono text-[12px] tnum ${p.balance >= p.opening ? "text-pos" : "text-warn"}`}>
                    {fmtPct(p.opening ? (p.balance - p.opening) / p.opening : 0)}
                  </div>
                </div>
              }
            />
          ))}
          <div className="mt-3 flex gap-2">
            <Btn size="sm" variant="ghost" onClick={() => quick("prop")}>
              실제 지급 기록
            </Btn>
            <Btn size="sm" variant="outline" onClick={() => (window.location.hash = "/assets")}>
              프랍 관리
            </Btn>
          </div>
        </Card>
      )}

      {investAccounts.length > 0 && (
        <Card>
          <CardTitle sub="입출금 경로를 지정하면 계좌 간 이체가 함께 생성됩니다">빠른 작업</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => quick("snapshot")}>
              오늘 잔액 입력
            </Btn>
            <Btn variant="outline" onClick={() => quick("transfer")}>
              자금 이체
            </Btn>
            <Btn variant="outline" onClick={() => (window.location.hash = "/assets")}>
              계좌 관리
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
