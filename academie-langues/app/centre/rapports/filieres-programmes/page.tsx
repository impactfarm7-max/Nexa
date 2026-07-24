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
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<FilieresReport>("filieres-programmes");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `filieres-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Filière", "Type", "Statut", "Mode", "Niveaux", "Effectif actif", "Tarif", "Créée le"],
      report.rows.map((r) => [
        r.name, r.type, r.status, r.mode, r.niveaux, r.effectifActif, r.tuition, r.createdAt,
      ]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Filières & programmes",
      periodLabel: report.period.label,
      kpis: [
        { label: "Total", value: fmtNum(report.kpis.total) },
        { label: "Publiées", value: fmtNum(report.kpis.published) },
        { label: "Brouillon", value: fmtNum(report.kpis.draft) },
      ],
      sections: [
        {
          title: "Catalogue",
          columns: ["Filière", "Type", "Statut", "Effectif"],
          rows: report.rows.map((r) => [r.name, r.type, r.status, r.effectifActif]),
        },
      ],
      filename: `filieres-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="filieres-programmes"
      centerType={centerType}
      title="Filières & programmes"
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
          <ReportKpiGrid
            items={[
              { label: "Total filières", value: fmtNum(report.kpis.total) },
              { label: "Publiées", value: fmtNum(report.kpis.published) },
              { label: "Brouillon", value: fmtNum(report.kpis.draft) },
              { label: "Cursus", value: fmtNum(report.kpis.cursus) },
              { label: "Formations courtes", value: fmtNum(report.kpis.formationCourte) },
              { label: "Nouvelles (période)", value: fmtNum(report.kpis.newInPeriod), sub: report.period.label },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart title="Par statut" items={report.byStatus.map((x) => ({ label: x.label, value: x.count }))} />
            <ReportBarChart title="Par campus" items={report.byCampus.map((x) => ({ label: x.label, value: x.count }))} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title="Par statut"
              columns={[
                { key: "label", label: "Statut" },
                { key: "count", label: "Nombre", align: "right" },
              ]}
              rows={report.byStatus}
            />
            <ReportBreakdownTable
              title="Par type"
              columns={[
                { key: "label", label: "Type" },
                { key: "count", label: "Nombre", align: "right" },
              ]}
              rows={report.byType}
            />
            <ReportBreakdownTable
              title="Par campus"
              columns={[
                { key: "label", label: "Campus" },
                { key: "count", label: "Filières", align: "right" },
              ]}
              rows={report.byCampus}
            />
          </div>
          <ReportBreakdownTable
            title="Catalogue détaillé"
            columns={[
              { key: "name", label: "Filière" },
              { key: "type", label: "Type" },
              { key: "status", label: "Statut" },
              { key: "effectifActif", label: "Actifs", align: "right" },
              { key: "tuition", label: "Tarif", align: "right" },
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
