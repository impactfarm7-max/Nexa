import { getOfferQuota, resolveEffectiveNexaOffer, resolveEffectiveNexaOfferKey } from "@/app/data/nexaOffers";

type AdminClient = {
  from: (table: string) => any;
};

export type CenterCampusLimitResult =
  | { ok: true; occupied: number; max: number | null; offerName: string }
  | { ok: false; occupied: number; max: number; offerName: string };

/** Vérifie le quota campus de l'offre effective, essai compris. */
export async function assertCenterHasCampusSlot(
  centerId: string,
  client: AdminClient,
): Promise<CenterCampusLimitResult> {
  const [{ data: center }, { count, error: countError }] = await Promise.all([
    client
      .from("centers")
      .select("nexa_offer, status, created_at, trial_ends_at, quota_overrides")
      .eq("id", centerId)
      .maybeSingle(),
    client
      .from("campuses")
      .select("id", { count: "exact", head: true })
      .eq("center_id", centerId),
  ]);

  if (!center) throw new Error("Centre introuvable.");
  if (countError) throw new Error(countError.message);

  const overrides =
    center.quota_overrides && typeof center.quota_overrides === "object"
      ? (center.quota_overrides as Record<string, unknown>)
      : null;
  const offerKey = resolveEffectiveNexaOfferKey(center);
  const max = getOfferQuota(offerKey, "maxCampus", overrides);
  const occupied = count ?? 0;
  const offerName = resolveEffectiveNexaOffer(center).name;

  if (typeof max === "number" && occupied >= max) {
    return { ok: false, occupied, max, offerName };
  }
  return { ok: true, occupied, max: typeof max === "number" ? max : null, offerName };
}
