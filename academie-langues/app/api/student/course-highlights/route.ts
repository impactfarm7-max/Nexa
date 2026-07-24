import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_SOURCES = new Set(["nexa_module", "center_lesson"]);
const VALID_COLORS = new Set(["yellow", "green", "blue", "pink", "orange"]);
const HIGHLIGHT_SELECT =
  "id, source_type, source_id, course_id, selected_text, note, color_key, anchor, created_at, updated_at";

type HighlightRow = {
  id: string;
  source_type: string;
  source_id: string;
  course_id: string | null;
  selected_text: string;
  note: string | null;
  color_key: string;
  anchor: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** Enrichit les surlignages centre avec titres cours / leçon (pour l'onglet Notes). */
async function enrichCenterMeta(rows: HighlightRow[]) {
  const centerRows = rows.filter((h) => h.source_type === "center_lesson");
  if (centerRows.length === 0) return rows;

  const lessonIds = [...new Set(centerRows.map((h) => h.source_id).filter(Boolean))];
  const courseIds = [
    ...new Set(
      centerRows
        .map((h) => h.course_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const lessonTitleById: Record<string, string> = {};
  const lessonCourseById: Record<string, string> = {};
  const courseTitleById: Record<string, string> = {};

  if (lessonIds.length > 0) {
    const { data: lessons } = await supabaseAdmin
      .from("course_lessons")
      .select("id, title, course_id")
      .in("id", lessonIds);

    for (const lesson of lessons ?? []) {
      lessonTitleById[lesson.id] = lesson.title;
      if (lesson.course_id) lessonCourseById[lesson.id] = lesson.course_id;
      if (lesson.course_id && !courseIds.includes(lesson.course_id)) {
        courseIds.push(lesson.course_id);
      }
    }
  }

  if (courseIds.length > 0) {
    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, title")
      .in("id", courseIds);

    for (const course of courses ?? []) {
      courseTitleById[course.id] = course.title;
    }
  }

  return rows.map((h) => {
    if (h.source_type !== "center_lesson") return h;
    const resolvedCourseId = h.course_id ?? lessonCourseById[h.source_id] ?? null;
    return {
      ...h,
      course_id: resolvedCourseId,
      course_title: resolvedCourseId ? courseTitleById[resolvedCourseId] ?? null : null,
      lesson_title: lessonTitleById[h.source_id] ?? null,
    };
  });
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get("source_type");
  const sourceId = searchParams.get("source_id");

  if (sourceType && !VALID_SOURCES.has(sourceType)) {
    return NextResponse.json({ error: "source_type invalide." }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("student_course_highlights")
    .select(HIGHLIGHT_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (sourceType && sourceId) {
    query = query.eq("source_type", sourceType).eq("source_id", sourceId);
  } else if (sourceType) {
    query = query.eq("source_type", sourceType);
  }

  const { data, error } = await query;
  if (error) {
    console.error("course-highlights GET:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const rows = (data ?? []) as HighlightRow[];
  const highlights = await enrichCenterMeta(rows);

  return NextResponse.json({ highlights });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const body = await req.json();
  const sourceType = body.source_type;
  const sourceId = String(body.source_id || "");
  const selectedText = String(body.selected_text || "").trim().slice(0, 2000);
  const colorKey = body.color_key;
  const note = body.note ? String(body.note).trim().slice(0, 500) : null;
  const anchor = body.anchor && typeof body.anchor === "object" ? body.anchor : {};
  let courseId =
    sourceType === "center_lesson" && body.course_id ? String(body.course_id) : null;

  if (!VALID_SOURCES.has(sourceType) || !sourceId || !selectedText || !VALID_COLORS.has(colorKey)) {
    return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
  }

  if (sourceType === "center_lesson" && !courseId) {
    const { data: lesson } = await supabaseAdmin
      .from("course_lessons")
      .select("course_id")
      .eq("id", sourceId)
      .maybeSingle();
    courseId = lesson?.course_id ?? null;
  }

  if (sourceType === "center_lesson" && !courseId) {
    return NextResponse.json({ error: "course_id requis pour les lecons centre." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("student_course_highlights")
    .insert({
      user_id: user.id,
      source_type: sourceType,
      source_id: sourceId,
      course_id: courseId,
      selected_text: selectedText,
      note,
      color_key: colorKey,
      anchor,
    })
    .select(HIGHLIGHT_SELECT)
    .single();

  if (error) {
    console.error("course-highlights POST:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  return NextResponse.json({ highlight: data });
}
