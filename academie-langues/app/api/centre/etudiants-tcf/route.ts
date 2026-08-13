import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { computeTutorUnlockAt } from "@/app/utils/tutor-unlock";
import {
  assignPendingClassroom,
  countGroupesForFiliere,
  finalizeStudentClassroom,
  resolveActivationGroupeId,
  resolveSignupGroupeId,
} from "@/app/utils/studentClassroom.server";
import {
  computeCouponDiscount,
  fetchValidCoupon,
  incrementCouponUse,
} from "@/app/utils/coupon.server";
import {
  addDays,
  catalogTotalFromMonthly,
  durationLabel,
  durationToDays,
  monthEquivalent,
  type TcfDurationUnit,
} from "@/app/utils/tcf-access";
import { getTcfCenterQuotas } from "@/app/data/packOffers";
import {
  getNexaB2bProfileQuotas,
  hasCustomStudentQuotaOverrides,
  normalizeNexaOffer,
} from "@/app/data/nexaOffers";
import { assertCenterHasStudentSeat } from "@/app/utils/center-student-quota";
import { sumNamedExtraFees } from "@/app/utils/short-pricing";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function resolveCampusForFiliere(centerId: string, filiereId: string): Promise<string | null> {
  const { data: linkedCampuses } = await supabaseAdmin
    .from("filiere_campus")
    .select("campus_id")
    .eq("filiere_id", filiereId);

  if (linkedCampuses?.length === 1) {
    return linkedCampuses[0].campus_id;
  }

  const { data: mainCampus } = await supabaseAdmin
    .from("campuses")
    .select("id")
    .eq("center_id", centerId)
    .eq("is_main", true)
    .maybeSingle();
  if (mainCampus?.id) return mainCampus.id;

  const { data: anyCampus } = await supabaseAdmin
    .from("campuses")
    .select("id")
    .eq("center_id", centerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return anyCampus?.id ?? null;
}

export type TcfInstallmentInput = {
  label?: string;
  amount: number;
  due_date: string;
};

function normalizeTcfInstallments(
  finalTotal: number,
  durLabel: string,
  installments?: TcfInstallmentInput[] | null,
): { ok: true; rows: TcfInstallmentInput[] } | { ok: false; error: string } {
  const today = new Date().toISOString().slice(0, 10);

  if (!installments || installments.length === 0) {
    return {
      ok: true,
      rows: [{
        label: `Solde TCF · ${durLabel}`,
        amount: finalTotal,
        due_date: today,
      }],
    };
  }

  const rows: TcfInstallmentInput[] = [];
  for (let i = 0; i < installments.length; i++) {
    const raw = installments[i];
    const amount = Math.round(Number(raw?.amount) || 0);
    const due_date = String(raw?.due_date || "").slice(0, 10);
    if (amount <= 0) {
      return { ok: false, error: `Échéance ${i + 1} : montant invalide.` };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return { ok: false, error: `Échéance ${i + 1} : date invalide.` };
    }
    const label = String(raw?.label || "").trim()
      || (installments.length === 1
        ? `Solde TCF · ${durLabel}`
        : i === 0
          ? `Acompte TCF · ${durLabel}`
          : `Échéance ${i + 1} · ${durLabel}`);
    rows.push({ label, amount, due_date });
  }

  const sum = rows.reduce((s, r) => s + r.amount, 0);
  if (Math.abs(sum - finalTotal) > 0) {
    return {
      ok: false,
      error: `La somme des échéances (${sum} F) doit égaler le total convenu (${finalTotal} F).`,
    };
  }

  return { ok: true, rows };
}

/** Échéances TCF (montant convenu à l'activation — plan par inscription, pas filière). */
async function ensureTcfEnrollmentInstallments(
  enrollmentId: string,
  finalTotal: number,
  durLabel: string,
  installments?: TcfInstallmentInput[] | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (finalTotal <= 0) return { ok: true };

  const normalized = normalizeTcfInstallments(finalTotal, durLabel, installments);
  if (!normalized.ok) return normalized;

  const { count: payCount } = await supabaseAdmin
    .from("student_payments")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId);

  const { data: existing } = await supabaseAdmin
    .from("enrollment_installments")
    .select("id, amount, paid_amount, status")
    .eq("enrollment_id", enrollmentId)
    .order("position", { ascending: true });

  // Paiements déjà enregistrés : ne pas écraser le plan existant
  if (payCount && payCount > 0) {
    if (!existing?.length) {
      const { error } = await supabaseAdmin.from("enrollment_installments").insert(
        normalized.rows.map((r, idx) => ({
          enrollment_id: enrollmentId,
          label: r.label,
          amount: r.amount,
          due_date: r.due_date,
          status: "pending",
          paid_amount: 0,
          position: idx + 1,
        })),
      );
      if (error) {
        console.warn("[etudiants-tcf] enrollment_installments insert:", error.message);
        return { ok: false, error: "Impossible de créer les échéances de paiement." };
      }
    }
    return { ok: true };
  }

  if (existing?.length) {
    await supabaseAdmin
      .from("enrollment_installments")
      .delete()
      .eq("enrollment_id", enrollmentId);
  }

  const { error } = await supabaseAdmin.from("enrollment_installments").insert(
    normalized.rows.map((r, idx) => ({
      enrollment_id: enrollmentId,
      label: r.label,
      amount: r.amount,
      due_date: r.due_date,
      status: "pending",
      paid_amount: 0,
      position: idx + 1,
    })),
  );

  if (error) {
    console.warn("[etudiants-tcf] enrollment_installments insert:", error.message);
    return { ok: false, error: "Impossible de créer les échéances de paiement." };
  }

  return { ok: true };
}

async function resolveFormationCourteNiveauId(filiereId: string): Promise<string | null> {
  const { data: existingNiveau } = await supabaseAdmin
    .from("niveaux")
    .select("id")
    .eq("filiere_id", filiereId)
    .is("annee", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingNiveau?.id) return existingNiveau.id;

  const { data: newNiveau, error: nivErr } = await supabaseAdmin
    .from("niveaux")
    .insert({
      filiere_id: filiereId,
      annee: null,
      mois: 0,
      semaines: 0,
      jours: 0,
    })
    .select("id")
    .single();

  if (nivErr || !newNiveau?.id) return null;
  return newNiveau.id;
}

async function assertCenterAccess(userId: string, centerId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", userId)
    .single();

  if (profile?.center_id !== centerId) {
    return { ok: false as const, status: 403, error: "Accès refusé." };
  }
  return { ok: true as const };
}

function isMissingRelation(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

async function safeDeleteEq(table: string, column: string, value: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
  if (error && !isMissingRelation(error)) {
    console.warn(`[etudiants-tcf] cleanup ${table}.${column}:`, error.message);
  }
}

async function safeDeleteIn(table: string, column: string, values: string[]) {
  if (values.length === 0) return;
  const { error } = await supabaseAdmin.from(table).delete().in(column, values);
  if (error && !isMissingRelation(error)) {
    console.warn(`[etudiants-tcf] cleanup ${table}.${column}:`, error.message);
  }
}

async function rememberRevokedStudent(params: {
  studentId: string;
  centerId: string;
  revokedBy: string;
  email?: string | null;
  prenom?: string | null;
  nom?: string | null;
  reason?: string | null;
}) {
  const normalizedEmail = String(params.email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const { error } = await supabaseAdmin.from("center_revoked_students").insert({
    center_id: params.centerId,
    student_id: params.studentId,
    email: params.email,
    email_lc: normalizedEmail,
    prenom: params.prenom || null,
    nom: params.nom || null,
    revoked_by: params.revokedBy,
    reason: params.reason?.trim() || null,
  });

  if (error && isMissingRelation(error)) {
    const { error: fallbackErr } = await supabaseAdmin.from("center_revoked_students").insert({
      center_id: params.centerId,
      student_id: params.studentId,
      email: params.email,
      email_lc: normalizedEmail,
      prenom: params.prenom || null,
      nom: params.nom || null,
      revoked_by: params.revokedBy,
    });
    if (fallbackErr && !isMissingRelation(fallbackErr)) {
      console.warn("[etudiants-tcf] revoke memory:", fallbackErr.message);
    }
    return;
  }

  if (error && !isMissingRelation(error)) {
    console.warn("[etudiants-tcf] revoke memory:", error.message);
  }
}

async function permanentlyRemoveTcfStudent(params: {
  studentId: string;
  centerId: string;
  revokedBy: string;
  reason?: string | null;
}) {
  const { studentId, centerId, revokedBy, reason } = params;

  const { data: student, error: readErr } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, role, email, prenom, nom")
    .eq("id", studentId)
    .maybeSingle();

  if (readErr) {
    return { ok: false as const, status: 500, error: readErr.message };
  }
  if (!student || student.role !== "student" || student.center_id !== centerId) {
    return { ok: false as const, status: 404, error: "Étudiant introuvable pour ce centre." };
  }

  await rememberRevokedStudent({
    studentId,
    centerId,
    revokedBy,
    email: student.email,
    prenom: student.prenom,
    nom: student.nom,
    reason,
  });

  const { data: enrollmentRows } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId);
  const enrollmentIds = (enrollmentRows || [])
    .map((row: { id?: string | null }) => row.id)
    .filter(Boolean) as string[];

  // Accès centre / classes / communauté
  await safeDeleteEq("community_room_members", "user_id", studentId);
  await safeDeleteEq("mission_students", "user_id", studentId);
  await safeDeleteEq("tcf_exam_session_students", "user_id", studentId);
  await safeDeleteEq("tcf_exam_assignments", "user_id", studentId);
  await safeDeleteEq("tcf_exam_unlocks", "user_id", studentId);

  // Traces étudiantes et droits liés au compte
  await safeDeleteEq("student_todos", "user_id", studentId);
  await safeDeleteEq("notifications", "user_id", studentId);
  await safeDeleteEq("push_subscriptions", "user_id", studentId);
  await safeDeleteEq("user_sessions", "user_id", studentId);
  await safeDeleteEq("user_progress", "user_id", studentId);
  await safeDeleteEq("daily_tracker", "user_id", studentId);
  await safeDeleteEq("student_course_highlights", "user_id", studentId);
  await safeDeleteEq("student_highlight_themes", "user_id", studentId);
  await safeDeleteEq("ce_results", "user_id", studentId);
  await safeDeleteEq("co_results", "user_id", studentId);
  await safeDeleteEq("exam_sessions", "user_id", studentId);
  await safeDeleteEq("mission_submissions", "user_id", studentId);
  await safeDeleteEq("coaching_sessions", "user_id", studentId);
  await safeDeleteEq("client_activity_logs", "user_id", studentId);
  await safeDeleteEq("simulator_logs", "user_id", studentId);
  await safeDeleteEq("feedback", "user_id", studentId);
  await safeDeleteEq("user_feedbacks", "user_id", studentId);

  // Conversations : suppression complète pour éviter les références orphelines.
  await safeDeleteEq("community_messages", "user_id", studentId);
  await safeDeleteEq("private_messages", "from_user_id", studentId);
  await safeDeleteEq("private_messages", "to_user_id", studentId);
  await safeDeleteEq("support_messages", "from_user_id", studentId);
  await safeDeleteEq("support_messages", "to_user_id", studentId);
  await safeDeleteEq("guest_support_messages", "sender_user_id", studentId);

  // Finance / inscriptions liées à ce profil.
  await safeDeleteIn("student_payments", "enrollment_id", enrollmentIds);
  await safeDeleteIn("enrollment_installments", "enrollment_id", enrollmentIds);
  await safeDeleteIn("enrollments", "id", enrollmentIds);

  const { error: profileDeleteErr } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", studentId)
    .eq("center_id", centerId)
    .eq("role", "student");

  if (profileDeleteErr) {
    return {
      ok: false as const,
      status: 500,
      error: `Impossible de supprimer le profil étudiant : ${profileDeleteErr.message}`,
    };
  }

  const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(studentId);
  if (authDeleteErr && !authDeleteErr.message.toLowerCase().includes("not found")) {
    return {
      ok: false as const,
      status: 500,
      error: `Profil supprimé, mais suppression Auth incomplète : ${authDeleteErr.message}`,
    };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const {
    centerId,
    prenom,
    nom,
    email,
    phone,
    country,
    country_code,
    region,
    city,
    birth_date,
  } = await req.json();

  if (!centerId || !prenom?.trim() || !nom?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Prénom, nom et email requis." }, { status: 400 });
  }
  if (!country?.trim() || !region?.trim() || !city?.trim()) {
    return NextResponse.json({ error: "Pays, région et ville requis." }, { status: 400 });
  }

  const access = await assertCenterAccess(user.id, centerId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const seatCheck = await assertCenterHasStudentSeat(centerId, supabaseAdmin);
  if (!seatCheck.ok) {
    return NextResponse.json(
      {
        error: `Quota utilisateurs atteint pour l'offre ${seatCheck.offerName} (${seatCheck.occupied}/${seatCheck.max}). Staff et étudiants partagent le même plafond ; expirés / révoqués / terminés libèrent une place.`,
      },
      { status: 403 },
    );
  }

  const password = generatePassword();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });

  if (authErr || !authData.user) {
    const msg = authErr?.message || "Erreur création compte.";
    if (msg.includes("already")) return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const studentId = authData.user.id;
  const trimmedCity = city.trim();

  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
    id: studentId,
    prenom: prenom.trim(),
    nom: nom.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    country: country.trim(),
    country_code: country_code?.trim() || null,
    region: region.trim(),
    city: trimmedCity,
    ville: trimmedCity,
    birth_date: birth_date?.trim() || null,
    role: "student",
    center_id: centerId,
    center_status: "pending_center_approval",
    tag_status: "pending_center_approval",
  }, { onConflict: "id" });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(studentId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const { data: filiere } = await supabaseAdmin
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", "TCF Canada")
    .maybeSingle();

  if (filiere?.id) {
    await assignPendingClassroom(supabaseAdmin, {
      studentId,
      centerId,
      filiereId: filiere.id,
    });
  }

  return NextResponse.json({ email: normalizedEmail, password, studentId });
}

async function activateTcfStudent(params: {
  managerId: string;
  studentId: string;
  centerId: string;
  durationValue: number;
  durationUnit: TcfDurationUnit;
  couponCode?: string | null;
  agreedPrice?: number | string | null;
  groupeId?: string | null;
  installments?: TcfInstallmentInput[] | null;
}) {
  const {
    managerId,
    studentId,
    centerId,
    durationValue,
    durationUnit,
    couponCode,
    agreedPrice,
    groupeId,
    installments,
  } = params;

  const dVal = Math.max(1, Math.floor(durationValue));
  const days = durationToDays(dVal, durationUnit);

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, role, pending_groupe_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!student || student.role !== "student" || student.center_id !== centerId) {
    return { ok: false as const, status: 404, error: "Étudiant introuvable pour ce centre." };
  }

  const { data: filiere } = await supabaseAdmin
    .from("filieres")
    .select("id, default_tuition_fee, status, extra_fees")
    .eq("center_id", centerId)
    .eq("name", "TCF Canada")
    .maybeSingle();

  if (!filiere) {
    return { ok: false as const, status: 400, error: "Programme TCF introuvable. Ouvrez Programme TCF pour le configurer." };
  }
  if (filiere.status !== "published") {
    return { ok: false as const, status: 400, error: "Le programme TCF doit être publié avant d'activer un étudiant." };
  }

  const monthlyPrice = Number(filiere.default_tuition_fee) || 0;
  const extras = sumNamedExtraFees(filiere.extra_fees);
  const catalogTotal = catalogTotalFromMonthly(monthlyPrice, days) + extras;

  const parsedAgreed =
    agreedPrice != null && agreedPrice !== ""
      ? Number(agreedPrice)
      : null;

  if (monthlyPrice <= 0 && (parsedAgreed == null || Number.isNaN(parsedAgreed))) {
    return {
      ok: false as const,
      status: 400,
      error: "Prix mensuel introuvable. Ouvrez Programme TCF, enregistrez le prix mensuel, ou saisissez un prix négocié.",
    };
  }

  let baseTotal =
    parsedAgreed != null && !Number.isNaN(parsedAgreed) && parsedAgreed >= 0
      ? parsedAgreed
      : catalogTotal;

  let discount = 0;
  let couponId: string | null = null;
  let appliedCouponCode: string | null = null;

  if (couponCode?.trim()) {
    const couponResult = await fetchValidCoupon(supabaseAdmin, centerId, couponCode);
    if (!couponResult.ok) {
      return { ok: false as const, status: 400, error: couponResult.error };
    }
    discount = computeCouponDiscount(couponResult.coupon, baseTotal);
    couponId = couponResult.coupon.id;
    appliedCouponCode = couponCode.trim().toUpperCase();
  }

  const finalTotal = Math.max(0, baseTotal - discount);
  const endsAt = addDays(new Date(), days);
  const activatedAt = new Date();
  const months = monthEquivalent(dVal, durationUnit);
  const { data: centerOffer } = await supabaseAdmin
    .from("centers")
    .select("nexa_offer, quota_overrides")
    .eq("id", centerId)
    .maybeSingle();
  const overrides =
    centerOffer?.quota_overrides && typeof centerOffer.quota_overrides === "object"
      ? (centerOffer.quota_overrides as Record<string, unknown>)
      : null;
  const useCustom =
    normalizeNexaOffer(centerOffer?.nexa_offer) === "custom" && hasCustomStudentQuotaOverrides(overrides);
  // Sur devis : montants saisis = pack absolu. Pack Ébène standard : scale durée.
  const quotas = useCustom ? getNexaB2bProfileQuotas(overrides) : getTcfCenterQuotas(months);

  const campusId = await resolveCampusForFiliere(centerId, filiere.id);
  if (!campusId) {
    return {
      ok: false as const,
      status: 400,
      error: "Aucun campus configuré pour ce centre. Ajoutez un campus principal avant d'activer.",
    };
  }

  const niveauId = await resolveFormationCourteNiveauId(filiere.id);
  if (!niveauId) {
    return {
      ok: false as const,
      status: 500,
      error: "Impossible de préparer le niveau TCF pour l'inscription.",
    };
  }

  const resolvedGroupe = await resolveActivationGroupeId(supabaseAdmin, {
    filiereId: filiere.id,
    explicitGroupeId: groupeId,
    pendingGroupeId: student.pending_groupe_id,
  });

  if (resolvedGroupe.requiresChoice || !resolvedGroupe.groupeId) {
    const groupeCount = await countGroupesForFiliere(supabaseAdmin, filiere.id);
    return {
      ok: false as const,
      status: 400,
      error:
        groupeCount === 0
          ? "Créez au moins une salle de classe dans Programme TCF avant d'activer un étudiant."
          : "Choisissez une salle de classe avant d'activer l'étudiant.",
    };
  }

  const resolvedGroupeId = resolvedGroupe.groupeId;

  // Réutilise une inscription existante (ex: reprise après pause) pour éviter un 2e enroll cassé.
  const { data: existingEnrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("filiere_id", filiere.id)
    .in("status", ["active", "draft"])
    .order("enrolled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let enrollmentId: string | null = existingEnrollment?.id ?? null;

  if (!enrollmentId) {
    const { data: createdId, error: enrollErr } = await supabaseAdmin.rpc("enroll_student", {
      p_student_id: studentId,
      p_filiere_id: filiere.id,
      p_niveau_id: niveauId,
      p_groupe_id: resolvedGroupeId,
      p_tuition_fee: finalTotal,
      p_creator: managerId,
      p_campus_id: campusId,
    });

    if (enrollErr || !createdId) {
      return { ok: false as const, status: 500, error: enrollErr?.message || "Échec de l'inscription." };
    }
    enrollmentId = createdId as string;
  }

  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      center_status: "active",
      tag_status: "normal",
      formation: "tcf",
      activated_at: activatedAt.toISOString(),
      subscription_ends_at: endsAt.toISOString(),
      ...quotas,
      tutor_unlock_at: computeTutorUnlockAt(new Date()),
    })
    .eq("id", studentId);

  if (profileErr) {
    // Fallback si la contrainte tag_status refuse "normal" — ne jamais laisser "revoque"
    const { error: profileFallbackErr } = await supabaseAdmin
      .from("profiles")
      .update({
        center_status: "active",
        tag_status: "actif",
        formation: "tcf",
        activated_at: activatedAt.toISOString(),
        subscription_ends_at: endsAt.toISOString(),
        ...quotas,
        tutor_unlock_at: computeTutorUnlockAt(new Date()),
      })
      .eq("id", studentId);

    if (profileFallbackErr) {
      return { ok: false as const, status: 500, error: profileFallbackErr.message || profileErr.message };
    }
  }

  const priceNote =
    parsedAgreed != null && !Number.isNaN(parsedAgreed) && parsedAgreed !== catalogTotal
      ? `Prix négocié (${Math.round(parsedAgreed).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")} F) · catalogue ${Math.round(catalogTotal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")} F`
      : null;

  const enrollmentPatch: Record<string, unknown> = {
    status: "active",
    tuition_fee: finalTotal,
    duration_value: dVal,
    duration_unit: durationUnit,
    catalog_tuition_fee: catalogTotal,
    price_note: priceNote,
    groupe_id: resolvedGroupeId,
  };
  if (durationUnit === "month") {
    enrollmentPatch.duration_months = dVal;
  }
  if (discount > 0 && appliedCouponCode) {
    enrollmentPatch.discount_amount = discount;
    enrollmentPatch.discount_reason = `Coupon ${appliedCouponCode}`;
  }

  const { error: enrollUpdateErr } = await supabaseAdmin
    .from("enrollments")
    .update(enrollmentPatch)
    .eq("id", enrollmentId);

  if (enrollUpdateErr) {
    console.error("[etudiants-tcf] enrollment metadata update:", enrollUpdateErr.message);
    // Retry sans colonnes optionnelles éventuellement absentes
    const { error: enrollRetryErr } = await supabaseAdmin
      .from("enrollments")
      .update({
        status: "active",
        tuition_fee: finalTotal,
        groupe_id: resolvedGroupeId,
      })
      .eq("id", enrollmentId);

    if (enrollRetryErr) {
      return {
        ok: false as const,
        status: 500,
        error: `Inscription créée mais la mise à jour a échoué : ${enrollRetryErr.message}`,
      };
    }
  }

  const classroomResult = await finalizeStudentClassroom(supabaseAdmin, {
    studentId,
    centerId,
    groupeId: resolvedGroupeId,
  });
  if (!classroomResult.ok) {
    console.warn("[etudiants-tcf] classroom sync:", classroomResult.error);
  }

  const instResult = await ensureTcfEnrollmentInstallments(
    enrollmentId,
    finalTotal,
    durationLabel(dVal, durationUnit),
    installments,
  );
  if (!instResult.ok) {
    return { ok: false as const, status: 400, error: instResult.error };
  }

  if (couponId) {
    await incrementCouponUse(supabaseAdmin, couponId);
  }

  return {
    ok: true as const,
    enrollmentId,
    finalTotal,
    catalogTotal,
    endsAt: endsAt.toISOString(),
    durationLabel: durationLabel(dVal, durationUnit),
  };
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json();
  const { action, studentId, centerId } = body;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!action || !studentId || !centerId) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const access = await assertCenterAccess(user.id, centerId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (action === "activate") {
    const unit = (body.durationUnit || "month") as TcfDurationUnit;
    if (!["day", "week", "month"].includes(unit)) {
      return NextResponse.json({ error: "Unité de durée invalide." }, { status: 400 });
    }

    const result = await activateTcfStudent({
      managerId: user.id,
      studentId,
      centerId,
      durationValue: Number(body.durationValue) || 1,
      durationUnit: unit,
      couponCode: body.couponCode,
      agreedPrice: body.agreedPrice,
      groupeId: body.groupeId,
      installments: Array.isArray(body.installments) ? body.installments : null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      enrollmentId: result.enrollmentId,
      finalTotal: result.finalTotal,
      catalogTotal: result.catalogTotal,
      endsAt: result.endsAt,
      durationLabel: result.durationLabel,
    });
  }

  if (action === "pause") {
    if (!reason) {
      return NextResponse.json({ error: "Indiquez un motif de pause." }, { status: 400 });
    }

    const { data: student, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("subscription_ends_at")
      .eq("id", studentId)
      .single();

    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }

    const now = new Date();
    const endsAt = student?.subscription_ends_at ? new Date(student.subscription_ends_at) : now;
    const daysRemaining = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86400000));

    const pausePayload = {
      center_status: "paused" as const,
      subscription_ends_at: new Date(Date.UTC(2000, 0, 1 + daysRemaining)).toISOString(),
      access_pause_reason: reason,
    };
    let { error: pauseErr } = await supabaseAdmin.from("profiles").update(pausePayload).eq("id", studentId);

    // Colonnes motif pas encore migrées → pause sans access_pause_reason
    if (pauseErr && isMissingRelation(pauseErr)) {
      const { access_pause_reason: _ignored, ...withoutReason } = pausePayload;
      ({ error: pauseErr } = await supabaseAdmin.from("profiles").update(withoutReason).eq("id", studentId));
    }

    if (pauseErr) {
      return NextResponse.json({ error: pauseErr.message }, { status: 500 });
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: studentId,
      message: `⏸ Votre formation a été mise en pause. Motif : ${reason}`,
    });
  } else if (action === "resume") {
    const { data: student, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("subscription_ends_at, center_status")
      .eq("id", studentId)
      .single();

    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }

    const pauseDate = student?.subscription_ends_at ? new Date(student.subscription_ends_at) : null;
    const baseDate = new Date(Date.UTC(2000, 0, 1));
    const daysRemaining = pauseDate
      ? Math.max(1, Math.round((pauseDate.getTime() - baseDate.getTime()) / 86400000))
      : 30;

    const newEndsAt = new Date(Date.now() + daysRemaining * 86400000);
    const endsAtIso = newEndsAt.toISOString();

    async function applyResume(payload: Record<string, unknown>) {
      return supabaseAdmin.from("profiles").update(payload).eq("id", studentId);
    }

    let resumeErr =
      (await applyResume({
        center_status: "active",
        tag_status: "normal",
        subscription_ends_at: endsAtIso,
        access_pause_reason: null,
      })).error;

    if (resumeErr && isMissingRelation(resumeErr)) {
      resumeErr =
        (await applyResume({
          center_status: "active",
          tag_status: "normal",
          subscription_ends_at: endsAtIso,
        })).error;
    }

    if (resumeErr) {
      // Fallback si la contrainte tag_status refuse "normal" — forcer actif, pas laisser revoque
      resumeErr =
        (await applyResume({
          center_status: "active",
          tag_status: "actif",
          subscription_ends_at: endsAtIso,
          access_pause_reason: null,
        })).error;

      if (resumeErr && isMissingRelation(resumeErr)) {
        resumeErr =
          (await applyResume({
            center_status: "active",
            tag_status: "actif",
            subscription_ends_at: endsAtIso,
          })).error;
      }
    }

    if (resumeErr) {
      return NextResponse.json({ error: resumeErr.message }, { status: 500 });
    }
  } else if (action === "revoke") {
    if (!reason) {
      return NextResponse.json({ error: "Indiquez un motif de suppression." }, { status: 400 });
    }
    const result = await permanentlyRemoveTcfStudent({ studentId, centerId, revokedBy: user.id, reason });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
