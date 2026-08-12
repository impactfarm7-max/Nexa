import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { computeTutorUnlockAt, getTutorUnlockState } from "@/app/utils/tutor-unlock";
import { resolveAfricaCountry, resolveStudentRegion } from "@/app/data/africa-54";
import { resolveEffectiveNexaOffer, resolveNexaStudentQuotas } from "@/app/data/nexaOffers";
import { isPluriannualCenter } from "@/app/data/center-types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getStudentAccount(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Non autorise." }, { status: 401 }),
    };
  }

  const { data: profileRaw, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, prenom, nom, email, phone, ville, city, country, country_code, region, birth_date, genre, role, center_id, avatar_url, created_at, center_status, tag_status, access_pause_reason, pack_name, subscription_ends_at, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used, tutor_ia_total, tutor_ia_used, tutor_unlock_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  let profile = profileRaw;
  let profileLoadError = profileError;

  if (profileError && (profileError.message || "").toLowerCase().includes("access_pause_reason")) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .select(
        "id, prenom, nom, email, phone, ville, city, country, country_code, region, birth_date, genre, role, center_id, avatar_url, created_at, center_status, tag_status, pack_name, subscription_ends_at, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used, tutor_ia_total, tutor_ia_used, tutor_unlock_at",
      )
      .eq("id", user.id)
      .maybeSingle();
    profile = fallback.data ? { ...fallback.data, access_pause_reason: null } : null;
    profileLoadError = fallback.error;
  }

  if (profileLoadError) {
    return { response: NextResponse.json({ error: profileLoadError.message }, { status: 500 }) };
  }
  if (!profile) {
    return { response: NextResponse.json({ error: "Profil introuvable." }, { status: 404 }) };
  }
  if (profile.role !== "student" || !profile.center_id) {
    return { response: NextResponse.json({ error: "Compte etudiant centre requis." }, { status: 403 }) };
  }

  const [{ data: center, error: centerError }, { data: enrollment }, { data: details }] = await Promise.all([
    supabaseAdmin
      .from("centers")
      .select("id, name, code, city, status, created_at, nexa_offer, center_type, quota_overrides")
      .eq("id", profile.center_id)
      .maybeSingle(),
    supabaseAdmin
      .from("enrollments")
      .select(
        "id, status, tuition_fee, catalog_tuition_fee, duration_value, duration_unit, duration_months, enrolled_at, price_note",
      )
      .eq("student_id", user.id)
      .in("status", ["active", "draft"])
      .order("enrolled_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("student_details")
      .select("country, country_code, region")
      .eq("student_id", user.id)
      .maybeSingle(),
  ]);

  if (centerError) {
    return { response: NextResponse.json({ error: centerError.message }, { status: 500 }) };
  }
  if (!center) {
    return { response: NextResponse.json({ error: "Centre introuvable." }, { status: 404 }) };
  }

  const mergedCountry = profile.country || details?.country || null;
  const mergedCountryCode = profile.country_code || details?.country_code || null;
  const mergedCity = profile.ville || profile.city || null;
  const resolvedRegion = resolveStudentRegion({
    region: profile.region,
    detailsRegion: details?.region,
    country: mergedCountry,
    countryCode: mergedCountryCode,
    city: mergedCity,
  });

  const enrichedProfile = {
    ...profile,
    country: mergedCountry,
    country_code: mergedCountryCode,
    region: resolvedRegion,
  };

  // Backfill silencieux si la région était absente de profiles
  if (resolvedRegion && !profile.region?.trim()) {
    void supabaseAdmin
      .from("profiles")
      .update({ region: resolvedRegion })
      .eq("id", user.id);
  }

  let finance: {
    tuition_fee: number;
    tuition_paid: number;
    financial_status: string | null;
    remaining: number;
    discount_amount: number;
    discount_reason: string | null;
  } | null = null;

  let payments: Array<{
    id: string;
    amount: number;
    payment_method: string | null;
    payment_date: string | null;
    receipt_number: string | null;
  }> = [];

  let installments: Array<{
    id: string;
    label: string | null;
    amount: number;
    due_date: string | null;
    status: string | null;
    paid_amount: number;
    original_due_date: string | null;
    deferral_reason: string | null;
  }> = [];

  let financeEvents: Array<{
    id: string;
    type: string;
    amount: number | null;
    reason: string | null;
    created_at: string;
    payload: Record<string, unknown> | null;
  }> = [];

  if (enrollment?.id) {
    const [
      { data: financeRow },
      { data: paymentRows },
      { data: enrollmentExtra },
      { data: installmentRows },
      { data: eventRows },
    ] = await Promise.all([
      supabaseAdmin
        .from("student_finance_summary")
        .select("tuition_fee, tuition_paid, financial_status")
        .eq("enrollment_id", enrollment.id)
        .maybeSingle(),
      supabaseAdmin
        .from("student_payments")
        .select("id, amount, payment_method, payment_date, receipt_number")
        .eq("enrollment_id", enrollment.id)
        .order("payment_date", { ascending: false }),
      supabaseAdmin
        .from("enrollments")
        .select("discount_amount, discount_reason")
        .eq("id", enrollment.id)
        .maybeSingle(),
      supabaseAdmin
        .from("enrollment_installments")
        .select("id, label, amount, due_date, status, paid_amount, original_due_date, deferral_reason, position")
        .eq("enrollment_id", enrollment.id)
        .order("position", { ascending: true }),
      supabaseAdmin
        .from("enrollment_finance_events")
        .select("id, type, amount, reason, created_at, payload")
        .eq("enrollment_id", enrollment.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const tuitionFee = Number(financeRow?.tuition_fee ?? enrollment.tuition_fee ?? 0);
    const tuitionPaid = Number(financeRow?.tuition_paid ?? 0);
    const discountAmount = Number(enrollmentExtra?.discount_amount ?? 0);

    finance = {
      tuition_fee: tuitionFee,
      tuition_paid: tuitionPaid,
      financial_status: financeRow?.financial_status ?? null,
      remaining: Math.max(0, tuitionFee - tuitionPaid),
      discount_amount: discountAmount,
      discount_reason: enrollmentExtra?.discount_reason ?? null,
    };

    payments = (paymentRows || []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      payment_method: p.payment_method,
      payment_date: p.payment_date,
      receipt_number: p.receipt_number,
    }));

    installments = (installmentRows || []).map((i) => ({
      id: i.id,
      label: i.label,
      amount: Number(i.amount) || 0,
      due_date: i.due_date,
      status: i.status,
      paid_amount: Number(i.paid_amount) || 0,
      original_due_date: i.original_due_date ?? null,
      deferral_reason: i.deferral_reason ?? null,
    }));

    financeEvents = (eventRows || []).map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount != null ? Number(e.amount) : null,
      reason: e.reason,
      created_at: e.created_at,
      payload: (e.payload as Record<string, unknown>) || null,
    }));
  }

  let tutorUnlockAt = profile.tutor_unlock_at as string | null;
  if (!tutorUnlockAt) {
    const fallbackStart = enrollment?.enrolled_at || profile.created_at || user.created_at;
    tutorUnlockAt = computeTutorUnlockAt(fallbackStart);
  }

  return {
    user,
    profile: enrichedProfile,
    center,
    enrollment: enrollment || null,
    finance,
    payments,
    installments,
    financeEvents,
    tutor: getTutorUnlockState(tutorUnlockAt),
    nexaQuotas: isPluriannualCenter((center as { center_type?: string } | null)?.center_type)
      ? null
      : resolveNexaStudentQuotas(
          (center as { quota_overrides?: Record<string, unknown> | null } | null)?.quota_overrides,
        ),
    nexaOffer: resolveEffectiveNexaOffer(center).key,
    isPluriannual: isPluriannualCenter((center as { center_type?: string } | null)?.center_type),
    response: null,
  };
}

export async function GET(req: Request) {
  const result = await getStudentAccount(req);
  if (result.response) return result.response;

  const { user, profile, center, enrollment, finance, payments, installments, financeEvents, tutor, nexaQuotas, nexaOffer, isPluriannual } = result;

  return NextResponse.json({
    user: { id: user!.id, email: user!.email, created_at: user!.created_at },
    profile,
    center,
    enrollment,
    finance,
    payments,
    installments,
    financeEvents,
    tutor,
    nexaQuotas,
    nexaOffer,
    isPluriannual,
  });
}

export async function PATCH(req: Request) {
  const result = await getStudentAccount(req);
  if (result.response) return result.response;

  const { user, profile } = result;
  const body = await req.json();

  const country = resolveAfricaCountry(
    body.country_code || body.country || profile?.country_code || profile?.country,
  );
  const regionValue =
    body.region !== undefined
      ? String(body.region || "").trim() || null
      : profile?.region || null;
  const cityValue = String(body.ville ?? profile?.ville ?? profile?.city ?? "").trim() || null;

  const updates: Record<string, string | null> = {
    prenom: String(body.prenom ?? profile?.prenom ?? "").trim() || null,
    nom: String(body.nom ?? profile?.nom ?? "").trim() || null,
    phone: String(body.phone ?? profile?.phone ?? "").trim() || null,
    ville: cityValue,
    city: cityValue,
  };

  if (body.region !== undefined || !profile?.region) {
    updates.region =
      regionValue ||
      resolveStudentRegion({
        region: regionValue,
        country: country?.name || profile?.country,
        countryCode: country?.code || profile?.country_code,
        city: cityValue,
      });
  }
  if (body.country !== undefined || country) {
    updates.country = String(body.country || country?.name || profile?.country || "").trim() || null;
  }
  if (body.country_code !== undefined || country) {
    // Stocker l'indicatif (ex: +237), cohérent avec la création TCF
    updates.country_code =
      country?.dial || String(body.country_code || profile?.country_code || "").trim() || null;
  }
  if (body.birth_date !== undefined) {
    updates.birth_date = String(body.birth_date || "").trim() || null;
  }

  if (body.avatar_url !== undefined) {
    updates.avatar_url = String(body.avatar_url || "").trim() || null;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", user!.id)
    .select(
      "id, prenom, nom, email, phone, ville, city, country, country_code, region, birth_date, genre, role, center_id, avatar_url, created_at, center_status, tag_status, pack_name, subscription_ends_at",
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Garder student_details synchronisé (source utilisée par le centre)
  if (updates.country !== undefined || updates.country_code !== undefined || updates.region !== undefined) {
    await supabaseAdmin.from("student_details").upsert(
      {
        student_id: user!.id,
        country: updates.country ?? data?.country ?? null,
        country_code: updates.country_code ?? data?.country_code ?? null,
        region: updates.region ?? data?.region ?? null,
      },
      { onConflict: "student_id" },
    );
  }

  return NextResponse.json({ profile: data || profile });
}
