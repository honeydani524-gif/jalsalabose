# 잘살아보세 (JalSalAboSe)

한국 · 캄보디아 · 미국 등 여러 국가에 흩어진 **은행 계좌, 지갑 현금, 금고, 증권사, 해외선물 브로커, 프랍 트레이딩 계정, 암호화폐 지갑, 카지노 자금, 수입과 지출**을 한곳에서 관리하는 개인용 통합 자산관리 앱입니다.

- **기준 통화**: USD / KRW / KHR (설정에서 변경)
- **기준 시간대**: Asia/Phnom_Penh
- **데이터 저장**: 브라우저 로컬 IndexedDB (서버 전송 없음 · 오프라인 동작)
- **백업**: JSON 내보내기 / 복원
- **플랫폼**: 웹 우선 → Android APK (Capacitor)

> 상용 서비스가 아닌 **개인이 매일 쓰는 실용 앱**을 목표로 합니다. 모든 계산은 브라우저 안에서 동작하며, 외부 서버로 데이터를 보내지 않습니다.

---

## 1. 핵심 원칙 (이 앱의 존재 이유)

| 원칙 | 설명 |
| --- | --- |
| **소유한 것만 센다** | 프랍 명목 계정($100,000), 미지급 수익, 카지노 진행 중 칩은 **순자산에서 제외**하고 별도 지표로만 표시합니다. |
| **한 곳에서만 계산** | `src/domain/` 의 순수 함수가 홈·분석·AI 프롬프트의 모든 합계를 만듭니다. 화면(UI)은 계산하지 않습니다. |
| **과거는 절대 바뀌지 않는다** | 거래는 `원본 통화 · 당시 환율(fxRate) · 기준 통화 환산액(amountBase)` 4개를 한 세트로 저장합니다. 환율을 바꿔도 과거 거래는 그대로입니다. |
| **내부 이체는 수입/지출이 아니다** | 계좌 이체, 현금 인출 분할, Buy-in은 `transfer` 타입으로 기록되어 **총자산 변화 = 0** (Buy-in은 칩이 자산이 아니므로 감소가 정확합니다). |
| **시세는 수량을 건드리지 않는다** | 코인 시세 동기화는 `cryptoPrices` 스토어만 씁니다. 보유 수량·거래 기록은 변경하지 않습니다. |

---

## 2. 주요 기능

- **홈** — 전체 순자산(최상단), 시작 대비 증감, 자산 추이 그래프, 자산 요약 5종, 별도 관리 지표(프랍·진행 중 칩), 월간 수입/지출, 자산 구성 도넛, 최근 거래
- **자산** — 계좌(국가 → 금융기관 그룹핑, 검색, 유형 필터, 즐겨찾기, 잔액 상세·수정 이력), 현금/금고, 암호화폐 지갑·보유량·시세 동기화, 프랍 계정
- **거래 내역** — 기간/유형/카테고리/태그/검색 필터, 날짜별 묶음, 상세 보기, 삭제
- **투자** — 일일 평가잔액 스냅샷, **매매손익 자동 분리**(입출금 제외), 누적 손익·수익률, 그래프
- **카지노** — 카지노 목록, 세션(첫 Buy-in으로 자동 생성), 다중 Buy-in, **분할 Cash-out**, 미정산 확인 후 세션 종료, 세션 손익
- **분석** — 기간별 자산 추이·구성·국가별·수입/지출·지출 카테고리·태그·투자·프랍·카지노
- **AI 분석** — 실제 데이터로 **분석 프롬프트 자동 생성**(9종 분석, 기간 선택, 데이터 선택, 민감정보 마스킹, 전체 복사). 외부 API 호출 없음.
- **설정** — 기준 통화, 환율(전후 비교 + 이력), 시세 동기화, 마스터 데이터(국가·금융기관·계좌 유형·카테고리·태그), 백업/복원/초기화, 앱 정보

---

## 3. 설치와 실행

### 요구사항

- Node.js **18.18 이상** (권장 20 LTS)
- npm 9 이상
- Chrome 110+ / Safari 16.4+ / Firefox 115+ (IndexedDB 필수)

### 명령어

```bash
# 1) 저장소 클론
git clone https://github.com/<사용자명>/jalsalabose.git
cd jalsalabose

# 2) 의존성 설치
npm install

# 3) 개발 서버 실행 → http://localhost:5173
npm run dev

# 4) 프로덕션 빌드 → dist/
npm run build

# 5) 빌드 결과 로컬 확인
npm run preview
```

### 환경변수 (선택)

환경변수가 없어도 앱은 완전히 동작합니다. (`env.example` 참고)

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `VITE_APP_VERSION` | `0.1.0` | 앱 표시 버전 |
| `VITE_SCHEMA_VERSION` | `1` | DB 스키마 버전 (마이그레이션과 일치해야 함) |
| `VITE_PRICE_API` | CoinGecko | 코인 시세 API 주소 (미설정 시 수동 시세) |

```bash
cp env.example .env.local
```

---

## 4. 프로젝트 구조

```
jalsalabose/
├─ public/                  # 공개 정적 파일
├─ src/
│  ├─ App.tsx               # 셸 · 해시 라우터 · 사이드바/하단탭 · 빠른 입력
│  ├─ main.tsx
│  ├─ index.css             # 디자인 토큰 (@theme) · 스펙 표 스타일
│  ├─ assets/               # 이미지 (번들 인라인)
│  ├─ data/
│  │  └─ db.ts              # IndexedDB 래퍼 · 스토어 목록 · 스키마 버전
│  ├─ domain/               # L3 순수 계산 (UI/DB 미의존)
│  │  ├─ calc.ts            # 환율 · 금액 포맷 · 날짜 · 매매손익 공식
│  │  └─ entities.ts        # 엔티티 타입 + computeNetWorth()
│  ├─ store/
│  │  └─ AppStore.tsx       # L2 상태 + 유스케이스 + 씨드 데이터
│  ├─ screens/              # 화면
│  │  ├─ Home.tsx  Assets.tsx  Tx.tsx  Invest.tsx
│  │  ├─ Casino.tsx  Analysis.tsx  Settings.tsx
│  │  └─ forms.tsx          # 빠른 입력 폼 (수입·지출·이체·스냅샷·Buy-in·프랍 지급)
│  ├─ ui/
│  │  ├─ kit.tsx            # 버튼·카드·시트·차트·금액 표시 컴포넌트
│  │  └─ quick.tsx          # 빠른 입력 컨텍스트
│  ├─ sections/             # 설계 문서 (앱 안의 #/spec 페이지)
│  └─ components/ui.tsx     # 문서 공통 컴포넌트
├─ docs/DESIGN.md           # 설계 요약 (GitHub/GPT 작업용)
├─ env.example              # 환경변수 템플릿
└─ README.md
# capacitor.config.ts 는 12단계에서 생성합니다.
```

### 계층 규칙 (반드시 지킬 것)

| 계층 | 위치 | 규칙 |
| --- | --- | --- |
| L1 표현 | `screens/`, `ui/` | **계산 금지.** 저장소에서 계산된 값을 받아 표시만 합니다. |
| L2 애플리케이션 | `store/AppStore.tsx` | 유스케이스(하나의 사용자 행위 = 하나의 함수), 잔액 갱신과 저장을 같은 흐름에서 처리 |
| L3 도메인 | `domain/` | 순수 함수. 시간·네트워크·DB에 의존하지 않음 |
| L4 영속성 | `data/db.ts` | IndexedDB 스토어 22개, 스키마 버전 관리 |

---

## 5. 데이터 구조 요약 (스키마 v1)

`kv, countries, institutions, accountTypes, accounts, cashLocations, transactions, categories, tags, exchangeRates, invSnapshots, propAccounts, propPayouts, cryptoWallets, cryptoAssets, cryptoPrices, cryptoTx, casinos, casinoSessions, casinoBuyIns, casinoCashOuts, nwHistory`

- 모든 스토어는 `id (UUID)` 기본키, 외래키는 ID만 참조합니다.
- **계좌 유형 · 금융기관 · 국가 · 카테고리 · 태그는 사전 테이블**이라 새 항목 추가는 `INSERT` 한 줄이며 스키마 변경이 없습니다.
- 거래는 소프트 삭제, 계좌·지갑은 `archivedAt` 숨김 처리로 과거 기록을 보존합니다.
- 자세한 필드·인덱스·삭제 정책은 앱의 **설계 문서**(`#/spec`) 또는 `docs/DESIGN.md` 를 참고하세요.

### 순자산 공식

```
NW(base) = Σ accounts.balance        (accountTypes.includesInNetWorth = true)
         + Σ cashLocations.balance
         + Σ (cryptoAssets.quantity × 시세)
         + Σ invSnapshots(최신).endBalance   → 계좌 balance 캐시로 반영

제외: propAccounts.nominalSize · 미수령 수익 · 진행 중 세션 칩
환산: toBase(amount, cur) = amount ÷ rate[cur] × rate[base] ,  rate[USD] ≡ 1
```

---

## 6. 백업과 복원

1. **설정 → 백업 · 복원 → 백업 파일 내려받기** (JSON, 스키마 버전 포함)
2. 복원: **백업 파일 선택** → 검증 → 확인 후 현재 데이터를 덮어씁니다.
3. 초기화는 2단 확인 + 삭제 전 데이터 요약을 보여줍니다.
4. 브라우저 저장공간이 줄어들 수 있으므로 **7일 이상 백업하지 않았다면 내려받기를 권장**합니다.

---

## 7. GitHub 업로드

```bash
git init
git add .
git commit -m "feat: 자산관리 앱 v0.1.0 — 계좌·이체·투자·카지노·분석·백업"
git branch -M main
git remote add origin https://github.com/<사용자명>/jalsalabose.git
git push -u origin main
```

- 개인 금융 데이터 앱이므로 저장소는 **Private**을 권장합니다.
- `.gitignore` 에는 `node_modules/`, `dist/`, `.env.local` 이 포함되어 있습니다.
- 이후 GPT와 연동해 작업할 때는 `docs/DESIGN.md`(설계 문서)와 `README.md` 를 컨텍스트로 함께 주세요.

### GitHub Pages 배포

```bash
npm run build
npx gh-pages -d dist        # 또는 Vercel / Netlify 로 dist 폴더 배포
```

---

## 8. Android APK (12단계)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/keyboard @capacitor/app @capacitor/filesystem
npx cap init 잘살아보세 com.jalsalabose.app --web-dir=dist
npm run build && npx cap add android
npx cap sync android

cd android && ./gradlew assembleDebug      # android/app/build/outputs/apk/debug/
./gradlew assembleRelease                  # 릴리스 (키스토어 서명 필요)
```

- 웹과 Android는 **동일한 소스 · 동일한 도메인 로직 · 동일한 IndexedDB 스키마**를 공유합니다.
- 대응 항목: safe-area, 숫자 키보드, 네이티브 날짜 선택, 하드백(시트 → 이전 탭), 오프라인 입력, 네트워크 복구 시 시세 1회 동기화.

---

## 9. 테스트

현재 제공되는 명령어는 `npm run dev` / `npm run build` / `npm run preview` 입니다.
테스트 스위트(Vitest · Playwright)와 `lint` 스크립트는 **11단계**에서 추가될 예정입니다.

출고를 막아야 하는 핵심 케이스 (테스트 추가 시 가장 먼저 작성):

1. 내부 이체 후 **Δ총자산 = 0**
2. 프랍 명목 계정이 순자산에 **포함되지 않을 것**
3. Buy-in → Cash-out → 세션 손익과 **총자산 변화가 일치**할 것
4. 환율 변경 후 **과거 거래의 amountBase 불변**

---

## 10. 개발 단계

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| 1 | 전체 기획 · 아키텍처 (설계 문서) | 완료 |
| 2 | 프로젝트 초기 구성 · 디자인 토큰 · 공통 컴포넌트 | 완료 |
| 3 | 기본 자산 관리 (국가·기관·계좌·현금/금고·순자산) | 완료 |
| 4 | 수입 · 지출 · 카테고리 · 태그 · 이체 | 완료 |
| 5 | 투자 관리 (일일 스냅샷 · 성과) | 완료 |
| 6 | 프랍 트레이딩 (계정 · 성과 · 지급) | 완료 |
| 7 | 암호화폐 (복수 지갑 · 보유량 · 시세 · 이동) | 완료 |
| 8 | 카지노 (목록 · 세션 · Buy-in · Cash-out · 손익) | 완료 |
| 9 | 분석 · AI 프롬프트 생성 | 완료 |
| 10 | 백업 · 복원 · 검증 | 완료 |
| 11 | 웹 완성 · 반응형 점검 · 배포 | 진행 |
| 12 | Android APK (Capacitor) | 예정 |

---

## 11. 알려진 한계 · 다음 작업

- **시세 자동 동기화**는 CoinGecko 공개 API를 사용하며, 차단/오프라인 시 마지막 정상 가격을 유지하고 수동 가격 입력을 허용합니다. 거래소별 시세 소스 추가는 `src/screens/Assets.tsx` 의 `syncPrices()` 를 확장합니다.
- **일일 자산 이력**은 거래·스냅샷 발생 시점에 순자산을 기록합니다(`nwHistory`). 과거 날짜로 거래를 입력하면 해당 날짜 포인트가 재구성되지 않습니다(향후 개선 과제).
- **카지노 정산 기록**(`casinoSettlements`)은 현재 세션 종료 시점에 계산값으로만 두고 별도 스토어로 저장하지 않습니다. 필요 시 `domain/entities.ts` 에 스토어를 추가하세요.
- **부채(대출) 항목**은 스키마 확장 포인트만 비워 두었습니다.
- 단위/통합 테스트 스위트는 다음 단계(11단계 병행)로 추가 예정입니다.

---

## 12. 개발자 정보

- **개발자**: 해외선물 트레이더 / 프랍 트레이딩
- **Telegram**: [@wti0816](https://t.me/wti0816)
- **라이선스**: 개인 사용 목적 · 상업적 배포는 별도 협의

---

## 13. 개인정보 · 보안

- 모든 데이터는 기기 브라우저의 IndexedDB 에만 저장되며 외부 서버로 전송하지 않습니다.
- 계좌번호, 개인 지갑 주소, **시드문구 · 개인키는 앱이 다루지도 저장하지도 않습니다.**
- 코인 시세 요청은 심볼과 가격만 포함합니다.
- AI 분석은 API를 호출하지 않고 프롬프트를 만들어 사용자가 직접 붙여넣습니다.
