import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import type { ReportSlug } from "./p0-reports";

export type HubSection = "apprenants" | "offre" | "rh" | "finance" | "activite";

export type HubCard = {
  id: number;
  slug?: ReportSlug;
  label: string;
  description: string;
  href?: string;
  section: HubSection;
  status: "live" | "soon";
  priority?: "P0" | "P1";
};

export const HUB_SECTION_LABEL: Record<HubSection, string> = {
  apprenants: "Learners",
  offre: "Programs",
  rh: "HR",
  finance: "Finance",
  activite: "Activity",
};

/** Catalogue §7 — 20 rubriques groupées par thème (4 × 5). */
export const REPORT_HUB_CARDS: HubCard[] = [
  {
    id: 1,
    slug: "effectifs-apprenants",
    label: "Learner headcount",
    description: "Tracked by program, level, and class",
    href: "/centre/rapports/effectifs-apprenants",
    section: "apprenants",
    status: "live",
    priority: "P0",
  },
  {
    id: 2,
    label: "Enrollments & re-enrollments",
    description: "Incoming enrollment during the period",
    section: "apprenants",
    status: "soon",
  },
  {
    id: 3,
    label: "Withdrawals & removals",
    description: "Departures and closed records",
    section: "apprenants",
    status: "soon",
  },
  {
    id: 4,
    label: "Attendance & presence",
    description: "Attendance rate by group",
    section: "apprenants",
    status: "soon",
  },
  {
    id: 5,
    slug: "filieres-programmes",
    label: "Programs & tracks",
    description: "Published catalog, drafts, and structure",
    href: "/centre/rapports/filieres-programmes",
    section: "offre",
    status: "live",
    priority: "P1",
  },
  {
    id: 6,
    label: "Catalog & pricing",
    description: "Price grids and bundles",
    section: "offre",
    status: "soon",
  },
  {
    id: 7,
    label: "Groups & classes",
    description: "Distribution and capacity by group",
    section: "offre",
    status: "soon",
  },
  {
    id: 8,
    label: "Capacity planning",
    description: "Available seats vs enrolled learners",
    section: "offre",
    status: "soon",
  },
  {
    id: 9,
    slug: "effectifs-personnel",
    label: "Staff headcount",
    description: "Academic vs administrative",
    href: "/centre/rapports/effectifs-personnel",
    section: "rh",
    status: "live",
    priority: "P1",
  },
  {
    id: 10,
    slug: "masse-salariale",
    label: "Payroll",
    description: "Payslips, bonuses, and payments",
    href: "/centre/rapports/masse-salariale",
    section: "rh",
    status: "live",
    priority: "P1",
  },
  {
    id: 11,
    label: "Absences & leave",
    description: "Unavailability tracking",
    section: "rh",
    status: "soon",
  },
  {
    id: 12,
    label: "Staff turnover",
    description: "HR arrivals and departures",
    section: "rh",
    status: "soon",
  },
  {
    id: 13,
    slug: "encaissements",
    label: "Collections",
    description: "Money received during the period",
    href: "/centre/rapports/encaissements",
    section: "finance",
    status: "live",
    priority: "P0",
  },
  {
    id: 14,
    slug: "recouvrement",
    label: "Receivables & recovery",
    description: "Revenue invoiced, collected, and recovery rate",
    href: "/centre/rapports/recouvrement",
    section: "finance",
    status: "live",
    priority: "P0",
  },
  {
    id: 15,
    slug: "retards",
    label: "Late payments & extensions",
    description: "Unpaid balances, aging, and deferred deadlines",
    href: "/centre/rapports/retards",
    section: "finance",
    status: "live",
    priority: "P0",
  },
  {
    id: 16,
    slug: "reductions-coupons",
    label: "Discounts & coupons",
    description: "Discounts granted and promo codes",
    href: "/centre/rapports/reductions-coupons",
    section: "finance",
    status: "live",
    priority: "P1",
  },
  {
    id: 17,
    slug: "examens",
    label: "Exams",
    description: "Scheduled, completed, and cancelled",
    href: "/centre/rapports/examens",
    section: "activite",
    status: "live",
    priority: "P1",
  },
  {
    id: 18,
    label: "Results & certifications",
    description: "Pass rates and diplomas",
    section: "activite",
    status: "soon",
  },
  {
    id: 19,
    label: "Teaching activity",
    description: "Classes delivered and workload",
    section: "activite",
    status: "soon",
  },
  {
    id: 20,
    label: "Assessments & checks",
    description: "Grades and averages by program",
    section: "activite",
    status: "soon",
  },
];

export function filterReportHub(
  centerType: string | null | undefined,
  cards: HubCard[] = REPORT_HUB_CARDS,
) {
  if (!isTcfCanadaCenter(centerType)) return cards;
  return cards.map((card) =>
    card.slug === "filieres-programmes"
      ? {
          ...card,
          label: "Programme et groupes TCF",
          description: "Programme TCF, groupes et organisation pédagogique",
        }
      : card,
  );
}

export function hubCardsBySection(centerType?: string | null) {
  const cards = filterReportHub(centerType);
  const sections: HubSection[] = ["apprenants", "offre", "rh", "finance", "activite"];
  return sections.map((section) => ({
    section,
    label: HUB_SECTION_LABEL[section],
    cards: cards.filter((c) => c.section === section),
  }));
}
