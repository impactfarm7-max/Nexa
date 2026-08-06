"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

export type ReportAlertItem = {
  level: "danger" | "warning";
  label: string;
  href: string;
};

type Props = {
  items: ReportAlertItem[];
  hrefFor: (path: string) => string;
};

export default function ReportAlerts({ items, hrefFor }: Props) {
  const { t } = useI18n();
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 mb-4">{t("centre", "reportsAlerts")}</p>
      <div className="space-y-2">
        {items.map((a, i) => (
          <Link
            key={i}
            href={hrefFor(a.href)}
            className={`group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 min-w-0 transition-all hover:shadow-sm ${
              a.level === "danger"
                ? "border-red-200/80 bg-red-50/50 text-red-800 hover:border-red-300"
                : "border-amber-200/80 bg-amber-50/50 text-amber-900 hover:border-amber-300"
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  a.level === "danger" ? "bg-red-100" : "bg-amber-100"
                }`}
              >
                <AlertTriangle
                  size={14}
                  className={a.level === "danger" ? "text-red-600" : "text-amber-600"}
                  strokeWidth={2}
                />
              </span>
              <span className="text-sm font-medium truncate">{a.label}</span>
            </span>
            <ArrowRight
              size={14}
              className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
