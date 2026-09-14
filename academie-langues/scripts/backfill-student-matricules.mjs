/**
 * Attribue retroactivement un matricule aux etudiants deja crees avant ce
 * chantier (profiles.matricule est null). Idempotent : un etudiant qui a
 * deja un matricule est ignore, le script est rejouable sans risque.
 * Usage: node --env-file=.env.local scripts/backfill-student-matricules.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("FAIL: env Supabase manquante (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const ok = (m) => console.log(`✓ ${m}`);
const warn = (m) => console.warn(`! ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const DEFAULT_PREFIX = "ETU";

function formatMatricule(prefix, year, seq) {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

async function nextCounter(centerId, year) {
  const { data, error } = await sb.rpc("next_student_counter", {
    p_center_id: centerId,
    p_year: year,
  });
  if (error || typeof data !== "number") {
    throw new Error(error?.message || "réponse invalide de next_student_counter");
  }
  return data;
}

async function backfillCenter(center) {
  const prefix = center.student_id_prefix?.trim() || DEFAULT_PREFIX;

  const { data: students, error } = await sb
    .from("profiles")
    .select("id, created_at")
    .eq("center_id", center.id)
    .eq("role", "student")
    .is("matricule", null)
    .order("created_at", { ascending: true });

  if (error) {
    warn(`${center.name} : lecture étudiants échouée (${error.message})`);
    return { attempted: 0, done: 0 };
  }
  if (!students || students.length === 0) return { attempted: 0, done: 0 };

  let done = 0;
  for (const student of students) {
    const year = new Date(student.created_at).getFullYear();
    try {
      const seq = await nextCounter(center.id, year);
      const matricule = formatMatricule(prefix, year, seq);
      const { error: updErr } = await sb
        .from("profiles")
        .update({ matricule })
        .eq("id", student.id)
        .is("matricule", null); // ne jamais écraser un matricule déjà posé entre-temps
      if (updErr) {
        warn(`étudiant ${student.id} : échec (${updErr.message})`);
        continue;
      }
      done++;
    } catch (e) {
      warn(`étudiant ${student.id} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { attempted: students.length, done };
}

async function main() {
  const { data: centers, error } = await sb
    .from("centers")
    .select("id, name, student_id_prefix");
  if (error || !centers) fail(`lecture des centres : ${error?.message}`);

  let totalDone = 0;
  let totalAttempted = 0;
  for (const center of centers) {
    const { attempted, done } = await backfillCenter(center);
    totalAttempted += attempted;
    totalDone += done;
    if (attempted > 0) ok(`${center.name} : ${done}/${attempted} matricule(s) attribué(s)`);
  }
  ok(`Backfill terminé. ${totalDone}/${totalAttempted} matricules attribués au total.`);
}

main();
