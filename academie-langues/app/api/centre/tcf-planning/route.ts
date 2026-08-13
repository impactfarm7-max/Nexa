import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { notifyCollectiveSlotStudents } from "@/app/utils/notifyCollectiveSlot.server";
import { collectiveJoinPath } from "@/app/utils/collectiveLive";
import { sendPushToUsers } from "@/app/utils/push-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UNLIMITED = 9999;

function sessionToIso(sessionDate: string, sessionTime: string) {
  return new Date(`${sessionDate}T${sessionTime.slice(0, 5)}:00+01:00`).toISOString();
}

function normalizeCoachingStatus(status: string) {
  if (["en_attente", "pending"].includes(status)) return "planifie";
  if (["confirme", "confirmed"].includes(status)) return "planifie";
  if (status === "reporte") return "reporte";
  if (status === "bascule") return "bascule";
  if (["refuse", "refused", "annule", "cancelled"].includes(status)) return "annule";
  if (["effectue", "completed", "done"].includes(status)) return "realise";
  return "planifie";
}

async function getCallerCenter(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", userId)
    .single();
  if (!profile?.center_id) return null;
  if (!["center_manager", "campus_manager", "trainer", "staff"].includes(profile.role)) {
    return null;
  }
  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("id, center_type")
    .eq("id", profile.center_id)
    .single();
  if (center?.center_type !== "tcf_canada") return null;
  return { centerId: profile.center_id, userId, role: profile.role };
}

function parseCollectiveId(id: string) {
  const match = id.match(/^(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return { slotId: match[1], occurrenceDate: match[2] };
}

async function patchCollective(
  ctx: { centerId: string; userId: string },
  body: {
    id: string;
    action: string;
    admin_note?: string | null;
    reschedule_date?: string | null;
    reschedule_time?: string | null;
    reschedule_end_time?: string | null;
    reschedule_reason?: string | null;
    exception_id?: string | null;
  }
) {
  const parsed = parseCollectiveId(body.id);
  if (!parsed) {
    return NextResponse.json({ error: "Identifiant de séance invalide." }, { status: 400 });
  }

  const { slotId, occurrenceDate } = parsed;

  const { data: slot } = await supabaseAdmin
    .from("schedule_slots")
    .select("id, center_id, start_time, end_time, title, mode, specific_date")
    .eq("id", slotId)
    .eq("center_id", ctx.centerId)
    .eq("session_scope", "collective")
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: "Séance collective introuvable." }, { status: 404 });
  }

  const reason = body.reschedule_reason || body.admin_note || null;

  if (body.action === "restore") {
    const q = supabaseAdmin
      .from("schedule_exceptions")
      .delete()
      .eq("slot_id", slotId)
      .eq("exception_date", occurrenceDate);
    if (body.exception_id) q.eq("id", body.exception_id);
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cancel") {
    const payload = {
      slot_id: slotId,
      exception_date: occurrenceDate,
      type: "cancelled",
      reason,
      created_by: ctx.userId,
    };
    const { data: existing } = await supabaseAdmin
      .from("schedule_exceptions")
      .select("id")
      .eq("slot_id", slotId)
      .eq("exception_date", occurrenceDate)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("schedule_exceptions").update(payload).eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from("schedule_exceptions").insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    void notifyCollectiveSlotStudents({
      centerId: ctx.centerId,
      slotId,
      event: "cancelled",
      sessionDate: occurrenceDate,
      title: slot.title || undefined,
      startTime: slot.start_time?.slice(0, 5),
      mode: slot.mode || undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "postpone") {
    if (!body.reschedule_date || !body.reschedule_time) {
      return NextResponse.json({ error: "Nouvelle date et heure requises." }, { status: 400 });
    }
    const endTime = body.reschedule_end_time || slot.end_time?.slice(0, 5) || "11:00";
    const payload = {
      slot_id: slotId,
      exception_date: occurrenceDate,
      type: "rescheduled",
      reason,
      new_date: body.reschedule_date,
      new_start_time: body.reschedule_time,
      new_end_time: endTime,
      created_by: ctx.userId,
    };
    if (body.exception_id) {
      const { error } = await supabaseAdmin.from("schedule_exceptions").update(payload).eq("id", body.exception_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { data: existing } = await supabaseAdmin
        .from("schedule_exceptions")
        .select("id")
        .eq("slot_id", slotId)
        .eq("exception_date", occurrenceDate)
        .maybeSingle();
      if (existing) {
        const { error } = await supabaseAdmin.from("schedule_exceptions").update(payload).eq("id", existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabaseAdmin.from("schedule_exceptions").insert(payload);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    void notifyCollectiveSlotStudents({
      centerId: ctx.centerId,
      slotId,
      event: "rescheduled",
      sessionDate: body.reschedule_date,
      title: slot.title || undefined,
      startTime: String(body.reschedule_time).slice(0, 5),
      endTime: String(endTime).slice(0, 5),
      mode: slot.mode || undefined,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete") {
    const payload = {
      slot_id: slotId,
      exception_date: occurrenceDate,
      type: "completed",
      reason: body.admin_note || null,
      created_by: ctx.userId,
    };
    const { data: existing } = await supabaseAdmin
      .from("schedule_exceptions")
      .select("id")
      .eq("slot_id", slotId)
      .eq("exception_date", occurrenceDate)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("schedule_exceptions").update(payload).eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from("schedule_exceptions").insert(payload);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

async function patchIndividual(
  ctx: { centerId: string },
  studentIds: Set<string>,
  body: {
    id: string;
    action: string;
    admin_note?: string | null;
    reschedule_date?: string | null;
    reschedule_time?: string | null;
    reschedule_reason?: string | null;
    merged_slot_id?: string | null;
  }
) {
  const { id, action, admin_note, reschedule_date, reschedule_time, reschedule_reason, merged_slot_id } = body;

  const { data: appointment } = await supabaseAdmin
    .from("coaching_sessions")
    .select("*, profiles:user_id(id, prenom, email, coaching_total, coaching_used)")
    .eq("id", id)
    .maybeSingle();

  if (!appointment || !studentIds.has(appointment.user_id)) {
    return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
  }

  const when = sessionToIso(appointment.session_date, appointment.session_time);

  if (action === "restore") {
    await supabaseAdmin
      .from("coaching_sessions")
      .update({
        status: "confirme",
        rescheduled_date: null,
        rescheduled_time: null,
        reschedule_reason: null,
        merged_slot_id: null,
      })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "confirm") {
    if (!["en_attente", "pending", "reporte"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
    }
    const used = appointment.profiles?.coaching_used ?? 0;
    const total = appointment.profiles?.coaching_total ?? 0;
    if (total !== UNLIMITED && used >= total) {
      return NextResponse.json({ error: "Quota coaching épuisé." }, { status: 409 });
    }
    if (total !== UNLIMITED) {
      await supabaseAdmin.from("profiles").update({ coaching_used: used + 1 }).eq("id", appointment.user_id);
    }
    await supabaseAdmin
      .from("coaching_sessions")
      .update({ status: "confirme", admin_note: admin_note || null })
      .eq("id", id);

    await supabaseAdmin.from("notifications").insert({
      user_id: appointment.user_id,
      message: `Votre séance individuelle du ${new Date(when).toLocaleString("fr-FR")} est confirmée.`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "refuse") {
    if (!["en_attente", "pending", "reporte", "confirme", "confirmed"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cette séance ne peut pas être refusée." }, { status: 409 });
    }
    // Si déjà confirmée : rembourser le crédit coaching
    if (["confirme", "confirmed"].includes(appointment.status)) {
      const used = appointment.profiles?.coaching_used ?? 0;
      const total = appointment.profiles?.coaching_total ?? 0;
      if (total !== UNLIMITED && used > 0) {
        await supabaseAdmin
          .from("profiles")
          .update({ coaching_used: used - 1 })
          .eq("id", appointment.user_id);
      }
    }
    const usesEnglish = ["pending", "confirmed", "refused", "cancelled", "completed"].includes(appointment.status);
    await supabaseAdmin
      .from("coaching_sessions")
      .update({
        status: usesEnglish ? "refused" : "refuse",
        admin_note: admin_note || null,
        cancel_reason: admin_note || null,
      })
      .eq("id", id);
    await supabaseAdmin.from("notifications").insert({
      user_id: appointment.user_id,
      message: `Votre demande de séance du ${new Date(when).toLocaleString("fr-FR")} a été refusée.${admin_note ? ` Motif : ${admin_note}` : ""}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (!["confirme", "confirmed", "reporte", "en_attente", "pending"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cette séance ne peut pas être annulée." }, { status: 409 });
    }
    if (["confirme", "confirmed"].includes(appointment.status)) {
      const used = appointment.profiles?.coaching_used ?? 0;
      const total = appointment.profiles?.coaching_total ?? 0;
      if (total !== UNLIMITED && used > 0) {
        await supabaseAdmin
          .from("profiles")
          .update({ coaching_used: used - 1 })
          .eq("id", appointment.user_id);
      }
    }
    const usesEnglish = ["pending", "confirmed", "refused", "cancelled", "completed"].includes(appointment.status);
    const reason = admin_note || reschedule_reason || null;
    await supabaseAdmin
      .from("coaching_sessions")
      .update({
        status: usesEnglish ? "cancelled" : "annule",
        admin_note: reason,
        cancel_reason: reason,
      })
      .eq("id", id);
    await supabaseAdmin.from("notifications").insert({
      user_id: appointment.user_id,
      message: `Votre séance individuelle du ${new Date(when).toLocaleString("fr-FR")} a été annulée.${reason ? ` Motif : ${reason}` : ""}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "postpone") {
    if (!reschedule_date || !reschedule_time) {
      return NextResponse.json({ error: "Nouvelle date et heure requises." }, { status: 400 });
    }
    if (!["en_attente", "pending", "confirme", "confirmed", "reporte"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cette séance ne peut pas être reportée." }, { status: 409 });
    }
    await supabaseAdmin
      .from("coaching_sessions")
      .update({
        status: "reporte",
        rescheduled_date: reschedule_date,
        rescheduled_time: reschedule_time,
        reschedule_reason: reschedule_reason || admin_note || null,
        admin_note: admin_note || null,
      })
      .eq("id", id);
    await supabaseAdmin.from("notifications").insert({
      user_id: appointment.user_id,
      message: `Votre séance a été reportée au ${reschedule_date} à ${String(reschedule_time).slice(0, 5)}.${reschedule_reason || admin_note ? ` Motif : ${reschedule_reason || admin_note}` : ""}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "bascule") {
    if (!merged_slot_id) {
      return NextResponse.json({ error: "Créneau collectif cible requis." }, { status: 400 });
    }
    if (!["en_attente", "pending", "confirme", "confirmed", "reporte"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cette séance ne peut pas être basculée." }, { status: 409 });
    }

    const { data: targetSlot } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, title, specific_date, start_time, end_time, mode")
      .eq("id", merged_slot_id)
      .eq("center_id", ctx.centerId)
      .eq("session_scope", "collective")
      .maybeSingle();

    if (!targetSlot) {
      return NextResponse.json({ error: "Créneau collectif introuvable." }, { status: 404 });
    }

    await supabaseAdmin
      .from("coaching_sessions")
      .update({
        status: "bascule",
        merged_slot_id,
        admin_note: admin_note || null,
      })
      .eq("id", id);

    const slotLabel = targetSlot.title || "séance collective";
    const whenLabel = targetSlot.specific_date
      ? ` (${targetSlot.specific_date} · ${String(targetSlot.start_time || "").slice(0, 5)})`
      : "";
    const joinPath =
      targetSlot.mode === "en_ligne" && targetSlot.specific_date
        ? collectiveJoinPath(targetSlot.id, targetSlot.specific_date)
        : null;
    const message = joinPath
      ? `Votre séance individuelle a été intégrée à « ${slotLabel} »${whenLabel}. Rejoignez : ${joinPath}`
      : `Votre séance individuelle a été intégrée à « ${slotLabel} »${whenLabel}.`;

    await supabaseAdmin.from("notifications").insert({
      user_id: appointment.user_id,
      message,
    });
    await sendPushToUsers([appointment.user_id], {
      title: "Séance basculée en groupe",
      body: `Intégré à « ${slotLabel} »`,
      url: joinPath || "/dashboard/coaching",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "complete") {
    if (!["confirme", "confirmed", "reporte"].includes(appointment.status)) {
      return NextResponse.json({ error: "Cette séance ne peut pas être marquée réalisée." }, { status: 409 });
    }
    await supabaseAdmin.from("coaching_sessions").update({ status: "effectue" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getCallerCenter(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès réservé aux centres TCF." }, { status: 403 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") || "individual";
  const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to =
    url.searchParams.get("to") ||
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  if (kind === "individual") {
    const { data: students } = await supabaseAdmin
      .from("profiles")
      .select("id, pending_groupe_id")
      .eq("center_id", ctx.centerId)
      .eq("role", "student");

    const studentIds = (students ?? []).map((s) => s.id);
    if (studentIds.length === 0) return NextResponse.json({ items: [] });

    const { data: rows, error } = await supabaseAdmin
      .from("coaching_sessions")
      .select("id, user_id, session_date, session_time, status, note, admin_note, reschedule_reason, rescheduled_date, rescheduled_time, merged_slot_id, profiles:user_id(prenom, nom, email)")
      .in("user_id", studentIds)
      .gte("session_date", from)
      .lte("session_date", to)
      .order("session_date", { ascending: true })
      .order("session_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const classroomByStudent = new Map<string, string>();

    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, status, groupes(nom)")
      .in("student_id", studentIds)
      .in("status", ["active", "draft"])
      .not("groupe_id", "is", null);

    for (const e of enrollments ?? []) {
      const nom = (e as { groupes?: { nom?: string | null } | null }).groupes?.nom?.trim();
      if (!nom) continue;
      const existing = classroomByStudent.get(e.student_id);
      // Préférer l'inscription active
      if (!existing || e.status === "active") {
        classroomByStudent.set(e.student_id, nom);
      }
    }

    const missingPending = (students ?? []).filter(
      (s) => s.pending_groupe_id && !classroomByStudent.has(s.id),
    );
    if (missingPending.length > 0) {
      const pendingGroupeIds = [...new Set(missingPending.map((s) => s.pending_groupe_id!).filter(Boolean))];
      const { data: pendingGroupes } = await supabaseAdmin
        .from("groupes")
        .select("id, nom")
        .in("id", pendingGroupeIds);
      const nomByGroupe = new Map((pendingGroupes ?? []).map((g) => [g.id, g.nom]));
      for (const s of missingPending) {
        const nom = nomByGroupe.get(s.pending_groupe_id!)?.trim();
        if (nom) classroomByStudent.set(s.id, nom);
      }
    }

    const items = (rows ?? []).map((r: any) => {
      const date = r.rescheduled_date || r.session_date;
      const time = (r.rescheduled_time || r.session_time)?.slice(0, 5);
      let kanban = normalizeCoachingStatus(r.status);
      if (r.merged_slot_id) kanban = "bascule";
      return {
        id: r.id,
        kind: "individual",
        kanban,
        raw_status: r.status,
        student_name: `${r.profiles?.prenom || ""} ${r.profiles?.nom || ""}`.trim() || r.profiles?.email || "Étudiant",
        classroom_name: classroomByStudent.get(r.user_id) || null,
        date,
        time,
        scheduled_at: sessionToIso(date, time),
        note: r.note,
        admin_note: r.admin_note,
        reschedule_reason: r.reschedule_reason,
        merged_slot_id: r.merged_slot_id,
      };
    });

    return NextResponse.json({ items });
  }

  const { data: slots, error: slotErr } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, title, day_of_week, start_time, end_time, specific_date, formateur_id,
      room_name, mode, online_link, groupe_id,
      profiles:formateur_id(prenom, nom),
      schedule_exceptions(id, exception_date, type, reason, new_date, new_start_time, new_end_time),
      schedule_slot_groupes(groupe_id, groupes(nom))
    `)
    .eq("center_id", ctx.centerId)
    .eq("session_scope", "collective");

  if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 });

  const items: any[] = [];
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    const dow = d.getDay() === 0 ? 7 : d.getDay();

    for (const slot of slots ?? []) {
      const isOneOff = !!slot.specific_date;
      if (isOneOff && slot.specific_date !== dateKey) continue;
      if (!isOneOff && slot.day_of_week !== dow) continue;

      const ex = (slot.schedule_exceptions ?? []).find((e: any) => e.exception_date === dateKey);
      let kanban = "planifie";
      let displayDate = dateKey;
      let startTime = slot.start_time.slice(0, 5);
      let endTime = slot.end_time.slice(0, 5);

      if (ex) {
        if (ex.type === "cancelled") kanban = "annule";
        else if (ex.type === "rescheduled") {
          kanban = "reporte";
          if (ex.new_date) displayDate = ex.new_date;
          if (ex.new_start_time) startTime = ex.new_start_time.slice(0, 5);
          if (ex.new_end_time) endTime = ex.new_end_time.slice(0, 5);
        } else if (ex.type === "completed") kanban = "realise";
        // substituted : remplacement formateur → reste planifié
      }

      const groupNames =
        (slot.schedule_slot_groupes ?? []).map((g: any) => g.groupes?.nom).filter(Boolean) ||
        [];

      items.push({
        id: `${slot.id}-${dateKey}`,
        slot_id: slot.id,
        exception_id: ex?.id ?? null,
        occurrence_date: dateKey,
        kind: "collective",
        kanban,
        title: slot.title || "Coaching de groupe",
        date: displayDate,
        start_time: startTime,
        end_time: endTime,
        formateur: (() => {
          const p = (slot as { profiles?: { prenom?: string } | { prenom?: string }[] }).profiles;
          if (Array.isArray(p)) return p[0]?.prenom || null;
          return p?.prenom || null;
        })(),
        room_name: slot.room_name,
        mode: slot.mode,
        group_names: groupNames,
        reason: ex?.reason ?? null,
      });
    }
  }

  items.sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getCallerCenter(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès réservé aux centres TCF." }, { status: 403 });

  const body = await req.json();
  const { id, kind, action } = body;

  if (!id || !action) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const resolvedKind =
    kind === "collective" || kind === "individual"
      ? kind
      : parseCollectiveId(id)
        ? "collective"
        : "individual";

  if (resolvedKind === "collective") {
    return patchCollective(ctx, body);
  }

  const { data: students } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", ctx.centerId)
    .eq("role", "student");

  const studentIds = new Set((students ?? []).map((s) => s.id));
  return patchIndividual(ctx, studentIds, body);
}
