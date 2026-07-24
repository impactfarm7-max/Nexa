"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { centerNotoSans } from "@/app/centre/center-page-ui";
import { REPORT_NAV, filterReportNav, type ReportSlug } from "../config/p0-reports";
import ReportFiltersBar from "./ReportFiltersBar";
import type { CampusOption, FiliereOption } from "../hooks/useReportPage";

const BLUE = "#11224E";

const SECTION_LABEL = {
  pilotage: "Pilotage",
  apprenants: "Apprenants",
  offre: "Offre",
  rh: "RH",
  finance: "Finance",
  activite: "Activité",
} as const;
type Props = {
  activeSlug: ReportSlug;
  centerType?: string | null;
  title: string;
  subtitle?: string;
  periodLabel?: string;
  dateFrom: string;
  dateTo: string;
  onPeriodChange: (from: string, to: string) => void;
  campusId: string;
  filiereId: string;
  campuses: CampusOption[];
  filieres: FiliereOption[];
  onFilter: (key: string, value: string | null) => void;
  hideCampusFilter?: boolean;
  hideFiliereFilter?: boolean;
  exportSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function ReportsShell({
  activeSlug,
  centerType = null,
  title,
  subtitle,
  periodLabel,
  dateFrom,
  dateTo,
  onPeriodChange,
  campusId,
  filiereId,
  campuses,
  filieres,
  onFilter,
  hideCampusFilter = false,
  hideFiliereFilter = false,
  exportSlot,
  children,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const querySuffix = qs ? `?${qs}` : "";
  const navItems = filterReportNav(centerType, REPORT_NAV);

  return (
    <div className={`${centerNotoSans.className} h-[100dvh] flex flex-col overflow-hidden bg-white text-[#11224E]`}>
      <header className="shrink-0 border-b border-black/[0.06] bg-white z-20">
        <div className="nexa-center-shell py-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 mb-1">
                Rapports · Pilotage
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate" style={{ color: BLUE }}>
                {title}
              </h1>
              {(subtitle || periodLabel) && (
                <p className="text-xs text-neutral-500 mt-1">
                  {subtitle}
                  {subtitle && periodLabel ? " · " : ""}
                  {periodLabel && <span className="font-semibold text-neutral-700">{periodLabel}</span>}
                </p>
              )}
            </div>
            {exportSlot && <div className="shrink-0">{exportSlot}</div>}
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
            {navItems.map((item, index) => {
              const active = item.slug === activeSlug || item.href === pathname;
              const prevSection = index > 0 ? navItems[index - 1].section : null;
              const showDivider = index > 0 && item.section !== prevSection;

              return (
                <span key={item.slug} className="contents">
                  {showDivider && (
                    <span className="shrink-0 w-px h-4 bg-neutral-200 mx-0.5" aria-hidden />
                  )}
                  <Link
                    href={`${item.href}${querySuffix}`}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      active
                        ? "text-white"
                        : "bg-[#F7F7F6] text-neutral-600 hover:bg-neutral-200/90 border border-black/[0.06]"
                    }`}
                    style={active ? { backgroundColor: BLUE } : undefined}
                    title={SECTION_LABEL[item.section]}
                  >
                    {item.shortLabel}
                  </Link>
                </span>
              );
            })}
          </nav>

          <div className="rounded-lg border border-black/[0.08] bg-[#F7F7F6] p-2.5 md:p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <SlidersHorizontal size={12} className="text-neutral-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Filtres</span>
              {hideCampusFilter && hideFiliereFilter && (
                <span className="text-[9px] font-semibold text-neutral-400 ml-1">
                  · Synthèse globale (période seule)
                </span>
              )}
            </div>
            <ReportFiltersBar
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPeriodChange={onPeriodChange}
              campusId={campusId}
              filiereId={filiereId}
              campuses={campuses}
              filieres={filieres}
              onFilter={onFilter}
              hideCampusFilter={hideCampusFilter}
              hideFiliereFilter={hideFiliereFilter}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-10">
        <div className="nexa-center-shell py-5 md:py-6 space-y-5 md:space-y-6 min-w-0">{children}</div>
      </main>
    </div>
  );
}
