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
  apprenants: "Apprenants",
  offre: "Offre",
  rh: "RH",
  finance: "Finance",
  activite: "Activité",
};

/** Catalogue §7 — 20 rubriques groupées par thème (4 × 5). */
export const REPORT_HUB_CARDS: HubCard[] = [
  {
    id: 1,
    slug: "effectifs-apprenants",
    label: "Effectifs apprenants",
    description: "Inscrits par filière, niveau et classe",
    href: "/centre/rapports/effectifs-apprenants",
    section: "apprenants",
    status: "live",
    priority: "P0",
  },
  {
    id: 2,
    label: "Inscriptions & réinscriptions",
    description: "Flux d'entrée sur la période",
    section: "apprenants",
    status: "soon",
  },
  {
    id: 3,
    label: "Abandons & radiations",
    description: "Sorties et dossiers clos",
    section: "apprenants",
    status: "soon",
  },
  {
    id: 4,
    label: "Assiduité & présence",
    description: "Taux de présence par groupe",
    section: "apprenants",
    status: "soon",
  },
  {
    id: 5,
    slug: "filieres-programmes",
    label: "Filières & programmes",
    description: "Catalogue publié, brouillon et structure",
    href: "/centre/rapports/filieres-programmes",
    section: "offre",
    status: "live",
    priority: "P1",
  },
  {
    id: 6,
    label: "Catalogue & tarifs",
    description: "Grilles tarifaires et packs",
    section: "offre",
    status: "soon",
  },
  {
    id: 7,
    label: "Groupes & classes",
    description: "Répartition et capacité par groupe",
    section: "offre",
    status: "soon",
  },
  {
    id: 8,
    label: "Capacité d'accueil",
    description: "Places disponibles vs inscrits",
    section: "offre",
    status: "soon",
  },
  {
    id: 9,
    slug: "effectifs-personnel",
    label: "Effectifs personnel",
    description: "Académique vs administratif",
    href: "/centre/rapports/effectifs-personnel",
    section: "rh",
    status: "live",
    priority: "P1",
  },
  {
    id: 10,
    slug: "masse-salariale",
    label: "Masse salariale",
    description: "Bulletins, primes et versements",
    href: "/centre/rapports/masse-salariale",
    section: "rh",
    status: "live",
    priority: "P1",
  },
  {
    id: 11,
    label: "Absences & congés",
    description: "Suivi des indisponibilités",
    section: "rh",
    status: "soon",
  },
  {
    id: 12,
    label: "Turnover personnel",
    description: "Entrées et sorties RH",
    section: "rh",
    status: "soon",
  },
  {
    id: 13,
    slug: "encaissements",
    label: "Encaissements",
    description: "Entrées d'argent sur la période",
    href: "/centre/rapports/encaissements",
    section: "finance",
    status: "live",
    priority: "P0",
  },
  {
    id: 14,
    slug: "recouvrement",
    label: "Créances & recouvrement",
    description: "CA facturé, encaissé et taux",
    href: "/centre/rapports/recouvrement",
    section: "finance",
    status: "live",
    priority: "P0",
  },
  {
    id: 15,
    slug: "retards",
    label: "Retards & moratoires",
    description: "Impayés, aging et reports",
    href: "/centre/rapports/retards",
    section: "finance",
    status: "live",
    priority: "P0",
  },
  {
    id: 16,
    slug: "reductions-coupons",
    label: "Réductions & coupons",
    description: "Remises accordées et codes promo",
    href: "/centre/rapports/reductions-coupons",
    section: "finance",
    status: "live",
    priority: "P1",
  },
  {
    id: 17,
    slug: "examens",
    label: "Examens",
    description: "Programmés, réalisés et annulés",
    href: "/centre/rapports/examens",
    section: "activite",
    status: "live",
    priority: "P1",
  },
  {
    id: 18,
    label: "Résultats & certifications",
    description: "Taux de réussite et diplômes",
    section: "activite",
    status: "soon",
  },
  {
    id: 19,
    label: "Activité pédagogique",
    description: "Cours dispensés et charge horaire",
    section: "activite",
    status: "soon",
  },
  {
    id: 20,
    label: "Évaluations & contrôles",
    description: "Notes et moyennes par filière",
    section: "activite",
    status: "soon",
  },
];

const TCF_HIDDEN_HUB_SLUGS = new Set<ReportSlug>([
  "filieres-programmes",
  "effectifs-personnel",
  "masse-salariale",
]);

export function filterReportHub(
  centerType: string | null | undefined,
  cards: HubCard[] = REPORT_HUB_CARDS,
) {
  if (!isTcfCanadaCenter(centerType)) return cards;
  return cards.filter((c) => !c.slug || !TCF_HIDDEN_HUB_SLUGS.has(c.slug));
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
