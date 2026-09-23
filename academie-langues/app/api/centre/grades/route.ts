import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  assertTrainerGroupes,
  assertTrainerUe,
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
} from "@/app/utils/trainerAcademicScope.server";
import { normalizeGradeStatus } from "@/app/utils/gradeStatus";
import {
  insertGradeAuditEvents,
  newGradeAuditBatchId,
  snapshotFromGrade,
  type GradeAuditEventInput,
} from "@/app/utils/gradeAudit.server";
import { isAcademicStatusReadonly } from "@/app/utils/academic-status";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type GradeOp =
  | {
      op: "upsert";
      enrollment_id: string;
      grade_id?: string | null;
      score: number;
      max_score: number;
      title: string | null;
      comment?: string | null;
    }
  | { op: "delete"; grade_id: string };

async function loadTrainerScope(auth: NonNullable<Awaited<ReturnType<typeof getCenterStaffContext>>["ctx"]>) {
  if (!isTrainerLeastPrivilege(auth)) return null;
  return getTrainerAcademicScope(supabaseAdmin, auth.user.id, auth.centerId);
}

async function assertSessionAccess(
  auth: NonNullable<Awaited<ReturnType<typeof getCenterStaffContext>>["ctx"]>,
  filiereMatiereId: string,
  groupeId: string,
) {
  const scope = await loadTrainerScope(auth);
  if (!scope) return { scope: null as Awaited<ReturnType<typeof getTrainerAcademicScope>> | null, error: null as NextResponse | null };
  const ueErr = assertTrainerUe(scope, filiereMatiereId);
  if (ueErr) return { scope, error: fail(ueErr, 403) };
  if (groupeId) {
    const gErr = assertTrainerGroupes(scope, [groupeId]);
    if (gErr) return { scope, error: fail(gErr, 403) };
  }
  return { scope, error: null };
}

async function enrollmentIdsForGroupe(
  centerId: string,
  filiereMatiereId: string,
  groupeId: string,
): Promise<string[]> {
  const { data: fm } = await supabaseAdmin
    .from("filiere_matieres")
    .select("filiere_id, niveau_id, filieres(center_id)")
    .eq("id", filiereMatiereId)
    .maybeSingle();
  if (!fm) return [];
  const fil = fm.filieres as { center_id?: string } | { center_id?: string }[] | null;
  const c = Array.isArray(fil) ? fil[0]?.center_id : fil?.center_id;
  if (c !== centerId) return [];

  let q = supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("filiere_id", fm.filiere_id)
    .eq("groupe_id", groupeId)
    .eq("status", "active");
  if (fm.niveau_id) q = q.eq("niveau_id", fm.niveau_id);
  const { data } = await q;
  return (data || []).map((e) => e.id);
}

async function commitAudit(events: GradeAuditEventInput[]) {
  const res = await insertGradeAuditEvents(events);
  if (res.missingTable) {
    return fail(
      "Table grade_audit_events absente — exécutez supabase-grade-audit-events-2026-09-23.sql.",
      503,
    );
  }
  if (!res.ok) return fail(res.error || "Journal d'audit impossible.", 500);
  return null;
}

/** Vérifie la table d'audit avant toute mutation (évite notes écrites sans journal). */
async function ensureAuditTableReady(): Promise<NextResponse | null> {
  const { error } = await supabaseAdmin.from("grade_audit_events").select("id").limit(1);
  if (
    error &&
    (["42P01", "PGRST205"].includes(error.code || "") || /grade_audit_events/i.test(error.message || ""))
  ) {
    return fail(
      "Table grade_audit_events absente — exécutez supabase-grade-audit-events-2026-09-23.sql.",
      503,
    );
  }
  return null;
}

/**
 * POST body.action:
 * - (défaut) ops upsert/delete — nouvelles notes toujours provisional ; interdit si note déjà validated
 * - validate_session — UE + période + promo → validated
 * - reopen_session — même périmètre → provisional
 *
 * Optional: source ("import" | "manual"), batch_id (uuid) pour lier un import Excel.
 */
export async function POST(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireCenterPermission(auth.ctx, "examens");
  if (perm) return perm;

  try {
    const body = await req.json();
    const action = String(body.action || "save");
    const filiereMatiereId = String(body.filiere_matiere_id || "");
    const periodId = String(body.period_id || "");
    const groupeId = String(body.groupe_id || "");
    const source = String(body.source || "manual");
    const isImport = source === "import";
    const batchId = body.batch_id ? String(body.batch_id) : isImport ? newGradeAuditBatchId() : null;

    if (!filiereMatiereId || !periodId) return fail("filiere_matiere_id et period_id requis.");

    const auditReady = await ensureAuditTableReady();
    if (auditReady) return auditReady;

    const centerId = auth.ctx!.centerId;
    const actorId = auth.ctx!.user.id;

    if (action === "validate_session" || action === "reopen_session") {
      if (isTrainerLeastPrivilege(auth.ctx!)) {
        return fail("Validation / réouverture réservée à la scolarité.", 403);
      }
      if (!groupeId) return fail("groupe_id requis pour la session.");
      const { error: accessErr } = await assertSessionAccess(auth.ctx!, filiereMatiereId, groupeId);
      if (accessErr) return accessErr;

      const enrollmentIds = await enrollmentIdsForGroupe(centerId, filiereMatiereId, groupeId);
      if (!enrollmentIds.length) {
        return NextResponse.json({ ok: true, updated: 0, status: action === "validate_session" ? "validated" : "provisional" });
      }

      const { data: enrStatusRows } = await supabaseAdmin
        .from("enrollments")
        .select("id, academic_status")
        .in("id", enrollmentIds);
      const writableIds = (enrStatusRows || [])
        .filter((e) => !isAcademicStatusReadonly(e.academic_status))
        .map((e) => e.id);
      // Fallback if column missing: treat all as writable
      const sessionEnrollmentIds =
        enrStatusRows && enrStatusRows.length
          ? writableIds
          : enrollmentIds;
      if (!sessionEnrollmentIds.length) {
        return NextResponse.json({ ok: true, updated: 0, status: action === "validate_session" ? "validated" : "provisional" });
      }

      const nextStatus = action === "validate_session" ? "validated" : "provisional";
      const { data: beforeRows, error: beforeErr } = await supabaseAdmin
        .from("grades")
        .select("id, enrollment_id, score, max_score, title, status")
        .eq("filiere_matiere_id", filiereMatiereId)
        .eq("period_id", periodId)
        .in("enrollment_id", sessionEnrollmentIds);
      if (beforeErr) {
        if (["42703", "PGRST204"].includes(beforeErr.code || "") || /status/i.test(beforeErr.message || "")) {
          return fail("Colonne grades.status absente — exécutez supabase-grades-deliberation-status-2026-09-23.sql.", 503);
        }
        return fail(beforeErr.message, 500);
      }

      const { data, error } = await supabaseAdmin
        .from("grades")
        .update({ status: nextStatus })
        .eq("filiere_matiere_id", filiereMatiereId)
        .eq("period_id", periodId)
        .in("enrollment_id", sessionEnrollmentIds)
        .select("id, enrollment_id, score, max_score, title, status");
      if (error) {
        if (["42703", "PGRST204"].includes(error.code || "") || /status/i.test(error.message || "")) {
          return fail("Colonne grades.status absente — exécutez supabase-grades-deliberation-status-2026-09-23.sql.", 503);
        }
        return fail(error.message, 500);
      }

      const beforeById = new Map((beforeRows || []).map((g) => [g.id, g]));
      const auditAction = action === "validate_session" ? "validate_session" : "reopen_session";
      const events: GradeAuditEventInput[] = [
        {
          center_id: centerId,
          actor_id: actorId,
          action: auditAction,
          filiere_matiere_id: filiereMatiereId,
          period_id: periodId,
          groupe_id: groupeId,
          meta: { updated: (data || []).length, status: nextStatus },
        },
      ];
      for (const g of data || []) {
        const prev = beforeById.get(g.id);
        events.push({
          center_id: centerId,
          actor_id: actorId,
          action: auditAction,
          grade_id: g.id,
          enrollment_id: g.enrollment_id,
          filiere_matiere_id: filiereMatiereId,
          period_id: periodId,
          groupe_id: groupeId,
          before: prev ? snapshotFromGrade(prev) : null,
          after: snapshotFromGrade(g),
        });
      }
      const auditFail = await commitAudit(events);
      if (auditFail) {
        // Compenser : rétablir le statut précédent pour éviter session validée sans journal
        for (const [id, prev] of beforeById.entries()) {
          await supabaseAdmin
            .from("grades")
            .update({ status: prev.status ?? "provisional" })
            .eq("id", id);
        }
        return auditFail;
      }

      return NextResponse.json({
        ok: true,
        updated: (data || []).length,
        status: nextStatus,
      });
    }

    const ops: GradeOp[] = Array.isArray(body.ops) ? body.ops : [];
    if (!ops.length) return NextResponse.json({ results: [] });

    const { scope, error: accessErr } = await assertSessionAccess(auth.ctx!, filiereMatiereId, groupeId);
    if (accessErr) return accessErr;

    const enrollmentIds = [
      ...new Set(
        ops
          .filter((o): o is Extract<GradeOp, { op: "upsert" }> => o.op === "upsert")
          .map((o) => String(o.enrollment_id || ""))
          .filter(Boolean),
      ),
    ];

    if (enrollmentIds.length) {
      const { data: enrollments, error: enrErr } = await supabaseAdmin
        .from("enrollments")
        .select("id, groupe_id, filiere_id, academic_status, filieres(center_id)")
        .in("id", enrollmentIds);

      if (enrErr && /academic_status/i.test(enrErr.message || "")) {
        const fb = await supabaseAdmin
          .from("enrollments")
          .select("id, groupe_id, filiere_id, filieres(center_id)")
          .in("id", enrollmentIds);
        const byId = new Map((fb.data || []).map((e) => [e.id, { ...e, academic_status: null as string | null }]));
        for (const eid of enrollmentIds) {
          const e = byId.get(eid);
          if (!e) return fail("Inscription introuvable.", 404);
          const fil = e.filieres as { center_id?: string } | { center_id?: string }[] | null;
          const center = Array.isArray(fil) ? fil[0]?.center_id : fil?.center_id;
          if (!center || center !== centerId) return fail("Hors centre.", 403);
          if (scope) {
            if (!e.groupe_id || !scope.groupeIds.has(e.groupe_id)) {
              return fail("Hors de votre périmètre (promotion).", 403);
            }
            if (groupeId && e.groupe_id !== groupeId) {
              return fail("Inscription hors promotion sélectionnée.", 403);
            }
          }
        }
      } else {
        const byId = new Map((enrollments || []).map((e) => [e.id, e]));
        for (const eid of enrollmentIds) {
          const e = byId.get(eid);
          if (!e) return fail("Inscription introuvable.", 404);
          if (isAcademicStatusReadonly(e.academic_status)) {
            return fail("Inscription en lecture seule (suspendu / diplômé / transféré).", 403);
          }
          const fil = e.filieres as { center_id?: string } | { center_id?: string }[] | null;
          const center = Array.isArray(fil) ? fil[0]?.center_id : fil?.center_id;
          if (!center || center !== centerId) return fail("Hors centre.", 403);
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
    }

    // Verrou délibération : si une note de la session promo est déjà validée, tout le lot est bloqué
    if (groupeId) {
      const sessionEnrollmentIds = await enrollmentIdsForGroupe(centerId, filiereMatiereId, groupeId);
      if (sessionEnrollmentIds.length) {
        const { data: locked } = await supabaseAdmin
          .from("grades")
          .select("id")
          .eq("filiere_matiere_id", filiereMatiereId)
          .eq("period_id", periodId)
          .in("enrollment_id", sessionEnrollmentIds)
          .eq("status", "validated")
          .limit(1);
        if ((locked || []).length > 0) {
          return fail("Session validée — rouvrez pour modifier.", 403);
        }
      }
    }

    // Préflight : valider tout le lot avant la première écriture
    type PreparedOp =
      | {
          kind: "delete";
          existing: {
            id: string;
            enrollment_id: string;
            status: string | null;
            score: number | null;
            max_score: number | null;
            title: string | null;
            period_id: string | null;
            filiere_matiere_id: string;
            comment?: string | null;
            formateur_id?: string | null;
          };
        }
      | {
          kind: "update";
          existing: {
            id: string;
            enrollment_id: string;
            status: string | null;
            score: number | null;
            max_score: number | null;
            title: string | null;
          };
          enrollmentId: string;
          score: number;
          maxScore: number;
          title: string | null;
          comment: string | null;
        }
      | {
          kind: "insert";
          enrollmentId: string;
          score: number;
          maxScore: number;
          title: string | null;
          comment: string | null;
        };

    const prepared: PreparedOp[] = [];
    for (const raw of ops) {
      if (raw.op === "delete") {
        const gradeId = String(raw.grade_id || "");
        if (!gradeId) continue;
        const { data: existing } = await supabaseAdmin
          .from("grades")
          .select("id, filiere_matiere_id, enrollment_id, status, score, max_score, title, period_id, comment, formateur_id")
          .eq("id", gradeId)
          .maybeSingle();
        if (!existing) continue;
        if (existing.filiere_matiere_id !== filiereMatiereId) {
          return fail("Note hors UE.", 403);
        }
        if (normalizeGradeStatus(existing.status) === "validated") {
          return fail("Note validée — rouvrez la session pour modifier.", 403);
        }
        {
          const { data: enr } = await supabaseAdmin
            .from("enrollments")
            .select("groupe_id, academic_status")
            .eq("id", existing.enrollment_id)
            .maybeSingle();
          if (isAcademicStatusReadonly(enr?.academic_status)) {
            return fail("Inscription en lecture seule (suspendu / diplômé / transféré).", 403);
          }
          if (scope) {
            const ueErr = assertTrainerUe(scope, existing.filiere_matiere_id);
            if (ueErr) return fail(ueErr, 403);
            if (!enr?.groupe_id || !scope.groupeIds.has(enr.groupe_id)) {
              return fail("Hors de votre périmètre (promotion).", 403);
            }
          }
        }
        prepared.push({ kind: "delete", existing });
        continue;
      }

      if (raw.op !== "upsert") continue;
      const enrollmentId = String(raw.enrollment_id || "");
      const score = Number(raw.score);
      const maxScore = Number(raw.max_score);
      const title = raw.title == null || raw.title === "" ? null : String(raw.title).trim();
      const comment = raw.comment == null || raw.comment === "" ? null : String(raw.comment).trim();
      if (!enrollmentId || !Number.isFinite(score) || score < 0) continue;
      if (!Number.isFinite(maxScore) || maxScore <= 0) return fail("Barème invalide.");
      if (score > maxScore) return fail(`Note > barème /${maxScore}`);

      const gradeId = raw.grade_id ? String(raw.grade_id) : null;
      if (gradeId) {
        const { data: existing } = await supabaseAdmin
          .from("grades")
          .select("id, enrollment_id, filiere_matiere_id, status, score, max_score, title")
          .eq("id", gradeId)
          .maybeSingle();
        if (!existing || existing.filiere_matiere_id !== filiereMatiereId) {
          return fail("Note hors UE.", 403);
        }
        if (normalizeGradeStatus(existing.status) === "validated") {
          return fail("Note validée — rouvrez la session pour modifier.", 403);
        }
        if (scope) {
          const { data: enr } = await supabaseAdmin
            .from("enrollments")
            .select("groupe_id")
            .eq("id", existing.enrollment_id)
            .maybeSingle();
          if (!enr?.groupe_id || !scope.groupeIds.has(enr.groupe_id)) {
            return fail("Hors de votre périmètre (promotion).", 403);
          }
        }
        prepared.push({ kind: "update", existing, enrollmentId, score, maxScore, title, comment });
      } else {
        prepared.push({ kind: "insert", enrollmentId, score, maxScore, title, comment });
      }
    }

    const results: { op: string; grade_id: string | null; enrollment_id?: string; title?: string | null; status?: string }[] = [];
    const auditEvents: GradeAuditEventInput[] = [];
    type Undo =
      | { kind: "reinsert"; row: Record<string, unknown> }
      | { kind: "restore"; id: string; before: Record<string, unknown> }
      | { kind: "delete"; id: string };
    const undos: Undo[] = [];

    if (isImport && batchId) {
      auditEvents.push({
        center_id: centerId,
        actor_id: actorId,
        action: "import",
        filiere_matiere_id: filiereMatiereId,
        period_id: periodId,
        groupe_id: groupeId || null,
        batch_id: batchId,
        meta: { ops: ops.length },
      });
    }

    for (const step of prepared) {
      if (step.kind === "delete") {
        const { existing } = step;
        const { error } = await supabaseAdmin.from("grades").delete().eq("id", existing.id);
        if (error) {
          for (const u of [...undos].reverse()) {
            if (u.kind === "delete") await supabaseAdmin.from("grades").delete().eq("id", u.id);
            if (u.kind === "restore") await supabaseAdmin.from("grades").update(u.before).eq("id", u.id);
            if (u.kind === "reinsert") await supabaseAdmin.from("grades").insert(u.row);
          }
          return fail(error.message, 500);
        }
        undos.push({
          kind: "reinsert",
          row: {
            id: existing.id,
            enrollment_id: existing.enrollment_id,
            filiere_matiere_id: existing.filiere_matiere_id,
            period_id: existing.period_id || periodId,
            score: existing.score,
            max_score: existing.max_score,
            title: existing.title,
            status: existing.status ?? "provisional",
            comment: existing.comment ?? null,
            formateur_id: existing.formateur_id ?? actorId,
          },
        });
        results.push({ op: "delete", grade_id: existing.id });
        auditEvents.push({
          center_id: centerId,
          actor_id: actorId,
          action: "delete",
          grade_id: existing.id,
          enrollment_id: existing.enrollment_id,
          filiere_matiere_id: filiereMatiereId,
          period_id: existing.period_id || periodId,
          groupe_id: groupeId || null,
          batch_id: batchId,
          before: snapshotFromGrade(existing),
          after: null,
        });
        continue;
      }

      if (step.kind === "update") {
        const { existing, enrollmentId, score, maxScore, title, comment } = step;
        const { error } = await supabaseAdmin
          .from("grades")
          .update({
            score,
            max_score: maxScore,
            title,
            comment,
            status: "provisional",
            formateur_id: actorId,
          })
          .eq("id", existing.id)
          .eq("filiere_matiere_id", filiereMatiereId);
        if (error) {
          for (const u of [...undos].reverse()) {
            if (u.kind === "delete") await supabaseAdmin.from("grades").delete().eq("id", u.id);
            if (u.kind === "restore") await supabaseAdmin.from("grades").update(u.before).eq("id", u.id);
            if (u.kind === "reinsert") await supabaseAdmin.from("grades").insert(u.row);
          }
          if (["42703", "PGRST204"].includes(error.code || "") || /status/i.test(error.message || "")) {
            return fail("Colonne grades.status absente — exécutez supabase-grades-deliberation-status-2026-09-23.sql.", 503);
          }
          return fail(error.message, 500);
        }
        undos.push({
          kind: "restore",
          id: existing.id,
          before: {
            score: existing.score,
            max_score: existing.max_score,
            title: existing.title,
            status: existing.status ?? "provisional",
          },
        });
        results.push({ op: "upsert", grade_id: existing.id, enrollment_id: enrollmentId, title, status: "provisional" });
        auditEvents.push({
          center_id: centerId,
          actor_id: actorId,
          action: "update",
          grade_id: existing.id,
          enrollment_id: enrollmentId,
          filiere_matiere_id: filiereMatiereId,
          period_id: periodId,
          groupe_id: groupeId || null,
          batch_id: batchId,
          before: snapshotFromGrade(existing),
          after: { score, max_score: maxScore, title, status: "provisional" },
          meta: isImport ? { source: "import" } : {},
        });
        continue;
      }

      const { enrollmentId, score, maxScore, title, comment } = step;
      const { data: inserted, error } = await supabaseAdmin
        .from("grades")
        .insert({
          enrollment_id: enrollmentId,
          filiere_matiere_id: filiereMatiereId,
          period_id: periodId,
          formateur_id: actorId,
          score,
          max_score: maxScore,
          title,
          comment,
          status: "provisional",
        })
        .select("id")
        .single();
      if (error || !inserted) {
        for (const u of [...undos].reverse()) {
          if (u.kind === "delete") await supabaseAdmin.from("grades").delete().eq("id", u.id);
          if (u.kind === "restore") await supabaseAdmin.from("grades").update(u.before).eq("id", u.id);
          if (u.kind === "reinsert") await supabaseAdmin.from("grades").insert(u.row);
        }
        if (error && (["42703", "PGRST204"].includes(error.code || "") || /status/i.test(error.message || ""))) {
          return fail("Colonne grades.status absente — exécutez supabase-grades-deliberation-status-2026-09-23.sql.", 503);
        }
        return fail(error?.message || "Insertion impossible.", 500);
      }
      undos.push({ kind: "delete", id: inserted.id });
      results.push({ op: "upsert", grade_id: inserted.id, enrollment_id: enrollmentId, title, status: "provisional" });
      auditEvents.push({
        center_id: centerId,
        actor_id: actorId,
        action: "create",
        grade_id: inserted.id,
        enrollment_id: enrollmentId,
        filiere_matiere_id: filiereMatiereId,
        period_id: periodId,
        groupe_id: groupeId || null,
        batch_id: batchId,
        before: null,
        after: { score, max_score: maxScore, title, status: "provisional" },
        meta: isImport ? { source: "import" } : {},
      });
    }

    if (isImport && batchId && auditEvents[0]?.action === "import") {
      auditEvents[0] = {
        ...auditEvents[0],
        meta: { ops: ops.length, touched: results.length },
      };
    }

    const auditFail = await commitAudit(auditEvents);
    if (auditFail) {
      for (const u of [...undos].reverse()) {
        if (u.kind === "delete") await supabaseAdmin.from("grades").delete().eq("id", u.id);
        if (u.kind === "restore") await supabaseAdmin.from("grades").update(u.before).eq("id", u.id);
        if (u.kind === "reinsert") await supabaseAdmin.from("grades").insert(u.row);
      }
      return auditFail;
    }

    return NextResponse.json({ results, batch_id: batchId });
  } catch (e) {
    console.error("[centre/grades POST]", e);
    return fail("Enregistrement impossible.", 500);
  }
}
