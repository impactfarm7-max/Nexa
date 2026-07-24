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

type PersonnelReport = {
  period: { label: string };
  kpis: {
    total: number;
    academic: number;
    administrative: number;
    active: number;
    suspended: number;
  };
  byRole: { label: string; count: number }[];
  byCategory: { label: string; count: number }[];
  rows: {
    name: string;
    role: string;
    category: string;
    status: string;
    jobTitle: string;
    baseSalary: number;
  }[];
};

function PersonnelContent() {
  const {
    loading, error, report, campuses, filieres, centerType, centerId,
    from, to, campusId, filiereId, setFilter, setPeriodRange,
  } = useReportPage<PersonnelReport>("effectifs-personnel");
  const { exportPdf, pdfLoading } = useReportPdfExport(centerId);

  const exportCsv = useCallback(() => {
    if (!report) return;
    downloadCsv(
      `personnel-${report.period.label.replace(/\s+/g, "-")}.csv`,
      ["Nom", "Rôle", "Catégorie", "Statut", "Poste", "Salaire base"],
      report.rows.map((r) => [
        r.name, r.role, r.category, r.status, r.jobTitle, r.baseSalary,
      ]),
    );
  }, [report]);

  const exportPdfReport = useCallback(async () => {
    if (!report) return;
    await exportPdf({
      title: "Effectifs personnel",
      periodLabel: report.period.label,
      kpis: [
        { label: "Total", value: fmtNum(report.kpis.total) },
        { label: "Actifs", value: fmtNum(report.kpis.active) },
        { label: "Formateurs", value: fmtNum(report.kpis.academic) },
      ],
      sections: [
        {
          title: "Liste",
          columns: ["Nom", "Rôle", "Catégorie", "Statut"],
          rows: report.rows.map((r) => [r.name, r.role, r.category, r.status]),
        },
      ],
      filename: `personnel-${report.period.label.replace(/\s+/g, "-")}.pdf`,
    });
  }, [report, exportPdf]);

  if (loading && !report) return <CenterPageLoading />;

  return (
    <ReportsShell
      activeSlug="effectifs-personnel"
      centerType={centerType}
      title="Effectifs personnel"
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
              { label: "Total personnel", value: fmtNum(report.kpis.total) },
              { label: "Académique", value: fmtNum(report.kpis.academic), sub: "Formateurs" },
              { label: "Administratif", value: fmtNum(report.kpis.administrative) },
              { label: "Actifs", value: fmtNum(report.kpis.active) },
              { label: "Suspendus", value: fmtNum(report.kpis.suspended), alert: report.kpis.suspended > 0 },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <ReportBarChart title="Par catégorie" items={report.byCategory.map((x) => ({ label: x.label, value: x.count }))} />
            <ReportBarChart title="Par rôle" items={report.byRole.map((x) => ({ label: x.label, value: x.count }))} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <ReportBreakdownTable
              title="Par catégorie"
              columns={[
                { key: "label", label: "Catégorie" },
                { key: "count", label: "Effectif", align: "right" },
              ]}
              rows={report.byCategory}
            />
            <ReportBreakdownTable
              title="Par rôle"
              columns={[
                { key: "label", label: "Rôle" },
                { key: "count", label: "Effectif", align: "right" },
              ]}
              rows={report.byRole}
            />
          </div>
          <ReportBreakdownTable
            title="Liste du personnel"
            columns={[
              { key: "name", label: "Nom" },
              { key: "role", label: "Rôle" },
              { key: "category", label: "Catégorie" },
              { key: "status", label: "Statut" },
              { key: "baseSalary", label: "Base", align: "right" },
            ]}
            rows={report.rows.map((r) => ({
              ...r,
              baseSalary: fmtFCFA(r.baseSalary),
            }))}
          />
        </>
      )}
    </ReportsShell>
  );
}

export default function EffectifsPersonnelPage() {
  return (
    <Suspense fallback={<CenterPageLoading />}>
      <PersonnelContent />
    </Suspense>
  );
}
