import { NextRequest, NextResponse } from "next/server";
import { normalizeNexaOffer } from "@/app/data/nexaOffers";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { computeCenterDerivedStatus } from "@/app/api/superadmin/centers/route";

const VALID_STATUSES = new Set(["active", "suspended", "rejected"]);

type SubscriptionPatchFields = {
  subscription_amount?: number | null;
  subscription_period_months?: number | null;
  renewal_at?: string | null;
  renewal_alert_days?: number | null;
  quota_overrides?: Record<string, unknown> | null;
};

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  return undefined;
}

function parseOptionalIsoDate(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function parseQuotaOverrides(value: unknown): Record<string, unknown> | null | undefined {
  if (value === null) return null;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const { id } = await context.params;

  const [{ data: center, error: centerError }, { data: centerUsers }, { data: managerProfiles }, { data: students }] = await Promise.all([
    supabaseAdmin
      .from("centers")
      .select(
        "id, name, city, code, signup_slug, address, country, region, center_type, phone, email, status, application_id, created_at, updated_at, nexa_offer, trial_ends_at, renewal_at, subscription_amount, subscription_period_months, renewal_alert_days, quota_overrides, pause_reason, subscription_starts_at",
      )
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

  let application: Record<string, unknown> | null = null;
  if (center.application_id) {
    const { data: appRow } = await supabaseAdmin
      .from("center_applications")
      .select(
        "id, center_name, center_type, country, city, address, manager_name, manager_role, email, phone, student_volume, needs, message, status, created_at",
      )
      .eq("id", center.application_id)
      .maybeSingle();
    application = appRow ?? null;
  }

  const derived_status = computeCenterDerivedStatus(center);

  return NextResponse.json({
    center: { ...center, derived_status },
    managers,
    creatorEmail: resolvedCreatorEmail,
    application,
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
  const hasSubscriptionAmount = Object.prototype.hasOwnProperty.call(body, "subscription_amount");
  const hasSubscriptionPeriod = Object.prototype.hasOwnProperty.call(body, "subscription_period_months");
  const hasRenewalAt = Object.prototype.hasOwnProperty.call(body, "renewal_at");
  const hasRenewalAlertDays = Object.prototype.hasOwnProperty.call(body, "renewal_alert_days");
  const hasQuotaOverrides = Object.prototype.hasOwnProperty.call(body, "quota_overrides");
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : undefined;

  if (
    !hasStatus &&
    !hasOffer &&
    !hasSubscriptionAmount &&
    !hasSubscriptionPeriod &&
    !hasRenewalAt &&
    !hasRenewalAlertDays &&
    !hasQuotaOverrides
  ) {
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

  const subscriptionPatch: SubscriptionPatchFields = {};
  if (hasSubscriptionAmount) {
    const amount = parseOptionalInt(body.subscription_amount);
    if (amount === undefined) {
      return NextResponse.json({ error: "Montant d'abonnement invalide." }, { status: 400 });
    }
    subscriptionPatch.subscription_amount = amount;
  }
  if (hasSubscriptionPeriod) {
    const period = parseOptionalInt(body.subscription_period_months);
    if (period === undefined || (period !== null && period <= 0)) {
      return NextResponse.json({ error: "Période d'abonnement invalide." }, { status: 400 });
    }
    subscriptionPatch.subscription_period_months = period;
  }
  if (hasRenewalAt) {
    const renewalAt = parseOptionalIsoDate(body.renewal_at);
    if (renewalAt === undefined) {
      return NextResponse.json({ error: "Date de renouvellement invalide." }, { status: 400 });
    }
    subscriptionPatch.renewal_at = renewalAt;
  }
  if (hasRenewalAlertDays) {
    const alertDays = parseOptionalInt(body.renewal_alert_days);
    if (alertDays === undefined || (alertDays !== null && alertDays < 0)) {
      return NextResponse.json({ error: "Délai d'alerte invalide." }, { status: 400 });
    }
    subscriptionPatch.renewal_alert_days = alertDays;
  }
  if (hasQuotaOverrides) {
    const overrides = parseQuotaOverrides(body.quota_overrides);
    if (overrides === undefined) {
      return NextResponse.json({ error: "Quota overrides invalides." }, { status: 400 });
    }
    subscriptionPatch.quota_overrides = overrides;
  }

  const { data: previousCenter } = await supabaseAdmin
    .from("centers")
    .select(
      "status, nexa_offer, name, subscription_amount, subscription_period_months, renewal_at, renewal_alert_days, quota_overrides",
    )
    .eq("id", id)
    .maybeSingle();

  if (!previousCenter) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  }

  const wasPending = previousCenter.status === "pending";
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (hasStatus) patch.status = body.status;
  if (hasOffer) patch.nexa_offer = nextOffer;
  Object.assign(patch, subscriptionPatch);

  const { data: center, error: updateError } = await supabaseAdmin
    .from("centers")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, status, nexa_offer, subscription_amount, subscription_period_months, renewal_at, renewal_alert_days, quota_overrides",
    )
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
      metadata: { center_id: id, centerName: center.name },
      req,
    });
  }

  if (hasOffer) {
    await logSuperadminAction(ctx.user.id, previousCenter.nexa_offer ? "center_offer_changed" : "center_offer_assigned", {
      targetType: "center",
      targetId: id,
      reason,
      metadata: {
        center_id: id,
        centerName: center.name,
        previousOffer: previousCenter.nexa_offer,
        nextOffer: center.nexa_offer,
      },
      req,
    });
  }

  const subscriptionFields = [
    ["subscription_amount", hasSubscriptionAmount],
    ["subscription_period_months", hasSubscriptionPeriod],
    ["renewal_at", hasRenewalAt],
    ["renewal_alert_days", hasRenewalAlertDays],
    ["quota_overrides", hasQuotaOverrides],
  ] as const;

  for (const [field, changed] of subscriptionFields) {
    if (!changed) continue;
    await logSuperadminAction(ctx.user.id, "center_subscription_updated", {
      targetType: "center",
      targetId: id,
      reason,
      metadata: {
        center_id: id,
        centerName: center.name,
        field,
        previousValue: previousCenter[field],
        nextValue: center[field],
      },
      req,
    });
  }

  return NextResponse.json({ center });
}
