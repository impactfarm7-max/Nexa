import { SupabaseClient } from "@supabase/supabase-js";

export type TargetScope = "all" | "groupes" | "students";

export async function resolveTcfExamStudentIds(
  supabase: SupabaseClient,
  centerId: string,
  targetScope: TargetScope,
  groupeIds: string[],
  studentIds: string[]
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

  const { data: filiere } = await supabase
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", "TCF Canada")
    .maybeSingle();

  if (!filiere?.id) return [];

  let enrollQuery = supabase
    .from("enrollments")
    .select("student_id")
    .eq("filiere_id", filiere.id)
    .eq("status", "active");

  if (targetScope === "groupes" && groupeIds.length > 0) {
    enrollQuery = enrollQuery.in("groupe_id", groupeIds);
  }

  const { data: enrollments } = await enrollQuery;
  return [...new Set((enrollments ?? []).map((e) => e.student_id))];
}

export async function createTcfExamAssignments(
  supabase: SupabaseClient,
  sessionId: string,
  studentIds: string[],
  sessionTitle: string
) {
  if (studentIds.length === 0) return;

  await supabase.from("tcf_exam_assignments").insert(
    studentIds.map((user_id) => ({ session_id: sessionId, user_id, status: "assigned" }))
  );

  const notifications = studentIds.map((user_id) => ({
    user_id,
    message: `📋 Examen TCF programmé : ${sessionTitle}`,
  }));
  await supabase.from("notifications").insert(notifications);
}
