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
import { useI18n } from "@/app/i18n/I18nProvider";
import { formatShort } from "@/app/utils/reports-period";

type EncaissementsReport = {
  period: { label: string };
  kpis: { totalEncaisse: number; nbPaiements: number; panierMoyen: number };
  byPeriod: { date: string; amount: number }[];
  byFiliere: { label: string; amount: number; count: number }[];
  byMode: { label: string; amount: number; count: number }[];
  rows: { date: string; student: string; filiere: string; amount: number; method: string }[];
};

function EncaissementsContent() {
  const { t, locale } = useI18n();
  const methodLabel = (method: string) => {
    const normalized = method.toLowerCase().trim();
    if (["espèces", "especes", "cash"].includes(normalized)) return t("centre", "collectionsMethodCash");
    if (["virement", "bank transfer", "transfer"].includes(normalized)) return t("centre", "collectionsMethodTransfer");
    if (["carte", "card", "carte bancaire"].includes(normalized)) return t("centre", "collectionsMethodCard");
    if (["mobile money", "mobile_money", "momo"].includes(normalized)) return "Mobile Money";
    return method;
  };
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<EncaissementsReport>("encaissements");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `encaissements-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "reportsDate"), t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "collectionsAmount"), t("centre", "collectionsMethod")],
      report.rows.map((r) => [r.date, r.student, r.filiere, r.amount, methodLabel(r.method)]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "collectionsTitle"),
      periodLabel: report.period.label,
      kpis: [
        { label: t("centre", "collectionsTotal"), value: fmtFCFA(report.kpis.totalEncaisse) },
        { label: t("centre", "collectionsPayments"), value: fmtNum(report.kpis.nbPaiements) },
        { label: t("centre", "collectionsAverageAmount"), value: fmtFCFA(report.kpis.panierMoyen) },
      ],
      sections: [
        {
          title: t("centre", "collectionsJournalShort"),
          columns: [t("centre", "reportsDate"), t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "collectionsAmount"), t("centre", "collectionsMethod")],
          rows: report.rows.map((r) => [r.date, r.student, r.filiere, fmtFCFA(r.amount), methodLabel(r.method)]),
        },
      ],
      filename: `encaissements-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="encaissements"
      centerType={centerType}
      title={t("centre", "collectionsTitle")}
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
              { label: t("centre", "collectionsTotal"), value: fmtFCFA(report.kpis.totalEncaisse), sub: from === to ? formatShort(from, locale) : `${formatShort(from, locale)} — ${formatShort(to, locale)}` },
              { label: t("centre", "collectionsPaymentCount"), value: fmtNum(report.kpis.nbPaiements) },
              { label: t("centre", "collectionsAverageAmount"), value: fmtFCFA(report.kpis.panierMoyen) },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportTrendChart
              title={t("centre", "summaryCollectionsTrend")}
              points={report.byPeriod.map((p) => ({
                label: new Date(p.date).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" }),
                value: p.amount,
              }))}
            />
            <ReportBarChart
              title={t("centre", "collectionsBreakdownMethod")}
              items={report.byMode.map((x) => ({ label: methodLabel(x.label), value: x.amount }))}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title={t("centre", "enrollmentByProgram")}
              columns={[
                { key: "label", label: t("centre", "enrollmentProgram") },
                { key: "amount", label: t("centre", "collectionsAmount"), align: "right" },
              ]}
              rows={report.byFiliere.map((x) => ({ ...x, amount: fmtFCFA(x.amount) }))}
            />
            <ReportBreakdownTable
              title={t("centre", "collectionsByPaymentMethod")}
              columns={[
                { key: "label", label: t("centre", "collectionsMethod") },
                { key: "amount", label: t("centre", "collectionsAmount"), align: "right" },
              ]}
              rows={report.byMode.map((x) => ({ ...x, label: methodLabel(x.label), amount: fmtFCFA(x.amount) }))}
            />
          </div>

          <ReportBreakdownTable
            title={t("centre", "collectionsJournal")}
            columns={[
              { key: "date", label: t("centre", "reportsDate") },
              { key: "student", label: t("centre", "enrollmentLearner") },
              { key: "filiere", label: t("centre", "enrollmentProgram") },
              { key: "amount", label: t("centre", "collectionsAmount"), align: "right" },
              { key: "method", label: t("centre", "collectionsMethod") },
            ]}
            rows={report.rows.map((row) => ({ ...row, amount: fmtFCFA(row.amount), method: methodLabel(row.method) }))}
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
