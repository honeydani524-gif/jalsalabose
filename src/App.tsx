import { useCallback, useEffect, useState } from "react";
import { AppStoreProvider, useStore } from "./store/AppStore";
import { QuickCtx, type QuickAction } from "./ui/quick";
import { Btn, Icon, Modal, Segmented } from "./ui/kit";
import { useReveal } from "./components/ui";
import HomeScreen from "./screens/Home";
import AssetsScreen from "./screens/Assets";
import TxScreen from "./screens/Tx";
import InvestScreen from "./screens/Invest";
import CasinoScreen from "./screens/Casino";
import { AnalysisScreen, AIScreen } from "./screens/Analysis";
import SettingsScreen from "./screens/Settings";
import { Part1 } from "./sections/Part1";
import { Part2 } from "./sections/Part2";
import { Part3 } from "./sections/Part3";
import { Part4 } from "./sections/Part4";
import { QuickForms } from "./screens/forms";
import { CUR_LIST } from "./domain/calc";

const ROUTES = [
  { path: "home", label: "홈", icon: "home" },
  { path: "assets", label: "자산", icon: "wallet" },
  { path: "tx", label: "거래 내역", icon: "list" },
  { path: "invest", label: "투자", icon: "chart" },
  { path: "casino", label: "카지노", icon: "dice" },
  { path: "analysis", label: "분석", icon: "spark" },
  { path: "ai", label: "AI 분석", icon: "target" },
  { path: "settings", label: "설정", icon: "gear" },
  { path: "spec", label: "설계 문서", icon: "search" },
];

const MOBILE_TABS = ["home", "assets", "tx", "analysis", "settings"];

function useRoute(): [string, (p: string) => void] {
  const parse = () => (window.location.hash.replace(/^#\/?/, "") || "home").split("?")[0];
  const [path, setPath] = useState(parse);
  useEffect(() => {
    const on = () => setPath(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const nav = useCallback((p: string) => {
    window.location.hash = `/${p}`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);
  return [path, nav];
}

function SpecScreen() {
  useReveal();
  return (
    <div>
      <div className="mb-6 border-b-2 border-ink pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          JS-2026-001 · 전체 설계 명세서 v0.9
        </p>
        <h1 className="mt-2 font-serif text-[34px] leading-tight font-black text-ink md:text-[44px]">
          잘살아보세 설계 문서
        </h1>
        <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-ink/75">
          아키텍처 · 데이터베이스 · 순자산 계산 원칙 · 화면 설계 · 테스트 계획 · 개발 일정. 승인된 설계를 그대로 구현한
          코드와 대조해서 읽을 수 있습니다.
        </p>
      </div>
      <Part1 />
      <Part2 />
      <Part3 />
      <Part4 />
    </div>
  );
}

function QuickMenu({ onClose, onPick }: { onClose: () => void; onPick: (a: QuickAction) => void }) {
  const items: { a: QuickAction; label: string; icon: string; desc: string }[] = [
    { a: "income", label: "수입", icon: "up", desc: "급여 · 입금" },
    { a: "expense", label: "지출", icon: "down", desc: "결제 · 출금" },
    { a: "transfer", label: "계좌 이체", icon: "chev", desc: "총자산 변화 0" },
    { a: "snapshot", label: "투자 잔액", icon: "chart", desc: "오늘 평가잔액" },
    { a: "buyin", label: "카지노 Buy-in", icon: "dice", desc: "세션 자동 생성" },
    { a: "prop", label: "프랍 지급", icon: "target", desc: "실제 수령만 반영" },
  ];
  return (
    <Modal open title="빠른 입력" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={() => onPick(it.a)}
            className="cursor-pointer rounded-2xl border border-rule bg-white p-3.5 text-left transition hover:border-brand hover:bg-[#f9fbfd]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef4ff] text-brand">
              <Icon name={it.icon} className="h-4.5 w-4.5" />
            </span>
            <span className="mt-2.5 block text-[14.5px] font-bold text-ink">{it.label}</span>
            <span className="mt-0.5 block font-mono text-[11.5px] text-muted">{it.desc}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Shell() {
  const { data, setSettings, error, clearError } = useStore();
  const [path, nav] = useRoute();
  const [quick, setQuick] = useState<QuickAction>(null);
  const [menu, setMenu] = useState(false);
  const current = ROUTES.find((r) => r.path === path) ?? ROUTES[0];

  useEffect(() => {
    if (path === "home" || ROUTES.some((r) => r.path === path)) return;
    nav("home");
  }, [path, nav]);

  const openQuick = (a: QuickAction) => {
    setMenu(false);
    setQuick(a);
  };

  const screen = () => {
    switch (path) {
      case "assets":
        return <AssetsScreen />;
      case "tx":
        return <TxScreen />;
      case "invest":
        return <InvestScreen />;
      case "casino":
        return <CasinoScreen />;
      case "analysis":
        return <AnalysisScreen />;
      case "ai":
        return <AIScreen />;
      case "settings":
        return <SettingsScreen />;
      case "spec":
        return <SpecScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <QuickCtx.Provider value={setQuick}>
      <div className="min-h-screen bg-paper">
        {/* 데스크톱 사이드바 */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[212px] flex-col border-r border-rule bg-white lg:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
              <rect width="24" height="24" rx="6" fill="#3182F6" />
              <path
                d="M5 16.5 9.5 11 13 13.8 19 6.5"
                stroke="#fff"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <div className="font-serif text-[15.5px] leading-none font-bold text-ink">잘살아보세</div>
              <div className="mt-1 font-mono text-[9.5px] tracking-[0.14em] text-muted">JALSALABOSE</div>
            </div>
          </div>
          <nav className="flex-1 px-3">
            {ROUTES.map((r) => {
              const on = current.path === r.path;
              return (
                <button
                  key={r.path}
                  onClick={() => nav(r.path)}
                  className={`mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px] transition ${
                    on ? "bg-[#eef4ff] font-bold text-brand" : "text-ink/70 hover:bg-[#f6f8fa] hover:text-ink"
                  }`}
                >
                  <Icon name={r.icon} className="h-[18px] w-[18px]" />
                  {r.label}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-rule px-5 py-4 font-mono text-[10.5px] leading-relaxed text-muted">
            개발자 · 해외선물 트레이더 / 프랍
            <br />
            Telegram @wti0816
            <br />
            <span className="text-ink/60">v0.1.0 · schema 1</span>
          </div>
        </aside>

        <div className="lg:pl-[212px]">
          {/* 상단 바 */}
          <header className="sticky top-0 z-30 border-b border-rule bg-white/92 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="font-serif text-[16.5px] font-bold text-ink lg:hidden">잘살아보세</span>
                <span className="hidden font-serif text-[16.5px] font-bold text-ink lg:block">
                  {current.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <Segmented
                    size="sm"
                    value={data.settings.base}
                    onChange={(v) => setSettings({ base: v })}
                    options={CUR_LIST.map((c) => ({ value: c, label: c }))}
                  />
                </div>
                <button
                  onClick={() => setSettings({ mask: !data.settings.mask })}
                  aria-label="금액 숨기기"
                  className="cursor-pointer rounded-xl border border-rule p-2 text-muted transition hover:border-brand hover:text-brand"
                >
                  <Icon name={data.settings.mask ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
                </button>
                <span className="hidden lg:block">
                  <Btn size="sm" onClick={() => setMenu(true)}>
                    <Icon name="plus" className="h-4 w-4" /> 빠른 입력
                  </Btn>
                </span>
              </div>
            </div>
          </header>

          {/* 전역 에러 */}
          {error && (
            <div className="mx-auto mt-3 flex max-w-[1120px] items-center justify-between gap-3 rounded-xl bg-[#fdeceb] px-4 py-3 text-[13.5px] text-stamp sm:mx-6">
              <span>{error}</span>
              <button onClick={clearError} className="cursor-pointer font-bold underline">
                닫기
              </button>
            </div>
          )}

          <main className="mx-auto max-w-[1120px] px-4 pt-5 pb-28 sm:px-6 lg:pb-14">
            {screen()}
          </main>
        </div>

        {/* 모바일 하단 탭 */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto flex h-16 max-w-[520px] items-stretch">
            {ROUTES.filter((r) => MOBILE_TABS.includes(r.path)).map((r) => {
              const on = current.path === r.path;
              return (
                <button
                  key={r.path}
                  onClick={() => nav(r.path)}
                  className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] transition ${
                    on ? "font-bold text-brand" : "text-muted"
                  }`}
                >
                  <Icon name={r.icon} className="h-5 w-5" />
                  {r.label === "거래 내역" ? "내역" : r.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* 모바일 FAB */}
        <button
          onClick={() => setMenu(true)}
          aria-label="빠른 입력"
          className="fixed right-4 bottom-20 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95 lg:hidden"
        >
          <Icon name="plus" className="h-6 w-6" />
        </button>

        {menu && <QuickMenu onClose={() => setMenu(false)} onPick={openQuick} />}
        <QuickForms action={quick} onClose={() => setQuick(null)} />
      </div>
    </QuickCtx.Provider>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <Shell />
    </AppStoreProvider>
  );
}
