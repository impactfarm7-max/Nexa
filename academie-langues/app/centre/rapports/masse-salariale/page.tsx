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
import { useI18n } from "@/app/i18n/I18nProvider";

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
  const { t } = useI18n();
  const statusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "draft" || normalized === "brouillon") return t("centre", "payrollStatusDraft");
    if (normalized === "validated" || normalized === "validé") return t("centre", "payrollStatusValidated");
    if (normalized === "paid" || normalized === "payé") return t("centre", "payrollStatusPaid");
    return status;
  };
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<PaieReport>("masse-salariale");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report?.available) return;
    downloadCsv(
      `paie-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "payrollStaff"), t("centre", "reportsPeriod"), t("centre", "staffBase"), t("centre", "payrollBonuses"), t("centre", "payrollDeductions"), t("centre", "payrollNet"), t("centre", "payrollPaid"), t("centre", "settingsStatus")],
      report.rows.map((r) => [
        r.staff, r.period, r.base, r.primes, r.retenues, r.net, r.paid, statusLabel(String(r.status)),
      ]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report?.available) return;
    await exportPdf({
      title: t("centre", "payrollTitle"),
      periodLabel: report.period.label,
      kpis: [
        { label: t("centre", "payrollNetTotal"), value: fmtFCFA(report.kpis.netTotal) },
        { label: t("centre", "payrollPaid"), value: fmtFCFA(report.kpis.paidTotal) },
        { label: t("centre", "payrollPaidSlips"), value: `${report.kpis.nbPayes} / ${report.kpis.nbBulletins}` },
      ],
      sections: [
        {
          title: t("centre", "payrollSlips"),
          columns: [t("centre", "payrollStaff"), t("centre", "reportsPeriod"), t("centre", "payrollNet"), t("centre", "settingsStatus")],
          rows: report.rows.map((r) => [r.staff, r.period, fmtFCFA(Number(r.net)), statusLabel(String(r.status))]),
        },
      ],
      filename: `paie-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="masse-salariale"
      centerType={centerType}
      title={t("centre", "payrollTitle")}
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
          <Loader2 size={16} className="animate-spin" /> {t("centre", "summaryRefreshing")}
        </div>
      )}
      {report && !report.available && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{t("centre", "payrollTablesMissing")}</span>
        </div>
      )}
      {report?.available && (
        <>
          <ReportKpiGrid
            items={[
              { label: t("centre", "payrollNetTotal"), value: fmtFCFA(report.kpis.netTotal), sub: report.period.label },
              { label: t("centre", "payrollGrossTotal"), value: fmtFCFA(report.kpis.brutTotal) },
              { label: t("centre", "payrollTotalPaid"), value: fmtFCFA(report.kpis.paidTotal) },
              { label: t("centre", "payrollBonuses"), value: fmtFCFA(report.kpis.primesTotal) },
              { label: t("centre", "payrollDeductions"), value: fmtFCFA(report.kpis.retenuesTotal) },
              { label: t("centre", "payrollPaidSlips"), value: `${report.kpis.nbPayes} / ${report.kpis.nbBulletins}` },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart
              title={t("centre", "payrollNetByStatus")}
              items={report.byStatus.map((x) => ({ label: statusLabel(x.label), value: x.amount }))}
            />
            <ReportBarChart
              title={t("centre", "payrollSlipCountByStatus")}
              items={report.byStatus.map((x) => ({ label: statusLabel(x.label), value: x.count }))}
            />
          </div>
          <ReportBreakdownTable
            title={t("centre", "payrollBySlipStatus")}
            columns={[
              { key: "label", label: t("centre", "settingsStatus") },
              { key: "count", label: t("centre", "payrollSlips"), align: "right" },
              { key: "amount", label: t("centre", "payrollNet"), align: "right" },
            ]}
            rows={report.byStatus.map((r) => ({
              ...r,
              label: statusLabel(r.label),
              amount: fmtFCFA(r.amount),
            }))}
          />
          <ReportBreakdownTable
            title={t("centre", "payrollMemberDetail")}
            columns={[
              { key: "staff", label: t("centre", "payrollStaff") },
              { key: "period", label: t("centre", "reportsPeriod") },
              { key: "net", label: t("centre", "payrollNet"), align: "right" },
              { key: "paid", label: t("centre", "payrollPaid"), align: "right" },
              { key: "status", label: t("centre", "settingsStatus") },
            ]}
            rows={report.rows.map((r) => ({
              staff: r.staff,
              period: r.period,
              net: fmtFCFA(Number(r.net)),
              paid: fmtFCFA(Number(r.paid)),
              status: statusLabel(String(r.status)),
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
