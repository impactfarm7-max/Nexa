"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
import { formatShort } from "@/app/utils/reports-period";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";

type Props = {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
};

export default function ReportPeriodPicker({ from, to, onApply }: Props) {
  const { t, locale } = useI18n();
  const periodLabel = () => {
    if (!from || !to) return t("centre", "reportsChoosePeriod");
    if (from === to) return formatShort(from, locale);
    return `${formatShort(from, locale)} → ${formatShort(to, locale)}`;
  };
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [singleDay, setSingleDay] = useState(from === to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
    setSingleDay(from === to);
  }, [from, to]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const apply = () => {
    if (!draftFrom) return;
    const end = singleDay ? draftFrom : (draftTo || draftFrom);
    const fromDate = draftFrom <= end ? draftFrom : end;
    const toDate = draftFrom <= end ? end : draftFrom;
    onApply(fromDate, toDate);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-full border border-neutral-200 bg-white text-[11px] font-semibold text-neutral-700 hover:border-[#11224E]/30 hover:shadow-sm transition-all max-w-[min(100%,280px)]"
      >
        <Calendar size={14} style={{ color: BLUE }} className="shrink-0" />
        <span className="truncate">{periodLabel()}</span>
        <ChevronDown size={12} className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-[min(calc(100vw-2rem),300px)] rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-200/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
              {t("centre", "reportsPeriod")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-neutral-400 hover:bg-neutral-100"
              aria-label={t("centre", "periodClose")}
            >
              <X size={14} />
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={singleDay}
              onChange={(e) => {
                setSingleDay(e.target.checked);
                if (e.target.checked && draftFrom) setDraftTo(draftFrom);
              }}
              className="rounded border-neutral-300"
            />
            <span className="text-[11px] font-semibold text-neutral-600">{t("centre", "reportsSingleDay")}</span>
          </label>

          <div className="space-y-2">
            <div>
              <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-1 block">
                {singleDay ? t("centre", "reportsDate") : t("centre", "reportsFrom")}
              </label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraftFrom(v);
                  if (singleDay) setDraftTo(v);
                }}
                className="w-full h-9 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-bold outline-none focus:border-[#11224E]/40"
              />
            </div>
            {!singleDay && (
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-1 block">
                  {t("centre", "reportsTo")}
                </label>
                <input
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs font-bold outline-none focus:border-[#11224E]/40"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={apply}
            disabled={!draftFrom || (!singleDay && !draftTo)}
            className="w-full h-9 rounded-full text-[11px] font-black uppercase tracking-wide text-white disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            {t("centre", "reportsApply")}
          </button>
        </div>
      )}
    </div>
  );
}
