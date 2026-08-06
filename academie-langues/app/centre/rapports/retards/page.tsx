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
import { formatShort } from "@/app/utils/reports-period";

type RetardsReport = {
  period: { label: string };
  kpis: { nbEnRetard: number; montantRetard: number; nbMoratoires: number };
  byAging: Record<string, { label: string; count: number; amount: number }>;
  byFiliere: { label: string; amount: number; count: number }[];
  rows: {
    student: string;
    filiere: string;
    reste: number;
    agingBucket: string;
    nextDueDate: string | null;
    lateInstallments: number;
  }[];
};

function RetardsContent() {
  const { t, locale } = useI18n();
  const agingLabel = (bucket: string) => {
    const key = bucket === "current" ? "overdueAgingCurrent" : bucket === "30d" ? "overdueAging30" : bucket === "60d" ? "overdueAging60" : bucket === "90d_plus" ? "overdueAging90" : null;
    return key ? t("centre", key) : bucket;
  };
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<RetardsReport>("retards");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `retards-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "summaryBalance"), "Aging", t("centre", "recoveryNextDueDate"), t("centre", "overdueLateInstallments")],
      report.rows.map((r) => [
        r.student,
        r.filiere,
        r.reste,
        agingLabel(r.agingBucket),
        r.nextDueDate ?? "",
        r.lateInstallments,
      ]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "overdueTitle"),
      periodLabel: report.period.label,
      kpis: [
        { label: t("centre", "summaryOverdueRecords"), value: fmtNum(report.kpis.nbEnRetard) },
        { label: t("centre", "collectionsAmount"), value: fmtFCFA(report.kpis.montantRetard) },
        { label: t("centre", "overdueExtensions"), value: fmtNum(report.kpis.nbMoratoires) },
      ],
      sections: [
        {
          title: t("centre", "overdueList"),
          columns: [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "summaryBalance"), "Aging"],
          rows: report.rows.map((r) => [
            r.student,
            r.filiere,
            fmtFCFA(r.reste),
            agingLabel(r.agingBucket),
          ]),
        },
      ],
      filename: `retards-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="retards"
      centerType={centerType}
      title={t("centre", "overdueTitle")}
      periodLabel={from === to ? formatShort(from, locale) : `${formatShort(from, locale)} — ${formatShort(to, locale)}`}
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
              {
                label: t("centre", "summaryOverdueRecords"),
                value: fmtNum(report.kpis.nbEnRetard),
                alert: report.kpis.nbEnRetard > 0,
              },
              {
                label: t("centre", "overdueAmount"),
                value: fmtFCFA(report.kpis.montantRetard),
                alert: report.kpis.montantRetard > 0,
              },
              { label: t("centre", "overdueActiveExtensions"), value: fmtNum(report.kpis.nbMoratoires), sub: t("centre", "overdueDeferredInstallments") },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title={t("centre", "overdueAmountByAging")}
              items={Object.entries(report.byAging).map(([key, b]) => ({ label: agingLabel(key), value: b.amount }))}
            />
            <ReportBarChart
              title={t("centre", "overdueByProgram")}
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.amount }))}
            />
          </div>

          <ReportBreakdownTable
            title={t("centre", "overdueAgingBreakdown")}
            columns={[
              { key: "label", label: t("centre", "overdueRange") },
              { key: "count", label: t("centre", "overdueRecords"), align: "right" },
              { key: "amount", label: t("centre", "collectionsAmount"), align: "right" },
            ]}
            rows={Object.entries(report.byAging).map(([key, b]) => ({
              label: agingLabel(key),
              count: b.count,
              amount: fmtFCFA(b.amount),
            }))}
          />

          <ReportBreakdownTable
            title={t("centre", "overdueByProgramTable")}
            columns={[
              { key: "label", label: t("centre", "enrollmentProgram") },
              { key: "count", label: t("centre", "overdueRecords"), align: "right" },
              { key: "amount", label: t("centre", "collectionsAmount"), align: "right" },
            ]}
            rows={report.byFiliere.map((x) => ({
              label: x.label,
              count: x.count,
              amount: fmtFCFA(x.amount),
            }))}
          />

          <ReportBreakdownTable
            title={t("centre", "overdueList")}
            columns={[
              { key: "student", label: t("centre", "enrollmentLearner") },
              { key: "filiere", label: t("centre", "enrollmentProgram") },
              { key: "reste", label: t("centre", "summaryBalance"), align: "right" },
              { key: "aging", label: "Aging" },
              { key: "nextDue", label: t("centre", "overdueNextDueShort") },
            ]}
            rows={report.rows.map((row) => ({
              student: row.student,
              filiere: row.filiere,
              reste: fmtFCFA(row.reste),
              aging: agingLabel(row.agingBucket),
              nextDue: row.nextDueDate
                ? new Date(row.nextDueDate).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")
                : "—",
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function RetardsPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <RetardsContent />
    </Suspense>
  );
}
