import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/app/utils/push-server";
import { sendEmails } from "@/app/utils/email-server";
import {
  collectiveJoinPath,
  reminderDueAtMinutes,
  sessionStartMs,
  normalizeReminderMinutes,
} from "@/app/utils/collectiveLive";
import { collectiveTargetGroupeIds } from "@/app/utils/collectiveTargeting";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIME_ZONE = "Africa/Douala";
const CRON_WINDOW = 5;

function sessionToDate(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`);
}

function formatWhen(sessionDate: string, sessionTime: string) {
  return sessionToDate(sessionDate, sessionTime).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

async function getCenterReminderMinutes(centerId: string | null): Promise<number> {
  if (!centerId) return 120;
  const { data } = await supabaseAdmin
    .from("centers")
    .select("coaching_reminder_minutes")
    .eq("id", centerId)
    .maybeSingle();
  return normalizeReminderMinutes(data?.coaching_reminder_minutes);
}

// Managers d'un centre : destinataires des rappels pour les étudiants du centre
// (les admins NEXA ne sont jamais notifiés des interactions d'un étudiant de centre).
async function getCenterManagerIds(centerId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("center_users")
    .select("user_id")
    .eq("center_id", centerId);
  return (data ?? []).map((m) => m.user_id);
}

async function getStudentIdsForGroupes(groupeIds: string[]): Promise<string[]> {
  if (groupeIds.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("enrollments")
    .select("student_id")
    .in("groupe_id", groupeIds)
    .eq("status", "active");
  return [...new Set((data ?? []).map((e) => e.student_id))];
}

async function getStudentIdsForCenter(centerId: string): Promise<string[]> {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", centerId);
  const studentIds = (profiles ?? []).map((p) => p.id);
  if (studentIds.length === 0) return [];

  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("student_id")
    .in("student_id", studentIds)
    .eq("status", "active");
  return [...new Set((enrollments ?? []).map((e) => e.student_id))];
}

function expandCollectiveOccurrences(
  slot: {
    id: string;
    specific_date: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    title: string | null;
    mode: string;
    center_id: string;
    schedule_exceptions?: Array<{ exception_date: string; type: string; new_date?: string; new_start_time?: string }>;
    schedule_slot_groupes?: Array<{ groupe_id: string }>;
  },
  from: string,
  to: string
) {
  const occurrences: Array<{
    slot_id: string;
    date: string;
    start_time: string;
    title: string;
    mode: string;
    center_id: string;
    groupe_ids: string[];
  }> = [];

  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    const dow = d.getDay() === 0 ? 7 : d.getDay();

    const isOneOff = !!slot.specific_date;
    if (isOneOff && slot.specific_date !== dateKey) continue;
    if (!isOneOff && slot.day_of_week !== dow) continue;

    const ex = (slot.schedule_exceptions ?? []).find((e) => e.exception_date === dateKey);
    if (ex?.type === "cancelled") continue;

    let displayDate = dateKey;
    let startTime = slot.start_time;
    if (ex?.type === "rescheduled") {
      if (ex.new_date) displayDate = ex.new_date;
      if (ex.new_start_time) startTime = ex.new_start_time;
    }

    const groupeIds = (slot.schedule_slot_groupes ?? []).map((g) => g.groupe_id);
    occurrences.push({
      slot_id: slot.id,
      date: displayDate,
      start_time: startTime,
      title: slot.title || "Séance collective",
      mode: slot.mode,
      center_id: slot.center_id,
      groupe_ids: groupeIds,
    });
  }

  return occurrences;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const now = Date.now();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const horizon = new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  let individualSent = 0;
  let collectiveSent = 0;

  // ── Coaching individuel (par centre) ───────────────────────────────────────
  const { data: appointments, error } = await supabaseAdmin
    .from("coaching_sessions")
    .select(`
      id, user_id, session_date, session_time,
      rescheduled_date, rescheduled_time,
      reminder_sent_at,
      profiles:user_id(prenom, email, center_id)
    `)
    .in("status", ["confirme", "confirmed"])
    .is("reminder_sent_at", null)
    .gte("session_date", today)
    .lte("session_date", horizon);

  if (error) {
    console.error("coaching reminders query error:", error);
    return NextResponse.json({ error: "DB error." }, { status: 500 });
  }

  const { data: admins } = await supabaseAdmin.from("profiles").select("id, email").eq("role", "admin");
  const adminIds = (admins ?? []).map((a) => a.id);
  const centerReminderCache = new Map<string, number>();
  const centerManagerCache = new Map<string, string[]>();

  for (const appointment of appointments ?? []) {
    const profile = appointment.profiles as { prenom?: string; email?: string; center_id?: string } | null;
    const centerId = profile?.center_id ?? null;

    let targetMinutes = centerReminderCache.get(centerId ?? "");
    if (targetMinutes === undefined) {
      targetMinutes = await getCenterReminderMinutes(centerId);
      centerReminderCache.set(centerId ?? "", targetMinutes);
    }

    // Étudiant de centre → rappel aux managers du centre ; sinon → admins NEXA.
    let staffIds: string[];
    if (centerId) {
      staffIds = centerManagerCache.get(centerId) ?? await getCenterManagerIds(centerId);
      centerManagerCache.set(centerId, staffIds);
    } else {
      staffIds = adminIds;
    }

    const sessionDate = appointment.rescheduled_date || appointment.session_date;
    const sessionTime = (appointment.rescheduled_time || appointment.session_time)?.slice(0, 5);
    const startMs = sessionStartMs(sessionDate, sessionTime);

    if (!reminderDueAtMinutes(startMs, now, targetMinutes, CRON_WINDOW)) continue;

    const when = formatWhen(sessionDate, sessionTime);
    const studentName = profile?.prenom || profile?.email || "l'étudiant";
    const studentMessage = `Rappel : votre séance individuelle Live commence ${targetMinutes >= 60 ? `dans ${Math.round(targetMinutes / 60)} h` : `dans ${targetMinutes} min`} (${when}).`;
    const adminMessage = `Rappel : coaching avec ${studentName} — ${when}.`;

    await supabaseAdmin.from("notifications").insert([
      { user_id: appointment.user_id, message: studentMessage },
      ...staffIds.map((id) => ({ user_id: id, message: adminMessage })),
    ]);

    await sendPushToUsers([appointment.user_id], {
      title: "Rappel séance Live",
      body: studentMessage,
      url: centerId ? "/tcf-canada/live" : "/dashboard/coaching",
    });

    if (profile?.email) {
      await sendEmails([{
        to: profile.email,
        subject: "Rappel séance Live - NEXA",
        text: `${studentMessage}\n\nNEXA`,
      }]);
    }

    await supabaseAdmin
      .from("coaching_sessions")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", appointment.id);

    individualSent += 1;
  }

  // ── Séances collectives TCF ────────────────────────────────────────────────
  const { data: collectiveSlots } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, center_id, groupe_id, title, mode, start_time, end_time, specific_date, day_of_week,
      schedule_exceptions(exception_date, type, new_date, new_start_time),
      schedule_slot_groupes(groupe_id)
    `)
    .eq("session_scope", "collective");

  const { data: sentReminders } = await supabaseAdmin
    .from("schedule_slot_reminders")
    .select("slot_id, session_date")
    .gte("session_date", today)
    .lte("session_date", horizon);

  const sentSet = new Set((sentReminders ?? []).map((r) => `${r.slot_id}:${r.session_date}`));

  for (const slot of collectiveSlots ?? []) {
    let targetMinutes = centerReminderCache.get(slot.center_id);
    if (targetMinutes === undefined) {
      targetMinutes = await getCenterReminderMinutes(slot.center_id);
      centerReminderCache.set(slot.center_id, targetMinutes);
    }

    const occurrences = expandCollectiveOccurrences(slot, today, horizon);

    for (const occ of occurrences) {
      const key = `${occ.slot_id}:${occ.date}`;
      if (sentSet.has(key)) continue;

      const startMs = sessionStartMs(occ.date, occ.start_time);
      if (!reminderDueAtMinutes(startMs, now, targetMinutes, CRON_WINDOW)) continue;

      const targetGroupeIds = collectiveTargetGroupeIds({
        groupe_id: slot.groupe_id ?? null,
        schedule_slot_groupes: slot.schedule_slot_groupes,
      });
      // Coaching de groupe : classes ciblées + étudiants basculés depuis un 1-on-1
      const classIds =
        targetGroupeIds.length > 0 ? await getStudentIdsForGroupes(targetGroupeIds) : [];
      const { data: mergedRows } = await supabaseAdmin
        .from("coaching_sessions")
        .select("user_id")
        .eq("merged_slot_id", occ.slot_id)
        .eq("status", "bascule");
      const mergedIds = (mergedRows ?? []).map((r) => r.user_id).filter(Boolean);
      const studentIds = [...new Set([...classIds, ...mergedIds])];
      if (studentIds.length === 0) {
        await supabaseAdmin.from("schedule_slot_reminders").insert({
          slot_id: occ.slot_id,
          session_date: occ.date,
        });
        continue;
      }

      const when = formatWhen(occ.date, occ.start_time);
      const modeLabel = occ.mode === "en_ligne" ? "En ligne" : "Présentiel";
      const joinPath =
        occ.mode === "en_ligne" ? collectiveJoinPath(occ.slot_id, occ.date) : null;
      const msg = joinPath
        ? `Rappel : « ${occ.title} » (${modeLabel}) — ${when}. Rejoignez la visio : ${joinPath}`
        : `Rappel : « ${occ.title} » (${modeLabel}) — ${when}.`;

      await supabaseAdmin.from("notifications").insert(
        studentIds.map((uid) => ({ user_id: uid, message: msg }))
      );

      await sendPushToUsers(studentIds, {
        title: "Rappel coaching de groupe",
        body: `« ${occ.title} » — ${when}`,
        url: joinPath ?? "/dashboard/coaching",
      });

      await supabaseAdmin.from("schedule_slot_reminders").insert({
        slot_id: occ.slot_id,
        session_date: occ.date,
      });

      collectiveSent += 1;
    }
  }

  // ── Sessions Live (participants choisis) ───────────────────────────────────
  const { data: liveSlots } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, center_id, title, mode, start_time, end_time, specific_date, day_of_week,
      schedule_exceptions(exception_date, type, new_date, new_start_time),
      schedule_slot_participants(user_id)
    `)
    .eq("session_scope", "live")
    .eq("mode", "en_ligne");

  let liveSent = 0;
  for (const slot of liveSlots ?? []) {
    let targetMinutes = centerReminderCache.get(slot.center_id);
    if (targetMinutes === undefined) {
      targetMinutes = await getCenterReminderMinutes(slot.center_id);
      centerReminderCache.set(slot.center_id, targetMinutes);
    }

    const occurrences = expandCollectiveOccurrences(
      {
        id: slot.id,
        title: slot.title,
        mode: slot.mode,
        start_time: slot.start_time,
        end_time: slot.end_time,
        specific_date: slot.specific_date,
        day_of_week: slot.day_of_week,
        center_id: slot.center_id,
        schedule_exceptions: slot.schedule_exceptions,
      },
      today,
      horizon
    );

    for (const occ of occurrences) {
      const key = `${occ.slot_id}:${occ.date}`;
      if (sentSet.has(key)) continue;

      const startMs = sessionStartMs(occ.date, occ.start_time);
      if (!reminderDueAtMinutes(startMs, now, targetMinutes, CRON_WINDOW)) continue;

      const participantIds = [
        ...new Set(
          ((slot.schedule_slot_participants ?? []) as Array<{ user_id: string }>)
            .map((p) => p.user_id)
            .filter(Boolean)
        ),
      ];
      if (participantIds.length === 0) {
        await supabaseAdmin.from("schedule_slot_reminders").insert({
          slot_id: occ.slot_id,
          session_date: occ.date,
        });
        sentSet.add(key);
        continue;
      }

      const when = formatWhen(occ.date, occ.start_time);
      const joinPath = collectiveJoinPath(occ.slot_id, occ.date);
      const msg = `Rappel Session Live : « ${occ.title} » — ${when}. Rejoignez : ${joinPath}`;

      await supabaseAdmin.from("notifications").insert(
        participantIds.map((uid) => ({ user_id: uid, message: msg }))
      );
      await sendPushToUsers(participantIds, {
        title: "Rappel Session Live",
        body: `« ${occ.title} » — ${when}`,
        url: joinPath,
      });
      await supabaseAdmin.from("schedule_slot_reminders").insert({
        slot_id: occ.slot_id,
        session_date: occ.date,
      });
      sentSet.add(key);
      liveSent += 1;
    }
  }

  // ── Ancien coaching groupe (15 min fixe, rétrocompat) ────────────────────
  const { data: groupSessions } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("id, title, session_date, session_time")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("session_date", today)
    .lte("session_date", horizon);

  let legacyGroupSent = 0;
  if ((groupSessions ?? []).length > 0) {
    const { data: eligibleProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, coaching_total, tag_status, role")
      .gt("coaching_total", 0);

    const eligibleIds = (eligibleProfiles ?? [])
      .filter((p) => p.role !== "admin" && p.coaching_total > 0 && p.tag_status !== "revoque" && p.tag_status !== "termine")
      .map((p) => p.id);

    for (const gs of groupSessions ?? []) {
      const start = sessionStartMs(gs.session_date, gs.session_time);
      if (!reminderDueAtMinutes(start, now, 15, CRON_WINDOW)) continue;

      if (eligibleIds.length > 0) {
        const msg = `Rappel : la session de coaching groupe « ${gs.title} » commence bientôt.`;
        await supabaseAdmin.from("notifications").insert(eligibleIds.map((id) => ({ user_id: id, message: msg })));
        await sendPushToUsers(eligibleIds, {
          title: "Rappel coaching groupe",
          body: msg,
          url: "/dashboard/coaching",
        });
      }

      await supabaseAdmin
        .from("group_coaching_sessions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", gs.id);

      legacyGroupSent += 1;
    }
  }

  return NextResponse.json({
    sent: individualSent,
    collectiveSent,
    liveSent,
    legacyGroupSent,
    total: appointments?.length ?? 0,
  });
}
