import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLmdProgress, type LmdUe, type LmdGrade } from "@/app/utils/lmd-results";

/** Credits survive semester changes and repeated years within this student's program. */
export async function loadLmdProgress(db: SupabaseClient, enrollmentId: string, thresholdPct: number) {
  const { data: source, error: sourceError } = await db.from("enrollments")
    .select("id, student_id, filiere_id, niveau_id, semestre_id, groupe_id").eq("id", enrollmentId).single();
  if (sourceError) throw sourceError;
  const [{ data: levels, error: levelError }, { data: enrollments, error: enrollmentError }] = await Promise.all([
    db.from("niveaux").select("id, annee").eq("filiere_id", source.filiere_id),
    db.from("enrollments").select("id").eq("student_id", source.student_id).eq("filiere_id", source.filiere_id).in("status", ["active", "completed"]),
  ]);
  if (levelError || enrollmentError) throw levelError || enrollmentError;
  if (!levels?.length) return null;
  const { data: semesters, error: semesterError } = await db.from("semestres").select("id, niveau_id, ordre, nom").in("niveau_id", levels.map(l => l.id));
  if (semesterError) throw semesterError;
  if (!semesters?.length) return null;

  type UeRow = {
    id: string;
    semestre_id: string;
    niveau_id: string;
    credits: number | null;
    max_score: number;
    grade_weights?: unknown;
    is_optional?: boolean | null;
    exam_disciplines: { name?: string } | { name?: string }[] | null;
  };

  let rows: UeRow[] = [];
  const withOptional = await db.from("filiere_matieres")
    .select("id, semestre_id, niveau_id, credits, max_score, grade_weights, is_optional, exam_disciplines(name)")
    .eq("filiere_id", source.filiere_id).in("semestre_id", semesters.map(s => s.id));
  if (withOptional.error && ["42703", "PGRST204"].includes(withOptional.error.code || "")) {
    const fallback = await db.from("filiere_matieres")
      .select("id, semestre_id, niveau_id, credits, max_score, grade_weights, exam_disciplines(name)")
      .eq("filiere_id", source.filiere_id).in("semestre_id", semesters.map(s => s.id));
    if (fallback.error) throw fallback.error;
    rows = (fallback.data || []).map((r) => ({ ...(r as UeRow), is_optional: false }));
  } else if (withOptional.error) {
    throw withOptional.error;
  } else {
    rows = (withOptional.data || []) as UeRow[];
  }

  const ids = (enrollments || []).map(e => e.id);
  const chosenOptionalIds = new Set<string>();
  if (ids.length) {
    const { data: choices, error: choiceErr } = await db
      .from("enrollment_ue_inscriptions")
      .select("filiere_matiere_id")
      .in("enrollment_id", ids);
    if (choiceErr && !["42P01", "PGRST205"].includes(choiceErr.code || "")) throw choiceErr;
    for (const c of choices || []) {
      if (c.filiere_matiere_id) chosenOptionalIds.add(c.filiere_matiere_id);
    }
  }

  const ues: LmdUe[] = rows
    .filter((row) => !row.is_optional || chosenOptionalIds.has(row.id))
    .map((row) => {
      const disc = row.exam_disciplines;
      const name = Array.isArray(disc) ? disc[0]?.name : disc?.name;
      return {
        ...row,
        name: name || "UE",
        credits: Number(row.credits) || 0,
        creditsConfigured: row.credits != null && Number.isInteger(Number(row.credits)) && Number(row.credits) >= 0,
      };
    });

  const grades: LmdGrade[] = [];
  if (ids.length && ues.length) {
    for (let offset = 0; ; offset += 500) {
      const page = await db.from("grades").select("enrollment_id, filiere_matiere_id, score, max_score, title, status")
        .in("enrollment_id", ids).in("filiere_matiere_id", ues.map(ue => ue.id))
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (page.error && (["42703", "PGRST204"].includes(page.error.code || "") || /status/i.test(page.error.message || ""))) {
        const fb = await db.from("grades").select("enrollment_id, filiere_matiere_id, score, max_score, title")
          .in("enrollment_id", ids).in("filiere_matiere_id", ues.map(ue => ue.id))
          .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
        if (fb.error) throw fb.error;
        grades.push(...((fb.data || []) as LmdGrade[]).map((g) => ({ ...g, status: "validated" as const })));
        if (!fb.data || fb.data.length < 500) break;
        continue;
      }
      if (page.error) throw page.error;
      const { isOfficialGrade } = await import("@/app/utils/gradeStatus");
      for (const g of page.data || []) {
        if (isOfficialGrade((g as { status?: string }).status)) {
          grades.push(g as LmdGrade);
        }
      }
      if (!page.data || page.data.length < 500) break;
    }
  }
  const currentYear = levels.find(l => l.id === source.niveau_id)?.annee;
  const currentSemester = semesters.find(s => s.id === source.semestre_id);
  const past = semesters.filter(s => {
    const year = levels.find(l => l.id === s.niveau_id)?.annee;
    return year != null && currentYear != null && (year < currentYear || (year === currentYear && currentSemester && s.ordre < currentSemester.ordre));
  }).map(s => s.id);
  return { ...computeLmdProgress(ues, grades || [], thresholdPct, source.niveau_id, past), source, semesters };
}

/** UE optionnelles du semestre courant + sélection pour une inscription. */
export async function loadOptionalUeInscriptions(
  db: SupabaseClient,
  enrollmentId: string,
  filiereId: string,
  semestreId: string | null,
) {
  if (!semestreId) {
    return { optionalUes: [] as { id: string; name: string; credits: number }[], selectedUeIds: [] as string[] };
  }

  const q = await db.from("filiere_matieres")
    .select("id, credits, is_optional, exam_disciplines(name)")
    .eq("filiere_id", filiereId)
    .eq("semestre_id", semestreId)
    .eq("is_optional", true);
  if (q.error && ["42703", "PGRST204"].includes(q.error.code || "")) {
    return { optionalUes: [], selectedUeIds: [] as string[] };
  }
  if (q.error) throw q.error;

  const optionalRows = q.data || [];
  const { data: selected, error: selErr } = await db
    .from("enrollment_ue_inscriptions")
    .select("filiere_matiere_id")
    .eq("enrollment_id", enrollmentId);
  if (selErr && ["42P01", "PGRST205"].includes(selErr.code || "")) {
    return {
      optionalUes: optionalRows.map((r) => {
        const disc = r.exam_disciplines as { name?: string } | { name?: string }[] | null;
        const name = Array.isArray(disc) ? disc[0]?.name : disc?.name;
        return { id: r.id, name: name || "UE", credits: Number(r.credits) || 0 };
      }),
      selectedUeIds: [] as string[],
    };
  }
  if (selErr) throw selErr;

  const optionalIds = new Set(optionalRows.map((r) => r.id));
  return {
    optionalUes: optionalRows.map((r) => {
      const disc = r.exam_disciplines as { name?: string } | { name?: string }[] | null;
      const name = Array.isArray(disc) ? disc[0]?.name : disc?.name;
      return { id: r.id, name: name || "UE", credits: Number(r.credits) || 0 };
    }),
    selectedUeIds: (selected || [])
      .map((s) => s.filiere_matiere_id)
      .filter((id): id is string => Boolean(id) && optionalIds.has(id)),
  };
}
