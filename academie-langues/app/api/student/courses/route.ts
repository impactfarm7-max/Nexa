import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import {
  countPublishedCoursesForCenter,
  fetchVisibleCourses,
  getStudentCourseContext,
} from "./studentCourseAccess";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { centerId, groupeIds } = await getStudentCourseContext(user.id);
  if (!centerId) {
    return NextResponse.json({ courses: [], hasCenter: false });
  }

  try {
    const [visible, publishedCount] = await Promise.all([
      fetchVisibleCourses(centerId, groupeIds),
      countPublishedCoursesForCenter(centerId),
    ]);

    const emptyHint =
      visible.length === 0 && publishedCount > 0 && groupeIds.length === 0
        ? "no_class"
        : visible.length === 0 && publishedCount === 0
          ? "no_published"
          : visible.length === 0 && groupeIds.length > 0
            ? "no_match"
            : null;

    return NextResponse.json({
      hasCenter: true,
      empty_hint: emptyHint,
      courses: visible.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        discipline: (c as { exam_disciplines?: { name?: string } | null }).exam_disciplines?.name ?? null,
        lesson_count: ((c as { course_lessons?: unknown[] }).course_lessons ?? []).length,
        updated_at: c.updated_at,
      })),
    });
  } catch (e) {
    console.error("student/courses GET:", e);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }
}
