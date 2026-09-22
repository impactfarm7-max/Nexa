import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  assertTrainerGroupes,
  assertTrainerUe,
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
} from "@/app/utils/trainerAcademicScope.server";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type GradeOp =
  | {
      op: "upsert";
      enrollment_id: string;
      grade_id?: string | null;
      score: number;
      max_score: number;
      title: string | null;
    }
  | { op: "delete"; grade_id: string };

/**
 * Enregistrement notes — formateur univ limité à ses UE + promotions.
 * Managers / staff non-trainer : inchangé (tout le centre).
 */
export async function POST(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireCenterPermission(auth.ctx, "examens");
  if (perm) return perm;

  try {
    const body = await req.json();
    const filiereMatiereId = String(body.filiere_matiere_id || "");
    const periodId = String(body.period_id || "");
    const groupeId = String(body.groupe_id || "");
    const ops: GradeOp[] = Array.isArray(body.ops) ? body.ops : [];

    if (!filiereMatiereId || !periodId) return fail("filiere_matiere_id et period_id requis.");
    if (!ops.length) return NextResponse.json({ results: [] });

    let scope = null as Awaited<ReturnType<typeof getTrainerAcademicScope>> | null;
    if (isTrainerLeastPrivilege(auth.ctx)) {
      scope = await getTrainerAcademicScope(supabaseAdmin, auth.ctx.user.id, auth.ctx.centerId);
      const ueErr = assertTrainerUe(scope, filiereMatiereId);
      if (ueErr) return fail(ueErr, 403);
      if (groupeId) {
        const gErr = assertTrainerGroupes(scope, [groupeId]);
        if (gErr) return fail(gErr, 403);
      }
    }

    const enrollmentIds = [
      ...new Set(
        ops
          .filter((o): o is Extract<GradeOp, { op: "upsert" }> => o.op === "upsert")
          .map((o) => String(o.enrollment_id || ""))
          .filter(Boolean),
      ),
    ];

    if (enrollmentIds.length) {
      const { data: enrollments } = await supabaseAdmin
        .from("enrollments")
        .select("id, groupe_id, filiere_id, filieres(center_id)")
        .in("id", enrollmentIds);

      const byId = new Map((enrollments || []).map((e) => [e.id, e]));
      for (const eid of enrollmentIds) {
        const e = byId.get(eid);
        if (!e) return fail("Inscription introuvable.", 404);
        const fil = e.filieres as { center_id?: string } | { center_id?: string }[] | null;
        const center = Array.isArray(fil) ? fil[0]?.center_id : fil?.center_id;
        if (!center || center !== auth.ctx.centerId) return fail("Hors centre.", 403);
        if (scope) {
          if (!e.groupe_id || !scope.groupeIds.has(e.groupe_id)) {
            return fail("Hors de votre périmètre (promotion).", 403);
          }
          if (groupeId && e.groupe_id !== groupeId) {
            return fail("Inscription hors promotion sélectionnée.", 403);
          }
        }
      }
    }

    const results: { op: string; grade_id: string | null; enrollment_id?: string; title?: string | null }[] = [];

    for (const raw of ops) {
      if (raw.op === "delete") {
        const gradeId = String(raw.grade_id || "");
        if (!gradeId) continue;
        const { data: existing } = await supabaseAdmin
          .from("grades")
          .select("id, filiere_matiere_id, enrollment_id")
          .eq("id", gradeId)
          .maybeSingle();
        if (!existing) continue;
        if (existing.filiere_matiere_id !== filiereMatiereId) {
          return fail("Note hors UE.", 403);
        }
        if (scope) {
          const ueErr = assertTrainerUe(scope, existing.filiere_matiere_id);
          if (ueErr) return fail(ueErr, 403);
          const { data: enr } = await supabaseAdmin
            .from("enrollments")
            .select("groupe_id")
            .eq("id", existing.enrollment_id)
            .maybeSingle();
          if (!enr?.groupe_id || !scope.groupeIds.has(enr.groupe_id)) {
            return fail("Hors de votre périmètre (promotion).", 403);
          }
        }
        const { error } = await supabaseAdmin.from("grades").delete().eq("id", gradeId);
        if (error) return fail(error.message, 500);
        results.push({ op: "delete", grade_id: gradeId });
        continue;
      }

      if (raw.op !== "upsert") continue;
      const enrollmentId = String(raw.enrollment_id || "");
      const score = Number(raw.score);
      const maxScore = Number(raw.max_score);
      const title = raw.title == null || raw.title === "" ? null : String(raw.title).trim();
      if (!enrollmentId || !Number.isFinite(score) || score < 0) continue;
      if (!Number.isFinite(maxScore) || maxScore <= 0) return fail("Barème invalide.");
      if (score > maxScore) return fail(`Note > barème /${maxScore}`);

      const gradeId = raw.grade_id ? String(raw.grade_id) : null;
      if (gradeId) {
        if (scope) {
          const { data: existing } = await supabaseAdmin
            .from("grades")
            .select("id, enrollment_id, filiere_matiere_id")
            .eq("id", gradeId)
            .maybeSingle();
          if (!existing || existing.filiere_matiere_id !== filiereMatiereId) {
            return fail("Note hors UE.", 403);
          }
          const { data: enr } = await supabaseAdmin
            .from("enrollments")
            .select("groupe_id")
            .eq("id", existing.enrollment_id)
            .maybeSingle();
          if (!enr?.groupe_id || !scope.groupeIds.has(enr.groupe_id)) {
            return fail("Hors de votre périmètre (promotion).", 403);
          }
        }
        const { error } = await supabaseAdmin
          .from("grades")
          .update({ score, max_score: maxScore, title })
          .eq("id", gradeId)
          .eq("filiere_matiere_id", filiereMatiereId);
        if (error) return fail(error.message, 500);
        results.push({ op: "upsert", grade_id: gradeId, enrollment_id: enrollmentId, title });
      } else {
        const { data: inserted, error } = await supabaseAdmin
          .from("grades")
          .insert({
            enrollment_id: enrollmentId,
            filiere_matiere_id: filiereMatiereId,
            period_id: periodId,
            formateur_id: auth.ctx.user.id,
            score,
            max_score: maxScore,
            title,
          })
          .select("id")
          .single();
        if (error || !inserted) return fail(error?.message || "Insertion impossible.", 500);
        results.push({ op: "upsert", grade_id: inserted.id, enrollment_id: enrollmentId, title });
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error("[centre/grades POST]", e);
    return fail("Enregistrement impossible.", 500);
  }
}
