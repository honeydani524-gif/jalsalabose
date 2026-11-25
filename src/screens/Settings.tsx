import { useRef, useState } from "react";
import { useStore } from "../store/AppStore";
import { computeNetWorth, type AccountType } from "../domain/entities";
import { Badge, Btn, Card, CardTitle, Icon, Input, Modal, Row, Segmented, Select } from "../ui/kit";
import { DEFAULT_SETTINGS, fmtAmount, fmtDate, toBase } from "../domain/calc";
import { uid } from "../data/db";
import { SCHEMA_VERSION, STORE_LIST } from "../data/db";

function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2.5 border-b border-ink pb-2 font-serif text-[19px] font-bold text-ink">
      <span className="font-mono text-[12px] font-bold text-brand">{n}</span>
      {children}
    </h2>
  );
}

export default function SettingsScreen() {
  const { data, setSettings, save, remove, exportJSON, importJSON, resetAll, loadSample, nw } = useStore();
  const s = data.settings;
  const [msg, setMsg] = useState<string | null>(null);
  const [newCat, setNewCat] = useState<{ income: string; expense: string }>({ income: "", expense: "" });
  const [newTag, setNewTag] = useState("");
  const [newInst, setNewInst] = useState({ name: "", countryId: "kr", kind: "bank" });
  const [newCountry, setNewCountry] = useState("");
  const [newType, setNewType] = useState({ label: "", group: "other" });
  const [rates, setRates] = useState<Record<string, number>>({ ...s.rates });
  const [confirmReset, setConfirmReset] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    try {
      const text = exportJSON();
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jalsalabose-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("백업 파일을 내려받았습니다.");
    } catch (e) {
      setMsg(`내보내기 실패: ${(e as Error).message}`);
    }
  };

  const onFile = async (f: File | null | undefined) => {
    if (!f) return;
    try {
      const text = await f.text();
      if (!window.confirm("현재 데이터를 덮어씁니다. 계속할까요? 복원 전 백업을 권장합니다.")) return;
      await importJSON(text);
      setMsg("복원이 완료되었습니다.");
    } catch (e) {
      setMsg(`복원 실패: ${(e as Error).message}`);
    }
  };

  const applyRates = async () => {
    try {
    const next = { ...s, rates };
    const before = nw.total;
    const after = computeNetWorth({ ...data, settings: next }).total;
    const effectiveAt = Date.now();
    for (const [cur, rate] of Object.entries(rates)) {
      if (cur === "USD" || s.rates[cur] === rate) continue;
      await save("exchangeRates", {
        id: `rate-${cur}-${effectiveAt}`,
        base: cur,
        rate,
        effectiveAt,
        source: "manual",
        memo: "설정에서 변경",
      });
    }
    await setSettings({ rates });
    setMsg(
      `환율 적용 완료 · 총자산 ${fmtAmount(before, s.base)} → ${fmtAmount(after, s.base)} (${fmtAmount(
        after - before,
        s.base,
      )}) · 과거 거래의 당시 환산 금액은 그대로 유지됩니다.`,
    );
    } catch (e) {
      setMsg(`환율 적용 실패: ${(e as Error).message}`);
    }
  };

  const counts = STORE_LIST.map((st) => ({
    st,
    n: ((data as unknown as Record<string, unknown[]>)[st] ?? []).length,
  })).filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      {msg && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand/40 bg-[#eef4ff] px-4 py-3 text-[13.5px] leading-relaxed text-ink/85">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="cursor-pointer font-bold text-brand">닫기</button>
        </div>
      )}

      {/* 기본 */}
      <div className="space-y-3">
        <SectionTitle n="01">기준 통화 · 표시</SectionTitle>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14.5px] font-bold text-ink">기준 통화</p>
              <p className="mt-0.5 text-[12.5px] text-muted">전체 합계와 그래프가 이 통화로 표시됩니다</p>
            </div>
            <Segmented
              value={s.base}
              onChange={(v) => setSettings({ base: v })}
              options={["USD", "KRW", "KHR"].map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            <div>
              <p className="text-[14.5px] font-bold text-ink">금액 숨기기</p>
              <p className="mt-0.5 text-[12.5px] text-muted">공개 화면에서 숫자를 •••• 로 표시합니다</p>
            </div>
            <button
              onClick={() => setSettings({ mask: !s.mask })}
              className={`cursor-pointer rounded-xl px-4 py-2 text-[13.5px] font-bold transition ${
                s.mask ? "bg-brand text-white" : "border border-rule bg-white text-ink/70"
              }`}
            >
              {s.mask ? "켜짐" : "꺼짐"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            <div>
              <p className="text-[14.5px] font-bold text-ink">시세 자동 동기화</p>
              <p className="mt-0.5 text-[12.5px] text-muted">온라인일 때만 코인 시세를 갱신합니다 (수량은 불변)</p>
            </div>
            <button
              onClick={() => setSettings({ autoPrice: !s.autoPrice })}
              className={`cursor-pointer rounded-xl px-4 py-2 text-[13.5px] font-bold transition ${
                s.autoPrice ? "bg-brand text-white" : "border border-rule bg-white text-ink/70"
              }`}
            >
              {s.autoPrice ? "자동" : "수동만"}
            </button>
          </div>
        </Card>
      </div>

      {/* 환율 */}
      <div className="space-y-3">
        <SectionTitle n="02">환율 관리 (수동)</SectionTitle>
        <Card>
          <CardTitle sub="한 번 설정한 환율은 다음 변경 전까지 사용합니다. 현재 자산 평가에만 적용되며 과거 거래는 그대로입니다">
            환율 입력
          </CardTitle>
          <div className="space-y-2">
            {Object.entries(rates)
              .filter(([k]) => k !== "USD")
              .map(([cur, rate]) => (
                <div key={cur} className="flex items-center gap-3">
                  <span className="w-16 font-mono text-[13.5px] font-bold text-ink">1 USD</span>
                  <input
                    type="number"
                    step="any"
                    value={rate}
                    onChange={(e) => setRates({ ...rates, [cur]: Number(e.target.value) || 1 })}
                    className="flex-1 rounded-xl border border-rule px-3 py-2 text-right font-mono text-[15px] tnum outline-none focus:border-brand"
                    aria-label={`${cur} 환율`}
                  />
                  <span className="w-12 font-mono text-[13.5px] text-muted">{cur}</span>
                </div>
              ))}
            <div className="flex gap-2 pt-1">
              <Btn size="sm" onClick={applyRates}>
                적용 (전후 비교 표시)
              </Btn>
              <Btn size="sm" variant="outline" onClick={() => setRates({ ...s.rates })}>
                되돌리기
              </Btn>
            </div>
          </div>
          <div className="mt-4 border-t border-rule pt-3">
            <p className="mb-2 font-mono text-[11.5px] uppercase text-muted">변경 이력</p>
            {[...data.exchangeRates]
              .sort((a, b) => b.effectiveAt - a.effectiveAt)
              .slice(0, 6)
              .map((r) => (
                <Row
                  key={r.id}
                  left={`1 USD = ${r.rate.toLocaleString("ko-KR")} ${r.base}`}
                  sub={`${fmtDate(r.effectiveAt)} · ${r.memo ?? r.source}`}
                  right={<Badge>{r.source === "manual" ? "수동" : "가져옴"}</Badge>}
                />
              ))}
            {data.exchangeRates.length === 0 && <p className="text-[13.5px] text-muted">기록이 없습니다.</p>}
          </div>
        </Card>
      </div>

      {/* 마스터 데이터 */}
      <div className="space-y-3">
        <SectionTitle n="03">마스터 데이터 관리</SectionTitle>

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardTitle sub="삭제해도 과거 거래는 보존됩니다 (숨김 처리)">카테고리</CardTitle>
            {(["income", "expense"] as const).map((k) => (
              <div key={k} className="mb-3">
                <p className="mb-1.5 font-mono text-[11.5px] uppercase text-muted">
                  {k === "income" ? "수입" : "지출"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.categories
                    .filter((c) => c.kind === k)
                    .map((c) => (
                      <span
                        key={c.id}
                        className="flex items-center gap-1.5 rounded-full border border-rule bg-white px-2.5 py-1 text-[13px] text-ink/80"
                      >
                        {c.name}
                        <button
                          onClick={() => save("categories", { ...c, archivedAt: Date.now() })}
                          className="cursor-pointer text-muted hover:text-stamp"
                          aria-label={`${c.name} 삭제`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newCat[k]}
                    onChange={(e) => setNewCat({ ...newCat, [k]: e.target.value })}
                    placeholder="새 카테고리"
                  />
                  <Btn
                    size="sm"
                    onClick={async () => {
                      const name = newCat[k].trim();
                      if (!name) return;
                      await save("categories", {
                        id: uid(), kind: k, name, sortOrder: data.categories.filter((c) => c.kind === k).length + 1,
                      });
                      setNewCat({ ...newCat, [k]: "" });
                    }}
                  >
                    추가
                  </Btn>
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle sub="한 거래에 여러 태그를 붙일 수 있습니다">태그</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <span key={t.id} className="flex items-center gap-1.5 rounded-full bg-[#eef4ff] px-2.5 py-1 text-[13px] text-brand">
                  #{t.name}
                  <button onClick={() => remove("tags", t.id)} className="cursor-pointer hover:text-stamp" aria-label="삭제">✕</button>
                </span>
              ))}
              {data.tags.length === 0 && <p className="text-[13.5px] text-muted">아직 태그가 없습니다.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="새 태그 이름" />
              <Btn
                size="sm"
                onClick={async () => {
                  const name = newTag.trim().replace(/^#/, "");
                  if (!name) return;
                  await save("tags", { id: uid(), name, color: "#3182F6", sortOrder: data.tags.length + 1 });
                  setNewTag("");
                }}
              >
                추가
              </Btn>
            </div>
          </Card>

          <Card>
            <CardTitle sub="계좌 등록 시 국가별로 표시됩니다">국가</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {data.countries.map((c) => (
                <span key={c.id} className="rounded-full border border-rule bg-white px-2.5 py-1 text-[13px] text-ink/80">
                  {c.name} <span className="font-mono text-[11px] text-muted">{c.code}</span>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="새 국가 이름" />
              <Btn
                size="sm"
                onClick={async () => {
                  const name = newCountry.trim();
                  if (!name) return;
                  await save("countries", {
                    id: uid(), code: name.slice(0, 3).toUpperCase(), name, symbol: "", sortOrder: data.countries.length + 1,
                  });
                  setNewCountry("");
                }}
              >
                추가
              </Btn>
            </div>
          </Card>

          <Card>
            <CardTitle sub="계좌 등록 시 선택할 수 있습니다">금융기관</CardTitle>
            <div className="max-h-[190px] overflow-y-auto">
              {data.institutions.map((i) => (
                <Row
                  key={i.id}
                  left={i.name}
                  sub={data.countries.find((c) => c.id === i.countryId)?.name ?? ""}
                  right={
                    <button
                      onClick={() => {
                        if (data.accounts.some((a) => a.institutionId === i.id)) {
                          setMsg("계좌가 사용 중인 금융기관은 삭제할 수 없습니다.");
                          return;
                        }
                        remove("institutions", i.id);
                      }}
                      className="cursor-pointer text-muted hover:text-stamp"
                      aria-label="삭제"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  }
                />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Input value={newInst.name} onChange={(e) => setNewInst({ ...newInst, name: e.target.value })} placeholder="새 금융기관 이름" />
              <div className="flex gap-2">
                <Select value={newInst.countryId} onChange={(e) => setNewInst({ ...newInst, countryId: e.target.value })}>
                  {data.countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <Select value={newInst.kind} onChange={(e) => setNewInst({ ...newInst, kind: e.target.value })}>
                  <option value="bank">은행</option>
                  <option value="broker">증권 · 브로커</option>
                  <option value="exchange">거래소</option>
                  <option value="prop">프랍</option>
                  <option value="other">기타</option>
                </Select>
                <Btn
                  size="sm"
                  onClick={async () => {
                    const name = newInst.name.trim();
                    if (!name) return;
                    await save("institutions", {
                      id: uid(), countryId: newInst.countryId, name, kind: newInst.kind as never,
                      sortOrder: data.institutions.length + 1,
                    });
                    setNewInst({ ...newInst, name: "" });
                  }}
                >
                  추가
                </Btn>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle sub="새 유형을 추가해도 데이터 구조는 바뀌지 않습니다 — ‘순자산 포함’ 스위치만 데이터로 제어됩니다">
            계좌 유형
          </CardTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.accountTypes.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-rule px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{t.label}</p>
                  <p className="font-mono text-[11px] text-muted">{t.code} · {t.group}</p>
                </div>
                <button
                  onClick={() => save("accountTypes", { ...(t as AccountType & { id: string }), includesInNetWorth: !t.includesInNetWorth })}
                  className={`shrink-0 cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[11.5px] font-bold transition ${
                    t.includesInNetWorth ? "bg-[#e8f6ee] text-pos" : "bg-[#fef4e6] text-warn"
                  }`}
                >
                  {t.includesInNetWorth ? "포함" : "제외"}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={newType.label}
              onChange={(e) => setNewType({ ...newType, label: e.target.value })}
              placeholder="새 계좌 유형 이름"
            />
            <Select value={newType.group} onChange={(e) => setNewType({ ...newType, group: e.target.value })}>
              {["bank", "invest", "crypto", "prop", "cash", "other"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
            <Btn
              size="sm"
              onClick={async () => {
                const label = newType.label.trim();
                if (!label) return;
                await save("accountTypes", {
                  id: uid(), code: `custom-${Date.now().toString(36)}`, label,
                  group: newType.group as never, includesInNetWorth: newType.group !== "prop",
                  icon: "dots", sortOrder: data.accountTypes.length + 1,
                });
                setNewType({ ...newType, label: "" });
              }}
            >
              추가
            </Btn>
          </div>
        </Card>
      </div>

      {/* 백업 */}
      <div className="space-y-3">
        <SectionTitle n="04">백업 · 복원 · 초기화</SectionTitle>
        <Card>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rule p-3.5">
              <p className="text-[14.5px] font-bold text-ink">JSON 내보내기</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">전체 데이터 + 스키마 버전을 파일로 저장합니다</p>
              <div className="mt-3"><Btn size="sm" full onClick={doExport}>백업 파일 내려받기</Btn></div>
            </div>
            <div className="rounded-xl border border-rule p-3.5">
              <p className="text-[14.5px] font-bold text-ink">JSON 복원</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">파일을 검증한 뒤 사용자 확인 후 덮어씁니다</p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <div className="mt-3"><Btn size="sm" full variant="outline" onClick={() => fileRef.current?.click()}>백업 파일 선택</Btn></div>
            </div>
            <div className="rounded-xl border border-stamp/40 p-3.5">
              <p className="text-[14.5px] font-bold text-stamp">전체 초기화</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">모든 데이터를 지우고 마스터 데이터만 남깁니다</p>
              <div className="mt-3"><Btn size="sm" full variant="danger" onClick={() => setConfirmReset(true)}>초기화</Btn></div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f6f8fa] px-4 py-3">
            <div>
              <p className="text-[14.5px] font-bold text-ink">샘플 데이터로 화면 확인</p>
              <p className="mt-0.5 text-[12.5px] text-muted">평가용 예시 데이터를 넣습니다 (설정 → 초기화로 지울 수 있습니다)</p>
            </div>
            <Btn size="sm" variant="ghost" onClick={async () => { if (window.confirm("샘플 데이터를 추가할까요?")) { await loadSample(); setMsg("샘플 데이터를 추가했습니다."); } }}>
              샘플 데이터 생성
            </Btn>
          </div>
        </Card>
      </div>

      {/* 앱 정보 */}
      <div className="space-y-3">
        <SectionTitle n="05">앱 정보</SectionTitle>
        <Card>
          <dl className="divide-y divide-rule">
            {[
              ["앱 이름", "잘살아보세 (JalSalAboSe)"],
              ["버전", "v0.1.0"],
              ["데이터 스키마", `v${SCHEMA_VERSION}`],
              ["기준 시간대", "Asia/Phnom_Penh"],
              ["지원 통화", "USD · KRW · KHR"],
              ["저장 위치", "브라우저 로컬 IndexedDB (서버 전송 없음)"],
              ["총 자산", fmtAmount(nw.total, s.base)],
              ["데이터 건수", counts.map((c) => `${c.st} ${c.n}`).join(" · ") || "없음"],
              ["마지막 백업", "수동 내보내기로 관리"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-1 py-2.5 text-[14px]">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="text-right font-mono text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 rounded-xl bg-[#f6f8fa] px-4 py-3.5 text-[13.5px] leading-relaxed text-ink/75">
            <b>개발자</b> · 해외선물 트레이더 / 프랍 트레이딩
            <br />
            Telegram <span className="font-mono text-brand">@wti0816</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn size="sm" variant="outline" onClick={() => (window.location.hash = "/spec")}>
              설계 문서 보기
            </Btn>
            <Btn size="sm" variant="outline" onClick={() => setDetail("privacy")}>
              개인정보 · 보안
            </Btn>
          </div>
        </Card>
      </div>

      {confirmReset && (
        <Modal
          open
          title="전체 초기화"
          onClose={() => setConfirmReset(false)}
          footer={
            <div className="flex gap-2">
              <Btn variant="outline" full onClick={() => setConfirmReset(false)}>취소</Btn>
              <Btn
                full
                variant="danger"
                onClick={async () => {
                  if (!window.confirm("마지막 확인: 모든 거래·계좌·기록이 삭제됩니다. 계속할까요?")) return;
                  await resetAll();
                  setConfirmReset(false);
                  setMsg("초기화되었습니다.");
                }}
              >
                영구 삭제
              </Btn>
            </div>
          }
        >
          <p className="text-[14.5px] leading-relaxed text-ink/80">
            계좌, 거래, 투자 기록, 카지노 세션, 암호화폐 보유량이 모두 삭제됩니다. 국가·금융기관·계좌 유형·카테고리만
            남습니다. <b>복원할 수 있도록 먼저 백업 파일을 내려받으세요.</b>
          </p>
          <div className="mt-3 font-mono text-[12.5px] text-muted">
            {counts.map((c) => `${c.st}=${c.n}`).join(" · ")}
          </div>
        </Modal>
      )}

      {detail === "privacy" && (
        <Modal open title="개인정보 · 보안" onClose={() => setDetail(null)}>
          <div className="space-y-3 text-[14px] leading-relaxed text-ink/80">
            <p>· 모든 데이터는 기기 브라우저의 IndexedDB에만 저장되며 외부 서버로 전송하지 않습니다.</p>
            <p>· 계좌번호, 개인 지갑 주소, 시드문구, 개인키는 앱이 아예 다루지 않습니다.</p>
            <p>· 코인 시세 동기화는 심볼과 가격만 요청하며 보유 수량은 전송하지 않습니다.</p>
            <p>· AI 분석은 외부 API를 호출하지 않습니다. 프롬프트를 복사해 직접 붙여넣습니다.</p>
            <p>· 백업 파일에는 전체 장부가 포함되니 안전한 곳에 보관하세요.</p>
            <p className="font-mono text-[12.5px] text-muted">
              기본값 시드: 기준 통화 {DEFAULT_SETTINGS.base} · 환율 KRW {DEFAULT_SETTINGS.rates.KRW} / KHR{" "}
              {DEFAULT_SETTINGS.rates.KHR}
            </p>
            <p className="font-mono text-[12.5px] text-muted">
              현재 평가: 1 USD = {toBase(1, "USD", s).toFixed(2)} {s.base} 기준
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
