import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAccount(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, profile: null, membership: null, center: null, response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };

  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, phone, ville, genre, role, center_id, avatar_url, created_at, last_sign_in_at, tag_status, simulations_completed, coaching_total, coaching_used, pin_hash")
      .eq("id", user.id)
      .maybeSingle(),
    supabaseAdmin
      .from("center_users")
      .select("center_id, role, permissions, created_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) return { user, profile: null, membership, center: null, response: NextResponse.json({ error: profileError.message }, { status: 500 }) };
  if (membershipError) return { user, profile, membership: null, center: null, response: NextResponse.json({ error: membershipError.message }, { status: 500 }) };

  const centerId = profile?.center_id || membership?.center_id;
  if (!centerId) return { user, profile, membership, center: null, response: NextResponse.json({ error: "Compte centre requis." }, { status: 403 }) };

  const { data: center, error: centerError } = await supabaseAdmin
    .from("centers")
    .select("id, name, code, city, address, phone, email, status, created_at")
    .eq("id", centerId)
    .maybeSingle();

  if (centerError) return { user, profile, membership, center: null, response: NextResponse.json({ error: centerError.message }, { status: 500 }) };
  if (!center) return { user, profile, membership, center: null, response: NextResponse.json({ error: "Centre introuvable." }, { status: 404 }) };

  return { user, profile, membership, center, response: null };
}

export async function GET(req: Request) {
  const { user, profile, membership, center, response } = await getAccount(req);
  if (response) return response;

  const { pin_hash: _pinHash, ...safeProfile } = profile || {};

  return NextResponse.json({
    user: { id: user!.id, email: user!.email, created_at: user!.created_at },
    profile: safeProfile,
    hasPin: Boolean(profile?.pin_hash),
    membership,
    center,
  });
}

export async function PATCH(req: Request) {
  const { user, profile, response } = await getAccount(req);
  if (response) return response;

  const body = await req.json();
  const updates: Record<string, string | null> = {
    prenom: String(body.prenom || "").trim() || null,
    phone: String(body.phone || "").trim() || null,
    ville: String(body.ville || "").trim() || null,
    genre: String(body.genre || "").trim() || null,
  };
  if (body.nom !== undefined) {
    updates.nom = String(body.nom || "").trim() || null;
  }
  if (body.avatar_url !== undefined) {
    updates.avatar_url = String(body.avatar_url || "").trim() || null;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", user!.id)
    .select("id, prenom, nom, email, phone, ville, genre, role, center_id, avatar_url, created_at, last_sign_in_at, tag_status, simulations_completed, coaching_total, coaching_used")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    profile: data || profile,
  });
}
