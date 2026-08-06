"use client";

import { Suspense, useCallback } from "react";
import { Loader2 } from "lucide-react";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import ReportsShell from "../components/ReportsShell";
import ReportKpiGrid from "../components/ReportKpiGrid";
import ReportBreakdownTable from "../components/ReportBreakdownTable";
import ReportExportBar from "../components/ReportExportBar";
import ReportBarChart from "../components/ReportBarChart";
import { useReportPage } from "../hooks/useReportPage";
import { useReportPdfExport } from "../hooks/useReportPdfExport";
import { downloadCsv, fmtFCFA, fmtNum } from "@/app/utils/reports-export";
import { useI18n } from "@/app/i18n/I18nProvider";

type PersonnelReport = {
  period: { label: string };
  kpis: {
    total: number;
    academic: number;
    administrative: number;
    active: number;
    suspended: number;
  };
  byRole: { label: string; count: number }[];
  byCategory: { label: string; count: number }[];
  rows: {
    name: string;
    role: string;
    category: string;
    status: string;
    jobTitle: string;
    baseSalary: number;
  }[];
};

function PersonnelContent() {
  const { t } = useI18n();
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<PersonnelReport>("effectifs-personnel");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `personnel-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "staffName"), t("centre", "staffRole"), t("centre", "staffCategory"), t("centre", "settingsStatus"), t("centre", "staffPosition"), t("centre", "staffBaseSalary")],
      report.rows.map((r) => [
        r.name, r.role, r.category, r.status, r.jobTitle, r.baseSalary,
      ]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "staffReportTitle"),
      periodLabel: report.period.label,
      kpis: [
        { label: t("centre", "enrollmentTotal"), value: fmtNum(report.kpis.total) },
        { label: t("centre", "summaryActive"), value: fmtNum(report.kpis.active) },
        { label: t("centre", "summaryTrainers"), value: fmtNum(report.kpis.academic) },
      ],
      sections: [
        {
          title: t("centre", "enrollmentList"),
          columns: [t("centre", "staffName"), t("centre", "staffRole"), t("centre", "staffCategory"), t("centre", "settingsStatus")],
          rows: report.rows.map((r) => [r.name, r.role, r.category, r.status]),
        },
      ],
      filename: `personnel-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="effectifs-personnel"
      centerType={centerType}
      title={t("centre", "staffReportTitle")}
      periodLabel={report?.period?.label}
      dateFrom={from}
      dateTo={to}
      onPeriodChange={setPeriodRange}
      campusId={campusId}
      filiereId={filiereId}
      campuses={campuses}
      filieres={filieres}
      onFilter={setFilter}
      exportSlot={<ReportExportBar onCsv={exportCsv} onPdf={exportPdfReport} pdfLoading={pdfLoading} />}
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> {t("centre", "summaryRefreshing")}
        </div>
      )}
      {report && (
        <>
          <ReportKpiGrid
            items={[
              { label: t("centre", "staffTotal"), value: fmtNum(report.kpis.total) },
              { label: t("centre", "staffAcademic"), value: fmtNum(report.kpis.academic), sub: t("centre", "summaryTrainers") },
              { label: t("centre", "staffAdministrative"), value: fmtNum(report.kpis.administrative) },
              { label: t("centre", "summaryActive"), value: fmtNum(report.kpis.active) },
              { label: t("centre", "summarySuspended"), value: fmtNum(report.kpis.suspended), alert: report.kpis.suspended > 0 },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart title={t("centre", "staffByCategory")} items={report.byCategory.map((x) => ({ label: x.label, value: x.count }))} />
            <ReportBarChart title={t("centre", "staffByRole")} items={report.byRole.map((x) => ({ label: x.label, value: x.count }))} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title={t("centre", "staffByCategory")}
              columns={[
                { key: "label", label: t("centre", "staffCategory") },
                { key: "count", label: t("centre", "enrollmentCount"), align: "right" },
              ]}
              rows={report.byCategory}
            />
            <ReportBreakdownTable
              title={t("centre", "staffByRole")}
              columns={[
                { key: "label", label: t("centre", "staffRole") },
                { key: "count", label: t("centre", "enrollmentCount"), align: "right" },
              ]}
              rows={report.byRole}
            />
          </div>
          <ReportBreakdownTable
            title={t("centre", "staffList")}
            columns={[
              { key: "name", label: t("centre", "staffName") },
              { key: "role", label: t("centre", "staffRole") },
              { key: "category", label: t("centre", "staffCategory") },
              { key: "status", label: t("centre", "settingsStatus") },
              { key: "baseSalary", label: t("centre", "staffBase"), align: "right" },
            ]}
            rows={report.rows.map((r) => ({
              ...r,
              baseSalary: fmtFCFA(r.baseSalary),
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function EffectifsPersonnelPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <PersonnelContent />
    </Suspense>
  );
}
