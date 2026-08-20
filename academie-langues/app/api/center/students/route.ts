import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { getTcfCenterQuotas } from "@/app/data/packOffers";
import {
  getNexaB2bProfileQuotas,
  hasCustomStudentQuotaOverrides,
  normalizeNexaOffer,
} from "@/app/data/nexaOffers";
import { sendStudentActivatedEmail } from "@/app/utils/activation-emails";
import { assertCenterHasStudentSeat } from "@/app/utils/center-student-quota";
import { generateSecureTemporaryPassword } from "@/app/utils/secure-password";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(prenom: string): string {
  void prenom;
  return generateSecureTemporaryPassword();
}

async function getCenterForUser(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, centerId: null, role: null, permissions: [], response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };

  const { data: membership } = await supabaseAdmin
    .from("center_users")
    .select("center_id, role, permissions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.center_id) {
    return { user: null, centerId: null, role: null, permissions: [], response: NextResponse.json({ error: "Compte centre requis." }, { status: 403 }) };
  }

  return {
    user,
    centerId: membership.center_id as string,
    role: membership.role as string,
    permissions: (membership.permissions || []) as string[],
    response: null,
  };
}

function canUseStudentList(role: string | null, permissions: string[]) {
  return role !== "staff" || ["students", "missions", "messages", "push", "radar", "overview"].some((permission) => permissions.includes(permission));
}

function canCreateStudents(role: string | null, permissions: string[]) {
  return role !== "staff" || permissions.includes("students");
}

export async function GET(req: Request) {
  const { centerId, role, permissions, response } = await getCenterForUser(req);
  if (response) return response;
  if (!canUseStudentList(role, permissions)) {
    return NextResponse.json({ error: "Acces etudiants non autorise." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, phone, ville, current_activity, last_seen_at, last_sign_in_at, simulations_completed, created_at, tag_status")
    .eq("center_id", centerId)
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data || [] });
}

export async function POST(req: Request) {
  const { centerId, role, permissions, response } = await getCenterForUser(req);
  if (response) return response;
  if (!canCreateStudents(role, permissions)) {
    return NextResponse.json({ error: "Creation d'etudiant non autorisee." }, { status: 403 });
  }

  const { prenom, email, phone, ville, genre } = await req.json();
  if (!prenom?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Prenom et email sont requis." }, { status: 400 });
  }

  const seatCheck = await assertCenterHasStudentSeat(centerId!, supabaseAdmin);
  if (!seatCheck.ok) {
    return NextResponse.json(
      {
        error: `Quota utilisateurs atteint pour l'offre ${seatCheck.offerName} (${seatCheck.occupied}/${seatCheck.max}). Staff et étudiants partagent le même plafond ; expirés / révoqués / terminés libèrent une place.`,
        code: "SEAT_LIMIT_REACHED",
        occupied: seatCheck.occupied,
        max: seatCheck.max,
        offerName: seatCheck.offerName,
      },
      { status: 403 },
    );
  }

  const password = generatePassword(prenom);
  const normalizedEmail = email.trim().toLowerCase();

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { prenom: prenom.trim(), center_id: centerId },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || "Compte non cree." }, { status: 400 });
  }

  const userId = authData.user.id;
  const subscriptionEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const activatedAt = new Date().toISOString();
  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("nexa_offer, quota_overrides")
    .eq("id", centerId)
    .maybeSingle();
  const overrides =
    centerRow?.quota_overrides && typeof centerRow.quota_overrides === "object"
      ? (centerRow.quota_overrides as Record<string, unknown>)
      : null;
  const useCustom =
    normalizeNexaOffer(centerRow?.nexa_offer) === "custom" && hasCustomStudentQuotaOverrides(overrides);
  const quotas = useCustom ? getNexaB2bProfileQuotas(overrides) : getTcfCenterQuotas(3); // 90 jours ≈ 3 mois
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    prenom: prenom.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || null,
    ville: ville?.trim() || null,
    genre: genre || null,
    formation: "tcf",
    formations: ["tcf"],
    role: "student",
    center_id: centerId,
    created_by_center_id: centerId,
    activated_at: activatedAt,
    subscription_ends_at: subscriptionEndsAt,
    ...quotas,
    center_status: "active",
    tag_status: "normal",
    simulations_completed: 0,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    const { error: fallbackErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      prenom: prenom.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      ville: ville?.trim() || null,
      genre: genre || null,
      formation: "tcf",
      formations: ["tcf"],
      role: "student",
      center_id: centerId,
      created_by_center_id: centerId,
      activated_at: activatedAt,
      subscription_ends_at: subscriptionEndsAt,
      ...quotas,
      center_status: "active",
      tag_status: "actif",
      simulations_completed: 0,
      created_at: new Date().toISOString(),
    });
    if (fallbackErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Profil etudiant non cree." }, { status: 500 });
    }
  }

  return NextResponse.json({ email: normalizedEmail, password, userId, prenom: prenom.trim() }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { centerId, role, permissions, response } = await getCenterForUser(req);
  if (response) return response;
  if (!canCreateStudents(role, permissions)) {
    return NextResponse.json({ error: "Validation d'etudiant non autorisee." }, { status: 403 });
  }

  const { studentId, action, enrollmentId } = await req.json();
  if (!studentId || !["approve", "activate", "reject", "reset_password"].includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, center_id, role, tag_status, center_status, activated_at")
    .eq("id", studentId)
    .eq("center_id", centerId)
    .eq("role", "student")
    .maybeSingle();

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });
  if (!student) return NextResponse.json({ error: "Etudiant introuvable dans ce centre." }, { status: 404 });

  if (action === "reset_password") {
    const password = generatePassword(student.prenom || "Nexa");
    const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(studentId, { password });
    if (pwdError) return NextResponse.json({ error: pwdError.message }, { status: 500 });
    return NextResponse.json({ ok: true, studentId, email: student.email, password, prenom: student.prenom });
  }

  if (action === "reject") {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tag_status: "revoque",
        center_status: "revoked",
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentId)
      .eq("center_id", centerId)
      .eq("role", "student");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from("notifications").insert({
      user_id: studentId,
      message:
        "Votre demande de compte centre a ete refusee. Contactez votre centre pour plus d'informations.",
    });

    return NextResponse.json({ ok: true, studentId, tag_status: "revoque", center_status: "revoked" });
  }

  // approve | activate
  const now = new Date().toISOString();
  const profilePatch: Record<string, unknown> = {
    center_status: "active",
    tag_status: "normal",
    updated_at: now,
  };
  if (!student.activated_at) profilePatch.activated_at = now;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(profilePatch)
    .eq("id", studentId)
    .eq("center_id", centerId)
    .eq("role", "student");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (enrollmentId) {
    const { error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .update({ status: "active" })
      .eq("id", enrollmentId)
      .eq("student_id", studentId);
    if (enrollmentError) {
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 });
    }
  }

  const { data: center } = await supabaseAdmin.from("centers").select("name").eq("id", centerId).maybeSingle();
  const emailResult = await sendStudentActivatedEmail({
    to: student.email,
    studentName: student.prenom || "Apprenant",
    centerName: center?.name ?? null,
  });

  return NextResponse.json({
    ok: true,
    studentId,
    tag_status: "normal",
    center_status: "active",
    emailSent: Boolean(emailResult.sent),
  });
}
