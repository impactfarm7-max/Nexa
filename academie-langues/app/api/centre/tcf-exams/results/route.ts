import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { computeExamCompositeScore, computeMonthlyRankings } from "@/app/utils/tcfExamScoring";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  let query = supabaseAdmin
    .from("exam_sessions")
    .select(`
      id, user_id, examen_id, status, finished_at, started_at,
      ce_result, co_result, ee_result, eo_result, assignment_id,
      profiles:user_id(prenom, nom, email)
    `)
    .eq("center_id", profile.center_id)
    .eq("status", "completed")
    .order("finished_at", { ascending: false })
    .limit(200);

  if (sessionId) {
    const { data: assignments } = await supabaseAdmin
      .from("tcf_exam_assignments")
      .select("exam_session_id")
      .eq("session_id", sessionId)
      .not("exam_session_id", "is", null);
    const examSessionIds = (assignments ?? []).map((a) => a.exam_session_id).filter(Boolean);
    if (examSessionIds.length === 0) {
      return NextResponse.json({ results: [], leaderboard: [] });
    }
    query = query.in("id", examSessionIds);
  }

  const { data: sessions } = await query;

  const examSessionIds = (sessions ?? []).map((s) => s.id);
  let certMap: Record<string, { pdf_url: string | null; emailed_at: string | null; id: string }> = {};
  if (examSessionIds.length > 0) {
    const { data: certs } = await supabaseAdmin
      .from("exam_certificates")
      .select("id, session_id, pdf_url, emailed_at")
      .eq("session_table", "exam_sessions")
      .in("session_id", examSessionIds);
    for (const c of certs ?? []) {
      certMap[c.session_id] = c;
    }
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const results = (sessions ?? []).map((s: any) => {
    const p = s.profiles;
    const cert = certMap[s.id];
    const composite = computeExamCompositeScore(s);
    return {
      exam_session_id: s.id,
      user_id: s.user_id,
      student_name: `${p?.prenom || ""} ${p?.nom || ""}`.trim() || "Élève",
      email: p?.email || null,
      examen_id: s.examen_id,
      finished_at: s.finished_at,
      ce: s.ce_result,
      co: s.co_result,
      ee: s.ee_result,
      eo: s.eo_result,
      composite_score: composite,
      certificate_id: cert?.id || null,
      pdf_url: cert?.pdf_url || null,
      emailed_at: cert?.emailed_at || null,
    };
  });

  const monthSessions = (sessions ?? []).filter(
    (s) => s.finished_at && s.finished_at >= monthStart
  );
  const rankInput = monthSessions.map((s) => ({
    user_id: s.user_id,
    composite_score: computeExamCompositeScore(s),
  }));
  const rankMap = computeMonthlyRankings(rankInput);

  const profileIds = [...new Set(monthSessions.map((s) => s.user_id))];
  const { data: profs } = profileIds.length
    ? await supabaseAdmin.from("profiles").select("id, prenom, nom").in("id", profileIds)
    : { data: [] };

  const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
  const leaderboard = profileIds
    .map((uid) => {
      const r = rankMap.get(uid);
      const p = profMap.get(uid);
      const best = rankInput.filter((x) => x.user_id === uid).sort((a, b) => b.composite_score - a.composite_score)[0];
      return {
        user_id: uid,
        name: `${p?.prenom || ""} ${p?.nom || ""}`.trim(),
        composite_score: best?.composite_score ?? 0,
        rank: r?.rank ?? null,
      };
    })
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const { data: pendingAssignments } = await supabaseAdmin
    .from("tcf_exam_assignments")
    .select(`
      id, status, user_id,
      profiles:user_id(prenom, nom),
      tcf_exam_sessions:session_id (title, scheduled_at)
    `)
    .eq("status", "assigned")
    .in(
      "session_id",
      (
        await supabaseAdmin
          .from("tcf_exam_sessions")
          .select("id")
          .eq("center_id", profile.center_id)
      ).data?.map((s) => s.id) ?? []
    );

  return NextResponse.json({
    results,
    leaderboard,
    not_submitted: (pendingAssignments ?? []).map((a: any) => ({
      assignment_id: a.id,
      user_id: a.user_id,
      name: `${a.profiles?.prenom || ""} ${a.profiles?.nom || ""}`.trim(),
      session_title: a.tcf_exam_sessions?.title,
      scheduled_at: a.tcf_exam_sessions?.scheduled_at,
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { assignment_id, status } = await req.json();
  if (!assignment_id || !status) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const { data: assignment } = await supabaseAdmin
    .from("tcf_exam_assignments")
    .select("id, session_id, tcf_exam_sessions!inner(center_id)")
    .eq("id", assignment_id)
    .maybeSingle();

  const sessionCenter = (assignment as any)?.tcf_exam_sessions?.center_id;
  if (!assignment || sessionCenter !== profile.center_id) {
    return NextResponse.json({ error: "Assignment introuvable." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("tcf_exam_assignments")
    .update({ status })
    .eq("id", assignment_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
