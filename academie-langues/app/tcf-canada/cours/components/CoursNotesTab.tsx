"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CoursNotesPanel from "./CoursNotesPanel";
import type { CourseHighlight } from "./LessonReader";
import { DEFAULT_HIGHLIGHT_THEMES } from "@/app/utils/highlightConstants";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import type { HighlightTheme } from "./CoursNotesPanel";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";

type Props = {
  onNavigateToHighlight: (highlight: CourseHighlight, courseId?: string) => void;
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

async function resolveCourseId(highlight: CourseHighlight): Promise<string | undefined> {
  if (highlight.course_id) return highlight.course_id;
  if (highlight.source_type !== "center_lesson") return undefined;

  const headers = await authHeaders();
  if (!headers) return undefined;

  const res = await fetch(
    `/api/student/course-highlights/resolve?lesson_id=${encodeURIComponent(highlight.source_id)}`,
    { headers },
  );
  if (!res.ok) return undefined;
  const json = await res.json();
  return json.course_id as string | undefined;
}

export default function CoursNotesTab({ onNavigateToHighlight }: Props) {
  const { isPluriannual } = useStudentCenterContext();
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<CourseHighlight[]>([]);
  const [themes, setThemes] = useState<HighlightTheme[]>(DEFAULT_HIGHLIGHT_THEMES);

  const loadData = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const highlightsUrl = isPluriannual
        ? "/api/student/course-highlights?source_type=center_lesson"
        : "/api/student/course-highlights";
      const [hRes, tRes] = await Promise.all([
        fetch(highlightsUrl, { headers }),
        fetch("/api/student/highlight-themes", { headers }),
      ]);
      const hJson = await hRes.json();
      const tJson = await tRes.json();
      if (hRes.ok) setHighlights(hJson.highlights ?? []);
      if (tRes.ok) setThemes(tJson.themes ?? DEFAULT_HIGHLIGHT_THEMES);
    } finally {
      setLoading(false);
    }
  }, [isPluriannual]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleNavigate = async (highlight: CourseHighlight) => {
    if (highlight.source_type === "center_lesson") {
      const courseId = await resolveCourseId(highlight);
      onNavigateToHighlight(highlight, courseId);
      return;
    }
    if (isPluriannual) return;
    onNavigateToHighlight(highlight);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      <div className="mb-6 xl:mb-8">
        <h2 className={`${STUDENT_TEXT.sectionTitle} mb-1`} style={{ color: BRAND.blue }}>Mes notes</h2>
        <p className="text-slate-500 text-sm xl:text-base">
          {isPluriannual
            ? "Surlignages issus des cours de votre centre — ouvrez un passage pour y revenir."
            : "Tous vos surlignages et annotations, regroupés par thème couleur."}
        </p>
      </div>
      <CoursNotesPanel
        variant="page"
        highlights={highlights}
        themes={themes}
        groupByCourse={isPluriannual}
        emptyHint={
          isPluriannual
            ? "Ouvrez un cours académie, sélectionnez du texte dans une leçon pour surligner. Les notes apparaîtront ici automatiquement."
            : undefined
        }
        onThemesChange={setThemes}
        onNavigate={handleNavigate}
        onUpdateHighlight={(updated) =>
          setHighlights((prev) => prev.map((h) => (h.id === updated.id ? { ...h, ...updated } : h)))
        }
        onDeleteHighlight={(id) => setHighlights((prev) => prev.filter((h) => h.id !== id))}
      />
    </motion.div>
  );
}
