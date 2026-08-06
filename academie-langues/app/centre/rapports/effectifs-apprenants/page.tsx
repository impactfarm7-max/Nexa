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
import { useI18n } from "@/app/i18n/I18nProvider";
import { formatShort } from "@/app/utils/reports-period";

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

function EffectifsContent() {
  const { t, locale } = useI18n();
  const statusLabel = (status: string) => {
    const known = ["active", "draft", "completed", "cancelled", "paused", "revoked"];
    return known.includes(status) ? t("centre", `enrollmentStatus_${status}`) : status;
  };
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<EffectifsReport>("effectifs-apprenants");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `effectifs-${report.period.label.replace(/\s+/g, "-")}.csv`,
      [t("centre", "enrollmentFirstName"), t("centre", "enrollmentLastName"), t("centre", "enrollmentProgram"), t("centre", "enrollmentLevel"), t("centre", "enrollmentClass"), t("centre", "enrollmentStatus"), t("centre", "enrollmentCenterStatus")],
      report.rows.map((r) => [
        r.prenom,
        r.nom,
        r.filiere,
        r.niveau ?? "",
        r.classe,
        statusLabel(r.enrollmentStatus),
        statusLabel(r.centerStatus),
      ]),
    );
  }, [report, t]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "enrollmentTitle"),
      periodLabel: report.period.label,
      kpis: [
        { label: t("centre", "enrollmentTotal"), value: fmtNum(report.kpis.total) },
        { label: t("centre", "summaryActive"), value: fmtNum(report.kpis.active) },
        { label: t("centre", "enrollmentNew"), value: fmtNum(report.kpis.newInPeriod) },
      ],
      sections: [
        {
          title: t("centre", "enrollmentByProgram"),
          columns: [t("centre", "enrollmentProgram"), t("centre", "enrollmentCount")],
          rows: report.byFiliere.map((x) => [x.label, x.count]),
        },
        {
          title: t("centre", "enrollmentList"),
          columns: [t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "enrollmentClass"), t("centre", "settingsStatus")],
          rows: report.rows.map((r) => [
            `${r.prenom} ${r.nom}`.trim(),
            r.filiere,
            r.classe,
            statusLabel(r.enrollmentStatus),
          ]),
        },
      ],
      filename: `effectifs-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="effectifs-apprenants"
      centerType={centerType}
      title={t("centre", "enrollmentTitle")}
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
              { label: t("centre", "enrollmentTotalEnrollments"), value: fmtNum(report.kpis.total) },
              { label: t("centre", "summaryActive"), value: fmtNum(report.kpis.active), sub: t("centre", "summaryActiveEnrollments") },
              { label: t("centre", "summaryPending"), value: fmtNum(report.kpis.draft), sub: t("centre", "enrollmentDraft") },
              { label: t("centre", "enrollmentCompletedPlural"), value: fmtNum(report.kpis.completed) },
              { label: t("centre", "summarySuspended"), value: fmtNum(report.kpis.paused), sub: t("centre", "enrollmentCenterProfile") },
              { label: t("centre", "enrollmentNewPeriod"), value: fmtNum(report.kpis.newInPeriod), sub: from === to ? formatShort(from, locale) : `${formatShort(from, locale)} — ${formatShort(to, locale)}` },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <ReportTrendChart
              title={t("centre", "enrollmentTrend")}
              points={report.byPeriod.map((p) => ({
                label: new Date(p.date).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" }),
                value: p.count,
              }))}
            />
            <ReportBarChart
              title={t("centre", "enrollmentBreakdownProgram")}
              items={report.byFiliere.map((x) => ({ label: x.label, value: x.count }))}
            />
            <ReportBarChart
              title={t("centre", "enrollmentBreakdownLevel")}
              items={report.byNiveau.map((x) => ({ label: x.label, value: x.count }))}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title={t("centre", "enrollmentByProgram")}
              columns={[
                { key: "label", label: t("centre", "enrollmentProgram") },
                { key: "count", label: t("centre", "enrollmentCount"), align: "right" },
              ]}
              rows={report.byFiliere}
            />
            <ReportBreakdownTable
              title={t("centre", "enrollmentByLevel")}
              columns={[
                { key: "label", label: t("centre", "enrollmentLevel") },
                { key: "count", label: t("centre", "enrollmentCount"), align: "right" },
              ]}
              rows={report.byNiveau}
            />
          </div>

          <ReportBreakdownTable
            title={t("centre", "enrollmentHierarchy")}
            columns={[
              { key: "filiere", label: t("centre", "enrollmentProgram") },
              { key: "niveau", label: t("centre", "enrollmentLevel") },
              { key: "classe", label: t("centre", "enrollmentClass") },
              { key: "count", label: t("centre", "enrollmentCount"), align: "right" },
            ]}
            rows={report.byHierarchy}
          />

          <ReportBreakdownTable
            title={t("centre", "enrollmentDetailedList")}
            columns={[
              { key: "name", label: t("centre", "enrollmentLearner") },
              { key: "filiere", label: t("centre", "enrollmentProgram") },
              { key: "niveau", label: t("centre", "enrollmentLevelShort") },
              { key: "classe", label: t("centre", "enrollmentClass") },
              { key: "status", label: t("centre", "settingsStatus") },
            ]}
            rows={report.rows.map((row) => ({
              name: `${row.prenom} ${row.nom}`.trim(),
              filiere: row.filiere,
              niveau: row.niveau ?? "—",
              classe: row.classe,
              status: statusLabel(row.enrollmentStatus),
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
