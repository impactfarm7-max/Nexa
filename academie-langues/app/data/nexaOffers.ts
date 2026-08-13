/**
 * Catalogue B2B NEXA — offres Découverte / Croissance / Pro / Entreprise.
 * Pack étudiant identique sur toutes les offres (quotas pédagogiques).
 */

import { centerTrialRemainingMs } from "@/app/utils/center-trial";

export type NexaOfferKey = "decouverte" | "croissance" | "pro" | "entreprise" | "custom";

export type NexaCenterModule =
  | "dashboard"
  | "etudiants"
  | "staff"
  | "finance"
  | "cours"
  | "planning"
  | "communaute"
  | "parametres"
  | "lives"
  | "filieres"
  | "examens"
  | "rapports";

/** Quotas pédagogiques par étudiant (identiques toutes offres). */
export type NexaStudentQuotas = {
  comprehensionEcrite: number;
  comprehensionOrale: number;
  expressionEcrite: number;
  modesExamensEe: number;
  expressionOrale: number;
  examenBlanc: number;
  modulesCoursQuiz: number;
  devoirsPratiques: number;
  sessionsTuteurIa: number;
  ressources2026: boolean;
};

export type NexaOfferConfig = {
  key: NexaOfferKey;
  name: string;
  tagline: string;
  minStudents: number;
  maxStudents: number | null;
  maxCampus: number | null;
  maxStaffAccounts: number | null;
  tutorInteractionsPerStudent: number | null;
  liveHoursPerStudent: number | null;
  aiCorrectionsPerStudent: number | null;
  courseBuilderPerMonth: number | null;
  whiteLabel: boolean | "option";
  /** Prix unitaire mensuel par utilisateur (null = sur devis). */
  pricePerUser: number | null;
  monthlyFeeMin: number;
  monthlyFeeMax: number | null;
  supportLevel: "standard" | "priority" | "dedicated" | "account_manager";
  modules: NexaCenterModule[];
  studentQuotas: NexaStudentQuotas;
};

export const NEXA_STUDENT_QUOTAS: NexaStudentQuotas = {
  comprehensionEcrite: 40,
  comprehensionOrale: 40,
  expressionEcrite: 30,
  modesExamensEe: 8,
  expressionOrale: 12,
  examenBlanc: 1,
  modulesCoursQuiz: 12,
  devoirsPratiques: 30,
  sessionsTuteurIa: 36,
  ressources2026: true,
};

const ALL_MODULES: NexaCenterModule[] = [
  "dashboard",
  "etudiants",
  "staff",
  "finance",
  "cours",
  "planning",
  "communaute",
  "parametres",
  "lives",
  "filieres",
  "examens",
  "rapports",
];

export const NEXA_OFFERS: Record<Exclude<NexaOfferKey, "custom">, NexaOfferConfig> = {
  decouverte: {
    key: "decouverte",
    name: "Découverte",
    tagline: "Pour démarrer avec 5 à 40 utilisateurs",
    minStudents: 5,
    maxStudents: 40,
    maxCampus: 1,
    maxStaffAccounts: null,
    tutorInteractionsPerStudent: 15,
    liveHoursPerStudent: 2,
    aiCorrectionsPerStudent: 5,
    courseBuilderPerMonth: 5,
    whiteLabel: false,
    pricePerUser: 2_500,
    monthlyFeeMin: 5 * 2_500,
    monthlyFeeMax: 40 * 2_500,
    supportLevel: "standard",
    modules: ALL_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
  croissance: {
    key: "croissance",
    name: "Croissance",
    tagline: "Jusqu'à 100 utilisateurs, support prioritaire",
    minStudents: 41,
    maxStudents: 100,
    maxCampus: 3,
    maxStaffAccounts: null,
    tutorInteractionsPerStudent: 25,
    liveHoursPerStudent: 3,
    aiCorrectionsPerStudent: 10,
    courseBuilderPerMonth: 10,
    whiteLabel: false,
    pricePerUser: 2_000,
    monthlyFeeMin: 41 * 2_000,
    monthlyFeeMax: 100 * 2_000,
    supportLevel: "priority",
    modules: ALL_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
  pro: {
    key: "pro",
    name: "Pro",
    tagline: "Rapports personnalisés, jusqu'à 250 utilisateurs",
    minStudents: 101,
    maxStudents: 250,
    maxCampus: 10,
    maxStaffAccounts: null,
    tutorInteractionsPerStudent: 30,
    liveHoursPerStudent: 4,
    aiCorrectionsPerStudent: 15,
    courseBuilderPerMonth: 15,
    whiteLabel: "option",
    pricePerUser: 1_900,
    monthlyFeeMin: 101 * 1_900,
    monthlyFeeMax: 250 * 1_900,
    supportLevel: "dedicated",
    modules: ALL_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
  entreprise: {
    key: "entreprise",
    name: "Entreprise",
    tagline: "Sur devis, tout illimité + SLA",
    minStudents: 251,
    maxStudents: null,
    maxCampus: null,
    maxStaffAccounts: null,
    tutorInteractionsPerStudent: null,
    liveHoursPerStudent: null,
    aiCorrectionsPerStudent: null,
    courseBuilderPerMonth: null,
    whiteLabel: true,
    pricePerUser: null,
    monthlyFeeMin: 250 * 1_900,
    monthlyFeeMax: null,
    supportLevel: "account_manager",
    modules: ALL_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
};

export const NEXA_OFFER_KEYS = Object.keys(NEXA_OFFERS) as Exclude<NexaOfferKey, "custom">[];

export function isNexaOfferKey(value: unknown): value is NexaOfferKey {
  if (typeof value !== "string") return false;
  return value in NEXA_OFFERS || value === "custom";
}

export function normalizeNexaOffer(value: unknown): NexaOfferKey | null {
  if (value == null || value === "" || value === "none") return null;
  const key = String(value).trim().toLowerCase();
  return isNexaOfferKey(key) ? (key as NexaOfferKey) : null;
}

export function getNexaOffer(key: NexaOfferKey | null | undefined): NexaOfferConfig | null {
  if (!key || key === "custom") return null;
  return NEXA_OFFERS[key] ?? null;
}

export type NexaOfferCenterInput = {
  nexa_offer?: string | null;
  status?: string | null;
  created_at?: string | null;
  trial_ends_at?: string | null;
};

/**
 * Offre effective :
 * - si nexa_offer posé → cette offre
 * - sinon pendant l'essai (pending + temps restant) → decouverte
 * - sinon (active sans offre, centres legacy) → decouverte
 */
export function resolveEffectiveNexaOfferKey(center: NexaOfferCenterInput | null | undefined): NexaOfferKey {
  const assigned = normalizeNexaOffer(center?.nexa_offer);
  if (assigned) return assigned;

  if (center?.status === "pending" && centerTrialRemainingMs(center.created_at) > 0) {
    return "decouverte";
  }

  return "decouverte";
}

export function resolveEffectiveNexaOffer(center: NexaOfferCenterInput | null | undefined): NexaOfferConfig {
  const key = resolveEffectiveNexaOfferKey(center);
  if (key === "custom") return NEXA_OFFERS.entreprise;
  return NEXA_OFFERS[key];
}

/**
 * Resolve a quota value considering overrides (for entreprise/custom).
 */
export function getOfferQuota<K extends keyof NexaOfferConfig>(
  offerKey: NexaOfferKey,
  field: K,
  overrides?: Record<string, unknown> | null,
): NexaOfferConfig[K] | null {
  if (overrides && field in overrides) return overrides[field] as NexaOfferConfig[K];
  if (offerKey === "custom") return null;
  return NEXA_OFFERS[offerKey][field];
}

function asNonNegInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    const n = Math.trunc(Number(value));
    return n >= 0 ? n : fallback;
  }
  return fallback;
}

/** Quotas pédagogiques effectifs (Sur devis via `quota_overrides.studentQuotas`). */
export function resolveNexaStudentQuotas(
  overrides?: Record<string, unknown> | null,
): NexaStudentQuotas {
  const nested =
    overrides?.studentQuotas && typeof overrides.studentQuotas === "object"
      ? (overrides.studentQuotas as Record<string, unknown>)
      : null;
  if (!nested) return { ...NEXA_STUDENT_QUOTAS };
  return {
    comprehensionEcrite: asNonNegInt(nested.comprehensionEcrite, NEXA_STUDENT_QUOTAS.comprehensionEcrite),
    comprehensionOrale: asNonNegInt(nested.comprehensionOrale, NEXA_STUDENT_QUOTAS.comprehensionOrale),
    expressionEcrite: asNonNegInt(nested.expressionEcrite, NEXA_STUDENT_QUOTAS.expressionEcrite),
    modesExamensEe: asNonNegInt(nested.modesExamensEe, NEXA_STUDENT_QUOTAS.modesExamensEe),
    expressionOrale: asNonNegInt(nested.expressionOrale, NEXA_STUDENT_QUOTAS.expressionOrale),
    examenBlanc: asNonNegInt(nested.examenBlanc, NEXA_STUDENT_QUOTAS.examenBlanc),
    modulesCoursQuiz: asNonNegInt(nested.modulesCoursQuiz, NEXA_STUDENT_QUOTAS.modulesCoursQuiz),
    devoirsPratiques: asNonNegInt(nested.devoirsPratiques, NEXA_STUDENT_QUOTAS.devoirsPratiques),
    sessionsTuteurIa: asNonNegInt(nested.sessionsTuteurIa, NEXA_STUDENT_QUOTAS.sessionsTuteurIa),
    ressources2026: nested.ressources2026 !== false,
  };
}

export function hasCustomStudentQuotaOverrides(
  overrides?: Record<string, unknown> | null,
): boolean {
  return Boolean(overrides?.studentQuotas && typeof overrides.studentQuotas === "object");
}

/** Quotas profil étudiant dérivés du pack B2B (colonnes profiles). */
export function getNexaB2bProfileQuotas(
  overrides?: Record<string, unknown> | null,
  monthUnits = 1,
) {
  const q = resolveNexaStudentQuotas(overrides);
  const months = Math.max(1, Math.ceil(monthUnits));
  const custom = hasCustomStudentQuotaOverrides(overrides);
  return {
    pack_name: custom ? "nexa_custom" : "nexa_b2b",
    ee_total: q.expressionEcrite * months,
    ee_used: 0,
    exam_total: q.modesExamensEe * months,
    exam_used: 0,
    exam_4m_total: q.examenBlanc * months,
    exam_4m_used: 0,
    eo_total: q.expressionOrale * months,
    eo_used: 0,
    coaching_total: 0,
    coaching_used: 0,
    tutor_ia_total: q.sessionsTuteurIa * months,
    tutor_ia_used: 0,
  };
}

export function nexaOfferLabel(
  key: string | null | undefined,
  locale: "fr" | "en" = "fr",
): string {
  const normalized = normalizeNexaOffer(key);
  if (!normalized) return locale === "en" ? "Not assigned" : "Non attribuée";
  if (normalized === "custom") return locale === "en" ? "Custom quote" : "Sur devis";
  if (locale === "en") {
    const enNames: Record<Exclude<NexaOfferKey, "custom">, string> = {
      decouverte: "Discovery",
      croissance: "Growth",
      pro: "Pro",
      entreprise: "Enterprise",
    };
    return enNames[normalized];
  }
  return NEXA_OFFERS[normalized].name;
}

export const NEXA_STUDENT_QUOTA_LABELS: { key: keyof NexaStudentQuotas; label: string }[] = [
  { key: "comprehensionEcrite", label: "Compréhension écrite" },
  { key: "comprehensionOrale", label: "Compréhension orale" },
  { key: "expressionEcrite", label: "Expression écrite" },
  { key: "modesExamensEe", label: "Modes examens EE" },
  { key: "expressionOrale", label: "Expression orale" },
  { key: "examenBlanc", label: "Examen blanc" },
  { key: "modulesCoursQuiz", label: "Modules cours & quiz" },
  { key: "devoirsPratiques", label: "Devoirs pratiques" },
  { key: "sessionsTuteurIa", label: "Sessions tuteur IA" },
  { key: "ressources2026", label: "Ressources & sujets corrigés 2026" },
];
