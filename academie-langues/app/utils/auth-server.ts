import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logClientActivityServer(
  userId: string,
  action: string,
  details?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabaseAdmin.from("client_activity_logs").insert({
      user_id: userId,
      action: action.slice(0, 120),
      details: details ? details.slice(0, 500) : null,
      metadata: metadata ?? {},
    });
  } catch {
    // Le journal d'activite ne doit jamais bloquer l'action principale.
  }
}

/** Log non-bloquant d'une session simulateur dans simulator_logs. */
export async function logSimulatorUsage(userId: string, mode: string) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("formation")
      .eq("id", userId)
      .single();
    await supabaseAdmin.from("simulator_logs").insert({
      user_id: userId,
      mode,
      formation: profile?.formation ?? null,
    });
    await logClientActivityServer(userId, "Simulation terminee", `Mode : ${mode}`, {
      mode,
      formation: profile?.formation ?? null,
    });
  } catch {
    // fail silently — ne jamais bloquer une simulation pour un log
  }
}

/**
 * Vérifie le token Bearer de la requête et retourne l'utilisateur Supabase.
 * Retourne null si le token est absent ou invalide.
 */
export async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

/**
 * Vérifie l'authentification ET l'abonnement actif.
 * Les admins (role = 'admin') passent sans vérification d'abonnement.
 * Retourne un objet { user, error, status } pour permettre des réponses HTTP précises.
 */
export async function checkSubscription(req: Request): Promise<{
  user: Awaited<ReturnType<typeof getAuthUser>>;
  error?: string;
  status?: number;
}> {
  const user = await getAuthUser(req);
  if (!user) return { user: null, error: "Non autorisé.", status: 401 };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_ends_at, subscription_paused_at, role, tag_status")
    .eq("id", user.id)
    .single();

  if (!profile) return { user: null, error: "Profil introuvable.", status: 403 };

  // Les admins ont toujours accès
  if (profile.role !== "admin" && profile.tag_status === "revoque") {
    return { user: null, error: "Accès révoqué.", status: 403 };
  }

  if (profile.role !== "admin" && profile.tag_status === "pending_center_approval") {
    return { user: null, error: "Compte en attente de validation par le centre.", status: 403 };
  }

  if (profile.role !== "admin" && profile.tag_status === "termine") {
    return { user: null, error: "Formation terminée.", status: 403 };
  }

  if (profile.role === "admin") return { user };

  if (profile.subscription_paused_at) {
    return { user: null, error: "Votre pack est temporairement en pause.", status: 403 };
  }

  const isActive =
    profile.subscription_ends_at &&
    new Date(profile.subscription_ends_at).getTime() > Date.now();

  if (!isActive) {
    return { user: null, error: "Abonnement requis ou expiré.", status: 403 };
  }

  return { user };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quota enforcement (côté serveur — source de vérité unique)
// ─────────────────────────────────────────────────────────────────────────────

export type QuotaType = "zen" | "examen" | "oral";

const UNLIMITED = 9999;

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    d.getFullYear() +
    "-W" +
    (1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7))
  );
}

/**
 * Vérifie que l'utilisateur a du quota disponible pour le type de simulation.
 * Si checkOnly=true, ne consomme pas le quota (vérification préalable).
 * Si checkOnly=false (défaut), vérifie ET consomme atomiquement.
 * Les admins sont toujours autorisés.
 */
export async function checkAndConsumeQuota(
  userId: string,
  type: QuotaType,
  checkOnly = false
): Promise<{ allowed: boolean; error?: string }> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "role, tag_status, pack_name, subscription_ends_at, subscription_paused_at, ee_used, ee_total, exam_used, exam_total, eo_used, eo_total, daily_sim_count, daily_sim_date, weekly_eo_count, weekly_eo_reset_date, created_at"
    )
    .eq("id", userId)
    .single();

  if (!profile) return { allowed: false, error: "Profil introuvable." };

  // Admins : accès illimité
  if (profile.role !== "admin" && profile.tag_status === "revoque") {
    return { allowed: false, error: "Accès révoqué." };
  }

  if (profile.role !== "admin" && profile.tag_status === "pending_center_approval") {
    return { allowed: false, error: "Compte en attente de validation par le centre." };
  }

  if (profile.role !== "admin" && profile.tag_status === "termine") {
    return { allowed: false, error: "Formation terminée." };
  }

  if (profile.role === "admin") return { allowed: true };

  if (profile.subscription_paused_at) {
    return { allowed: false, error: "Votre pack est temporairement en pause." };
  }

  const pack = profile.pack_name?.toLowerCase() || "aucun";
  const isPackStudent = ["raphia", "ebene", "cauris", "ivoire"].includes(pack);
  const isFormation = ["acceleree", "complete"].includes(pack);
  const isSubValid = Boolean(
    profile.subscription_ends_at &&
    new Date(profile.subscription_ends_at).getTime() > Date.now()
  );
  const isFullAccessTrial = pack === "essai" && isSubValid;
  const hasFormationAccess = isFormation || isFullAccessTrial;
  const today = getTodayStr();
  const thisWeek = getWeekStr();

  if ((isPackStudent || isFormation || pack === "essai") && !isSubValid) {
    return { allowed: false, error: "Votre periode d'essai ou votre abonnement est termine. Effectuez un achat pour continuer." };
  }

  // ── ZEN (Expression Écrite entraînement) ─────────────────────────────────
  if (type === "zen") {
    if (isPackStudent) {
      const total = profile.ee_total ?? 0;
      const used = profile.ee_used ?? 0;
      if (total !== UNLIMITED && used >= total) {
        return { allowed: false, error: "Quota EE épuisé." };
      }
      if (total !== UNLIMITED && !checkOnly) {
        await supabaseAdmin.from("profiles").update({ ee_used: used + 1 }).eq("id", userId);
      }
    } else if (hasFormationAccess) {
      // Formations : illimité sur le zen entraînement
    } else {
      // Sans pack — essai : max 3/jour ET max 6 au total sur 24 heures
      const trialDays = 1;
      const totalLimit = 6;
      const dailyLimit = 3;
      const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : Date.now();
      const trialEndsAt = createdAt + trialDays * 24 * 3600 * 1000;

      // 1. Période expirée
      if (Date.now() > trialEndsAt) {
        return { allowed: false, error: "Votre periode d'essai de 24 heures est terminee. Effectuez un achat pour continuer." };
      }

      // 2. Total épuisé (ee_used = compteur cumulatif trial)
      const totalUsed = profile.ee_used ?? 0;
      if (totalUsed >= totalLimit) {
        return { allowed: false, error: "Vous avez utilisé vos 6 corrections d'essai. Contactez NEXA pour accéder à un pack." };
      }

      // 3. Limite quotidienne
      const todayUsed = profile.daily_sim_date === today ? (profile.daily_sim_count ?? 0) : 0;
      if (todayUsed >= dailyLimit) {
        return { allowed: false, error: "Vous avez atteint votre limite de 3 corrections pour aujourd'hui. Revenez demain ou contactez NEXA pour accéder à un pack." };
      }

      if (!checkOnly) {
        await supabaseAdmin
          .from("profiles")
          .update({ ee_used: totalUsed + 1, daily_sim_count: todayUsed + 1, daily_sim_date: today })
          .eq("id", userId);
      }
    }
  }

  // ── EXAMEN (Expression Écrite examen complet) ─────────────────────────────
  else if (type === "examen") {
    if (hasFormationAccess) {
      // Formations : illimité
    } else if (isPackStudent) {
      const total = profile.exam_total ?? 0;
      const used = profile.exam_used ?? 0;
      if (total !== UNLIMITED && used >= total) {
        return { allowed: false, error: "Quota examens EE épuisé." };
      }
      if (total !== UNLIMITED && !checkOnly) {
        await supabaseAdmin.from("profiles").update({ exam_used: used + 1 }).eq("id", userId);
      }
    } else {
      return { allowed: false, error: "Pack requis pour accéder aux examens." };
    }
  }

  // ── ORAL (Expression Orale) ───────────────────────────────────────────────
  else if (type === "oral") {
    if (hasFormationAccess) {
      const currentWeek = profile.weekly_eo_reset_date === thisWeek ? (profile.weekly_eo_count ?? 0) : 0;
      if (currentWeek >= 3) {
        return { allowed: false, error: "Limite hebdomadaire EO atteinte (3 / semaine)." };
      }
      if (!checkOnly) {
        await supabaseAdmin
          .from("profiles")
          .update({ weekly_eo_count: currentWeek + 1, weekly_eo_reset_date: thisWeek })
          .eq("id", userId);
      }
    } else if (isPackStudent) {
      const total = profile.eo_total ?? 0;
      const used = profile.eo_used ?? 0;
      if (total !== UNLIMITED && used >= total) {
        return { allowed: false, error: "Quota EO épuisé." };
      }
      if (total !== UNLIMITED && !checkOnly) {
        await supabaseAdmin.from("profiles").update({ eo_used: used + 1 }).eq("id", userId);
      }
    } else {
      return { allowed: false, error: "Pack requis pour accéder aux simulations EO." };
    }
  }

  return { allowed: true };
}
