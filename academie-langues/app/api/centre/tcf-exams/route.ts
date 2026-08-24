import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { requireTcfCenter } from "@/app/utils/tcf-center-auth-server";
import {
  createTcfExamAssignments,
  resolveTcfExamStudentIds,
  type TargetScope,
} from "@/app/utils/tcfExamSessions.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];
const MAX_EXAMEN_ID = 25;

function parseExamenId(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_EXAMEN_ID) return null;
  return n;
}

async function getStaffProfile(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, center_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) return null;
  return profile;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const profile = await getStaffProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const tcfError = await requireTcfCenter(profile.center_id);
  if (tcfError) return tcfError;

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (sessionId) {
    const { data: session, error } = await supabaseAdmin
      .from("tcf_exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("center_id", profile.center_id)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
    }

    const [{ data: grps }, { data: studs }] = await Promise.all([
      supabaseAdmin.from("tcf_exam_session_groupes").select("groupe_id").eq("session_id", sessionId),
      supabaseAdmin.from("tcf_exam_session_students").select("user_id").eq("session_id", sessionId),
    ]);

    return NextResponse.json({
      session,
      groupe_ids: (grps ?? []).map((g) => g.groupe_id),
      student_ids: (studs ?? []).map((s) => s.user_id),
    });
  }

  const { data: sessions } = await supabaseAdmin
    .from("tcf_exam_sessions")
    .select("*")
    .eq("center_id", profile.center_id)
    .order("scheduled_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ sessions: sessions ?? [] });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const profile = await getStaffProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const tcfError = await requireTcfCenter(profile.center_id);
  if (tcfError) return tcfError;

  try {
    const body = await req.json();
    const {
      title,
      examen_id,
      scheduled_at,
      window_start,
      window_end,
      session_type = "scheduled",
      target_scope = "all",
      groupe_ids = [],
      student_ids = [],
      open_now = false,
    } = body;

    if (!title?.trim() || !examen_id || !scheduled_at) {
      return NextResponse.json({ error: "title, examen_id et scheduled_at requis." }, { status: 400 });
    }

    const parsedExamenId = parseExamenId(examen_id);
    if (parsedExamenId === null) {
      return NextResponse.json({ error: `examen_id doit être un entier entre 1 et ${MAX_EXAMEN_ID}.` }, { status: 400 });
    }

    const scheduledAt = new Date(scheduled_at);
    const windowStart = window_start ? new Date(window_start) : open_now ? new Date() : scheduledAt;
    const windowEnd = window_end
      ? new Date(window_end)
      : new Date(windowStart.getTime() + 4 * 3600 * 1000);

    const { data: session, error } = await supabaseAdmin
      .from("tcf_exam_sessions")
      .insert({
        center_id: profile.center_id,
        title: title.trim(),
        examen_id: parsedExamenId,
        scheduled_at: scheduledAt.toISOString(),
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        session_type: session_type === "exceptional" ? "exceptional" : "scheduled",
        status: open_now ? "open" : "planned",
        target_scope,
        created_by: user.id,
      })
      .select("id, title")
      .single();

    if (error || !session) {
      return NextResponse.json({ error: error?.message || "Erreur création." }, { status: 500 });
    }

    if (target_scope === "groupes" && groupe_ids.length > 0) {
      await supabaseAdmin.from("tcf_exam_session_groupes").insert(
        groupe_ids.map((gid: string) => ({ session_id: session.id, groupe_id: gid }))
      );
    }
    if (target_scope === "students" && student_ids.length > 0) {
      await supabaseAdmin.from("tcf_exam_session_students").insert(
        student_ids.map((sid: string) => ({ session_id: session.id, user_id: sid }))
      );
    }

    const studentIds = await resolveTcfExamStudentIds(
      supabaseAdmin,
      profile.center_id,
      target_scope as TargetScope,
      groupe_ids,
      student_ids
    );

    await createTcfExamAssignments(supabaseAdmin, session.id, studentIds, session.title);

    return NextResponse.json({ session_id: session.id, assigned_count: studentIds.length });
  } catch (err) {
    console.error("tcf-exams POST:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const profile = await getStaffProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const tcfError = await requireTcfCenter(profile.center_id);
  if (tcfError) return tcfError;

  const body = await req.json();
  const {
    session_id,
    status,
    open_now,
    title,
    examen_id,
    scheduled_at,
    window_start,
    window_end,
    session_type,
  } = body;

  if (!session_id) return NextResponse.json({ error: "session_id requis." }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("tcf_exam_sessions")
    .select("id, status, scheduled_at, window_start")
    .eq("id", session_id)
    .eq("center_id", profile.center_id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  }

  if (existing.status === "cancelled") {
    return NextResponse.json({ error: "Impossible de modifier une séance annulée." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (title !== undefined) {
    if (!String(title).trim()) {
      return NextResponse.json({ error: "Le titre ne peut pas être vide." }, { status: 400 });
    }
    updates.title = String(title).trim();
  }

  if (examen_id !== undefined) {
    const parsedExamenId = parseExamenId(examen_id);
    if (parsedExamenId === null) {
      return NextResponse.json({ error: `examen_id doit être un entier entre 1 et ${MAX_EXAMEN_ID}.` }, { status: 400 });
    }
    updates.examen_id = parsedExamenId;
  }

  if (session_type !== undefined) {
    updates.session_type = session_type === "exceptional" ? "exceptional" : "scheduled";
  }

  if (scheduled_at !== undefined) {
    const scheduledAt = new Date(scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }
    updates.scheduled_at = scheduledAt.toISOString();

    const ws = window_start ? new Date(window_start) : scheduledAt;
    const we = window_end
      ? new Date(window_end)
      : new Date(ws.getTime() + 4 * 3600 * 1000);
    updates.window_start = ws.toISOString();
    updates.window_end = we.toISOString();
  } else if (window_start !== undefined || window_end !== undefined) {
    if (window_start) updates.window_start = new Date(window_start).toISOString();
    if (window_end) updates.window_end = new Date(window_end).toISOString();
  }

  if (status) updates.status = status;

  if (open_now) {
    updates.status = "open";
    updates.window_start = new Date().toISOString();
    updates.window_end = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("tcf_exam_sessions")
    .update(updates)
    .eq("id", session_id)
    .eq("center_id", profile.center_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
