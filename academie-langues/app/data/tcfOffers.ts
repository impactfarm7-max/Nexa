/**
 * Catalogue TCF Canada — Starter / Pro / Ultra (historique abonnements centre).
 * Distinct du catalogue NEXA libre (Découverte / Croissance / Pro / Entreprise).
 */

export type TcfPlanKey = "starter" | "pro" | "ultra" | "custom";

export type TcfOfferConfig = {
  key: TcfPlanKey;
  nameFr: string;
  nameEn: string;
  /** Toujours sur devis pour le TCF. */
  priceFr: string;
  priceEn: string;
  highlight?: boolean;
  featuresFr: string[];
  featuresEn: string[];
};

export const TCF_OFFERS: Record<TcfPlanKey, TcfOfferConfig> = {
  starter: {
    key: "starter",
    nameFr: "Starter",
    nameEn: "Starter",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    featuresFr: [
      "Accès plateforme TCF Canada",
      "Gestion étudiants & staff",
      "Examens blancs universels",
    ],
    featuresEn: [
      "TCF Canada platform access",
      "Student & staff management",
      "Universal mock exams",
    ],
  },
  pro: {
    key: "pro",
    nameFr: "Pro",
    nameEn: "Pro",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    highlight: true,
    featuresFr: [
      "Tout Starter",
      "Sessions Live illimitées",
      "Rapports & statistiques avancés",
    ],
    featuresEn: [
      "Everything in Starter",
      "Unlimited Live sessions",
      "Advanced reports & analytics",
    ],
  },
  ultra: {
    key: "ultra",
    nameFr: "Ultra",
    nameEn: "Ultra",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    featuresFr: [
      "Tout Pro",
      "Communauté & campus multiples",
      "Accompagnement dédié NEXA",
    ],
    featuresEn: [
      "Everything in Pro",
      "Community & multi-campus",
      "Dedicated NEXA support",
    ],
  },
  custom: {
    key: "custom",
    nameFr: "Sur devis",
    nameEn: "Custom quote",
    priceFr: "Sur devis",
    priceEn: "Custom quote",
    featuresFr: [
      "Accès personnalisé selon le volume et les besoins du centre",
      "Périmètre et tarification définis avec NEXA",
      "Accompagnement dédié",
    ],
    featuresEn: [
      "Personalized access based on center volume and needs",
      "Scope and pricing agreed with NEXA",
      "Dedicated support",
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
