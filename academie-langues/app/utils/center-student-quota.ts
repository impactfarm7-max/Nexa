/**
 * Plafond utilisateurs NEXA (staff + étudiants) :
 * - Occupent une place : étudiants actifs/pause + staff actif
 * - Libèrent une place : étudiants expirés / révoqués / terminés ; staff révoqué
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getOfferQuota,
  resolveEffectiveNexaOffer,
  resolveEffectiveNexaOfferKey,
} from "@/app/data/nexaOffers";
import { CENTER_STAFF_ROLES } from "@/app/utils/student-routes";

export type QuotaStudentRow = {
  tag_status?: string | null;
  center_status?: string | null;
  subscription_ends_at?: string | null;
  subscription_paused_at?: string | null;
};

export function studentOccupiesQuotaSeat(row: QuotaStudentRow, now = Date.now()): boolean {
  const tag = (row.tag_status || "").toLowerCase();
  const centerStatus = (row.center_status || "").toLowerCase();

  if (tag === "revoque" || tag === "termine" || tag === "supprime") return false;
  if (centerStatus === "revoked") return false;

  // Pause réserve la place (y compris pause TCF via center_status).
  if (row.subscription_paused_at || centerStatus === "paused" || tag === "paused") return true;

  // Expiré = place libre
  if (row.subscription_ends_at) {
    const ends = new Date(row.subscription_ends_at).getTime();
    if (Number.isFinite(ends) && ends <= now) return false;
  }

  return true;
}

function staffOccupiesQuotaSeat(row: {
  tag_status?: string | null;
  center_status?: string | null;
}): boolean {
  const tag = (row.tag_status || "").toLowerCase();
  const centerStatus = (row.center_status || "").toLowerCase();
  if (tag === "revoque" || tag === "supprime") return false;
  if (centerStatus === "revoked") return false;
  return true;
}

type AdminClient = SupabaseClient;

function defaultAdmin(): AdminClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const STAFF_ROLE_LIST = Array.from(CENTER_STAFF_ROLES);

/** Étudiants qui occupent encore une place. */
export async function countOccupiedStudentSeats(
  centerId: string,
  client: AdminClient = defaultAdmin(),
): Promise<number> {
  const { data, error } = await client
    .from("profiles")
    .select("tag_status, center_status, subscription_ends_at, subscription_paused_at")
    .eq("center_id", centerId)
    .eq("role", "student");

  if (error) {
    console.warn("[quota] countOccupiedStudentSeats:", error.message);
    return 0;
  }

  const now = Date.now();
  return (data || []).filter((row) => studentOccupiesQuotaSeat(row, now)).length;
}

/** Staff actif du centre (occupe une place du plafond utilisateurs). */
export async function countOccupiedStaffSeats(
  centerId: string,
  client: AdminClient = defaultAdmin(),
): Promise<number> {
  const { data, error } = await client
    .from("profiles")
    .select("tag_status, center_status, role")
    .eq("center_id", centerId)
    .in("role", STAFF_ROLE_LIST);

  if (error) {
    console.warn("[quota] countOccupiedStaffSeats:", error.message);
    return 0;
  }

  return (data || []).filter((row) => staffOccupiesQuotaSeat(row)).length;
}

/** Places prises = staff + étudiants. */
export async function countOccupiedUserSeats(
  centerId: string,
  client: AdminClient = defaultAdmin(),
): Promise<number> {
  const [students, staff] = await Promise.all([
    countOccupiedStudentSeats(centerId, client),
    countOccupiedStaffSeats(centerId, client),
  ]);
  return students + staff;
}

export type CenterSeatLimitResult =
  | { ok: true; occupied: number; max: number | null }
  | { ok: false; occupied: number; max: number; offerName: string };

/**
 * Vérifie si le centre peut encore accueillir un utilisateur (staff ou étudiant)
 * selon le plafond offre (maxStudents = pool combiné).
 */
export async function assertCenterHasUserSeat(
  centerId: string,
  client: AdminClient = defaultAdmin(),
): Promise<CenterSeatLimitResult> {
  const { data: centerRow } = await client
    .from("centers")
    .select("nexa_offer, status, created_at, quota_overrides")
    .eq("id", centerId)
    .maybeSingle();

  const overrides =
    centerRow?.quota_overrides && typeof centerRow.quota_overrides === "object"
      ? (centerRow.quota_overrides as Record<string, unknown>)
      : null;
  const offerKey = resolveEffectiveNexaOfferKey(centerRow);
  const maxUsers = getOfferQuota(offerKey, "maxStudents", overrides);

  const occupied = await countOccupiedUserSeats(centerId, client);

  if (typeof maxUsers !== "number" || maxUsers < 0) {
    return { ok: true, occupied, max: null };
  }

  if (occupied >= maxUsers) {
    const offer = resolveEffectiveNexaOffer(centerRow);
    return { ok: false, occupied, max: maxUsers, offerName: offer.name };
  }

  return { ok: true, occupied, max: maxUsers };
}

/** @deprecated alias — le plafond est désormais staff + étudiants. */
export const assertCenterHasStudentSeat = assertCenterHasUserSeat;
