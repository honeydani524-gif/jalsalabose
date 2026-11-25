import { Sec, H3, P, L, T, Note, F, Steps } from "../components/ui";
import NetWorthDemo from "../components/NetWorthDemo";

export function Part2() {
  return (
    <>
      <Sec id="s04" num="04" kicker="Accounts" title="국가별 금융기관 및 계좌 구조">
        <P lead>
          이 기능이 앱의 뼈대다. <b>국가 · 금융기관 · 통화 · 계좌 유형은 서로 완전히 독립</b>이다. 어떤 조합도 허용한다 —
          한국 은행의 USD 외화계좌, 캄보디아 은행의 USD·KHR 두 계좌, 미국 브로커의 KRW 계좌까지. 어느 한 축에 데이터가
          종속되면 구조를 다시 짜야 하므로, 4개 축은 각자 사전 테이블을 가진다.
        </P>

        <F label="조합 규칙 (검증 로직)">
          {`Account = { countryId, institutionId?, accountTypeId, currency }   // 4축 독립
허용:  country=KR, institution=국민은행, type=외화계좌, currency=USD
허용:  country=KH, institution=ABA Bank,  type=일반입출금, currency=KHR
허용:  country=KH, institution=ABA Bank,  type=일반입출금, currency=USD   // 동일 기관 복수 계좌
금지:  institution.countryId !== account.countryId  → 경고만 표시(차단하지 않음, 이중국적 지점 대비)`}
        </F>

        <H3 no="4-1">계좌 등록 화면 — 실제 입력 순서</H3>
        <Steps
          items={[
            { t: "자산 탭 → 우상단 「+ 계좌」 버튼", d: "하단 시트(모바일) / 우측 드로어(데스크톱)가 열린다. 포커스는 국가 필드로 이동." },
            { t: "국가 선택", d: "한국 · 캄보디아 · 미국 · 기타 4+ chips. ‘기타’ 선택 시 국가명 텍스트 입력창이 나타난다. countries 테이블에 INSERT." },
            { t: "금융기관 선택", d: "선택한 국가의 institutions 목록 + 「+ 직접 추가」. 검색창에서 즉시 필터. 추가 시 name/kind 입력 후 저장." },
            { t: "계좌 별칭 입력", d: "예: ‘ABA 생활비’. 비워두면 금융기관명으로 자동 채움." },
            { t: "계좌 유형 선택", d: "그룹별 칩: 은행/현금/투자/암호화폐/프랍/기타 — accountTypes 사전에서 읽어 렌더링. 새 유형은 설정에서 추가." },
            { t: "통화 선택", d: "USD · KRW · KHR (+ 사용자 추가). 이 값이 이후 모든 잔액의 단위가 된다." },
            { t: "시작 잔액 입력", d: "숫자 키패드 포커스. 통화 기호가 필드 좌측에 고정 표시. 0 허용." },
            { t: "메모 · 아이콘 · 즐겨찾기", d: "선택 사항. 아이콘은 lucide-react 24종 중 선택." },
            { t: "「저장」", d: "accounts INSERT + openingBalance를 currentBalance로 동기화. 목록 맨 위에 토스트로 확인." },
          ]}
        />

        <H3 no="4-2">계좌 유형 사전 (확장 = INSERT 한 줄)</H3>
        <T
          caption="표 4-1 · accountTypes 시드 데이터"
          head={["code", "label", "group", "includesInNetWorth", "비고"]}
          rows={[
            ["checking", "일반 입출금 계좌", "bank", "true", "—"],
            ["savings", "저축 계좌", "bank", "true", "—"],
            ["fx", "외화 계좌", "bank", "true", "계좌 통화와 무관하게 잔액 통화 기준"],
            ["living", "생활비 계좌", "bank", "true", "—"],
            ["stock", "주식 계좌", "invest", "true", "—"],
            ["stock_ovs", "해외 주식 계좌", "invest", "true", "—"],
            ["futures", "선물 계좌", "invest", "true", "—"],
            ["securities", "종합 증권 계좌", "invest", "true", "—"],
            ["prop", "프랍 트레이딩 계정", "prop", "<b>false</b>", "명목 자금 — 순자산 배제"],
            ["cex_kr", "한국 암호화폐 거래소", "crypto", "true", "—"],
            ["cex_ovs", "해외 암호화폐 거래소", "crypto", "true", "—"],
            ["wallet", "개인 암호화폐 지갑", "crypto", "true", "하드웨어/소프트웨어 포함"],
            ["cash", "현금 보관 장소", "cash", "true", "cashLocations와 1:1"],
            ["other", "기타", "other", "true", "사용자 정의"],
          ]}
          note="새 유형 추가 = INSERT 1행. accounts 테이블 구조는 전혀 변하지 않는다 — 17번 항목의 최우선 확장성 조건."
        />

        <H3 no="4-3">계좌 목록 화면 배치</H3>
        <L
          items={[
            <><b>상단 고정 바:</b> 검색창(금융기관·별칭·메모 검색) + 정렬(국가순/잔액순/최근순) + 「+」 버튼.</>,
            <><b>필터 칩 줄:</b> 전체 · 은행 · 현금/금고 · 투자 · 암호화폐 · 프랍(별도 표시). 계좌 유형·통화·국가 드롭다운은 2번째 줄.</>,
            <><b>그룹핑:</b> 기본은 <span className="font-mono text-[13px]">국가 → 금융기관</span> 2단 접기. 각 그룹 헤더에 소계(통화별·기준 통화 환산액)를 우측 정렬 모노스페이스로 표시.</>,
            <><b>각 계좌 행:</b> 아이콘 · 별칭 · 기관명(보조) · 통화 배지 · 잔액(오른쪽, 큰 모노스페이스) · 즐겨찾기 별. 행 클릭 → 잔액 상세 시트.</>,
            <><b>잔액 상세 시트:</b> 현재 잔액 / 시작 잔액 / 증감률 / 최근 수정 이력(balanceAdjustments) / 「잔액 수정」「거래 내역 보기」「수정」「보관」4버튼.</>,
            <><b>잔액 수정:</b> 새 금액 + 사유(입출금·오기입 교정·환율 평가) 선택 → 저장. 이력이 남아 감사 가능.</>,
          ]}
        />

        <H3 no="4-4">현금 및 금고</H3>
        <P>
          현금은 <b>계좌와 별개의 cashLocations</b> 스토어로 관리한다(지갑 현금 · 집 금고 · 사무실 금고 · 기타). 각 장소는
          통화를 하나씩 가지며, 잔액은 독립적으로 수정된다. 핵심은 <b>이동 = 2필드 갱신</b>이라는 점이다.
        </P>
        <F label="예시 — ABA에서 $5,000 인출 후 지갑 $2,000 / 집 금고 $3,000 분할">
          {`before: ABA(USD) 12,000 · wallet(USD) 0 · safe(USD) 0
transfers/adjust 기록 1건 (type=transfer, accountId=ABA, legs=[wallet 2,000, safe 3,000])

after:  ABA 7,000  (−5,000)
        wallet 2,000 (+2,000)
        safe   3,000 (+3,000)

ΔΣ = −5,000 + 2,000 + 3,000 = 0      ✅ 전체 순자산 변화 없음
수입/지출 기록 = 0건                 ✅ 중복 계산 없음`}
        </F>
        <Note tone="amber" title="주의">
          이동을 「출금」 하나만 기록하고 도착지를 남기면 순자산이 갑자기 줄어든다. UI는 이동 폼에서 <b>출발지와 도착지를
          반드시 함께</b> 받고, 도착지 합계 ≠ 출발 금액이면 저장하지 않는다.
        </Note>
      </Sec>

      <Sec id="s05" num="05" kicker="Investment" title="한국 증권사 · 프랍 트레이딩 계좌 구조">
        <H3 no="5-1">하나의 증권사, 여러 계좌</H3>
        <P>
          증권사는 institutions(kind=broker)에 1행, 각 계좌는 accounts에 별도 행이다. 통화·잔액·스냅샷이 완전히 독립이다.
        </P>
        <T
          caption="표 5-1 · 동일 증권사 다중 계좌 등록 결과"
          head={["institution", "계좌 별칭", "accountType", "통화", "시작 잔액", "순자산"]}
          rows={[
            ["키움증권", "키움 국내주식", "stock", "KRW", "₩30,000,000", "포함"],
            ["키움증권", "키움 해외주식", "stock_ovs", "USD", "$4,000", "포함"],
            ["키움증권", "키움 해외선물", "futures", "USD", "$6,000", "포함"],
            ["미래에셋증권", "미래 해외주식", "stock_ovs", "USD", "$2,500", "포함"],
            ["삼성증권", "삼성 종합", "securities", "KRW", "₩8,000,000", "포함"],
          ]}
          note="5개 행이 모두 accounts 테이블에 독립 저장되며, 각각 invSnapshots 를 자기 키로 가진다."
        />

        <H3 no="5-2">일일 평가잔액 입력 — 매매를 기록하지 않는다</H3>
        <P>
          사용자는 하루에 수십 번 매매한다. 개별 체결 입력은 절대 받지 않고, <b>하루 마지막 평가잔액 1개</b>만 입력받는다.
          실제 매매손익은 입출금을 제거해 순수하게 계산한다.
        </P>
        <F label="표 5-2 · 매매손익 분리 공식 (invSnapshots)">
          {`tradePnl(d) = endBalance(d) − endBalance(d−1) − deposit(d) + withdrawal(d)

예시: 전일 $10,000 · 당일 입금 $1,000 · 당일 출금 $500 · 당일 최종 $10,800
      = 10,800 − 10,000 − 1,000 + 500 = $300        ← 실제 매매손익
잔액 변화는 +$800이지만, 그중 $500은 본인 자금이다.

누적 손익  = Σ tradePnl
누적 수익률 = Σ tradePnl ÷ (시작잔액 + 순입금)
일간 수익률 = tradePnl(d) ÷ endBalance(d−1)`}
        </F>
        <Steps
          items={[
            { t: "투자 탭 → 계좌 선택 → 「오늘 잔액 입력」", d: "날짜는 기본 오늘(Asia/Phnom_Penh), 과거 날짜 선택 가능." },
            { t: "금액 입력", d: "숫자 키패드. 통화 기호 고정. 이전 날짜의 endBalance가 있으면 자동 계산 패널이 갱신된다." },
            { t: "입금 / 출금 금액", d: "0 기본값. 값이 있으면 화면에 ‘매매손익 = …’이 실시간으로 계산 표시된다." },
            { t: "메모 · 저장", d: "invSnapshots upsert (accountId+date unique). 같은 날 재입력 시 덮어쓰고 이전 값을 이력에 남긴다." },
            { t: "성과 그래프", d: "선 그래프(평가잔액) 위에 막대(일간 매매손익)를 겹쳐 그린다. 입출금일은 눈금으로 표시." },
          ]}
        />

        <H3 no="5-3">프랍 트레이딩 — 소유하지 않은 자금</H3>
        <Note tone="red" title="절대 규칙">
          프랍 회사가 제공한 $100,000은 <b>사용자의 자산이 아니다</b>. propAccounts.nominalSize와 currentBalance는 순자산 계산에서
          무조건 배제하며, 미지급 수익도 배제한다. <b>실제 지급받은 금액(payoutReceived)만</b> 수령 계좌 잔액을 올린다.
        </Note>
        <T
          caption="표 5-3 · propAccounts 등록 필드"
          head={["필드", "예시", "표시 위치", "순자산"]}
          rows={[
            ["프랍 회사 / 계정 별칭", "FTMO · 100K Phase2", "카지노 아닌 별도 ‘프랍’ 영역", "—"],
            ["계정 종류 / 명목 규모", "평가 단계 · $100,000", "성과 상단 배너", "제외"],
            ["현재 평가잔액", "$104,320", "성과 지표", "제외"],
            ["목표 수익 / 최대 손실", "+$10,000 / −$5,000 (일일 $5,000)", "게이지 바", "제외"],
            ["계정 상태", "평가 → 펀딩 → 거래 중 → 통과/탈락/종료", "상태 배지", "—"],
            ["참가비 · 기타 비용", "$99 (USD)", "지출 거래로 기록", "지출 반영"],
            ["실제 출금 가능 수익", "$2,150", "미지급 지표(회색)", "제외"],
            ["실제 지급받은 수익", "$1,000 → ABA 입금", "수령 이력", "수령 계좌 +$1,000"],
          ]}
        />
        <F label="프랍 지급 처리 (3개 기록이 한 트랜잭션에서 원자적으로)">
          {`propPayouts:  { amount:1000, currency:'USD', receivedAt, toAccountId:ABA, fee:0 }
accounts:     ABA.currentBalance  += 1000
transactions: { type:'income', subType:'prop_payout', amount:1000, accountId:ABA,
                categoryId:'투자수익', memo:'FTMO 100K 첫 지급' }

→ 순자산 +$1,000 (정확히 실제 수령분만) · 프랍 계정 잔액은 그대로 둔다`}
        </F>
      </Sec>

      <Sec id="s06" num="06" kicker="Crypto" title="복수 암호화폐 지갑 구조">
        <P lead>
          지갑은 <b>cryptoWallets</b>에 종류·서비스·국가를 각각 독립 등록한다. 업비트, 바이낸스, SafePal, Trust Wallet,
          Trezor를 각각 1행으로 두고, 보유 코인은 지갑별 cryptoAssets로 분리한다.
        </P>

        <T
          caption="표 6-1 · 지갑 등록 예시"
          head={["지갑 이름", "kind", "국가/서비스", "보유", "평가금액(USD)"]}
          rows={[
            ["업비트", "krExchange", "한국 · Upbit", "BTC 0.182 / XRP 4,000", "$5,920.65"],
            ["바이낸스", "overseasExchange", "해외 · Binance", "USDT 3,200", "$3,200.00"],
            ["SafePal", "hardware", "개인 지갑", "USDT 1,480 / ETH 0.42", "$2,140.00"],
            ["Trust Wallet", "software", "개인 지갑", "BNB 1.9", "$1,120.00"],
            ["Trezor Model T", "hardware", "개인 지갑", "BTC 0.014", "$1,000.00"],
          ]}
          note="평가금액 = Σ(quantity × cryptoPrices.price) — 수량은 cryptoAssets, 가격은 cryptoPrices에만 존재."
        />

        <H3 no="6-1">시세 동기화 상태 머신</H3>
        <T
          head={["상태", "조건", "UI 표시", "수량·거래 기록"]}
          rows={[
            ["fresh", "fetchedAt < 10분", "실시간 점 (녹색) + ‘12:04 동기화’", "변경 없음"],
            ["stale", "10분 ~ 24시간", "회색 점 + 마지막 시각", "변경 없음"],
            ["offline", "네트워크 없음 / fetch 실패", "「오프라인 · 마지막 정상가 3/12 21:40」 배지", "변경 없음"],
            ["manual", "사용자가 가격 직접 입력", "「수동 시세」 뱃지 + 출처=manual", "변경 없음"],
            ["error", "심볼 미지원 등", "경고 아이콘 + 재시도 버튼", "변경 없음"],
          ]}
          note="동기화는 cryptoPrices 한 스토어만 쓴다. cryptoAssets.quantity 를 쓰는 코드 경로는 테스트로 금지한다."
        />
        <F label="지갑 간 이동 (SafePal → 나가2 카지노 Buy-in)">
          {`cryptoTransactions:
  { type:'withdrawal', wallet:SafePal, symbol:'USDT', quantity:2000,
    feeSymbol:'USDT', feeQuantity:5, counterparty:'나가2 세션 #7',
    usdValueAtTime:2000, txDate:'2026-03-14T21:12' }

SafePal USDT 수량 1,480 → −2,005   (수수료 5 포함 차감)
카지노: casinoBuyIns { amount:1995, chipAmount:1995, fromType:'cryptoWallet', fromId:SafePal }
   → 세션 총 Buy-in $1,995, 수수료 $5는 별도 비용으로 기록
순자산: −$2,005 (지갑) + 0 (카지노 칩은 미포함) = −$2,005  ← Buy-in이 자산을 소모한 것이 맞음`}
        </F>
        <Note tone="blue" title="개인키 · 시드문구">
          앱은 개인키·시드문구·JSON 파일을 <b>요구하지도 저장하지도 않는다</b>. 지갑은 "이름 + 종류 + 보유 수량"만 기록하는
          장부일 뿐이다. 화면에 이 안내 문구를 고정 표시한다.
        </Note>
      </Sec>

      <Sec id="s07" num="07" kicker="Net Worth" title="전체 순자산 계산 방식">
        <P lead>
          이 문서의 핵심이다. 아래 계산기는 <b>실제로 동작한다</b> — 기준 통화를 바꾸거나 환율 입력값을 수정하면 즉시 다시
          계산된다. 제외 3건(프랍 명목 · 미지급 수익 · 진행 중 칩)이 회색 취소선으로 분리되는 것을 확인하라.
        </P>

        <NetWorthDemo />

        <H3 no="7-1">포함 / 제외 규칙</H3>
        <T
          caption="표 7-2 · 순자산 편입 규칙 (accountTypes.includesInNetWorth 로 제어)"
          head={["항목", "소스", "순자산", "근거"]}
          rows={[
            ["은행 계좌 잔액", "accounts.currentBalance", "포함", "실제 소유"],
            ["지갑·금고 현금", "cashLocations 잔액", "포함", "실제 소유"],
            ["투자 계좌 평가액", "invSnapshots(endBalance)", "포함", "실제 소유"],
            ["암호화폐 평가액", "quantity × 시세", "포함", "실제 소유"],
            ["프랍 명목 계정 규모", "propAccounts.nominalSize", "<b>제외</b>", "타인 자금"],
            ["프랍 현재 평가잔액", "propAccounts.currentBalance", "<b>제외</b>", "인출 전 · 성과 지표"],
            ["프랍 미지급 수익", "payoutRequested − payoutReceived", "<b>제외</b>", "수령 전"],
            ["카지노 진행 중 칩", "buyIn − cashOut (미정산)", "<b>제외</b>", "현금화 전"],
            ["예정 입금 · 미실행 주문", "—", "제외", "기록되지도 않는다"],
          ]}
        />

        <H3 no="7-2">계산 공식과 데이터 흐름</H3>
        <F label="표 7-3 · 순자산 (기준 통화 B)">
          {`rate[c]  = exchangeRates에서 base=USD, quote=c 의 최신 effectiveAt 값 (rate[USD] ≡ 1)

bank(c)   = Σ accounts.currentBalance            where includesInNetWorth=true
cash(c)   = Σ cashLocations.balance
inv(c)    = Σ invSnapshots(최신 date).endBalance
crypto(c) = Σ cryptoAssets.quantity × price(symbol)

NW(B) = ( bank + cash + inv + crypto ) → USD 환산 → × rate[B]

제외 집합 EX = { prop.nominal, prop.current, prop.unpaid, casino.ongoingChips }
표시용 합계 NAIVE = NW + toBase(EX)   ← 이 값은 화면에 "총계"로 절대 쓰지 않는다`}
        </F>
        <L
          items={[
            <><b>내부 이체 불변식:</b> 어떤 transfer를 기록해도 ΔNW = 0. 자동 테스트로 고정한다.</>,
            <><b>수입/지출:</b> income은 출발 계좌 잔액 증가 → NW 증가. expense는 반대. 카지노 Buy-in은 expense가 아니라 transfer이므로 NW가 줄지 않는다(자금이 칩으로 갔다가 cash-out으로 돌아올 뿐).</>,
            <><b>부채(향후 확장):</b> liabilities 스토어를 추가하면 NW − Σdebt 로 확장. 현재는 필드만 비워둔다(스키마 변경 없음).</>,
          ]}
        />

        <H3 no="7-3">환율 원칙 — 과거는 절대 바뀌지 않는다</H3>
        <F label="표 7-4 · 이중 기록 구조">
          {`거래 기록(불변):  amount=1,000,000  currency=KRW  fxRateId=r-0312  amountBase=719.42 USD
                                  ↑ 2026-03-12 당시 rate 1,390 으로 환산된 값

오늘 평가(가변):  accounts 잔액 18,000,000 KRW × rate[오늘]=1,385 → 12,996.39 USD

환율 변경(1,385 → 1,400) 후:
  · 과거 거래 amountBase      = 719.42 USD 그대로 유지   ✅
  · 오늘 자산 평가액          = 12,857.14 USD 로 갱신   ✅
  · exchangeRates 에 새 행 INSERT (이력 보존)           ✅`}
        </F>
        <Note tone="green" title="환율 변경 전후 비교">
          설정 → 환율 관리에는 <b>‘적용 전 / 적용 후 총자산’ 비교</b>를 표시한다. 예: 1,385→1,400 적용 시 총자산 $95,240.59
          → $94,710.71 (−$529.88). 사용자가 환율 오픈 입력으로 인한 왜곡을 즉시 눈치챌 수 있게 한다.
        </Note>
      </Sec>

      <Sec id="s08" num="08" kicker="Casino" title="카지노 Buy-in / Cash-out 데이터 구조">
        <P lead>
          카지노는 <b>계좌가 아니라 장소</b>다. 별도 잔액을 만들지 않는다. 모든 자금은 기존 계좌·현금·지갑에서 이동하며,
          카지노 스토어는 이동의 시작과 끝만 기록한다.
        </P>

        <H3 no="8-1">세션 수명주기</H3>
        <F label="표 8-1 · 상태 전이">
          {`(없음) --첫 Buy-in--> [진행 중 ongoing] --세션 종료--> [종료 closed]
                              |  +추가 Buy-in, +Cash-out(다수), +분할 수령
                              v
                     casinoSettlements 1행 자동 생성 (총BuyIn · 총CashOut · 손익)
                     이후 수정 금지 · 취소 시에도 원본은 보존`}
        </F>

        <H3 no="8-2">Buy-in 입력 순서 (모바일 시트)</H3>
        <Steps
          items={[
            { t: "하단 FAB 「빠른 입력」 → 「카지노 Buy-in」", d: "홈·자산·내역 어디서든 접근." },
            { t: "카지노 선택", d: "나가1 / 나가2 chips + 「+ 새 카지노」. 진행 중 세션이 있으면 해당 세션에 자동 귀속." },
            { t: "출발 자산 선택", d: "계좌(한국/캄보디아/해외 은행) · 지갑 현금 · 집 금고 · 기타 금고 · 암호화폐 지갑 · 기타. 그룹별 시트." },
            { t: "금액 · 통화", d: "출발 자산의 통화가 기본값. 다른 통화 선택 시 환율 입력 필드가 나타난다." },
            { t: "실제 칩 교환 금액 · 환전 수수료/차액", d: "예: $2,000 출발 → 칩 $1,950, 수수료 $50. 차액은 별도 필드로 보존." },
            { t: "날짜 · 시간 · 메모", d: "기본 현재 시각(Asia/Phnom_Penh). 과거 방문도 입력 가능." },
            { t: "저장", d: "진행 중 세션이 없으면 casinoSessions를 먼저 생성하고 그 다음 buyIns INSERT. 출발 자산 잔액 차감까지 원자 처리." },
          ]}
        />

        <H3 no="8-3">분할 Cash-out</H3>
        <F label="표 8-2 · 총 $2,500을 두 곳으로 분할 수령">
          {`casinoCashOuts  { sessionId:S7, totalAmount:2500, currency:'USD', fee:0, date }
casinoCashOutLegs
   ├─ { toType:'account',      toId:ABA,   amount:1500 }  → ABA.currentBalance   += 1,500
   └─ { toType:'cashLocation', toId:safe,  amount:1000 }  → cashLocations.safe   += 1,000

검증: Σ legs.amount === totalAmount − fee   (불일치 시 저장 차단)
순자산: +2,500 (도착 합계) · 칩 잔액 0 처리`}
        </F>

        <H3 no="8-4">세션 손익과 자산 흐름 (시나리오 6 완전 정합)</H3>
        <T
          caption="표 8-3 · 나가1 세션 원장 — 시작 잔액 ABA $7,500 / 지갑 $800 / 금고 $2,000"
          head={["시점", "이벤트", "ABA", "지갑 현금", "집 금고", "칩", "순자산"]}
          rows={[
            ["03-10 20:00", "시작", "$7,500", "$800", "$2,000", "$0", "$10,300"],
            ["03-10 20:12", "Buy-in #1 (ABA $2,000)", "$5,500", "$800", "$2,000", "$2,000", "$8,300"],
            ["03-10 20:12", "Buy-in #2 (지갑 $500)", "$5,500", "$300", "$2,000", "$2,500", "$7,800"],
            ["03-10 23:40", "Cash-out #1 → ABA $2,000", "$7,500", "$300", "$2,000", "$500", "$9,800"],
            ["03-10 23:40", "Cash-out #2 → 금고 $1,000", "$7,500", "$300", "$3,000", "$0", "$10,800"],
            ["03-10 23:45", "세션 종료 · 정산", "$7,500", "$300", "$3,000", "—", "<b>$10,800</b>"],
          ]}
          note="총 Buy-in $2,500 · 총 Cash-out $3,000 · 세션 손익 = +$500. 진행 중인 칩은 순자산에서 빠지므로 Buy-in 시 $10,300 → $8,300 → $7,800으로 내려갔다가 Cash-out 후 $10,800으로 회복한다. 순자산 최종 변화 +$500 = 세션 손익과 정확히 일치 · Buy-in/Cash-out은 income/expense 0건."
        />
        <F label="표 8-4 · 손익 공식">
          {`sessionPnl = Σ cashOut − Σ buyIn                       (같은 통화 기준)
           = 3,000 − 2,500 = +$500

다중 통화 시:
  원본 통화 amount · fxRateId · amountBase 를 legs마다 보존
  sessionPnl(B) = Σ toBase(cashOut) − Σ toBase(buyIn)   (B = 기준 통화)
  수수료·환전 차액은 amountBase 에 이미 반영되므로 별도 차감하지 않는다`}
        </F>

        <H3 no="8-5">카지노 화면 구성</H3>
        <L
          items={[
            <><b>목록:</b> 카지노별 방문 횟수 · 누적 Buy-in · 누적 Cash-out · 누적 손익(막대) · 진행 중 세션 배지(오렌지, 최상단 고정).</>,
            <><b>세션 상세:</b> 상단에 총 Buy-in / 총 Cash-out / 현재 손익 3분할 카드. 진행 중이면 손익에 <span className="font-mono text-[12px]">미확정</span> 뱃지와 함께 회색 배경.</>,
            <><b>세션 상세 하단:</b> 시간순 거래 목록(출발지/도착지 표시) + 고정 하단 바 「추가 Buy-in」「Cash-out」「세션 종료」 3버튼.</>,
            <><b>세션 종료:</b> 미정산이 있으면 “칩 잔액 $X가 현금화되지 않았습니다” 확인 모달 → Cash-out으로 유도 또는 강제 종료 선택. 종료 후에는 settlements 행이 고정된다.</>,
          ]}
        />
      </Sec>
    </>
  );
}
