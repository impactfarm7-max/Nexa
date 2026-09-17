import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCreditsStatus, computeUeFinalStatus, isRattrapageGrade } from "@/app/utils/lmd-credits";

/** Résumé crédits acquis/total pour une inscription LMD (semestre_id renseigné) — null si le semestre n'a pas d'UE créditées. */
export async function computeEnrollmentCreditsStatus(
  supabaseAdmin: SupabaseClient,
  enrollmentId: string,
  semestreId: string,
  thresholdPct: number,
): Promise<{ totalCredits: number; acquiredCredits: number } | null> {
  const { data: ues } = await supabaseAdmin
    .from("filiere_matieres")
    .select("id, credits")
    .eq("semestre_id", semestreId)
    .not("credits", "is", null);
  if (!ues || ues.length === 0) return null;

  const { data: grades } = await supabaseAdmin
    .from("grades")
    .select("filiere_matiere_id, score, max_score, title")
    .eq("enrollment_id", enrollmentId)
    .in("filiere_matiere_id", ues.map((u: { id: string }) => u.id));

  const statuses = ues.map((u: { id: string }) => {
    const gradesForUe = (grades || []).filter((g: { filiere_matiere_id: string }) => g.filiere_matiere_id === u.id);
    const normal = gradesForUe.find((g: { title: string | null }) => !isRattrapageGrade(g.title));
    const rattrapage = gradesForUe.find((g: { title: string | null }) => isRattrapageGrade(g.title));
    const status = computeUeFinalStatus({
      normalScore: normal?.score ?? null,
      normalMaxScore: normal?.max_score || 20,
      rattrapageScore: rattrapage?.score ?? null,
      rattrapageMaxScore: rattrapage?.max_score || 20,
      thresholdPct,
    });
    return { filiere_matiere_id: u.id, validated: status.validated };
  });

  const { totalCredits, acquiredCredits } = computeCreditsStatus(
    ues.map((u: { id: string; credits: number }) => ({ filiere_matiere_id: u.id, credits: u.credits })),
    statuses,
  );
  return { totalCredits, acquiredCredits };
}
