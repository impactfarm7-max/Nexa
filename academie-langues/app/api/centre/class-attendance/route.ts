import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  resolveSlotGroupeIds,
  resolveSlotStudentRoster,
  type AttendanceStatus,
} from "@/app/utils/classAttendance.server";
import {
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
  slotTouchesTrainerScope,
} from "@/app/utils/trainerAcademicScope.server";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function requireUniversite(ctx: { centerType: string | null }) {
  if (ctx.centerType !== "universite") {
    return fail("Réservé aux centres université.", 403);
  }
  return null;
}

/** Formateurs : module cours ; direction / staff planning. */
async function requireAttendanceAccess(ctx: Parameters<typeof requireCenterPermission>[0]) {
  if (ctx.role === "trainer") {
    return requireCenterPermission(ctx, "cours");
  }
  const plan = await requireCenterPermission(ctx, "planning");
  if (!plan) return null;
  return requireCenterPermission(ctx, "cours");
}

export async function GET(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireAttendanceAccess(auth.ctx);
  if (perm) return perm;
  const univErr = await requireUniversite(auth.ctx);
  if (univErr) return univErr;

  const trainerScope = isTrainerLeastPrivilege(auth.ctx)
    ? await getTrainerAcademicScope(supabaseAdmin, auth.ctx.user.id, auth.ctx.centerId)
    : null;
  if (trainerScope?.empty) return NextResponse.json({ sessions: [] });

  const url = new URL(req.url);
  const slotId = url.searchParams.get("slot_id");
  const sessionDate = url.searchParams.get("session_date");

  if (slotId && sessionDate) {
    const { data: slot, error } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, title, room_name, specific_date, start_time, end_time, groupe_id, filiere_id, session_scope, exam_disciplines(name)")
      .eq("id", slotId)
      .eq("center_id", auth.ctx.centerId)
      .maybeSingle();
    if (error || !slot) return fail("Séance introuvable.", 404);
    if (slot.session_scope === "live") return fail("Assiduité réservée aux séances de cours.", 400);

    const date = slot.specific_date || sessionDate;
    if (date !== sessionDate) return fail("Date de séance incohérente.");

    const groupeIds = await resolveSlotGroupeIds(supabaseAdmin, slot.id, slot.groupe_id);
    if (trainerScope && !slotTouchesTrainerScope(trainerScope, groupeIds)) {
      return fail("Hors de votre périmètre (promotion).", 403);
    }

    const students = await resolveSlotStudentRoster(supabaseAdmin, auth.ctx.centerId, groupeIds);

    const { data: marks } = await supabaseAdmin
      .from("class_attendance")
      .select("user_id, status")
      .eq("slot_id", slotId)
      .eq("session_date", sessionDate);

    const statusByUser = new Map((marks ?? []).map((m) => [m.user_id, m.status as AttendanceStatus]));
    const disc = slot.exam_disciplines as { name?: string } | { name?: string }[] | null;
    const discName = Array.isArray(disc) ? disc[0]?.name : disc?.name;

    return NextResponse.json({
      session: {
        slot_id: slot.id,
        session_date: sessionDate,
        title: (slot.title || discName || "Séance").trim(),
        room_name: (slot.room_name || "").trim(),
        start_time: String(slot.start_time || "").slice(0, 5),
        end_time: String(slot.end_time || "").slice(0, 5),
      },
      students: students.map((s) => ({
        ...s,
        status: statusByUser.get(s.id) || null,
      })),
    });
  }

  const from = url.searchParams.get("from") || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);

  const { data: slots, error } = await supabaseAdmin
    .from("schedule_slots")
    .select("id, title, room_name, specific_date, start_time, end_time, groupe_id, session_scope, exam_disciplines(name)")
    .eq("center_id", auth.ctx.centerId)
    .not("specific_date", "is", null)
    .gte("specific_date", from)
    .lte("specific_date", to)
    .neq("session_scope", "live")
    .order("specific_date", { ascending: false })
    .limit(80);

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return NextResponse.json({ sessions: [] });
    return fail(error.message, 500);
  }

  let filteredSlots = slots ?? [];
  if (trainerScope) {
    const kept: typeof filteredSlots = [];
    for (const s of filteredSlots) {
      const gids = await resolveSlotGroupeIds(supabaseAdmin, s.id, s.groupe_id);
      if (slotTouchesTrainerScope(trainerScope, gids)) kept.push(s);
    }
    filteredSlots = kept;
  }

  const sessions = filteredSlots.map((s) => {
    const disc = s.exam_disciplines as { name?: string } | { name?: string }[] | null;
    const discName = Array.isArray(disc) ? disc[0]?.name : disc?.name;
    return {
      slot_id: s.id,
      session_date: s.specific_date as string,
      title: (s.title || discName || "Séance").trim(),
      room_name: (s.room_name || "").trim(),
      start_time: String(s.start_time || "").slice(0, 5),
      end_time: String(s.end_time || "").slice(0, 5),
    };
  });

  return NextResponse.json({ sessions });
}

export async function PUT(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireAttendanceAccess(auth.ctx);
  if (perm) return perm;
  const univErr = await requireUniversite(auth.ctx);
  if (univErr) return univErr;

  try {
    const body = await req.json();
    const slotId = String(body.slot_id || "");
    const sessionDate = String(body.session_date || "");
    const marks = Array.isArray(body.marks) ? body.marks : [];

    if (!slotId || !sessionDate) return fail("slot_id et session_date requis.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return fail("Date invalide.");

    const { data: slot } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, specific_date, groupe_id, session_scope")
      .eq("id", slotId)
      .eq("center_id", auth.ctx.centerId)
      .maybeSingle();
    if (!slot) return fail("Séance introuvable.", 404);
    if (slot.session_scope === "live") return fail("Assiduité réservée aux séances de cours.", 400);
    if (slot.specific_date && slot.specific_date !== sessionDate) {
      return fail("Date de séance incohérente.");
    }

    const groupeIds = await resolveSlotGroupeIds(supabaseAdmin, slotId, slot.groupe_id);
    if (isTrainerLeastPrivilege(auth.ctx)) {
      const scope = await getTrainerAcademicScope(supabaseAdmin, auth.ctx.user.id, auth.ctx.centerId);
      if (scope.empty || !slotTouchesTrainerScope(scope, groupeIds)) {
        return fail("Hors de votre périmètre (promotion).", 403);
      }
    }

    const roster = await resolveSlotStudentRoster(supabaseAdmin, auth.ctx.centerId, groupeIds);
    const allowed = new Set(roster.map((s) => s.id));

    const toUpsert: {
      center_id: string;
      slot_id: string;
      session_date: string;
      user_id: string;
      status: AttendanceStatus;
      marked_by: string;
      marked_at: string;
    }[] = [];
    const toClear: string[] = [];

    for (const raw of marks) {
      const userId = String(raw.user_id || "");
      if (!userId || !allowed.has(userId)) continue;
      const status = raw.status;
      if (status === null || status === "" || status === undefined) {
        toClear.push(userId);
        continue;
      }
      if (status !== "present" && status !== "absent") continue;
      toUpsert.push({
        center_id: auth.ctx.centerId,
        slot_id: slotId,
        session_date: sessionDate,
        user_id: userId,
        status,
        marked_by: auth.ctx.user.id,
        marked_at: new Date().toISOString(),
      });
    }

    if (toClear.length) {
      await supabaseAdmin
        .from("class_attendance")
        .delete()
        .eq("slot_id", slotId)
        .eq("session_date", sessionDate)
        .in("user_id", toClear);
    }

    if (toUpsert.length) {
      const { error } = await supabaseAdmin.from("class_attendance").upsert(toUpsert, {
        onConflict: "slot_id,session_date,user_id",
      });
      if (error) {
        if (["42P01", "PGRST205"].includes(error.code)) {
          return fail("Table assiduité absente — exécutez supabase-class-attendance-universite-2026-09-22.sql.", 503);
        }
        return fail(error.message, 500);
      }
    }

    return NextResponse.json({ ok: true, saved: toUpsert.length, cleared: toClear.length });
  } catch (e) {
    console.error("[centre/class-attendance PUT]", e);
    return fail("Enregistrement impossible.", 500);
  }
}
