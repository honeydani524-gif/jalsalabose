import { useEffect, useState } from "react";
import { Sec, H3, P, L, T, Note, Cmd, Tree } from "../components/ui";

/* 승인 체크리스트 — localStorage에 실제 저장된다 */
const APPROVAL_ITEMS = [
  "계좌 4축(국가·기관·유형·통화) 독립 구조에 동의한다",
  "프랍 명목/미지급 수익과 카지노 진행 중 칩을 순자산에서 제외하는 규칙에 동의한다",
  "일일 평가잔액 스냅샷 방식(개별 매매 미입력)에 동의한다",
  "환율 이력 보존 — 과거 거래의 amountBase가 바뀌지 않는 설계에 동의한다",
  "카지노는 별도 잔액을 두지 않고 출발지·도착지 이동으로만 기록하는 설계에 동의한다",
  "IndexedDB 단일 저장소 + 스키마 버전 마이그레이션에 동의한다",
  "1단계 설계 승인 → 2단계(프로젝트 초기 구성)로 진행한다",
];

function Approval() {
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem("jalsalabose.approval");
      if (raw) return JSON.parse(raw);
    } catch {
      /* 저장 불가 시 기본값 */
    }
    return APPROVAL_ITEMS.map(() => false);
  });

  useEffect(() => {
    try {
      localStorage.setItem("jalsalabose.approval", JSON.stringify(done));
    } catch {
      /* 조용히 무시 */
    }
  }, [done]);

  const n = done.filter(Boolean).length;
  const all = n === APPROVAL_ITEMS.length;

  return (
    <div className="reveal border border-ink/15 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-[#f6f8fa] px-4 py-3 md:px-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          승인 체크리스트 · 상태 저장 로컬
        </div>
        <div
          className={`font-mono text-[12px] font-bold ${all ? "text-pos" : "text-warn"}`}
          aria-live="polite"
        >
          {n} / {APPROVAL_ITEMS.length} 확인 {all ? "· 승인 가능" : "· 검토 대기"}
        </div>
      </div>
      <ul className="divide-y divide-rule">
        {APPROVAL_ITEMS.map((t, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-[#f9fbfd] md:px-5">
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() =>
                  setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#3182f6]"
              />
              <span
                className={`text-[14.5px] leading-[1.7] ${
                  done[i] ? "text-muted line-through" : "text-ink/85"
                }`}
              >
                {t}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="border-t border-ink/15 bg-[#f6f8fa] px-4 py-4 md:px-5">
        <p className="max-w-[70ch] text-[14.5px] leading-[1.8] text-ink/80">
          {all ? (
            <>
              <b className="text-pos">7개 항목 모두 확인되었습니다.</b> 위 설계를 승인으로 간주하고 2단계(프로젝트 초기
              구성 · 디자인 시스템 · 공통 컴포넌트)로 진행합니다. 승인 전까지 소스 코드는 생성하지 않습니다.
            </>
          ) : (
            <>
              설계를 검토하신 뒤 위 항목을 모두 확인해 주세요. <b>승인 전까지 앱 소스 코드는 한 줄도 작성하지 않습니다.</b>{" "}
              수정이 필요한 항목은 항목 번호와 함께 알려주시면 설계 문서를 즉시 반영합니다.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function Part4() {
  return (
    <>
      <Sec id="s13" num="13" kicker="Testing" title="테스트 계획">
        <P lead>
          자산 관리 앱의 버그는 곧 <b>돈이 틀리는 것</b>이다. 계산 순수 함수를 단위 테스트로 완전히 덮고, 자금 흐름을
          통합 테스트로 고정한 뒤, 화면은 E2E로 확인하는 3층 전략을 쓴다.
        </P>

        <H3 no="13-1">단위 테스트 (Vitest · domain/calc)</H3>
        <T
          caption="표 13-1 · 필수 단위 테스트 (Given → When → Then)"
          head={["#", "케이스", "Given → When → Then"]}
          rows={[
            ["U-01", "내부 이체 불변식", "ABA 12,000 → 지갑 2,000·금고 3,000 이체 → ΔNW === 0"],
            ["U-02", "다중 통화 합산", "₩18,000,000 + $3,200, rate 1385, base USD → 12,996.39 + 3,200 = 16,196.39"],
            ["U-03", "매매손익 분리", "prev 10,000 / dep 1,000 / wd 500 / end 10,800 → 300"],
            ["U-04", "프랍 배제", "nominal 100,000 + bank 5,000 → NW === 5,000"],
            ["U-05", "프랍 지급 반영", "payout 1,000 → NW +1,000, prop.currentBalance 불변"],
            ["U-06", "미지급 수익 배제", "payoutRequested 2,150 / received 0 → NW 변화 0"],
            ["U-07", "카지노 Buy-in", "ABA 7,500에서 2,000 Buy-in → NW 7,500 + 지갑/금고 그대로, income 0건"],
            ["U-08", "카지노 손익", "buyIn 2,500 / cashOut 3,000 → +500, NW 변화와 동일"],
            ["U-09", "분할 Cash-out 검증", "legs 합계 2,500 ≠ total 2,510 → 저장 거부(에러)"],
            ["U-10", "환율 이력 보존", "rate 1,390→1,400 재설정 후 과거 amountBase 719.42 불변"],
            ["U-11", "기준 통화 재환산", "base KRW→KHR 변경 시 각 자산 amountBase 재계산 결과 일치"],
            ["U-12", "시세 동기화 무결성", "동기화 전/후 cryptoAssets.quantity deep-equal"],
            ["U-13", "스냅샷 중복 허용", "같일 날 2회 입력 → upsert 1행, 이전 값 이력 보존"],
            ["U-14", "소프트 삭제", "거래 삭제 후 총자산·과거 그래프 불변, 목록에서만 숨김"],
            ["U-15", "계좌 유형 확장", "accountTypes INSERT 후 accounts 구조 변경 없이 필터 동작"],
            ["U-16", "현금 이동 검증", "도착지 합계 ≠ 출발 금액 → 거부"],
          ]}
        />

        <H3 no="13-2">통합 테스트 (IndexedDB 실제 저장소)</H3>
        <L
          items={[
            <><b>I-01 계좌 CRUD:</b> 등록 → 목록 표시 → 수정 → 보관(숨김) → 거래 존재 시 삭제 차단.</>,
            <><b>I-02 이체:</b> 시나리오 5 전체 흐름 후 accounts 잔액 3행 검증.</>,
            <><b>I-03 시나리오 6/7:</b> Buy-in·분할 Cash-out·세션 종료 후 settlements 값 검증.</>,
            <><b>I-04 백업/복원:</b> 500건 데이터 → JSON 내보내기 → 새 DB 복원 → 건수·합계 완전 일치.</>,
            <><b>I-05 스키마 마이그레이션:</b> v1 데이터로 열어 v3로 승격 후 데이터 손실 0.</>,
            <><b>I-06 오프라인:</b> network 차단 상태에서 거래 10건 입력 → 재동기화 후 정합.</>,
          ]}
        />

        <H3 no="13-3">E2E · 수동 검증</H3>
        <T
          head={["구분", "도구", "범위", "통과 기준"]}
          rows={[
            ["E2E (데스크톱)", "Playwright 1440×900", "홈 → 계좌 등록 → 이체 → 카지노 Buy-in → 분석 → 백업", "모든 시나리오 green, 콘솔 에러 0"],
            ["E2E (모바일)", "Playwright 390×844 + 터치", "하탭 이동, FAB 시트, 키보드 대응, 되돌아가기", "시트 닫힘/백 스택 정상"],
            ["수동", "Chrome · Safari · Firefox", "오프라인 토글, 파일 복원, 클립보드 복사", "3종 일치"],
            ["수동", "Android 기기 (Capacitor)", "오프라인 입력, 백 버튼, 날짜 선택, 재실행 후 데이터 유지", "기기 시나리오 통과"],
            ["회귀", "npm run test", "전체 단위+통합", "커버리지 domain/calc ≥ 95%"],
          ]}
        />
        <Note tone="red" title="출고 차단 조건">
          U-01 · U-04 · U-07 · U-10 네 케이스가 깨지면 <b>배포하지 않는다</b>. 이 네 개는 이 앱의 존재 이유(무엇이 진짜
          자산인가)에 직접 연결된다.
        </Note>
      </Sec>

      <Sec id="s14" num="14" kicker="Run" title="웹 실행 및 미리보기">
        <H3 no="14-1">환경 요구사항</H3>
        <L
          items={[
            <>Node.js <b>18.18 이상</b> (권장 20 LTS) · npm 9 이상 · Git 2.40 이상</>,
            <>브라우저: Chrome 110+ / Safari 16.4+ / Firefox 115+ (IndexedDB 필수)</>,
            <>서버 불필요 — 빌드 결과물은 정적 파일이며 모든 데이터는 브라저 로컬에 저장된다.</>,
          ]}
        />

        <H3 no="14-2">설치 · 실행 명령어</H3>
        <Cmd
          title="setup & dev"
          lines={[
            "git clone https://github.com/<사용자명>/jalsalabose.git",
            "cd jalsalabose && npm install",
            "npm run dev          # 개발 서버 http://localhost:5173",
          ]}
        />
        <Cmd
          title="build · test · preview"
          lines={[
            "npm run build        # 프로덕션 빌드 → dist/",
            "npm run preview      # 빌드 결과를 로컬에서 확인",
            "npm run test         # Vitest 단위 + 통합 테스트",
            "npm run test:e2e     # Playwright E2E",
            "npm run lint         # ESLint + TypeScript 검사",
          ]}
        />

        <H3 no="14-3">환경변수</H3>
        <Tree
          lines={[
            ".env",
            "VITE_APP_VERSION=0.1.0          # 앱 표시 버전",
            "VITE_SCHEMA_VERSION=3           # DB 스키마 버전 (마이그레이션과 일치해야 함)",
            "VITE_PRICE_API=https://api.coingecko.com/api/v3   # 시세 API (선택)",
            "VITE_PRICE_API_KEY=             # 키가 필요하면 (없어도 수동 시세 동작)",
            "",
            "# ※ 비어 있어도 앱은 완전히 동작한다. 시세 자동화만 비활성화된다.",
          ]}
        />

        <H3 no="14-4">배포 (정적 호스팅)</H3>
        <Cmd
          title="deploy"
          lines={[
            "npm run build",
            "npx vercel deploy --prod        # 또는",
            "npx gh-pages -d dist            # GitHub Pages",
          ]}
        />
        <Note tone="blue" title="미리보기 체크">
          빌드 후 <span className="font-mono text-[12px]">dist/index.html</span>을 열어 ① 총자산 표시 ② 계좌 등록 ③ 이체 후
          총자산 불변 ④ 새로고침 후 데이터 유지의 4가지를 반드시 확인한다.
        </Note>
      </Sec>

      <Sec id="s15" num="15" kicker="GitHub" title="GitHub 업로드 방법">
        <Cmd
          title="first push"
          lines={[
            "git init",
            "git add .",
            'git commit -m "1단계: 전체 설계 문서 및 프로젝트 초기 구성"',
            "git branch -M main",
            "git remote add origin https://github.com/<사용자명>/jalsalabose.git",
            "git push -u origin main",
          ]}
        />
        <Tree
          lines={[
            "# .gitignore (핵심만)",
            "node_modules/",
            "dist/",
            ".env.local",
            "android/            # Capacitor 네이티브 프로젝트는 12단계에서 별도 관리",
            "*.local",
          ]}
        />
        <L
          items={[
            <><b>README.md</b>에는 아래 순서로 한국어 작성한다: 소개 → 주요 기능 → 스크린샷 → 요구사항 → 설치 → 실행 → 빌드 → 테스트 → 환경변수 → 데이터 구조 요약 → 백업/복원 → Android 빌드 → 라이선스 → 개발자(해외선물 트레이딩/프랍 · Telegram @wti0816).</>,
            <><b>커밋 규칙:</b> 기능 단위 커밋. “잔액 계산 버그 수정”처럼 <span className="font-mono text-[12px]">type: summary</span> 형식을 지킨다.</>,
            <><b>비공개 권장:</b> 개인 금융 데이터 앱이므로 저장소 Private을 권장한다. 공개 시에는 샘플 데이터만 포함한다.</>,
          ]}
        />
      </Sec>

      <Sec id="s16" num="16" kicker="Android" title="Android APK 제작">
        <P lead>
          웹과 Android는 <b>동일한 소스 · 동일한 도메인 로직 · 동일한 IndexedDB 스키마</b>를 공유한다. 네이티브는 셸일 뿐이다.
        </P>

        <Cmd
          title="capacitor setup"
          lines={[
            "npm install @capacitor/core @capacitor/cli @capacitor/android",
            "npm install @capacitor/keyboard @capacitor/app @capacitor/filesystem",
            "npx cap init 잘살아보세 com.jalsalabose.app --web-dir=dist",
            "npm run build && npx cap add android",
            "npx cap sync android",
          ]}
        />
        <Cmd
          title="build apk"
          lines={[
            "npm run build && npx cap sync android",
            "cd android && ./gradlew assembleDebug      # 디버그 APK",
            "./gradlew assembleRelease                 # 릴리스 (키스토어 서명 필요)",
            "# 산출: android/app/build/outputs/apk/release/app-release.apk",
          ]}
        />

        <H3 no="16-1">네이티브 대응 항목</H3>
        <T
          head={["항목", "설정", "검증"]}
          rows={[
            ["화면 최적화", "viewport-fit=cover + safe-area 인셋, 하단 탭에 고정 여백", "노치 기기에서 탭 가림 없음"],
            ["모바일 키보드", "@capacitor/keyboard: resize body, 용도별 키보드(숫자)", "금액 입력 시 저장 버튼 가려지지 않음"],
            ["날짜 선택", "네이티브 date/time 픽커 호출", "2026-03-12 선택 시 표기 2026. 3. 12."],
            ["뒤로 가기", "App.addListener('backButton') → 시트 → 이전 탭 → 종료 확인", "3단계 동작 일관"],
            ["로컬 저장", "동일 IndexedDB (WebView 내부)", "앱 종료·재실행 후 데이터 유지"],
            ["오프라인", "네트워크 상태 폴링, 시세만 보류", "비행기 모드에서 거래 입력 정상"],
            ["네트워크 복구", "온라인 전환 시 자동 시세 1회 동기화", "재동기화 후 총자산 갱신, 수량 불변"],
            ["파일 백업", "FileSystem 공유 시트로 JSON 내보내기/복원", "기기 간 백업 복원 성공"],
          ]}
        />
        <Note tone="amber" title="APK 주의">
          WebView의 IndexedDB 저장 공간은 기기 정책에 따라 밀릴 수 있다. <b>백업 알림</b>(최근 내보내기 7일 초과 시)을
          설정에 넣고, 저장소 사용량 경고 시 사용자에게 JSON 내보내기를 권고한다.
        </Note>
      </Sec>

      <Sec id="s17" num="17" kicker="Roadmap" title="개발 단계별 일정과 위험 요소">
        <T
          caption="표 17-1 · 12단계 (각 단계 종료 시 목표/파일/기능/테스트/남은 문제/다음 계획을 보고)"
          head={["단계", "목표", "주요 산출물", "종료 테스트"]}
          rows={[
            ["1", "전체 기획 · 아키텍처", "본 설계 문서", "사용자 승인"],
            ["2", "프로젝트 초기 구성", "Vite+TS+Tailwind 토큰, 공통 컴포넌트 12종", "스토리 스모크"],
            ["3", "기본 자산 관리", "국가·기관·계좌·현금/금고·순자산", "U-01, U-02, U-15, I-01"],
            ["4", "수입·지출", "거래·카테고리·태그·이체", "U-01, U-14, I-02"],
            ["5", "투자 관리", "브로커/증권사·일일 스냅샷·성과", "U-03, U-13"],
            ["6", "프랍 트레이딩", "계정·성과·지급 관리", "U-04, U-05, U-06"],
            ["7", "암호화폐", "복수 지갑·보유량·시세·이동", "U-12, I-06"],
            ["8", "카지노", "목록·세션·Buy-in·Cash-out·손익", "U-07, U-08, U-09, I-03"],
            ["9", "분석 · AI 프롬프트", "차트 6종 · 프롬프트 9종", "프롬프트 스냅샷 테스트"],
            ["10", "백업 · 안정성", "JSON 내보내기/복원·검증", "U-10, I-04, I-05"],
            ["11", "웹 완성 · 배포", "반응형 최종 점검·빌드·GitHub", "E2E 전량"],
            ["12", "Android APK", "Capacitor 패키징·기기 테스트", "기기 시나리오"],
          ]}
          note="각 단계는 ‘빌드 + 테스트 + 오류 확인’을 통과해야 다음으로 넘어간다. 선행 단계 회귀는 CI(로컬 스크립트)로 자동 검사."
        />

        <H3 no="17-1">위험 요소와 완화책</H3>
        <T
          caption="표 17-2 · 위험 등록부"
          head={["위험", "수준", "영향", "완화책"]}
          rows={[
            ["내부 이체가 수입/지출로 중복 집계", "<b>높음</b>", "총자산 왜곡", "type='transfer' 전용 + U-01 상시 회귀"],
            ["프랍 명목 잔액이 순자산에 유입", "<b>높음</b>", "자산 과대 측정", "includesInNetWorth 스위치 + U-04 출고 차단"],
            ["환율 재설정으로 과거 거래 변동", "<b>높음</b>", "장부 신뢰 상실", "fxRateId·amountBase 이중 저장 + U-10"],
            ["시세 동기화가 수량을 오염", "<b>높음</b>", "보유량 소실", "cryptoPrices 전용 경로 + U-12 + 코드 리뷰 규칙"],
            ["브라우저 저장소 정리·용량 한계", "중간", "데이터 소실", "백업 주기 알림, 저장소 estimate() 경고, 감사 로그"],
            ["백업 스키마 불일치", "중간", "복원 실패", "버전 헤더 + Zod 검증 + 복원 전 자동 사본"],
            ["시세 API 차단·오프라인", "낮음", "평가 지연", "마지막 정상가 유지 + 수동 가격"],
            ["부동소수점 누적 오차", "중간", "잔액 1원/1센트 차이", "소수점 정밀도 고정(8자리) + 반올림 규칙 한곳集中"],
            ["시간대 경계(Phnom_Penh/한국)", "중간", "스냅샷 날짜 어긋남", "날짜는 로컬 YYYY-MM-DD 문자열 저장"],
            ["개인키·시드문구 유입", "<b>높음</b>", "자산 도난", "입력 자체를 구현하지 않음 + 안내 문구 고정"],
            ["기능 추가 시 스키마 재작성", "중간", "일정 지연", "사전형 확장 + 마이그레이션 체인 + 저장소 추상화"],
          ]}
        />
      </Sec>

      {/* 마무리 */}
      <Sec id="s18" num="18" kicker="Review" title="설계상 문제점 · 개선 제안 · 승인 요청">
        <H3 no="18-1">지금 설계의 약점 (솔직하게)</H3>
        <T
          head={["#", "문제", "대안", "권고"]}
          rows={[
            ["P-1", "계좌의 currentBalance(캐시)와 스냅샷/거래(원본)가 이중으로 존재 → 어긋날 수 있음", "A. 원본만 두고 매번 계산(느림) / B. 캐시 + 재계산 검증 버튼", "<b>B 채택</b>, 주 1회 ‘잔액 재계산’ 유틸과 불일치 알림 제공"],
            ["P-2", "다중 통화 현금 보관 장소는 장소당 통화 1종 제한", "장소당 다중 통화 지갑 구조로 확장", "1차는 1종으로 단순화, 확장 필드만预留"],
            ["P-3", "시세 시점(체결 시각 vs 현재가) 차이로 평가액이 미세하게 달라짐", "거래마다 시세 스냅샷을 저장", "고가 거래만 스냅샷 저장, 나머지는 현재가"],
            ["P-4", "삭제된 거래의 잔액 반영을 ‘소프트 삭제’로 처리하면 잔액 복구가 복잡", "감사 로그 재생으로 재계산", "balanceAdjustments 재생 유틸을 10단계에 구현"],
            ["P-5", "AI API 미연결 상태라 프롬프트 품질이 사용자에게 의존", "향후 직접 연결 어댑터预留", "modules/ai 를 인터페이스로 두고 교체 가능하게"],
            ["P-6", "카지노 다중 통화 세션의 손익을 기준 통화로 합산하면 환율 노출", "세션별 고정 기준 통화 1종 사용", "세션 생성 시 통화 고정 권장"],
          ]}
        />

        <H3 no="18-2">구현 시 주의사항</H3>
        <L
          items={[
            <><b>금액은 항상 amount · currency · fxRateId · amountBase 4개를 한 세트로 다닌다.</b> 하나라도 빠진 저장은 코드 리뷰에서 반려한다.</>,
            <><b>소수점은 number + 명시적 반올림 함수 한 곳</b>(round(x, 8))으로 통제한다. 통화별 표시 반올림은 UI 계층에서만 한다.</>,
            <><b>날짜는 UTC ms + 로컬 날짜 문자열을 분리 저장</b>한다. 표시는 Intl로만 한다.</>,
            <><b>UI에서 합계를 직접 더하지 않는다.</b> 항상 domain/calc/netWorth() 결과를 참조한다.</>,
            <><b>새 스토어/필드는 추가만 한다.</b> 삭제·개명은 마이그레이션에서 원본 복사 후 수행.</>,
            <><b>민감정보(계좌번호·지갑 주소·시드)는 앱이 아예 다루지 않는다.</b> 별칭 체계로만 표기한다.</>,
            <><b>모든 자금 이동은 ‘출발지·도착지’ 쌍을 강제</b>한다. 한쪽만 있는 입력은 저장하지 않는다.</>,
          ]}
        />

        <H3 no="18-3">승인 요청</H3>
        <P lead>
          요청하신 17개 산출물을 00~18장으로 확장해 구현 가능한 수준으로 작성했습니다. 아래 체크리스트로 승인 범위를
          확인해 주세요.{" "}
          <b>승인 전까지 앱 소스 코드는 생성하지 않습니다.</b>
        </P>
        <Approval />

        <div className="reveal mt-8 border border-ink bg-ink px-5 py-6 text-white md:px-7 md:py-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
            다음 단계 (승인 후)
          </div>
          <div className="mt-2 font-serif text-[22px] font-bold md:text-[26px]">
            2단계 · 프로젝트 초기 구성
          </div>
          <ul className="mt-4 grid gap-2 text-[14.5px] leading-[1.75] text-white/80 md:grid-cols-2">
            <li>· Vite + TypeScript + Tailwind 디자인 토큰 (#F6F8FA / #3182F6)</li>
            <li>· 공통 컴포넌트: Card · Sheet · NumberField · SegmentedControl · EmptyState</li>
            <li>· IndexedDB 레이어 + 스키마 v1 마이그레이션</li>
            <li>· 도메인 순수 함수(netWorth · fx · tradePnl · sessionPnl)와 단위 테스트</li>
            <li>· 사이드바/하단탭 라우팅과 홈 화면 뼈대</li>
            <li>· CI 스크립트: build + test + lint</li>
          </ul>
          <p className="mt-5 border-t border-white/15 pt-4 font-mono text-[12px] leading-relaxed text-white/50">
            잘살아보세 · 설계 문서 v0.9 · 상태: 검토 대기 · 개발자: 해외선물 트레이더 / 프랍 트레이딩 · Telegram @wti0816
          </p>
        </div>
      </Sec>
    </>
  );
}
