import { Sec, H3, P, L, T, Note, F, Tree, Steps } from "../components/ui";

/* 01 아키텍처 — 손으로 그린 SVG 다이어그램 */
function ArchDiagram() {
  const band = "fill-white stroke-[#e5e8eb]";
  const box = "fill-white stroke-[#d7dce1]";
  const hot = "fill-[#3182f6]/[0.07] stroke-[#3182f6]/55";
  const label = "fill-[#191f28] text-[12.5px]";
  const sub = "fill-[#8b95a1] text-[10.5px] font-mono";
  const items = [
    ["홈", "자산", "거래 내역", "투자"],
    ["카지노", "분석", "AI 분석", "설정"],
  ];
  const svc = [
    ["순자산 계산", "거래·이체", "투자 스냅샷", "프랍 관리"],
    ["크립토 시세", "카지노 세션", "카테고리·태그", "AI 프롬프트"],
  ];
  const xs = [40, 205, 370, 535];
  return (
    <figure className="reveal">
      <figcaption className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        그림 1-1 · 5계층 아키텍처와 데이터 흐름
      </figcaption>
      <div className="overflow-x-auto border border-rule bg-card p-3 md:p-5">
        <svg viewBox="0 0 900 610" className="h-auto w-full min-w-[680px]" role="img" aria-label="잘살아보세 5계층 아키텍처 다이어그램">
          <defs>
            <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill="#3182f6" />
            </marker>
            <marker id="arg" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill="#8b95a1" />
            </marker>
          </defs>

          {/* 배경 밴드 */}
          <rect x="24" y="34" width="676" height="118" className={band} />
          <rect x="24" y="188" width="676" height="118" className={band} />
          <rect x="24" y="342" width="676" height="86" className={band} />
          <rect x="24" y="464" width="676" height="118" className={band} />

          {/* 계층 라벨 */}
          <text x="34" y="26" className={sub}>L1 · PRESENTATION (React Components)</text>
          <text x="34" y="180" className={sub}>L2 · APPLICATION (Use-case Services)</text>
          <text x="34" y="334" className={sub}>L3 · DOMAIN (Entities + Pure Calculation)</text>
          <text x="34" y="456" className={sub}>L4 · PERSISTENCE (Repository → IndexedDB)</text>

          {/* L1 박스 */}
          {items.map((row, r) =>
            row.map((t, i) => (
              <g key={`l1-${r}-${i}`}>
                <rect x={xs[i]} y={r === 0 ? 50 : 96} width="145" height="34" rx="2" className={box} />
                <text x={xs[i] + 72.5} y={r === 0 ? 71 : 117} textAnchor="middle" className={label}>{t}</text>
              </g>
            )),
          )}

          {/* L1 → L2 화살표 */}
          {[112, 300, 480].map((x) => (
            <line key={`a1-${x}`} x1={x} y1="134" x2={x} y2="184" stroke="#3182f6" strokeWidth="1.4" markerEnd="url(#ar)" />
          ))}
          <text x="120" y="164" className={sub}>dispatch</text>

          {/* L2 박스 */}
          {svc.map((row, r) =>
            row.map((t, i) => (
              <g key={`l2-${r}-${i}`}>
                <rect x={xs[i]} y={r === 0 ? 204 : 250} width="145" height="34" rx="2" className={box} />
                <text x={xs[i] + 72.5} y={r === 0 ? 225 : 271} textAnchor="middle" className={label}>{t}</text>
              </g>
            )),
          )}

          {[112, 300, 480].map((x) => (
            <line key={`a2-${x}`} x1={x} y1="288" x2={x} y2="340" stroke="#3182f6" strokeWidth="1.4" markerEnd="url(#ar)" />
          ))}

          {/* L3 */}
          <rect x="40" y="358" width="330" height="56" rx="2" className={box} />
          <text x="54" y="380" className={label}>엔티티 (기록된 사실)</text>
          <text x="54" y="400" className={sub}>Account · Transaction · Snapshot · PropAccount</text>
          <rect x="390" y="358" width="290" height="56" rx="2" className={hot} />
          <text x="404" y="380" className={label}>순수 계산 함수 (UI 미의존)</text>
          <text x="404" y="400" className={sub}>netWorth() · toBase() · tradePnl() · sessionPnl()</text>

          <line x1="380" y1="386" x2="392" y2="386" stroke="#8b95a1" strokeWidth="1.4" markerEnd="url(#arg)" />

          {[200, 500].map((x) => (
            <line key={`a3-${x}`} x1={x} y1="418" x2={x} y2="462" stroke="#3182f6" strokeWidth="1.4" markerEnd="url(#ar)" />
          ))}
          <text x="208" y="446" className={sub}>CRUD</text>

          {/* L4 */}
          <rect x="40" y="478" width="640" height="34" rx="2" className={box} />
          <text x="360" y="500" textAnchor="middle" className={label}>Repository 인터페이스 (추상화 · 구현체 교체 가능)</text>
          <rect x="40" y="524" width="640" height="44" rx="2" className={hot} />
          <text x="360" y="544" textAnchor="middle" className={label}>IndexedDB — schemaVersion + 자동 마이그레이션</text>
          <text x="360" y="561" textAnchor="middle" className={sub}>stores: meta · accounts · tx · inv · prop · crypto · casino</text>

          {/* 우측 외부 경계 */}
          <rect x="716" y="34" width="164" height="118" rx="2" className="fill-[#f6f8fa] stroke-[#e5e8eb] stroke-dasharray=" />
          <text x="798" y="60" textAnchor="middle" className={label}>외부 시세 API</text>
          <text x="798" y="80" textAnchor="middle" className={sub}>CoinGecko · 환율 수동입력</text>
          <text x="798" y="102" textAnchor="middle" className={sub}>실패 시 마지막 정상가 유지</text>
          <text x="798" y="132" textAnchor="middle" className={sub}>→ 수량·거래기록 무관</text>

          <rect x="716" y="188" width="164" height="86" rx="2" className={band} />
          <text x="798" y="214" textAnchor="middle" className={label}>시세 동기화 어댑터</text>
          <text x="798" y="236" textAnchor="middle" className={sub}>자동 · 수동 새로고침</text>
          <text x="798" y="258" textAnchor="middle" className={sub}>lastSyncedAt · source</text>
          <line x1="716" y1="90" x2="798" y2="186" stroke="#8b95a1" strokeWidth="1.3" strokeDasharray="4 4" markerEnd="url(#arg)" />
          <line x1="716" y1="231" x2="670" y2="267" stroke="#3182f6" strokeWidth="1.4" markerEnd="url(#ar)" />

          <rect x="716" y="304" width="164" height="60" rx="2" className={band} />
          <text x="798" y="330" textAnchor="middle" className={label}>백업 / 복원</text>
          <text x="798" y="350" textAnchor="middle" className={sub}>JSON + Zod 검증 + 버전</text>
          <line x1="716" y1="334" x2="670" y2="392" stroke="#3182f6" strokeWidth="1.4" markerEnd="url(#ar)" />

          <rect x="716" y="392" width="164" height="60" rx="2" className={band} />
          <text x="798" y="418" textAnchor="middle" className={label}>Capacitor</text>
          <text x="798" y="438" textAnchor="middle" className={sub}>Android 네이티브 셸</text>
          <line x1="716" y1="422" x2="670" y2="496" stroke="#8b95a1" strokeWidth="1.3" strokeDasharray="4 4" markerEnd="url(#arg)" />

          <rect x="716" y="478" width="164" height="90" rx="2" className={hot} />
          <text x="798" y="504" textAnchor="middle" className={label}>로컬 우선 저장</text>
          <text x="798" y="526" textAnchor="middle" className={sub}>오프라인 100% 동작</text>
          <text x="798" y="548" textAnchor="middle" className={sub}>온라인 = 시세 동기화만</text>
        </svg>
      </div>
      <p className="mt-2 font-mono text-[11.5px] text-muted">
        실선 = 동기식 호출 · 점선 = 선택적(오프라인 가능) 경로 · 블루 면 = 순자산 계산의 단일 진입점
      </p>
    </figure>
  );
}

export function Part1() {
  return (
    <>
      <Sec id="s01" num="01" kicker="Architecture" title="전체 시스템 아키텍처">
        <P lead>
          「잘살아보세」는 <b>표현 · 애픔리케이션 · 도메인 · 영속성</b> 4계층을 분리한 단일 SPA다. 핵심 규칙은 하나다. —
          <b> UI는 아무 계산도 하지 않는다.</b> 화면은 저장소에서 "이미 계산된 값"과 "원본 기록"만 받는다. 순자산·손익·환율
          환산은 전부 도메인 계층의 순수 함수가 담당하므로, 동일한 로직이 웹과 Android APK에서 완전히 동일하게 동작한다.
        </P>

        <ArchDiagram />

        <H3 no="1-1">계층별 책임</H3>
        <T
          caption="표 1-1 · 계층 책임과 파일 예시"
          head={["계층", "책임", "파스 예시", "의존 방향"]}
          rows={[
            ["L1 표현", "렌더링 · 입력 수집 · 라우팅 · 반응형 레이아웃. 계산 금지, 상태 표시만", "src/screens/Home.tsx", "L2만 호출"],
            ["L2 애플리케이션", "유스케이스 조합(하나의 사용자 행위 = 하나의 서비스 함수), 트랜잭션 경계", "src/services/netWorthService.ts", "L3, L4"],
            ["L3 도메인", "엔티티 타입 + 순수 계산 함수. 시간·네트워크·DB에 의존하지 않음", "src/domain/calc/*.ts", "없음 (리프)"],
            ["L4 영속성", "Repository 인터페이스 구현. 스키마 버전 관리와 마이그레이션", "src/data/repo/*.ts", "IndexedDB"],
            ["횡적 모듈", "FX 환율 · 시세 동기화 · AI 프롬프트 생성 · 백업 직렬화", "src/modules/{fx,price,ai,backup}", "L3만"],
          ]}
        />

        <H3 no="1-2">데이터 흐름 (한 번의 잔액 수정)</H3>
        <Steps
          items={[
            { t: "사용자 입력", d: "예: 자산 → ABA 계좌 → 잔액 수정 → $7,000 입력, 확인 버튼." },
            { t: "유스케이스 검증", d: "accountService.updateBalance(id, 7000) — 음수 잔액·존재하지 않는 계좌·보관 장소 중복을 차단." },
            { t: "원본 기록 저장", d: "accounts.currentBalance 갱신 + balanceAdjustments 감사 기록(전/후 값, 사유, 시각)을 같은 IndexedDB 트랜잭션에서 저장." },
            { t: "파생값 무효화", d: "netWorth 캐시 태그 invalidated → 다음 프레임에서 domain/calc/netWorth() 재실행." },
            { t: "영향 예측", d: "home 상단 총액, 자산 요약 카드, 분석 그래프, AI 프롬프트가 모두 같은 순수 함수 결과를 받으므로 한 화면이라도 어긋나지 않는다." },
            { t: "영속화", d: "IndexedDB 커밋 실패 시 입력값을 되돌리고 토스트로 재시도를 요구한다(부분 저장 금지)." },
          ]}
        />

        <Note tone="blue" title="왜 순수 함수인가">
          환율이 바뀌면 그래프·홈·분석·AI 프롬프트가 동시에 달라져야 한다. 계산이 4곳에 흩어져 있으면 반드시 어긋난다.
          <b> netWorth(snapshot, rates, base) 한 곳</b>만 두고 모든 화면이 같은 값을 참조하게 만든다. 이것이 이 설계의
          1순위 무결성 조건이다.
        </Note>

        <H3 no="1-3">오프라인 / 온라인 경계</H3>
        <T
          head={["기능", "오프라인", "온라인 필요", "실패 시 동작"]}
          rows={[
            ["전체 자산 조회·입력·수정", "○ 동작", "—", "없음"],
            ["거래·이체·카지노 기록", "○ 동작", "—", "없음"],
            ["환율 수동 입력", "○ 동작", "—", "없음"],
            ["암호화폐 시세 자동 동기화", "✕ 보류", "○", "마지막 정상 가격 + ‘오프라인(마지막 동기화 HH:MM)’ 배지"],
            ["시세 수동 새로고침", "✕ 에러 토스트", "○", "동일"],
            ["백업 JSON 내보내기/복원", "○ 동작", "—", "—"],
            ["AI API 직접 호출(향후)", "✕", "○", "프롬프트 복사 방식으로 대체"],
          ]}
          note="온라인 기능은 navigator.onLine + fetch 타임아웃(5s) 이중으로 판정한다."
        />
      </Sec>

      <Sec id="s02" num="02" kicker="Technology" title="기술 스택과 선택 이유">
        <P lead>
          기준은 <b>개인이 10년간 매일 쓰는 도구</b>다. 복잡한 서버·빌드 체인은 버린다. 모든 데이터는 기기 안에 있고, 서버는
          존재하지 않는다. 아래 스택은 이 조건에서 유지보수 비용이 가장 낮은 조합이다.
        </P>

        <T
          caption="표 2-1 · 확정 스택"
          head={["영역", "선택", "선택 이유", "대안과 기각 사유"]}
          rows={[
            ["언어", "TypeScript (strict)", "자산 계산은 부동소수점·통화·시점 실수가 치명적. 타입으로 잔액 단위와 통화를 강제", "JavaScript — 환율/통화 혼동 감수 불가"],
            ["프레임워크", "React 18 + Vite", "생태계 최다, Capacitor와 무관하게 빌드, HMR로 개발 속도", "Next.js — SSR/서버가 필요 없음(정적 단일 페이지)"],
            ["상태", "Zustand + 슬라이스 분리", "보일러플레이트 없고, 슬라이스별 persist를 IndexedDB 어댑터로 연결 가능", "Redux Toolkit — 장식过多, 개인 프로젝트 과대; Context — 빈번한 리렌더"],
            ["스타일", "Tailwind CSS v4", "Toss식 밝은 디자인 토큰을 @theme 한 곳에서 관리", "CSS Modules — 디자인 변경 주기 대비 비효율"],
            ["차트", "Recharts", "선·막대·원형 충분, SVG 기반이라 인쇄/확대에도 선명", "Chart.js — 캔버스라 텍스트 선택·접근성 불리; D3 — 과대"],
            ["저장", "IndexedDB (idb 래퍼)", "용량 대(수만 거래), 비동기, 트랜잭션 보장, JSON 직렬화 한계 없음", "localStorage — 5MB·동기 블록, 거래 수천 건에서 한계; SQLite(wasm) — 과대"],
            ["검증", "Zod", "백업 복원 시 스키마 버전별 검증을 선언적으로", "유효성 직접 작성 — 버전마다 코드 중복"],
            ["아이콘", "lucide-react", "가벼움(트리 셰이킹), 선 아이콘이 밝은 UI와 조화", "react-icons — 번들 덩어리; 이모지 — 일관성 붕괴"],
            ["테스트", "Vitest + Testing Library + Playwright", "Vite와 동일한 런타임, 단위/통합/E2E 3층 커버", "Jest — ESM·Vite 조합 마찰"],
            ["패키징", "Capacitor 7", "웹 소스 그대로 Android 셸에 삽입, 네이티브 저장·백업 공유 가능", "React Native — 전면 재작성, 웹 코드 재사용 불가"],
            ["날짜", "date-fns + Intl", "Asia/Phnom_Penh 고정 포맷과 한국식 표기(2026. 3. 12.) 지원", "moment — 폐기 상태"],
          ]}
        />

        <H3 no="2-1">폴더 구조</H3>
        <Tree
          lines={[
            "jalsalabose/",
            "├─ src/",
            "│  ├─ screens/                 # L1 화면 (홈·자산·내역·투자·카지노·분석·AI·설정)",
            "│  ├─ components/              # 공통 UI (Card, Sheet, NumberField, SegmentedControl)",
            "│  ├─ services/                # L2 유스케이스",
            "│  ├─ domain/calc/             # L3 순수 함수: netWorth, fx, tradePnl, sessionPnl",
            "│  ├─ domain/types/            # 엔티티 인터페이스 + enums",
            "│  ├─ data/repo/               # L4 저장소 구현 (IndexedDB)",
            "│  ├─ data/migrations/         # v1→v2→… 마이그레이션 체인",
            "│  ├─ modules/{fx,price,ai,backup}/",
            "│  ├─ stores/                  # Zustand 슬라이스",
            "│  ├─ assets/                  # 표지 등 정적 이미지 (번들 인라인)",
            "│  ├─ styles/index.css         # @theme 디자인 토큰",
            "│  └─ App.tsx",
            "├─ tests/{unit,integration,e2e}/",
            "├─ capacitor.config.ts",
            "└─ README.md",
          ]}
        />

        <H3 no="2-2">설계 원칙 5가지</H3>
        <L
          items={[
            <><b>유형은 데이터로 확장한다.</b> 계좌 유형·금융기관·국가·카테고리·태그는 전부 사전(dictionary) 테이블이다. 새 유형 추가는 INSERT 한 줄이며 스키마 변경이 없다.</>,
            <><b>원본은 절대 덮어쓰지 않는다.</b> 거래·환율·시세는 이력형이다. 수정 시에도 원본 통화·당시 환율·수수료를 보존하고 새 버전을 쓴다.</>,
            <><b>내부 이동은 수입/지출이 아니다.</b> 이체·현금 인출·카지노 Buy-in은 자산 총합의 변화량이 0이어야 한다(검증 테스트로 고정).</>,
            <><b>소유하지 않은 것은 세지 않는다.</b> 프랍 명목 계정·미지급 수익·진행 중 칩은 순자산에서 배제하고 별도 지표로만 표시한다.</>,
            <><b>백업은 1차 기능이다.</b> 모든 변경은 즉시 로컬에 반영되며, JSON 내보내기 하나로 전체 상태가 재현된다.</>,
          ]}
        />
      </Sec>

      <Sec id="s03" num="03" kicker="Database" title="데이터베이스 전체 구조">
        <P lead>
          저장소는 <b>IndexedDB 1개, 스토어 24개</b>다. 모든 스토어는 <span className="font-mono text-[13px]">id (string, UUID v4)</span>를
          기본키로 갖고, 외래키는 원본을 복제하지 않고 ID만 참조한다(참조 무결성은 저장소 계층에서 보증). 아래 표가 구현 시 그대로
          들어가는 스키마다.
        </P>

        <H3 no="3-1">공통 · 기준 데이터</H3>
        <T
          caption="표 3-1 · 사전형(擴張 전용) 스토어"
          head={["스토어", "핵심 필드 (타입)", "인덱스", "삭제 정책 / 비고"]}
          rows={[
            ["meta", "key:string PK · value:any · updatedAt:number", "—", "schemaVersion, baseCurrency, maskAmounts 등 앱 설정 1건"],
            ["countries", "id · code(ISO-3166) · name · symbol · sortOrder · isSystem:boolean", "code", "isSystem=1은 삭제 불가. 사용자 추가 가능"],
            ["institutions", "id · countryId FK · name · kind(bank/broker/exchange/prop/other) · logoKey · isSystem · sortOrder", "countryId, kind", "계좌가 참조 중이면 삭제 대신 archivedAt"],
            ["accountTypes", "id · code · label · group(bank/cash/invest/crypto/prop/other) · includesInNetWorth:boolean · icon · sortOrder", "code, group", "<b>핵심:</b> 새 유형 = INSERT. includesInNetWorth로 순자산 편입을 데이터로 제어"],
            ["cashLocations", "id · name · kind(wallet/safe/office/other) · currency · openingBalance:number · accountId? · memo · sortOrder", "kind", "지갑/집 금고/사무실 금고. 계좌와 독립 잔액"],
            ["categories", "id · kind(income/expense) · name · icon · sortOrder · archivedAt?", "kind, sortOrder", "삭제 시 archivedAt만 setting → 과거 거래의 categoryId는 보존"],
            ["tags", "id · name · color · sortOrder · archivedAt?", "name(unique)", "다대다는 transactionTags가 처리"],
            ["transactionTags", "transactionId FK · tagId FK · PK(Composite)", "transactionId, tagId", "거래 삭제 시 함께 삭제(cascade)"],
            ["exchangeRates", "id · quote USD(고정) · base(KRW/KHR/…) · rate:number · effectiveAt:number · source(manual/import) · memo", "base+effectiveAt", "<b>이력형.</b> 추가만 하고 갱신하지 않는다. 현재 환율 = effectiveAt 최댓값"],
            ["backupMetadata", "id · exportedAt · appVersion · schemaVersion · recordCounts:json · checksum:string", "exportedAt", "백업 파일 헤더. 복원 시 첫 검증 대상"],
          ]}
          note="accountTypes.includesInNetWorth 가 순자산 배제 규칙의 단일 스위치다 — 프랍·카지노 관련 유형은 이 값이 false."
        />

        <H3 no="3-2">계좌 · 거래</H3>
        <T
          caption="표 3-2 · 핵심 자산 스토어"
          head={["스토어", "핵심 필드 (타입)", "인덱스", "삭제 정책 / 비고"]}
          rows={[
            ["accounts", "id · alias · accountTypeId FK · institutionId? FK · countryId FK · currency(USD/KRW/KHR/…) · openingBalance · currentBalance:number · memo · icon · isFavorite · isCashLike · archivedAt? · createdAt", "institutionId, accountTypeId, currency, archivedAt", "거래 잔존 시 삭제 금지, archivedAt 숨김 처리. currentBalance는 파생 잔액의 캐시(원본은 transactions/snapshots)"],
            ["balanceAdjustments", "id · accountId FK · before · after · reason(enum) · note · createdAt", "accountId, createdAt", "잔액 수동 수정 감사 로그. 스냅샷 재계산 근거"],
            ["transactions", "id · type(income/expense/transfer/adjust) · subType(remittance/family/…) · amount:number · currency · fxRateId FK · amountBase:number · date:number(UTC ms) · accountId FK · toAccountId? FK · categoryId? FK · counterparty? · memo · tags(경로) · createdAt · updatedAt · deletedAt?", "date, accountId, type, deletedAt", "<b>원본 보존.</b> amount·currency·fxRateId·amountBase 4개를 항상 함께 저장. 삭제는 소프트 delete"],
            ["transfers", "(transactions.type='transfer' 로 표현) · fee:number · feeCurrency · note", "—", "내부 이체는 income/expense 로 절대 만들지 않는다. amountBase 합계 = 0 검증"],
            ["investAccounts", "accountId PK/FK(1:1) · brokerType(overseas/domestic) · marketType(future/cfd/stock/…) · settlementCurrency · memo", "brokerType", "Accounts를 상속하되 스냅샷 전용 필드만 분리 → 중복 잔액 방지"],
            ["invSnapshots", "id · accountId FK · date(YYYY-MM-DD string) · endBalance:number · deposit · withdrawal · memo · tradePnl(계산 캐시) · createdAt", "accountId+date(unique)", "<b>일일 1건.</b> 개별 체결 입력 없음. tradePnl = endBalance − prevEndBalance − deposit + withdrawal"],
          ]}
          note="invSnapshots 의 date 는 로컬 날짜 문자열(Asia/Phnom_Penh)로 저장해时區 경계로 어긋나는 문제를 원천 차단한다."
        />

        <H3 no="3-3">프랍 트레이딩</H3>
        <T
          caption="표 3-3 · 프랍 도메인 (순자산 외부)"
          head={["스토어", "핵심 필드 (타입)", "인덱스", "삭제 정책 / 비고"]}
          rows={[
            ["propFirms", "id · name · countryId? · website · memo · sortOrder", "name", "FTMO, FundedNext 등. 회사-계정 1:N"],
            ["propAccounts", "id · propFirmId FK · alias · accountKind(evaluation/funded) · nominalSize:number · startBalance · currentBalance · targetProfit · maxDailyLoss · maxTotalLoss · status(평가/펀딩/거래중/통과/탈락/종료) · feePaid · feeCurrency · payoutRequested · payoutReceived · payoutCurrency · memo", "propFirmId, status", "<b>nominalSize·currentBalance는 순자산에서 제외.</b> payoutReceived 만 실제 수령 계좌에 입금 기록"],
            ["propSnapshots", "id · propAccountId FK · date · balance · dailyPnl · statusNote", "propAccountId+date", "성과 곡선용. 순자산 그래프에는 연결하지 않음"],
            ["propPayouts", "id · propAccountId FK · amount · currency · fxRateId · receivedAt · toAccountId FK · fee · memo", "propAccountId, receivedAt", "<b>실제 지급 시에만</b> accounts 잔액 증가 + income 거래 1건 생성"],
          ]}
        />

        <H3 no="3-4">암호화폐</H3>
        <T
          caption="표 3-4 · 지갑 · 시세"
          head={["스토어", "핵심 필드 (타입)", "인덱스", "삭제 정책 / 비고"]}
          rows={[
            ["cryptoWallets", "id · name · kind(krExchange/overseasExchange/software/hardware/paper) · countryId? · institutionId? · memo · sortOrder", "kind", "업비트·바이낸스·SafePal·Trust Wallet·Trezor 각각 1행"],
            ["cryptoAssets", "id · walletId FK · symbol(BTC/ETH/USDT) · quantity:number(소수 18자리) · manualPrice? · note", "walletId+symbol(unique)", "<b>수량은 거래에서만 변한다.</b> 시세 동기화는 이 테이블을 절대 쓰지 않는다"],
            ["cryptoPrices", "symbol PK · price:number · currency · source · fetchedAt · isStale:boolean", "fetchedAt", "성공 시 갱신, 실패 시 이전 값 유지 + isStale"],
            ["cryptoTransactions", "id · walletId FK · type(deposit/withdrawal/transfer/swap/fee) · symbol · quantity · feeSymbol · feeQuantity · fromWalletId? · toWalletId? · counterparty?(예: 카지노) · usdValueAtTime · fxRateId? · txDate · network? · memo", "walletId, txDate", "지갑 간 이동은 수량 합계 보존, 출발지-도착지 기록. USDT 전송·네트워크 수수료 분리 기록"],
          ]}
        />

        <H3 no="3-5">카지노</H3>
        <T
          caption="표 3-5 · 카지노 도메인 (자산과 완전 분리)"
          head={["스토어", "핵심 필드 (타입)", "인덱스", "삭제 정책 / 비고"]}
          rows={[
            ["casinos", "id · name · countryId? · city · memo · sortOrder · archivedAt?", "name", "나가1, 나가2 … 사용자 추가"],
            ["casinoSessions", "id · casinoId FK · startedAt · endedAt? · status(ongoing/closed) · baseCurrency · memo", "casinoId, status", "첫 Buy-in으로 자동 생성. 종료 시 미정산 확인 후 close"],
            ["casinoBuyIns", "id · sessionId FK · fromType(account/cashLocation/cryptoWallet) · fromId · amount · currency · fxRateId · chipAmount · chipCurrency · fxFee · date · memo", "sessionId, date", "출발 자산 잔액 차감. 다중 Buy-in 허용"],
            ["casinoCashOuts", "id · sessionId FK · totalAmount · currency · fxRateId · fee · date · memo", "sessionId, date", "분할 수령을 위해 1:N legs 로 분리"],
            ["casinoCashOutLegs", "id · cashOutId FK · toType(account/cashLocation/cryptoWallet) · toId · amount · currency · memo", "cashOutId", "<b>예: ABA $1,500 + 금고 $1,000</b> → legs 2행. 각 잔액에 정확히 반영"],
            ["casinoSettlements", "id · sessionId FK · closedAt · totalBuyIn · totalCashOut · sessionPnl · currency · note", "sessionId", "세션 종료 시 1행 생성. 이후 수정 금지(감사)"],
          ]}
          note="진행 중 세션의 미현금 칩은 어떤 스토어에도 잔액으로 존재하지 않는다 — 오직 buyIn/cashOut 합계로만 표현된다."
        />

        <H3 no="3-6">스키마 버전과 마이그레이션</H3>
        <F label="IndexedDB onupgradeneeded 체인 (pseudo)">
          {`version = 1..n
meta.schemaVersion = 3
migrations = [ v1_createStores, v2_addPropPayouts, v3_addCashOutLegs ]

openDB(...) → tx 실행:
  if (storedVersion < targetVersion) {
    for (m of migrations.slice(storedVersion)) m(tx)   // 순차 · 부분 실행 금지
    meta.schemaVersion = targetVersion
  }
백업 파일도 동일한 버전 번호를携带 → 복원 시 마이그레이션을 먼저 실행하고 Zod로 검증`}
        </F>
        <L
          items={[
            <><b>向前 호환:</b> 마이그레이션은 항상 "새 스토어/새 필드 추가 + 기본값 채움"만 한다. 기존 필드 삭제·이름 변경은 다음 마이그레이션에서 원본을 복사한 뒤에 수행한다.</>,
            <><b>실패 복구:</b> 마이그레이션 실패 시 자동으로 백업 JSON을 로컬에 1개 남긴다(최대 5MB 초과 시 사용자 확인).</>,
            <><b>다운그레이드 금지:</b> 낮은 버전 앱으로 열면 "데이터 버전이 더 높습니다" 안내만 표시하고 읽기만 허용한다.</>,
          ]}
        />

        <H3 no="3-7">삭제 정책 요약</H3>
        <T
          head={["대상", "정책", "이유"]}
          rows={[
            ["거래(Transaction)", "소프트 삭제 deletedAt", "과거 잔액·통계가 흔들리지 않아야 함"],
            ["계좌·지갑·보관 장소", "archivedAt (사용 중이면 삭제 차단)", "과거 거래의 외래키 보존"],
            ["카테고리·태그", "archivedAt + 이름 변경은 새 레코드", "과거 거래 표시가 바뀌지 않음"],
            ["카지노 세션", "삭제 불가, 대신 ‘취소’ 상태", "자금 흐름 감사"],
            ["환율·시세", "삭제 금지 (이력)", "과거 거산의 amountBase 재현"],
            ["프랍 스냅샷", "세션/계정 삭제 시 cascade", "소유하지 않은 데이터라 보존 가치 낮음"],
          ]}
        />
      </Sec>
    </>
  );
}
