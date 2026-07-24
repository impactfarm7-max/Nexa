import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import {
  computeRankings,
  isStudentEligibleForMission,
  type MissionRow,
} from "@/app/utils/missionTargeting";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role, pack_name")
    .eq("id", user.id)
    .maybeSingle();

  let missionQuery = supabaseAdmin.from("missions").select("*").order("created_at", { ascending: false });

  if (profile?.center_id) {
    missionQuery = missionQuery.eq("center_id", profile.center_id);
  } else {
    missionQuery = missionQuery.is("center_id", null);
  }

  const [{ data: allMissions }, { data: userSubs }] = await Promise.all([
    missionQuery,
    supabaseAdmin.from("mission_submissions").select("*").eq("user_id", user.id),
  ]);

  const submissionsMap = new Map((userSubs ?? []).map((s) => [s.mission_id, s]));
  const eligibleMissions: Array<Record<string, unknown>> = [];

  for (const mission of allMissions ?? []) {
    const eligible = profile?.center_id
      ? await isStudentEligibleForMission(supabaseAdmin, mission as MissionRow, user.id)
      : !mission.target_user_id || mission.target_user_id === user.id;

    if (!eligible) continue;

    const submission = submissionsMap.get(mission.id) ?? null;
    let rank: number | null = null;
    let rank_total: number | null = null;

    if (submission?.status === "done" && submission.correction?.note != null) {
      const { data: allSubs } = await supabaseAdmin
        .from("mission_submissions")
        .select("user_id, status, correction")
        .eq("mission_id", mission.id);

      const rankMap = computeRankings(allSubs ?? []);
      const r = rankMap.get(user.id);
      rank = r?.rank ?? null;
      rank_total = r?.total ?? null;
    }

    eligibleMissions.push({
      ...mission,
      submission,
      rank,
      rank_total,
    });
  }

  return NextResponse.json({ missions: eligibleMissions });
}
