import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/app/utils/push-server";
import { collectiveJoinPath } from "@/app/utils/collectiveLive";
import { collectiveTargetGroupeIds } from "@/app/utils/collectiveTargeting";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getStudentIdsForGroupes(groupeIds: string[]): Promise<string[]> {
  if (groupeIds.length === 0) return [];
  const ids = new Set<string>();

  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("student_id")
    .in("groupe_id", groupeIds)
    .in("status", ["active", "draft"]);
  for (const e of enrollments ?? []) {
    if (e.student_id) ids.add(e.student_id);
  }

  const { data: pending } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("pending_groupe_id", groupeIds)
    .eq("role", "student");
  for (const p of pending ?? []) ids.add(p.id);

  const { data: rooms } = await supabaseAdmin
    .from("community_rooms")
    .select("id")
    .eq("type", "classroom")
    .in("groupe_id", groupeIds);
  const roomIds = (rooms ?? []).map((r) => r.id);
  if (roomIds.length > 0) {
    const { data: roomMembers } = await supabaseAdmin
      .from("community_room_members")
      .select("user_id")
      .in("room_id", roomIds);
    for (const row of roomMembers ?? []) {
      if (row.user_id) ids.add(row.user_id);
    }
  }

  return [...ids];
}

export type CollectiveNotifyEvent = "created" | "cancelled" | "rescheduled";

export async function notifyCollectiveSlotStudents(opts: {
  centerId: string;
  slotId: string;
  event?: CollectiveNotifyEvent;
  sessionDate?: string | null;
  title?: string;
  startTime?: string;
  endTime?: string;
  mode?: string;
}): Promise<number> {
  const { data: slot } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, center_id, title, mode, start_time, end_time, specific_date, room_name, groupe_id,
      schedule_slot_groupes(groupe_id)
    `)
    .eq("id", opts.slotId)
    .eq("center_id", opts.centerId)
    .eq("session_scope", "collective")
    .maybeSingle();

  if (!slot) return 0;

  const event = opts.event || "created";
  const sessionDate = opts.sessionDate || slot.specific_date || null;
  const startTime = (opts.startTime || slot.start_time || "").slice(0, 5);
  const endTime = (opts.endTime || slot.end_time || "").slice(0, 5);
  const title = opts.title || slot.title || "Coaching de groupe";
  const mode = opts.mode || slot.mode || "en_ligne";

  const targetGroupeIds = collectiveTargetGroupeIds({
    groupe_id: slot.groupe_id,
    schedule_slot_groupes: slot.schedule_slot_groupes as Array<{ groupe_id: string }>,
  });

  // Coaching de groupe : uniquement les classes ciblées (pas tout le centre)
  if (targetGroupeIds.length === 0) return 0;

  // Classes ciblées + étudiants basculés depuis un 1-on-1
  const classIds = await getStudentIdsForGroupes(targetGroupeIds);
  const { data: mergedRows } = await supabaseAdmin
    .from("coaching_sessions")
    .select("user_id")
    .eq("merged_slot_id", opts.slotId)
    .eq("status", "bascule");
  const studentIds = [
    ...new Set([
      ...classIds,
      ...((mergedRows ?? []).map((r) => r.user_id).filter(Boolean) as string[]),
    ]),
  ];

  if (studentIds.length === 0) return 0;

  const dateLabel = sessionDate
    ? new Date(`${sessionDate}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
  const modeLabel = mode === "en_ligne" ? "En ligne" : "Présentiel";
  const joinPath =
    mode === "en_ligne" && sessionDate ? collectiveJoinPath(slot.id, sessionDate) : null;

  let message: string;
  if (event === "cancelled") {
    message = `❌ Séance annulée : « ${title} »${dateLabel ? ` · ${dateLabel}` : ""}${startTime ? ` · ${startTime}` : ""}.`;
  } else if (event === "rescheduled") {
    message = `↩️ Séance reportée : « ${title} » · ${dateLabel || "nouvelle date"} · ${startTime}${endTime ? `-${endTime}` : ""} · ${modeLabel}.`;
  } else {
    message = `📅 Nouvelle séance programmée : « ${title} » · ${dateLabel} · ${startTime}${endTime ? `-${endTime}` : ""} · ${modeLabel}${slot.room_name && mode !== "en_ligne" ? ` · ${slot.room_name}` : ""}.`;
  }

  const rows = studentIds.map((user_id) => ({
    user_id,
    message,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 100));
    if (error) {
      console.error("notifyCollectiveSlotStudents:", error);
      return 0;
    }
  }

  await sendPushToUsers(studentIds, {
    title:
      event === "cancelled"
        ? "Séance annulée"
        : event === "rescheduled"
          ? "Séance reportée"
          : "Nouveau coaching de groupe",
    body: message.slice(0, 120),
    url: joinPath || "/dashboard/coaching",
  });

  return studentIds.length;
}

/** Notifications pour Sessions Live (participants choisis). */
export async function notifyLiveSlotParticipants(opts: {
  centerId: string;
  slotId: string;
  event?: CollectiveNotifyEvent;
  sessionDate?: string | null;
  title?: string;
  startTime?: string;
  endTime?: string;
}): Promise<number> {
  const { data: slot } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, center_id, title, start_time, end_time, specific_date,
      schedule_slot_participants(user_id)
    `)
    .eq("id", opts.slotId)
    .eq("center_id", opts.centerId)
    .eq("session_scope", "live")
    .maybeSingle();

  if (!slot) return 0;

  const participantIds = [
    ...new Set(
      ((slot.schedule_slot_participants ?? []) as Array<{ user_id: string }>)
        .map((p) => p.user_id)
        .filter(Boolean)
    ),
  ];
  if (participantIds.length === 0) return 0;

  const event = opts.event || "created";
  const sessionDate = opts.sessionDate || slot.specific_date || null;
  const startTime = (opts.startTime || slot.start_time || "").slice(0, 5);
  const endTime = (opts.endTime || slot.end_time || "").slice(0, 5);
  const title = opts.title || slot.title || "Session Live";

  const dateLabel = sessionDate
    ? new Date(`${sessionDate}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";
  const joinPath = sessionDate ? collectiveJoinPath(slot.id, sessionDate) : null;

  let message: string;
  if (event === "cancelled") {
    message = `❌ Session Live annulée : « ${title} »${dateLabel ? ` · ${dateLabel}` : ""}${startTime ? ` · ${startTime}` : ""}.`;
  } else if (event === "rescheduled") {
    message = `↩️ Session Live modifiée : « ${title} » · ${dateLabel || "nouvelle date"} · ${startTime}${endTime ? `-${endTime}` : ""}.`;
  } else {
    message = `📅 Session Live : « ${title} » · ${dateLabel} · ${startTime}${endTime ? `-${endTime}` : ""}.`;
  }

  const rows = participantIds.map((user_id) => ({ user_id, message }));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 100));
    if (error) {
      console.error("notifyLiveSlotParticipants:", error);
      return 0;
    }
  }

  await sendPushToUsers(participantIds, {
    title:
      event === "cancelled"
        ? "Session Live annulée"
        : event === "rescheduled"
          ? "Session Live modifiée"
          : "Nouvelle Session Live",
    body: message.slice(0, 120),
    url: joinPath || "/dashboard/coaching",
  });

  return participantIds.length;
}
