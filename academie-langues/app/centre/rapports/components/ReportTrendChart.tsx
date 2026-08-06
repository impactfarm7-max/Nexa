"use client";

import { fmtMoneyBar } from "@/app/utils/reports-export";
import { useI18n } from "@/app/i18n/I18nProvider";

export type TrendPoint = {
  label: string;
  value: number;
};

const BLUE = "#11224E";

type Props = {
  title: string;
  points: TrendPoint[];
  formatValue?: (n: number) => string;
};

function defaultMoneyFormat(n: number, locale: "fr" | "en") {
  if (Math.abs(n) >= 10_000) return fmtMoneyBar(n);
  return n.toLocaleString(locale === "en" ? "en-US" : "fr-FR");
}

export default function ReportTrendChart({ title, points, formatValue }: Props) {
  const { t, locale } = useI18n();
  const fmt = formatValue ?? ((n: number) => defaultMoneyFormat(n, locale));

  if (!points.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 mb-2">{title}</p>
        <p className="text-xs text-neutral-400">{t("centre", "reportsNoDataForPeriod")}</p>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 320;
  const h = 80;
  const padX = 8;
  const padY = 8;

  const coords = points.map((p, i) => {
    const x = points.length <= 1 ? w / 2 : padX + (i / (points.length - 1)) * (w - padX * 2);
    const y = padY + (h - padY * 2) - (p.value / max) * (h - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${h - padY} L ${coords[0].x} ${h - padY} Z`;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 mb-4 leading-snug">
        {title}
      </p>
      <div className="overflow-x-auto -mx-1 px-1">
        <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full min-w-[260px] h-auto" role="img" aria-label={title}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#11224E" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#11224E" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="#11224E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((c) => (
            <g key={c.label}>
              <circle cx={c.x} cy={c.y} r="3.5" fill="#eb670e" stroke="#fff" strokeWidth="1.5" />
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-neutral-100">
        {points.map((p) => (
          <div key={p.label} className="min-w-0">
            <p className="text-[10px] font-medium text-neutral-400 truncate">{p.label}</p>
            <p className="text-xs font-semibold tabular-nums truncate" style={{ color: BLUE }}>
              {fmt(p.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
