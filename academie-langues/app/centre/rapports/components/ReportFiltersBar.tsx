"use client";

import type { CampusOption, FiliereOption } from "../hooks/useReportPage";
import ReportPeriodPicker from "./ReportPeriodPicker";
import { ToolbarFilterMenu } from "@/app/centre/center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

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
  const { t } = useI18n();
  const showCampus = !hideCampusFilter && campuses.length > 1;
  const showFiliere = filieres.length > 0 && !hideFiliereFilter;
  const sections = [
    ...(showCampus
      ? [{
          id: "campus",
          label: t("centre", "settingsCampus"),
          value: campusId || "all",
          options: [
            { value: "all", label: t("centre", "reportsAllCampuses") },
            ...campuses.map((c) => ({ value: c.id, label: c.name })),
          ],
          onChange: (v: string) => onFilter("campusId", v === "all" ? null : v),
        }]
      : []),
    ...(showFiliere
      ? [{
          id: "program",
          label: t("centre", "enrollmentProgram"),
          value: filiereId || "all",
          options: [
            { value: "all", label: t("centre", "reportsAllPrograms") },
            ...filieres.map((f) => ({ value: f.id, label: f.name })),
          ],
          onChange: (v: string) => onFilter("filiereId", v === "all" ? null : v),
        }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ReportPeriodPicker from={dateFrom} to={dateTo} onApply={onPeriodChange} />
      {sections.length > 0 && (
        <ToolbarFilterMenu
          onReset={() => {
            if (showCampus) onFilter("campusId", null);
            if (showFiliere) onFilter("filiereId", null);
          }}
          sections={sections}
        />
      )}
    </div>
  );
}
