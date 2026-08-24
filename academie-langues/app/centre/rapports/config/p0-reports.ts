import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";

export type ReportSlug =
  | "synthese"
  | "effectifs-apprenants"
  | "encaissements"
  | "recouvrement"
  | "retards"
  | "reductions-coupons"
  | "filieres-programmes"
  | "effectifs-personnel"
  | "masse-salariale"
  | "rentabilite-campus"
  | "examens";

export type ReportNavItem = {
  slug: ReportSlug;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  section: "pilotage" | "apprenants" | "finance" | "offre" | "rh" | "activite";
  priority: "P0" | "P1";
};

export const REPORT_NAV: ReportNavItem[] = [
  {
    slug: "synthese",
    label: "Management summary",
    shortLabel: "Summary",
    description: "Overview — KPIs and alerts",
    href: "/centre/rapports",
    section: "pilotage",
    priority: "P0",
  },
  {
    slug: "effectifs-apprenants",
    label: "Learner headcount",
    shortLabel: "Enrollment",
    description: "Tracked by program, level, and class",
    href: "/centre/rapports/effectifs-apprenants",
    section: "apprenants",
    priority: "P0",
  },
  {
    slug: "filieres-programmes",
    label: "Programs & tracks",
    shortLabel: "Programs",
    description: "Published catalog, drafts, and structure",
    href: "/centre/rapports/filieres-programmes",
    section: "offre",
    priority: "P1",
  },
  {
    slug: "effectifs-personnel",
    label: "Staff headcount",
    shortLabel: "Staff",
    description: "Academic vs administrative, active and suspended",
    href: "/centre/rapports/effectifs-personnel",
    section: "rh",
    priority: "P1",
  },
  {
    slug: "masse-salariale",
    label: "Payroll",
    shortLabel: "Payroll",
    description: "Payslips, bonuses, deductions, and payments",
    href: "/centre/rapports/masse-salariale",
    section: "rh",
    priority: "P1",
  },
  {
    slug: "encaissements",
    label: "Collections",
    shortLabel: "Collections",
    description: "Cash inflow for the selected period",
    href: "/centre/rapports/encaissements",
    section: "finance",
    priority: "P0",
  },
  {
    slug: "rentabilite-campus",
    label: "Campus profitability",
    shortLabel: "Profitability",
    description: "Collections minus payroll and campus expenses",
    href: "/centre/rapports/rentabilite-campus",
    section: "finance",
    priority: "P1",
  },
  {
    slug: "recouvrement",
    label: "Receivables & recovery",
    shortLabel: "Recovery",
    description: "Invoiced revenue, collected amounts, and recovery rate",
    href: "/centre/rapports/recouvrement",
    section: "finance",
    priority: "P0",
  },
  {
    slug: "retards",
    label: "Late payments & extensions",
    shortLabel: "Overdue",
    description: "Unpaid balances, aging, and deferred deadlines",
    href: "/centre/rapports/retards",
    section: "finance",
    priority: "P0",
  },
  {
    slug: "reductions-coupons",
    label: "Discounts & coupons",
    shortLabel: "Discounts",
    description: "Discounts granted and promo codes",
    href: "/centre/rapports/reductions-coupons",
    section: "finance",
    priority: "P1",
  },
  {
    slug: "examens",
    label: "Exams",
    shortLabel: "Exams",
    description: "Scheduled, completed, and cancelled during the period",
    href: "/centre/rapports/examens",
    section: "activite",
    priority: "P1",
  },
];

/** Rubriques P0 du MVP direction (hors synthèse). */
export const P0_DETAIL_SLUGS: ReportSlug[] = [
  "effectifs-apprenants",
  "encaissements",
  "recouvrement",
  "retards",
];

/** P1 masquées pour les centres TCF Canada (catalogue / RH libre). */
const TCF_HIDDEN_SLUGS = new Set<ReportSlug>([
  "filieres-programmes",
  "effectifs-personnel",
  "masse-salariale",
]);

export function filterReportNav(
  centerType: string | null | undefined,
  nav: ReportNavItem[] = REPORT_NAV,
) {
  if (!isTcfCanadaCenter(centerType)) return nav;
  return nav.filter((item) => !TCF_HIDDEN_SLUGS.has(item.slug));
}

export function isReportHiddenForTcf(
  slug: ReportSlug,
  centerType: string | null | undefined,
) {
  return isTcfCanadaCenter(centerType) && TCF_HIDDEN_SLUGS.has(slug);
}

/** @deprecated use REPORT_NAV */
export const P0_REPORTS = REPORT_NAV;

export const REPORT_API_PATH: Record<ReportSlug, string> = {
  synthese: "/api/center/reports/synthese",
  "effectifs-apprenants": "/api/center/reports/effectifs-apprenants",
  "filieres-programmes": "/api/center/reports/filieres-programmes",
  "effectifs-personnel": "/api/center/reports/effectifs-personnel",
  "masse-salariale": "/api/center/reports/masse-salariale",
  encaissements: "/api/center/reports/encaissements",
  "rentabilite-campus": "/api/center/reports/rentabilite-campus",
  recouvrement: "/api/center/reports/recouvrement",
  retards: "/api/center/reports/retards",
  "reductions-coupons": "/api/center/reports/reductions-coupons",
  examens: "/api/center/reports/examens",
};
