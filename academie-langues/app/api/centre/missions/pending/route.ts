import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
} from "@/app/utils/trainerAcademicScope.server";

/** Liste toutes les soumissions en attente de correction manuelle du centre. */
export async function GET(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;

  const trainerScope = isTrainerLeastPrivilege(auth.ctx)
    ? await getTrainerAcademicScope(supabaseAdmin, auth.ctx.user.id, auth.ctx.centerId)
    : null;
  if (trainerScope?.empty) {
    return NextResponse.json({ items: [], count: 0, by_mission: {} });
  }

  const { data: missions } = await supabaseAdmin
    .from("missions")
    .select("id, title, filiere_matiere_id, correction_mode, formateur_id")
    .eq("center_id", auth.ctx.centerId);

  let missionList = missions ?? [];
  if (trainerScope) {
    missionList = missionList.filter(
      (m) =>
        m.formateur_id === auth.ctx.user.id
        || (m.filiere_matiere_id && trainerScope.filiereMatiereIds.has(m.filiere_matiere_id)),
    );
  }

  const missionIds = missionList.map((m) => m.id);
  if (missionIds.length === 0) {
    return NextResponse.json({ items: [], count: 0, by_mission: {} });
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

  let filteredSubs = subs ?? [];
  if (trainerScope && filteredSubs.length > 0) {
    const studentIds = [...new Set(filteredSubs.map((s) => s.user_id).filter(Boolean))];
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, groupe_id, filieres(center_id)")
      .in("student_id", studentIds)
      .in("status", ["active", "completed"]);

    const allowedStudents = new Set<string>();
    for (const e of enrollments || []) {
      const f = e.filieres as { center_id?: string } | { center_id?: string }[] | null;
      const c = Array.isArray(f) ? f[0]?.center_id : f?.center_id;
      if (!c || c !== auth.ctx.centerId) continue;
      if (e.groupe_id && trainerScope.groupeIds.has(e.groupe_id)) {
        allowedStudents.add(e.student_id);
      }
    }
    filteredSubs = filteredSubs.filter((s) => allowedStudents.has(s.user_id));
  }

  const userIds = [...new Set(filteredSubs.map((s) => s.user_id).filter(Boolean))];
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

  const missionById = new Map(missionList.map((m) => [m.id, m]));
  const filteredMissionIds = new Set(filteredSubs.map((s) => s.mission_id));

  const items = filteredSubs.map((s) => {
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
    .select("mission_id, status, user_id")
    .in("mission_id", missionIds);

  let allForStats = allSubs ?? [];
  if (trainerScope && allForStats.length > 0) {
    const studentIds = [...new Set(allForStats.map((s) => s.user_id).filter(Boolean))];
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, groupe_id, filieres(center_id)")
      .in("student_id", studentIds)
      .in("status", ["active", "completed"]);
    const allowedStudents = new Set<string>();
    for (const e of enrollments || []) {
      const f = e.filieres as { center_id?: string } | { center_id?: string }[] | null;
      const c = Array.isArray(f) ? f[0]?.center_id : f?.center_id;
      if (c && c !== auth.ctx.centerId) continue;
      if (e.groupe_id && trainerScope.groupeIds.has(e.groupe_id)) {
        allowedStudents.add(e.student_id);
      }
    }
    allForStats = allForStats.filter((s) => allowedStudents.has(s.user_id));
  }

  const by_mission: Record<string, { total: number; pending: number }> = {};
  for (const s of allForStats) {
    if (trainerScope && !filteredMissionIds.has(s.mission_id) && !missionIds.includes(s.mission_id)) {
      continue;
    }
    if (!by_mission[s.mission_id]) by_mission[s.mission_id] = { total: 0, pending: 0 };
    by_mission[s.mission_id].total++;
    if (s.status === "pending_review" || s.status === "correcting") {
      by_mission[s.mission_id].pending++;
    }
  }

  return NextResponse.json({ items, count: items.length, by_mission });
}
