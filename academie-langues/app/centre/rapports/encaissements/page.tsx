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
import { downloadCsv, fmtFCFA, fmtNum } from "@/app/utils/reports-export";

type EncaissementsReport = {
  period: { label: string };
  kpis: { totalEncaisse: number; nbPaiements: number; panierMoyen: number };
  byPeriod: { date: string; amount: number }[];
  byFiliere: { label: string; amount: number; count: number }[];
  byMode: { label: string; amount: number; count: number }[];
  rows: { date: string; student: string; filiere: string; amount: number; method: string }[];
};

function EncaissementsContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<EncaissementsReport>("encaissements");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `encaissements-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Date", "Apprenant", "Filière", "Montant", "Mode"],
      report.rows.map((r) => [r.date, r.student, r.filiere, r.amount, r.method]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Encaissements",
      periodLabel: report.period.label,
      kpis: [
        { label: "Total encaissé", value: fmtFCFA(report.kpis.totalEncaisse) },
        { label: "Paiements", value: fmtNum(report.kpis.nbPaiements) },
        { label: "Montant moyen", value: fmtFCFA(report.kpis.panierMoyen) },
      ],
      sections: [
        {
          title: "Journal",
          columns: ["Date", "Apprenant", "Filière", "Montant", "Mode"],
          rows: report.rows.map((r) => [r.date, r.student, r.filiere, fmtFCFA(r.amount), r.method]),
        },
      ],
      filename: `encaissements-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="encaissements"
      centerType={centerType}
      title="Encaissements"
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
              { label: "Total encaissé", value: fmtFCFA(report.kpis.totalEncaisse), sub: report.period.label },
              { label: "Nombre de paiements", value: fmtNum(report.kpis.nbPaiements) },
              { label: "Montant moyen", value: fmtFCFA(report.kpis.panierMoyen) },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportTrendChart
              title="Évolution des encaissements"
              points={report.byPeriod.map((p) => ({
                label: new Date(p.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
                value: p.amount,
              }))}
            />
            <ReportBarChart
              title="Répartition par mode"
              items={report.byMode.map((x) => ({ label: x.label, value: x.amount }))}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title="Par filière"
              columns={[
                { key: "label", label: "Filière" },
                { key: "amount", label: "Montant", align: "right" },
              ]}
              rows={report.byFiliere.map((x) => ({ ...x, amount: fmtFCFA(x.amount) }))}
            />
            <ReportBreakdownTable
              title="Par mode de paiement"
              columns={[
                { key: "label", label: "Mode" },
                { key: "amount", label: "Montant", align: "right" },
              ]}
              rows={report.byMode.map((x) => ({ ...x, amount: fmtFCFA(x.amount) }))}
            />
          </div>

          <ReportBreakdownTable
            title="Journal des encaissements"
            columns={[
              { key: "date", label: "Date" },
              { key: "student", label: "Apprenant" },
              { key: "filiere", label: "Filière" },
              { key: "amount", label: "Montant", align: "right" },
              { key: "method", label: "Mode" },
            ]}
            rows={report.rows.map((row) => ({ ...row, amount: fmtFCFA(row.amount) }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function EncaissementsPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <EncaissementsContent />
    </Suspense>
  );
}
