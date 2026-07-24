/**
 * Catalogue officiel des packs NEXA (quotas profil).
 * Pack Ébène = référence TCF centre + offre 1 mois (12 000 FCFA).
 *
 * Mapping flyer → colonnes profiles :
 * - Entraînements EE     → ee_total
 * - Mode examen EE       → exam_total (exam_ee)
 * - Examens blancs       → exam_4m_total
 * - Entraînements EO     → eo_total
 * - Coaching humain      → coaching_total
 *
 * Tuteur IA : 15 échanges par étudiant (tutor_ia_*), quota fixe NEXA.
 */

import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";

export type PackOfferKey =
  | "raphia"
  | "ebene"
  | "cauris"
  | "ivoire"
  | "acceleree"
  | "complete";

export type PackOfferConfig = {
  name: string;
  days: number;
  ee: number;
  exam_ee: number;
  exam_4m: number;
  eo: number;
  coaching: number;
  color: string;
};

export const OFFERS_CONFIG: Record<PackOfferKey, PackOfferConfig> = {
  raphia: {
    name: "Pack Raphia",
    days: 14,
    ee: 30,
    exam_ee: 4,
    exam_4m: 0,
    eo: 0,
    coaching: 0,
    color: "bg-emerald-600",
  },
  /** Flyer Pack Ébène : EE 30, EO 12, examens blancs 1, mode examen EE 08 */
  ebene: {
    name: "Pack Ébène",
    days: 30,
    ee: 30,
    exam_ee: 8,
    exam_4m: 1,
    eo: 12,
    coaching: 0,
    color: "bg-slate-900",
  },
  cauris: {
    name: "Pack Cauris",
    days: 60,
    ee: 120,
    exam_ee: 16,
    exam_4m: 2,
    eo: 24,
    coaching: 4,
    color: "bg-blue-600",
  },
  ivoire: {
    name: "Pack Ivoire",
    days: 90,
    ee: 9999,
    exam_ee: 24,
    exam_4m: 4,
    eo: 36,
    coaching: 8,
    color: "bg-yellow-500",
  },
  acceleree: {
    name: "Formation Accélérée",
    days: 30,
    ee: 9999,
    exam_ee: 9999,
    exam_4m: 4,
    eo: 9999,
    coaching: 9999,
    color: "bg-indigo-600",
  },
  complete: {
    name: "Formation Complète",
    days: 60,
    ee: 9999,
    exam_ee: 9999,
    exam_4m: 4,
    eo: 9999,
    coaching: 9999,
    color: "bg-purple-600",
  },
};

/** Quotas TCF centre = Pack Ébène (1 mois de référence). */
export const TCF_CENTER_PACK_KEY: PackOfferKey = "ebene";

export function getTcfCenterQuotas(monthUnits = 1) {
  const months = Math.max(1, Math.ceil(monthUnits));
  const base = OFFERS_CONFIG.ebene;
  return {
    pack_name: TCF_CENTER_PACK_KEY,
    ee_total: base.ee * months,
    ee_used: 0,
    exam_total: base.exam_ee * months,
    exam_used: 0,
    exam_4m_total: base.exam_4m * months,
    exam_4m_used: 0,
    eo_total: base.eo * months,
    eo_used: 0,
    coaching_total: base.coaching * months,
    coaching_used: 0,
    tutor_ia_total: TUTOR_EXCHANGE_QUOTA,
    tutor_ia_used: 0,
  };
}
