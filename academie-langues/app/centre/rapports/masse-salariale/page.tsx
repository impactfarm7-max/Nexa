"use client";

import { Suspense, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import ReportsShell from "../components/ReportsShell";
import ReportKpiGrid from "../components/ReportKpiGrid";
import ReportBreakdownTable from "../components/ReportBreakdownTable";
import ReportExportBar from "../components/ReportExportBar";
import ReportBarChart from "../components/ReportBarChart";
import { useReportPage } from "../hooks/useReportPage";
import { useReportPdfExport } from "../hooks/useReportPdfExport";
import { downloadCsv, fmtFCFA, fmtNum } from "@/app/utils/reports-export";

type PaieReport = {
  period: { label: string };
  available: boolean;
  message?: string;
  kpis: {
    netTotal: number;
    brutTotal: number;
    paidTotal: number;
    primesTotal: number;
    retenuesTotal: number;
    nbBulletins: number;
    nbPayes: number;
  };
  byStatus: { label: string; count: number; amount: number }[];
  rows: Record<string, string | number>[];
};

function PaieContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<PaieReport>("masse-salariale");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report?.available) return;
    downloadCsv(
      `paie-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Personnel", "Période", "Base", "Primes", "Retenues", "Net", "Versé", "Statut"],
      report.rows.map((r) => [
        r.staff, r.period, r.base, r.primes, r.retenues, r.net, r.paid, r.status,
      ]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report?.available) return;
    await exportPdf({
      title: "Masse salariale",
      periodLabel: report.period.label,
      kpis: [
        { label: "Masse nette", value: fmtFCFA(report.kpis.netTotal) },
        { label: "Versé", value: fmtFCFA(report.kpis.paidTotal) },
        { label: "Bulletins payés", value: `${report.kpis.nbPayes} / ${report.kpis.nbBulletins}` },
      ],
      sections: [
        {
          title: "Bulletins",
          columns: ["Personnel", "Période", "Net", "Statut"],
          rows: report.rows.map((r) => [r.staff, r.period, fmtFCFA(Number(r.net)), r.status]),
        },
      ],
      filename: `paie-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="masse-salariale"
      centerType={centerType}
      title="Masse salariale"
      periodLabel={report?.period?.label}
      dateFrom={from}
      dateTo={to}
      onPeriodChange={setPeriodRange}
      campusId={campusId}
      filiereId={filiereId}
      campuses={campuses}
      filieres={filieres}
      onFilter={setFilter}
      exportSlot={report?.available ? (
        <ReportExportBar onCsv={exportCsv} onPdf={exportPdfReport} pdfLoading={pdfLoading} />
      ) : undefined}
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Actualisation…
        </div>
      )}
      {report && !report.available && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{report.message}</span>
        </div>
      )}
      {report?.available && (
        <>
          <ReportKpiGrid
            items={[
              { label: "Masse nette", value: fmtFCFA(report.kpis.netTotal), sub: report.period.label },
              { label: "Masse brute", value: fmtFCFA(report.kpis.brutTotal) },
              { label: "Total versé", value: fmtFCFA(report.kpis.paidTotal) },
              { label: "Primes", value: fmtFCFA(report.kpis.primesTotal) },
              { label: "Retenues", value: fmtFCFA(report.kpis.retenuesTotal) },
              { label: "Bulletins payés", value: `${report.kpis.nbPayes} / ${report.kpis.nbBulletins}` },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title="Masse nette par statut bulletin"
              items={report.byStatus.map((x) => ({ label: x.label, value: x.amount }))}
            />
            <ReportBarChart
              title="Nombre de bulletins par statut"
              items={report.byStatus.map((x) => ({ label: x.label, value: x.count }))}
            />
          </div>
          <ReportBreakdownTable
            title="Par statut bulletin"
            columns={[
              { key: "label", label: "Statut" },
              { key: "count", label: "Bulletins", align: "right" },
              { key: "amount", label: "Net", align: "right" },
            ]}
            rows={report.byStatus.map((r) => ({
              ...r,
              amount: fmtFCFA(r.amount),
            }))}
          />
          <ReportBreakdownTable
            title="Détail par membre"
            columns={[
              { key: "staff", label: "Personnel" },
              { key: "period", label: "Période" },
              { key: "net", label: "Net", align: "right" },
              { key: "paid", label: "Versé", align: "right" },
              { key: "status", label: "Statut" },
            ]}
            rows={report.rows.map((r) => ({
              staff: r.staff,
              period: r.period,
              net: fmtFCFA(Number(r.net)),
              paid: fmtFCFA(Number(r.paid)),
              status: r.status,
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function MasseSalarialePage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <PaieContent />
    </Suspense>
  );
}
