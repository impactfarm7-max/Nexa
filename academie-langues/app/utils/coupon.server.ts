import type { SupabaseClient } from "@supabase/supabase-js";

export type CouponRow = {
  id: string;
  code: string;
  type: "fixed" | "percentage" | string;
  value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
};

export function computeCouponDiscount(coupon: Pick<CouponRow, "type" | "value">, baseAmount: number): number {
  const base = Math.max(0, Math.round(Number(baseAmount) || 0));
  if (base <= 0) return 0;
  if (coupon.type === "percentage") {
    return Math.round(base * (Number(coupon.value) || 0) / 100);
  }
  return Math.min(Math.round(Number(coupon.value) || 0), base);
}

export async function fetchValidCoupon(
  supabase: SupabaseClient,
  centerId: string,
  rawCode: string,
): Promise<{ ok: true; coupon: CouponRow } | { ok: false; error: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "Code coupon requis." };
  }

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("id, code, type, value, max_uses, uses_count, expires_at, is_active")
    .eq("center_id", centerId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!coupon || !coupon.is_active) {
    return { ok: false, error: "Coupon invalide." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { ok: false, error: "Coupon expiré." };
  }
  if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
    return { ok: false, error: "Coupon épuisé." };
  }

  return { ok: true, coupon: coupon as CouponRow };
}

export async function incrementCouponUse(supabase: SupabaseClient, couponId: string) {
  const { data: row } = await supabase
    .from("coupons")
    .select("uses_count")
    .eq("id", couponId)
    .maybeSingle();
  if (!row) return;
  await supabase
    .from("coupons")
    .update({ uses_count: (row.uses_count || 0) + 1 })
    .eq("id", couponId);
}
