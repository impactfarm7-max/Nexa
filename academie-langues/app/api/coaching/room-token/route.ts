import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { AccessToken } from "livekit-server-sdk";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fenêtre d'accès : 15 min avant -> 30 min après l'heure prévue (durée séance 30 min)
const JOIN_BEFORE_MS = 15 * 60 * 1000;
const JOIN_AFTER_MS = 30 * 60 * 1000;

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

function sessionToIso(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toISOString();
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

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  // Récupère la séance (+ centre du propriétaire) + rôle (autorité serveur, pas le client)
  const [{ data: appointment }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("coaching_sessions").select("*, owner:user_id(center_id)").eq("id", id).single(),
    supabaseAdmin.from("profiles").select("role, prenom, email, center_id").eq("id", user.id).single(),
  ]);

  if (!appointment) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  }

  const isAdmin = profile?.role === "admin";
  const isOwner = appointment.user_id === user.id;
  // Staff du centre : peut animer le 1-on-1 d'un etudiant de SON centre.
  const isCenterStaff =
    !!profile?.center_id &&
    STAFF_ROLES.includes(profile?.role) &&
    appointment.owner?.center_id === profile.center_id;
  if (!isAdmin && !isOwner && !isCenterStaff) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  // Visio étudiant désactivée temporairement — le centre programme / anime.
  if (isOwner && !isAdmin && !isCenterStaff) {
    return NextResponse.json(
      { error: "La visio étudiant est temporairement indisponible. Demandez une séance présentiel." },
      { status: 403 },
    );
  }

  if (!["confirme", "confirmed"].includes(appointment.status)) {
    return NextResponse.json({ error: "La séance n'est pas confirmée." }, { status: 409 });
  }

  const sessionMode = appointment.session_mode === "presentiel" ? "presentiel" : "en_ligne";
  if (sessionMode === "presentiel") {
    return NextResponse.json({ error: "Cette séance est en présentiel — pas de salle visio." }, { status: 409 });
  }

  const date = appointment.rescheduled_date || appointment.session_date;
  const time = appointment.rescheduled_time || appointment.session_time;
  const start = new Date(sessionToIso(date, time)).getTime();
  const now = Date.now();
  if (now < start - JOIN_BEFORE_MS) {
    return NextResponse.json({ error: "La salle ouvre 15 minutes avant l'heure prévue." }, { status: 403 });
  }
  if (now > start + JOIN_AFTER_MS) {
    return NextResponse.json({ error: "Cette séance est terminée." }, { status: 403 });
  }

  const roomName = `coaching-${id}`;
  const endsAt = start + JOIN_AFTER_MS;
  const ttlSec = Math.max(60, Math.floor((endsAt - now) / 1000)); // token expire à la fin de la fenêtre

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.prenom || profile?.email || "Participant",
    ttl: ttlSec,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ url: wsUrl, token, endsAt });
}
