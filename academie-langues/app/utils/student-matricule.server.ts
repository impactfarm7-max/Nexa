import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_STUDENT_ID_PREFIX = "ETU";

export function resolveStudentIdPrefix(rawPrefix: string | null | undefined): string {
  return rawPrefix?.trim() || DEFAULT_STUDENT_ID_PREFIX;
}

export function formatMatricule(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Si `matricule` correspond exactement au format {prefix}-{annee}-{seq},
 * renvoie l'annee et le seq extraits. Sinon null (format inconnu — on ne
 * devine rien, voir design "Hors scope").
 */
export function parseMatriculeForPrefix(
  matricule: string,
  prefix: string,
): { year: number; seq: number } | null {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-(\\d{4})-(\\d{4})$`);
  const match = pattern.exec(matricule.trim());
  if (!match) return null;
  return { year: Number(match[1]), seq: Number(match[2]) };
}

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
