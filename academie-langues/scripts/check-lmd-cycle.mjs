// Read-only schema check. Run: node --env-file=.env.local scripts/check-lmd-cycle.mjs
import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const checks = [
  ["semestres", "id,niveau_id,ordre,nom"],
  ["enrollments", "id,student_id,filiere_id,niveau_id,semestre_id,status"],
  ["filiere_matieres", "id,semestre_id,niveau_id,credits,max_score,grade_weights,exam_disciplines(name)"],
  ["grades", "id,enrollment_id,filiere_matiere_id,score,max_score,title,comment,formateur_id,created_at"],
  ["lmd_academic_records", "id,revision,dossier,diploma,updated_at"],
  ["lmd_academic_events", "record_id,action,revision,created_at"],
];
let failures = 0;
for (const [table, columns] of checks) {
  const { error } = await db.from(table).select(columns).limit(0);
  if (error) failures++;
  console.log(`${table}: ${error ? `FAILED (${error.code || "network"}) ${error.message}` : "OK"}`);
}
// Invalid identifiers deliberately fail before any write, confirming the RPCs are installed.
const nil = "00000000-0000-0000-0000-000000000000";
for (const [name, args, expected] of [
  ["save_lmd_academic_record", { p_student: nil, p_filiere: nil, p_center: nil, p_actor: nil, p_revision: 0, p_dossier: {}, p_diploma: null }, "PROGRAM_SCOPE"],
  ["save_lmd_recovery", { p_enrollment: nil, p_ue: nil, p_actor: nil, p_score: 0 }, "INVALID_RECOVERY"],
]) {
  const { error } = await db.rpc(name, args);
  const ok = error?.message.includes(expected);
  if (!ok) failures++;
  console.log(`${name}: ${ok ? "OK (invalid scope rejected)" : "FAILED"}`);
}
process.exitCode = failures ? 1 : 0;
