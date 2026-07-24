import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  center_id: string;
  center_status: string | null;
  pending_groupe_id: string | null;
};

/**
 * Résout les classes de l'étudiant pour le ciblage des cours.
 * Aligné TCF + centre générique : enrollments, pending_groupe_id (communauté), salles classroom.
 */
export async function resolveStudentGroupeIds(userId: string, profile: ProfileRow): Promise<string[]> {
  const groupeIds = new Set<string>();
  const isProfileActive = profile.center_status === "active";

  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select("groupe_id, status")
    .eq("student_id", userId)
    .in("status", ["active", "draft"]);

  for (const e of enrollments ?? []) {
    if (!e.groupe_id) continue;
    if (e.status === "active") {
      groupeIds.add(e.groupe_id);
    } else if (e.status === "draft" && isProfileActive) {
      groupeIds.add(e.groupe_id);
    }
  }

  if (profile.pending_groupe_id) {
    groupeIds.add(profile.pending_groupe_id);
  }

  const { data: roomMembers } = await supabaseAdmin
    .from("community_room_members")
    .select("community_rooms(groupe_id, type, center_id)")
    .eq("user_id", userId);

  for (const row of roomMembers ?? []) {
    const room = row.community_rooms as {
      groupe_id?: string | null;
      type?: string | null;
      center_id?: string | null;
    } | null;
    if (
      room?.type === "classroom" &&
      room.center_id === profile.center_id &&
      room.groupe_id
    ) {
      groupeIds.add(room.groupe_id);
    }
  }

  return [...groupeIds];
}

async function collectFallbackGroupeIds(userId: string, profile: ProfileRow): Promise<string[]> {
  const ids = new Set<string>();
  if (profile.pending_groupe_id) ids.add(profile.pending_groupe_id);

  const { data: roomMembers } = await supabaseAdmin
    .from("community_room_members")
    .select("community_rooms(groupe_id, type, center_id)")
    .eq("user_id", userId);

  for (const row of roomMembers ?? []) {
    const room = row.community_rooms as {
      groupe_id?: string | null;
      type?: string | null;
      center_id?: string | null;
    } | null;
    if (
      room?.type === "classroom" &&
      room.center_id === profile.center_id &&
      room.groupe_id
    ) {
      ids.add(room.groupe_id);
    }
  }

  return [...ids];
}

/** Répare les inscriptions actives sans salle (données TCF / communauté désynchronisées). */
async function syncMissingEnrollmentGroupe(userId: string, profile: ProfileRow): Promise<void> {
  const fallbacks = await collectFallbackGroupeIds(userId, profile);
  if (fallbacks.length === 0) return;

  const { data: broken } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("student_id", userId)
    .eq("status", "active")
    .is("groupe_id", null);

  if (!broken?.length) return;

  await supabaseAdmin
    .from("enrollments")
    .update({ groupe_id: fallbacks[0] })
    .in(
      "id",
      broken.map((b) => b.id),
    );
}

export async function getStudentCourseContext(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, center_status, pending_groupe_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.center_id) {
    return {
      centerId: null as string | null,
      groupeIds: [] as string[],
      hasClassContext: false,
    };
  }

  await syncMissingEnrollmentGroupe(userId, profile as ProfileRow);
  const groupeIds = await resolveStudentGroupeIds(userId, profile as ProfileRow);

  return {
    centerId: profile.center_id,
    groupeIds,
    hasClassContext: groupeIds.length > 0,
  };
}

type CourseRow = {
  id: string;
  center_id: string;
  status: string;
  course_groupes?: Array<{ groupe_id: string }>;
};

export function courseVisibleToStudent(course: CourseRow, centerId: string, groupeIds: string[]) {
  if (course.center_id !== centerId || course.status !== "published") return false;
  const groups = (course.course_groupes ?? []).map((g) => g.groupe_id);
  if (groups.length === 0) return true;
  return groupeIds.some((g) => groups.includes(g));
}

export async function fetchVisibleCourses(centerId: string, groupeIds: string[]) {
  const { data: courses, error } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, status, center_id, updated_at, discipline_id, exam_disciplines(name), course_lessons(id), course_groupes(groupe_id)"
    )
    .eq("center_id", centerId)
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (courses ?? []).filter((c) => courseVisibleToStudent(c as CourseRow, centerId, groupeIds));
}

export async function countPublishedCoursesForCenter(centerId: string) {
  const { count, error } = await supabaseAdmin
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("center_id", centerId)
    .eq("status", "published");

  if (error) throw error;
  return count ?? 0;
}

export async function fetchCourseIfVisible(courseId: string, centerId: string, groupeIds: string[]) {
  const { data: course, error } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, status, center_id, downloadable, discipline_id, exam_disciplines(name), course_groupes(groupe_id)"
    )
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course || !courseVisibleToStudent(course as CourseRow, centerId, groupeIds)) {
    return null;
  }

  return course;
}
