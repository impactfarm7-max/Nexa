import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatMatricule,
  parseMatriculeForPrefix,
} from "@/app/utils/student-matricule";

export {
  DEFAULT_STUDENT_ID_PREFIX,
  isUniversityCenter,
  resolveStudentIdPrefix,
  resolveStudentIdPrefixForCenter,
  formatMatricule,
  parseMatriculeForPrefix,
  assertMatriculeForOfficialDocument,
} from "@/app/utils/student-matricule";

/** Génère le prochain matricule pour ce centre/année (incrémentation atomique côté DB). */
export async function generateMatricule(
  supabaseAdmin: SupabaseClient,
  centerId: string,
  prefix: string,
  year: number,
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("next_student_counter", {
    p_center_id: centerId,
    p_year: year,
  });
  if (error || typeof data !== "number") {
    throw new Error("Génération du matricule impossible : " + (error?.message || "réponse invalide"));
  }
  return formatMatricule(prefix, year, data);
}

/**
 * Si le matricule importé correspond au format courant du centre, fait
 * avancer le compteur de cette année pour que les prochains matricules
 * générés continuent après. Ne fait rien si le format ne correspond pas.
 */
export async function syncImportedMatriculeCounter(
  supabaseAdmin: SupabaseClient,
  centerId: string,
  prefix: string,
  matricule: string,
): Promise<void> {
  const parsed = parseMatriculeForPrefix(matricule, prefix);
  if (!parsed) return;
  await supabaseAdmin.rpc("bump_student_counter", {
    p_center_id: centerId,
    p_year: parsed.year,
    p_min_value: parsed.seq,
  });
}
