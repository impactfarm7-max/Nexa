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
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<ExamensReport>("examens");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    const headers = report.source === "tcf"
      ? ["Titre", "Examen n°", "Date", "Heure", "Type", "Statut"]
      : ["Apprenant", "Examen n°", "Date", "Heure", "Type", "Statut"];
    downloadCsv(
      `examens-${report.period.label.replace(/\s+/g, "-")}.csv`,
      headers,
      report.rows.map((r) =>
        report.source === "tcf"
          ? [r.title, r.examenId, r.date, r.heure, r.type, r.status]
          : [r.student || "—", r.examenId, r.date, r.heure, r.type, r.status],
      ),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: isTcfCanadaCenter(centerType) ? "Examens TCF" : "Examens",
      periodLabel: report.period.label,
      kpis: [
        { label: "Séances", value: fmtNum(report.kpis.totalSessions) },
        { label: "Réalisés", value: fmtNum(report.kpis.realises) },
        { label: "Annulés", value: fmtNum(report.kpis.annules) },
      ],
      sections: [
        {
          title: "Par statut",
          columns: ["Statut", "Nombre"],
          rows: report.byStatus.map((x) => [x.label, x.count]),
        },
      ],
      filename: `examens-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, centerType]);

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
      title={isTcf ? "Examens TCF" : "Examens"}
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
          <Loader2 size={16} className="animate-spin" /> Actualisation…
        </div>
      )}
      {report && (
        <>
          <p className="text-xs text-neutral-500">
            Source : {report.source === "tcf" ? "Sessions TCF planifiées (tcf_exam_sessions)" : "Simulateurs complétés par les apprenants (exam_sessions)"}
          </p>
          <ReportKpiGrid
            items={[
              { label: "Séances (période)", value: fmtNum(report.kpis.totalSessions), sub: report.period.label },
              { label: isTcf ? "Programmés" : "En cours", value: fmtNum(report.kpis.programmes) },
              { label: "En cours", value: fmtNum(report.kpis.enCours) },
              { label: "Réalisés", value: fmtNum(report.kpis.realises) },
              { label: "Annulés / abandonnés", value: fmtNum(report.kpis.annules), alert: report.kpis.annules > 0 },
              {
                label: isTcf ? "Participations" : "Complétions",
                value: fmtNum(report.kpis.participations),
                sub: isTcf ? "Convocations terminées" : "Sessions terminées",
              },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportTrendChart title="Évolution des séances" points={examTrend} />
            <ReportBarChart
              title="Répartition par statut"
              items={report.byStatus.map((x) => ({ label: x.label, value: x.count }))}
            />
          </div>
          <ReportBreakdownTable
            title="Par statut"
            columns={[
              { key: "label", label: "Statut" },
              { key: "count", label: "Nombre", align: "right" },
            ]}
            rows={report.byStatus}
          />
          <ReportBreakdownTable
            title={isTcf ? "Séances d'examen TCF" : "Sessions simulateur"}
            columns={
              isTcf
                ? [
                    { key: "title", label: "Titre" },
                    { key: "date", label: "Date" },
                    { key: "heure", label: "Heure" },
                    { key: "type", label: "Type" },
                    { key: "status", label: "Statut" },
                  ]
                : [
                    { key: "student", label: "Apprenant" },
                    { key: "title", label: "Examen" },
                    { key: "date", label: "Date" },
                    { key: "status", label: "Statut" },
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
