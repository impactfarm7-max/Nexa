import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { generateSecureTemporaryPassword } from "@/app/utils/secure-password";

const ACTIONS = new Set(["reset_password", "pause", "resume", "revoke", "reactivate"]);
const USER_ROLES = ["student", "center_manager", "campus_manager", "trainer", "staff"];

function generatePassword(prenom: string): string {
  void prenom;
  return generateSecureTemporaryPassword();
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, prenom, email, center_id, role, tag_status, center_status, pack_name, subscription_ends_at, subscription_paused_at",
    )
    .eq("id", id)
    .in("role", USER_ROLES)
    .maybeSingle();

  if (studentError) return NextResponse.json({ error: studentError.message }, { status: 500 });
  if (!student) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

  const now = new Date();
  const nowIso = now.toISOString();

  if (action === "reset_password") {
    const password = generatePassword(student.prenom || "Nexa");
    const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
    if (pwdError) return NextResponse.json({ error: pwdError.message }, { status: 500 });

    await logSuperadminAction(ctx.user.id, "student_password_reset", {
      targetType: "student",
      targetId: id,
      metadata: { email: student.email, centerId: student.center_id },
      req,
    });

    return NextResponse.json({ ok: true, email: student.email, password, prenom: student.prenom });
  }

  if (action === "pause") {
    const endDate = student.subscription_ends_at ? new Date(student.subscription_ends_at) : null;
    const pauseReferenceMs = student.subscription_paused_at
      ? new Date(student.subscription_paused_at).getTime()
      : now.getTime();
    if (student.center_id) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_paused_at: student.subscription_paused_at ?? nowIso,
          center_status: "paused",
          updated_at: nowIso,
        })
        .eq("id", id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    } else {
      if (!student.pack_name || student.pack_name === "aucun" || !endDate || endDate.getTime() <= pauseReferenceMs) {
        return NextResponse.json({ error: "Cet étudiant n'a pas de pack actif à mettre en pause." }, { status: 400 });
      }
      if (!student.subscription_paused_at) {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_paused_at: nowIso, updated_at: nowIso })
          .eq("id", id)
          .is("subscription_paused_at", null);
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      message: "Votre accès a été mis en pause. Contactez votre centre ou Nexa pour le rétablir.",
    });
    await logSuperadminAction(ctx.user.id, "student_paused", {
      targetType: "student",
      targetId: id,
      metadata: { email: student.email, centerId: student.center_id },
      req,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "resume") {
    const patch: Record<string, unknown> = {
      subscription_paused_at: null,
      center_status: "active",
      updated_at: nowIso,
    };
    if (student.subscription_paused_at && student.subscription_ends_at) {
      const pausedAtMs = new Date(student.subscription_paused_at).getTime();
      const endDate = new Date(student.subscription_ends_at);
      if (Number.isFinite(pausedAtMs)) {
        patch.subscription_ends_at = new Date(endDate.getTime() + Math.max(0, now.getTime() - pausedAtMs)).toISOString();
      }
    }
    const { error: updateError } = await supabaseAdmin.from("profiles").update(patch).eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      message: "Votre accès a été rétabli.",
    });
    await logSuperadminAction(ctx.user.id, "student_resumed", {
      targetType: "student",
      targetId: id,
      metadata: { email: student.email, centerId: student.center_id },
      req,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ tag_status: "revoque", center_status: "revoked", updated_at: nowIso })
      .eq("id", id);
    if (updateError) {
      const fallback = await supabaseAdmin
        .from("profiles")
        .update({ tag_status: "revoque", updated_at: nowIso })
        .eq("id", id);
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      message: "Votre accès a été révoqué. Contactez votre centre ou Nexa.",
    });
    await logSuperadminAction(ctx.user.id, "student_revoked", {
      targetType: "student",
      targetId: id,
      metadata: { email: student.email, centerId: student.center_id },
      req,
    });
    return NextResponse.json({ ok: true });
  }

  const { error: reactivateError } = await supabaseAdmin
    .from("profiles")
    .update({
      tag_status: "actif",
      center_status: "active",
      subscription_paused_at: null,
      updated_at: nowIso,
    })
    .eq("id", id);
  if (reactivateError) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .update({
        tag_status: "normal",
        center_status: "active",
        subscription_paused_at: null,
        updated_at: nowIso,
      })
      .eq("id", id);
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
  }
  await supabaseAdmin.from("notifications").insert({
    user_id: id,
    message: "Votre accès a été réactivé. Vous pouvez vous reconnecter.",
  });
  await logSuperadminAction(ctx.user.id, "student_reactivated", {
    targetType: "student",
    targetId: id,
    metadata: { email: student.email, centerId: student.center_id },
    req,
  });
  return NextResponse.json({ ok: true });
}
