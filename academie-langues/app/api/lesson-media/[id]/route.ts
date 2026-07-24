import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthUser } from "@/app/utils/auth-server";
import { fetchCourseIfVisible, getStudentCourseContext } from "@/app/api/student/courses/studentCourseAccess";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

async function resolveUser(req: Request) {
  const fromBearer = await getAuthUser(req);
  if (fromBearer) return fromBearer;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function canAccessCourse(userId: string, courseId: string, centerId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return false;

  if (STAFF_ROLES.includes(profile.role) && profile.center_id === centerId) {
    return true;
  }

  const ctx = await getStudentCourseContext(userId);
  if (!ctx.centerId) return false;
  const course = await fetchCourseIfVisible(courseId, ctx.centerId, ctx.groupeIds);
  return !!course;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const metaOnly = url.searchParams.get("meta") === "1";

  const { data: media, error } = await supabaseAdmin
    .from("lesson_media")
    .select("id, type, url, label, lesson_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !media?.lesson_id) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const { data: lesson } = await supabaseAdmin
    .from("course_lessons")
    .select("course_id")
    .eq("id", media.lesson_id)
    .maybeSingle();

  if (!lesson?.course_id) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, center_id, downloadable")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (!course?.center_id) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const allowed = await canAccessCourse(user.id, course.id, course.center_id);
  if (!allowed) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const downloadable = course.downloadable !== false;
  const wantDownload = url.searchParams.get("download") === "1";

  if (metaOnly) {
    return NextResponse.json({
      id: media.id,
      type: media.type,
      label: media.label,
      downloadable,
    });
  }

  if (media.type === "video_link") {
    return NextResponse.json({ error: "Lien externe — ouvrir directement." }, { status: 400 });
  }

  if (wantDownload && !downloadable) {
    return NextResponse.json(
      { error: "Ce cours n'autorise pas le téléchargement." },
      { status: 403 }
    );
  }

  const upstream = await fetch(media.url);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Impossible de charger le fichier." }, { status: 502 });
  }

  const contentType =
    upstream.headers.get("content-type") ||
    (media.type === "pdf" ? "application/pdf" : "application/octet-stream");

  const filename = (media.label || "document").replace(/[^\w.\-À-ÿ ]+/g, "_");
  const buffer = await upstream.arrayBuffer();
  const disposition = wantDownload && downloadable
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
