"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, GraduationCap, Highlighter } from "lucide-react";
import NexaCoursTab from "./components/NexaCoursTab";
import CenterCoursTab from "./components/CenterCoursTab";
import CoursNotesTab from "./components/CoursNotesTab";
import type { CourseHighlight } from "./components/LessonReader";
import { loadStudentAccess, peekStudentAccess } from "@/app/utils/student-access-cache";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

type MainTab = "nexa" | "centre" | "notes";

function resolveMainTab(tabParam: string | null, isPluriannual: boolean): MainTab {
  if (tabParam === "centre") return "centre";
  if (tabParam === "notes") return "notes";
  if (isPluriannual) return "centre";
  if (tabParam === "nexa") return "nexa";
  return "nexa";
}

function CoursPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const courseParam = searchParams.get("course");
  const lessonParam = searchParams.get("lesson");
  const highlightParam = searchParams.get("highlight");
  const { isPluriannual, loading: centerLoading } = useStudentCenterContext();

  const [mainTab, setMainTab] = useState<MainTab>(() =>
    resolveMainTab(tabParam, false),
  );
  const [centerName, setCenterName] = useState<string | null>(
    () => peekStudentAccess()?.centerName ?? null,
  );

  useEffect(() => {
    if (centerLoading) return;
    setMainTab(resolveMainTab(tabParam, isPluriannual));
  }, [tabParam, isPluriannual, centerLoading]);

  useEffect(() => {
    if (centerLoading || !isPluriannual) return;
    if (tabParam === "nexa" || !tabParam) {
      router.replace("/tcf-canada/cours?tab=centre", { scroll: false });
    }
  }, [centerLoading, isPluriannual, tabParam, router]);

  useEffect(() => {
    const cached = peekStudentAccess();
    if (cached?.centerName) {
      setCenterName(cached.centerName);
      return;
    }
    void loadStudentAccess().then((access) => {
      if (access?.centerName) setCenterName(access.centerName);
    });
  }, []);

  const setTab = (tab: MainTab) => {
    if (isPluriannual && tab === "nexa") return;
    setMainTab(tab);
    const url =
      tab === "centre"
        ? "/tcf-canada/cours?tab=centre"
        : tab === "notes"
          ? "/tcf-canada/cours?tab=notes"
          : "/tcf-canada/cours";
    router.replace(url, { scroll: false });
  };

  const clearHighlightParam = useCallback(() => {
    if (!highlightParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("highlight");
    router.replace(`/tcf-canada/cours?${params.toString()}`, { scroll: false });
  }, [highlightParam, router, searchParams]);

  const handleNavigateFromNotes = (highlight: CourseHighlight, courseId?: string) => {
    const resolvedCourseId = courseId ?? highlight.course_id ?? undefined;

    if (highlight.source_type === "nexa_module") {
      if (isPluriannual) return;
      setMainTab("nexa");
      router.replace(
        `/tcf-canada/cours?tab=nexa&lesson=${highlight.source_id}&highlight=${highlight.id}`,
        { scroll: false },
      );
      return;
    }

    // center_lesson → toujours ouvrir Cours académie
    setMainTab("centre");
    const params = new URLSearchParams();
    params.set("tab", "centre");
    if (resolvedCourseId) params.set("course", resolvedCourseId);
    params.set("lesson", highlight.source_id);
    params.set("highlight", highlight.id);
    router.replace(`/tcf-canada/cours?${params.toString()}`, { scroll: false });
  };

  const centerTabLabel = centerName ? `Cours ${centerName}` : "Cours académie";

  const tabs = useMemo(() => {
    const all = [
      { id: "nexa" as const, label: "Cours TCF", shortLabel: "TCF", icon: BookOpen },
      { id: "centre" as const, label: centerTabLabel, shortLabel: "Centre", icon: GraduationCap },
      { id: "notes" as const, label: "Notes", shortLabel: "Notes", icon: Highlighter },
    ];
    return isPluriannual ? all.filter((t) => t.id !== "nexa") : all;
  }, [centerTabLabel, isPluriannual]);

  const gridClass =
    tabs.length === 2
      ? "grid grid-cols-2 gap-1.5 sm:flex sm:flex-nowrap sm:items-center sm:gap-2 mt-3"
      : "grid grid-cols-3 gap-1.5 sm:flex sm:flex-nowrap sm:items-center sm:gap-2 mt-3";

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans selection:bg-orange-500/30 overflow-x-hidden pb-24 md:pb-10">
      <nav className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 py-2.5 md:py-3">
        <div className="nexa-student-shell">
          <span className={`${STUDENT_TEXT.pageTitle} block truncate`} style={{ color: BRAND.blue }}>
            Mes cours
          </span>
        </div>

        <div className={`nexa-student-shell ${gridClass}`}>
          {tabs.map(({ id, label, shortLabel, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              title={label}
              className={`min-h-[44px] sm:shrink-0 px-2 sm:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-1.5 sm:max-w-[min(100%,280px)] ${
                mainTab === id ? STUDENT_TEXT.tabActive : STUDENT_TEXT.tab
              } ${
                mainTab === id
                  ? "bg-orange-500 text-white border border-orange-500 shadow-sm shadow-orange-500/20"
                  : "bg-white border border-orange-200 hover:border-orange-300 hover:bg-orange-50/50"
              }`}
              style={mainTab === id ? undefined : { color: BRAND.blue }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate hidden min-[400px]:inline sm:inline">{label}</span>
              <span className="truncate min-[400px]:hidden sm:hidden">{shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="nexa-student-shell pt-5 pb-8 xl:pt-7 2xl:pt-8">
        {mainTab === "nexa" && !isPluriannual && (
          <NexaCoursTab
            initialLessonId={lessonParam}
            scrollToHighlightId={highlightParam}
            onScrollToHighlightDone={clearHighlightParam}
          />
        )}
        {mainTab === "centre" && (
          <CenterCoursTab
            initialCourseId={courseParam}
            initialLessonId={lessonParam}
            scrollToHighlightId={highlightParam}
            onScrollToHighlightDone={clearHighlightParam}
          />
        )}
        {mainTab === "notes" && <CoursNotesTab onNavigateToHighlight={handleNavigateFromNotes} />}
      </div>
    </div>
  );
}

export default function CoursPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center text-sm font-display font-semibold" style={{ color: BRAND.orange }}>
          Chargement...
        </div>
      }
    >
      <CoursPageContent />
    </Suspense>
  );
}
