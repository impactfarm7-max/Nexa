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

const AGING_LABEL: Record<string, string> = {
  current: "Courant",
  "30d": "1–30 j",
  "60d": "31–60 j",
  "90d_plus": "90 j +",
};

function RetardsContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<RetardsReport>("retards");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `retards-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Apprenant", "Filière", "Reste", "Aging", "Prochaine échéance", "Échéances en retard"],
      report.rows.map((r) => [
        r.student,
        r.filiere,
        r.reste,
        AGING_LABEL[r.agingBucket] || r.agingBucket,
        r.nextDueDate ?? "",
        r.lateInstallments,
      ]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Retards & moratoires",
      periodLabel: report.period.label,
      kpis: [
        { label: "Dossiers en retard", value: fmtNum(report.kpis.nbEnRetard) },
        { label: "Montant", value: fmtFCFA(report.kpis.montantRetard) },
        { label: "Moratoires", value: fmtNum(report.kpis.nbMoratoires) },
      ],
      sections: [
        {
          title: "Liste des retards",
          columns: ["Apprenant", "Filière", "Reste", "Aging"],
          rows: report.rows.map((r) => [
            r.student,
            r.filiere,
            fmtFCFA(r.reste),
            AGING_LABEL[r.agingBucket] || r.agingBucket,
          ]),
        },
      ],
      filename: `retards-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="retards"
      centerType={centerType}
      title="Retards & moratoires"
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
              {
                label: "Dossiers en retard",
                value: fmtNum(report.kpis.nbEnRetard),
                alert: report.kpis.nbEnRetard > 0,
              },
              {
                label: "Montant en retard",
                value: fmtFCFA(report.kpis.montantRetard),
                alert: report.kpis.montantRetard > 0,
              },
              { label: "Moratoires actifs", value: fmtNum(report.kpis.nbMoratoires), sub: "Échéances reportées" },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title="Montant par tranche d'aging"
              items={Object.values(report.byAging).map((b) => ({ label: b.label, value: b.amount }))}
            />
            <ReportBarChart
              title="Retards par filière"
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.amount }))}
            />
          </div>

          <ReportBreakdownTable
            title="Ventilation aging"
            columns={[
              { key: "label", label: "Tranche" },
              { key: "count", label: "Dossiers", align: "right" },
              { key: "amount", label: "Montant", align: "right" },
            ]}
            rows={Object.values(report.byAging).map((b) => ({
              label: b.label,
              count: b.count,
              amount: fmtFCFA(b.amount),
            }))}
          />

          <ReportBreakdownTable
            title="Par filière (retards)"
            columns={[
              { key: "label", label: "Filière" },
              { key: "count", label: "Dossiers", align: "right" },
              { key: "amount", label: "Montant", align: "right" },
            ]}
            rows={report.byFiliere.map((x) => ({
              label: x.label,
              count: x.count,
              amount: fmtFCFA(x.amount),
            }))}
          />

          <ReportBreakdownTable
            title="Liste des retards"
            columns={[
              { key: "student", label: "Apprenant" },
              { key: "filiere", label: "Filière" },
              { key: "reste", label: "Reste", align: "right" },
              { key: "aging", label: "Aging" },
              { key: "nextDue", label: "Prochaine éch." },
            ]}
            rows={report.rows.map((row) => ({
              student: row.student,
              filiere: row.filiere,
              reste: fmtFCFA(row.reste),
              aging: AGING_LABEL[row.agingBucket] || row.agingBucket,
              nextDue: row.nextDueDate
                ? new Date(row.nextDueDate).toLocaleDateString("fr-FR")
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
