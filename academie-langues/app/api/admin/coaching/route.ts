import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendPushToUsers } from "@/app/utils/push-server";
import { sendEmail } from "@/app/utils/email-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNLIMITED = 9999;
const TIME_ZONE = "Africa/Douala";

async function requireAdmin(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }) };
  }

  return { user, response: null };
}

function sessionToIso(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toISOString();
}

function normalizeStatus(status: string) {
  if (status === "pending" || status === "en_attente") return "pending";
  if (status === "confirmed" || status === "confirme") return "confirmed";
  if (status === "refused" || status === "refuse") return "refused";
  if (status === "cancelled" || status === "annule") return "cancelled";
  if (["completed", "done", "effectue", "effectuee", "termine", "terminee"].includes(status)) return "effectue";
  return "pending";
}

function statusToDbStatus(status: string, currentStatus: string) {
  const usesEnglishStatus = ["pending", "confirmed", "refused", "cancelled", "completed"].includes(currentStatus);
  if (usesEnglishStatus) return status === "effectue" ? "completed" : status;
  if (status === "confirmed") return "confirme";
  if (status === "refused") return "refuse";
  if (status === "cancelled") return "annule";
  if (status === "effectue" || status === "completed") return "effectue";
  return status;
}

function normalizeSession(session: any) {
  return {
    ...session,
    scheduled_at: sessionToIso(session.session_date, session.session_time),
    status: normalizeStatus(session.status),
  };
}

function formatAppointmentDate(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

export async function GET(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

  const { data, error } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*, profiles:user_id(id, prenom, email, phone, pack_name, coaching_total, coaching_used, center_id)")
    .gte("session_date", thirtyDaysAgoStr)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (error) {
    console.error("admin coaching GET error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const now = Date.now();
  const ACTIVE_AFTER_MS = 30 * 60 * 1000;
  const sessions = (data ?? [])
    .filter((session) => !session.profiles?.center_id)
    .map((session) => {
      const normalized = normalizeSession(session);
      const ended = new Date(normalized.scheduled_at).getTime() + ACTIVE_AFTER_MS < now;
      if (ended && normalized.status === "confirmed") {
        return { ...normalized, status: "effectue" };
      }
      return normalized;
    });

  const upcoming = sessions
    .filter((s) => new Date(s.scheduled_at).getTime() + ACTIVE_AFTER_MS > now && (s.status === "pending" || s.status === "confirmed"))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const past = sessions
    .filter((s) => s.status === "effectue")
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const stats = {
    pending: upcoming.filter((s) => s.status === "pending").length,
    confirmed: upcoming.filter((s) => s.status === "confirmed").length,
    effectue: past.length,
  };

  return NextResponse.json({ appointments: upcoming, pastAppointments: past, completed: past, stats });
}

export async function PATCH(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { id, status, admin_note } = await req.json();
  if (!id || !["confirmed", "refused", "cancelled", "effectue"].includes(status)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const { data: appointment } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*, profiles:user_id(id, prenom, email, coaching_total, coaching_used, center_id)")
    .eq("id", id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }

  if (appointment.profiles?.center_id) {
    return NextResponse.json({ error: "Rendez-vous reserve au dashboard du centre." }, { status: 403 });
  }

  const currentStatus = normalizeStatus(appointment.status);

  if (status === "effectue") {
    if (currentStatus !== "confirmed") {
      return NextResponse.json({ error: "Seuls les rendez-vous confirmes peuvent etre marques effectues." }, { status: 409 });
    }
    const { error } = await supabaseAdmin
      .from("coaching_sessions")
      .update({ status: statusToDbStatus("effectue", appointment.status) })
      .eq("id", id);
    if (error) {
      console.error("admin coaching PATCH effectue error:", error);
      return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (status === "cancelled") {
    if (currentStatus !== "confirmed") {
      return NextResponse.json({ error: "Seuls les rendez-vous confirmes peuvent etre annules." }, { status: 409 });
    }
    const profile = appointment.profiles;
    const used = profile?.coaching_used ?? 0;
    const total = profile?.coaching_total ?? 0;
    if (total !== UNLIMITED && used > 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ coaching_used: used - 1 })
        .eq("id", appointment.user_id);
    }
  } else {
    if (currentStatus !== "pending") {
      return NextResponse.json({ error: "Ce rendez-vous a deja ete traite." }, { status: 409 });
    }
    if (status === "confirmed") {
      const profile = appointment.profiles;
      const total = profile?.coaching_total ?? 0;
      const used = profile?.coaching_used ?? 0;
      if (total !== UNLIMITED && used >= total) {
        return NextResponse.json({ error: "Quota coaching epuise pour cet etudiant." }, { status: 409 });
      }
      if (total !== UNLIMITED) {
        await supabaseAdmin
          .from("profiles")
          .update({ coaching_used: used + 1 })
          .eq("id", appointment.user_id);
      }
    }
  }

  const dbStatus = statusToDbStatus(status, appointment.status);
  const cleanNote = typeof admin_note === "string" ? admin_note.trim().slice(0, 500) : null;
  const { data: updated, error } = await supabaseAdmin
    .from("coaching_sessions")
    .update({ status: dbStatus, admin_note: cleanNote || null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("admin coaching PATCH error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const when = formatAppointmentDate(appointment.session_date, appointment.session_time);
  const prenom = appointment.profiles?.prenom || "";

  let notifTitle: string;
  let notifMessage: string;
  let emailSubject: string;
  let emailText: string;

  if (status === "confirmed") {
    notifTitle = "Coaching confirme";
    notifMessage = `Votre rendez-vous de coaching du ${when} est confirme.`;
    emailSubject = "Rendez-vous coaching confirme - NEXA";
    emailText = `Bonjour ${prenom},\n\nVotre rendez-vous de coaching du ${when} est confirme.\n\nLe lien de session vous sera transmis avant le rendez-vous si necessaire.\n\nNEXA`;
  } else if (status === "refused") {
    notifTitle = "Coaching refuse";
    notifMessage = `Votre demande de coaching du ${when} a ete refusee. Choisissez un autre creneau.`;
    emailSubject = "Rendez-vous coaching refuse - NEXA";
    emailText = `Bonjour ${prenom},\n\nVotre demande de coaching du ${when} a ete refusee.\n\n${cleanNote ? `Motif : ${cleanNote}\n\n` : ""}Vous pouvez choisir un autre creneau depuis votre dashboard.\n\nNEXA`;
  } else {
    notifTitle = "Coaching annule";
    notifMessage = `Votre rendez-vous de coaching du ${when} a ete annule par l'administration.${cleanNote ? ` Motif : ${cleanNote}` : ""}`;
    emailSubject = "Rendez-vous coaching annule - NEXA";
    emailText = `Bonjour ${prenom},\n\nVotre rendez-vous de coaching du ${when} a ete annule par l'administration.\n\n${cleanNote ? `Motif : ${cleanNote}\n\n` : ""}Vous pouvez choisir un nouveau creneau depuis votre dashboard.\n\nNEXA`;
  }

  await supabaseAdmin.from("notifications").insert({ user_id: appointment.user_id, message: notifMessage });
  await sendPushToUsers([appointment.user_id], {
    title: notifTitle,
    body: notifMessage,
    url: "/dashboard/coaching",
  });

  if (appointment.profiles?.email) {
    await sendEmail({
      to: appointment.profiles.email,
      subject: emailSubject,
      text: emailText,
    });
  }

  return NextResponse.json({ appointment: normalizeSession(updated) });
}
