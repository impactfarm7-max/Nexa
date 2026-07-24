import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isMissingRelation(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

async function findRevokedStudent(email: string) {
  const withReason = await supabaseAdmin
    .from("center_revoked_students")
    .select("id, center_id, revoked_at, reason")
    .eq("email_lc", email)
    .order("revoked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!withReason.error) {
    return withReason.data || null;
  }

  if (!isMissingRelation(withReason.error)) {
    console.warn("[login-hint] revoked lookup:", withReason.error.message);
    return null;
  }

  const fallback = await supabaseAdmin
    .from("center_revoked_students")
    .select("id, center_id, revoked_at")
    .eq("email_lc", email)
    .order("revoked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error && !isMissingRelation(fallback.error)) {
    console.warn("[login-hint] revoked lookup:", fallback.error.message);
  }

  return fallback.data ? { ...fallback.data, reason: null } : null;
}

/** Aide au diagnostic après échec de connexion (sans révéler si l'email existe côté B2C). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const normalized = String(body.email || "").trim().toLowerCase();
  if (!normalized) {
    return NextResponse.json({ hasProfile: false, hasAuth: false });
  }

  let profile = (
    await supabaseAdmin
      .from("profiles")
      .select("id, center_id, role, email, tag_status, center_status")
      .eq("email", normalized)
      .maybeSingle()
  ).data;

  if (!profile) {
    profile = (
      await supabaseAdmin
        .from("profiles")
        .select("id, center_id, role, email, tag_status, center_status")
        .ilike("email", normalized)
        .maybeSingle()
    ).data;
  }

  if (!profile) {
    const revoked = await findRevokedStudent(normalized);
    return NextResponse.json({
      hasProfile: false,
      hasAuth: false,
      isCenterStudent: Boolean(revoked),
      revoked: Boolean(revoked),
      reason: revoked?.reason || null,
    });
  }

  let hasAuth = false;
  try {
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    hasAuth = !error && Boolean(authUser?.user);
  } catch {
    hasAuth = false;
  }

  const isCenterStudent = Boolean(profile.center_id && profile.role === "student");
  const revoked =
    isCenterStudent &&
    (profile.center_status === "revoked" || profile.tag_status === "revoque");

  return NextResponse.json({ hasProfile: true, hasAuth, isCenterStudent, revoked, reason: null });
}
