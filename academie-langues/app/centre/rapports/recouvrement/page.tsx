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
  const { t, locale } = useI18n();
  const debtStatus = (status: string) => {
    const normalized = status.toLowerCase().trim();
    if (["soldé", "solde", "paid"].includes(normalized)) return t("centre", "recoveryStatusPaid");
    if (["partiel", "partial"].includes(normalized)) return t("centre", "recoveryStatusPartial");
    if (["impayé", "impaye", "unpaid"].includes(normalized)) return t("centre", "recoveryStatusUnpaid");
    return status;
  };
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<RecouvrementReport>("recouvrement");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `recouvrement-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "enrollmentLevel"), t("centre", "enrollmentClass"), "CA", t("centre", "recoveryCollected"), t("centre", "summaryBalance"), t("centre", "settingsStatus")],
      report.rows.map((r) => [
        r.student,
        r.filiere,
        r.niveau ?? "",
        r.classe ?? "",
        r.ca,
        r.encaisse,
        r.reste,
        debtStatus(r.statut),
      ]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "recoveryTitle"),
      periodLabel: report.period.label,
      kpis: [
        { label: t("centre", "summaryInvoicedRevenue"), value: fmtFCFA(report.kpis.caFacture) },
        { label: t("centre", "recoveryCollected"), value: fmtFCFA(report.kpis.encaisse) },
        { label: t("centre", "recoveryRateShort"), value: `${report.kpis.tauxRecouvrement} %` },
      ],
      sections: [
        {
          title: t("centre", "enrollmentByProgram"),
          columns: [t("centre", "enrollmentProgram"), "CA", t("centre", "recoveryCollected"), t("centre", "summaryBalance"), t("centre", "recoveryRateShort")],
          rows: report.byFiliere.map((x) => [x.label, fmtFCFA(x.ca), fmtFCFA(x.encaisse), fmtFCFA(x.reste), `${x.taux} %`]),
        },
        {
          title: t("centre", "recoveryTopUnpaid"),
          columns: [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "summaryBalance")],
          rows: report.rows.map((r) => [r.student, r.filiere, fmtFCFA(r.reste)]),
        },
      ],
      filename: `recouvrement-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="recouvrement"
      centerType={centerType}
      title={t("centre", "recoveryTitle")}
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
              { label: t("centre", "summaryInvoicedRevenue"), value: fmtFCFA(report.kpis.caFacture), sub: t("centre", "recoveryActiveRecords") },
              { label: t("centre", "recoveryCollectedCumulative"), value: fmtFCFA(report.kpis.encaisse) },
              { label: t("centre", "summaryOutstanding"), value: fmtFCFA(report.kpis.resteARecouvrer) },
              {
                label: t("centre", "summaryRecoveryRate"),
                value: `${report.kpis.tauxRecouvrement} %`,
                sub: t("centre", "recoveryRecordsCount", { count: fmtNum(report.kpis.nbDossiers) }),
              },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title={t("centre", "recoveryOutstandingByProgram")}
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.reste }))}
            />
            <ReportBarChart
              title={t("centre", "summaryRecoveryByProgram")}
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.taux }))}
              formatValue={(n) => `${n} %`}
            />
          </div>

          <ReportBreakdownTable
            title={t("centre", "enrollmentByProgram")}
            columns={[
              { key: "label", label: t("centre", "enrollmentProgram") },
              { key: "ca", label: "CA", align: "right" },
              { key: "encaisse", label: t("centre", "recoveryCollected"), align: "right" },
              { key: "reste", label: t("centre", "summaryBalance"), align: "right" },
              { key: "taux", label: t("centre", "recoveryRatePercent"), align: "right" },
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
            title={t("centre", "recoveryTop20Unpaid")}
            columns={[
              { key: "student", label: t("centre", "enrollmentLearner") },
              { key: "filiere", label: t("centre", "enrollmentProgram") },
              { key: "reste", label: t("centre", "summaryBalance"), align: "right" },
              { key: "nextDue", label: t("centre", "recoveryNextDueDate") },
              { key: "statut", label: t("centre", "settingsStatus") },
            ]}
            rows={report.rows.map((row) => ({
              student: row.student,
              filiere: row.filiere,
              reste: fmtFCFA(row.reste),
              nextDue: row.nextDueDate?.slice(0, 10) ?? "—",
              statut: debtStatus(row.statut),
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
