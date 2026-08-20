/**
 * Usage réel d'un centre vs plafonds offre NEXA.
 */

import {
  getOfferQuota,
  resolveEffectiveNexaOfferKey,
  type NexaOfferKey,
} from "@/app/data/nexaOffers";
import { studentOccupiesQuotaSeat, type QuotaStudentRow } from "@/app/utils/center-student-quota";

export type CenterUsage = {
  seatsOccupied: number;
  seatsMax: number | null;
  seatsPct: number | null;
  seatsOver: boolean;
  studentCount: number;
  staffCount: number;
  staffMax: number | null;
  staffOver: boolean;
  campusCount: number;
  campusMax: number | null;
  campusOver: boolean;
};

export function buildCenterUsage(input: {
  nexa_offer?: string | null;
  quota_overrides?: Record<string, unknown> | null;
  students?: QuotaStudentRow[];
  staffCount?: number;
  campusCount?: number;
  now?: number;
}): CenterUsage {
  const offerKey = resolveEffectiveNexaOfferKey({
    nexa_offer: input.nexa_offer,
  }) as NexaOfferKey | null;
  const overrides = input.quota_overrides ?? null;
  const now = input.now ?? Date.now();

  const studentSeats = (input.students || []).filter((row) => studentOccupiesQuotaSeat(row, now)).length;
  const staffCount = Math.max(0, input.staffCount ?? 0);
  const campusCount = Math.max(0, input.campusCount ?? 0);

  // Un seul pool utilisateurs : staff + étudiants.
  const seatsOccupied = studentSeats + staffCount;
  const seatsMax =
    offerKey != null ? (getOfferQuota(offerKey, "maxStudents", overrides) as number | null) : null;
  const campusMax =
    offerKey != null ? (getOfferQuota(offerKey, "maxCampus", overrides) as number | null) : null;

  const seatsPct =
    typeof seatsMax === "number" && seatsMax > 0
      ? Math.min(999, Math.round((seatsOccupied / seatsMax) * 100))
      : null;

  return {
    seatsOccupied,
    seatsMax: typeof seatsMax === "number" ? seatsMax : null,
    seatsPct,
    seatsOver: typeof seatsMax === "number" && seatsOccupied > seatsMax,
    studentCount: studentSeats,
    staffCount,
    staffMax: null,
    staffOver: false,
    campusCount,
    campusMax: typeof campusMax === "number" ? campusMax : null,
    campusOver: typeof campusMax === "number" && campusCount > campusMax,
  };
}
