import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import { maybeAutoCreateConvocationFromSlot } from "@/app/utils/examConvocations.server";
import { resolveSlotGroupeIds } from "@/app/utils/classAttendance.server";
import {
  assertTrainerDiscipline,
  assertTrainerFiliere,
  assertTrainerGroupes,
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
  slotTouchesTrainerScope,
  type TrainerAcademicScope,
} from "@/app/utils/trainerAcademicScope.server";

function isMissing(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const m = (err.message || "").toLowerCase();
  return err.code === "42883" || m.includes("upsert_schedule_slot") || m.includes("does not exist");
}

/** Formateurs : cours ; direction : planning. */
async function requirePlanningAccess(ctx: Parameters<typeof requireCenterPermission>[0]) {
  if (ctx.role === "trainer") {
    return requireCenterPermission(ctx, "cours");
  }
  const plan = await requireCenterPermission(ctx, "planning");
  if (!plan) return null;
  return requireCenterPermission(ctx, "cours");
}

async function loadScope(
  ctx: Parameters<typeof isTrainerLeastPrivilege>[0],
): Promise<TrainerAcademicScope | null> {
  if (!isTrainerLeastPrivilege(ctx)) return null;
  return getTrainerAcademicScope(supabaseAdmin, ctx.user.id, ctx.centerId);
}

async function assertSlotInScope(
  scope: TrainerAcademicScope,
  slotId: string,
  groupeId?: string | null,
): Promise<string | null> {
  const gids = await resolveSlotGroupeIds(supabaseAdmin, slotId, groupeId ?? null);
  if (!slotTouchesTrainerScope(scope, gids)) {
    return "Hors de votre périmètre (promotion).";
  }
  return null;
}

export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  const permissionError = await requirePlanningAccess(ctx!);
  if (permissionError) return permissionError;

  const trainerScope = await loadScope(ctx!);
  if (trainerScope?.empty) {
    return NextResponse.json({ error: "Aucune UE / promotion assignée." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const action = String(body.action || "");

  if (action === "upsert") {
    const groupeIds = Array.isArray(body.groupe_ids)
      ? (body.groupe_ids as string[]).filter(Boolean)
      : [];
    const primaryGroupe = body.groupe_id ? String(body.groupe_id) : (groupeIds[0] || null);
    const allGroupes = [...new Set([...(primaryGroupe ? [primaryGroupe] : []), ...groupeIds])];

    if (trainerScope) {
      const fErr = assertTrainerFiliere(trainerScope, body.filiere_id ? String(body.filiere_id) : null);
      if (fErr) return NextResponse.json({ error: fErr }, { status: 403 });
      const gErr = assertTrainerGroupes(trainerScope, allGroupes);
      if (gErr) return NextResponse.json({ error: gErr }, { status: 403 });
      const dErr = assertTrainerDiscipline(
        trainerScope,
        body.discipline_id ? String(body.discipline_id) : null,
      );
      if (dErr) return NextResponse.json({ error: dErr }, { status: 403 });
      if (body.slot_id) {
        const { data: existing } = await supabaseAdmin
          .from("schedule_slots")
          .select("id, groupe_id")
          .eq("id", body.slot_id)
          .eq("center_id", ctx!.centerId)
          .maybeSingle();
        if (!existing) return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
        const scopeErr = await assertSlotInScope(trainerScope, existing.id, existing.groupe_id);
        if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });
      }
    }

    const { data, error: rpcErr } = await supabaseAdmin.rpc("upsert_schedule_slot", {
      p_slot_id: body.slot_id || null,
      p_center_id: ctx!.centerId,
      p_filiere_id: body.filiere_id,
      p_niveau_id: body.niveau_id || null,
      p_groupe_id: body.groupe_id || null,
      p_groupe_ids: groupeIds.length ? groupeIds : null,
      p_day_of_week: Number(body.day_of_week),
      p_start_time: body.start_time,
      p_end_time: body.end_time,
      p_discipline_id: body.discipline_id || null,
      p_title: body.title || null,
      p_formateur_id: trainerScope ? ctx!.user.id : (body.formateur_id || null),
      p_room_name: body.room_name || null,
      p_mode: body.mode || "presentiel",
      p_online_link: body.online_link || null,
      p_created_by: ctx!.user.id,
      p_is_tronc_commun: Boolean(body.is_tronc_commun),
    });

    if (rpcErr) {
      if (isMissing(rpcErr)) {
        return NextResponse.json(
          { error: "RPC planning absente — exécutez supabase-planning-libre-conflicts.sql.", code: "MISSING_RPC" },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    const slotId = data as string;
    if (typeof body.is_exam === "boolean" && slotId) {
      const { error: examFlagErr } = await supabaseAdmin
        .from("schedule_slots")
        .update({ is_exam: body.is_exam })
        .eq("id", slotId)
        .eq("center_id", ctx!.centerId);
      if (examFlagErr && !["42703", "PGRST204"].includes(examFlagErr.code || "")) {
        return NextResponse.json({ error: examFlagErr.message }, { status: 400 });
      }
    }

    let autoConvocation: { created: boolean; reason?: string; convocationId?: string } | null = null;
    if (slotId) {
      try {
        autoConvocation = await maybeAutoCreateConvocationFromSlot(
          supabaseAdmin,
          slotId,
          ctx!.user.id,
        );
      } catch (e) {
        console.warn("[planning-slots] auto convocation", e);
      }
    }

    return NextResponse.json({ slot_id: slotId, auto_convocation: autoConvocation });
  }

  if (action === "materialize") {
    const { data: ownedSlot } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, groupe_id")
      .eq("id", body.slot_id)
      .eq("center_id", ctx!.centerId)
      .maybeSingle();
    if (!ownedSlot) return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
    if (trainerScope) {
      const scopeErr = await assertSlotInScope(trainerScope, ownedSlot.id, ownedSlot.groupe_id);
      if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });
    }
    const { data, error: rpcErr } = await supabaseAdmin.rpc("materialize_weekly_slot", {
      p_slot_id: body.slot_id,
      p_from_date: body.from_date || new Date().toISOString().slice(0, 10),
      p_weeks: Math.min(52, Math.max(1, Number(body.weeks) || 1)),
      p_actor: ctx!.user.id,
    });
    if (rpcErr) {
      if (isMissing(rpcErr)) {
        return NextResponse.json(
          { error: "RPC planning absente — exécutez supabase-planning-libre-conflicts.sql.", code: "MISSING_RPC" },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    const createdIds: string[] = Array.isArray((data as { created_ids?: string[] })?.created_ids)
      ? ((data as { created_ids: string[] }).created_ids || []).map(String)
      : [];
    const autoResults = [];
    for (const id of createdIds) {
      autoResults.push(
        await maybeAutoCreateConvocationFromSlot(supabaseAdmin, id, ctx!.user.id),
      );
    }

    return NextResponse.json({
      ...(typeof data === "object" && data ? data : {}),
      auto_convocations_created: autoResults.filter((r) => r.created).length,
    });
  }

  if (action === "save_exception") {
    const exType = String(body.type || "");
    const reason = String(body.reason || "").trim();
    if (!reason) {
      return NextResponse.json({ error: "Motif obligatoire." }, { status: 400 });
    }
    if (!["cancelled", "rescheduled", "substituted"].includes(exType)) {
      return NextResponse.json({ error: "Type d'exception invalide." }, { status: 400 });
    }
    if (exType === "rescheduled") {
      const hasAny = Boolean(body.new_date || body.new_start_time || body.new_end_time);
      const hasAll = Boolean(body.new_date && body.new_start_time && body.new_end_time);
      if (hasAny && !hasAll) {
        return NextResponse.json(
          { error: "Date et horaires de report obligatoires (ou laissez tout vide pour placer plus tard)." },
          { status: 400 },
        );
      }
    }

    const { data: slot } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, center_id, formateur_id, start_time, end_time, groupe_id")
      .eq("id", body.slot_id)
      .maybeSingle();
    if (!slot || slot.center_id !== ctx!.centerId) {
      return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
    }
    if (trainerScope) {
      const scopeErr = await assertSlotInScope(trainerScope, slot.id, slot.groupe_id);
      if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });
    }

    if (
      exType === "rescheduled" &&
      slot.formateur_id &&
      body.new_date &&
      body.new_start_time &&
      body.new_end_time
    ) {
      const newDate = String(body.new_date);
      const dow = new Date(`${newDate}T12:00:00`);
      const isoDow = dow.getDay() === 0 ? 7 : dow.getDay();
      const { data: overlap } = await supabaseAdmin.rpc("check_formateur_overlap", {
        p_center_id: ctx!.centerId,
        p_formateur_id: slot.formateur_id,
        p_day_of_week: isoDow,
        p_start_time: body.new_start_time,
        p_end_time: body.new_end_time,
        p_specific_date: newDate,
        p_exclude_slot_id: body.slot_id,
      });
      if (overlap) {
        return NextResponse.json(
          { error: "Ce formateur est déjà programmé sur la nouvelle plage." },
          { status: 400 },
        );
      }
    }

    const payload: Record<string, unknown> = {
      slot_id: body.slot_id,
      exception_date: body.exception_date,
      type: exType,
      reason,
      created_by: ctx!.user.id,
      new_date: exType === "rescheduled" ? body.new_date : null,
      new_start_time: exType === "rescheduled" ? body.new_start_time : null,
      new_end_time: exType === "rescheduled" ? body.new_end_time : null,
      new_room_name: exType === "rescheduled" ? body.new_room_name || null : null,
      substitute_formateur_id: exType === "substituted" ? body.substitute_formateur_id || null : null,
    };

    if (body.exception_id) {
      const { data: ownedException } = await supabaseAdmin
        .from("schedule_exceptions")
        .select("id, slot_id")
        .eq("id", body.exception_id)
        .eq("slot_id", body.slot_id)
        .maybeSingle();
      if (!ownedException) {
        return NextResponse.json({ error: "Exception introuvable pour ce créneau." }, { status: 404 });
      }
      const { error: uErr } = await supabaseAdmin
        .from("schedule_exceptions")
        .update(payload)
        .eq("id", body.exception_id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    } else {
      const { error: iErr } = await supabaseAdmin.from("schedule_exceptions").insert(payload);
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "place_reschedule") {
    const exceptionId = String(body.exception_id || "");
    const newDate = String(body.new_date || "");
    const newStart = String(body.new_start_time || "");
    const newEnd = String(body.new_end_time || "");
    const reason = String(body.reason || "Report placé sur plage libre").trim();
    const newRoomName =
      body.new_room_name == null || body.new_room_name === ""
        ? null
        : String(body.new_room_name).trim();
    const newFormateurId =
      body.new_formateur_id == null || body.new_formateur_id === ""
        ? null
        : String(body.new_formateur_id);

    if (!exceptionId || !newDate || !newStart || !newEnd) {
      return NextResponse.json({ error: "exception_id, date et horaires requis." }, { status: 400 });
    }

    const { data: ex } = await supabaseAdmin
      .from("schedule_exceptions")
      .select("id, slot_id, type")
      .eq("id", exceptionId)
      .maybeSingle();
    if (!ex) return NextResponse.json({ error: "Exception introuvable." }, { status: 404 });

    const { data: slot } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, center_id, formateur_id, room_name, groupe_id")
      .eq("id", ex.slot_id)
      .maybeSingle();
    if (!slot || slot.center_id !== ctx!.centerId) {
      return NextResponse.json({ error: "Créneau hors centre." }, { status: 403 });
    }
    if (trainerScope) {
      const scopeErr = await assertSlotInScope(trainerScope, slot.id, slot.groupe_id);
      if (scopeErr) return NextResponse.json({ error: scopeErr }, { status: 403 });
    }

    const formateurForCheck = newFormateurId || slot.formateur_id;
    if (formateurForCheck) {
      const dow = new Date(`${newDate}T12:00:00`);
      const isoDow = dow.getDay() === 0 ? 7 : dow.getDay();
      const { data: overlap } = await supabaseAdmin.rpc("check_formateur_overlap", {
        p_center_id: ctx!.centerId,
        p_formateur_id: formateurForCheck,
        p_day_of_week: isoDow,
        p_start_time: newStart,
        p_end_time: newEnd,
        p_specific_date: newDate,
        p_exclude_slot_id: slot.id,
      });
      if (overlap) {
        return NextResponse.json({ error: "Formateur déjà pris sur cette plage." }, { status: 400 });
      }
    }

    const roomToStore = newRoomName ?? slot.room_name ?? null;

    // Overrides stockés sur l'exception uniquement — ne pas muter le créneau récurrent.
    const { error: uErr } = await supabaseAdmin
      .from("schedule_exceptions")
      .update({
        type: "rescheduled",
        reason,
        new_date: newDate,
        new_start_time: newStart,
        new_end_time: newEnd,
        new_room_name: roomToStore,
        substitute_formateur_id: newFormateurId,
      })
      .eq("id", exceptionId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

/** GET: establishment week + pending reschedules for kanban */
export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  const permissionError = await requirePlanningAccess(ctx!);
  if (permissionError) return permissionError;

  const trainerScope = await loadScope(ctx!);
  if (trainerScope?.empty) {
    return NextResponse.json({
      week_start: null,
      week_end: null,
      filieres: [],
      slots: [],
      pending_reports: [],
      placed_reports: [],
    });
  }

  const url = new URL(req.url);
  const weekStart = url.searchParams.get("week_start");
  if (!weekStart) {
    return NextResponse.json({ error: "week_start requis (YYYY-MM-DD)." }, { status: 400 });
  }

  const weekEnd = new Date(`${weekStart}T12:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  let { data: filieres } = await supabaseAdmin
    .from("filieres")
    .select("id, name")
    .eq("center_id", ctx!.centerId)
    .eq("status", "published");
  if (trainerScope) {
    filieres = (filieres || []).filter((f) => trainerScope.filiereIds.has(f.id));
  }
  const filiereIds = (filieres || []).map((f) => f.id);

  let slots: unknown[] = [];
  if (filiereIds.length > 0) {
    const collected: unknown[] = [];
    for (const fid of filiereIds) {
      const { data } = await supabaseAdmin.rpc("get_weekly_schedule", {
        p_center_id: ctx!.centerId,
        p_week_start: weekStart,
        p_filiere_id: fid,
        p_niveau_id: null,
        p_formateur_id: trainerScope ? ctx!.user.id : null,
      });
      if (Array.isArray(data)) {
        collected.push(
          ...data.map((s: Record<string, unknown>) => ({
            ...s,
            filiere_id: fid,
            filiere_name: (filieres || []).find((f) => f.id === fid)?.name || "",
          })),
        );
      }
    }
    slots = collected;

    if (trainerScope && slots.length) {
      const kept: unknown[] = [];
      for (const raw of slots) {
        const s = raw as { id?: string; groupe_id?: string | null };
        if (!s.id) continue;
        const gids = await resolveSlotGroupeIds(supabaseAdmin, s.id, s.groupe_id ?? null);
        if (slotTouchesTrainerScope(trainerScope, gids)) kept.push(raw);
      }
      slots = kept;
    }
  }

  const { data: pending } = await supabaseAdmin
    .from("schedule_exceptions")
    .select(
      "id, slot_id, exception_date, type, reason, new_date, new_start_time, new_end_time, new_room_name, schedule_slots!inner(id, title, start_time, end_time, formateur_id, room_name, center_id, day_of_week, groupe_id)",
    )
    .eq("type", "rescheduled")
    .is("new_date", null)
    .eq("schedule_slots.center_id", ctx!.centerId)
    .order("exception_date", { ascending: false })
    .limit(50);

  const { data: reportsThisWeek } = await supabaseAdmin
    .from("schedule_exceptions")
    .select(
      "id, slot_id, exception_date, type, reason, new_date, new_start_time, new_end_time, schedule_slots!inner(id, title, center_id, groupe_id)",
    )
    .eq("type", "rescheduled")
    .eq("schedule_slots.center_id", ctx!.centerId)
    .gte("new_date", weekStart)
    .lte("new_date", weekEndStr)
    .limit(100);

  let pendingReports = pending || [];
  let placedReports = reportsThisWeek || [];
  if (trainerScope) {
    const filterEx = async <T extends { slot_id: string; schedule_slots?: { groupe_id?: string | null } | { groupe_id?: string | null }[] | null }>(
      rows: T[],
    ) => {
      const out: T[] = [];
      for (const row of rows) {
        const sl = row.schedule_slots;
        const g = Array.isArray(sl) ? sl[0]?.groupe_id : sl?.groupe_id;
        const gids = await resolveSlotGroupeIds(supabaseAdmin, row.slot_id, g ?? null);
        if (slotTouchesTrainerScope(trainerScope, gids)) out.push(row);
      }
      return out;
    };
    pendingReports = await filterEx(pendingReports);
    placedReports = await filterEx(placedReports);
  }

  return NextResponse.json({
    week_start: weekStart,
    week_end: weekEndStr,
    filieres: filieres || [],
    slots,
    pending_reports: pendingReports,
    placed_reports: placedReports,
  });
}
