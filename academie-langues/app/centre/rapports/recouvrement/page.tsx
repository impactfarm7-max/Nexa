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

type RecouvrementReport = {
  period: { label: string };
  kpis: {
    caFacture: number;
    encaisse: number;
    resteARecouvrer: number;
    tauxRecouvrement: number;
    nbDossiers: number;
  };
  byFiliere: { label: string; ca: number; encaisse: number; reste: number; taux: number }[];
  rows: {
    student: string;
    filiere: string;
    niveau: number | null;
    classe: string | null;
    ca: number;
    encaisse: number;
    reste: number;
    statut: string;
    nextDueDate: string | null;
  }[];
};

function RecouvrementContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<RecouvrementReport>("recouvrement");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `recouvrement-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Apprenant", "Filière", "Niveau", "Classe", "CA", "Encaissé", "Reste", "Statut"],
      report.rows.map((r) => [
        r.student,
        r.filiere,
        r.niveau ?? "",
        r.classe ?? "",
        r.ca,
        r.encaisse,
        r.reste,
        r.statut,
      ]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Créances & recouvrement",
      periodLabel: report.period.label,
      kpis: [
        { label: "CA facturé", value: fmtFCFA(report.kpis.caFacture) },
        { label: "Encaissé", value: fmtFCFA(report.kpis.encaisse) },
        { label: "Taux", value: `${report.kpis.tauxRecouvrement} %` },
      ],
      sections: [
        {
          title: "Par filière",
          columns: ["Filière", "CA", "Encaissé", "Reste", "Taux"],
          rows: report.byFiliere.map((x) => [x.label, fmtFCFA(x.ca), fmtFCFA(x.encaisse), fmtFCFA(x.reste), `${x.taux} %`]),
        },
        {
          title: "Top impayés",
          columns: ["Apprenant", "Filière", "Reste"],
          rows: report.rows.map((r) => [r.student, r.filiere, fmtFCFA(r.reste)]),
        },
      ],
      filename: `recouvrement-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="recouvrement"
      centerType={centerType}
      title="Créances & recouvrement"
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
              { label: "CA facturé", value: fmtFCFA(report.kpis.caFacture), sub: "Dossiers actifs" },
              { label: "Encaissé (cumul)", value: fmtFCFA(report.kpis.encaisse) },
              { label: "Reste à recouvrer", value: fmtFCFA(report.kpis.resteARecouvrer) },
              {
                label: "Taux recouvrement",
                value: `${report.kpis.tauxRecouvrement} %`,
                sub: `${fmtNum(report.kpis.nbDossiers)} dossiers`,
              },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title="Reste à recouvrer par filière"
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.reste }))}
            />
            <ReportBarChart
              title="Taux de recouvrement par filière"
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.taux }))}
              formatValue={(n) => `${n} %`}
            />
          </div>

          <ReportBreakdownTable
            title="Par filière"
            columns={[
              { key: "label", label: "Filière" },
              { key: "ca", label: "CA", align: "right" },
              { key: "encaisse", label: "Encaissé", align: "right" },
              { key: "reste", label: "Reste", align: "right" },
              { key: "taux", label: "Taux %", align: "right" },
            ]}
            rows={report.byFiliere.map((x) => ({
              label: x.label,
              ca: fmtFCFA(x.ca),
              encaisse: fmtFCFA(x.encaisse),
              reste: fmtFCFA(x.reste),
              taux: `${x.taux} %`,
            }))}
          />

          <ReportBreakdownTable
            title="Top 20 impayés"
            columns={[
              { key: "student", label: "Apprenant" },
              { key: "filiere", label: "Filière" },
              { key: "reste", label: "Reste", align: "right" },
              { key: "nextDue", label: "Prochaine échéance" },
              { key: "statut", label: "Statut" },
            ]}
            rows={report.rows.map((row) => ({
              student: row.student,
              filiere: row.filiere,
              reste: fmtFCFA(row.reste),
              nextDue: row.nextDueDate?.slice(0, 10) ?? "—",
              statut: row.statut,
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function RecouvrementPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <RecouvrementContent />
    </Suspense>
  );
}
