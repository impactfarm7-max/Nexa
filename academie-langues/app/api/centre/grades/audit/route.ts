import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
} from "@/app/utils/trainerAcademicScope.server";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * GET /api/centre/grades/audit
 * Query: grade_id | enrollment_id | filiere_matiere_id, period_id, groupe_id, actor_id, action, from, to, limit, offset
 */
export async function GET(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireCenterPermission(auth.ctx, "examens");
  if (perm) return perm;

  const url = new URL(req.url);
  const gradeId = url.searchParams.get("grade_id") || "";
  const enrollmentId = url.searchParams.get("enrollment_id") || "";
  const filiereMatiereId = url.searchParams.get("filiere_matiere_id") || "";
  const periodId = url.searchParams.get("period_id") || "";
  const groupeId = url.searchParams.get("groupe_id") || "";
  const actorId = url.searchParams.get("actor_id") || "";
  const action = url.searchParams.get("action") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  try {
    let scope: Awaited<ReturnType<typeof getTrainerAcademicScope>> | null = null;
    if (isTrainerLeastPrivilege(auth.ctx!)) {
      scope = await getTrainerAcademicScope(supabaseAdmin, auth.ctx!.user.id, auth.ctx!.centerId);
      if (scope.empty) return NextResponse.json({ events: [], total: 0 });
    }

    let q = supabaseAdmin
      .from("grade_audit_events")
      .select(
        "id, actor_id, action, grade_id, enrollment_id, filiere_matiere_id, period_id, groupe_id, batch_id, before, after, meta, created_at",
        { count: "exact" },
      )
      .eq("center_id", auth.ctx!.centerId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (gradeId) q = q.eq("grade_id", gradeId);
    if (enrollmentId) q = q.eq("enrollment_id", enrollmentId);
    if (filiereMatiereId) q = q.eq("filiere_matiere_id", filiereMatiereId);
    if (periodId) q = q.eq("period_id", periodId);
    if (groupeId) q = q.eq("groupe_id", groupeId);
    if (actorId) q = q.eq("actor_id", actorId);
    if (action) q = q.eq("action", action);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);

    if (scope) {
      const ueIds = [...scope.filiereMatiereIds];
      const gIds = [...scope.groupeIds];
      if (!ueIds.length) return NextResponse.json({ events: [], total: 0 });
      q = q.in("filiere_matiere_id", ueIds);
      if (gIds.length) q = q.or(`groupe_id.is.null,groupe_id.in.(${gIds.join(",")})`);
    }

    const { data, error, count } = await q;
    if (error) {
      if (["42P01", "PGRST205"].includes(error.code || "") || /grade_audit_events/i.test(error.message || "")) {
        return fail("Table grade_audit_events absente — exécutez supabase-grade-audit-events-2026-09-23.sql.", 503);
      }
      return fail(error.message, 500);
    }

    const events = data || [];
    const actorIds = [...new Set(events.map((e) => e.actor_id).filter(Boolean))];
    const enrollmentIds = [...new Set(events.map((e) => e.enrollment_id).filter(Boolean))] as string[];
    const ueIds = [...new Set(events.map((e) => e.filiere_matiere_id).filter(Boolean))] as string[];

    const [{ data: actors }, { data: enrollments }, { data: ues }] = await Promise.all([
      actorIds.length
        ? supabaseAdmin.from("profiles").select("id, prenom, nom").in("id", actorIds)
        : Promise.resolve({ data: [] as { id: string; prenom: string | null; nom: string | null }[] }),
      enrollmentIds.length
        ? supabaseAdmin
            .from("enrollments")
            .select("id, student_id, profiles:student_id(prenom, nom, matricule)")
            .in("id", enrollmentIds)
        : Promise.resolve({ data: [] as unknown[] }),
      ueIds.length
        ? supabaseAdmin
            .from("filiere_matieres")
            .select("id, exam_disciplines(name)")
            .in("id", ueIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const actorMap = new Map(
      (actors || []).map((a) => [a.id, `${a.prenom || ""} ${a.nom || ""}`.trim() || a.id]),
    );
    const studentMap = new Map<string, { name: string; matricule: string | null }>();
    for (const e of enrollments || []) {
      const row = e as {
        id: string;
        profiles?: { prenom?: string; nom?: string; matricule?: string | null } | { prenom?: string; nom?: string; matricule?: string | null }[] | null;
      };
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      studentMap.set(row.id, {
        name: `${p?.prenom || ""} ${p?.nom || ""}`.trim() || "—",
        matricule: p?.matricule ?? null,
      });
    }
    const ueMap = new Map<string, string>();
    for (const u of ues || []) {
      const row = u as {
        id: string;
        exam_disciplines?: { name?: string } | { name?: string }[] | null;
      };
      const d = Array.isArray(row.exam_disciplines) ? row.exam_disciplines[0] : row.exam_disciplines;
      ueMap.set(row.id, d?.name || "—");
    }

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        actor_name: actorMap.get(e.actor_id) || e.actor_id,
        student_name: e.enrollment_id ? studentMap.get(e.enrollment_id)?.name || null : null,
        student_matricule: e.enrollment_id ? studentMap.get(e.enrollment_id)?.matricule || null : null,
        ue_name: e.filiere_matiere_id ? ueMap.get(e.filiere_matiere_id) || null : null,
      })),
      total: count ?? events.length,
      limit,
      offset,
    });
  } catch (e) {
    console.error("[centre/grades/audit GET]", e);
    return fail("Lecture journal impossible.", 500);
  }
}
