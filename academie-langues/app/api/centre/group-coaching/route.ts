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
const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

async function getStaffProfile(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, center_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) return null;
  return profile;
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

// Étudiants éligibles DE CE CENTRE uniquement (isolation stricte).
async function getCenterEligibleStudents(centerId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, coaching_total, tag_status, role")
    .eq("center_id", centerId)
    .gt("coaching_total", 0);
  return (data ?? []).filter((p) => p.role !== "admin" && isEligibleProfile(p));
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const staff = await getStaffProfile(user.id);
  if (!staff) return NextResponse.json({ error: "Acces refuse." }, { status: 403 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data, error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("*")
    .eq("center_id", staff.center_id)
    .gte("session_date", since)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (error) {
    console.error("centre group-coaching GET error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const eligible = await getCenterEligibleStudents(staff.center_id);
  return NextResponse.json({ sessions: (data ?? []).map(normalize), eligibleCount: eligible.length });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const staff = await getStaffProfile(user.id);
  if (!staff) return NextResponse.json({ error: "Acces refuse." }, { status: 403 });

  const { title, description, session_date, session_time, duration_min } = await req.json();
  const cleanTitle = typeof title === "string" ? title.trim().slice(0, 120) : "";
  const cleanDesc = typeof description === "string" ? description.trim().slice(0, 1000) : null;
  const durationMin = Number.isFinite(duration_min) ? Math.min(240, Math.max(15, Math.round(duration_min))) : 60;

  // Heure murale envoyée telle quelle (pas de conversion via le fuseau du navigateur).
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
      created_by: user.id,
      center_id: staff.center_id,
      created_by_center_user: user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("centre group-coaching POST error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const groupStart = sessionToMs(sessionDate, sessionTime);
  const groupEnd = computeEndsAt(groupStart, durationMin);
  const when = formatWhen(sessionDate, sessionTime);

  // Étudiants de CE centre (borne l'annulation de conflits + les notifs).
  const eligible = await getCenterEligibleStudents(staff.center_id);
  const centerStudentIds = eligible.map((p) => p.id);

  // --- Annulation des séances individuelles en conflit (uniquement ce centre) ---
  const conflictUserIds: string[] = [];
  if (centerStudentIds.length > 0) {
    const sinceDate = new Date(groupStart - 60 * 60000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
    const untilDate = new Date(groupEnd + 60 * 60000).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

    const { data: indiv } = await supabaseAdmin
      .from("coaching_sessions")
      .select("id, user_id, session_date, session_time, status, profiles:user_id(coaching_total, coaching_used)")
      .in("user_id", centerStudentIds)
      .in("status", ["en_attente", "confirme"])
      .gte("session_date", sinceDate)
      .lte("session_date", untilDate);

    const conflicts = (indiv ?? []).filter((s) =>
      overlapsGroupWindow(sessionToMs(s.session_date, s.session_time), groupStart, groupEnd)
    );

    const refundMap = new Map<string, { used: number; count: number }>();
    for (const c of conflicts) {
      await supabaseAdmin
        .from("coaching_sessions")
        .update({ status: "annule", cancel_reason: "Annulé : masterclass programmée par le centre" })
        .eq("id", c.id);

      if (c.status === "confirme") {
        const prof = (c.profiles as any) ?? {};
        const total = prof.coaching_total ?? 0;
        const used = prof.coaching_used ?? 0;
        if (total !== UNLIMITED) {
          const entry = refundMap.get(c.user_id);
          if (entry) entry.count += 1;
          else refundMap.set(c.user_id, { used, count: 1 });
        }
      }
      conflictUserIds.push(c.user_id);
    }

    for (const [userId, { used, count }] of refundMap) {
      await supabaseAdmin.from("profiles").update({ coaching_used: Math.max(0, used - count) }).eq("id", userId);
    }

    if (conflictUserIds.length > 0) {
      const msg = `Votre coaching du ${when} est annulé : une masterclass a été programmée à ce créneau.`;
      await supabaseAdmin.from("notifications").insert(conflictUserIds.map((id) => ({ user_id: id, message: msg })));
      await sendPushToUsers(conflictUserIds, { title: "Coaching reprogrammé", body: msg, url: "/dashboard/coaching" });
    }
  }

  // --- Notification de création aux étudiants du centre ---
  if (centerStudentIds.length > 0) {
    const msg = `Masterclass : ${cleanTitle} le ${when}. Rejoignez la session !`;
    await supabaseAdmin.from("notifications").insert(centerStudentIds.map((id) => ({ user_id: id, message: msg })));
    await sendPushToUsers(centerStudentIds, {
      title: "Nouvelle masterclass",
      body: msg,
      url: "/dashboard/coaching",
    });
  }

  return NextResponse.json({ session: normalize(session), cancelledCount: conflictUserIds.length });
}

export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const staff = await getStaffProfile(user.id);
  if (!staff) return NextResponse.json({ error: "Acces refuse." }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  const { data: session } = await supabaseAdmin
    .from("group_coaching_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  if (session.center_id !== staff.center_id) {
    return NextResponse.json({ error: "Masterclass hors de votre centre." }, { status: 403 });
  }
  if (session.status !== "scheduled") {
    return NextResponse.json({ error: "Cette session ne peut pas être annulée." }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("group_coaching_sessions")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    console.error("centre group-coaching DELETE error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const when = formatWhen(session.session_date, session.session_time);
  const eligible = await getCenterEligibleStudents(staff.center_id);
  const centerStudentIds = eligible.map((p) => p.id);
  if (centerStudentIds.length > 0) {
    const msg = `La masterclass "${session.title}" du ${when} est annulée.`;
    await supabaseAdmin.from("notifications").insert(centerStudentIds.map((uid) => ({ user_id: uid, message: msg })));
    await sendPushToUsers(centerStudentIds, { title: "Masterclass annulée", body: msg, url: "/dashboard/coaching" });
  }

  return NextResponse.json({ ok: true });
}
