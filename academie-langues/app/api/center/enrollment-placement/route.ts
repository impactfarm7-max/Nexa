import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import { finalizeStudentClassroom } from "@/app/utils/studentClassroom.server";
import { normalizeAcademicYear } from "@/app/utils/cursus-passage";
import { isUniversityCenter } from "@/app/utils/student-matricule";
import {
  isAcademicStatus,
  isAcademicStatusReadonly,
  normalizeAcademicStatus,
  type AcademicStatus,
} from "@/app/utils/academic-status";

/**
 * POST /api/center/enrollment-placement
 * Change filière / niveau / semestre / année / classe / statut académique.
 * Option A (univ) : parcours complet obligatoire, même fiche mise à jour.
 */
export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  let body: {
    enrollment_id?: string;
    filiere_id?: string;
    niveau_id?: string | null;
    semestre_id?: string | null;
    academic_year?: string | null;
    academic_status?: string | null;
    groupe_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const enrollmentId = String(body.enrollment_id || "").trim();
  const filiereId = String(body.filiere_id || "").trim();
  const niveauId = body.niveau_id ? String(body.niveau_id).trim() : null;
  const semestreId = body.semestre_id ? String(body.semestre_id).trim() : null;
  const groupeId = body.groupe_id ? String(body.groupe_id).trim() : null;
  const academicYearRaw =
    typeof body.academic_year === "string" && body.academic_year.trim()
      ? body.academic_year.trim()
      : null;
  const academicYear = academicYearRaw ? normalizeAcademicYear(academicYearRaw) : null;

  if (!enrollmentId || !filiereId) {
    return NextResponse.json({ error: "Inscription et filière requises." }, { status: 400 });
  }
  if (academicYearRaw && !academicYear) {
    return NextResponse.json(
      { error: "Année scolaire invalide (format attendu : 2025-2026).", code: "ACADEMIC_YEAR_INVALID" },
      { status: 400 },
    );
  }

  const { data: enrollment, error: enrErr } = await supabaseAdmin
    .from("enrollments")
    .select("id, student_id, filiere_id, niveau_id, groupe_id, semestre_id, academic_year, academic_status, status, filieres(center_id, type)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (enrErr || !enrollment) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  const enrFiliere = enrollment.filieres as { center_id?: string; type?: string } | null;
  if (enrFiliere?.center_id && enrFiliere.center_id !== ctx!.centerId) {
    return NextResponse.json({ error: "Inscription hors de votre centre." }, { status: 403 });
  }

  const { data: targetFiliere, error: filErr } = await supabaseAdmin
    .from("filieres")
    .select("id, center_id, type, name")
    .eq("id", filiereId)
    .maybeSingle();

  if (filErr || !targetFiliere || targetFiliere.center_id !== ctx!.centerId) {
    return NextResponse.json({ error: "Programme invalide pour ce centre." }, { status: 400 });
  }

  const isUnivCursus =
    isUniversityCenter(ctx!.centerType) && targetFiliere.type === "cursus";

  if (niveauId) {
    const { data: niv } = await supabaseAdmin
      .from("niveaux")
      .select("id, filiere_id, annee")
      .eq("id", niveauId)
      .maybeSingle();
    if (!niv || niv.filiere_id !== filiereId) {
      return NextResponse.json({ error: "Niveau invalide pour ce programme." }, { status: 400 });
    }
  } else if (targetFiliere.type === "cursus") {
    return NextResponse.json(
      { error: "Niveau requis pour un cursus.", code: "NIVEAU_REQUIRED" },
      { status: 400 },
    );
  }

  let resolvedSemestreId = semestreId;
  let groupeRow: {
    id: string;
    filiere_id: string | null;
    niveau_id: string | null;
    semestre_id: string | null;
    nom: string;
  } | null = null;

  if (groupeId) {
    const { data: grp } = await supabaseAdmin
      .from("groupes")
      .select("id, filiere_id, niveau_id, semestre_id, nom")
      .eq("id", groupeId)
      .maybeSingle();
    if (!grp) {
      return NextResponse.json({ error: "Classe introuvable." }, { status: 400 });
    }
    const okByFiliere = grp.filiere_id === filiereId;
    const okByNiveau = Boolean(niveauId && grp.niveau_id === niveauId);
    if (!okByFiliere && !okByNiveau) {
      return NextResponse.json({ error: "Classe hors de ce programme / niveau." }, { status: 400 });
    }
    groupeRow = grp;
    // Inférer le semestre depuis la promo avant d'exiger SEMESTRE_REQUIRED
    if (!resolvedSemestreId && grp.semestre_id && niveauId) {
      const { data: semFromGroupe } = await supabaseAdmin
        .from("semestres")
        .select("id, niveau_id")
        .eq("id", grp.semestre_id)
        .maybeSingle();
      if (semFromGroupe && semFromGroupe.niveau_id === niveauId) {
        resolvedSemestreId = semFromGroupe.id;
      }
    }
  }

  if (isUnivCursus && niveauId) {
    const { data: semForNiveau } = await supabaseAdmin
      .from("semestres")
      .select("id")
      .eq("niveau_id", niveauId)
      .limit(1);
    const hasSemesters = (semForNiveau || []).length > 0;
    if (hasSemesters && !resolvedSemestreId) {
      return NextResponse.json(
        { error: "Semestre obligatoire pour cette inscription.", code: "SEMESTRE_REQUIRED" },
        { status: 400 },
      );
    }
  }

  if (resolvedSemestreId) {
    if (!niveauId) {
      return NextResponse.json(
        { error: "Niveau requis pour rattacher un semestre.", code: "NIVEAU_REQUIRED" },
        { status: 400 },
      );
    }
    const { data: semRow } = await supabaseAdmin
      .from("semestres")
      .select("id, niveau_id, ordre")
      .eq("id", resolvedSemestreId)
      .maybeSingle();
    if (!semRow || semRow.niveau_id !== niveauId) {
      return NextResponse.json(
        { error: "Semestre invalide pour ce niveau.", code: "SEMESTRE_INVALID" },
        { status: 400 },
      );
    }
    if (groupeRow?.semestre_id && groupeRow.semestre_id !== resolvedSemestreId) {
      return NextResponse.json(
        { error: "La promotion n'appartient pas à ce semestre.", code: "GROUPE_SEMESTRE_MISMATCH" },
        { status: 400 },
      );
    }
  } else if (!isUnivCursus) {
    // Hors univ : conserver le semestre existant si le champ n'est pas envoyé ;
    // si `semestre_id: null` est envoyé explicitement, on efface.
    if (body.semestre_id === undefined) {
      resolvedSemestreId = (enrollment.semestre_id as string | null) || null;
    }
  }

  const existingYear = normalizeAcademicYear(enrollment.academic_year) || (enrollment.academic_year as string | null);
  const finalAcademicYear = academicYear || (isUnivCursus ? existingYear : academicYear);
  if (isUnivCursus && !finalAcademicYear) {
    return NextResponse.json(
      { error: "Année scolaire obligatoire (ex. 2025-2026).", code: "ACADEMIC_YEAR_REQUIRED" },
      { status: 400 },
    );
  }

  if (isUnivCursus && !groupeId) {
    return NextResponse.json(
      { error: "Promotion obligatoire pour une inscription universitaire.", code: "GROUPE_REQUIRED" },
      { status: 400 },
    );
  }

  let resolvedAcademicStatus: AcademicStatus | null = normalizeAcademicStatus(enrollment.academic_status);
  if (body.academic_status !== undefined) {
    if (body.academic_status === null || body.academic_status === "") {
      resolvedAcademicStatus = isUnivCursus ? "inscrit" : null;
    } else if (!isAcademicStatus(body.academic_status)) {
      return NextResponse.json(
        { error: "Statut académique invalide.", code: "ACADEMIC_STATUS_INVALID" },
        { status: 400 },
      );
    } else {
      resolvedAcademicStatus = body.academic_status;
    }
  }
  if (isUnivCursus && !resolvedAcademicStatus) {
    resolvedAcademicStatus = "inscrit";
  }

  const oldGroupeId = enrollment.groupe_id as string | null;

  const updatePayload: Record<string, unknown> = {
    filiere_id: filiereId,
    niveau_id: niveauId,
    groupe_id: groupeId,
  };
  if (isUnivCursus || body.semestre_id !== undefined) {
    updatePayload.semestre_id = resolvedSemestreId;
  }
  if (isUnivCursus || academicYear) {
    updatePayload.academic_year = finalAcademicYear ?? null;
  }
  if (isUnivCursus || body.academic_status !== undefined) {
    updatePayload.academic_status = resolvedAcademicStatus;
  }

  const { error: updErr } = await supabaseAdmin
    .from("enrollments")
    .update(updatePayload)
    .eq("id", enrollmentId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  if (groupeId && groupeId !== oldGroupeId) {
    if (oldGroupeId) {
      const { data: oldRoom } = await supabaseAdmin
        .from("community_rooms")
        .select("id")
        .eq("groupe_id", oldGroupeId)
        .eq("type", "classroom")
        .maybeSingle();
      if (oldRoom?.id) {
        await supabaseAdmin
          .from("community_room_members")
          .delete()
          .eq("room_id", oldRoom.id)
          .eq("user_id", enrollment.student_id);
      }
    }

    const classroomResult = await finalizeStudentClassroom(supabaseAdmin, {
      studentId: enrollment.student_id,
      centerId: ctx!.centerId,
      groupeId,
    });
    if (!classroomResult.ok) {
      console.warn("[enrollment-placement] classroom sync:", classroomResult.error);
    }
  }

  const [{ data: niveauRow }, { data: semestreRow }] = await Promise.all([
    niveauId
      ? supabaseAdmin.from("niveaux").select("annee, mois, semaines, jours").eq("id", niveauId).maybeSingle()
      : Promise.resolve({ data: null }),
    resolvedSemestreId
      ? supabaseAdmin.from("semestres").select("ordre").eq("id", resolvedSemestreId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    success: true,
    enrollment: {
      id: enrollmentId,
      filiere_id: filiereId,
      filiere_name: targetFiliere.name,
      niveau_id: niveauId,
      niveau_annee: niveauRow?.annee ?? null,
      semestre_id: resolvedSemestreId,
      semestre_ordre: semestreRow?.ordre ?? null,
      academic_year: (updatePayload.academic_year as string | null | undefined)
        ?? (enrollment.academic_year as string | null)
        ?? null,
      academic_status: (updatePayload.academic_status as string | null | undefined)
        ?? (enrollment.academic_status as string | null)
        ?? null,
      groupe_id: groupeId,
      groupe_nom: groupeRow?.nom ?? null,
      academic_readonly: isAcademicStatusReadonly(
        (updatePayload.academic_status as string | null | undefined)
          ?? (enrollment.academic_status as string | null),
      ),
    },
  });
}
