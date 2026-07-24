"use client";

import { Suspense, useCallback } from "react";
import { Loader2 } from "lucide-react";
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

type EffectifsReport = {
  period: { label: string };
  kpis: {
    total: number;
    active: number;
    draft: number;
    completed: number;
    cancelled: number;
    paused: number;
    newInPeriod: number;
  };
  byFiliere: { label: string; count: number }[];
  byPeriod: { date: string; count: number }[];
  byNiveau: { label: string; count: number }[];
  byClasse: { label: string; count: number }[];
  byHierarchy: { filiere: string; niveau: string; classe: string; count: number }[];
  rows: {
    prenom: string;
    nom: string;
    filiere: string;
    niveau: number | null;
    classe: string;
    enrollmentStatus: string;
    centerStatus: string;
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  active: "Actif",
  draft: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
  paused: "Suspendu",
  revoked: "Radié",
};

function EffectifsContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<EffectifsReport>("effectifs-apprenants");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `effectifs-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Prénom", "Nom", "Filière", "Niveau", "Classe", "Statut inscription", "Statut centre"],
      report.rows.map((r) => [
        r.prenom,
        r.nom,
        r.filiere,
        r.niveau ?? "",
        r.classe,
        STATUS_LABEL[r.enrollmentStatus] || r.enrollmentStatus,
        STATUS_LABEL[r.centerStatus] || r.centerStatus,
      ]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Effectifs apprenants",
      periodLabel: report.period.label,
      kpis: [
        { label: "Total", value: fmtNum(report.kpis.total) },
        { label: "Actifs", value: fmtNum(report.kpis.active) },
        { label: "Nouveaux", value: fmtNum(report.kpis.newInPeriod) },
      ],
      sections: [
        {
          title: "Par filière",
          columns: ["Filière", "Effectif"],
          rows: report.byFiliere.map((x) => [x.label, x.count]),
        },
        {
          title: "Liste",
          columns: ["Apprenant", "Filière", "Classe", "Statut"],
          rows: report.rows.map((r) => [
            `${r.prenom} ${r.nom}`.trim(),
            r.filiere,
            r.classe,
            STATUS_LABEL[r.enrollmentStatus] || r.enrollmentStatus,
          ]),
        },
      ],
      filename: `effectifs-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="effectifs-apprenants"
      centerType={centerType}
      title="Effectifs apprenants"
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
              { label: "Total inscriptions", value: fmtNum(report.kpis.total) },
              { label: "Actifs", value: fmtNum(report.kpis.active), sub: "Inscriptions actives" },
              { label: "En attente", value: fmtNum(report.kpis.draft), sub: "Brouillon" },
              { label: "Terminés", value: fmtNum(report.kpis.completed) },
              { label: "Suspendus", value: fmtNum(report.kpis.paused), sub: "Profil centre" },
              { label: "Nouveaux (période)", value: fmtNum(report.kpis.newInPeriod), sub: report.period.label },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportTrendChart
              title="Évolution des inscriptions"
              points={report.byPeriod.map((p) => ({
                label: new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
                value: p.count,
              }))}
            />
            <ReportBarChart
              title="Répartition par filière"
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.count }))}
            />
            <ReportBarChart
              title="Répartition par niveau"
              items={report.byNiveau.map((x) => ({ label: x.label, value: x.count }))}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title="Par filière"
              columns={[
                { key: "label", label: "Filière" },
                { key: "count", label: "Effectif", align: "right" },
              ]}
              rows={report.byFiliere}
            />
            <ReportBreakdownTable
              title="Par niveau"
              columns={[
                { key: "label", label: "Niveau" },
                { key: "count", label: "Effectif", align: "right" },
              ]}
              rows={report.byNiveau}
            />
          </div>

          <ReportBreakdownTable
            title="Par filière → niveau → classe"
            columns={[
              { key: "filiere", label: "Filière" },
              { key: "niveau", label: "Niveau" },
              { key: "classe", label: "Classe" },
              { key: "count", label: "Effectif", align: "right" },
            ]}
            rows={report.byHierarchy}
          />

          <ReportBreakdownTable
            title="Liste détaillée"
            columns={[
              { key: "name", label: "Apprenant" },
              { key: "filiere", label: "Filière" },
              { key: "niveau", label: "Niv." },
              { key: "classe", label: "Classe" },
              { key: "status", label: "Statut" },
            ]}
            rows={report.rows.map((row) => ({
              name: `${row.prenom} ${row.nom}`.trim(),
              filiere: row.filiere,
              niveau: row.niveau ?? "—",
              classe: row.classe,
              status: STATUS_LABEL[row.enrollmentStatus] || row.enrollmentStatus,
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function EffectifsPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <EffectifsContent />
    </Suspense>
  );
}
