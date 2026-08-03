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

/**
 * POST /api/centre/passage-niveau
 * Cursus uniquement — décision de fin de niveau (admis / redouble / ajourne).
 * action: "reopen" → annule uniquement un ajournement (pas de nouvelle inscription créée).
 * N'altère pas TCF ni formation_courte.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  try {
    const body = await req.json();
    const enrollmentId = String(body.enrollment_id || "").trim();
    const action = typeof body.action === "string" ? body.action.trim() : "";

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollment_id requis." }, { status: 400 });
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
        return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
      }

      const filiere = source.filieres as unknown as { center_id: string; type: string };
      if (filiere.center_id !== ctx!.centerId) {
        return NextResponse.json({ error: "Hors de votre centre." }, { status: 403 });
      }
      if (filiere.type !== "cursus") {
        return NextResponse.json(
          { error: "Le passage de niveau concerne uniquement les cursus pluriannuels." },
          { status: 400 },
        );
      }
      if (source.passage_decision !== "ajourne") {
        return NextResponse.json(
          { error: "Seule une décision « ajourné » peut être annulée ainsi (aucune nouvelle inscription créée)." },
          { status: 409 },
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
      return NextResponse.json(
        { error: "enrollment_id et decision (admis|redouble|ajourne) requis." },
        { status: 400 },
      );
    }
    const decision: PassageDecision = decisionRaw;

    const reasonNorm = normalizePassageReason(decision, body.reason ?? body.passage_reason);
    if (!reasonNorm.ok) {
      return NextResponse.json({ error: reasonNorm.error }, { status: 400 });
    }
    const passageReason = reasonNorm.reason;

    const { data: source, error: srcErr } = await supabaseAdmin
      .from("enrollments")
      .select(`
        id, student_id, filiere_id, niveau_id, groupe_id, campus_id, status,
        tuition_fee, academic_year, passage_decision,
        filieres!inner(id, center_id, type, default_tuition_fee, cursus_fee_mode, payment_plan),
        niveaux(id, annee, tuition_fee, seuil_passage)
      `)
      .eq("id", enrollmentId)
      .maybeSingle();

    if (srcErr || !source) {
      return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
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
      return NextResponse.json({ error: "Hors de votre centre." }, { status: 403 });
    }
    if (filiere.type !== "cursus") {
      return NextResponse.json(
        { error: "Le passage de niveau concerne uniquement les cursus pluriannuels." },
        { status: 400 },
      );
    }
    if (source.passage_decision) {
      return NextResponse.json(
        { error: "Une décision a déjà été prise pour cette inscription." },
        { status: 409 },
      );
    }
    if (!source.niveau_id || !niveau) {
      return NextResponse.json({ error: "Niveau manquant sur cette inscription." }, { status: 400 });
    }

    // Moyenne informative (ne bloque pas la décision manager)
    const { data: fmRows } = await supabaseAdmin
      .from("filiere_matieres")
      .select("id, coefficient, max_score, grade_weights")
      .eq("filiere_id", source.filiere_id)
      .eq("niveau_id", source.niveau_id);

    const { data: gradeRows } = await supabaseAdmin
      .from("grades")
      .select("filiere_matiere_id, score, max_score, title")
      .eq("enrollment_id", enrollmentId);

    const moyenne = computeMoyenneGenerale(
      (fmRows || []).map((m) => ({
        id: m.id,
        coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
        max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
        grade_weights: parseGradeWeights((m as { grade_weights?: unknown }).grade_weights),
      })),
      (gradeRows || []).map((g) => ({
        filiere_matiere_id: g.filiere_matiere_id,
        score: Number(g.score) || 0,
        max_score: g.max_score,
        title: (g as { title?: string | null }).title,
      })),
    );

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
        return NextResponse.json(
          { error: "Impossible de déterminer le niveau suivant." },
          { status: 400 },
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
        return NextResponse.json(
          { error: `Aucun niveau Année ${currentAnnee + 1} configuré pour ce programme.` },
          { status: 400 },
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
    const resolvedGroupe = await resolveSignupGroupeId(
      supabaseAdmin,
      source.filiere_id,
      groupeId || null,
      targetNiveauId,
    );

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
      return NextResponse.json(
        { error: "Échec de la nouvelle inscription : " + (enrollErr?.message || "inconnu") },
        { status: 500 },
      );
    }

    const academicYear =
      academicYearOverride || nextAcademicYear(source.academic_year);

    await supabaseAdmin
      .from("enrollments")
      .update({
        status: "active",
        previous_enrollment_id: enrollmentId,
        academic_year: academicYear || null,
        tuition_fee: tuition,
      })
      .eq("id", newEnrollmentId);

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
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** GET — aperçu moyenne / seuil / suggestion pour une inscription. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const enrollmentId = new URL(req.url).searchParams.get("enrollment_id");
  if (!enrollmentId) {
    return NextResponse.json({ error: "enrollment_id requis." }, { status: 400 });
  }

  type PassageSource = {
    id: string;
    filiere_id: string;
    niveau_id: string | null;
    status: string | null;
    academic_year: string | null;
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
        id, filiere_id, niveau_id, status, academic_year, passage_decision, passage_reason,
        filieres!inner(center_id, type),
        niveaux(id, annee, seuil_passage, nom)
      `)
      .eq("id", enrollmentId)
      .maybeSingle();

    if (withReason.error && /passage_reason/i.test(withReason.error.message)) {
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
      source = withReason.data as PassageSource | null;
    }
  }

  if (!source) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  const filiere = source.filieres as unknown as { center_id: string; type: string };
  if (filiere.center_id !== ctx!.centerId) {
    return NextResponse.json({ error: "Hors de votre centre." }, { status: 403 });
  }
  if (filiere.type !== "cursus") {
    return NextResponse.json({ error: "Pas un cursus." }, { status: 400 });
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

  const { data: gradeRows } = await supabaseAdmin
    .from("grades")
    .select("filiere_matiere_id, score, max_score, title")
    .eq("enrollment_id", enrollmentId);

  const moyenne = computeMoyenneGenerale(
    (fmRows || []).map((m) => ({
      id: m.id,
      coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
      max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
      grade_weights: parseGradeWeights((m as { grade_weights?: unknown }).grade_weights),
    })),
    (gradeRows || []).map((g) => ({
      filiere_matiere_id: g.filiere_matiere_id,
      score: Number(g.score) || 0,
      max_score: g.max_score,
      title: (g as { title?: string | null }).title,
    })),
  );

  const suggestion = suggestPassage(moyenne, niveau?.seuil_passage);

  let hasNextNiveau = false;
  if (niveau?.annee != null) {
    const { data: nextNiv } = await supabaseAdmin
      .from("niveaux")
      .select("id")
      .eq("filiere_id", source.filiere_id)
      .eq("annee", niveau.annee + 1)
      .maybeSingle();
    hasNextNiveau = !!nextNiv;
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
    has_next_niveau: hasNextNiveau,
    can_decide: !source.passage_decision && source.status !== "cancelled",
    can_reopen_ajourne: source.passage_decision === "ajourne",
  });
}
