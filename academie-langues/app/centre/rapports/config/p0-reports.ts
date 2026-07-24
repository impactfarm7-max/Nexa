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
    label: "Synthèse direction",
    shortLabel: "Synthèse",
    description: "Vue d'ensemble — KPIs et alertes",
    href: "/centre/rapports",
    section: "pilotage",
    priority: "P0",
  },
  {
    slug: "effectifs-apprenants",
    label: "Effectifs apprenants",
    shortLabel: "Effectifs",
    description: "Inscrits par filière, niveau et classe",
    href: "/centre/rapports/effectifs-apprenants",
    section: "apprenants",
    priority: "P0",
  },
  {
    slug: "filieres-programmes",
    label: "Filières & programmes",
    shortLabel: "Filières",
    description: "Catalogue publié, brouillon et structure",
    href: "/centre/rapports/filieres-programmes",
    section: "offre",
    priority: "P1",
  },
  {
    slug: "effectifs-personnel",
    label: "Effectifs personnel",
    shortLabel: "Personnel",
    description: "Académique vs administratif, actifs et suspendus",
    href: "/centre/rapports/effectifs-personnel",
    section: "rh",
    priority: "P1",
  },
  {
    slug: "masse-salariale",
    label: "Masse salariale",
    shortLabel: "Paie",
    description: "Bulletins, primes, retenues et versements",
    href: "/centre/rapports/masse-salariale",
    section: "rh",
    priority: "P1",
  },
  {
    slug: "encaissements",
    label: "Encaissements",
    shortLabel: "Encaissements",
    description: "Entrées d'argent sur la période",
    href: "/centre/rapports/encaissements",
    section: "finance",
    priority: "P0",
  },
  {
    slug: "recouvrement",
    label: "Créances & recouvrement",
    shortLabel: "Recouvrement",
    description: "CA facturé, encaissé et taux de recouvrement",
    href: "/centre/rapports/recouvrement",
    section: "finance",
    priority: "P0",
  },
  {
    slug: "retards",
    label: "Retards & moratoires",
    shortLabel: "Retards",
    description: "Impayés, aging et échéances reportées",
    href: "/centre/rapports/retards",
    section: "finance",
    priority: "P0",
  },
  {
    slug: "reductions-coupons",
    label: "Réductions & coupons",
    shortLabel: "Réductions",
    description: "Remises accordées et codes promo",
    href: "/centre/rapports/reductions-coupons",
    section: "finance",
    priority: "P1",
  },
  {
    slug: "examens",
    label: "Examens",
    shortLabel: "Examens",
    description: "Programmés, réalisés et annulés sur la période",
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
  recouvrement: "/api/center/reports/recouvrement",
  retards: "/api/center/reports/retards",
  "reductions-coupons": "/api/center/reports/reductions-coupons",
  examens: "/api/center/reports/examens",
};
