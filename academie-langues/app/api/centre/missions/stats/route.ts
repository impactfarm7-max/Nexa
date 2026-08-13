import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import {
  computeRankings,
  getEligibleStudentsForMission,
  type MissionRow,
} from "@/app/utils/missionTargeting";

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

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const profile = await getStaffProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const missionId = new URL(req.url).searchParams.get("mission_id");
  if (!missionId) {
    return NextResponse.json({ error: "mission_id requis." }, { status: 400 });
  }

  const { data: mission, error: missionError } = await supabaseAdmin
    .from("missions")
    .select("id, center_id, target_user_id, groupe_id, filiere_matiere_id, correction_mode, title")
    .eq("id", missionId)
    .maybeSingle();

  if (missionError || !mission) {
    return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
  }

  if (mission.center_id !== profile.center_id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const eligible = await getEligibleStudentsForMission(supabaseAdmin, mission as MissionRow);

  const { data: submissionRows, error: subError } = await supabaseAdmin
    .from("mission_submissions")
    .select("id, user_id, answer_text, file_url, file_name, status, created_at, correction")
    .eq("mission_id", missionId)
    .order("created_at", { ascending: false });

  if (subError) {
    console.error("stats submissions error:", subError);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const userIds = [...new Set((submissionRows ?? []).map((s) => s.user_id).filter(Boolean))];
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

  const submissions = (submissionRows ?? []).map((s: any) => {
    const profile = profileById.get(s.user_id);
    return {
      id: s.id,
      user_id: s.user_id,
      student_name: `${profile?.prenom || ""} ${profile?.nom || ""}`.trim() || "Inconnu",
      answer_text: s.answer_text,
      file_url: s.file_url,
      file_name: s.file_name,
      status: s.status,
      created_at: s.created_at,
      correction: s.correction,
      admin_comment: null as string | null,
    };
  });

  const submittedIds = new Set(submissions.map((s) => s.user_id));
  const notSubmitted = eligible
    .filter((s) => !submittedIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: `${s.prenom || ""} ${s.nom || ""}`.trim() || s.email || "Élève",
    }));

  const rankMap = computeRankings(submissions);
  const submissionsWithRank = submissions.map((s) => ({
    ...s,
    rank: rankMap.get(s.user_id)?.rank ?? null,
    rank_total: rankMap.get(s.user_id)?.total ?? null,
  }));

  return NextResponse.json({
    mission: {
      id: mission.id,
      title: mission.title,
      correction_mode: mission.correction_mode || "auto",
    },
    eligible_count: eligible.length,
    submitted_count: submissions.length,
    not_submitted_count: notSubmitted.length,
    not_submitted: notSubmitted,
    submissions: submissionsWithRank,
  });
}
