import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/app/utils/push-server";

export type ConvocationTargetScope = "all" | "groupes" | "students";

/** Étudiants actifs d'un centre université (filières cursus du centre). */
export async function resolveUnivConvocationStudentIds(
  supabase: SupabaseClient,
  centerId: string,
  targetScope: ConvocationTargetScope,
  groupeIds: string[],
  studentIds: string[],
  filiereId?: string | null,
): Promise<string[]> {
  if (targetScope === "students" && studentIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .in("id", studentIds)
      .eq("center_id", centerId)
      .eq("role", "student");
    return (data ?? []).map((p) => p.id);
  }

  let filiereQuery = supabase
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("type", "cursus");
  if (filiereId) filiereQuery = filiereQuery.eq("id", filiereId);
  const { data: filieres } = await filiereQuery;
  const filiereIds = (filieres ?? []).map((f) => f.id);
  if (filiereIds.length === 0) return [];

  let enrollQuery = supabase
    .from("enrollments")
    .select("student_id")
    .in("filiere_id", filiereIds)
    .in("status", ["active", "completed"]);

  if (targetScope === "groupes" && groupeIds.length > 0) {
    enrollQuery = enrollQuery.in("groupe_id", groupeIds);
  }

  const { data: enrollments } = await enrollQuery;
  return [...new Set((enrollments ?? []).map((e) => e.student_id).filter(Boolean))];
}

export async function createUnivConvocationAssignments(
  supabase: SupabaseClient,
  convocationId: string,
  studentIds: string[],
  epreuveLabel: string,
  scheduledAt: string,
  roomName: string,
) {
  if (studentIds.length === 0) return;

  await supabase.from("exam_convocation_assignments").upsert(
    studentIds.map((user_id) => ({
      convocation_id: convocationId,
      user_id,
      status: "assigned",
    })),
    { onConflict: "convocation_id,user_id" },
  );

  const when = new Date(scheduledAt).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const message = `Convocation : ${epreuveLabel} — ${when} — Salle ${roomName}`;
  await supabase.from("notifications").insert(
    studentIds.map((user_id) => ({ user_id, message })),
  );
  await sendPushToUsers(studentIds, {
    title: "Convocation d'examen",
    body: message,
    url: "/dashboard/convocations",
  });
}

export type AutoConvocationResult = {
  created: boolean;
  convocationId?: string;
  reason?: string;
};

/**
 * Si le centre est en mode auto + créneau daté coché « Examen »,
 * crée une convocation publiée (idempotent via schedule_slot_id).
 */
export async function maybeAutoCreateConvocationFromSlot(
  supabase: SupabaseClient,
  slotId: string,
  actorId?: string | null,
): Promise<AutoConvocationResult> {
  const { data: slot } = await supabase
    .from("schedule_slots")
    .select(
      "id, center_id, filiere_id, groupe_id, title, room_name, specific_date, start_time, end_time, is_exam, discipline_id, exam_disciplines(name)",
    )
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return { created: false, reason: "slot_missing" };
  if (!slot.is_exam) return { created: false, reason: "not_exam" };
  if (!slot.specific_date) return { created: false, reason: "not_dated" };

  const roomName = String(slot.room_name || "").trim();
  if (!roomName) return { created: false, reason: "no_room" };

  const { data: center } = await supabase
    .from("centers")
    .select("center_type, exam_convocation_from_planning")
    .eq("id", slot.center_id)
    .maybeSingle();
  if (!center || center.center_type !== "universite") {
    return { created: false, reason: "not_university" };
  }
  if (center.exam_convocation_from_planning !== "auto") {
    return { created: false, reason: "manual_mode" };
  }

  const { data: existing } = await supabase
    .from("exam_convocations")
    .select("id")
    .eq("schedule_slot_id", slotId)
    .maybeSingle();
  if (existing?.id) return { created: false, reason: "already_linked", convocationId: existing.id };

  const disc = slot.exam_disciplines as { name?: string } | { name?: string }[] | null;
  const discName = Array.isArray(disc) ? disc[0]?.name : disc?.name;
  const epreuveLabel = String(slot.title || discName || "Épreuve").trim();

  const start = String(slot.start_time || "08:00").slice(0, 5);
  const end = String(slot.end_time || "10:00").slice(0, 5);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const durationMinutes = Math.max(15, eh * 60 + em - (sh * 60 + sm));
  const scheduledAt = new Date(`${slot.specific_date}T${start}:00`).toISOString();

  let groupeIds: string[] = [];
  const { data: grpLinks } = await supabase
    .from("schedule_slot_groupes")
    .select("groupe_id")
    .eq("slot_id", slotId);
  groupeIds = (grpLinks ?? []).map((g) => g.groupe_id).filter(Boolean);
  if (groupeIds.length === 0 && slot.groupe_id) groupeIds = [slot.groupe_id];

  const targetScope: ConvocationTargetScope = groupeIds.length > 0 ? "groupes" : "all";

  const { data: convocation, error } = await supabase
    .from("exam_convocations")
    .insert({
      center_id: slot.center_id,
      filiere_id: slot.filiere_id,
      filiere_matiere_id: null,
      epreuve_label: epreuveLabel,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      room_name: roomName,
      instructions: null,
      status: "published",
      target_scope: targetScope,
      schedule_slot_id: slotId,
      created_by: actorId || null,
    })
    .select("id")
    .single();

  if (error || !convocation) {
    // Collision unique (course) → déjà créé en parallèle
    if (error?.code === "23505") {
      const { data: again } = await supabase
        .from("exam_convocations")
        .select("id")
        .eq("schedule_slot_id", slotId)
        .maybeSingle();
      return { created: false, reason: "already_linked", convocationId: again?.id };
    }
    console.error("[maybeAutoCreateConvocationFromSlot]", error);
    return { created: false, reason: "insert_failed" };
  }

  if (targetScope === "groupes" && groupeIds.length) {
    await supabase.from("exam_convocation_groupes").insert(
      groupeIds.map((groupe_id) => ({ convocation_id: convocation.id, groupe_id })),
    );
  }

  const resolved = await resolveUnivConvocationStudentIds(
    supabase,
    slot.center_id,
    targetScope,
    groupeIds,
    [],
    slot.filiere_id,
  );
  await createUnivConvocationAssignments(
    supabase,
    convocation.id,
    resolved,
    epreuveLabel,
    scheduledAt,
    roomName,
  );

  return { created: true, convocationId: convocation.id };
}
