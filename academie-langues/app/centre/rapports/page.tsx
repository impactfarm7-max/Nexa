"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle, Users, Wallet, TrendingUp, Clock, UserPlus, Loader2,
  BookOpen, Briefcase, ClipboardCheck, ArrowUpRight,
} from "lucide-react";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { ORANGE, Panel, PanelRow } from "@/app/centre/dashboard/dashboard-ui";
import ReportsShell from "./components/ReportsShell";
import ReportKpiGrid from "./components/ReportKpiGrid";
import ReportBarChart from "./components/ReportBarChart";
import ReportTrendChart from "./components/ReportTrendChart";
import ReportBreakdownTable from "./components/ReportBreakdownTable";
import ReportAlerts from "./components/ReportAlerts";
import ReportExportBar from "./components/ReportExportBar";
import { useReportPage } from "./hooks/useReportPage";
import { useReportPdfExport } from "./hooks/useReportPdfExport";
import { downloadCsv, fmtFCFA, fmtMoneyBar, fmtNum } from "@/app/utils/reports-export";
import { useI18n } from "@/app/i18n/I18nProvider";

type SyntheseReport = {
  period: { label: string };
  isTcf?: boolean;
  kpis: {
    apprenantsActifs: number;
    encaissePeriode: number;
    tauxRecouvrement: number;
    resteARecouvrer: number;
    nbRetard: number;
    montantRetard: number;
    nouvellesInscriptions: number;
    filieresPubliees: number | null;
    staffActifs: number | null;
    masseSalarialeNet: number | null;
    examensProgrammes: number;
  };
  alertes: { level: "danger" | "warning"; label: string; href: string }[];
  sections: {
    effectifs: { active: number; draft: number; paused: number };
    finance: { encaissePeriode: number; caFacture: number; reste: number; taux: number };
    offre: { total: number; published: number; draft: number } | null;
    rh: { total: number; academic: number; admin: number; active: number } | null;
    examens: { programmes: number; realises: number; annules: number };
  };
  charts: {
    encaissementTrend: { label: string; value: number }[];
    encaissementByFiliere: { label: string; value: number }[];
    effectifsByFiliere: { label: string; value: number }[];
    financeSplit: { label: string; value: number }[];
    recouvrementByFiliere: { label: string; value: number }[];
  };
  summaryTable: { domaine: string; indicateur: string; valeur: string }[];
};

function SyntheseContent() {
  const { t } = useI18n();
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange, reportHref,
    periodLabel,
  } = useReportPage<SyntheseReport>("synthese");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const isTcf = isTcfCanadaCenter(centerType) || report?.isTcf;

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `synthese-${periodLabel.replace(/\s+/g, "-")}.csv`,
      [t("centre", "summaryDomain"), t("centre", "summaryIndicator"), t("centre", "summaryValue")],
      report.summaryTable.map((r) => [r.domaine, r.indicateur, r.valeur]),
    );
  }, [report, t, periodLabel]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: t("centre", "summaryTitle"),
      periodLabel,
      kpis: [
        { label: t("centre", "summaryActiveLearners"), value: fmtNum(report.kpis.apprenantsActifs) },
        { label: t("centre", "summaryCollectedPeriod"), value: fmtFCFA(report.kpis.encaissePeriode) },
        { label: t("centre", "summaryRecoveryRate"), value: `${report.kpis.tauxRecouvrement} %` },
        { label: t("centre", "summaryOutstanding"), value: fmtFCFA(report.kpis.resteARecouvrer) },
      ],
      sections: [
        {
          title: t("centre", "summaryTable"),
          columns: [t("centre", "summaryDomain"), t("centre", "summaryIndicator"), t("centre", "summaryValue")],
          rows: report.summaryTable.map((r) => [r.domaine, r.indicateur, r.valeur]),
        },
      ],
      filename: `synthese-${periodLabel.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf, t, periodLabel]);

  if (loading && !report) {
    return <CenterPageLoading />;
  }

  return (
    <ReportsShell
      activeSlug="synthese"
      centerType={centerType}
      title={t("centre", "summaryTitle")}
      subtitle={t("centre", "summarySubtitle")}
      periodLabel={periodLabel}
      dateFrom={from}
      dateTo={to}
      onPeriodChange={setPeriodRange}
      campusId={campusId}
      filiereId={filiereId}
      campuses={campuses}
      filieres={filieres}
      onFilter={setFilter}
      hideCampusFilter
      hideFiliereFilter
      exportSlot={<ReportExportBar onCsv={exportCsv} onPdf={exportPdfReport} pdfLoading={pdfLoading} />}
    >
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
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
              {
                label: t("centre", "summaryActiveLearners"),
                value: fmtNum(report.kpis.apprenantsActifs),
                sub: t("centre", "summaryActiveEnrollments"),
                icon: Users,
                iconBg: "bg-blue-50",
                iconColor: "text-blue-600",
              },
              {
                label: t("centre", "summaryCollectedPeriod"),
                money: report.kpis.encaissePeriode,
                value: "",
                sub: periodLabel,
                icon: Wallet,
                iconBg: "bg-emerald-50",
                iconColor: "text-emerald-600",
                valueColor: "text-emerald-700",
              },
              {
                label: t("centre", "summaryRecoveryRate"),
                value: `${report.kpis.tauxRecouvrement} %`,
                sub: t("centre", "summaryOnActiveRecords"),
                icon: TrendingUp,
                iconBg: "bg-indigo-50",
                iconColor: "text-indigo-600",
              },
              {
                label: t("centre", "summaryOutstanding"),
                money: report.kpis.resteARecouvrer,
                value: "",
                sub: t("centre", "summaryOpenReceivables"),
                icon: Wallet,
                iconBg: "bg-amber-50",
                iconColor: "text-amber-600",
              },
              {
                label: t("centre", "summaryOverdueRecords"),
                value: fmtNum(report.kpis.nbRetard),
                sub: report.kpis.montantRetard > 0 ? fmtMoneyBar(report.kpis.montantRetard) : t("centre", "summaryNoOverdue"),
                icon: Clock,
                iconBg: report.kpis.nbRetard > 0 ? "bg-red-50" : "bg-neutral-50",
                iconColor: report.kpis.nbRetard > 0 ? "text-red-500" : "text-neutral-400",
                valueColor: report.kpis.nbRetard > 0 ? "text-red-600" : undefined,
                alert: report.kpis.nbRetard > 0,
              },
              {
                label: t("centre", "summaryNewEnrollments"),
                value: fmtNum(report.kpis.nouvellesInscriptions),
                sub: t("centre", "summaryDuringPeriod"),
                icon: UserPlus,
                iconBg: "bg-purple-50",
                iconColor: "text-purple-600",
              },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4 min-w-0">
            <ReportTrendChart
              title={t("centre", "summaryCollectionsTrend")}
              points={report.charts.encaissementTrend}
            />
            <ReportBarChart
              title={t("centre", "summaryFinanceBreakdown")}
              items={report.charts.financeSplit}
            />
            <ReportBarChart
              title={t("centre", "summaryCollectionsByProgram")}
              items={report.charts.encaissementByFiliere}
            />
            <ReportBarChart
              title={t("centre", "summaryActiveEnrollmentByProgram")}
              items={report.charts.effectifsByFiliere}
              formatValue={(n) => n.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
            />
          </div>

          {report.alertes.length > 0 && (
            <ReportAlerts items={report.alertes} hrefFor={reportHref} />
          )}

          <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
            <Panel title={t("centre", "summaryLearners")} href={reportHref("/centre/rapports/effectifs-apprenants")}>
              <div className="divide-y divide-neutral-100">
                <PanelRow icon={<Users size={12} className="text-blue-600" />} iconBg="bg-blue-50" label={t("centre", "summaryActive")} value={report.sections.effectifs.active} />
                <PanelRow icon={<Clock size={12} className="text-amber-600" />} iconBg="bg-amber-50" label={t("centre", "summaryPending")} value={report.sections.effectifs.draft} />
                <PanelRow icon={<Users size={12} className="text-neutral-500" />} iconBg="bg-neutral-50" label={t("centre", "summarySuspended")} value={report.sections.effectifs.paused} />
              </div>
            </Panel>

            <Panel title={t("centre", "reportsSectionFinance")} href={reportHref("/centre/rapports/recouvrement")}>
              <dl className="divide-y divide-neutral-100">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-baseline py-2.5">
                  <dt className="text-sm text-neutral-500 font-medium">{t("centre", "summaryInvoicedRevenue")}</dt>
                  <dd className="text-sm font-bold tabular-nums text-right whitespace-nowrap">{fmtMoneyBar(report.sections.finance.caFacture)}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-baseline py-2.5">
                  <dt className="text-sm text-neutral-500 font-medium">{t("centre", "summaryCollectedPeriod")}</dt>
                  <dd className="text-sm font-bold tabular-nums text-right whitespace-nowrap text-emerald-700">{fmtMoneyBar(report.sections.finance.encaissePeriode)}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-baseline py-2.5">
                  <dt className="text-sm text-neutral-500 font-medium">{t("centre", "summaryBalance")}</dt>
                  <dd className="text-sm font-bold tabular-nums text-right whitespace-nowrap">{fmtMoneyBar(report.sections.finance.reste)}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-baseline py-2.5">
                  <dt className="text-sm text-neutral-500 font-medium">{t("centre", "summaryRecovery")}</dt>
                  <dd className="text-sm font-black text-[#11224E] text-right">{report.sections.finance.taux} %</dd>
                </div>
              </dl>
            </Panel>

            {!isTcf && report.sections.offre && report.sections.rh && (
              <Panel title={t("centre", "summaryProgramsHr")} href={reportHref("/centre/rapports/filieres-programmes")}>
                <div className="divide-y divide-neutral-100">
                  <PanelRow icon={<BookOpen size={12} className="text-emerald-600" />} iconBg="bg-emerald-50" label={t("centre", "summaryPublishedPrograms")} value={report.sections.offre.published} />
                  <PanelRow icon={<Briefcase size={12} className="text-blue-600" />} iconBg="bg-blue-50" label={t("centre", "summaryActiveStaff")} value={report.sections.rh.active} />
                  <PanelRow icon={<Users size={12} className="text-purple-600" />} iconBg="bg-purple-50" label={t("centre", "summaryTrainers")} value={report.sections.rh.academic} />
                </div>
                {report.kpis.masseSalarialeNet != null && (
                  <p className="mt-3 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
                    {t("centre", "summaryPayroll")} :{" "}
                    <span className="font-bold text-neutral-800 tabular-nums">{fmtMoneyBar(report.kpis.masseSalarialeNet)}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={reportHref("/centre/rapports/effectifs-personnel")} className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: ORANGE }}>
                    {t("centre", "reportsNav_effectifs_personnel")} <ArrowUpRight size={12} />
                  </Link>
                  <Link href={reportHref("/centre/rapports/masse-salariale")} className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: ORANGE }}>
                    {t("centre", "reportsNav_masse_salariale")} <ArrowUpRight size={12} />
                  </Link>
                </div>
              </Panel>
            )}

            <Panel title={isTcf ? t("centre", "reportsExamTitleTcf") : t("centre", "summaryExamsPeriod")} href={reportHref("/centre/rapports/examens")}>
              <div className="divide-y divide-neutral-100">
                <PanelRow icon={<ClipboardCheck size={12} className="text-indigo-600" />} iconBg="bg-indigo-50" label={t("centre", "summaryScheduled")} value={report.sections.examens.programmes} />
                <PanelRow icon={<ClipboardCheck size={12} className="text-emerald-600" />} iconBg="bg-emerald-50" label={t("centre", "summaryCompleted")} value={report.sections.examens.realises} />
                <PanelRow icon={<ClipboardCheck size={12} className="text-red-500" />} iconBg="bg-red-50" label={t("centre", "summaryCanceled")} value={report.sections.examens.annules} alert={report.sections.examens.annules > 0} />
              </div>
            </Panel>
          </div>

          <ReportBarChart
            title={t("centre", "summaryRecoveryByProgram")}
            items={report.charts.recouvrementByFiliere}
            formatValue={(n) => `${n} %`}
          />

          <ReportBreakdownTable
            title={t("centre", "summaryTableLevel3")}
            columns={[
              { key: "domaine", label: t("centre", "summaryDomain") },
              { key: "indicateur", label: t("centre", "summaryIndicator") },
              { key: "valeur", label: t("centre", "summaryValue"), align: "right" },
            ]}
            rows={report.summaryTable}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function RapportsSynthesePage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <SyntheseContent />
    </Suspense>
  );
}
