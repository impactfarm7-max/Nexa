import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { requireTcfCenter } from "@/app/utils/tcf-center-auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];

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

  const tcfError = await requireTcfCenter(profile.center_id);
  if (tcfError) return tcfError;

  const month = new URL(req.url).searchParams.get("month");
  let start: Date;
  let end: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0, 23, 59, 59);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const { data: sessions } = await supabaseAdmin
    .from("tcf_exam_sessions")
    .select("id, title, examen_id, scheduled_at, window_start, window_end, session_type, status")
    .eq("center_id", profile.center_id)
    .gte("scheduled_at", start.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at");

  const sessionIds = (sessions ?? []).map((s) => s.id);
  let assignments: any[] = [];
  if (sessionIds.length > 0) {
    const { data: assignRows } = await supabaseAdmin
      .from("tcf_exam_assignments")
      .select("id, session_id, user_id, status, profiles:user_id(prenom, nom)")
      .in("session_id", sessionIds);
    assignments = assignRows ?? [];
  }

  const days: Record<string, Array<{
    session_id: string;
    title: string;
    examen_id: number;
    scheduled_at: string;
    students: { id: string; name: string; status: string }[];
  }>> = {};

  for (const s of sessions ?? []) {
    const dayKey = new Date(s.scheduled_at).toISOString().slice(0, 10);
    const studs = assignments
      .filter((a) => a.session_id === s.id)
      .map((a) => ({
        id: a.user_id,
        name: `${(a.profiles as any)?.prenom || ""} ${(a.profiles as any)?.nom || ""}`.trim() || "Élève",
        status: a.status,
      }));

    if (!days[dayKey]) days[dayKey] = [];
    days[dayKey].push({
      session_id: s.id,
      title: s.title,
      examen_id: s.examen_id,
      scheduled_at: s.scheduled_at,
      students: studs,
    });
  }

  return NextResponse.json({ month: start.toISOString().slice(0, 7), days, sessions: sessions ?? [] });
}
