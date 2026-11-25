# 잘살아보세 (JalSalAboSe)

한국 · 캄보디아 · 미국 등 여러 국가의 은행 계좌, 현금·금고, 증권·해외선물 계정, 프랍 계정, 암호화폐 지갑, 카지노 자금과 수입·지출을 관리하는 개인용 자산관리 앱입니다.

- **기준 통화**: USD / KRW / KHR
- **기준 시간대**: Asia/Phnom_Penh
- **저장 방식**: 기기 내부 WebView/브라우저 IndexedDB
- **동기화**: 서버·계정·클라우드 동기화 없음
- **백업**: 앱 내부 JSON 내보내기 / 복원
- **Android**: Capacitor 8 프로젝트 포함

사용자 금융 데이터는 외부 서버로 전송하지 않습니다. 코인 시세 자동 갱신을 사용할 때는 시세 제공 API에 코인 심볼을 요청할 수 있습니다. 오프라인에서는 저장된 시세와 수동 입력을 사용할 수 있습니다.

---

## 1. 핵심 원칙

| 원칙 | 설명 |
|---|---|
| 소유한 자산만 순자산에 포함 | 프랍 명목 금액, 미수령 수익, 카지노 진행 중 칩은 순자산에서 제외 |
| 과거 거래의 환율 보존 | 거래 시점 환율과 기준 통화 환산액을 저장하며 현재 환율 변경으로 과거 거래를 재계산하지 않음 |
| 내부 이체와 수입·지출 분리 | 계좌·현금 간 이동은 이체로 기록 |
| 시세와 보유 수량 분리 | 시세 갱신은 가격 데이터만 변경하고 보유 수량은 변경하지 않음 |
| 로컬 데이터 우선 | 앱 데이터는 각 기기에 별도로 저장하며 다른 기기와 자동 공유하지 않음 |

## 2. 주요 기능

- **홈·순자산** — 계좌, 현금, 투자, 암호화폐를 기준 통화로 합산
- **자산 관리** — 국가·금융기관별 계좌, 현금·금고, 암호화폐 지갑
- **거래** — 수입·지출·다중 통화 이체 및 거래 내역
- **투자** — 일일 평가잔액, 입출금 분리, 매매손익
- **프랍** — 프랍 계정과 실제 지급 수익 관리
- **카지노** — 세션, 다중 Buy-in, 분할 Cash-out, 미정산 칩과 손익
- **분석** — 자산 추이, 구성, 수입·지출 및 투자·프랍·카지노 분석
- **AI 분석 보조** — 사용자가 선택한 데이터를 바탕으로 분석 프롬프트 생성; 외부 AI API 자동 호출 없음
- **설정** — 기준 통화, 환율 이력, 마스터 데이터, 백업·복원·초기화

## 3. 개발 환경

### 요구사항

- **Node.js 22**
- npm 10 이상 권장
- IndexedDB를 지원하는 최신 Chrome, Edge, Safari 또는 Firefox

Capacitor 8 CLI가 Node.js 22 이상을 요구하므로 Node 18/20 환경은 Android 작업에 사용하지 마세요.

### 실행

```bash
git clone https://github.com/honeydani524-gif/jalsalabose.git
cd jalsalabose
npm ci
npm run dev
```

### 확인 명령어

```bash
npm test
npx tsc --noEmit
npm run build
```

Vitest 회귀 테스트는 `npm test`로 실행합니다. 현재 Playwright E2E 및 ESLint 스크립트는 구성되어 있지 않습니다.

## 4. 프로젝트 구조

```
src/
  data/db.ts             IndexedDB 스키마와 트랜잭션 래퍼
  domain/                순수 계산 함수와 엔티티
  store/AppStore.tsx     상태, 금융 유스케이스, 백업·복원
  screens/               앱 화면과 입력 폼
  ui/                    공통 UI 컴포넌트
android/                 Capacitor Android 프로젝트
capacitor.config.ts      Capacitor 앱 설정
docs/                    Android 빌드·QA 및 설계 문서
```

IndexedDB는 스토어 22개, 스키마 버전 1을 사용합니다. 데이터 모델을 바꿀 때는 기존 사용자 백업과 마이그레이션 호환성을 먼저 검토해야 합니다.

## 5. 금융 계산 규칙

- 환율은 기본적으로 **1 USD당 통화 단위**로 저장합니다.
- 다중 통화 이체는 거래 시점 환율로 출금·입금액을 비교하고 환산 정보를 각 거래에 보존합니다.
- 투자 스냅샷은 입력한 최종 평가잔액을 기준으로 하며 입출금을 다시 더하거나 빼서 중복 계산하지 않습니다.
- 카지노 세션 통화는 첫 Buy-in 시 결정됩니다. 이후 Buy-in과 Cash-out은 거래 시점 환율로 세션 통화에 환산합니다.
- 카지노 Buy-in의 암호화폐 출발 자산은 현재 **USDT만 지원**합니다. BTC·ETH·SOL의 거래 시점 토큰 가격을 저장하는 기능은 아직 구현되지 않았습니다.
- 프랍 지급 수수료는 USD 입력값을 지급일 환율로 지급 통화에 환산해 차감합니다.

## 6. 백업과 데이터 보존

1. 앱의 **설정 → 백업·복원**에서 JSON 백업을 내보냅니다.
2. 복원할 때 백업 파일을 선택하고 덮어쓰기 확인을 진행합니다.
3. 복원은 형식·필수 데이터·ID 등을 검증한 뒤 IndexedDB 단일 트랜잭션으로 교체합니다.
4. 잘못된 백업 파일을 가져오면 기존 데이터가 유지되어야 합니다.

**중요:** 서버 동기화와 Android 자동 백업은 사용하지 않습니다. 앱 삭제·재설치·휴대폰 교체 전에는 반드시 JSON 백업을 별도 위치에 보관하세요. 다른 휴대폰으로 데이터가 자동 복사되지 않습니다.

## 7. Android APK

Capacitor Android 프로젝트가 저장소에 포함되어 있습니다.

로컬 빌드:

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

Windows에서는 `gradlew.bat assembleDebug`를 사용합니다.

GitHub Actions는 일반 푸시와 PR에서 금융 테스트, TypeScript 검사, 웹 빌드만 수행합니다. **APK 생성은 나중에 수동으로 요청할 때만 실행**하도록 분리되어 있습니다.

수동 APK 빌드 방법과 서명 관련 주의사항은 [docs/ANDROID-APK.md](docs/ANDROID-APK.md)를 참고하세요. 실제 기기 설치·복원·업데이트 테스트와 영구 Release 서명은 아직 완료되지 않았습니다.

## 8. QA 상태 및 알려진 한계

- 자동화: 금융 회귀 테스트, TypeScript 검사, Vite 빌드가 GitHub Actions에서 실행됩니다.
- 미완료: 실제 Android 기기에서 화면·저장·백업·복원·업데이트 검증.
- 데이터는 기기별로 분리되어 있으며 실시간 다중 기기 동기화는 없습니다.
- 과거 날짜로 거래를 입력해도 과거 순자산 이력 포인트를 자동 재구성하지는 않습니다.
- 대출·부채 관리 기능은 아직 없습니다.
- 카지노 Buy-in의 암호화폐 출발 자산은 USDT만 지원합니다.

QA 항목은 [docs/ANDROID-RELEASE-QA.md](docs/ANDROID-RELEASE-QA.md)에 정리되어 있습니다.

## 9. GitHub 저장소 및 보안

- 현재 저장소는 **Public**입니다. 앱의 실제 금융 데이터는 저장소에 포함하지 말고, 소스 공개를 원하지 않는다면 GitHub 저장소 설정에서 Private으로 변경하세요.
- `.env`, `.env.*`, Android keystore 파일은 커밋하지 않도록 `.gitignore`에 포함되어 있습니다.
- `VITE_*` 환경변수는 웹 번들에 노출될 수 있으므로 비밀 API 키나 비밀번호를 넣지 마세요.
- Release 서명 키는 저장소에 올리지 말고, 나중에 GitHub Actions Secrets를 통해 사용해야 합니다.
- 현재 작업은 `fix/phase-2-financial-corrections` 브랜치와 Draft PR #1에서 진행합니다. 검토가 끝나기 전에는 `main`에 병합하지 않습니다.

## 10. 참고 문서

- [Android APK 빌드](docs/ANDROID-APK.md)
- [Android 출시 QA 체크리스트](docs/ANDROID-RELEASE-QA.md)
- [최종 검토 보고서](docs/FINAL-REVIEW-2026-11-25.md)
- [Phase 2–3 구현 기록](docs/PHASE2-3-IMPLEMENTATION.md)

## 11. 개발자 정보

- Telegram: [@wti0816](https://t.me/wti0816)
- 저장소에는 별도의 표준 오픈소스 LICENSE 파일이 아직 없습니다. Public 저장소라는 사실만으로 재사용·재배포 권한이 부여되는 것은 아닙니다.
