"use client";

import { Suspense, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import ReportsShell from "../components/ReportsShell";
import ReportKpiGrid from "../components/ReportKpiGrid";
import ReportBreakdownTable from "../components/ReportBreakdownTable";
import ReportExportBar from "../components/ReportExportBar";
import ReportBarChart from "../components/ReportBarChart";
import ReportTrendChart from "../components/ReportTrendChart";
import { useReportPage } from "../hooks/useReportPage";
import { useReportPdfExport } from "../hooks/useReportPdfExport";
import { downloadCsv, fmtNum } from "@/app/utils/reports-export";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ACTION_TONE } from "@/app/utils/action-tones";

type ExamensReport = {
  period: { label: string };
  centerType: string;
  source: "tcf" | "generic";
  kpis: {
    programmes: number;
    realises: number;
    annules: number;
    enCours: number;
    participations: number;
    genericCompleted: number;
    totalSessions: number;
  };
  byStatus: { label: string; count: number }[];
  rows: {
    title: string;
    examenId: number;
    date: string;
    heure: string;
    type: string;
    status: string;
    student?: string;
  }[];
};

function ExamensContent() {
  const { t } = useI18n();
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  periodLabel,
  } = useReportPage<ExamensReport>("examens");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    const headers = report.source === "tcf"
      ? [
          t("centre", "reportsExamColumnTitle"),
          t("centre", "reportsExamNumber"),
          t("centre", "reportsDate"),
          t("centre", "reportsExamTime"),
          t("centre", "reportsExamType"),
          t("centre", "reportsExamStatus"),
        ]
      : [
          t("centre", "reportsExamLearner"),
          t("centre", "reportsExamNumber"),
          t("centre", "reportsDate"),
          t("centre", "reportsExamTime"),
          t("centre", "reportsExamType"),
          t("centre", "reportsExamStatus"),
        ];
    downloadCsv(
      `examens-${periodLabel.replace(/\s+/g, "-")}.csv`,
      headers,
      report.rows.map((r) =>
        report.source === "tcf"
          ? [r.title, r.examenId, r.date, r.heure, r.type, r.status]
          : [r.student || "—", r.examenId, r.date, r.heure, r.type, r.status],
      ),
    );
  }, [report, t, periodLabel]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: isTcfCanadaCenter(centerType) ? t("centre", "reportsExamTitleTcf") : t("centre", "reportsExamTitleGeneric"),
      periodLabel,
      kpis: [
        { label: t("centre", "reportsExamSessionsPeriod"), value: fmtNum(report.kpis.totalSessions) },
        { label: t("centre", "reportsExamCompleted"), value: fmtNum(report.kpis.realises) },
        { label: t("centre", "reportsExamCancelledAbandoned"), value: fmtNum(report.kpis.annules) },
      ],
      sections: [
        {
          title: t("centre", "reportsExamByStatus"),
          columns: [t("centre", "reportsExamStatus"), t("centre", "reportsExamCount")],
          rows: report.byStatus.map((x) => [x.label, x.count]),
        },
      ],
      filename: `examens-${periodLabel.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, centerType, t, periodLabel]);

  const examTrend = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, number>();
    for (const r of report.rows) {
      map.set(r.date, (map.get(r.date) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({
        label: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        value,
      }));
  }, [report]);

  if (loading && !report) return <CenterPageLoading />;

  const isTcf = report?.source === "tcf" || isTcfCanadaCenter(centerType);

  return (
    <ReportsShell
      activeSlug="examens"
      centerType={centerType}
      title={isTcf ? t("centre", "reportsExamTitleTcf") : t("centre", "reportsExamTitleGeneric")}
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
        <div className={ACTION_TONE.errorBox}>{error}</div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> {t("centre", "summaryRefreshing")}
        </div>
      )}
      {report && (
        <>
          <p className="text-xs text-neutral-500">
            {t("centre", "reportsExamSourceLabel")} {report.source === "tcf" ? t("centre", "reportsExamSourceTcf") : t("centre", "reportsExamSourceGeneric")}
          </p>
          <ReportKpiGrid
            items={[
              { label: t("centre", "reportsExamSessionsPeriod"), value: fmtNum(report.kpis.totalSessions), sub: periodLabel },
              { label: isTcf ? t("centre", "reportsExamScheduled") : t("centre", "reportsExamInProgress"), value: fmtNum(report.kpis.programmes) },
              { label: t("centre", "reportsExamInProgress"), value: fmtNum(report.kpis.enCours) },
              { label: t("centre", "reportsExamCompleted"), value: fmtNum(report.kpis.realises) },
              { label: t("centre", "reportsExamCancelledAbandoned"), value: fmtNum(report.kpis.annules), alert: report.kpis.annules > 0 },
              {
                label: isTcf ? t("centre", "reportsExamParticipations") : t("centre", "reportsExamCompletions"),
                value: fmtNum(report.kpis.participations),
                sub: isTcf ? t("centre", "reportsExamCompletedInvitations") : t("centre", "reportsExamCompletedSessions"),
              },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportTrendChart title={t("centre", "reportsExamTrend")} points={examTrend} />
            <ReportBarChart
              title={t("centre", "reportsExamBreakdownByStatus")}
              items={report.byStatus.map((x) => ({ label: x.label, value: x.count }))}
            />
          </div>
          <ReportBreakdownTable
            title={t("centre", "reportsExamByStatus")}
            columns={[
              { key: "label", label: t("centre", "reportsExamStatus") },
              { key: "count", label: t("centre", "reportsExamCount"), align: "right" },
            ]}
            rows={report.byStatus}
          />
          <ReportBreakdownTable
            title={isTcf ? t("centre", "reportsExamTcfSessions") : t("centre", "reportsExamSimulationSessions")}
            columns={
              isTcf
                ? [
                    { key: "title", label: t("centre", "reportsExamColumnTitle") },
                    { key: "date", label: t("centre", "reportsDate") },
                    { key: "heure", label: t("centre", "reportsExamTime") },
                    { key: "type", label: t("centre", "reportsExamType") },
                    { key: "status", label: t("centre", "reportsExamStatus") },
                  ]
                : [
                    { key: "student", label: t("centre", "reportsExamLearner") },
                    { key: "title", label: t("centre", "reportsExamExam") },
                    { key: "date", label: t("centre", "reportsDate") },
                    { key: "status", label: t("centre", "reportsExamStatus") },
                  ]
            }
            rows={report.rows.map((r) => ({
              title: r.title,
              student: r.student || "—",
              date: r.date,
              heure: r.heure,
              type: r.type,
              status: r.status,
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function ExamensPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <ExamensContent />
    </Suspense>
  );
}
