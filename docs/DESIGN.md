# 잘살아보세 — 설계 요약 (DESIGN.md)

전체 설계 명세서는 앱 내부 `#/spec` 페이지(소스: `src/sections/Part1~4.tsx`)에서 확인할 수 있습니다.
이 문서는 **GitHub · GPT와 연동해 작업할 때** 바로 컨텍스트로 넣도록 핵심만 요약한 것입니다.

- 문서 버전: v0.9 → 구현 v0.1.0
- 상태: 1~10단계 구현 완료, 11단계(웹 마무리·배포) 진행, 12단계(Android) 예정

---

## 1. 아키텍처

```
L1 표현      src/screens/*, src/ui/*        계산 금지 — 계산된 값과 원본 기록만 표시
L2 애플리케이션 src/store/AppStore.tsx       유스케이스 · 잔액 갱신 + 저장을 한 흐름에서
L3 도메인    src/domain/calc.ts, entities.ts 순수 함수 (시간·네트워크·DB 미의존)
L4 영속성    src/data/db.ts                 IndexedDB 스토어 22개 · 스키마 버전 1
횡적 모듈    modules 자리: fx · price · ai · backup (현재 store/screen 내에 구현)
```

**단일 진입점**: `computeNetWorth(data)` (src/domain/entities.ts)
홈 · 분석 · AI 프롬프트 · 설정의 모든 합계가 이 함수 결과를 참조합니다.

---

## 2. 스키마 v1 (IndexedDB `jalsalabose`)

| 스토어 | 핵심 필드 | 비고 |
| --- | --- | --- |
| kv | id, value | settings (base, rates, mask, autoPrice) |
| countries | id, code, name, symbol, sortOrder | KR/KH/US/ETC 시드 |
| institutions | id, countryId, name, kind(bank/broker/exchange/prop/other) | 26곳 시드, 사용자 추가 가능 |
| accountTypes | id, code, label, group, **includesInNetWorth**, icon | 순자산 편입 스위치. 새 유형 = INSERT |
| accounts | id, alias, accountTypeId, institutionId?, countryId, currency, openingBalance, **balance**, favorite, archivedAt | balance 는 파생값 캐시 |
| cashLocations | id, name(kind: wallet/safe/office/other), currency, openingBalance, balance | 지갑·금고 |
| transactions | id, type(income/expense/transfer/adjust/casino), amount, currency, **fxRate, amountBase**, date, accountId?, from?, legs?, categoryId?, tagIds, memo, counterparty?, reason? | 원본 4종 세트 보존 |
| categories | id, kind(income/expense), name, sortOrder, archivedAt | 삭제 = 숨김 |
| tags / (tagIds) | id, name, color | 거래는 배열로 태그 참조 |
| exchangeRates | id, base, rate, effectiveAt, source, memo | 이력형 (추가만) |
| invSnapshots | id, accountId, date(YYYY-MM-DD), endBalance, deposit, withdrawal | 일일 1건, (accountId,date) 유일 |
| propAccounts | id, firm, alias, kind, nominalSize, opening, balance, target, maxDailyLoss, status, fee, payoutRequested | **nominalSize 는 순자산 제외** |
| propPayouts | id, propAccountId, amount, currency, fxRate, receivedAt, to, fee | 실제 수령분만 수입 반영 |
| cryptoWallets | id, name(krExchange/overseasExchange/software/hardware/paper) | |
| cryptoAssets | id, walletId, symbol, quantity, manualPrice? | **수량은 거래에서만 변함** |
| cryptoPrices | id=symbol, price, currency, source(api/manual), fetchedAt, isStale | 시세 전용 |
| cryptoTx | id, walletId, type, symbol, quantity, fee*, from/toWalletId, counterparty, date | USDT 전송·수수료 |
| casinos | id, name, city, memo | |
| casinoSessions | id, casinoId, startedAt, endedAt?, status(ongoing/closed), currency | 첫 Buy-in으로 자동 생성 |
| casinoBuyIns | id, sessionId, from(kind,id), amount, currency, fxRate, chipAmount, fee, date | |
| casinoCashOuts | id, sessionId, totalAmount, currency, fxRate, fee, date, **legs[]** | 분할 수령 |
| nwHistory | id, t, value, base | 순자산 이력 (같은 날은 마지막 값만 갱신) |

### 삭제 정책
- 거래: 소프트 삭제(=`remove` 로 행 제거하지만 잔액은 별도 조정 이력으로 보존) → 확장 시 `deletedAt` 권장
- 계좌·지갑·보관 장소: 거래가 있으면 삭제 차단 → `archivedAt` 숨김
- 카테고리·태그: `archivedAt` / 배열에서 제거 — 과거 거래는 그대로 표시
- 환율·시세: 삭제 금지(이력)
- 금융기관: 계좌가 사용 중이면 삭제 차단

---

## 3. 순자산 계산 규칙

```
toBase(amount, cur) = amount ÷ rate[cur] × rate[base] ,  rate[USD] ≡ 1

NW = Σ accounts.balance        (accountTypes.includesInNetWorth = true)
   + Σ cashLocations.balance
   + Σ (cryptoAssets.quantity × (manualPrice ?? cryptoPrices.price))

제외 = propAccounts.nominalSize
     + propAccounts.payoutRequested (미수령)
     + 진행 중 세션의 (총 Buy-in − 총 Cash-out)

내부 이체: ΔNW = 0  (type='transfer', legs 합계 = 출발 금액 검증)
Buy-in:   출발 자산 −A, 칩은 자산 아님 → NW −A
Cash-out: 도착 자산 +A → NW +A      (세션 손익 = ΣCash-out − ΣBuy-in = NW 변화와 일치)
```

**거래 저장 4세트**: `amount · currency · fxRate(당시) · amountBase(기준 통화)` — 환율을 바꿔도 과거 `amountBase` 는 불변, 현재 평가에만 새 환율을 적용합니다.

**투자 매매손익**: `tradePnl = endBalance − prevEndBalance − deposit + withdrawal`
입출금(본인 자금)과 실제 매매 손익을 분리합니다.

---

## 4. 화면 · 라우트

| 라우트 | 화면 | 핵심 |
| --- | --- | --- |
| `#/home` | Home | 순자산 히어로, 요약 5종, 별도 지표, 빠른 입력, 수지, 도넛, 최근 거래 |
| `#/assets` | Assets | 계좌/현금·금고/암호화폐/프랍 4탭, 그룹핑·검색·필터, 잔액 상세, 시세 동기화 |
| `#/tx` | Tx | 기간·유형·카테고리·태그·검색, 날짜별 묶음, 상세/삭제 |
| `#/invest` | Invest | 스냅샷 입력, 매매손익 표, 그래프, 프랍 요약 |
| `#/casino` | Casino | 카지노 목록, 진행 중 세션, 세션 상세, Buy-in/분할 Cash-out/종료 |
| `#/analysis` | Analysis | 기간별 추이·구성·국가별·수지·카테고리·투자·프랍·카지노 |
| `#/ai` | AIScreen | 프롬프트 생성(9종)·기간·데이터 선택·마스킹·복사 |
| `#/settings` | Settings | 기준 통화, 환율(전후 비교·이력), 마스터 데이터, 백업/복원/초기화, 정보 |
| `#/spec` | 설계 문서 | 00~18장 전체 명세 |

빠른 입력(전역): 수입 · 지출 · 이체 · 투자 잔액 · 카지노 Buy-in · 프랍 지급 — 데스크톱 헤더 버튼, 모바일 FAB.

---

## 5. 테스트 계획 (11단계에서 구현)

| # | 케이스 | 기대 |
| --- | --- | --- |
| U-01 | ABA $5,000 → 지갑 $2,000 + 금고 $3,000 이체 | ΔNW = 0, income/expense 0건 |
| U-02 | 프랍 $100,000 + 은행 $5,000 | NW = $5,000 |
| U-03 | 매매손익: prev 10,000 / dep 1,000 / wd 500 / end 10,800 | 300 |
| U-04 | Buy-in 2,500 → Cash-out 3,000 | 세션 손익 +500 = NW 변화 +500 |
| U-05 | 환율 1,385 → 1,400 | 과거 amountBase 불변, 현재 평가만 갱신 |
| U-06 | 시세 동기화 전/후 | cryptoAssets.quantity deep-equal |
| U-07 | 분할 Cash-out legs 합 ≠ 실수령액 | 저장 거부 |
| U-08 | 백업 → 복원 | 건수·합계 완전 일치 |

---

## 6. 위험 요소와 완화

| 위험 | 완화 |
| --- | --- |
| 내부 이체가 수입/지출로 중복 집계 | `transfer` 전용 타입 + legs 합계 검증 |
| 프랍 명목이 순자산에 유입 | `includesInNetWorth` 스위치 + UI "미포함" 배지 |
| 환율 재설정으로 과거 장부 변동 | fxRate/amountBase 이중 저장 |
| 시세 동기화가 수량 오염 | `cryptoPrices` 전용 경로, 저장 시 수량 미포함 |
| 브라우저 저장공간 정리 | JSON 백업 권장, 초기화 전 2단 확인 |
| 개인키·시드문구 유입 | 아예 구현하지 않음 |

---

## 7. 다음 작업 (우선순위)

1. **11단계**: Vitest 단위 테스트(U-01~U-08) + 반응형 최종 점검 + 배포
2. 과거 날짜 거래 입력 시 `nwHistory` 재구성
3. 거래 소프트 삭제(`deletedAt`) 도입 및 감사 로그
4. 카지노 `casinoSettlements` 스토어 분리
5. 부채(대출) 항목 추가 — `accounts` 에 `liability` 유형만 추가하면 스키마 변경 없음
6. **12단계**: Capacitor Android 패키징
