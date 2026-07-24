/**
 * Catalogue B2B NEXA — offres Access / Lite / Advance / Ultra.
 * Pack étudiant identique sur les 4 offres (fiches produit).
 */

import { centerTrialRemainingMs } from "@/app/utils/center-trial";

export type NexaOfferKey = "access" | "lite" | "advance" | "ultra";

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
  /** Frais plateforme mensuels (FCFA). */
  monthlyFee: number;
  /** Access uniquement : facturation par étudiant. */
  perStudentFee: number | null;
  maxStudents: number;
  /** null = illimité */
  maxClasses: number | null;
  maxLives: number;
  liveDurationMin: number;
  multiCampus: boolean;
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

const LITE_MODULES: NexaCenterModule[] = [
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

export const NEXA_OFFERS: Record<NexaOfferKey, NexaOfferConfig> = {
  access: {
    key: "access",
    name: "Access",
    tagline: "Formateur indépendant",
    monthlyFee: 5000,
    perStudentFee: 8500,
    maxStudents: 5,
    maxClasses: 1,
    maxLives: 0,
    liveDurationMin: 30,
    multiCampus: false,
    modules: ["etudiants", "planning", "finance", "communaute", "cours", "parametres"],
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
  lite: {
    key: "lite",
    name: "Lite",
    tagline: "Idéal pour démarrer la digitalisation de votre centre",
    monthlyFee: 40000,
    perStudentFee: null,
    maxStudents: 15,
    maxClasses: 2,
    maxLives: 4,
    liveDurationMin: 30,
    multiCampus: false,
    modules: LITE_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
  advance: {
    key: "advance",
    name: "Advance",
    tagline: "Des fonctionnalités plus étendues pour un meilleur environnement éducatif",
    monthlyFee: 80000,
    perStudentFee: null,
    maxStudents: 40,
    /** Lite (2) + 2 classes supplémentaires */
    maxClasses: 4,
    maxLives: 8,
    liveDurationMin: 30,
    multiCampus: true,
    modules: LITE_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
  ultra: {
    key: "ultra",
    name: "Ultra",
    tagline: "Une expérience unique dans la digitalisation de vos formations",
    monthlyFee: 180000,
    perStudentFee: null,
    maxStudents: 100,
    maxClasses: null,
    maxLives: 20,
    liveDurationMin: 30,
    multiCampus: true,
    modules: LITE_MODULES,
    studentQuotas: NEXA_STUDENT_QUOTAS,
  },
};

export const NEXA_OFFER_KEYS = Object.keys(NEXA_OFFERS) as NexaOfferKey[];

export function isNexaOfferKey(value: unknown): value is NexaOfferKey {
  return typeof value === "string" && value in NEXA_OFFERS;
}

export function normalizeNexaOffer(value: unknown): NexaOfferKey | null {
  if (value == null || value === "" || value === "none") return null;
  const key = String(value).trim().toLowerCase();
  return isNexaOfferKey(key) ? key : null;
}

export function getNexaOffer(key: NexaOfferKey | null | undefined): NexaOfferConfig | null {
  if (!key) return null;
  return NEXA_OFFERS[key] ?? null;
}

export type NexaOfferCenterInput = {
  nexa_offer?: string | null;
  status?: string | null;
  created_at?: string | null;
};

/**
 * Offre effective :
 * - si nexa_offer est posé → cette offre
 * - sinon pendant l'essai (pending + temps restant) → Ultra
 * - sinon (active sans offre, centres legacy) → Ultra jusqu'à attribution SA
 */
export function resolveEffectiveNexaOfferKey(center: NexaOfferCenterInput | null | undefined): NexaOfferKey {
  const assigned = normalizeNexaOffer(center?.nexa_offer);
  if (assigned) return assigned;

  if (center?.status === "pending" && centerTrialRemainingMs(center.created_at) > 0) {
    return "ultra";
  }

  return "ultra";
}

export function resolveEffectiveNexaOffer(center: NexaOfferCenterInput | null | undefined): NexaOfferConfig {
  return NEXA_OFFERS[resolveEffectiveNexaOfferKey(center)];
}

/** Quotas profil étudiant dérivés du pack B2B (colonnes profiles). */
export function getNexaB2bProfileQuotas() {
  const q = NEXA_STUDENT_QUOTAS;
  return {
    pack_name: "nexa_b2b",
    ee_total: q.expressionEcrite,
    ee_used: 0,
    exam_total: q.modesExamensEe,
    exam_used: 0,
    exam_4m_total: q.examenBlanc,
    exam_4m_used: 0,
    eo_total: q.expressionOrale,
    eo_used: 0,
    coaching_total: 0,
    coaching_used: 0,
    tutor_ia_total: q.sessionsTuteurIa,
    tutor_ia_used: 0,
  };
}

export function nexaOfferLabel(key: string | null | undefined): string {
  const normalized = normalizeNexaOffer(key);
  if (!normalized) return "Non attribuée";
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
