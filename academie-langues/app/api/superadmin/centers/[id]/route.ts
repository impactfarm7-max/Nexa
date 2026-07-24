import { NextRequest, NextResponse } from "next/server";
import { normalizeNexaOffer } from "@/app/data/nexaOffers";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

const VALID_STATUSES = new Set(["active", "suspended", "rejected"]);

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;

  const [{ data: center, error: centerError }, { data: centerUsers }, { data: managerProfiles }, { data: students }] = await Promise.all([
    supabaseAdmin
      .from("centers")
      .select("id, name, city, code, signup_slug, address, country, region, center_type, phone, email, status, application_id, created_at, updated_at, nexa_offer")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("center_users")
      .select("role, role_label, user_id, profiles:user_id ( id, prenom, nom, email, phone, job_title, last_sign_in_at )")
      .eq("center_id", id)
      .in("role", ["owner", "manager"]),
    // Le créateur/responsable est un profil de rôle manager rattaché au centre —
    // il n'est pas toujours présent dans center_users (d'où l'email manquant).
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, phone, job_title, last_sign_in_at")
      .eq("center_id", id)
      .in("role", ["center_manager", "campus_manager"]),
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, email, tag_status, subscription_ends_at, subscription_paused_at, pack_name, created_at")
      .eq("center_id", id)
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (centerError || !center) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  // Fusionne responsables issus de center_users et des profils manager (dédup par id).
  const managerMap = new Map<
    string,
    { role: string | null; role_label: string | null; profiles: Record<string, unknown> }
  >();
  for (const cu of centerUsers ?? []) {
    const raw = cu.profiles as unknown;
    const p = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null;
    if (p?.id) {
      managerMap.set(p.id as string, {
        role: cu.role ?? null,
        role_label: cu.role_label ?? (p.job_title as string) ?? null,
        profiles: p,
      });
    }
  }
  for (const p of managerProfiles ?? []) {
    if (p?.id && !managerMap.has(p.id)) {
      managerMap.set(p.id, {
        role: "center_manager",
        role_label: (p.job_title as string) ?? null,
        profiles: p,
      });
    }
  }

  // Repli sur l'email du compte Auth quand le profil n'a pas d'email enregistré.
  const managers = await Promise.all(
    [...managerMap.values()].map(async (m) => {
      const p = m.profiles;
      if (!p.email && p.id) {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id as string);
          if (authUser?.user?.email) p.email = authUser.user.email;
        } catch {
          /* ignore */
        }
      }
      return m;
    }),
  );

  const ownerEmail = managers.find((m) => m.role === "owner" && m.profiles.email)?.profiles.email as
    | string
    | undefined;
  const anyManagerEmail = managers.find((m) => m.profiles.email)?.profiles.email as string | undefined;
  const creatorEmail =
    ownerEmail ??
    anyManagerEmail ??
    (typeof center.email === "string" && center.email.trim() ? center.email.trim() : null);

  // Repli : email de la demande d'ouverture de centre (souvent le vrai mail créateur).
  let resolvedCreatorEmail = creatorEmail;
  if (!resolvedCreatorEmail && center.application_id) {
    const { data: application } = await supabaseAdmin
      .from("center_applications")
      .select("email")
      .eq("id", center.application_id)
      .maybeSingle();
    if (application?.email) resolvedCreatorEmail = application.email;
  }

  const now = Date.now();
  const stats = { actifs: 0, pauses: 0, expires: 0, termines: 0, revoques: 0, total: 0 };
  for (const s of students ?? []) {
    stats.total++;
    if (s.tag_status === "revoque") stats.revoques++;
    else if (s.tag_status === "termine") stats.termines++;
    else if (s.subscription_paused_at) stats.pauses++;
    else if (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() <= now) stats.expires++;
    else stats.actifs++;
  }

  return NextResponse.json({
    center,
    managers,
    creatorEmail: resolvedCreatorEmail,
    students: students ?? [],
    stats,
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const hasStatus = typeof body?.status === "string" && body.status.length > 0;
  const hasOffer = Object.prototype.hasOwnProperty.call(body, "nexa_offer");
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : undefined;

  if (!hasStatus && !hasOffer) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  if (hasStatus && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  let nextOffer: string | null | undefined;
  if (hasOffer) {
    if (body.nexa_offer === null || body.nexa_offer === "" || body.nexa_offer === "none") {
      nextOffer = null;
    } else {
      const normalized = normalizeNexaOffer(body.nexa_offer);
      if (!normalized) {
        return NextResponse.json({ error: "Offre NEXA invalide." }, { status: 400 });
      }
      nextOffer = normalized;
    }
  }

  const { data: previousCenter } = await supabaseAdmin
    .from("centers")
    .select("status, nexa_offer, name")
    .eq("id", id)
    .maybeSingle();

  if (!previousCenter) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  const wasPending = previousCenter.status === "pending";
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (hasStatus) patch.status = body.status;
  if (hasOffer) patch.nexa_offer = nextOffer;

  const { data: center, error: updateError } = await supabaseAdmin
    .from("centers")
    .update(patch)
    .eq("id", id)
    .select("id, name, status, nexa_offer")
    .maybeSingle();

  if (updateError || !center) {
    return NextResponse.json({ error: updateError?.message || "Centre introuvable." }, { status: 404 });
  }

  if (hasStatus) {
    const action =
      body.status === "rejected"
        ? "center_rejected"
        : body.status === "suspended"
          ? "center_suspended"
          : wasPending
            ? "center_pending_approved"
            : "center_reactivated";

    await logSuperadminAction(ctx.user.id, action, {
      targetType: "center",
      targetId: id,
      reason,
      metadata: { centerName: center.name },
      req,
    });
  }

  if (hasOffer) {
    await logSuperadminAction(ctx.user.id, previousCenter.nexa_offer ? "center_offer_changed" : "center_offer_assigned", {
      targetType: "center",
      targetId: id,
      reason,
      metadata: {
        centerName: center.name,
        previousOffer: previousCenter.nexa_offer,
        nextOffer: center.nexa_offer,
      },
      req,
    });
  }

  return NextResponse.json({ center });
}
