import { NextRequest, NextResponse } from "next/server";
import { normalizeNexaOffer } from "@/app/data/nexaOffers";
import { sendCenterActivatedEmail } from "@/app/utils/activation-emails";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function resolveCenterManagerEmail(centerId: string, fallbackEmail: string | null) {
  const [{ data: centerUsers }, { data: managerProfiles }, { data: center }] = await Promise.all([
    supabaseAdmin
      .from("center_users")
      .select("role, profiles:user_id ( email )")
      .eq("center_id", centerId)
      .in("role", ["owner", "manager"]),
    supabaseAdmin
      .from("profiles")
      .select("email, role")
      .eq("center_id", centerId)
      .in("role", ["center_manager", "campus_manager"]),
    supabaseAdmin.from("centers").select("email, application_id").eq("id", centerId).maybeSingle(),
  ]);

  for (const row of centerUsers ?? []) {
    const raw = row.profiles as unknown;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as { email?: string | null } | null;
    if (profile?.email?.trim()) return profile.email.trim();
  }
  for (const row of managerProfiles ?? []) {
    if (row.email?.trim()) return row.email.trim();
  }
  if (center?.email?.trim()) return center.email.trim();
  if (fallbackEmail?.trim()) return fallbackEmail.trim();
  if (center?.application_id) {
    const { data: application } = await supabaseAdmin
      .from("center_applications")
      .select("email")
      .eq("id", center.application_id)
      .maybeSingle();
    if (application?.email?.trim()) return application.email.trim();
  }
  return null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  if (!body?.nexa_offer) {
    return NextResponse.json({ error: "Offre NEXA requise." }, { status: 400 });
  }

  const normalized = normalizeNexaOffer(body.nexa_offer);
  if (!normalized) {
    return NextResponse.json({ error: "Offre NEXA invalide." }, { status: 400 });
  }

  const { data: previousCenter } = await supabaseAdmin
    .from("centers")
    .select("id, name, status, nexa_offer, subscription_period_months, subscription_amount, email")
    .eq("id", id)
    .maybeSingle();

  if (!previousCenter) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  const now = new Date();
  const periodMonths =
    typeof body.subscription_period_months === "number" && body.subscription_period_months > 0
      ? Math.trunc(body.subscription_period_months)
      : (previousCenter.subscription_period_months ?? 1);

  const patch: Record<string, unknown> = {
    status: "active",
    nexa_offer: normalized,
    subscription_starts_at: now.toISOString(),
    renewal_at: addMonths(now, periodMonths).toISOString(),
    subscription_period_months: periodMonths,
    trial_ends_at: null,
    updated_at: now.toISOString(),
  };

  if (typeof body.subscription_amount === "number" && Number.isFinite(body.subscription_amount)) {
    patch.subscription_amount = Math.trunc(body.subscription_amount);
  }

  if (Object.prototype.hasOwnProperty.call(body, "quota_overrides")) {
    if (body.quota_overrides === null) {
      patch.quota_overrides = null;
    } else if (typeof body.quota_overrides === "object" && !Array.isArray(body.quota_overrides)) {
      patch.quota_overrides = body.quota_overrides;
    }
  } else if (normalized !== "custom") {
    patch.quota_overrides = null;
  }

  const { data: center, error: updateError } = await supabaseAdmin
    .from("centers")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, status, nexa_offer, subscription_amount, subscription_period_months, subscription_starts_at, renewal_at, trial_ends_at, email, quota_overrides",
    )
    .maybeSingle();

  if (updateError || !center) {
    return NextResponse.json({ error: updateError?.message || "Échec de l'activation." }, { status: 500 });
  }

  await logSuperadminAction(ctx.user.id, "center_activated", {
    targetType: "center",
    targetId: id,
    metadata: {
      center_id: id,
      centerName: center.name,
      previousStatus: previousCenter.status,
      previousOffer: previousCenter.nexa_offer,
      nexa_offer: center.nexa_offer,
      subscription_amount: center.subscription_amount,
      subscription_period_months: center.subscription_period_months,
      renewal_at: center.renewal_at,
      quota_overrides: (center as { quota_overrides?: unknown }).quota_overrides ?? null,
    },
    req,
  });

  const managerEmail = await resolveCenterManagerEmail(id, center.email ?? previousCenter.email);
  const emailResult = await sendCenterActivatedEmail({
    to: managerEmail,
    centerName: center.name,
    offerKey: center.nexa_offer,
    amount: center.subscription_amount,
    periodMonths: center.subscription_period_months,
    renewalAt: center.renewal_at,
  });

  return NextResponse.json({ center, emailSent: Boolean(emailResult.sent) });
}
