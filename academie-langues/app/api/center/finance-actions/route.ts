import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  computeCouponDiscount,
  fetchValidCoupon,
  incrementCouponUse,
} from "@/app/utils/coupon.server";

type DeferBody = {
  action: "defer";
  installment_id: string;
  new_due_date: string;
  reason: string;
};

type DiscountBody = {
  action: "discount";
  enrollment_id: string;
  amount: number;
  reason: string;
};

type ApplyCouponBody = {
  action: "apply_coupon";
  enrollment_id: string;
  code: string;
};

type Body = DeferBody | DiscountBody | ApplyCouponBody;

async function assertEnrollmentInCenter(enrollmentId: string, centerId: string) {
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id, filiere_id, filieres(center_id)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return { ok: false as const, error: "Inscription introuvable." };

  const filiereCenter = (enrollment as { filieres?: { center_id?: string } | null }).filieres?.center_id;
  if (filiereCenter && filiereCenter !== centerId) {
    return { ok: false as const, error: "Inscription hors de votre centre." };
  }

  // Fallback: some enrollments store center_id directly
  const { data: direct } = await supabaseAdmin
    .from("enrollments")
    .select("id, center_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (direct && "center_id" in direct && direct.center_id && direct.center_id !== centerId) {
    return { ok: false as const, error: "Inscription hors de votre centre." };
  }

  return { ok: true as const, enrollmentId };
}

async function assertInstallmentInCenter(installmentId: string, centerId: string) {
  const { data: inst } = await supabaseAdmin
    .from("enrollment_installments")
    .select("id, enrollment_id")
    .eq("id", installmentId)
    .maybeSingle();

  if (!inst?.enrollment_id) {
    return { ok: false as const, error: "Échéance introuvable." };
  }

  const check = await assertEnrollmentInCenter(inst.enrollment_id, centerId);
  if (!check.ok) return check;
  return { ok: true as const, enrollmentId: inst.enrollment_id, installmentId };
}

export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body?.action) {
    return NextResponse.json({ error: "Action manquante." }, { status: 400 });
  }

  const actorId = ctx!.user.id;

  if (body.action === "defer") {
    const installmentId = String(body.installment_id || "").trim();
    const newDue = String(body.new_due_date || "").trim().slice(0, 10);
    const reason = String(body.reason || "").trim();

    if (!installmentId || !newDue || !reason) {
      return NextResponse.json(
        { error: "Échéance, nouvelle date et motif sont requis." },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDue)) {
      return NextResponse.json({ error: "Date invalide (AAAA-MM-JJ)." }, { status: 400 });
    }

    const check = await assertInstallmentInCenter(installmentId, ctx!.centerId);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    const { data, error: rpcErr } = await supabaseAdmin.rpc("defer_installment", {
      p_installment_id: installmentId,
      p_new_due_date: newDue,
      p_reason: reason,
      p_actor: actorId,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      event_id: data,
      enrollment_id: check.enrollmentId,
    });
  }

  if (body.action === "discount") {
    const enrollmentId = String(body.enrollment_id || "").trim();
    const amount = Math.round(Number(body.amount) || 0);
    const reason = String(body.reason || "").trim();

    if (!enrollmentId || amount <= 0 || !reason) {
      return NextResponse.json(
        { error: "Inscription, montant (> 0) et motif sont requis." },
        { status: 400 },
      );
    }

    const check = await assertEnrollmentInCenter(enrollmentId, ctx!.centerId);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    const { data, error: rpcErr } = await supabaseAdmin.rpc("apply_enrollment_discount", {
      p_enrollment_id: enrollmentId,
      p_amount: amount,
      p_reason: reason,
      p_actor: actorId,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      event_id: data,
      enrollment_id: enrollmentId,
    });
  }

  if (body.action === "apply_coupon") {
    const enrollmentId = String(body.enrollment_id || "").trim();
    const code = String(body.code || "").trim();

    if (!enrollmentId || !code) {
      return NextResponse.json(
        { error: "Inscription et code coupon requis." },
        { status: 400 },
      );
    }

    const check = await assertEnrollmentInCenter(enrollmentId, ctx!.centerId);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    const { data: enrollment, error: enrErr } = await supabaseAdmin
      .from("enrollments")
      .select("tuition_fee, discount_reason")
      .eq("id", enrollmentId)
      .maybeSingle();

    if (enrErr || !enrollment) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
    }

    const normalizedCode = code.toUpperCase();
    const couponTag = `Coupon ${normalizedCode}`;
    if (enrollment.discount_reason?.includes(couponTag)) {
      return NextResponse.json({ error: "Ce coupon a déjà été appliqué à ce dossier." }, { status: 400 });
    }

    const tuition = Math.round(Number(enrollment.tuition_fee) || 0);
    const { data: payRows } = await supabaseAdmin
      .from("student_payments")
      .select("amount")
      .eq("enrollment_id", enrollmentId);
    const paid = (payRows || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const maxDiscount = tuition - paid;

    if (maxDiscount <= 0) {
      return NextResponse.json({ error: "Dossier déjà soldé — coupon inapplicable." }, { status: 400 });
    }

    const couponResult = await fetchValidCoupon(supabaseAdmin, ctx!.centerId, code);
    if (!couponResult.ok) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }

    let discount = computeCouponDiscount(couponResult.coupon, tuition);
    if (discount > maxDiscount) discount = maxDiscount;
    if (discount <= 0) {
      return NextResponse.json({ error: "Coupon sans effet sur ce montant." }, { status: 400 });
    }

    const { data, error: rpcErr } = await supabaseAdmin.rpc("apply_enrollment_discount", {
      p_enrollment_id: enrollmentId,
      p_amount: discount,
      p_reason: couponTag,
      p_actor: actorId,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    await incrementCouponUse(supabaseAdmin, couponResult.coupon.id);

    const newTuition = Math.max(0, tuition - discount);
    return NextResponse.json({
      success: true,
      event_id: data,
      enrollment_id: enrollmentId,
      discount_amount: discount,
      tuition_fee: newTuition,
      reste_a_payer: Math.max(0, newTuition - paid),
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

/** Lecture enrichie pour un dossier (summary + échéances + events + paiements). */
export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const enrollmentId = new URL(req.url).searchParams.get("enrollment_id");
  if (!enrollmentId) {
    return NextResponse.json({ error: "enrollment_id requis." }, { status: 400 });
  }

  const check = await assertEnrollmentInCenter(enrollmentId, ctx!.centerId);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 403 });
  }

  const [
    { data: summary },
    { data: enrollment },
    { data: installments },
    { data: payments },
    { data: events },
  ] = await Promise.all([
    supabaseAdmin
      .from("student_finance_summary")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .maybeSingle(),
    supabaseAdmin
      .from("enrollments")
      .select("id, tuition_fee, catalog_tuition_fee, discount_amount, discount_reason, price_note, status")
      .eq("id", enrollmentId)
      .maybeSingle(),
    supabaseAdmin
      .from("enrollment_installments")
      .select(
        "id, label, amount, due_date, status, paid_amount, position, original_due_date, deferral_reason, deferred_at",
      )
      .eq("enrollment_id", enrollmentId)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("student_payments")
      .select("id, amount, payment_method, payment_date, receipt_number, notes, recorded_by")
      .eq("enrollment_id", enrollmentId)
      .order("payment_date", { ascending: false }),
    supabaseAdmin
      .from("enrollment_finance_events")
      .select("id, type, amount, payload, reason, created_by, created_at, installment_id")
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false }),
  ]);

  const recorderIds = [
    ...new Set([
      ...(payments || []).map((p) => p.recorded_by).filter(Boolean),
      ...(events || []).map((e) => e.created_by).filter(Boolean),
    ]),
  ] as string[];

  let nameById: Record<string, string> = {};
  if (recorderIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom")
      .in("id", recorderIds);
    nameById = Object.fromEntries(
      (profiles || []).map((p) => [p.id, `${p.prenom || ""} ${p.nom || ""}`.trim() || "—"]),
    );
  }

  const tuitionFee = Number(
    summary?.tuition_fee ?? enrollment?.tuition_fee ?? 0,
  );
  const tuitionPaid = Number(summary?.tuition_paid ?? 0);
  const discountAmount = Number(enrollment?.discount_amount ?? 0);

  return NextResponse.json({
    summary: summary
      ? {
          ...summary,
          discount_amount: discountAmount,
          discount_reason: enrollment?.discount_reason ?? null,
        }
      : {
          enrollment_id: enrollmentId,
          tuition_fee: tuitionFee,
          tuition_paid: tuitionPaid,
          reste_a_payer: Math.max(0, tuitionFee - tuitionPaid),
          financial_status: null,
          discount_amount: discountAmount,
          discount_reason: enrollment?.discount_reason ?? null,
        },
    enrollment,
    installments: installments || [],
    payments: (payments || []).map((p) => ({
      ...p,
      recorded_by_name: p.recorded_by ? nameById[p.recorded_by] || null : null,
    })),
    events: (events || []).map((e) => ({
      ...e,
      created_by_name: e.created_by ? nameById[e.created_by] || null : null,
    })),
  });
}
