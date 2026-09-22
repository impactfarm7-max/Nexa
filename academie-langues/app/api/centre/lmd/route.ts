import { NextResponse } from "next/server";
import { campusAllowed, getCenterStaffContext, requireCenterPermission, supabaseAdmin as db } from "@/app/utils/center-auth-server";
import { loadLmdProgress, loadOptionalUeInscriptions } from "@/app/utils/lmd-progress.server";
import { resolveLmdValidationThreshold } from "@/app/utils/lmd-credits";
import { diplomaBlockers, emptyAcademicCase, parseAcademicCase } from "@/app/utils/lmd-academic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
async function context(req: Request, enrollmentId: string) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return { error: auth.error };
  const ctx = auth.ctx;
  const permission = await requireCenterPermission(ctx, "etudiants");
  if (permission) return { error: permission };
  if (ctx.centerType !== "universite") return { error: fail("Parcours universitaire requis.") };
  const { data: source, error } = await db.from("enrollments")
    .select("id, student_id, filiere_id, niveau_id, semestre_id, campus_id, status, filieres!inner(center_id, type, name)")
    .eq("id", enrollmentId).single();
  if (error || !source) return { error: fail("Inscription introuvable.", 404) };
  const program = source.filieres as unknown as { center_id: string; type: string; name: string };
  if (program.center_id !== ctx.centerId || !campusAllowed(source.campus_id, ctx.scopedCampusIds)) return { error: fail("Accès refusé.", 403) };
  if (program.type !== "cursus") return { error: fail("Cursus requis.") };
  const { data: center, error: centerError } = await db.from("centers").select("name, lmd_validation_threshold_pct").eq("id", ctx.centerId).single();
  if (centerError) throw centerError;
  const progress = await loadLmdProgress(db, enrollmentId, resolveLmdValidationThreshold(center.lmd_validation_threshold_pct));
  return { ctx, source, program, center, progress };
}

export async function GET(req: Request) {
  try {
    const c = await context(req, new URL(req.url).searchParams.get("enrollment_id") || "");
    if (c.error) return c.error;
    if (!c.progress) return NextResponse.json({ progress: null });
    const { data: record, error } = await db.from("lmd_academic_records").select("id, revision, dossier, diploma, updated_at")
      .eq("student_id", c.source!.student_id).eq("filiere_id", c.source!.filiere_id).maybeSingle();
    const migrationRequired = !!error && ["42P01", "PGRST205"].includes(error.code);
    if (error && !migrationRequired) throw error;
    let events: { action: string; revision: number; created_at: string }[] = [];
    if (record) {
      const result = await db.from("lmd_academic_events").select("action, revision, created_at").eq("record_id", record.id).order("created_at", { ascending: false }).limit(20);
      if (result.error) throw result.error;
      events = result.data || [];
    }
    const { data: groups, error: groupError } = await db.from("groupes").select("id, nom, semestre_id").eq("filiere_id", c.source!.filiere_id).eq("niveau_id", c.source!.niveau_id);
    if (groupError) throw groupError;
    const ueInscriptions = await loadOptionalUeInscriptions(
      db,
      c.source!.id,
      c.source!.filiere_id,
      c.source!.semestre_id,
    );
    return NextResponse.json({
      progress: c.progress,
      record,
      events,
      groups,
      migrationRequired,
      canManage: ["center_manager", "manager", "campus_manager", "admin"].includes(c.ctx!.role),
      blockers: diplomaBlockers(record?.dossier || emptyAcademicCase, c.progress, new Date().toISOString().slice(0, 10)),
      ...ueInscriptions,
    });
  } catch (e) {
    console.error("[lmd] read", e);
    return fail("Impossible de charger le dossier LMD.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const c = await context(req, String(body.enrollment_id || ""));
    if (c.error) return c.error;
    if (!c.progress) return fail("Ce programme ne comporte pas de parcours LMD.");
    if (!["center_manager", "manager", "campus_manager", "admin"].includes(c.ctx!.role)) return fail("Confirmation du responsable requise.", 403);
    const source = c.source!;
    if (body.action === "semester") {
      if (source.status !== "active") return fail("Une inscription active est requise.");
      const semester = c.progress.semesters.find(s => s.id === body.semestre_id && s.niveau_id === source.niveau_id);
      if (!semester) return fail("Semestre hors du niveau actuel.");
      if (body.groupe_id) {
        const { data: group, error } = await db.from("groupes").select("id").eq("id", body.groupe_id).eq("filiere_id", source.filiere_id).eq("semestre_id", semester.id).maybeSingle();
        if (error) throw error;
        if (!group) return fail("Classe hors du semestre.");
      }
      const { error } = await db.from("enrollments").update({ semestre_id: semester.id, groupe_id: body.groupe_id || null }).eq("id", source.id).eq("status", "active");
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    if (body.action === "ue_choices") {
      if (source.status !== "active") return fail("Une inscription active est requise.");
      if (!source.semestre_id) return fail("Attribuez d'abord un semestre.");
      const requested: string[] = Array.isArray(body.ue_ids)
        ? body.ue_ids.map((id: unknown) => String(id))
        : [];
      const { data: optionalRows, error: optErr } = await db
        .from("filiere_matieres")
        .select("id")
        .eq("filiere_id", source.filiere_id)
        .eq("semestre_id", source.semestre_id)
        .eq("is_optional", true);
      if (optErr) {
        if (["42703", "PGRST204"].includes(optErr.code || "")) {
          return fail("Colonne is_optional absente — exécutez supabase-inscription-pedagogique-ue-2026-09-22.sql.", 503);
        }
        throw optErr;
      }
      const allowed = new Set<string>((optionalRows || []).map((r) => String(r.id)));
      const ueIds = requested.filter((id) => allowed.has(id));
      const uniqueUeIds = [...new Set(ueIds)];

      const { error: delErr } = await db
        .from("enrollment_ue_inscriptions")
        .delete()
        .eq("enrollment_id", source.id)
        .in("filiere_matiere_id", [...allowed]);
      if (delErr) {
        if (["42P01", "PGRST205"].includes(delErr.code || "")) {
          return fail("Table inscriptions UE absente — exécutez supabase-inscription-pedagogique-ue-2026-09-22.sql.", 503);
        }
        throw delErr;
      }

      if (uniqueUeIds.length) {
        const { error: insErr } = await db.from("enrollment_ue_inscriptions").insert(
          uniqueUeIds.map((filiere_matiere_id) => ({
            enrollment_id: source.id,
            filiere_matiere_id,
            created_by: c.ctx!.user.id,
          })),
        );
        if (insErr) throw insErr;
      }
      return NextResponse.json({ success: true, selectedUeIds: uniqueUeIds });
    }
    if (body.action === "recover") {
      if (source.status !== "active") return fail("Une inscription active est requise.");
      const ue = c.progress.debts.find(ue => ue.id === body.ue_id);
      const score = body.score;
      if (!ue || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > ue.max_score) return fail("UE en dette et note valide requises.");
      const { error } = await db.rpc("save_lmd_recovery", { p_enrollment: source.id, p_ue: ue.id, p_actor: c.ctx!.user.id, p_score: score });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }
    if (!["save", "issue"].includes(body.action)) return fail("Action inconnue.");
    if (!Number.isInteger(body.revision) || body.revision < 0) return fail("Version du dossier requise.");
    let dossier;
    try { dossier = parseAcademicCase(body.dossier); } catch (error) { return fail(error instanceof Error ? error.message : "Dossier invalide."); }
    let diploma = null;
    if (body.action === "issue") {
      if (body.confirm !== true) return fail("Confirmez explicitement la délivrance.");
      const blockers = diplomaBlockers(dossier, c.progress, new Date().toISOString().slice(0, 10));
      if (blockers.length) return fail(blockers.join(" "));
      const { data: student, error } = await db.from("profiles").select("prenom, nom, matricule").eq("id", source.student_id).single();
      if (error) throw error;
      diploma = { number: `NEXA-${new Date().getUTCFullYear()}-${crypto.randomUUID().toUpperCase()}`, issuedAt: new Date().toISOString(), issuedBy: c.ctx!.user.id,
        studentName: `${student.prenom || ""} ${student.nom || ""}`.trim(), matricule: student.matricule, centerName: c.center!.name,
        programName: c.program!.name, degree: dossier.degree, acquiredCredits: c.progress.acquiredCredits, totalCredits: c.progress.totalCredits,
        thesisTitle: dossier.degree === "doctorat" ? dossier.thesisTitle : null, defenseDate: dossier.degree === "doctorat" ? dossier.defenseDate : null };
    }
    const { data: record, error } = await db.rpc("save_lmd_academic_record", { p_student: source.student_id, p_filiere: source.filiere_id, p_center: c.ctx!.centerId, p_actor: c.ctx!.user.id, p_revision: body.revision, p_dossier: dossier, p_diploma: diploma });
    if (error) {
      if (/REVISION_CONFLICT|DIPLOMA_ALREADY_ISSUED/.test(error.message)) return fail("Le dossier a changé ou le diplôme est déjà émis. Rechargez le dossier.", 409);
      throw error;
    }
    return NextResponse.json({ success: true, record });
  } catch (e) {
    console.error("[lmd] write", e);
    return fail("Impossible d'enregistrer cette opération LMD.", 500);
  }
}
