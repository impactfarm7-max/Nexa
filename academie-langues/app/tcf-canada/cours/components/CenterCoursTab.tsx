"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Lock, ChevronRight, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { loadStudentAccess, peekStudentAccess } from "@/app/utils/student-access-cache";
import { useI18n } from "@/app/i18n/I18nProvider";
import LessonReader from "./LessonReader";

type CourseSummary = {
  id: string;
  title: string;
  description: string | null;
  discipline: string | null;
  lesson_count: number;
  updated_at: string;
};

type LessonRow = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  position: number;
  unlock_at: string | null;
  locked: boolean;
  media: Array<{ id: string; type: string; url: string; label: string | null }>;
};

type Props = {
  initialCourseId?: string | null;
  initialLessonId?: string | null;
  scrollToHighlightId?: string | null;
  onScrollToHighlightDone?: () => void;
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

const CONTENT_WIDTH = "max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto";

export default function CenterCoursTab({
  initialCourseId,
  initialLessonId,
  scrollToHighlightId,
  onScrollToHighlightDone,
}: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const [loading, setLoading] = useState(true);
  const [hasCenter, setHasCenter] = useState(true);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(initialCourseId ?? null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDownloadable, setCourseDownloadable] = useState(true);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [emptyHint, setEmptyHint] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(
    () => peekStudentAccess()?.centerName ?? null,
  );

  useEffect(() => {
    if (orgName) return;
    void loadStudentAccess().then((access) => {
      if (access?.centerName) setOrgName(access.centerName);
    });
  }, [orgName]);

  const loadCourses = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const res = await fetch("/api/student/courses", { headers });
      const json = await res.json();
      if (res.ok) {
        setHasCenter(json.hasCenter !== false);
        setCourses(json.courses ?? []);
        setEmptyHint(json.empty_hint ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCourseDetail = useCallback(async (courseId: string, openLessonId?: string) => {
    const headers = await authHeaders();
    if (!headers) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/student/courses/${courseId}`, { headers });
      const json = await res.json();
      if (res.ok) {
        setCourseTitle(json.course?.title ?? "");
        setCourseDownloadable(json.course?.downloadable !== false);
        const rows: LessonRow[] = json.lessons ?? [];
        setLessons(rows);
        setActiveCourseId(courseId);
        if (openLessonId && rows.some((l) => l.id === openLessonId)) {
          setActiveLessonId(openLessonId);
        } else {
          setActiveLessonId(null);
        }
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialCourseId) {
        await loadCourseDetail(initialCourseId, initialLessonId ?? undefined);
        return;
      }
      // Deep link Notes → leçon sans course_id : résoudre puis ouvrir
      if (!initialLessonId) return;
      const headers = await authHeaders();
      if (!headers || cancelled) return;
      const res = await fetch(
        `/api/student/course-highlights/resolve?lesson_id=${encodeURIComponent(initialLessonId)}`,
        { headers },
      );
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (json.course_id) {
        await loadCourseDetail(json.course_id, initialLessonId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCourseId, initialLessonId, loadCourseDetail]);

  useEffect(() => {
    if (!initialLessonId || !lessons.length || activeLessonId === initialLessonId) return;
    if (lessons.some((l) => l.id === initialLessonId)) {
      setActiveLessonId(initialLessonId);
    }
  }, [initialLessonId, lessons, activeLessonId]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId);

  if (loading) {
    return (
      <div className="flex justify-center py-16 xl:py-24">
        <Loader2 className="w-6 h-6 xl:w-8 xl:h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (!hasCenter) {
    return (
      <div className={`${CONTENT_WIDTH} text-center py-10 sm:py-12 px-5 sm:px-6 bg-white border border-orange-200 rounded-xl xl:rounded-2xl`}>
        <Building2 className="w-10 h-10 xl:w-12 xl:h-12 text-orange-300 mx-auto mb-3" />
        <h2 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>{t("dashboard", "coursesNoCenterTitle")}</h2>
        <p className="text-sm xl:text-base text-slate-500">
          {t("dashboard", "coursesNoCenterBody")}
        </p>
      </div>
    );
  }

  if (activeLesson && !activeLesson.locked) {
    return (
      <LessonReader
        key={`${activeLesson.id}-${scrollToHighlightId ?? ""}`}
        sourceType="center_lesson"
        sourceId={activeLesson.id}
        courseId={activeCourseId}
        title={activeLesson.title}
        subtitle={activeLesson.subtitle}
        htmlContent={activeLesson.body || ""}
        media={activeLesson.media}
        downloadable={courseDownloadable}
        orgName={orgName}
        onClose={() => setActiveLessonId(null)}
        scrollToHighlightId={scrollToHighlightId}
        onScrollToHighlightDone={onScrollToHighlightDone}
      />
    );
  }

  if (activeCourseId) {
    return (
      <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className={CONTENT_WIDTH}>
        <button
          onClick={() => {
            setActiveCourseId(null);
            setLessons([]);
            setActiveLessonId(null);
          }}
          className="mb-4 text-xs xl:text-sm font-semibold text-orange-600 bg-white border border-orange-200 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors min-h-[40px]"
        >
          {t("dashboard", "coursesBack")}
        </button>

        {detailLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-white border border-orange-200 rounded-xl xl:rounded-2xl p-4 md:p-5 xl:p-6 mb-5">
              <span className="text-[10px] xl:text-xs font-semibold text-orange-500 block mb-1">{t("dashboard", "centerCourseLabel")}</span>
              <h2 className={STUDENT_TEXT.sectionTitle} style={{ color: BRAND.blue }}>{courseTitle}</h2>
            </div>

            <div className="space-y-2 xl:space-y-3">
              {lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  disabled={lesson.locked}
                  onClick={() => !lesson.locked && setActiveLessonId(lesson.id)}
                  className={`w-full flex items-center gap-3 p-3 xl:p-4 rounded-lg xl:rounded-xl border transition-all text-left min-h-[56px] ${
                    lesson.locked
                      ? "bg-white/60 border-orange-100 opacity-60 cursor-not-allowed"
                      : "bg-white border-orange-200 hover:border-orange-400"
                  }`}
                >
                  <div className={`w-8 h-8 xl:w-10 xl:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    lesson.locked ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"
                  }`}>
                    {lesson.locked ? <Lock className="w-4 h-4 xl:w-5 xl:h-5" /> : <BookOpen className="w-4 h-4 xl:w-5 xl:h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] xl:text-xs font-semibold text-orange-500 block mb-0.5">
                      {t("dashboard", "coursesLessonN", { n: String(index + 1).padStart(2, "0") })}
                    </span>
                    <h3 className={`${STUDENT_TEXT.cardTitle} truncate`} style={{ color: BRAND.blue }}>{lesson.title}</h3>
                    {lesson.locked && lesson.unlock_at && (
                      <p className="text-[10px] xl:text-xs text-slate-400 mt-0.5">
                        {t("dashboard", "coursesAvailableOn", { date: new Date(lesson.unlock_at).toLocaleDateString(dateLocale) })}
                      </p>
                    )}
                  </div>
                  {!lesson.locked && <ChevronRight className="w-4 h-4 xl:w-5 xl:h-5 text-orange-300 shrink-0" />}
                </button>
              ))}
              {lessons.length === 0 && (
                <p className="text-center text-sm xl:text-base text-slate-400 py-6">{t("dashboard", "coursesNoLessons")}</p>
              )}
            </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={CONTENT_WIDTH}>
      <div className="mb-5 xl:mb-7">
        <h2 className={`${STUDENT_TEXT.sectionTitle} mb-1`} style={{ color: BRAND.blue }}>{t("dashboard", "coursesCenterTitle")}</h2>
        <p className="text-slate-500 text-sm xl:text-base">{t("dashboard", "coursesCenterHint")}</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white border border-orange-200 rounded-xl xl:rounded-2xl p-8 xl:p-10 text-center">
          <BookOpen className="w-8 h-8 xl:w-10 xl:h-10 text-orange-200 mx-auto mb-2" />
          <p className="text-sm xl:text-base text-slate-500">
            {emptyHint === "no_class"
              ? t("dashboard", "coursesEmptyNoClass")
              : emptyHint === "no_match"
                ? t("dashboard", "coursesEmptyNoMatch")
                : t("dashboard", "coursesEmptyNone")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4 2xl:gap-5">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => void loadCourseDetail(course.id)}
              className="text-left bg-white border border-orange-200 rounded-xl xl:rounded-2xl p-4 xl:p-5 2xl:p-6 hover:border-orange-400 transition-colors group min-h-[120px]"
            >
              {course.discipline && (
                <span className="text-[10px] xl:text-xs font-semibold text-orange-500 block mb-1">
                  {course.discipline}
                </span>
              )}
              <h3 className="text-base xl:text-lg 2xl:text-xl font-display font-black tracking-tight group-hover:opacity-90 mb-1" style={{ color: BRAND.blue }}>{course.title}</h3>
              {course.description && (
                <p className="text-xs xl:text-sm text-slate-500 line-clamp-2 mb-2">{course.description}</p>
              )}
              <span className="text-[10px] xl:text-xs font-semibold text-orange-600">
                {t("dashboard", "coursesLessonCount", { count: course.lesson_count })}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

