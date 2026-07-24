import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";
import { getAuthUser } from "@/app/utils/auth-server";
import {
  collectiveRoomName,
  sessionStartMs,
  sessionEndMs,
  JOIN_BEFORE_MS,
} from "@/app/utils/collectiveLive";
import { studentMatchesCollectiveSlot } from "@/app/utils/collectiveTargeting";
import { collectiveTitleFallback } from "@/app/utils/collectiveSessionLabels";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

async function isEligibleStudentForGroup(userId: string, slotId: string): Promise<boolean> {
  const { data: links } = await supabaseAdmin
    .from("schedule_slot_groupes")
    .select("groupe_id")
    .eq("slot_id", slotId);

  const { data: slotRow } = await supabaseAdmin
    .from("schedule_slots")
    .select("groupe_id")
    .eq("id", slotId)
    .maybeSingle();

  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("groupe_id")
    .eq("student_id", userId)
    .eq("status", "active");

  const groupeIds = [...new Set((enrollments ?? []).map((e) => e.groupe_id).filter(Boolean))];

  return studentMatchesCollectiveSlot(
    {
      groupe_id: slotRow?.groupe_id ?? null,
      schedule_slot_groupes: links ?? [],
    },
    groupeIds
  );
}

async function isLiveParticipant(userId: string, slotId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("schedule_slot_participants")
    .select("user_id")
    .eq("slot_id", slotId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** Étudiant basculé depuis un 1-on-1 vers ce créneau collectif (toute classe). */
async function isMergedFromIndividual(userId: string, slotId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("merged_slot_id", slotId)
    .eq("status", "bascule")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: "Visioconférence non configurée." }, { status: 503 });
  }

  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { slot_id, session_date } = await req.json();
  if (!slot_id || !session_date) {
    return NextResponse.json({ error: "slot_id et session_date requis." }, { status: 400 });
  }

  const { data: slot } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, center_id, formateur_id, mode, start_time, end_time, specific_date, day_of_week,
      session_scope, title,
      schedule_exceptions(exception_date, type, substitute_formateur_id)
    `)
    .eq("id", slot_id)
    .in("session_scope", ["collective", "live"])
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  }

  if (slot.mode !== "en_ligne") {
    return NextResponse.json({ error: "Cette séance est en présentiel." }, { status: 409 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, prenom, email, center_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 403 });
  }

  // Visio étudiant désactivée temporairement — le centre programme les séances.
  if (!STAFF_ROLES.includes(profile.role) && profile.role !== "admin") {
    return NextResponse.json(
      { error: "La visio étudiant est temporairement indisponible. Les séances sont programmées par le centre." },
      { status: 403 },
    );
  }

  const isLive = slot.session_scope === "live";
  const isStaff =
    profile.role === "admin" ||
    (profile.center_id === slot.center_id && STAFF_ROLES.includes(profile.role));
  const dateKeyForFormateur = String(session_date).slice(0, 10);
  const substituteId = (slot.schedule_exceptions ?? []).find(
    (ex: { exception_date: string; type: string; substitute_formateur_id?: string | null }) =>
      ex.exception_date === dateKeyForFormateur && ex.type === "substituted" && ex.substitute_formateur_id
  )?.substitute_formateur_id;
  const isFormateur = slot.formateur_id === user.id || substituteId === user.id;

  let allowed = false;
  if (isLive) {
    const isParticipant = await isLiveParticipant(user.id, slot_id);
    allowed = isStaff || isFormateur || isParticipant;
  } else {
    const isClassStudent =
      profile.center_id === slot.center_id && (await isEligibleStudentForGroup(user.id, slot_id));
    const isMerged =
      profile.center_id === slot.center_id && (await isMergedFromIndividual(user.id, slot_id));
    allowed = isStaff || isFormateur || isClassStudent || isMerged;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const dateKey = String(session_date).slice(0, 10);
  const isOneOff = !!slot.specific_date;
  if (isOneOff && slot.specific_date !== dateKey) {
    return NextResponse.json({ error: "Date de séance invalide." }, { status: 400 });
  }
  if (!isOneOff) {
    const d = new Date(`${dateKey}T12:00:00`);
    const dow = d.getDay() === 0 ? 7 : d.getDay();
    if (slot.day_of_week !== dow) {
      return NextResponse.json({ error: "Date de séance invalide." }, { status: 400 });
    }
  }

  const cancelled = (slot.schedule_exceptions ?? []).some(
    (ex: { exception_date: string; type: string }) =>
      ex.exception_date === dateKey && ex.type === "cancelled"
  );
  if (cancelled) {
    return NextResponse.json({ error: "Cette séance a été annulée." }, { status: 409 });
  }

  const start = sessionStartMs(dateKey, slot.start_time);
  const endsAt = sessionEndMs(dateKey, slot.end_time);
  const now = Date.now();

  if (now < start - JOIN_BEFORE_MS) {
    return NextResponse.json({ error: "La salle ouvre 15 minutes avant l'heure prévue." }, { status: 403 });
  }
  if (now > endsAt) {
    return NextResponse.json({ error: "Cette séance est terminée." }, { status: 403 });
  }

  const roomName = collectiveRoomName(slot_id, dateKey);
  const ttlSec = Math.max(60, Math.floor((endsAt - now) / 1000));

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile.prenom || profile.email || "Participant",
    ttl: ttlSec,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("center_type")
    .eq("id", slot.center_id)
    .maybeSingle();
  return NextResponse.json({
    url: wsUrl,
    token,
    endsAt,
    title:
      slot.title ||
      collectiveTitleFallback(centerRow?.center_type, isLive ? "live" : "group", slot.mode),
    session_scope: slot.session_scope,
    meeting_kind: isLive ? "live" : "group",
  });
}
