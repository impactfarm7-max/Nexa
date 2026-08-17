/**
 * Catalogue TCF Canada — Starter / Pro / Ultra (historique abonnements centre).
 * Distinct du catalogue NEXA libre (Découverte / Croissance / Pro / Entreprise).
 */

export type TcfPlanKey = "starter" | "pro" | "ultra" | "custom";

export type TcfOfferConfig = {
  key: TcfPlanKey;
  nameFr: string;
  nameEn: string;
  /** "Sur devis" uniquement pour le palier Entreprise (custom). */
  priceFr: string;
  priceEn: string;
  /** Prix unitaire mensuel par étudiant (null = sur devis). */
  pricePerUser: number | null;
  /** Prix d'entrée mensuel affiché ("à partir de"). */
  entryPrice: number | null;
  minStudents: number;
  maxStudents: number | null;
  highlight?: boolean;
  featuresFr: string[];
  featuresEn: string[];
};

/**
 * Technologie complète : identique sur tous les paliers TCF (seuls l'effectif,
 * le prix et le niveau d'accompagnement changent). Voir
 * docs/superpowers/specs/2026-08-13-tcf-offers-vs-libre-design.md.
 */
const TCF_FULL_STACK_FR = [
  "Tableau de bord centre & étudiant",
  "Gestion étudiants & staff illimités",
  "Programme TCF Canada complet",
  "Compréhension écrite",
  "Compréhension orale",
  "Expression écrite",
  "Expression orale",
  "Examens blancs universels",
  "Simulateurs d'examen (entraînement, examen, oral)",
  "Cours & constructeur de cours",
  "Bibliothèque de ressources",
  "Devoirs & missions",
  "Quiz & évaluations",
  "Tuteur IA",
  "Sessions Live",
  "Communauté",
  "Rapports & statistiques",
  "Finance & facturation",
];

const TCF_FULL_STACK_EN = [
  "Center & student dashboard",
  "Unlimited student & staff management",
  "Full TCF Canada program",
  "Reading comprehension",
  "Listening comprehension",
  "Written expression",
  "Oral expression",
  "Universal mock exams",
  "Exam simulators (practice, exam, oral)",
  "Courses & course builder",
  "Resource library",
  "Homework & assignments",
  "Quizzes & evaluations",
  "AI tutor",
  "Live sessions",
  "Community",
  "Reports & analytics",
  "Finance & billing",
];

export const TCF_OFFERS: Record<TcfPlanKey, TcfOfferConfig> = {
  starter: {
    key: "starter",
    nameFr: "Starter",
    nameEn: "Starter",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    pricePerUser: 8_500,
    entryPrice: 25_500,
    minStudents: 1,
    maxStudents: 3,
    featuresFr: [...TCF_FULL_STACK_FR],
    featuresEn: [...TCF_FULL_STACK_EN],
  },
  pro: {
    key: "pro",
    nameFr: "Pro",
    nameEn: "Pro",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    pricePerUser: 8_000,
    entryPrice: 48_000,
    minStudents: 4,
    maxStudents: 6,
    highlight: true,
    featuresFr: [...TCF_FULL_STACK_FR, "Support prioritaire"],
    featuresEn: [...TCF_FULL_STACK_EN, "Priority support"],
  },
  ultra: {
    key: "ultra",
    nameFr: "Ultra",
    nameEn: "Ultra",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    pricePerUser: 7_000,
    entryPrice: 70_000,
    minStudents: 7,
    maxStudents: 10,
    featuresFr: [...TCF_FULL_STACK_FR, "Support prioritaire", "Campus multiples", "Accompagnement dédié NEXA"],
    featuresEn: [...TCF_FULL_STACK_EN, "Priority support", "Multiple campuses", "Dedicated NEXA support"],
  },
  custom: {
    key: "custom",
    nameFr: "Entreprise",
    nameEn: "Enterprise",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    pricePerUser: null,
    entryPrice: null,
    minStudents: 11,
    maxStudents: null,
    featuresFr: [
      "Plus de 10 utilisateurs",
      ...TCF_FULL_STACK_FR,
      "Support prioritaire",
      "Campus multiples",
      "Marque blanche",
      "SLA & accompagnement dédié",
    ],
    featuresEn: [
      "More than 10 users",
      ...TCF_FULL_STACK_EN,
      "Priority support",
      "Multiple campuses",
      "White-label",
      "SLA & dedicated support",
    ],
  },
};

export const TCF_PLAN_KEYS = Object.keys(TCF_OFFERS) as TcfPlanKey[];

export function isTcfPlanKey(value: unknown): value is TcfPlanKey {
  return typeof value === "string" && value in TCF_OFFERS;
}

/** Normalise plan_type DB (Starter / starter / Sur devis…). */
export function normalizeTcfPlan(value: unknown): TcfPlanKey | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (raw === "sur devis" || raw === "sur_devis" || raw === "custom quote" || raw === "custom") {
    return "custom";
  }
  return isTcfPlanKey(raw) ? raw : null;
}

export function tcfPlanLabel(value: unknown, locale: "fr" | "en" = "fr"): string {
  const key = normalizeTcfPlan(value);
  if (!key) return locale === "en" ? "Trial" : "Essai";
  return locale === "en" ? TCF_OFFERS[key].nameEn : TCF_OFFERS[key].nameFr;
}
