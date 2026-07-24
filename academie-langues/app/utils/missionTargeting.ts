import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type MissionRow = {
  id: string;
  center_id: string | null;
  target_user_id?: string | null;
  groupe_id?: string | null;
  filiere_matiere_id?: string | null;
  correction_mode?: string | null;
};

export type EligibleStudent = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email?: string | null;
};

function normalizeProfile(
  profiles: EligibleStudent | EligibleStudent[] | null | undefined
): EligibleStudent | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

export async function loadMissionTargeting(
  supabase: SupabaseClient,
  missionId: string
): Promise<{ groupeIds: string[]; studentIds: string[] }> {
  const [{ data: grps }, { data: studs }] = await Promise.all([
    supabase.from("mission_groupes").select("groupe_id").eq("mission_id", missionId),
    supabase.from("mission_students").select("user_id").eq("mission_id", missionId),
  ]);
  return {
    groupeIds: (grps ?? []).map((g) => g.groupe_id),
    studentIds: (studs ?? []).map((s) => s.user_id),
  };
}

export async function getEligibleStudentsForMission(
  supabase: SupabaseClient,
  mission: MissionRow
): Promise<EligibleStudent[]> {
  if (!mission.center_id) return [];

  const { groupeIds, studentIds: explicitStudentIds } = await loadMissionTargeting(supabase, mission.id);

  if (explicitStudentIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, prenom, nom, email")
      .in("id", explicitStudentIds)
      .eq("center_id", mission.center_id)
      .eq("role", "student");
    return data ?? [];
  }

  if (mission.target_user_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, prenom, nom, email")
      .eq("id", mission.target_user_id)
      .maybeSingle();
    return data ? [data] : [];
  }

  const groupeFilter = groupeIds.length > 0 ? groupeIds : mission.groupe_id ? [mission.groupe_id] : [];

  let enrollQuery = supabase
    .from("enrollments")
    .select("student_id, profiles:student_id(id, prenom, nom, email)")
    .eq("status", "active");

  if (groupeFilter.length > 0) {
    enrollQuery = enrollQuery.in("groupe_id", groupeFilter);
  } else if (mission.filiere_matiere_id) {
    const { data: fm } = await supabase
      .from("filiere_matieres")
      .select("filiere_id, niveau_id")
      .eq("id", mission.filiere_matiere_id)
      .maybeSingle();
    if (fm) {
      enrollQuery = enrollQuery.eq("filiere_id", fm.filiere_id);
      if (fm.niveau_id) enrollQuery = enrollQuery.eq("niveau_id", fm.niveau_id);
    }
  } else {
    enrollQuery = enrollQuery.eq("filiere_id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: enrollments } = await enrollQuery;
  const map = new Map<string, EligibleStudent>();
  for (const e of enrollments ?? []) {
    const row = e as { student_id?: string; profiles?: EligibleStudent | EligibleStudent[] | null };
    const p = normalizeProfile(row.profiles);
    if (p?.id) map.set(p.id, p);
  }
  return Array.from(map.values());
}

export async function isStudentEligibleForMission(
  supabase: SupabaseClient,
  mission: MissionRow,
  userId: string
): Promise<boolean> {
  if (!mission.center_id) return !mission.target_user_id;
  const eligible = await getEligibleStudentsForMission(supabase, mission);
  return eligible.some((s) => s.id === userId);
}

export function computeRankings(
  submissions: Array<{ user_id: string; correction?: { note?: number } | null; status: string }>
) {
  const scored = submissions
    .filter((s) => s.status === "done" && s.correction?.note != null)
    .map((s) => ({ user_id: s.user_id, note: Number(s.correction!.note) }))
    .sort((a, b) => b.note - a.note);

  const rankMap = new Map<string, { rank: number; total: number }>();
  let rank = 0;
  let prevNote: number | null = null;
  for (let i = 0; i < scored.length; i++) {
    if (prevNote === null || scored[i].note !== prevNote) {
      rank = i + 1;
      prevNote = scored[i].note;
    }
    rankMap.set(scored[i].user_id, { rank, total: scored.length });
  }
  return rankMap;
}
