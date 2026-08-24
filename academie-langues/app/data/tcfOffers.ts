/**
 * Catalogue TCF Canada — Access / Lite / Advance / Entreprise (plaquette officielle NEXA).
 * Distinct du catalogue NEXA libre (Découverte / Croissance / Pro / Entreprise).
 */

export type TcfPlanKey = "access" | "lite" | "advance" | "entreprise";

export type TcfOfferConfig = {
  key: TcfPlanKey;
  nameFr: string;
  nameEn: string;
  taglineFr: string;
  taglineEn: string;
  priceFr: string;
  priceEn: string;
  /** Prix unitaire mensuel par étudiant (Access uniquement — null sinon). */
  pricePerUser: number | null;
  /** Prix d'entrée mensuel affiché ("à partir de"). */
  entryPrice: number | null;
  minStudents: number;
  maxStudents: number | null;
  maxCampus: number | null;
  highlight?: boolean;
  featuresFr: string[];
  featuresEn: string[];
};

export const TCF_OFFERS: Record<TcfPlanKey, TcfOfferConfig> = {
  access: {
    key: "access",
    nameFr: "Access",
    nameEn: "Access",
    taglineFr: "Pour démarrer simplement",
    taglineEn: "To get started simply",
    priceFr: "24 000 FCFA / mois",
    priceEn: "24,000 FCFA / month",
    pricePerUser: null,
    entryPrice: 24_000,
    minStudents: 1,
    maxStudents: 3,
    maxCampus: 1,
    featuresFr: [
      "Gestion des étudiants",
      "Planification cours & devoirs",
      "Planification examens & quiz",
      "Suivi des résultats",
      "Application mobile",
      "Support par email",
    ],
    featuresEn: [
      "Student management",
      "Course & homework planning",
      "Exam & quiz planning",
      "Results tracking",
      "Mobile app",
      "Email support",
    ],
  },
  lite: {
    key: "lite",
    nameFr: "Light",
    nameEn: "Light",
    taglineFr: "Pour structurer votre gestion",
    taglineEn: "To structure your management",
    priceFr: "40 000 FCFA / mois",
    priceEn: "40,000 FCFA / month",
    pricePerUser: null,
    entryPrice: 40_000,
    minStudents: 4,
    maxStudents: 6,
    maxCampus: 1,
    featuresFr: [
      "Gestion du staff",
      "Planning & emploi du temps",
      "Communauté",
      "Rapports avancés",
      "Support prioritaire",
    ],
    featuresEn: [
      "Staff management",
      "Planning & timetable",
      "Community",
      "Advanced reports",
      "Priority support",
    ],
  },
  advance: {
    key: "advance",
    nameFr: "Advance",
    nameEn: "Advance",
    taglineFr: "Pour accélérer votre croissance",
    taglineEn: "To accelerate your growth",
    priceFr: "75 000 FCFA / mois",
    priceEn: "75,000 FCFA / month",
    pricePerUser: null,
    entryPrice: 75_000,
    minStudents: 7,
    maxStudents: 12,
    maxCampus: 1,
    highlight: true,
    featuresFr: [
      "Gestion financière complète",
      "Paiements & facturation",
      "Tableau de bord avancés",
      "Alertes & notifications",
      "Exports personnalisés",
      "Support prioritaire +",
    ],
    featuresEn: [
      "Full financial management",
      "Payments & billing",
      "Advanced dashboards",
      "Alerts & notifications",
      "Custom exports",
      "Priority support +",
    ],
  },
  entreprise: {
    key: "entreprise",
    nameFr: "Ultra",
    nameEn: "Ultra",
    taglineFr: "Pour les grandes structures",
    taglineEn: "For large organizations",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    pricePerUser: null,
    entryPrice: null,
    minStudents: 13,
    maxStudents: null,
    maxCampus: null,
    featuresFr: [
      "Multi-campus",
      "Administration avancée",
      "API & intégrations",
      "Sauvegarde renforcée",
      "Accompagnement dédié",
      "Support premium 24/7",
    ],
    featuresEn: [
      "Multi-campus",
      "Advanced administration",
      "API & integrations",
      "Enhanced backups",
      "Dedicated support",
      "24/7 premium support",
    ],
  },
};

export const TCF_PLAN_KEYS = Object.keys(TCF_OFFERS) as TcfPlanKey[];

export function isTcfPlanKey(value: unknown): value is TcfPlanKey {
  return typeof value === "string" && value in TCF_OFFERS;
}

/** Normalise plan_type DB (Access / Lite / Advance / Entreprise / anciens paliers). */
export function normalizeTcfPlan(value: unknown): TcfPlanKey | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (raw === "sur devis" || raw === "sur_devis" || raw === "custom quote" || raw === "custom" || raw === "ultra") {
    return "entreprise";
  }
  // Anciens paliers (Starter / Pro) — remappés vers la nouvelle plaquette.
  if (raw === "starter") return "access";
  if (raw === "pro") return "advance";
  return isTcfPlanKey(raw) ? raw : null;
}

export function tcfPlanLabel(value: unknown, locale: "fr" | "en" = "fr"): string {
  const key = normalizeTcfPlan(value);
  if (!key) return locale === "en" ? "Trial" : "Essai";
  return locale === "en" ? TCF_OFFERS[key].nameEn : TCF_OFFERS[key].nameFr;
}

/** Plan TCF effectif : un centre sans plan explicite démarre sur Access. */
export function resolveEffectiveTcfPlan(value: unknown): TcfOfferConfig {
  const key = normalizeTcfPlan(value) || "access";
  return TCF_OFFERS[key];
}

/** Quota TCF avec priorité aux dérogations configurées par le superadmin. */
export function getTcfPlanQuota(
  planType: unknown,
  field: "maxStudents" | "maxCampus",
  overrides?: Record<string, unknown> | null,
): number | null {
  if (overrides && field in overrides) {
    const value = overrides[field];
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : resolveEffectiveTcfPlan(planType)[field];
  }
  return resolveEffectiveTcfPlan(planType)[field];
}
