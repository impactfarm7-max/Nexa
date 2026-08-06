"use client";

import { fmtMoneyBar } from "@/app/utils/reports-export";
import { useI18n } from "@/app/i18n/I18nProvider";

export type BarChartItem = {
  label: string;
  value: number;
};

const BLUE = "#11224E";

type Props = {
  title: string;
  items: BarChartItem[];
  formatValue?: (n: number) => string;
  maxItems?: number;
};

function defaultMoneyFormat(n: number, locale: "fr" | "en") {
  if (Math.abs(n) >= 10_000) return fmtMoneyBar(n);
  return n.toLocaleString(locale === "en" ? "en-US" : "fr-FR");
}

export default function ReportBarChart({ title, items, formatValue, maxItems = 8 }: Props) {
  const { t, locale } = useI18n();
  const slice = items.slice(0, maxItems);
  const max = Math.max(...slice.map((i) => i.value), 1);
  const fmt = formatValue ?? ((n: number) => defaultMoneyFormat(n, locale));

  if (!slice.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 mb-2">{title}</p>
        <p className="text-xs text-neutral-400">{t("centre", "reportsNoDataToDisplay")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 mb-4 leading-snug">
        {title}
      </p>
      <div className="space-y-3.5">
        {slice.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 items-baseline mb-1.5">
              <span className="text-xs font-medium text-neutral-600 truncate" title={item.label}>
                {item.label}
              </span>
              <span
                className="text-xs sm:text-[13px] font-semibold tabular-nums text-right whitespace-nowrap"
                style={{ color: BLUE }}
              >
                {fmt(item.value)}
              </span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#11224E] to-[#eb670e] transition-all duration-500"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
