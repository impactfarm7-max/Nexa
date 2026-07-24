import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { notifyLiveSlotParticipants } from "@/app/utils/notifyCollectiveSlot.server";
import { sessionStartMs, sessionEndMs, JOIN_BEFORE_MS } from "@/app/utils/collectiveLive";
import { resolveEffectiveNexaOffer } from "@/app/data/nexaOffers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];
const PARTICIPANT_ROLES = [
  "student",
  "trainer",
  "staff",
  "campus_manager",
  "center_manager",
  "admin",
];

async function getCallerCenter(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", userId)
    .single();
  if (!profile?.center_id) return null;
  if (!STAFF_ROLES.includes(profile.role)) return null;
  return { centerId: profile.center_id as string, userId, role: profile.role as string };
}

function kanbanForOccurrence(
  dateKey: string,
  startTime: string,
  endTime: string,
  exceptions: Array<{ exception_date: string; type: string }>
) {
  const ex = exceptions.find((e) => e.exception_date === dateKey);
  if (ex?.type === "cancelled") return "annule";
  if (ex?.type === "completed") return "realise";
  const end = sessionEndMs(dateKey, endTime);
  if (Date.now() > end) return "realise";
  return "planifie";
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getCallerCenter(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to =
    url.searchParams.get("to") ||
    new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);

  const { data: slots, error } = await supabaseAdmin
    .from("schedule_slots")
    .select(`
      id, title, start_time, end_time, specific_date, formateur_id, mode,
      profiles:formateur_id(prenom, nom),
      schedule_exceptions(id, exception_date, type, reason),
      schedule_slot_participants(user_id)
    `)
    .eq("center_id", ctx.centerId)
    .eq("session_scope", "live")
    .gte("specific_date", from)
    .lte("specific_date", to)
    .order("specific_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allParticipantIds = [
    ...new Set(
      (slots ?? []).flatMap((s: any) =>
        (s.schedule_slot_participants ?? []).map((p: { user_id: string }) => p.user_id)
      )
    ),
  ];

  const profileById = new Map<string, { id: string; prenom: string | null; nom: string | null; email: string | null; role: string | null }>();
  if (allParticipantIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, role")
      .in("id", allParticipantIds);
    for (const p of profiles ?? []) profileById.set(p.id, p);
  }

  const items = (slots ?? []).map((slot: any) => {
    const dateKey = slot.specific_date as string;
    const startTime = String(slot.start_time || "").slice(0, 5);
    const endTime = String(slot.end_time || "").slice(0, 5);
    const exceptions = slot.schedule_exceptions ?? [];
    const kanban = kanbanForOccurrence(dateKey, startTime, endTime, exceptions);
    const formateurProfile = Array.isArray(slot.profiles) ? slot.profiles[0] : slot.profiles;
    const participants = (slot.schedule_slot_participants ?? []).map((p: { user_id: string }) => {
      const prof = profileById.get(p.user_id);
      return {
        id: p.user_id,
        prenom: prof?.prenom ?? null,
        nom: prof?.nom ?? null,
        email: prof?.email ?? null,
        role: prof?.role ?? null,
      };
    });

    return {
      id: `${slot.id}-${dateKey}`,
      slot_id: slot.id,
      kind: "live",
      kanban,
      title: slot.title || "Session Live",
      date: dateKey,
      start_time: startTime,
      end_time: endTime,
      mode: "en_ligne",
      formateur: formateurProfile
        ? `${formateurProfile.prenom || ""} ${formateurProfile.nom || ""}`.trim() || null
        : null,
      formateur_id: slot.formateur_id,
      participants,
      participant_ids: participants.map((p: { id: string }) => p.id),
      can_join:
        kanban === "planifie" &&
        (() => {
          const start = sessionStartMs(dateKey, startTime);
          const end = sessionEndMs(dateKey, endTime);
          const now = Date.now();
          return now >= start - JOIN_BEFORE_MS && now <= end;
        })(),
    };
  });

  // Catalogue participants du centre (pour le multi-select)
  const { data: people } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, nom, email, role")
    .eq("center_id", ctx.centerId)
    .in("role", PARTICIPANT_ROLES)
    .order("prenom", { ascending: true });

  // Audiences programme / classes → student_ids (inscrits actifs) pour presets UI
  const { data: filieres } = await supabaseAdmin
    .from("filieres")
    .select("id, name")
    .eq("center_id", ctx.centerId)
    .order("name", { ascending: true });

  const filiereIds = (filieres ?? []).map((f) => f.id);
  const { data: niveaux } = filiereIds.length
    ? await supabaseAdmin.from("niveaux").select("id, filiere_id").in("filiere_id", filiereIds)
    : { data: [] as Array<{ id: string; filiere_id: string }> };

  const niveauIds = (niveaux ?? []).map((n) => n.id);
  const niveauToFiliere = new Map((niveaux ?? []).map((n) => [n.id, n.filiere_id]));

  let groupes: Array<{ id: string; nom: string | null; filiere_id: string | null; niveau_id: string | null }> = [];
  if (filiereIds.length > 0) {
    const { data: byFiliere } = await supabaseAdmin
      .from("groupes")
      .select("id, nom, filiere_id, niveau_id")
      .in("filiere_id", filiereIds);
    groupes = byFiliere ?? [];
  }
  if (niveauIds.length > 0) {
    const { data: byNiveau } = await supabaseAdmin
      .from("groupes")
      .select("id, nom, filiere_id, niveau_id")
      .in("niveau_id", niveauIds);
    const seen = new Set(groupes.map((g) => g.id));
    for (const g of byNiveau ?? []) {
      if (!seen.has(g.id)) {
        groupes.push(g);
        seen.add(g.id);
      }
    }
  }

  const groupeIds = groupes.map((g) => g.id);
  const studentsByGroupe = new Map<string, string[]>();
  if (groupeIds.length > 0) {
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("student_id, groupe_id")
      .in("groupe_id", groupeIds)
      .eq("status", "active");
    for (const e of enrollments ?? []) {
      if (!e.groupe_id || !e.student_id) continue;
      const arr = studentsByGroupe.get(e.groupe_id) || [];
      arr.push(e.student_id);
      studentsByGroupe.set(e.groupe_id, arr);
    }
  }

  const peopleIds = new Set((people ?? []).map((p) => p.id));
  const audiences = (filieres ?? []).map((f) => {
    const filiereGroupes = groupes
      .filter((g) => g.filiere_id === f.id || (g.niveau_id && niveauToFiliere.get(g.niveau_id) === f.id))
      .map((g) => {
        const studentIds = [...new Set((studentsByGroupe.get(g.id) || []).filter((id) => peopleIds.has(id)))];
        return {
          id: g.id,
          name: g.nom || "Classe",
          student_ids: studentIds,
          student_count: studentIds.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const allStudentIds = [...new Set(filiereGroupes.flatMap((g) => g.student_ids))];
    return {
      id: f.id,
      name: f.name,
      student_ids: allStudentIds,
      student_count: allStudentIds.length,
      groupes: filiereGroupes,
    };
  });

  return NextResponse.json({
    items,
    people: (people ?? []).map((p) => ({
      id: p.id,
      label: `${p.prenom || ""} ${p.nom || ""}`.trim() || p.email || "Utilisateur",
      role: p.role,
      email: p.email,
    })),
    audiences,
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getCallerCenter(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const specificDate = typeof body.specific_date === "string" ? body.specific_date.trim() : "";
  const startTime = typeof body.start_time === "string" ? body.start_time.trim().slice(0, 5) : "";
  const endTime = typeof body.end_time === "string" ? body.end_time.trim().slice(0, 5) : "";
  const formateurId =
    typeof body.formateur_id === "string" && body.formateur_id ? body.formateur_id : null;
  const participantIds: string[] = Array.isArray(body.participant_ids)
    ? [...new Set(
        (body.participant_ids as unknown[]).filter((id): id is string => typeof id === "string")
      )]
    : [];

  if (!title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(specificDate)) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return NextResponse.json({ error: "Horaires invalides." }, { status: 400 });
  }
  if (participantIds.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins un participant." }, { status: 400 });
  }

  const { data: validPeople } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", ctx.centerId)
    .in("role", PARTICIPANT_ROLES)
    .in("id", participantIds);

  const validIds = new Set((validPeople ?? []).map((p) => p.id));
  const filtered = participantIds.filter((id) => validIds.has(id));
  if (filtered.length === 0) {
    return NextResponse.json({ error: "Aucun participant valide pour ce centre." }, { status: 400 });
  }

  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("nexa_offer, status, created_at")
    .eq("id", ctx.centerId)
    .maybeSingle();
  const offer = resolveEffectiveNexaOffer(centerRow);
  if (offer.maxLives <= 0 || !offer.modules.includes("lives")) {
    return NextResponse.json({
      error: `Les sessions Lives ne sont pas incluses dans l'offre ${offer.name}.`,
    }, { status: 403 });
  }
  const { count: liveCount } = await supabaseAdmin
    .from("schedule_slots")
    .select("id", { count: "exact", head: true })
    .eq("center_id", ctx.centerId)
    .eq("session_scope", "live");
  if ((liveCount || 0) >= offer.maxLives) {
    return NextResponse.json({
      error: `Limite de Lives atteinte pour l'offre ${offer.name} (${offer.maxLives} sessions).`,
    }, { status: 403 });
  }

  const d = new Date(`${specificDate}T12:00:00`);
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();

  // filiere_id requis sur schedule_slots — prendre la première filière du centre
  const { data: filiere } = await supabaseAdmin
    .from("filieres")
    .select("id")
    .eq("center_id", ctx.centerId)
    .limit(1)
    .maybeSingle();

  if (!filiere?.id) {
    return NextResponse.json({ error: "Aucune filière configurée pour ce centre." }, { status: 400 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("schedule_slots")
    .insert({
      center_id: ctx.centerId,
      filiere_id: filiere.id,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      title,
      formateur_id: formateurId,
      mode: "en_ligne",
      session_scope: "live",
      specific_date: specificDate,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message || "Création impossible." }, { status: 500 });
  }

  const { error: partErr } = await supabaseAdmin.from("schedule_slot_participants").insert(
    filtered.map((user_id) => ({ slot_id: inserted.id, user_id }))
  );
  if (partErr) {
    await supabaseAdmin.from("schedule_slots").delete().eq("id", inserted.id);
    return NextResponse.json({ error: partErr.message }, { status: 500 });
  }

  void notifyLiveSlotParticipants({
    centerId: ctx.centerId,
    slotId: inserted.id,
    event: "created",
    sessionDate: specificDate,
    title,
    startTime,
    endTime,
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getCallerCenter(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json();
  const slotId = typeof body.id === "string" ? body.id : "";
  if (!slotId) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  const { data: slot } = await supabaseAdmin
    .from("schedule_slots")
    .select("id, specific_date, title, start_time, end_time")
    .eq("id", slotId)
    .eq("center_id", ctx.centerId)
    .eq("session_scope", "live")
    .maybeSingle();

  if (!slot) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  if (body.action === "cancel") {
    const dateKey = slot.specific_date as string;
    const payload = {
      slot_id: slotId,
      exception_date: dateKey,
      type: "cancelled",
      reason: typeof body.reason === "string" ? body.reason : null,
      created_by: ctx.userId,
    };
    const { data: existing } = await supabaseAdmin
      .from("schedule_exceptions")
      .select("id")
      .eq("slot_id", slotId)
      .eq("exception_date", dateKey)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin.from("schedule_exceptions").update(payload).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("schedule_exceptions").insert(payload);
    }
    void notifyLiveSlotParticipants({
      centerId: ctx.centerId,
      slotId,
      event: "cancelled",
      sessionDate: dateKey,
      title: slot.title || "Session Live",
      startTime: String(slot.start_time).slice(0, 5),
      endTime: String(slot.end_time).slice(0, 5),
    });
    return NextResponse.json({ ok: true });
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 120) : slot.title || "Session Live";
  const specificDate =
    typeof body.specific_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.specific_date)
      ? body.specific_date
      : (slot.specific_date as string);
  const startTime =
    typeof body.start_time === "string" && /^\d{2}:\d{2}/.test(body.start_time)
      ? body.start_time.slice(0, 5)
      : String(slot.start_time).slice(0, 5);
  const endTime =
    typeof body.end_time === "string" && /^\d{2}:\d{2}/.test(body.end_time)
      ? body.end_time.slice(0, 5)
      : String(slot.end_time).slice(0, 5);
  const formateurId =
    body.formateur_id === null
      ? null
      : typeof body.formateur_id === "string"
        ? body.formateur_id || null
        : undefined;
  const participantIds: string[] | null = Array.isArray(body.participant_ids)
    ? [...new Set(
        (body.participant_ids as unknown[]).filter((id): id is string => typeof id === "string")
      )]
    : null;

  if (participantIds && participantIds.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins un participant." }, { status: 400 });
  }

  const d = new Date(`${specificDate}T12:00:00`);
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();

  const updatePayload: Record<string, unknown> = {
    title,
    specific_date: specificDate,
    start_time: startTime,
    end_time: endTime,
    day_of_week: dayOfWeek,
    mode: "en_ligne",
  };
  if (formateurId !== undefined) updatePayload.formateur_id = formateurId;

  const { error } = await supabaseAdmin
    .from("schedule_slots")
    .update(updatePayload)
    .eq("id", slotId)
    .eq("center_id", ctx.centerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (participantIds) {
    const { data: validPeople } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("center_id", ctx.centerId)
      .in("role", PARTICIPANT_ROLES)
      .in("id", participantIds);
    const filtered = (validPeople ?? []).map((p) => p.id);
    await supabaseAdmin.from("schedule_slot_participants").delete().eq("slot_id", slotId);
    if (filtered.length > 0) {
      await supabaseAdmin.from("schedule_slot_participants").insert(
        filtered.map((user_id) => ({ slot_id: slotId, user_id }))
      );
    }
  }

  void notifyLiveSlotParticipants({
    centerId: ctx.centerId,
    slotId,
    event: "rescheduled",
    sessionDate: specificDate,
    title,
    startTime,
    endTime,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const ctx = await getCallerCenter(user.id);
  if (!ctx) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const url = new URL(req.url);
  const slotId = url.searchParams.get("id");
  if (!slotId) return NextResponse.json({ error: "ID manquant." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("schedule_slots")
    .delete()
    .eq("id", slotId)
    .eq("center_id", ctx.centerId)
    .eq("session_scope", "live");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
