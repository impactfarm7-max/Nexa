import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/assign-pack — attribuer un pack à un étudiant (admin uniquement)
async function ensureGlobalStudent(studentId: string) {
  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id")
    .eq("id", studentId)
    .maybeSingle();
  return Boolean(student && !student.center_id);
}

export async function POST(req: Request) {
  // 1. Vérification que l'appelant est bien connecté
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  // 2. Vérification du rôle admin côté DB (pas trust du client)
  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  // 3. Lecture du payload
  const body = await req.json();
  const { studentId, packKey, config } = body as {
    studentId: string;
    packKey: string;
    config: {
      days: number;
      ee: number;
      exam_ee: number;
      exam_4m: number;
      eo: number;
      coaching: number;
      name: string;
    };
  };

  if (!studentId || !packKey || !config) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  if (!(await ensureGlobalStudent(studentId))) {
    return NextResponse.json({ error: "Compte centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  const newEndDate = new Date(Date.now() + config.days * 24 * 60 * 60 * 1000).toISOString();

  if (!(await ensureGlobalStudent(studentId))) {
    return NextResponse.json({ error: "Compte centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  const now = new Date().toISOString();

  // 4. Mise à jour via service role — sans tag_status pour éviter tout conflit de contrainte
  if (!(await ensureGlobalStudent(studentId))) {
    return NextResponse.json({ error: "Compte centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      pack_name: packKey,
      subscription_ends_at: newEndDate,
      subscription_paused_at: null,
      activated_at: now,
      ee_total: config.ee,
      ee_used: 0,
      exam_total: config.exam_ee,
      exam_used: 0,
      exam_4m_total: config.exam_4m,
      exam_4m_used: 0,
      eo_total: config.eo,
      eo_used: 0,
      coaching_total: config.coaching,
      coaching_used: 0,
      tutor_ia_total: TUTOR_EXCHANGE_QUOTA,
      tutor_ia_used: 0,
      updated_at: now,
    })
    .eq("id", studentId);

  if (error) {
    // Tentative minimale — retourne l'erreur principale dans la réponse pour diagnostic
    const { error: fallbackError } = await supabaseAdmin
      .from("profiles")
      .update({ pack_name: packKey, subscription_ends_at: newEndDate, subscription_paused_at: null, tag_status: "normal", updated_at: now })
      .eq("id", studentId);

    if (fallbackError) {
      console.error("Erreur assign-pack fallback:", fallbackError);
      return NextResponse.json({
        error: fallbackError.message,
        mainError: error.message,
        hint: "Colonnes manquantes dans profiles — exécute le SQL de migration.",
      }, { status: 500 });
    }
    // fallback OK — retourne mainError en warning pour que le client puisse logger
    return NextResponse.json({ ok: true, subscription_ends_at: newEndDate, warning: error.message });
  }

  // 5. Réinitialiser tag_status séparément
  const { error: tagError } = await supabaseAdmin
    .from("profiles")
    .update({ tag_status: "normal", updated_at: now })
    .eq("id", studentId);
  if (tagError) console.warn("tag_status reset échoué:", tagError.message);

  // 6. Notification à l'étudiant
  await supabaseAdmin.from("notifications").insert([
    {
      user_id: studentId,
      message: `🎉 Félicitations ! Votre ${config.name} a été activé avec succès. Bon entraînement !`,
    },
  ]);

  return NextResponse.json({ ok: true, subscription_ends_at: newEndDate });
}

// DELETE /api/admin/assign-pack — annuler l'abonnement d'un étudiant (admin uniquement)
export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId requis." }, { status: 400 });

  const now = new Date().toISOString();

  if (!(await ensureGlobalStudent(studentId))) {
    return NextResponse.json({ error: "Compte centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  // Step 1: revoke pack quotas (no constraint on these fields)
  const { error: packError } = await supabaseAdmin
    .from("profiles")
    .update({
      pack_name: "aucun",
      subscription_ends_at: null,
      subscription_paused_at: null,
      ee_total: 0, ee_used: 0,
      exam_total: 0, exam_used: 0,
      exam_4m_total: 0, exam_4m_used: 0,
      eo_total: 0, eo_used: 0,
      coaching_total: 0, coaching_used: 0,
      updated_at: now,
    })
    .eq("id", studentId);

  if (packError) {
    console.error("Erreur cancel-pack (quotas):", packError);
    return NextResponse.json({ error: packError.message }, { status: 500 });
  }

  // Step 2: update tag_status separately — non-blocking if constraint not yet updated in DB
  const { error: tagError } = await supabaseAdmin
    .from("profiles")
    .update({ tag_status: "revoque", updated_at: now })
    .eq("id", studentId);

  if (tagError) {
    console.warn("tag_status 'revoque' rejeté par la contrainte DB — exécutez le SQL de migration:", tagError.message);
  }

  return NextResponse.json({ ok: true, tag_status_updated: !tagError });
}

// PATCH /api/admin/assign-pack — mettre à jour le tag_status d'un étudiant (admin uniquement)
export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { studentId, tag_status, action } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId requis." }, { status: 400 });

  if (!(await ensureGlobalStudent(studentId))) {
    return NextResponse.json({ error: "Compte centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  if (action === "relance") {
    const { data: profile, error: readError } = await supabaseAdmin
      .from("profiles")
      .select("relance_count")
      .eq("id", studentId)
      .single();

    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

    const relanceCount = (profile?.relance_count ?? 0) + 1;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ relance_count: relanceCount, updated_at: new Date().toISOString() })
      .eq("id", studentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, relance_count: relanceCount });
  }

  if (action === "pause" || action === "resume") {
    const { data: profile, error: readError } = await supabaseAdmin
      .from("profiles")
      .select("pack_name, subscription_ends_at, subscription_paused_at")
      .eq("id", studentId)
      .single();

    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });

    const now = new Date();
    const endDate = profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
    const pauseReferenceMs = profile?.subscription_paused_at
      ? new Date(profile.subscription_paused_at).getTime()
      : now.getTime();
    if (!profile?.pack_name || profile.pack_name === "aucun" || !endDate || endDate.getTime() <= pauseReferenceMs) {
      return NextResponse.json({ error: "Ce client n'a pas de pack actif à suspendre." }, { status: 400 });
    }

    if (action === "pause") {
      if (profile.subscription_paused_at) {
        return NextResponse.json({ ok: true, alreadyPaused: true });
      }

      const pausedAt = now.toISOString();
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ subscription_paused_at: pausedAt, updated_at: pausedAt })
        .eq("id", studentId)
        .is("subscription_paused_at", null);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await supabaseAdmin.from("notifications").insert([{ user_id: studentId, message: "Votre pack a été mis en pause. Vos jours restants sont conservés jusqu'à sa réactivation." }]);
      return NextResponse.json({ ok: true, subscription_paused_at: pausedAt });
    }

    if (!profile.subscription_paused_at) {
      return NextResponse.json({ ok: true, alreadyResumed: true });
    }

    const pausedAtMs = new Date(profile.subscription_paused_at).getTime();
    if (!Number.isFinite(pausedAtMs)) {
      return NextResponse.json({ error: "Date de pause invalide." }, { status: 500 });
    }

    const resumedAt = now.toISOString();
    const extendedEndDate = new Date(endDate.getTime() + Math.max(0, now.getTime() - pausedAtMs)).toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ subscription_paused_at: null, subscription_ends_at: extendedEndDate, updated_at: resumedAt })
      .eq("id", studentId)
      .eq("subscription_paused_at", profile.subscription_paused_at);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from("notifications").insert([{ user_id: studentId, message: "Votre pack a été réactivé. La durée de votre pause a été ajoutée à votre date de fin." }]);
    return NextResponse.json({ ok: true, subscription_ends_at: extendedEndDate });
  }

  if (!tag_status) return NextResponse.json({ error: "tag_status requis." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ tag_status, updated_at: new Date().toISOString() })
    .eq("id", studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
