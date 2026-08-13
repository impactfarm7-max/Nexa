import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];

async function getStaffProfile(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, center_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) return null;
  return profile;
}

/** Liste toutes les soumissions en attente de correction manuelle du centre. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const profile = await getStaffProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { data: missions } = await supabaseAdmin
    .from("missions")
    .select("id, title, filiere_matiere_id, correction_mode, formateur_id")
    .eq("center_id", profile.center_id);

  const missionIds = (missions ?? []).map((m) => m.id);
  if (missionIds.length === 0) {
    return NextResponse.json({ items: [], count: 0 });
  }

  const { data: subs, error } = await supabaseAdmin
    .from("mission_submissions")
    .select("id, mission_id, user_id, status, created_at, answer_text, file_url, file_name")
    .in("mission_id", missionIds)
    .in("status", ["pending_review", "correcting"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id).filter(Boolean))];
  const profileById = new Map<string, { prenom: string | null; nom: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileById.set(p.id, { prenom: p.prenom, nom: p.nom });
    }
  }

  const missionById = new Map((missions ?? []).map((m) => [m.id, m]));

  const items = (subs ?? []).map((s: any) => {
    const mission = missionById.get(s.mission_id);
    const student = profileById.get(s.user_id);
    return {
      id: s.id,
      mission_id: s.mission_id,
      mission_title: mission?.title || "Devoir",
      filiere_matiere_id: mission?.filiere_matiere_id || null,
      correction_mode: mission?.correction_mode || "auto",
      status: s.status,
      created_at: s.created_at,
      student_name: `${student?.prenom || ""} ${student?.nom || ""}`.trim() || "Étudiant",
      has_text: !!s.answer_text?.trim(),
      has_file: !!s.file_url,
    };
  });

  const { data: allSubs } = await supabaseAdmin
    .from("mission_submissions")
    .select("mission_id, status")
    .in("mission_id", missionIds);

  const by_mission: Record<string, { total: number; pending: number }> = {};
  for (const s of allSubs ?? []) {
    if (!by_mission[s.mission_id]) by_mission[s.mission_id] = { total: 0, pending: 0 };
    by_mission[s.mission_id].total++;
    if (s.status === "pending_review" || s.status === "correcting") {
      by_mission[s.mission_id].pending++;
    }
  }

  return NextResponse.json({ items, count: items.length, by_mission });
}
