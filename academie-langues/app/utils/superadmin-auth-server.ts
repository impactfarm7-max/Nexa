import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  canAccessMenu,
  sanitizeSuperadminMenus,
  type SuperadminAccess,
  type SuperadminMenuKey,
} from "@/app/data/superadminMenus";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIn0.placeholder",
);

export type SuperadminContext = {
  user: { id: string; email: string | null };
  accessToken: string;
  access: SuperadminAccess;
};

type SuperadminResult =
  | { ctx: SuperadminContext; error: null }
  | { ctx: null; error: NextResponse };

function unauthorized(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Decode (sans re-vérifier la signature — deja verifiee via supabaseAdmin.auth.getUser)
 * le claim `aal` (Authenticator Assurance Level) d'un access token JWT Supabase.
 * Retourne "aal1" par defaut si le claim est absent (anciens tokens / erreur de parsing).
 */
function decodeAal(accessToken: string): "aal1" | "aal2" {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return "aal1";
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json);
    return payload?.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

async function loadOrBootstrapAccess(userId: string): Promise<SuperadminAccess> {
  const { data: row, error } = await supabaseAdmin
    .from("superadmin_permissions")
    .select("is_owner, menus, disabled_at")
    .eq("user_id", userId)
    .maybeSingle();

  // Table absente / pas encore migrée → accès total (compat).
  if (error) {
    console.warn("[superadmin] permissions lookup:", error.message);
    return { isOwner: true, menus: [], disabled: false };
  }

  if (!row) {
    const { count } = await supabaseAdmin
      .from("superadmin_permissions")
      .select("user_id", { count: "exact", head: true })
      .eq("is_owner", true)
      .is("disabled_at", null);

    const makeOwner = !count || count === 0;
    await supabaseAdmin.from("superadmin_permissions").upsert({
      user_id: userId,
      is_owner: makeOwner,
      menus: makeOwner ? [] : ["dashboard"],
      updated_at: new Date().toISOString(),
    });
    return {
      isOwner: makeOwner,
      menus: makeOwner ? [] : (["dashboard"] as SuperadminMenuKey[]),
      disabled: false,
    };
  }

  return {
    isOwner: Boolean(row.is_owner),
    menus: sanitizeSuperadminMenus(row.menus),
    disabled: Boolean(row.disabled_at),
  };
}

/**
 * Verifie qu'une requete API est authentifiee par un compte `superadmin`
 * dont la session a bien complete le MFA (aal2). A utiliser sur toutes les
 * routes /api/superadmin/*.
 */
export async function getSuperadminContext(req: Request): Promise<SuperadminResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ctx: null, error: unauthorized("Non autorise.") };
  }
  const accessToken = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !user) {
    return { ctx: null, error: unauthorized("Session invalide.") };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "superadmin") {
    return { ctx: null, error: unauthorized("Compte superadmin requis.", 403) };
  }

  if (decodeAal(accessToken) !== "aal2") {
    return { ctx: null, error: unauthorized("Verification MFA requise.", 403) };
  }

  const access = await loadOrBootstrapAccess(user.id);
  if (access.disabled) {
    return { ctx: null, error: unauthorized("Compte superadmin desactive.", 403) };
  }

  return {
    ctx: { user: { id: user.id, email: user.email ?? null }, accessToken, access },
    error: null,
  };
}

/** Exige le droit sur un menu (owners toujours OK). */
export function requireSuperadminMenu(
  ctx: SuperadminContext,
  menu: SuperadminMenuKey,
): NextResponse | null {
  if (canAccessMenu(ctx.access, menu)) return null;
  return unauthorized("Acces menu non autorise.", 403);
}

/** Exige le statut owner (gestion d'equipe). */
export function requireSuperadminOwner(ctx: SuperadminContext): NextResponse | null {
  if (ctx.access.isOwner) return null;
  return unauthorized("Reserve aux superadmins owner.", 403);
}

/** Journalise une action superadmin (non bloquant). */
export async function logSuperadminAction(
  superadminId: string,
  action: string,
  options?: {
    targetType?: string;
    targetId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
    req?: Request;
  },
) {
  try {
    await supabaseAdmin.from("superadmin_audit_logs").insert({
      superadmin_id: superadminId,
      action: action.slice(0, 120),
      target_type: options?.targetType ?? null,
      target_id: options?.targetId ?? null,
      reason: options?.reason ?? null,
      metadata: options?.metadata ?? {},
      ip: options?.req?.headers.get("x-forwarded-for") ?? null,
      user_agent: options?.req?.headers.get("user-agent") ?? null,
    });
  } catch {
    // Le journal d'audit ne doit jamais bloquer l'action principale.
  }
}
