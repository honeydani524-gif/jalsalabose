/* ────────────────────────────────────────────────────────────
   src/ui/kit.tsx — 공통 UI 컴포넌트
   디자인 토큰: bg #F6F8FA · card #FFFFFF · brand #3182F6
                ink #191F28 · muted #8B95A1 · pos #16A34A · warn #F59E0B
   ──────────────────────────────────────────────────────────── */
import { useEffect, type ReactNode } from "react";
import { fmtAmount, type Settings } from "../domain/calc";

/* ── 아이콘 (lucide 계열 경로를 직접 그림) ───────────────── */
const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  wallet: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19M17 14.5h1.5" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  dice: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L20 8l-4-4L4 16z" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: <path d="M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c6.2 0 10 6 10 6a17 17 0 0 1-3.4 4M6.4 7.6A16.6 16.6 0 0 0 2 12s3.8 6 10 6a9.9 9.9 0 0 0 3.4-.6" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 5.5H5.5a2 2 0 0 0-2 2v10" />
    </>
  ),
  down: <path d="M12 4v13M6.5 11.5 12 17l5.5-5.5M4 21h16" />,
  up: <path d="M12 20V7M6.5 12.5 12 7l5.5 5.5M4 3h16" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  chev: <path d="M9 5.5 16 12l-6.5 6.5" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.7h5M9.5 14.3h5" />
    </>
  ),
  bank: <path d="M3 9.5 12 4l9 5.5M5 10v9M10 10v9M14 10v9M19 10v9M3 21h18" />,
  spark: <path d="M3 16.5 8.5 10l4 4L21 5.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
  fill = false,
}: {
  name: keyof typeof PATHS | string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name] ?? PATHS.dots ?? PATHS.coin}
    </svg>
  );
}

/* ── 버튼 ─────────────────────────────────────────────── */
export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  full,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-deep",
    ghost: "bg-[#eef4ff] text-brand hover:bg-[#dcebff]",
    outline: "bg-white text-ink border border-rule hover:border-brand hover:text-brand",
    danger: "bg-white text-stamp border border-stamp/40 hover:bg-stamp/5",
    dark: "bg-ink text-white hover:bg-[#2b3340]",
  }[variant];
  const s = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2.5 text-[14.5px]", lg: "px-5 py-3.5 text-[15.5px]" }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-45 focus:outline-2 focus:outline-offset-2 focus:outline-brand ${v} ${s} ${
        full ? "w-full" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ── 카드 ─────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-rule bg-white ${pad ? "p-4 md:p-5" : ""} ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  right,
  sub,
}: {
  children: ReactNode;
  right?: ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-[16.5px] font-bold text-ink">{children}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── 입력 ─────────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-rule bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none disabled:bg-[#f6f8fa]";

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[12.5px] font-bold text-ink/70">
        {label}
        {required && <span className="text-brand">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block font-mono text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${inputCls} ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${inputCls} appearance-none pr-8 ${className}`}>
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${inputCls} min-h-[80px] resize-y ${className}`} />;
}

/** 숫자 입력 — 통화 기호를 좌측에 고정 */
export function NumInput({
  value,
  onChange,
  currency,
  placeholder = "0",
  autoFocus,
  step = "any",
}: {
  value: number | "";
  onChange: (v: number | "") => void;
  currency?: string;
  placeholder?: string;
  autoFocus?: boolean;
  step?: string;
}) {
  return (
    <div className="flex items-center rounded-xl border border-rule bg-white px-3.5 focus-within:border-brand">
      {currency && (
        <span className="mr-2 shrink-0 font-mono text-[15px] font-bold text-muted">
          {currency === "USD" ? "$" : currency === "KRW" ? "₩" : currency === "KHR" ? "៛" : currency}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          const t = e.target.value;
          if (t === "") return onChange("");
          const n = Number(t);
          if (Number.isNaN(n)) return;
          onChange(n);
        }}
        className="w-full bg-transparent py-2.5 text-right font-mono text-[19px] font-bold text-ink tnum outline-none placeholder:text-muted/50"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-xl border border-rule bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`cursor-pointer rounded-lg font-bold transition focus:outline-2 focus:outline-offset-2 focus:outline-brand ${
            size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3.5 py-1.5 text-[13.5px]"
          } ${value === o.value ? "bg-brand text-white" : "text-ink/60 hover:text-ink"}`}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
        active ? "border-brand bg-[#eef4ff] text-brand" : "border-rule bg-white text-ink/70 hover:border-brand/40"
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: "gray" | "blue" | "green" | "amber" | "red";
}) {
  const t = {
    gray: "bg-[#f1f3f5] text-muted",
    blue: "bg-[#eef4ff] text-brand",
    green: "bg-[#e8f6ee] text-pos",
    amber: "bg-[#fef4e6] text-warn",
    red: "bg-[#fdeceb] text-stamp",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${t}`}>
      {children}
    </span>
  );
}

/* ── 모바일 시트 / 데스크톱 모달 ───────────────────────── */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b border-rule px-4 py-3.5">
          <h2 className="font-serif text-[16.5px] font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="cursor-pointer rounded-full p-1.5 text-muted transition hover:bg-[#f1f3f5] hover:text-ink"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-rule px-4 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rule bg-white px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff] text-brand">
        <Icon name="spark" className="h-5 w-5" />
      </div>
      <p className="font-serif text-[16px] font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-muted">{desc}</p>
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ── 금액 표시 (숨김 처리 지원) ────────────────────────── */
export function Money({
  v,
  settings,
  cur,
  className = "",
  signed = false,
  serif = false,
}: {
  v: number;
  settings: Settings;
  cur?: string;
  className?: string;
  signed?: boolean;
  serif?: boolean;
}) {
  const c = cur ?? settings.base;
  const text = settings.mask ? "••••••" : fmtAmount(v, c);
  const sign = signed && !settings.mask && v > 0.0049 ? "+" : "";
  const tone = signed ? (v > 0.0049 ? "text-pos" : v < -0.0049 ? "text-warn" : "text-muted") : "";
  const face = serif ? "font-serif font-black" : "font-mono";
  return (
    <span className={`${face} tnum ${tone} ${className}`}>
      {sign}
      {text}
    </span>
  );
}

/* ── 차트 (의존성 없이 SVG로) ─────────────────────────── */
export function Spark({
  values,
  height = 72,
  color = "#3182F6",
  showArea = true,
}: {
  values: number[];
  height?: number;
  color?: string;
  showArea?: boolean;
}) {
  if (values.length < 2) {
    return (
      <div className="flex items-center justify-center text-[12.5px] text-muted" style={{ height }}>
        데이터가 2일 이상 쌓이면 그래프가 표시됩니다
      </div>
    );
  }
  const w = 600;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = height - 6 - ((v - min) / span) * (height - 14);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" preserveAspectRatio="none" aria-hidden>
      {showArea && <path d={area} fill={color} opacity="0.1" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={color} />
    </svg>
  );
}

export function Bars({
  data,
  height = 130,
}: {
  data: { label: string; a: number; b: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end justify-center gap-0.5">
            <div
              className="w-1/2 rounded-t bg-pos/85 transition-all"
              style={{ height: `${(d.a / max) * 100}%` }}
              title={`수입 ${d.a}`}
            />
            <div
              className="w-1/2 rounded-t bg-warn/85 transition-all"
              style={{ height: `${(d.b / max) * 100}%` }}
              title={`지출 ${d.b}`}
            />
          </div>
          <span className="font-mono text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const PALETTE = ["#3182F6", "#16A34A", "#F59E0B", "#8B95A1", "#191F28", "#7DD3FC", "#F87171", "#A78BFA"];

export function Donut({
  items,
  size = 148,
}: {
  items: { label: string; value: number }[];
  size?: number;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" style={{ width: size, height: size }} aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f3f5" strokeWidth="20" />
        {total > 0 &&
          items.map((it, i) => {
            const frac = it.value / total;
            const dash = frac * c;
            const el = (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth="20"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 70 70)"
              />
            );
            acc += dash;
            return el;
          })}
        <text x="70" y="66" textAnchor="middle" className="fill-[#8b95a1] font-mono text-[10px]">
          TOTAL
        </text>
        <text x="70" y="84" textAnchor="middle" className="fill-[#191f28] font-mono text-[14px] font-bold">
          {total > 0 ? `${((items[0]?.value ?? 0) / total * 100).toFixed(0)}%` : "—"}
        </text>
      </svg>
      <ul className="min-w-[160px] flex-1 space-y-1.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2 text-[13.5px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate text-ink/75">{it.label}</span>
            <span className="font-mono text-[12.5px] text-ink tnum">
              {total > 0 ? `${((it.value / total) * 100).toFixed(1)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Row({
  left,
  right,
  sub,
  onClick,
  badge,
}: {
  left: ReactNode;
  right: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
  badge?: ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 border-b border-rule px-1 py-3 text-left last:border-b-0 ${
        onClick ? "cursor-pointer transition hover:bg-[#f9fbfd]" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 truncate text-[14.5px] font-medium text-ink">
          {left}
          {badge}
        </div>
        {sub && <div className="mt-0.5 truncate text-[12.5px] text-muted">{sub}</div>}
      </div>
      <div className="shrink-0 text-right">{right}</div>
    </Tag>
  );
}
