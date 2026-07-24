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

type ReductionsReport = {
  period: { label: string };
  kpis: {
    totalReductions: number;
    nbDossiers: number;
    nbCouponsActifs: number;
    utilisationsCoupons: number;
  };
  byReason: { label: string; amount: number }[];
  byFiliere: { label: string; amount: number }[];
  coupons: {
    code: string;
    type: string;
    uses: number;
    maxUses: number | null;
    active: boolean;
    expiresAt: string;
  }[];
  rows: { student: string; filiere: string; amount: number; reason: string; enrolledAt: string }[];
};

function ReductionsContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<ReductionsReport>("reductions-coupons");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `reductions-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Apprenant", "Filière", "Montant", "Motif", "Inscription"],
      report.rows.map((r) => [r.student, r.filiere, r.amount, r.reason, r.enrolledAt]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Réductions & coupons",
      periodLabel: report.period.label,
      kpis: [
        { label: "Total réductions", value: fmtFCFA(report.kpis.totalReductions) },
        { label: "Dossiers concernés", value: fmtNum(report.kpis.nbDossiers) },
        { label: "Coupons actifs", value: fmtNum(report.kpis.nbCouponsActifs) },
      ],
      sections: [
        {
          title: "Par motif",
          columns: ["Motif", "Montant"],
          rows: report.byReason.map((x) => [x.label, fmtFCFA(x.amount)]),
        },
        {
          title: "Détail",
          columns: ["Apprenant", "Filière", "Montant", "Motif"],
          rows: report.rows.map((r) => [r.student, r.filiere, fmtFCFA(r.amount), r.reason]),
        },
      ],
      filename: `reductions-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="reductions-coupons"
      centerType={centerType}
      title="Réductions & coupons"
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
              { label: "Total réductions", value: fmtFCFA(report.kpis.totalReductions), sub: report.period.label },
              { label: "Dossiers concernés", value: fmtNum(report.kpis.nbDossiers) },
              { label: "Coupons actifs", value: fmtNum(report.kpis.nbCouponsActifs) },
              { label: "Utilisations coupons", value: fmtNum(report.kpis.utilisationsCoupons) },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title="Répartition par filière"
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.amount }))}
            />
            <ReportBarChart
              title="Répartition par motif"
              items={report.byReason.map((x) => ({ label: x.label, value: x.amount }))}
            />
          </div>

          {report.coupons.length > 0 && (
            <ReportBreakdownTable
              title="Coupons du centre"
              columns={[
                { key: "code", label: "Code" },
                { key: "type", label: "Valeur" },
                { key: "uses", label: "Utilisations", align: "right" },
                { key: "active", label: "Statut" },
                { key: "expiresAt", label: "Expiration" },
              ]}
              rows={report.coupons.map((c) => ({
                code: c.code,
                type: c.type,
                uses: `${c.uses}${c.maxUses ? ` / ${c.maxUses}` : ""}`,
                active: c.active ? "Actif" : "Inactif",
                expiresAt: c.expiresAt,
              }))}
            />
          )}

          <ReportBreakdownTable
            title="Dossiers avec réduction"
            columns={[
              { key: "student", label: "Apprenant" },
              { key: "filiere", label: "Filière" },
              { key: "amount", label: "Montant", align: "right" },
              { key: "reason", label: "Motif" },
              { key: "enrolledAt", label: "Inscription" },
            ]}
            rows={report.rows.map((r) => ({ ...r, amount: fmtFCFA(r.amount) }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function ReductionsCouponsPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <ReductionsContent />
    </Suspense>
  );
}
