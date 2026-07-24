import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/missions — lister toutes les soumissions (admin uniquement, bypasse RLS)
export async function GET(req: Request) {
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

  // 1. Récupérer toutes les soumissions sans jointure (évite les erreurs de FK manquantes)
  const { data: submissions, error } = await supabaseAdmin
    .from("mission_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur fetch submissions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!submissions || submissions.length === 0) {
    return NextResponse.json({ submissions: [] });
  }

  // 2. Collecter les IDs uniques pour enrichir les données
  const userIds = [...new Set(submissions.map((s: any) => s.user_id).filter(Boolean))];
  const missionIds = [...new Set(submissions.map((s: any) => s.mission_id).filter(Boolean))];

  const [profilesRes, missionsRes] = await Promise.all([
    userIds.length > 0
      ? supabaseAdmin.from("profiles").select("id, prenom, email, center_id").in("id", userIds)
      : { data: [] },
    missionIds.length > 0
      ? supabaseAdmin.from("missions").select("id, title, description, center_id").in("id", missionIds)
      : { data: [] },
  ]);

  const profileMap: Record<string, any> = {};
  (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  const missionMap: Record<string, any> = {};
  (missionsRes.data ?? []).forEach((m: any) => { missionMap[m.id] = m; });

  // 3. Fusionner
  const enriched = submissions
    .filter((s: any) => {
      const profile = profileMap[s.user_id];
      const mission = missionMap[s.mission_id];
      return !profile?.center_id && mission && !mission.center_id;
    })
    .map((s: any) => ({
      ...s,
      profiles: profileMap[s.user_id] ?? null,
      missions: missionMap[s.mission_id] ?? null,
    }));

  return NextResponse.json({ submissions: enriched });
}

// POST /api/admin/missions — créer une mission (admin uniquement)
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const body = await req.json();
  const { title, description } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("missions")
    .insert([{ title: title.trim(), description: (description ?? "").trim() }])
    .select()
    .single();

  if (error) {
    console.error("Erreur insert mission:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mission: data });
}

// DELETE /api/admin/missions — supprimer une mission (admin uniquement)
export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  const { error } = await supabaseAdmin.from("missions").delete().eq("id", id).is("center_id", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
