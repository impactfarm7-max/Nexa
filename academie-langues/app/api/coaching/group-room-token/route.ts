import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { AccessToken } from "livekit-server-sdk";
import { sessionToMs, computeEndsAt, isEligibleProfile } from "@/app/utils/groupCoaching.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JOIN_BEFORE_MS = 15 * 60 * 1000;
const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

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

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("group_coaching_sessions").select("*").eq("id", id).single(),
    supabaseAdmin.from("profiles").select("role, prenom, email, coaching_total, tag_status, center_id").eq("id", user.id).single(),
  ]);

  if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });

  // Visio étudiant désactivée temporairement
  if (profile && !STAFF_ROLES.includes(profile.role) && profile.role !== "admin") {
    return NextResponse.json(
      { error: "La visio étudiant est temporairement indisponible." },
      { status: 403 },
    );
  }

  // Isolation stricte : la masterclass d'un centre n'est joignable que par ce centre
  // (ses étudiants éligibles + son staff). Les masterclass NEXA (center_id null)
  // ne concernent que les étudiants directs. L'admin plateforme reste bypass.
  const isAdmin = profile?.role === "admin";
  const sessionCenter = session.center_id ?? null;
  const myCenter = profile?.center_id ?? null;
  const sameCenter = sessionCenter === myCenter;
  const isCenterStaff = !!sessionCenter && sessionCenter === myCenter && STAFF_ROLES.includes(profile?.role);
  const canJoin = isAdmin || isCenterStaff || (isEligibleProfile(profile ?? {}) && sameCenter);
  if (!canJoin) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (session.status !== "scheduled") {
    return NextResponse.json({ error: "La séance n'est pas disponible." }, { status: 409 });
  }

  const start = sessionToMs(session.session_date, session.session_time);
  const endsAt = computeEndsAt(start, session.duration_min);
  const now = Date.now();
  if (now < start - JOIN_BEFORE_MS) {
    return NextResponse.json({ error: "La salle ouvre 15 minutes avant l'heure prévue." }, { status: 403 });
  }
  if (now > endsAt) {
    return NextResponse.json({ error: "Cette séance est terminée." }, { status: 403 });
  }

  const roomName = `group-coaching-${id}`;
  const ttlSec = Math.max(60, Math.floor((endsAt - now) / 1000));

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.prenom || profile?.email || "Participant",
    ttl: ttlSec,
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  const token = await at.toJwt();
  return NextResponse.json({ url: wsUrl, token, endsAt });
}
