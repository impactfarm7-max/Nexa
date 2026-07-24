import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { fetchCourseIfVisible, getStudentCourseContext } from "../studentCourseAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { courseId } = await params;
  const { centerId, groupeIds } = await getStudentCourseContext(user.id);
  if (!centerId) {
    return NextResponse.json({ error: "Aucun centre associe." }, { status: 404 });
  }

  const course = await fetchCourseIfVisible(courseId, centerId, groupeIds);
  if (!course) {
    return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  }

  const { data: lessonRows, error: lessonsError } = await supabaseAdmin
    .from("course_lessons")
    .select("id, title, subtitle, body, position, unlock_at")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (lessonsError) {
    console.error("student/courses/[id] lessons:", lessonsError);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const lessons = lessonRows ?? [];
  const lessonIds = lessons.map((l) => l.id);

  let mediaByLesson: Record<string, Array<{ id: string; type: string; url: string; label: string | null }>> = {};
  if (lessonIds.length > 0) {
    const { data: mediaRows } = await supabaseAdmin
      .from("lesson_media")
      .select("id, lesson_id, type, url, label")
      .in("lesson_id", lessonIds);

    for (const m of mediaRows ?? []) {
      const key = m.lesson_id as string;
      if (!mediaByLesson[key]) mediaByLesson[key] = [];
      mediaByLesson[key].push({
        id: m.id,
        type: m.type,
        url: m.url,
        label: m.label,
      });
    }
  }

  const now = Date.now();

  return NextResponse.json({
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      downloadable: course.downloadable,
      discipline: (course as { exam_disciplines?: { name?: string } | null }).exam_disciplines?.name ?? null,
    },
    lessons: lessons.map((l) => {
      const locked = l.unlock_at ? new Date(l.unlock_at).getTime() > now : false;
      return {
        id: l.id,
        title: l.title,
        subtitle: l.subtitle,
        body: locked ? null : l.body,
        position: l.position,
        unlock_at: l.unlock_at,
        locked,
        media: mediaByLesson[l.id] ?? [],
      };
    }),
  });
}
