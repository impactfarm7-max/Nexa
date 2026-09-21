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
  const { data: rows, error: ueError } = await db.from("filiere_matieres")
    .select("id, semestre_id, niveau_id, credits, max_score, grade_weights, exam_disciplines(name)")
    .eq("filiere_id", source.filiere_id).in("semestre_id", semesters.map(s => s.id));
  if (ueError) throw ueError;
  const ues: LmdUe[] = (rows || []).map(row => ({ ...row, name: (row.exam_disciplines as unknown as { name?: string } | null)?.name || "UE", credits: Number(row.credits) || 0, creditsConfigured: row.credits != null && Number.isInteger(Number(row.credits)) && Number(row.credits) >= 0 }));
  const ids = (enrollments || []).map(e => e.id);
  const grades: LmdGrade[] = [];
  if (ids.length && ues.length) {
    for (let offset = 0; ; offset += 500) {
      const page = await db.from("grades").select("enrollment_id, filiere_matiere_id, score, max_score, title")
        .in("enrollment_id", ids).in("filiere_matiere_id", ues.map(ue => ue.id))
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      if (page.error) throw page.error;
      grades.push(...(page.data || []));
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
