import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, logSuperadminAction, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

const ALLOWED_ACTIONS = new Set(["login", "mfa_enrolled"]);

/**
 * Journal d'activite superadmin — lecture paginee (cursor sur created_at)
 * pour la page /superadmin/audit. Enrichit chaque entree avec l'email du
 * superadmin auteur (les logs ne stockent que son id).
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;
  const before = url.searchParams.get("before");

  let query = supabaseAdmin
    .from("superadmin_audit_logs")
    .select("id, superadmin_id, action, target_type, target_id, reason, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: logs, error: logsError } = await query;
  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  const superadminIds = Array.from(new Set((logs ?? []).map((l) => l.superadmin_id).filter(Boolean)));
  let emailById = new Map<string, string | null>();
  if (superadminIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", superadminIds);
    emailById = new Map((profiles ?? []).map((p) => [p.id, p.email ?? null]));
  }

  const entries = (logs ?? []).map((l) => ({
    ...l,
    superadmin_email: emailById.get(l.superadmin_id) ?? null,
  }));

  return NextResponse.json({ logs: entries });
}

/**
 * Journalise un evenement d'authentification superadmin (connexion, activation MFA).
 * Les actions de gestion (Phase 1+) auront leurs propres routes qui appellent
 * logSuperadminAction() directement cote serveur.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Action non reconnue." }, { status: 400 });
  }

  await logSuperadminAction(ctx.user.id, action, { req });
  return NextResponse.json({ ok: true });
}
