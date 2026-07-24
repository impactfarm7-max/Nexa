import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendPushToUsers } from "@/app/utils/push-server";
import {
  sessionToMs,
  computeEndsAt,
  isEligibleProfile,
  overlapsGroupWindow,
} from "@/app/utils/groupCoaching.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNLIMITED = 9999;
const TIME_ZONE = "Africa/Douala";

async function requireAdmin(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }) };
  }
  return { user, response: null };
}

function formatWhen(sessionDate: string, sessionTime: string) {
  return new Date(sessionToMs(sessionDate, sessionTime)).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

function normalize(s: any) {
  return { ...s, scheduled_at: new Date(sessionToMs(s.session_date, s.session_time)).toISOString() };
}

async function getEligibleStudents() {
  // Masterclass NEXA globale : uniquement les étudiants directs (sans centre).
  // Les étudiants de centre relèvent de /api/centre/group-coaching.
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, coaching_total, tag_status, role")
    .is("center_id", null)
    .gt("coaching_total", 0);
  return (data ?? []).filter((p) => p.role !== "admin" && isEligibleProfile(p));
}

export async function GET(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data, error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("*")
    .is("center_id", null)
    .gte("session_date", since)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (error) {
    console.error("group-coaching GET error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const eligible = await getEligibleStudents();
  return NextResponse.json({ sessions: (data ?? []).map(normalize), eligibleCount: eligible.length });
}

export async function POST(req: Request) {
  const { user, response } = await requireAdmin(req);
  if (response) return response;

  const { title, description, session_date, session_time, duration_min } = await req.json();
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 120) : "";
  const cleanDesc = typeof description === "string" ? description.trim().slice(0, 1000) : null;
  const durationMin = Number.isFinite(duration_min) ? Math.min(240, Math.max(15, Math.round(duration_min))) : 60;

  // Heure murale envoyée telle quelle par l'admin (pas de conversion via le fuseau du navigateur).
  const sessionDate = typeof session_date === "string" ? session_date.trim() : "";
  const sessionTime = typeof session_time === "string" ? session_time.trim().slice(0, 5) : "";

  if (!cleanTitle) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || !/^\d{2}:\d{2}$/.test(sessionTime)) {
    return NextResponse.json({ error: "Date ou heure invalide." }, { status: 400 });
  }

  const startMs = sessionToMs(sessionDate, sessionTime);
  if (Number.isNaN(startMs)) {
    return NextResponse.json({ error: "Date ou heure invalide." }, { status: 400 });
  }
  if (startMs < Date.now() + 30 * 60 * 1000) {
    return NextResponse.json({ error: "Choisissez un creneau au moins 30 minutes dans le futur." }, { status: 400 });
  }
  const { data: session, error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .insert({
      title: cleanTitle,
      description: cleanDesc,
      session_date: sessionDate,
      session_time: sessionTime,
      duration_min: durationMin,
      status: "scheduled",
      created_by: user!.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("group-coaching POST error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const groupStart = sessionToMs(sessionDate, sessionTime);
  const groupEnd = computeEndsAt(groupStart, durationMin);
  const when = formatWhen(sessionDate, sessionTime);

  // --- Annulation des séances individuelles en conflit ---
  const sinceDate = new Date(groupStart - 60 * 60000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const untilDate = new Date(groupEnd + 60 * 60000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data: indiv } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id, user_id, session_date, session_time, status, profiles:user_id(coaching_total, coaching_used, center_id)")
    .in("status", ["en_attente", "confirme"])
    .gte("session_date", sinceDate)
    .lte("session_date", untilDate);

  const conflicts = (indiv ?? []).filter((s) =>
    // Une masterclass NEXA n'annule jamais le coaching d'un étudiant de centre.
    !(s.profiles as any)?.center_id &&
    overlapsGroupWindow(sessionToMs(s.session_date, s.session_time), groupStart, groupEnd)
  );

  const conflictUserIds: string[] = [];
  const refundMap = new Map<string, { used: number; total: number; count: number }>();

  for (const c of conflicts) {
    await supabaseAdmin
      .from("coaching_sessions")
      .update({ status: "annule", cancel_reason: "Annulé : session de coaching groupe programmée" })
      .eq("id", c.id);

    if (c.status === "confirme") {
      const prof = (c.profiles as any) ?? {};
      const total = prof.coaching_total ?? 0;
      const used = prof.coaching_used ?? 0;
      if (total !== UNLIMITED) {
        if (refundMap.has(c.user_id)) {
          refundMap.get(c.user_id)!.count += 1;
        } else {
          refundMap.set(c.user_id, { used, total, count: 1 });
        }
      }
    }
    conflictUserIds.push(c.user_id);
  }

  for (const [userId, { used, count }] of refundMap) {
    const newUsed = Math.max(0, used - count);
    await supabaseAdmin.from("profiles").update({ coaching_used: newUsed }).eq("id", userId);
  }

  if (conflictUserIds.length > 0) {
    const msg = `Votre coaching du ${when} est annulé : une session de coaching groupe a été programmée à ce créneau.`;
    await supabaseAdmin.from("notifications").insert(conflictUserIds.map((id) => ({ user_id: id, message: msg })));
    await sendPushToUsers(conflictUserIds, {
      title: "Coaching reprogrammé",
      body: msg,
      url: "/dashboard/coaching",
    });
  }

  // --- Notification de création à tous les éligibles ---
  const eligible = await getEligibleStudents();
  const eligibleIds = eligible.map((p) => p.id);
  if (eligibleIds.length > 0) {
    const msg = `Coaching groupe : ${cleanTitle} le ${when}. Rejoignez la session !`;
    await supabaseAdmin.from("notifications").insert(eligibleIds.map((id) => ({ user_id: id, message: msg })));
    await sendPushToUsers(eligibleIds, {
      title: "Nouvelle session de coaching groupe",
      body: msg,
      url: "/dashboard/coaching",
    });
  }

  return NextResponse.json({ session: normalize(session), cancelledCount: conflictUserIds.length });
}

export async function DELETE(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  const { data: session } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  if (session.status !== "scheduled") {
    return NextResponse.json({ error: "Cette session ne peut pas être annulée." }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("group-coaching DELETE error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const when = formatWhen(session.session_date, session.session_time);
  const eligible = await getEligibleStudents();
  const eligibleIds = eligible.map((p) => p.id);
  if (eligibleIds.length > 0) {
    const msg = `La session de coaching groupe "${session.title}" du ${when} est annulée.`;
    await supabaseAdmin.from("notifications").insert(eligibleIds.map((uid) => ({ user_id: uid, message: msg })));
    await sendPushToUsers(eligibleIds, { title: "Coaching groupe annulé", body: msg, url: "/dashboard/coaching" });
  }

  return NextResponse.json({ ok: true });
}
