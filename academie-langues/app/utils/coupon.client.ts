import type { SupabaseClient } from "@supabase/supabase-js";

export type CouponListItem = {
  id: string;
  code: string;
  type: string;
  value: number;
  max_uses?: number | null;
  uses_count?: number | null;
  expires_at?: string | null;
  is_active?: boolean | null;
};

export function isCouponExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now.getTime();
}

export function isCouponExhausted(maxUses: number | null | undefined, usesCount: number | null | undefined): boolean {
  if (maxUses == null) return false;
  return (usesCount || 0) >= maxUses;
}

/** Usable for apply dropdowns: active, not expired, not exhausted. */
export function isCouponUsable(c: CouponListItem, now = new Date()): boolean {
  if (c.is_active === false) return false;
  if (isCouponExpired(c.expires_at, now)) return false;
  if (isCouponExhausted(c.max_uses, c.uses_count)) return false;
  return true;
}

/** Persist deactivation for all expired-but-still-active coupons of a center. */
export async function deactivateExpiredCoupons(
  supabase: SupabaseClient,
  centerId: string,
  now = new Date(),
): Promise<number> {
  const { data } = await supabase
    .from("coupons")
    .select("id, expires_at, is_active")
    .eq("center_id", centerId)
    .eq("is_active", true)
    .not("expires_at", "is", null);

  const expiredIds = (data || [])
    .filter((c) => isCouponExpired(c.expires_at, now))
    .map((c) => c.id);

  if (!expiredIds.length) return 0;

  await supabase.from("coupons").update({ is_active: false }).in("id", expiredIds);
  return expiredIds.length;
}

export async function fetchUsableCoupons(
  supabase: SupabaseClient,
  centerId: string,
): Promise<CouponListItem[]> {
  await deactivateExpiredCoupons(supabase, centerId);
  const { data } = await supabase
    .from("coupons")
    .select("id, code, type, value, expires_at, max_uses, uses_count, is_active")
    .eq("center_id", centerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return ((data || []) as CouponListItem[]).filter((c) => isCouponUsable(c));
}
