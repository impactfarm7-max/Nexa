import { NextRequest, NextResponse } from "next/server";
import {
  getSuperadminContext,
  logSuperadminAction,
  requireSuperadminMenu,
  supabaseAdmin,
} from "@/app/utils/superadmin-auth-server";
import { validatePaymentInput } from "@/app/data/financePayments";

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;
  const menuError = requireSuperadminMenu(ctx, "finance");
  if (menuError) return menuError;

  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 90);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(requestedDays, 365)) : 90;
  const centerId = req.nextUrl.searchParams.get("centerId");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("finance_payments")
    .select(
      "id, center_id, amount, method, period_label, paid_at, note, document_number, source, created_at, centers(name, city, center_type, nexa_offer, plan_type)",
    )
    .gte("paid_at", since)
    .order("paid_at", { ascending: false })
    .limit(500);

  if (centerId) query = query.eq("center_id", centerId);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ payments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;
  const menuError = requireSuperadminMenu(ctx, "finance");
  if (menuError) return menuError;

  const body = await req.json().catch(() => ({}));
  const parsed = validatePaymentInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: `Champs invalides : ${parsed.errors.join(", ")}` }, { status: 400 });
  }

  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("id")
    .eq("id", parsed.value.center_id)
    .maybeSingle();
  if (!center) return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });

  const { data: payment, error: insertError } = await supabaseAdmin
    .from("finance_payments")
    .insert({ ...parsed.value, source: "manual", created_by: ctx.user.id })
    .select("id, center_id, amount, method, period_label, paid_at, note, document_number, source, created_at")
    .single();

  if (insertError || !payment) {
    return NextResponse.json({ error: insertError?.message || "Échec de l'enregistrement." }, { status: 500 });
  }

  await logSuperadminAction(ctx.user.id, "finance_payment_recorded", {
    targetType: "center",
    targetId: parsed.value.center_id,
    req,
    metadata: { amount: parsed.value.amount, document_number: payment.document_number },
  });

  return NextResponse.json({ payment });
}
