import type { SupabaseClient } from "@supabase/supabase-js";
import { loadLmdProgress } from "@/app/utils/lmd-progress.server";

/** Cumul des crédits de l'étudiant dans le programme de cette inscription. */
export async function computeEnrollmentCreditsStatus(
  supabaseAdmin: SupabaseClient,
  enrollmentId: string,
  thresholdPct: number,
): Promise<{ totalCredits: number; acquiredCredits: number } | null> {
  const progress = await loadLmdProgress(supabaseAdmin, enrollmentId, thresholdPct);
  if (!progress) return null;
  return { totalCredits: progress.totalCredits, acquiredCredits: progress.acquiredCredits };
}
