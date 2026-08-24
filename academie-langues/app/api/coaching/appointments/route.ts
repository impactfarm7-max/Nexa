import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendPushToUsers } from "@/app/utils/push-server";
import { sendEmail, sendEmails } from "@/app/utils/email-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNLIMITED = 9999;
const TIME_ZONE = "Africa/Douala";

function getSessionParts(date: Date) {
  const sessionDate = date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const sessionTime = date.toLocaleTimeString("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { sessionDate, sessionTime };
}

function sessionToIso(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toISOString();
}

function normalizeStatus(status: string) {
  if (status === "pending" || status === "en_attente") return "pending";
  if (status === "confirmed" || status === "confirme") return "confirmed";
  if (status === "refused" || status === "refuse") return "refused";
  if (status === "cancelled" || status === "annule") return "cancelled";
  if (status === "reporte") return "reporte";
  if (["completed", "done", "effectue", "effectuee", "termine", "terminee"].includes(status)) return "effectue";
  return "pending";
}

function effectiveSessionParts(session: { session_date: string; session_time: string; rescheduled_date?: string | null; rescheduled_time?: string | null }) {
  const sessionDate = session.rescheduled_date || session.session_date;
  const sessionTime = session.rescheduled_time || session.session_time;
  return { sessionDate, sessionTime };
}

function normalizeSessionMode(mode: string | null | undefined): "en_ligne" | "presentiel" {
  return mode === "presentiel" ? "presentiel" : "en_ligne";
}

function sessionModeLabel(mode: string | null | undefined) {
  return normalizeSessionMode(mode) === "en_ligne" ? "En visio" : "En présentiel";
}

function normalizeSession(session: any) {
  const { sessionDate, sessionTime } = effectiveSessionParts(session);
  return {
    ...session,
    scheduled_at: sessionToIso(sessionDate, sessionTime),
    original_scheduled_at: session.rescheduled_date
      ? sessionToIso(session.session_date, session.session_time)
      : null,
    status: normalizeStatus(session.status),
    session_mode: normalizeSessionMode(session.session_mode),
    reschedule_reason: session.reschedule_reason ?? null,
    rescheduled_date: session.rescheduled_date ?? null,
    rescheduled_time: session.rescheduled_time ?? null,
  };
}

function formatAppointmentDate(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  });
}

async function getAdmins() {
  const { data } = await supabaseAdmin.from("profiles").select("id, email").eq("role", "admin");
  return data ?? [];
}

async function getCenterManagers(centerId: string) {
  const { data } = await supabaseAdmin
    .from("center_users")
    .select("user_id, profiles:user_id(email)")
    .eq("center_id", centerId);

  return (data ?? []).map((manager: any) => ({
    id: manager.user_id,
    email: manager.profiles?.email ?? null,
  }));
}

function timeToMinutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function overlapsSlot(startTime: string, endTime: string, blockStart: string, blockEnd: string) {
  return timeToMinutes(startTime) < timeToMinutes(blockEnd) && timeToMinutes(blockStart) < timeToMinutes(endTime);
}

async function hasCollectiveConflict(centerId: string, sessionDate: string, sessionTime: string) {
  const sessionEndMin = timeToMinutes(sessionTime) + 30;
  const sessionEnd = `${String(Math.floor(sessionEndMin / 60) % 24).padStart(2, "0")}:${String(sessionEndMin % 60).padStart(2, "0")}`;

  const { data: slots } = await supabaseAdmin
    .from("schedule_slots")
    .select("day_of_week, start_time, end_time, specific_date, session_scope")
    .eq("center_id", centerId)
    .eq("session_scope", "collective");

  const d = new Date(`${sessionDate}T12:00:00`);
  const dow = d.getDay() === 0 ? 7 : d.getDay();

  for (const slot of slots ?? []) {
    const matches =
      (slot.specific_date && slot.specific_date === sessionDate) ||
      (!slot.specific_date && slot.day_of_week === dow);
    if (!matches) continue;
    if (overlapsSlot(sessionTime, sessionEnd, slot.start_time.slice(0, 5), slot.end_time.slice(0, 5))) {
      return true;
    }
  }
  return false;
}

async function hasIndividualCenterConflict(centerId: string, sessionDate: string, sessionTime: string, excludeUserId?: string) {
  const { data: students } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", centerId)
    .eq("role", "student");

  const studentIds = (students ?? []).map((s) => s.id).filter((id) => id !== excludeUserId);
  if (studentIds.length === 0) return false;

  const { data: rows } = await supabaseAdmin
    .from("coaching_sessions")
    .select("session_date, session_time, rescheduled_date, rescheduled_time, status")
    .in("user_id", studentIds)
    .in("status", ["en_attente", "confirme", "pending", "confirmed", "reporte"]);

  for (const row of rows ?? []) {
    const date = row.rescheduled_date || row.session_date;
    const time = (row.rescheduled_time || row.session_time)?.slice(0, 5);
    if (date !== sessionDate || !time) continue;
    const endMin = timeToMinutes(time) + 30;
    const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    if (overlapsSlot(sessionTime, end, time, end)) return true;
  }
  return false;
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("session_date", { ascending: true })
    .order("session_time", { ascending: true });

  if (error) {
    console.error("coaching sessions GET error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  return NextResponse.json({ appointments: (data ?? []).map(normalizeSession) });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { scheduled_at, note, session_mode } = await req.json();
  const scheduledAt = new Date(scheduled_at);
  const bookingNote = typeof note === "string" ? note.trim().slice(0, 500) : null;

  if (!scheduled_at || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Date de rendez-vous invalide." }, { status: 400 });
  }

  if (scheduledAt.getTime() < Date.now() + 30 * 60 * 1000) {
    return NextResponse.json(
      { error: "Choisissez un creneau au moins 30 minutes dans le futur." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("prenom, email, role, tag_status, coaching_total, coaching_used, organization_id, center_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profil introuvable." }, { status: 403 });
  if (profile.role !== "admin" && profile.tag_status === "revoque") {
    return NextResponse.json({ error: "Acces revoque." }, { status: 403 });
  }
  if (profile.role !== "admin" && profile.tag_status === "termine") {
    return NextResponse.json({ error: "Formation terminee." }, { status: 403 });
  }

  // Étudiants : présentiel uniquement (visio / live = programmation centre).
  const bookingMode =
    profile.role === "admin" ? normalizeSessionMode(session_mode) : "presentiel";

  const total = profile.coaching_total ?? 0;
  const used = profile.coaching_used ?? 0;
  if (profile.role !== "admin" && total <= 0) {
    return NextResponse.json({ error: "Votre pack ne contient pas de coaching." }, { status: 403 });
  }
  if (profile.role !== "admin" && total !== UNLIMITED && used >= total) {
    return NextResponse.json({ error: "Votre quota coaching est epuise." }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id, session_date, session_time, status")
    .eq("user_id", user.id)
    .in("status", ["en_attente", "confirme", "pending", "confirmed", "reporte"]);

  const hasUpcoming = (existing ?? []).some((session) => {
    const { sessionDate, sessionTime } = effectiveSessionParts(session);
    return new Date(sessionToIso(sessionDate, sessionTime)).getTime() > Date.now();
  });

  if (hasUpcoming) {
    return NextResponse.json(
      { error: "Vous avez deja un rendez-vous de coaching en attente ou confirme." },
      { status: 409 }
    );
  }

  const { sessionDate, sessionTime } = getSessionParts(scheduledAt);

  if (profile.center_id) {
    const individualConflict = await hasIndividualCenterConflict(profile.center_id, sessionDate, sessionTime, user.id);
    if (individualConflict) {
      return NextResponse.json({ error: "Ce créneau est déjà réservé." }, { status: 409 });
    }
    const collectiveConflict = await hasCollectiveConflict(profile.center_id, sessionDate, sessionTime);
    if (collectiveConflict) {
      return NextResponse.json({ error: "Ce créneau est occupé par une séance collective." }, { status: 409 });
    }
  }

  const { data: appointment, error } = await supabaseAdmin
    .from("coaching_sessions")
    .insert({
      user_id: user.id,
      organization_id: profile.organization_id ?? null,
      session_date: sessionDate,
      session_time: sessionTime,
      status: "en_attente",
      note: bookingNote || null,
      session_mode: bookingMode,
    })
    .select("*")
    .single();

  if (error) {
    console.error("coaching sessions POST error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const recipients = profile.center_id ? await getCenterManagers(profile.center_id) : await getAdmins();
  const recipientIds = recipients.map((recipient) => recipient.id);
  const when = formatAppointmentDate(
    appointment.rescheduled_date || appointment.session_date,
    appointment.rescheduled_time || appointment.session_time
  );
  const studentName = profile.prenom || profile.email || "Un etudiant";
  const modeLabel = sessionModeLabel(bookingMode);
  const message = `Nouvelle demande de coaching (${modeLabel}) de ${studentName} pour le ${when}.${bookingNote ? ` Motif : ${bookingNote}` : ""}`;

  if (recipientIds.length > 0) {
    await supabaseAdmin
      .from("notifications")
      .insert(recipientIds.map((id) => ({ user_id: id, message })));

    await sendPushToUsers(recipientIds, {
      title: "Demande de coaching",
      body: message,
      url: profile.center_id ? "/centre/cours/planning" : "/dashboard/coaching",
    });

    await sendEmails(
      recipients
        .filter((recipient) => recipient.email)
        .map((recipient) => ({
          to: recipient.email!,
          subject: profile.center_id ? "Nouvelle demande de coaching - Centre" : "Nouvelle demande de coaching - NEXA",
          text: `${message}\n\nConnectez-vous au dashboard admin pour confirmer ou refuser le rendez-vous.\n\nNEXA`,
        }))
    );
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: user.id,
    message: `Votre demande de coaching (${modeLabel}) pour le ${when} a ete envoyee. Vous serez notifie apres validation.`,
  });

  if (profile.email) {
    await sendEmail({
      to: profile.email,
      subject: "Demande de coaching recue - NEXA",
      text: `Bonjour ${profile.prenom || ""},\n\nNous avons bien recu votre demande de coaching pour le ${when}.\n\nL'administration va confirmer ou refuser le rendez-vous. Vous recevrez une notification des que la decision sera prise.\n\nNEXA`,
    });
  }

  return NextResponse.json({ appointment: normalizeSession(appointment) });
}

export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { id, cancel_reason } = await req.json();
  if (!id) return NextResponse.json({ error: "ID manquant." }, { status: 400 });
  const cancelReason = typeof cancel_reason === "string" ? cancel_reason.trim().slice(0, 500) : null;

  const { data: appointment } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*, profiles:user_id(id, prenom, email, coaching_total, coaching_used)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }

  const currentStatus = normalizeStatus(appointment.status);
  if (!["pending", "confirmed", "reporte"].includes(currentStatus)) {
    return NextResponse.json({ error: "Ce rendez-vous ne peut pas etre annule." }, { status: 409 });
  }

  const sessionTime = new Date(
    sessionToIso(
      appointment.rescheduled_date || appointment.session_date,
      appointment.rescheduled_time || appointment.session_time
    )
  ).getTime();
  if (sessionTime < Date.now()) {
    return NextResponse.json({ error: "Ce rendez-vous est deja passe." }, { status: 409 });
  }

  const hoursUntil = (sessionTime - Date.now()) / (1000 * 60 * 60);
  if (currentStatus === "confirmed" && hoursUntil < 24) {
    return NextResponse.json(
      { error: "L'annulation d'un rendez-vous confirme doit se faire au moins 24h a l'avance." },
      { status: 409 }
    );
  }

  const dbStatus = ["pending", "confirmed", "refused", "cancelled", "completed"].includes(appointment.status) ? "cancelled" : "annule";
  const { error } = await supabaseAdmin
    .from("coaching_sessions")
    .update({ status: dbStatus, cancel_reason: cancelReason || null })
    .eq("id", id);

  if (error) {
    console.error("coaching sessions DELETE error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  if (currentStatus === "confirmed") {
    const used = appointment.profiles?.coaching_used ?? 0;
    const total = appointment.profiles?.coaching_total ?? 0;
    if (total !== UNLIMITED && used > 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ coaching_used: used - 1 })
        .eq("id", user.id);
    }
  }

  const when = formatAppointmentDate(
    appointment.rescheduled_date || appointment.session_date,
    appointment.rescheduled_time || appointment.session_time
  );
  const prenom = appointment.profiles?.prenom || "Un etudiant";

  const { data: requesterProfile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", user.id)
    .maybeSingle();
  const recipients = requesterProfile?.center_id ? await getCenterManagers(requesterProfile.center_id) : await getAdmins();
  const recipientIds = recipients.map((recipient) => recipient.id);
  const adminMsg = `${prenom} a annule son rendez-vous de coaching du ${when}.${cancelReason ? ` Motif : ${cancelReason}` : ""}`;

  if (recipientIds.length > 0) {
    await supabaseAdmin.from("notifications").insert(recipientIds.map((recipientId) => ({ user_id: recipientId, message: adminMsg })));
    await sendPushToUsers(recipientIds, { title: "Coaching annule", body: adminMsg, url: requesterProfile?.center_id ? "/centre/cours/coaching" : "/dashboard/coaching" });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: user.id,
    message: `Votre rendez-vous de coaching du ${when} a ete annule. Vous pouvez reserver un nouveau creneau.`,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { id, action, scheduled_at, reschedule_reason } = await req.json();
  if (!id || action !== "reschedule") {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  const newScheduledAt = new Date(scheduled_at);
  const reason = typeof reschedule_reason === "string" ? reschedule_reason.trim().slice(0, 500) : null;

  if (!scheduled_at || Number.isNaN(newScheduledAt.getTime())) {
    return NextResponse.json({ error: "Nouvelle date invalide." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Indiquez un motif de report." }, { status: 400 });
  }
  if (newScheduledAt.getTime() < Date.now() + 30 * 60 * 1000) {
    return NextResponse.json(
      { error: "Choisissez un creneau au moins 30 minutes dans le futur." },
      { status: 400 }
    );
  }

  const { data: appointment } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*, profiles:user_id(id, prenom, email, center_id)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }

  const currentStatus = normalizeStatus(appointment.status);
  if (!["pending", "confirmed", "reporte"].includes(currentStatus)) {
    return NextResponse.json({ error: "Ce rendez-vous ne peut pas etre reporte." }, { status: 409 });
  }

  const currentWhen = new Date(
    sessionToIso(
      appointment.rescheduled_date || appointment.session_date,
      appointment.rescheduled_time || appointment.session_time
    )
  ).getTime();

  if (currentWhen < Date.now()) {
    return NextResponse.json({ error: "Ce rendez-vous est deja passe." }, { status: 409 });
  }

  const hoursUntil = (currentWhen - Date.now()) / (1000 * 60 * 60);
  if (currentStatus === "confirmed" && hoursUntil < 24) {
    return NextResponse.json(
      { error: "Le report d'un rendez-vous confirme doit se faire au moins 24h a l'avance." },
      { status: 409 }
    );
  }

  const { sessionDate, sessionTime } = getSessionParts(newScheduledAt);
  const centerId = appointment.profiles?.center_id;

  if (centerId) {
    const individualConflict = await hasIndividualCenterConflict(centerId, sessionDate, sessionTime, user.id);
    if (individualConflict) {
      return NextResponse.json({ error: "Ce créneau est déjà réservé." }, { status: 409 });
    }
    const collectiveConflict = await hasCollectiveConflict(centerId, sessionDate, sessionTime);
    if (collectiveConflict) {
      return NextResponse.json({ error: "Ce créneau est occupé par une séance collective." }, { status: 409 });
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from("coaching_sessions")
    .update({
      status: "reporte",
      rescheduled_date: sessionDate,
      rescheduled_time: sessionTime,
      reschedule_reason: reason,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("coaching sessions PATCH error:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  if (currentStatus === "confirmed") {
    const used = appointment.profiles?.coaching_used ?? 0;
    const total = appointment.profiles?.coaching_total ?? 0;
    if (total !== UNLIMITED && used > 0) {
      await supabaseAdmin
        .from("profiles")
        .update({ coaching_used: used - 1 })
        .eq("id", user.id);
    }
  }

  const oldWhen = formatAppointmentDate(
    appointment.rescheduled_date || appointment.session_date,
    appointment.rescheduled_time || appointment.session_time
  );
  const newWhen = formatAppointmentDate(sessionDate, sessionTime);
  const prenom = appointment.profiles?.prenom || appointment.profiles?.email || "Un etudiant";
  const recipients = centerId ? await getCenterManagers(centerId) : await getAdmins();
  const recipientIds = recipients.map((recipient) => recipient.id);
  const adminMsg = `${prenom} demande de reporter sa séance du ${oldWhen} au ${newWhen}. Motif : ${reason}`;

  if (recipientIds.length > 0) {
    await supabaseAdmin.from("notifications").insert(recipientIds.map((recipientId) => ({ user_id: recipientId, message: adminMsg })));
    await sendPushToUsers(recipientIds, {
      title: "Demande de report coaching",
      body: adminMsg,
      url: centerId ? "/centre/cours/coaching" : "/dashboard/coaching",
    });
    await sendEmails(
      recipients
        .filter((recipient) => recipient.email)
        .map((recipient) => ({
          to: recipient.email!,
          subject: "Demande de report coaching - Centre",
          text: `${adminMsg}\n\nConnectez-vous au dashboard pour valider ou refuser ce report.\n\nNEXA`,
        }))
    );
  }

  await supabaseAdmin.from("notifications").insert({
    user_id: user.id,
    message: `Votre demande de report au ${newWhen} a ete envoyee. Le centre va confirmer la nouvelle date.`,
  });

  return NextResponse.json({ appointment: normalizeSession(updated) });
}
