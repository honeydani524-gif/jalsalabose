import { useEffect, useRef, useState, type ReactNode } from "react";

/* ────────────────────────────────────────────────
   문서 공통 컴포넌트 — KS 규격집 / 스위스 기술 문서
   ──────────────────────────────────────────────── */

export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function Sec({
  id,
  num,
  title,
  kicker,
  children,
}: {
  id: string;
  num: string;
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-rule pt-10 pb-14 md:pt-14 md:pb-20">
      <header className="reveal mb-7">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[13px] font-bold tracking-widest text-brand">{num}</span>
          {kicker && (
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{kicker}</span>
          )}
        </div>
        <h2 className="mt-2 font-serif text-[27px] leading-[1.25] font-bold tracking-tight text-ink md:text-[34px]">
          {title}
        </h2>
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function H3({ children, no }: { children: ReactNode; no?: string }) {
  return (
    <h3 className="reveal mt-9 flex items-baseline gap-2.5 border-b border-rule pb-2 font-serif text-[19px] font-bold text-ink md:text-[21px]">
      {no && <span className="font-mono text-[12px] font-bold text-brand">{no}</span>}
      {children}
    </h3>
  );
}

export function P({ children, lead = false }: { children: ReactNode; lead?: boolean }) {
  return (
    <p
      className={
        lead
          ? "reveal max-w-[70ch] text-[16.5px] leading-[1.85] text-ink/85 md:text-[17.5px]"
          : "reveal max-w-[72ch] text-[15px] leading-[1.85] text-ink/80"
      }
    >
      {children}
    </p>
  );
}

export function L({ items }: { items: ReactNode[] }) {
  return (
    <ul className="reveal max-w-[72ch] space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-[1.8] text-ink/80">
          <span className="mt-[0.72em] h-px w-3 shrink-0 bg-brand/70" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* 사양 표 — 문서의 주인공 */
export function T({
  caption,
  head,
  rows,
  note,
}: {
  caption?: string;
  head: string[];
  rows: (ReactNode | string)[][];
  note?: string;
}) {
  return (
    <figure className="reveal">
      {caption && (
        <figcaption className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {caption}
        </figcaption>
      )}
      <div className="overflow-x-auto border-b border-rule bg-card">
        <table className="spec min-w-[560px]">
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j === 0 ? "m font-medium" : undefined}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-muted">{note}</p>}
    </figure>
  );
}

/* 여백 주석 / 주의 블록 */
export function Note({
  tone = "blue",
  title,
  children,
}: {
  tone?: "blue" | "amber" | "red" | "green";
  title: string;
  children: ReactNode;
}) {
  const tones = {
    blue: "border-brand/40 bg-brand/[0.045] text-ink/85",
    amber: "border-warn/50 bg-warn/[0.06] text-ink/85",
    red: "border-stamp/45 bg-stamp/[0.05] text-ink/85",
    green: "border-pos/45 bg-pos/[0.055] text-ink/85",
  } as const;
  const bar = {
    blue: "bg-brand",
    amber: "bg-warn",
    red: "bg-stamp",
    green: "bg-pos",
  } as const;
  return (
    <aside className={`reveal border-l-2 ${tones[tone]} py-3 pl-4 pr-4`}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${bar[tone]}`} aria-hidden />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink/70">
          {title}
        </span>
      </div>
      <div className="max-w-[70ch] text-[14px] leading-[1.8] text-ink/80">{children}</div>
    </aside>
  );
}

/* 수식 블록 */
export function F({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="reveal border border-rule bg-card p-4 md:p-5">
      {label && (
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{label}</div>
      )}
      <div className="overflow-x-auto font-mono text-[13.5px] leading-[1.9] text-ink tnum">{children}</div>
    </div>
  );
}

/* 명령어 블록 + 실제 복사 동작 */
export function Cmd({ lines, title }: { lines: string[]; title?: string }) {
  const [ok, setOk] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setOk(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOk(false), 1600);
    } catch {
      setOk(false);
    }
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div className="reveal border border-ink/15 bg-ink text-[#e6edf3]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">
          {title ?? "terminal"}
        </span>
        <button
          onClick={copy}
          className="cursor-pointer rounded-none border border-white/20 px-2.5 py-1 font-mono text-[11px] text-white/70 transition hover:border-brand hover:bg-brand hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        >
          {ok ? "복사됨 ✓" : "복사"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.9]">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="select-none text-white/30">$ </span>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

/* 트리 */
export function Tree({ lines }: { lines: string[] }) {
  return (
    <div className="reveal overflow-x-auto border border-rule bg-card p-4">
      <pre className="font-mono text-[12.5px] leading-[1.85] text-ink/85">
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </pre>
    </div>
  );
}

export function Steps({ items }: { items: { t: string; d: ReactNode }[] }) {
  return (
    <ol className="reveal space-y-0 border-l border-rule pl-0">
      {items.map((s, i) => (
        <li key={i} className="relative pb-5 pl-6 last:pb-0">
          <span className="absolute -left-[9px] top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-brand bg-card font-mono text-[10px] font-bold text-brand">
            {i + 1}
          </span>
          <div className="text-[15px] font-bold text-ink">{s.t}</div>
          <div className="mt-1 max-w-[70ch] text-[14.5px] leading-[1.8] text-ink/75">{s.d}</div>
        </li>
      ))}
    </ol>
  );
}
