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
  const { t, locale } = useI18n();
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<ReductionsReport>("reductions-coupons");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);
  const localizedPeriod = from === to
    ? formatShort(from, locale)
    : locale === "en"
      ? `${formatShort(from, locale)} to ${formatShort(to, locale)}`
      : `${formatShort(from, locale)} — ${formatShort(to, locale)}`;

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `reductions-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "collectionsAmount"), t("centre", "discountReason"), t("centre", "discountEnrollment")],
      report.rows.map((r) => [r.student, r.filiere, r.amount, r.reason, r.enrolledAt]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "discountTitle"),
      periodLabel: localizedPeriod,
      kpis: [
        { label: t("centre", "discountTotal"), value: fmtFCFA(report.kpis.totalReductions) },
        { label: t("centre", "discountAffectedRecords"), value: fmtNum(report.kpis.nbDossiers) },
        { label: t("centre", "discountActiveCoupons"), value: fmtNum(report.kpis.nbCouponsActifs) },
      ],
      sections: [
        {
          title: t("centre", "discountByReason"),
          columns: [t("centre", "discountReason"), t("centre", "collectionsAmount")],
          rows: report.byReason.map((x) => [x.label, fmtFCFA(x.amount)]),
        },
        {
          title: t("centre", "discountDetail"),
          columns: [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "collectionsAmount"), t("centre", "discountReason")],
          rows: report.rows.map((r) => [r.student, r.filiere, fmtFCFA(r.amount), r.reason]),
        },
      ],
      filename: `reductions-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="reductions-coupons"
      centerType={centerType}
      title={t("centre", "discountTitle")}
      periodLabel={localizedPeriod}
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
              { label: t("centre", "discountTotal"), value: fmtFCFA(report.kpis.totalReductions), sub: localizedPeriod },
              { label: t("centre", "discountAffectedRecords"), value: fmtNum(report.kpis.nbDossiers) },
              { label: t("centre", "discountActiveCoupons"), value: fmtNum(report.kpis.nbCouponsActifs) },
              { label: t("centre", "discountCouponUses"), value: fmtNum(report.kpis.utilisationsCoupons) },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title={t("centre", "discountBreakdownProgram")}
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.amount }))}
            />
            <ReportBarChart
              title={t("centre", "discountBreakdownReason")}
              items={report.byReason.map((x) => ({ label: x.label, value: x.amount }))}
            />
          </div>

          {report.coupons.length > 0 && (
            <ReportBreakdownTable
              title={t("centre", "discountCenterCoupons")}
              columns={[
                { key: "code", label: t("centre", "discountCode") },
                { key: "type", label: t("centre", "summaryValue") },
                { key: "uses", label: t("centre", "discountUses"), align: "right" },
                { key: "active", label: t("centre", "settingsStatus") },
                { key: "expiresAt", label: t("centre", "discountExpiration") },
              ]}
              rows={report.coupons.map((c) => ({
                code: c.code,
                type: c.type,
                uses: `${c.uses}${c.maxUses ? ` / ${c.maxUses}` : ""}`,
                active: c.active ? t("centre", "campusActive") : t("centre", "periodInactive"),
                expiresAt: c.expiresAt,
              }))}
            />
          )}

          <ReportBreakdownTable
            title={t("centre", "discountRecords")}
            columns={[
              { key: "student", label: t("centre", "enrollmentLearner") },
              { key: "filiere", label: t("centre", "enrollmentProgram") },
              { key: "amount", label: t("centre", "collectionsAmount"), align: "right" },
              { key: "reason", label: t("centre", "discountReason") },
              { key: "enrolledAt", label: t("centre", "discountEnrollment") },
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
