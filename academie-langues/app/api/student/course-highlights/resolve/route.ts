import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { fetchCourseIfVisible, getStudentCourseContext } from "../../courses/studentCourseAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Résout course_id pour une leçon centre (surlignages existants sans course_id). */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const lessonId = new URL(req.url).searchParams.get("lesson_id");
  if (!lessonId) {
    return NextResponse.json({ error: "lesson_id requis." }, { status: 400 });
  }

  const { data: lesson, error } = await supabaseAdmin
    .from("course_lessons")
    .select("id, course_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !lesson?.course_id) {
    return NextResponse.json({ error: "Lecon introuvable." }, { status: 404 });
  }

  const { centerId, groupeIds } = await getStudentCourseContext(user.id);
  if (!centerId) {
    return NextResponse.json({ error: "Aucun centre associe." }, { status: 404 });
  }

  const course = await fetchCourseIfVisible(lesson.course_id, centerId, groupeIds);
  if (!course) {
    return NextResponse.json({ error: "Cours inaccessible." }, { status: 403 });
  }

  return NextResponse.json({ course_id: lesson.course_id });
}
