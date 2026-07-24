"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const B = "#11224E";
const O = "#eb670e";

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-black uppercase tracking-widest text-neutral-400 ${className}`}>
      {children}
    </p>
  );
}

export function FilterPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-6 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
        active ? "bg-[#11224E] text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

export function QuietKpi({
  label,
  value,
  sub,
  suffix,
  icon: Icon,
  alert = false,
}: {
  label: string;
  value: string;
  sub: string;
  suffix?: string;
  icon: React.ElementType;
  alert?: boolean;
}) {
  const displayLen = value.length + (suffix?.length ?? 0);
  const sizeClass =
    displayLen > 10
      ? "text-lg sm:text-xl"
      : displayLen > 6
        ? "text-xl sm:text-2xl"
        : "text-2xl sm:text-3xl";

  return (
    <div
      className={`rounded-2xl border p-5 min-w-0 ${
        alert ? "border-red-200/70 bg-red-50/70" : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className={`text-xs leading-snug min-w-0 ${alert ? "text-red-600/80" : "text-neutral-500"}`}>{label}</p>
        <Icon size={18} className="shrink-0" style={{ color: alert ? "#DC2626" : O }} strokeWidth={1.75} />
      </div>
      <div
        className={`${sizeClass} font-normal tracking-tight tabular-nums leading-none flex flex-wrap items-baseline gap-x-1.5 min-w-0 ${
          alert ? "text-red-600" : ""
        }`}
        style={!alert ? { color: B } : undefined}
      >
        <span className="min-w-0">{value}</span>
        {suffix && (
          <span className="text-[0.55em] font-medium text-neutral-400 whitespace-nowrap">{suffix}</span>
        )}
      </div>
      {sub && (
        <p className={`text-[12px] mt-2 leading-snug line-clamp-2 ${alert ? "text-red-500/90" : "text-neutral-400"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
  alert = false,
  accentColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  alert?: boolean;
  accentColor?: string;
}) {
  const accent = accentColor ?? (alert ? "#DC2626" : B);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-[0_8px_24px_-12px_rgba(17,34,78,0.18)] ${
        alert ? "border-red-200/80 bg-red-50/30" : "border-white/80 bg-white/90 backdrop-blur-sm"
      }`}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: accent }} />
      <div className="flex items-center justify-between mb-3 pl-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={13} className={iconColor} />
        </div>
      </div>
      <p
        className={`text-xl sm:text-2xl font-black tracking-tight leading-none pl-2 ${valueColor ?? ""}`}
        style={!valueColor ? { color: B } : undefined}
      >
        {value}
      </p>
      <p className="text-[9px] font-semibold text-neutral-400 mt-1 uppercase tracking-wide pl-2">{sub}</p>
    </div>
  );
}

export function Panel({
  title,
  href,
  children,
  accentColor = O,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 min-w-0 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">{title}</span>
        <Link href={href} className="text-[10px] font-bold flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors shrink-0" style={{ color: accentColor }}>
          Voir <ArrowUpRight size={11} />
        </Link>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function PanelRow({
  icon,
  iconBg,
  label,
  value,
  alert = false,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
        <span className="text-[12px] font-semibold text-neutral-600">{label}</span>
      </div>
      <span
        className={`text-lg font-black ${alert ? "text-red-500" : value === 0 ? "text-neutral-300" : ""}`}
        style={!alert && value > 0 ? { color: B } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

const QUICK_COLORS: Record<string, { bg: string; icon: string; hover: string; accent: string; gradient: string }> = {
  blue:   { bg: "bg-blue-50",   icon: "text-white",   hover: "hover:border-blue-200", accent: B, gradient: `linear-gradient(135deg, ${B} 0%, #1a3568 100%)` },
  purple: { bg: "bg-purple-50", icon: "text-white", hover: "hover:border-purple-200", accent: "#7c3aed", gradient: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" },
  green:  { bg: "bg-emerald-50",icon: "text-white",hover: "hover:border-emerald-200", accent: "#059669", gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
  orange: { bg: "bg-orange-50", icon: "text-white", hover: "hover:border-orange-200", accent: O, gradient: `linear-gradient(135deg, ${O} 0%, #c95508 100%)` },
};

export function QuickAction({
  href,
  icon: Icon,
  label,
  subtitle,
  color = "blue",
  badge,
  onClick,
}: {
  href?: string;
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  color?: string;
  badge?: number;
  onClick?: () => void;
}) {
  const c = QUICK_COLORS[color] ?? QUICK_COLORS.blue;
  const inner = (
    <>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform"
        style={{ background: c.gradient }}
      >
        <Icon size={16} className={c.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[12px] font-black leading-tight block" style={{ color: B }}>{label}</span>
        {subtitle && <span className="text-[10px] text-neutral-400 mt-0.5 block">{subtitle}</span>}
      </div>
      {badge !== undefined && (
        <span className="absolute top-2 right-2 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1" style={{ backgroundColor: O }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  const cls = `group relative bg-white/90 backdrop-blur-sm border border-neutral-200/80 ${c.hover} rounded-2xl p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-3 transition-all hover:shadow-md text-left w-full min-h-[44px] overflow-hidden`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        <div className="absolute left-0 top-0 bottom-0 w-1 scale-y-0 group-hover:scale-y-100 origin-top transition-transform rounded-l-2xl" style={{ backgroundColor: c.accent }} />
        {inner}
      </button>
    );
  }

  return (
    <Link href={href || "#"} className={cls}>
      <div className="absolute left-0 top-0 bottom-0 w-1 scale-y-0 group-hover:scale-y-100 origin-top transition-transform rounded-l-2xl" style={{ backgroundColor: c.accent }} />
      {inner}
    </Link>
  );
}

export function PendingBanner() {
  return (
    <p className="text-[9px] sm:text-[10px] font-black text-amber-700 uppercase tracking-widest leading-snug">
      En attente d&apos;activation par Nexa — vous pouvez configurer votre espace librement.
    </p>
  );
}

export { B as BLUE, O as ORANGE };
