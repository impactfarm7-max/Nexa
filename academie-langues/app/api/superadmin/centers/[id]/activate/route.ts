import { NextRequest, NextResponse } from "next/server";
import { normalizeNexaOffer } from "@/app/data/nexaOffers";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
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
    .select("id, name, status, nexa_offer, subscription_period_months, subscription_amount")
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

  const { data: center, error: updateError } = await supabaseAdmin
    .from("centers")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, status, nexa_offer, subscription_amount, subscription_period_months, subscription_starts_at, renewal_at, trial_ends_at",
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
    },
    req,
  });

  return NextResponse.json({ center });
}
