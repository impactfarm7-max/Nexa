"use client";

import { Building2, GraduationCap } from "lucide-react";
import { FilterPill } from "@/app/centre/dashboard/dashboard-ui";
import type { CampusOption, FiliereOption } from "../hooks/useReportPage";
import ReportPeriodPicker from "./ReportPeriodPicker";

type Props = {
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
};

export default function ReportFiltersBar({
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
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ReportPeriodPicker from={dateFrom} to={dateTo} onApply={onPeriodChange} />

      {!hideCampusFilter && campuses.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
          <Building2 size={12} className="text-neutral-400 shrink-0 ml-0.5" />
          <FilterPill active={!campusId} onClick={() => onFilter("campusId", null)}>
            Tous campus
          </FilterPill>
          {campuses.map((c) => (
            <FilterPill
              key={c.id}
              active={campusId === c.id}
              onClick={() => onFilter("campusId", c.id)}
            >
              {c.name}
            </FilterPill>
          ))}
        </div>
      )}

      {filieres.length > 0 && !hideFiliereFilter && (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-full">
          <GraduationCap size={12} className="text-neutral-400 shrink-0 ml-0.5" />
          <FilterPill active={!filiereId} onClick={() => onFilter("filiereId", null)}>
            Toutes filières
          </FilterPill>
          {filieres.map((f) => (
            <FilterPill
              key={f.id}
              active={filiereId === f.id}
              onClick={() => onFilter("filiereId", f.id)}
            >
              {f.name}
            </FilterPill>
          ))}
        </div>
      )}
    </div>
  );
}
