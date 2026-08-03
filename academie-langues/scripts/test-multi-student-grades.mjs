/**
 * Smoke test multi-étudiants — carnet (grades) ou séance TCF.
 * Usage: node --env-file=.env.local scripts/test-multi-student-grades.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("FAIL: env Supabase manquante");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const ok = (m) => console.log(`✓ ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

async function testGenericCarnet() {
  const { data: filieres } = await sb
    .from("filieres")
    .select("id, name, center_id, centers(name, center_type)")
    .limit(40);

  for (const f of filieres || []) {
    const ctype = f.centers?.center_type;
    if (ctype === "tcf_canada") continue;

    const { data: enrolls } = await sb
      .from("enrollments")
      .select("id, student_id")
      .eq("filiere_id", f.id)
      .eq("status", "active")
      .limit(3);
    if (!enrolls || enrolls.length < 2) continue;

    const { data: mats } = await sb
      .from("filiere_matieres")
      .select("id, max_score")
      .eq("filiere_id", f.id)
      .limit(1);
    if (!mats?.length) continue;

    const { data: periods } = await sb
      .from("grade_periods")
      .select("id")
      .eq("center_id", f.center_id)
      .eq("is_active", true)
      .limit(5);
    const periodId = periods?.[0]?.id;
    if (!periodId) continue;

    const { data: staff } = await sb
      .from("profiles")
      .select("id")
      .eq("center_id", f.center_id)
      .in("role", ["center_admin", "admin", "staff", "formateur", "trainer"])
      .limit(1);
    const formateurId = staff?.[0]?.id;
    if (!formateurId) continue;

    const pair = enrolls.slice(0, 2);
    const maxScore = Number(mats[0].max_score) || 20;
    const scores = [Math.min(12, maxScore), Math.min(15, maxScore)];
    const touched = [];

    for (let i = 0; i < 2; i++) {
      const enrollmentId = pair[i].id;
      const { data: existing } = await sb
        .from("grades")
        .select("id")
        .eq("enrollment_id", enrollmentId)
        .eq("filiere_matiere_id", mats[0].id)
        .eq("period_id", periodId)
        .is("title", null)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await sb
          .from("grades")
          .update({ score: scores[i], max_score: maxScore })
          .eq("id", existing.id);
        if (error) fail(`update: ${error.message}`);
        touched.push({ id: existing.id, created: false, score: scores[i] });
      } else {
        const { data, error } = await sb
          .from("grades")
          .insert({
            enrollment_id: enrollmentId,
            filiere_matiere_id: mats[0].id,
            period_id: periodId,
            formateur_id: formateurId,
            score: scores[i],
            max_score: maxScore,
            title: null,
          })
          .select("id")
          .single();
        if (error) fail(`insert: ${error.message}`);
        touched.push({ id: data.id, created: true, score: scores[i] });
      }
    }

    const { data: verify } = await sb
      .from("grades")
      .select("id, score")
      .in(
        "id",
        touched.map((t) => t.id),
      );
    if ((verify || []).length < 2) fail("verify grades < 2");

    ok(`Carnet « ${f.centers?.name || f.name} » — 2 notes (${scores.join(" / ")}) /${maxScore}`);

    // cleanup only freshly inserted rows
    const toDelete = touched.filter((t) => t.created).map((t) => t.id);
    if (toDelete.length) {
      await sb.from("grades").delete().in("id", toDelete);
      ok(`Cleanup ${toDelete.length} note(s) de test`);
    }
    return true;
  }
  return false;
}

async function testTcfSession() {
  const { data: centers } = await sb
    .from("centers")
    .select("id, name")
    .eq("center_type", "tcf_canada")
    .limit(10);

  for (const center of centers || []) {
    const { data: students } = await sb
      .from("profiles")
      .select("id, prenom, nom")
      .eq("center_id", center.id)
      .eq("role", "student")
      .limit(3);
    if (!students || students.length < 2) continue;

    const ids = students.slice(0, 2).map((s) => s.id);
    const now = new Date();
    const end = new Date(now.getTime() + 4 * 3600 * 1000);
    const title = `[UX-TEST] Multi ${now.toISOString().slice(0, 16)}`;

    const { data: session, error } = await sb
      .from("tcf_exam_sessions")
      .insert({
        center_id: center.id,
        title,
        examen_id: 1,
        scheduled_at: now.toISOString(),
        window_start: now.toISOString(),
        window_end: end.toISOString(),
        session_type: "exceptional",
        status: "open",
        target_scope: "students",
      })
      .select("id, title")
      .single();
    if (error || !session) fail(`session: ${error?.message || "no row"}`);

    const { error: linkErr } = await sb.from("tcf_exam_session_students").insert(
      ids.map((uid) => ({ session_id: session.id, user_id: uid })),
    );
    if (linkErr) fail(`session_students: ${linkErr.message}`);

    const { error: asgErr } = await sb.from("tcf_exam_assignments").insert(
      ids.map((uid) => ({
        session_id: session.id,
        user_id: uid,
        status: "assigned",
      })),
    );
    if (asgErr) fail(`assignments: ${asgErr.message}`);

    const { data: asgs, error: vErr } = await sb
      .from("tcf_exam_assignments")
      .select("id, user_id, status")
      .eq("session_id", session.id);
    if (vErr) fail(vErr.message);
    if ((asgs || []).length < 2) fail(`assignments count=${asgs?.length}`);

    ok(`Séance TCF « ${center.name} » : ${session.title}`);
    ok(`Assignés (${asgs.length}) : ${students.slice(0, 2).map((s) => `${s.prenom} ${s.nom || ""}`.trim()).join(", ")}`);

    // cleanup test session
    await sb.from("tcf_exam_assignments").delete().eq("session_id", session.id);
    await sb.from("tcf_exam_session_students").delete().eq("session_id", session.id);
    await sb.from("tcf_exam_sessions").delete().eq("id", session.id);
    ok("Cleanup séance de test");
    return true;
  }
  return false;
}

async function main() {
  const carnet = await testGenericCarnet();
  if (carnet) {
    console.log("PASS carnet multi-étudiants");
  } else {
    console.log("INFO: pas de centre générique prêt pour le carnet");
  }

  const tcf = await testTcfSession();
  if (!tcf && !carnet) fail("Aucun scénario multi-étudiants exécutable");
  if (tcf) console.log("PASS séance TCF multi-étudiants");
  console.log("PASS");
}

main().catch((e) => fail(e.message || String(e)));
