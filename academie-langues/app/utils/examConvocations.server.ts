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
