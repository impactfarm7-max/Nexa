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

type FilieresReport = {
  period: { label: string };
  kpis: {
    total: number;
    published: number;
    draft: number;
    cursus: number;
    formationCourte: number;
    newInPeriod: number;
  };
  byStatus: { label: string; count: number }[];
  byType: { label: string; count: number }[];
  byCampus: { label: string; count: number }[];
  rows: {
    name: string;
    type: string;
    status: string;
    mode: string;
    niveaux: number | string;
    effectifActif: number;
    tuition: number;
    createdAt: string;
  }[];
};

function FilieresContent() {
  const { t } = useI18n();
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  periodLabel,
  } = useReportPage<FilieresReport>("filieres-programmes");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `filieres-${periodLabel.replace(/\s+/g, "-")}.csv`,
      [t("centre", "enrollmentProgram"), t("centre", "programType"), t("centre", "settingsStatus"), t("centre", "programMode"), t("centre", "programLevels"), t("centre", "programActiveEnrollment"), t("centre", "programPrice"), t("centre", "programCreatedAt")],
      report.rows.map((r) => [
        r.name, r.type, r.status, r.mode, r.niveaux, r.effectifActif, r.tuition, r.createdAt,
      ]),
    );
  }, [report, t, periodLabel]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "programReportTitle"),
      periodLabel,
      kpis: [
        { label: t("centre", "enrollmentTotal"), value: fmtNum(report.kpis.total) },
        { label: t("centre", "programPublished"), value: fmtNum(report.kpis.published) },
        { label: t("centre", "enrollmentDraft"), value: fmtNum(report.kpis.draft) },
      ],
      sections: [
        {
          title: t("centre", "programCatalog"),
          columns: [t("centre", "enrollmentProgram"), t("centre", "programType"), t("centre", "settingsStatus"), t("centre", "enrollmentCount")],
          rows: report.rows.map((r) => [r.name, r.type, r.status, r.effectifActif]),
        },
      ],
      filename: `filieres-${periodLabel.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t, periodLabel]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="filieres-programmes"
      centerType={centerType}
      title={t("centre", "programReportTitle")}
      periodLabel={periodLabel}
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
              { label: t("centre", "programTotal"), value: fmtNum(report.kpis.total) },
              { label: t("centre", "programPublished"), value: fmtNum(report.kpis.published) },
              { label: t("centre", "enrollmentDraft"), value: fmtNum(report.kpis.draft) },
              { label: t("centre", "programCurricula"), value: fmtNum(report.kpis.cursus) },
              { label: t("centre", "programShortCourses"), value: fmtNum(report.kpis.formationCourte) },
              { label: t("centre", "programNewPeriod"), value: fmtNum(report.kpis.newInPeriod), sub: periodLabel },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart title={t("centre", "programByStatus")} items={report.byStatus.map((x) => ({ label: x.label, value: x.count }))} />
            <ReportBarChart title={t("centre", "programByCampus")} items={report.byCampus.map((x) => ({ label: x.label, value: x.count }))} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title={t("centre", "programByStatus")}
              columns={[
                { key: "label", label: t("centre", "settingsStatus") },
                { key: "count", label: t("centre", "programCount"), align: "right" },
              ]}
              rows={report.byStatus}
            />
            <ReportBreakdownTable
              title={t("centre", "programByType")}
              columns={[
                { key: "label", label: t("centre", "programType") },
                { key: "count", label: t("centre", "programCount"), align: "right" },
              ]}
              rows={report.byType}
            />
            <ReportBreakdownTable
              title={t("centre", "programByCampus")}
              columns={[
                { key: "label", label: t("centre", "programCampus") },
                { key: "count", label: t("centre", "programPrograms"), align: "right" },
              ]}
              rows={report.byCampus}
            />
          </div>
          <ReportBreakdownTable
            title={t("centre", "programDetailedCatalog")}
            columns={[
              { key: "name", label: t("centre", "enrollmentProgram") },
              { key: "type", label: t("centre", "programType") },
              { key: "status", label: t("centre", "settingsStatus") },
              { key: "effectifActif", label: t("centre", "summaryActive"), align: "right" },
              { key: "tuition", label: t("centre", "programPrice"), align: "right" },
            ]}
            rows={report.rows.map((r) => ({
              ...r,
              tuition: fmtFCFA(r.tuition),
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function FilieresProgrammesPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <FilieresContent />
    </Suspense>
  );
}
