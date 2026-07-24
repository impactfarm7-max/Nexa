import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sessionStartMs, sessionEndMs } from "@/app/utils/collectiveLive";
import { studentMatchesCollectiveSlot } from "@/app/utils/collectiveTargeting";
import { getStudentCourseContext } from "@/app/api/student/courses/studentCourseAccess";
import { collectiveKindLabel, collectiveTitleFallback } from "@/app/utils/collectiveSessionLabels";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIME_ZONE = "Africa/Douala";
const HORIZON_DAYS = 28;

type SlotRow = {
  id: string;
  center_id: string;
  groupe_id: string | null;
  title: string | null;
  mode: string;
  start_time: string;
  end_time: string;
  specific_date: string | null;
  day_of_week: number;
  room_name: string | null;
  online_link: string | null;
  session_scope?: string;
  schedule_exceptions?: Array<{ exception_date: string; type: string; new_date?: string; new_start_time?: string }>;
  schedule_slot_groupes?: Array<{ groupe_id: string }>;
};

function dateKeyLocal(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function expandOccurrences(slot: SlotRow, from: string, to: string) {
  const out: Array<{ date: string; start_time: string; end_time: string }> = [];
  const cursor = new Date(`${from}T12:00:00+01:00`);
  const end = new Date(`${to}T12:00:00+01:00`);

  while (cursor <= end) {
    const dateKey = dateKeyLocal(cursor);
    const jsDay = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
    const isoDow = jsDay === 0 ? 7 : jsDay;

    const isOneOff = !!slot.specific_date;
    if ((!isOneOff || slot.specific_date === dateKey) && (isOneOff || slot.day_of_week === isoDow)) {
      const ex = (slot.schedule_exceptions ?? []).find((e) => e.exception_date === dateKey);
      if (ex?.type !== "cancelled") {
        let displayDate = dateKey;
        let startTime = slot.start_time;
        const endTime = slot.end_time;
        if (ex?.type === "rescheduled") {
          if (ex.new_date) displayDate = ex.new_date;
          if (ex.new_start_time) startTime = ex.new_start_time;
        }
        out.push({ date: displayDate, start_time: startTime, end_time: endTime });
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function toSessionItem(
  slot: SlotRow,
  occ: { date: string; start_time: string; end_time: string },
  kind: "group" | "live",
  centerType?: string | null,
) {
  const startMs = sessionStartMs(occ.date, occ.start_time);
  let endMs = sessionEndMs(occ.date, occ.end_time || slot.end_time);
  if (!Number.isFinite(endMs) || endMs <= startMs) {
    endMs = startMs + 60 * 60 * 1000;
  }
  const kindLabel = collectiveKindLabel(centerType, kind, slot.mode);
  return {
    slot_id: slot.id,
    session_date: occ.date,
    title: slot.title || collectiveTitleFallback(centerType, kind, slot.mode),
    start_time: occ.start_time,
    end_time: occ.end_time || slot.end_time,
    mode: slot.mode,
    room_name: slot.room_name,
    online_link: slot.online_link,
    scheduled_at: new Date(startMs).toISOString(),
    ends_at: endMs,
    kind,
    session_scope: kind === "live" ? "live" : "collective",
    kind_label: kindLabel,
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const ctx = await getStudentCourseContext(user.id);
  if (!ctx.centerId) {
    return NextResponse.json({ sessions: [] });
  }

  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("center_type")
    .eq("id", ctx.centerId)
    .maybeSingle();
  const centerType = centerRow?.center_type ?? null;

  const groupeIds = ctx.groupeIds;
  const now = Date.now();
  const fromKey = dateKeyLocal(new Date(now));
  const toKey = dateKeyLocal(new Date(now + HORIZON_DAYS * 24 * 60 * 60 * 1000));

  // Créneaux collectifs du planning (classes) — label selon type de centre
  const { data: groupSlots } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, center_id, groupe_id, title, mode, start_time, end_time, specific_date, day_of_week,
      room_name, online_link, session_scope,
      schedule_exceptions(exception_date, type, new_date, new_start_time),
      schedule_slot_groupes(groupe_id)
    `)
    .eq("session_scope", "collective")
    .eq("center_id", ctx.centerId);

  const eligibleGroupSlots = (groupSlots ?? []).filter((slot: SlotRow) =>
    studentMatchesCollectiveSlot(slot, groupeIds)
  );

  const sessions = eligibleGroupSlots.flatMap((slot: SlotRow) =>
    expandOccurrences(slot, fromKey, toKey)
      .map((occ) => toSessionItem(slot, occ, "group", centerType))
      .filter((s) => s.ends_at > now)
  );

  const seenKeys = new Set(sessions.map((s) => `${s.slot_id}:${s.session_date}`));

  // Créneaux collectifs où l'étudiant a été basculé depuis un 1-on-1 (toute classe)
  const { data: mergedLinks } = await supabaseAdmin
    .from("coaching_sessions")
    .select("merged_slot_id")
    .eq("user_id", user.id)
    .eq("status", "bascule")
    .not("merged_slot_id", "is", null);

  const mergedSlotIds = [
    ...new Set((mergedLinks ?? []).map((r) => r.merged_slot_id).filter(Boolean) as string[]),
  ];
  if (mergedSlotIds.length > 0) {
    const { data: mergedSlots } = await supabaseAdmin
      .from("schedule_slots")
      .select(`
        id, center_id, groupe_id, title, mode, start_time, end_time, specific_date, day_of_week,
        room_name, online_link, session_scope,
        schedule_exceptions(exception_date, type, new_date, new_start_time),
        schedule_slot_groupes(groupe_id)
      `)
      .eq("session_scope", "collective")
      .eq("center_id", ctx.centerId)
      .in("id", mergedSlotIds);

    for (const slot of (mergedSlots ?? []) as SlotRow[]) {
      for (const occ of expandOccurrences(slot, fromKey, toKey)) {
        const item = {
          ...toSessionItem(slot, occ, "group", centerType),
          via_bascule: true,
        };
        const key = `${item.slot_id}:${item.session_date}`;
        if (item.ends_at > now && !seenKeys.has(key)) {
          sessions.push(item);
          seenKeys.add(key);
        }
      }
    }
  }

  // Sessions Live où l'utilisateur est participant
  const { data: liveLinks } = await supabaseAdmin
    .from("schedule_slot_participants")
    .select("slot_id")
    .eq("user_id", user.id);

  const liveSlotIds = [...new Set((liveLinks ?? []).map((l) => l.slot_id).filter(Boolean))];
  if (liveSlotIds.length > 0) {
    const { data: liveSlots } = await supabaseAdmin
      .from("schedule_slots")
      .select(`
        id, center_id, groupe_id, title, mode, start_time, end_time, specific_date, day_of_week,
        room_name, online_link, session_scope,
        schedule_exceptions(exception_date, type, new_date, new_start_time),
        schedule_slot_groupes(groupe_id)
      `)
      .eq("session_scope", "live")
      .eq("center_id", ctx.centerId)
      .in("id", liveSlotIds);

    for (const slot of (liveSlots ?? []) as SlotRow[]) {
      for (const occ of expandOccurrences(slot, fromKey, toKey)) {
        const item = toSessionItem(slot, occ, "live", centerType);
        if (item.ends_at > now) sessions.push(item);
      }
    }
  }

  // Legacy : sessions group_coaching_sessions rattachées au centre
  const { data: legacyGroups } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("id, title, session_date, session_time, duration_min, status, center_id")
    .eq("center_id", ctx.centerId)
    .eq("status", "scheduled")
    .gte("session_date", fromKey)
    .lte("session_date", toKey)
    .order("session_date", { ascending: true })
    .limit(10);

  for (const g of legacyGroups ?? []) {
    const startMs = sessionStartMs(g.session_date, g.session_time);
    const duration = Math.max(30, Number(g.duration_min) || 60);
    const endMs = startMs + duration * 60 * 1000;
    if (endMs <= now) continue;
    sessions.push({
      slot_id: g.id,
      session_date: g.session_date,
      title: g.title || collectiveTitleFallback(centerType, "group", "en_ligne"),
      start_time: g.session_time,
      end_time: new Date(endMs).toISOString().slice(11, 16),
      mode: "en_ligne",
      room_name: null,
      online_link: null,
      scheduled_at: new Date(startMs).toISOString(),
      ends_at: endMs,
      kind: "group",
      session_scope: "collective",
      kind_label: collectiveKindLabel(centerType, "group", "en_ligne"),
      legacy: true,
    } as any);
  }

  sessions.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  // Réponses étudiant (refus) pour les occurrences listées
  const slotIds = [...new Set(sessions.map((s) => s.slot_id))];
  const responseByKey = new Map<string, { status: string; reason: string }>();
  if (slotIds.length > 0) {
    const { data: responses, error: respErr } = await supabaseAdmin
      .from("schedule_slot_responses")
      .select("slot_id, session_date, status, reason")
      .eq("user_id", user.id)
      .in("slot_id", slotIds);

    if (!respErr) {
      for (const r of responses ?? []) {
        responseByKey.set(`${r.slot_id}:${r.session_date}`, {
          status: r.status,
          reason: r.reason,
        });
      }
    }
  }

  const enriched = sessions.map((s) => {
    const mine = responseByKey.get(`${s.slot_id}:${s.session_date}`);
    return mine
      ? { ...s, my_response: { status: mine.status, reason: mine.reason } }
      : s;
  });

  return NextResponse.json({
    sessions: enriched,
    meta: {
      centerId: ctx.centerId,
      groupeCount: groupeIds.length,
      slotCount: groupSlots?.length ?? 0,
      eligibleCount: eligibleGroupSlots.length,
      liveCount: liveSlotIds.length,
    },
  });
}
