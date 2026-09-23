import { NextRequest, NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  resolveSignupGroupeId,
} from "@/app/utils/studentClassroom.server";
import {
  computeMoyenneGenerale,
  isCursusFeeMode,
  isPassageDecision,
  nextAcademicYear,
  normalizePassageReason,
  resolveCursusTuition,
  suggestPassage,
  type PassageDecision,
} from "@/app/utils/cursus-passage";
import {
  parsePaymentPlanInstallments,
  scaleInstallmentsToTotal,
  sumPaymentPlanFees,
} from "@/app/utils/short-pricing";
import { parseGradeWeights } from "@/app/utils/gradesCalc";
import { loadLmdProgress } from "@/app/utils/lmd-progress.server";
import { resolveLmdValidationThreshold } from "@/app/utils/lmd-credits";
import { academicStatusAfterPassage, isAcademicStatusReadonly } from "@/app/utils/academic-status";
import { normalizeGradeStatus } from "@/app/utils/gradeStatus";

type PassageLocale = "fr" | "en";

async function countProvisionalGrades(enrollmentId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("grades")
    .select("id, status")
    .eq("enrollment_id", enrollmentId);
  if (error) {
    // Colonne status absente → traiter comme tout validé (compat)
    if (["42703", "PGRST204"].includes(error.code || "") || /status/i.test(error.message || "")) {
      return 0;
    }
    throw error;
  }
  return (data || []).filter((g) => normalizeGradeStatus(g.status) === "provisional").length;
}

function reqLocale(req: Request): PassageLocale {
  return req.headers.get("x-nexa-locale") === "en" ? "en" : "fr";
}

function msg(locale: PassageLocale, fr: string, en: string) {
  return locale === "en" ? en : fr;
}

function jsonErr(
  locale: PassageLocale,
  status: number,
  fr: string,
  en: string,
  code?: string,
) {
  return NextResponse.json(
    { error: msg(locale, fr, en), ...(code ? { code } : {}) },
    { status },
  );
}

/**
 * POST /api/centre/passage-niveau
 * Cursus uniquement — décision de fin de niveau (admis / redouble / ajourne).
 * action: "reopen" → annule uniquement un ajournement (pas de nouvelle inscription créée).
 * N'altère pas TCF ni formation_courte.
 * Locale: header x-nexa-locale=en|fr
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  const locale = reqLocale(req);

  try {
    const body = await req.json();
    const enrollmentId = String(body.enrollment_id || "").trim();
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!enrollmentId) {
      return jsonErr(locale, 400, "enrollment_id requis.", "enrollment_id is required.", "MISSING_ENROLLMENT_ID");
    }

    // ── Annuler un ajournement uniquement (réouvre l'inscription) ───────────
    if (action === "reopen") {
      const { data: source, error: srcErr } = await supabaseAdmin
        .from("enrollments")
        .select(`
          id, status, passage_decision,
          filieres!inner(center_id, type)
        `)
        .eq("id", enrollmentId)
        .maybeSingle();

      if (srcErr || !source) {
        return jsonErr(locale, 404, "Inscription introuvable.", "Enrollment not found.", "NOT_FOUND");
      }

      const filiere = source.filieres as unknown as { center_id: string; type: string };
      if (filiere.center_id !== ctx!.centerId) {
        return jsonErr(locale, 403, "Hors de votre centre.", "Outside your center.", "FORBIDDEN");
      }
      if (filiere.type !== "cursus") {
        return jsonErr(
          locale,
          400,
          "Le passage de niveau concerne uniquement les cursus pluriannuels.",
          "Level progression only applies to multi-year programs.",
          "NOT_CURSUS",
        );
      }
      if (source.passage_decision !== "ajourne") {
        return jsonErr(
          locale,
          409,
          "Seule une décision « ajourné » peut être annulée ainsi (aucune nouvelle inscription créée).",
          "Only a deferred decision can be cancelled this way (no new enrollment is created).",
          "REOPEN_NOT_DEFERRED",
        );
      }

      const { error: reopenErr } = await supabaseAdmin
        .from("enrollments")
        .update({
          status: "active",
          passage_decision: null,
          passage_reason: null,
          passage_decided_at: null,
          passage_decided_by: null,
        })
        .eq("id", enrollmentId);

      if (reopenErr) {
        // Colonne motif absente → retry sans passage_reason
        if (/passage_reason/i.test(reopenErr.message)) {
          const { error: retryErr } = await supabaseAdmin
            .from("enrollments")
            .update({
              status: "active",
              passage_decision: null,
              passage_decided_at: null,
              passage_decided_by: null,
            })
            .eq("id", enrollmentId);
          if (retryErr) {
            return NextResponse.json({ error: retryErr.message }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: reopenErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, reopened: true, enrollment_id: enrollmentId });
    }

    const decisionRaw = body.decision;
    const academicYearOverride =
      typeof body.academic_year === "string" ? body.academic_year.trim() : "";
    const groupeId = body.groupe_id || null;
    const campusId = body.campus_id || null;

    if (!isPassageDecision(decisionRaw)) {
      return jsonErr(
        locale,
        400,
        "enrollment_id et decision (admis|redouble|ajourne) requis.",
        "enrollment_id and decision (admis|redouble|ajourne) are required.",
        "INVALID_DECISION",
      );
    }
    const decision: PassageDecision = decisionRaw;

    const reasonNorm = normalizePassageReason(decision, body.reason ?? body.passage_reason);
    if (!reasonNorm.ok) {
      return jsonErr(
        locale,
        400,
        "Indiquez un motif (3 caractères minimum) pour cette décision.",
        "Enter a reason (at least 3 characters) for this decision.",
        reasonNorm.code,
      );
    }
    const passageReason = reasonNorm.reason;

    const { data: source, error: srcErr } = await supabaseAdmin
      .from("enrollments")
      .select(`
        id, student_id, filiere_id, niveau_id, groupe_id, campus_id, status,
        tuition_fee, academic_year, academic_status, passage_decision,
        filieres!inner(id, center_id, type, default_tuition_fee, cursus_fee_mode, payment_plan),
        niveaux(id, annee, tuition_fee, seuil_passage)
      `)
      .eq("id", enrollmentId)
      .maybeSingle();

    if (srcErr || !source) {
      return jsonErr(locale, 404, "Inscription introuvable.", "Enrollment not found.", "NOT_FOUND");
    }

    if (isAcademicStatusReadonly((source as { academic_status?: string | null }).academic_status)) {
      return jsonErr(
        locale,
        403,
        "Inscription en lecture seule (suspendu / diplômé / transféré).",
        "Enrollment is read-only (suspended / graduated / transferred).",
        "ACADEMIC_READONLY",
      );
    }

    const filiere = source.filieres as unknown as {
      id: string;
      center_id: string;
      type: string;
      default_tuition_fee: number | null;
      cursus_fee_mode: string | null;
      payment_plan: unknown;
    };
    const niveau = source.niveaux as unknown as {
      id: string;
      annee: number | null;
      tuition_fee: number | null;
      seuil_passage: number | null;
    } | null;

    if (filiere.center_id !== ctx!.centerId) {
      return jsonErr(locale, 403, "Hors de votre centre.", "Outside your center.", "FORBIDDEN");
    }
    if (filiere.type !== "cursus") {
      return jsonErr(
        locale,
        400,
        "Le passage de niveau concerne uniquement les cursus pluriannuels.",
        "Level progression only applies to multi-year programs.",
        "NOT_CURSUS",
      );
    }
    if (source.passage_decision) {
      return jsonErr(
        locale,
        409,
        "Une décision a déjà été prise pour cette inscription.",
        "A decision has already been made for this enrollment.",
        "ALREADY_DECIDED",
      );
    }
    if (!source.niveau_id || !niveau) {
      return jsonErr(locale, 400, "Niveau manquant sur cette inscription.", "Level missing on this enrollment.", "MISSING_LEVEL");
    }

    const provisionalCount = await countProvisionalGrades(enrollmentId);
    if (provisionalCount > 0) {
      return jsonErr(
        locale,
        409,
        `Impossible de décider le passage : ${provisionalCount} note(s) encore provisoire(s). Validez la session dans Examens → Notes.`,
        `Cannot decide progression: ${provisionalCount} grade(s) still provisional. Validate the session in Exams → Grades.`,
        "GRADES_PROVISIONAL",
      );
    }

    // Moyenne informative (ne bloque pas la décision manager)
    const { data: fmRows } = await supabaseAdmin
      .from("filiere_matieres")
      .select("id, coefficient, max_score, grade_weights")
      .eq("filiere_id", source.filiere_id)
      .eq("niveau_id", source.niveau_id);

    const gradeSelect = await supabaseAdmin
      .from("grades")
      .select("filiere_matiere_id, score, max_score, title, status")
      .eq("enrollment_id", enrollmentId);
    let gradeRows = gradeSelect.data;
    if (gradeSelect.error && (["42703", "PGRST204"].includes(gradeSelect.error.code || "") || /status/i.test(gradeSelect.error.message || ""))) {
      const fb = await supabaseAdmin
        .from("grades")
        .select("filiere_matiere_id, score, max_score, title")
        .eq("enrollment_id", enrollmentId);
      gradeRows = (fb.data || []).map((g) => ({ ...g, status: "validated" }));
    } else if (gradeSelect.error) {
      throw gradeSelect.error;
    }

    const { isOfficialGrade } = await import("@/app/utils/gradeStatus");
    const officialGrades = (gradeRows || []).filter((g) =>
      isOfficialGrade((g as { status?: string | null }).status),
    );

    const moyenne = computeMoyenneGenerale(
      (fmRows || []).map((m) => ({
        id: m.id,
        coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
        max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
        grade_weights: parseGradeWeights((m as { grade_weights?: unknown }).grade_weights),
      })),
      officialGrades.map((g) => ({
        filiere_matiere_id: g.filiere_matiere_id,
        score: Number(g.score) || 0,
        max_score: g.max_score,
        title: (g as { title?: string | null }).title,
      })),
    );

    // Validate the LMD destination before closing the current enrollment.
    let targetSemestreId: string | null = null;
    if (ctx!.centerType === "universite" && decision !== "ajourne") {
      let destinationLevel = source.niveau_id;
      if (decision === "admis") {
        const { data: nextLevel, error: nextError } = await supabaseAdmin.from("niveaux").select("id").eq("filiere_id", source.filiere_id).eq("annee", (niveau.annee ?? 0) + 1).maybeSingle();
        if (nextError || !nextLevel) return jsonErr(locale, 400, "Niveau suivant introuvable.", "Next level not found.");
        destinationLevel = nextLevel.id;
      }
      const { data: semesters, error: semesterError } = await supabaseAdmin.from("semestres").select("id").eq("niveau_id", destinationLevel);
      if (semesterError) return jsonErr(locale, 500, "Impossible de vérifier le semestre cible.", "Unable to verify target semester.");
      if (semesters?.length) {
        targetSemestreId = semesters.find(s => s.id === body.semestre_id)?.id || null;
        if (!targetSemestreId) return jsonErr(locale, 400, "Choisissez le semestre de la nouvelle inscription.", "Choose the new enrollment semester.");
      }
    }

    // Clôturer la source
    const closePayload: Record<string, unknown> = {
      status: "completed",
      passage_decision: decision,
      passage_decided_at: new Date().toISOString(),
      passage_decided_by: ctx!.user.id,
      passage_reason: passageReason,
    };

    let { error: closeErr } = await supabaseAdmin
      .from("enrollments")
      .update(closePayload)
      .eq("id", enrollmentId);

    if (closeErr && /passage_reason/i.test(closeErr.message)) {
      delete closePayload.passage_reason;
      ({ error: closeErr } = await supabaseAdmin
        .from("enrollments")
        .update(closePayload)
        .eq("id", enrollmentId));
    }

    if (closeErr) {
      return NextResponse.json({ error: closeErr.message }, { status: 500 });
    }

    if (decision === "ajourne") {
      return NextResponse.json({
        success: true,
        decision,
        reason: passageReason,
        moyenne,
        seuil: niveau.seuil_passage,
        newEnrollmentId: null,
      });
    }

    // Cible : niveau suivant (admis) ou même niveau (redouble)
    let targetNiveauId = source.niveau_id;
    if (decision === "admis") {
      const currentAnnee = niveau.annee;
      if (currentAnnee == null) {
        return jsonErr(
          locale,
          400,
          "Impossible de déterminer le niveau suivant.",
          "Unable to determine the next level.",
          "NEXT_LEVEL_UNKNOWN",
        );
      }
      const { data: nextNiv } = await supabaseAdmin
        .from("niveaux")
        .select("id, annee, tuition_fee, payment_plan")
        .eq("filiere_id", source.filiere_id)
        .eq("annee", currentAnnee + 1)
        .maybeSingle();

      if (!nextNiv) {
        // Rollback soft : réouvrir la source si pas de N+1
        await supabaseAdmin
          .from("enrollments")
          .update({
            status: source.status || "active",
            passage_decision: null,
            passage_reason: null,
            passage_decided_at: null,
            passage_decided_by: null,
          })
          .eq("id", enrollmentId);
        return jsonErr(
          locale,
          400,
          `Aucun niveau Année ${currentAnnee + 1} configuré pour ce programme.`,
          `No Year ${currentAnnee + 1} level is configured for this program.`,
          "NEXT_LEVEL_MISSING",
        );
      }
      targetNiveauId = nextNiv.id;
    }

    const { data: targetNiveau } = await supabaseAdmin
      .from("niveaux")
      .select("id, tuition_fee, payment_plan")
      .eq("id", targetNiveauId)
      .single();

    const feeMode = isCursusFeeMode(filiere.cursus_fee_mode)
      ? filiere.cursus_fee_mode
      : "par_niveau";
    const extras =
      feeMode === "par_niveau"
        ? sumPaymentPlanFees(targetNiveau?.payment_plan)
        : sumPaymentPlanFees(filiere.payment_plan);
    const tuition = resolveCursusTuition({
      feeMode,
      filiereDefault: filiere.default_tuition_fee,
      niveauTuition: targetNiveau?.tuition_fee ?? null,
      extraFees: extras,
    });

    const resolvedCampus = campusId || source.campus_id;
    let resolvedGroupe = targetSemestreId ? null : await resolveSignupGroupeId(
      supabaseAdmin,
      source.filiere_id,
      groupeId || null,
      targetNiveauId,
    );
    if (targetSemestreId) {
      const { data: semesterGroups } = await supabaseAdmin.from("groupes").select("id").eq("filiere_id", source.filiere_id).eq("semestre_id", targetSemestreId);
      resolvedGroupe = semesterGroups?.find(g => g.id === groupeId)?.id || (semesterGroups?.length === 1 ? semesterGroups[0].id : null);
    }

    const { data: newEnrollmentId, error: enrollErr } = await supabaseAdmin.rpc(
      "enroll_student",
      {
        p_student_id: source.student_id,
        p_filiere_id: source.filiere_id,
        p_niveau_id: targetNiveauId,
        p_groupe_id: resolvedGroupe,
        p_tuition_fee: tuition,
        p_creator: ctx!.user.id,
        p_campus_id: resolvedCampus,
      },
    );

    if (enrollErr || !newEnrollmentId) {
      // Rollback décision source
      await supabaseAdmin
        .from("enrollments")
        .update({
          status: source.status || "active",
          passage_decision: null,
          passage_reason: null,
          passage_decided_at: null,
          passage_decided_by: null,
        })
        .eq("id", enrollmentId);
      return jsonErr(
        locale,
        500,
        "Échec de la nouvelle inscription : " + (enrollErr?.message || "inconnu"),
        "Failed to create the new enrollment: " + (enrollErr?.message || "unknown"),
        "ENROLL_FAILED",
      );
    }

    const academicYear =
      academicYearOverride || nextAcademicYear(source.academic_year);

    const { error: activateErr } = await supabaseAdmin
      .from("enrollments")
      .update({
        status: "active",
        previous_enrollment_id: enrollmentId,
        ...(targetSemestreId ? { semestre_id: targetSemestreId } : {}),
        academic_year: academicYear || null,
        tuition_fee: tuition,
        academic_status: academicStatusAfterPassage(decision) || "inscrit",
      })
      .eq("id", newEnrollmentId);

    if (activateErr) {
      // Rollback : supprimer la nouvelle fiche et réouvrir la source
      await supabaseAdmin.from("enrollments").delete().eq("id", newEnrollmentId);
      await supabaseAdmin
        .from("enrollments")
        .update({
          status: source.status || "active",
          passage_decision: null,
          passage_reason: null,
          passage_decided_at: null,
          passage_decided_by: null,
        })
        .eq("id", enrollmentId);
      return jsonErr(
        locale,
        500,
        "Échec de la finalisation de la nouvelle inscription : " + activateErr.message,
        "Failed to finalize the new enrollment: " + activateErr.message,
        "ENROLL_ACTIVATE_FAILED",
      );
    }

    const planSource =
      feeMode === "uniforme" ? filiere.payment_plan : targetNiveau?.payment_plan;
    if (tuition > 0 && planSource) {
      const templates = parsePaymentPlanInstallments(planSource);
      const rows = scaleInstallmentsToTotal(templates, tuition);
      if (rows.length > 0) {
        const { error: instErr } = await supabaseAdmin.from("enrollment_installments").insert(
          rows.map((r) => ({
            enrollment_id: newEnrollmentId,
            label: r.label,
            amount: r.amount,
            due_date: r.due_date,
            status: "pending",
            paid_amount: 0,
            position: r.position,
          })),
        );
        if (instErr) {
          console.warn("[passage-niveau] enrollment_installments:", instErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      decision,
      reason: passageReason,
      moyenne,
      seuil: niveau.seuil_passage,
      newEnrollmentId,
      academic_year: academicYear,
      target_niveau_id: targetNiveauId,
    });
  } catch (e: unknown) {
    const fallback = msg(locale, "Erreur serveur.", "Server error.");
    const raw = e instanceof Error ? e.message : fallback;
    return NextResponse.json({ error: raw, code: "SERVER_ERROR" }, { status: 500 });
  }
}

async function juryListForGroupe(
  _req: NextRequest,
  ctx: NonNullable<Awaited<ReturnType<typeof getCenterStaffContext>>["ctx"]>,
  locale: PassageLocale,
  groupeId: string,
) {
  const { data: groupe, error: gErr } = await supabaseAdmin
    .from("groupes")
    .select("id, nom, filiere_id, niveau_id, semestre_id, filieres!inner(center_id, type, name)")
    .eq("id", groupeId)
    .maybeSingle();
  if (gErr || !groupe) {
    return jsonErr(locale, 404, "Promotion introuvable.", "Class not found.", "GROUPE_NOT_FOUND");
  }
  const filiere = groupe.filieres as unknown as { center_id: string; type: string; name: string };
  if (filiere.center_id !== ctx.centerId) {
    return jsonErr(locale, 403, "Hors de votre centre.", "Outside your center.", "FORBIDDEN");
  }
  if (filiere.type !== "cursus") {
    return jsonErr(locale, 400, "Pas un cursus.", "Not a multi-year program.", "NOT_CURSUS");
  }

  const { data: enrollments, error: eErr } = await supabaseAdmin
    .from("enrollments")
    .select(`
      id, status, academic_year, academic_status, passage_decision, passage_reason, niveau_id, filiere_id, student_id,
      profiles:student_id(prenom, nom, matricule),
      niveaux(id, annee, seuil_passage, nom)
    `)
    .eq("groupe_id", groupeId)
    .in("status", ["active", "draft", "completed"]);
  if (eErr) {
    return jsonErr(locale, 500, eErr.message, eErr.message);
  }

  let thresholdPct = 50;
  if (ctx.centerType === "universite") {
    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("lmd_validation_threshold_pct")
      .eq("id", ctx.centerId)
      .maybeSingle();
    thresholdPct = resolveLmdValidationThreshold(center?.lmd_validation_threshold_pct);
  }

  const rows = [];
  for (const enr of enrollments || []) {
    const profile = enr.profiles as unknown as { prenom?: string; nom?: string; matricule?: string | null } | null;
    const niveau = enr.niveaux as unknown as {
      id: string;
      annee: number | null;
      seuil_passage: number | null;
      nom: string | null;
    } | null;

    let moyenne: number | null = null;
    let suggestion: "admis" | "redouble" | "ajourne" | null = null;
    let lmd: { acquiredCredits: number; totalCredits: number; failedCount: number; debtCount: number } | null = null;

    try {
      if (ctx.centerType === "universite") {
        const progress = await loadLmdProgress(supabaseAdmin, enr.id, thresholdPct);
        if (progress) {
          suggestion = progress.suggestion;
          lmd = {
            acquiredCredits: progress.level.acquiredCredits,
            totalCredits: progress.level.totalCredits,
            failedCount: progress.level.failedCount,
            debtCount: progress.debts.length,
          };
        }
      } else {
        const { data: fmRows } = await supabaseAdmin
          .from("filiere_matieres")
          .select("id, coefficient, max_score, grade_weights")
          .eq("filiere_id", enr.filiere_id)
          .eq("niveau_id", enr.niveau_id);
        const gradeSelect = await supabaseAdmin
          .from("grades")
          .select("filiere_matiere_id, score, max_score, title, status")
          .eq("enrollment_id", enr.id);
        let gradeRows = gradeSelect.data;
        if (gradeSelect.error && (["42703", "PGRST204"].includes(gradeSelect.error.code || "") || /status/i.test(gradeSelect.error.message || ""))) {
          const fb = await supabaseAdmin
            .from("grades")
            .select("filiere_matiere_id, score, max_score, title")
            .eq("enrollment_id", enr.id);
          gradeRows = (fb.data || []).map((g) => ({ ...g, status: "validated" }));
        }
        const { isOfficialGrade } = await import("@/app/utils/gradeStatus");
        const official = (gradeRows || []).filter((g) => isOfficialGrade((g as { status?: string | null }).status));
        moyenne = computeMoyenneGenerale(
          (fmRows || []).map((m) => ({
            id: m.id,
            coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
            max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
            grade_weights: parseGradeWeights((m as { grade_weights?: unknown }).grade_weights),
          })),
          official.map((g) => ({
            filiere_matiere_id: g.filiere_matiere_id,
            score: Number(g.score) || 0,
            max_score: g.max_score,
            title: (g as { title?: string | null }).title,
          })),
        );
        suggestion = suggestPassage(moyenne, niveau?.seuil_passage);
      }
    } catch {
      // leave nulls
    }

    let provisionalCount = 0;
    try {
      provisionalCount = await countProvisionalGrades(enr.id);
    } catch {
      provisionalCount = 0;
    }

    const academicReadonly = isAcademicStatusReadonly(enr.academic_status);
    rows.push({
      enrollment_id: enr.id,
      student_name: `${profile?.prenom || ""} ${profile?.nom || ""}`.trim(),
      matricule: profile?.matricule || null,
      status: enr.status,
      academic_status: enr.academic_status ?? null,
      academic_readonly: academicReadonly,
      passage_decision: enr.passage_decision,
      passage_reason: enr.passage_reason ?? null,
      academic_year: enr.academic_year,
      proposed_academic_year: nextAcademicYear(enr.academic_year),
      niveau_annee: niveau?.annee ?? null,
      seuil_passage: niveau?.seuil_passage ?? null,
      moyenne,
      suggestion,
      lmd,
      provisional_grades_count: provisionalCount,
      can_decide:
        !enr.passage_decision
        && enr.status !== "cancelled"
        && enr.status !== "completed"
        && !academicReadonly
        && provisionalCount === 0,
    });
  }

  rows.sort((a, b) => a.student_name.localeCompare(b.student_name, locale === "en" ? "en" : "fr"));

  return NextResponse.json({
    groupe: {
      id: groupe.id,
      nom: groupe.nom,
      filiere_id: groupe.filiere_id,
      filiere_name: filiere.name,
      niveau_id: groupe.niveau_id,
      semestre_id: groupe.semestre_id,
    },
    rows,
  });
}

/** GET — aperçu moyenne / seuil / suggestion pour une inscription, ou liste jury par promo. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  const locale = reqLocale(req);

  const url = new URL(req.url);
  const groupeId = url.searchParams.get("groupe_id")?.trim() || "";
  const enrollmentId = url.searchParams.get("enrollment_id")?.trim() || "";

  if (groupeId) {
    return juryListForGroupe(req, ctx!, locale, groupeId);
  }

  if (!enrollmentId) {
    return jsonErr(locale, 400, "enrollment_id ou groupe_id requis.", "enrollment_id or groupe_id is required.", "MISSING_ID");
  }

  type PassageSource = {
    id: string;
    filiere_id: string;
    niveau_id: string | null;
    status: string | null;
    academic_year: string | null;
    academic_status?: string | null;
    passage_decision: string | null;
    passage_reason?: string | null;
    filieres: unknown;
    niveaux: unknown;
  };

  let source: PassageSource | null = null;

  {
    const withReason = await supabaseAdmin
      .from("enrollments")
      .select(`
        id, filiere_id, niveau_id, status, academic_year, academic_status, passage_decision, passage_reason,
        filieres!inner(center_id, type),
        niveaux(id, annee, seuil_passage, nom)
      `)
      .eq("id", enrollmentId)
      .maybeSingle();

    if (withReason.error && /academic_status/i.test(withReason.error.message || "")) {
      const noStatus = await supabaseAdmin
        .from("enrollments")
        .select(`
          id, filiere_id, niveau_id, status, academic_year, passage_decision, passage_reason,
          filieres!inner(center_id, type),
          niveaux(id, annee, seuil_passage, nom)
        `)
        .eq("id", enrollmentId)
        .maybeSingle();
      if (noStatus.error && /passage_reason/i.test(noStatus.error.message || "")) {
        const fallback = await supabaseAdmin
          .from("enrollments")
          .select(`
            id, filiere_id, niveau_id, status, academic_year, passage_decision,
            filieres!inner(center_id, type),
            niveaux(id, annee, seuil_passage, nom)
          `)
          .eq("id", enrollmentId)
          .maybeSingle();
        source = fallback.data as PassageSource | null;
      } else {
        source = noStatus.data as PassageSource | null;
      }
    } else if (withReason.error && /passage_reason/i.test(withReason.error.message || "")) {
      const fallback = await supabaseAdmin
        .from("enrollments")
        .select(`
          id, filiere_id, niveau_id, status, academic_year, academic_status, passage_decision,
          filieres!inner(center_id, type),
          niveaux(id, annee, seuil_passage, nom)
        `)
        .eq("id", enrollmentId)
        .maybeSingle();
      source = fallback.data as PassageSource | null;
    } else {
      source = withReason.data as PassageSource | null;
    }
  }

  if (!source) {
    return jsonErr(locale, 404, "Inscription introuvable.", "Enrollment not found.", "NOT_FOUND");
  }

  const filiere = source.filieres as unknown as { center_id: string; type: string };
  if (filiere.center_id !== ctx!.centerId) {
    return jsonErr(locale, 403, "Hors de votre centre.", "Outside your center.", "FORBIDDEN");
  }
  if (filiere.type !== "cursus") {
    return jsonErr(locale, 400, "Pas un cursus.", "Not a multi-year program.", "NOT_CURSUS");
  }

  const niveau = source.niveaux as unknown as {
    id: string;
    annee: number | null;
    seuil_passage: number | null;
    nom: string | null;
  } | null;

  const { data: fmRows } = await supabaseAdmin
    .from("filiere_matieres")
    .select("id, coefficient, max_score, grade_weights")
    .eq("filiere_id", source.filiere_id)
    .eq("niveau_id", source.niveau_id);

  const gradeSelect = await supabaseAdmin
    .from("grades")
    .select("filiere_matiere_id, score, max_score, title, status")
    .eq("enrollment_id", enrollmentId);
  let gradeRows = gradeSelect.data;
  if (gradeSelect.error && (["42703", "PGRST204"].includes(gradeSelect.error.code || "") || /status/i.test(gradeSelect.error.message || ""))) {
    const fb = await supabaseAdmin
      .from("grades")
      .select("filiere_matiere_id, score, max_score, title")
      .eq("enrollment_id", enrollmentId);
    gradeRows = (fb.data || []).map((g) => ({ ...g, status: "validated" }));
  }

  const { isOfficialGrade } = await import("@/app/utils/gradeStatus");
  const officialGrades = (gradeRows || []).filter((g) =>
    isOfficialGrade((g as { status?: string | null }).status),
  );

  const moyenne = computeMoyenneGenerale(
    (fmRows || []).map((m) => ({
      id: m.id,
      coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
      max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
      grade_weights: parseGradeWeights((m as { grade_weights?: unknown }).grade_weights),
    })),
    officialGrades.map((g) => ({
      filiere_matiere_id: g.filiere_matiere_id,
      score: Number(g.score) || 0,
      max_score: g.max_score,
      title: (g as { title?: string | null }).title,
    })),
  );

  let lmdProgress = null;
  if (ctx!.centerType === "universite") {
    try {
      const { data: center, error: thresholdError } = await supabaseAdmin.from("centers").select("lmd_validation_threshold_pct").eq("id", ctx!.centerId).single();
      if (thresholdError) throw thresholdError;
      lmdProgress = await loadLmdProgress(supabaseAdmin, enrollmentId, resolveLmdValidationThreshold(center.lmd_validation_threshold_pct));
    } catch {
      return jsonErr(locale, 500, "Impossible de calculer les crédits LMD.", "Unable to calculate LMD credits.");
    }
  }
  const suggestion = lmdProgress ? lmdProgress.suggestion : suggestPassage(moyenne, niveau?.seuil_passage);

  const provisionalGradesCount = await countProvisionalGrades(enrollmentId);

  let hasNextNiveau = false;
  let nextNiveauId: string | null = null;
  if (niveau?.annee != null) {
    const { data: nextNiv } = await supabaseAdmin
      .from("niveaux")
      .select("id")
      .eq("filiere_id", source.filiere_id)
      .eq("annee", niveau.annee + 1)
      .maybeSingle();
    hasNextNiveau = !!nextNiv;
    nextNiveauId = nextNiv?.id || null;
  }

  return NextResponse.json({
    enrollment_id: enrollmentId,
    status: source.status,
    passage_decision: source.passage_decision,
    passage_reason: source.passage_reason ?? null,
    academic_year: source.academic_year,
    proposed_academic_year: nextAcademicYear(source.academic_year),
    niveau_annee: niveau?.annee ?? null,
    niveau_nom: niveau?.nom ?? null,
    seuil_passage: niveau?.seuil_passage ?? null,
    moyenne,
    suggestion,
    lmd: lmdProgress ? { level: lmdProgress.level, debtCount: lmdProgress.debts.length, complete: lmdProgress.complete } : null,
    progression_semesters: lmdProgress ? {
      admis: lmdProgress.semesters.filter(s => s.niveau_id === nextNiveauId),
      redouble: lmdProgress.semesters.filter(s => s.niveau_id === source.niveau_id),
    } : null,
    has_next_niveau: hasNextNiveau,
    academic_status: source.academic_status ?? null,
    academic_readonly: isAcademicStatusReadonly(source.academic_status),
    provisional_grades_count: provisionalGradesCount,
    can_decide:
      !source.passage_decision
      && source.status !== "cancelled"
      && !isAcademicStatusReadonly(source.academic_status)
      && provisionalGradesCount === 0,
    can_reopen_ajourne: source.passage_decision === "ajourne" && !isAcademicStatusReadonly(source.academic_status),
  });
}
