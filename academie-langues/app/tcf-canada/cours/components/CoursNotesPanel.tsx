"use client";

import { useMemo, useState } from "react";
import { Trash2, ChevronRight, Palette } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import type { CourseHighlight } from "./LessonReader";

import type { HighlightColorKey } from "@/app/utils/highlightConstants";
import {
  DEFAULT_HIGHLIGHT_THEMES,
  HIGHLIGHT_THEME_I18N_KEYS,
  displayHighlightThemeLabel,
} from "@/app/utils/highlightConstants";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

export type HighlightTheme = { color_key: HighlightColorKey; hex_color: string; label: string };

type ColorFilter = HighlightColorKey | "all";

type Props = {
  highlights: CourseHighlight[];
  themes: HighlightTheme[];
  onThemesChange: (themes: HighlightTheme[]) => void;
  onNavigate: (highlight: CourseHighlight) => void;
  onUpdateHighlight: (highlight: CourseHighlight) => void;
  onDeleteHighlight: (id: string) => void;
  variant?: "sidebar" | "page";
  /** Regroupe les notes centre par cours (utile pour les cursus pluri / académie). */
  groupByCourse?: boolean;
  emptyHint?: string;
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

function HighlightCard({
  h,
  onNavigate,
  onUpdateNote,
  onDelete,
  showCourseMeta,
}: {
  h: CourseHighlight;
  onNavigate: () => void;
  onUpdateNote: (note: string) => void;
  onDelete: () => void;
  showCourseMeta: boolean;
}) {
  const { t } = useI18n();
  return (
    <li className="group rounded-lg border border-orange-200 p-2.5 hover:border-orange-400 transition-colors bg-white">
      {showCourseMeta && (h.course_title || h.lesson_title) && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 truncate">
          {[h.course_title, h.lesson_title].filter(Boolean).join(" · ")}
        </p>
      )}
      <button type="button" onClick={onNavigate} className="w-full text-left">
        <p className="text-xs xl:text-sm font-display font-semibold line-clamp-2 mb-1" style={{ color: BRAND.blue }}>
          &ldquo;{h.selected_text}&rdquo;
        </p>
        <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest flex items-center gap-1">
          {t("dashboard", "notesGoToPassage")} <ChevronRight className="w-3 h-3" />
        </span>
      </button>
      <input
        type="text"
        defaultValue={h.note ?? ""}
        placeholder={t("dashboard", "notesAddPlaceholder")}
        onBlur={(e) => {
          if (e.target.value !== (h.note ?? "")) onUpdateNote(e.target.value);
        }}
        className="mt-2 w-full text-[11px] border border-transparent focus:border-orange-200 rounded px-1 py-0.5 outline-none bg-transparent"
      />
      <button
        type="button"
        onClick={onDelete}
        className="mt-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
        aria-label={t("dashboard", "notesDelete")}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

export default function CoursNotesPanel({
  highlights,
  themes,
  onThemesChange,
  onNavigate,
  onUpdateHighlight,
  onDeleteHighlight,
  variant = "sidebar",
  groupByCourse = false,
  emptyHint,
}: Props) {
  const { t } = useI18n();
  const [editingThemes, setEditingThemes] = useState(false);
  const [themeDrafts, setThemeDrafts] = useState(themes);
  const [savingThemes, setSavingThemes] = useState(false);
  const [colorFilter, setColorFilter] = useState<ColorFilter>("all");

  const themeByKey = Object.fromEntries(themes.map((t) => [t.color_key, t]));

  const visibleHighlights =
    colorFilter === "all" ? highlights : highlights.filter((h) => h.color_key === colorFilter);

  const saveThemes = async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setSavingThemes(true);
    try {
      const themesToSave = themeDrafts.map((theme) => {
        const key = theme.color_key as HighlightColorKey;
        const def = DEFAULT_HIGHLIGHT_THEMES.find((d) => d.color_key === key);
        const i18nKey = HIGHLIGHT_THEME_I18N_KEYS[key];
        const localized = i18nKey ? t("dashboard", i18nKey) : "";
        const label = theme.label.trim();
        const canonical =
          !label || (def && (label === def.label || label === localized))
            ? (def?.label || label)
            : label;
        return { ...theme, label: canonical };
      });
      const res = await fetch("/api/student/highlight-themes", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ themes: themesToSave }),
      });
      const json = await res.json();
      if (res.ok) {
        onThemesChange(json.themes ?? themesToSave);
        setEditingThemes(false);
      }
    } finally {
      setSavingThemes(false);
    }
  };

  const updateNote = async (h: CourseHighlight, note: string) => {
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch(`/api/student/course-highlights/${h.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ note: note || null }),
    });
    const json = await res.json();
    if (res.ok && json.highlight) onUpdateHighlight(json.highlight);
  };

  const deleteHighlight = async (id: string) => {
    const headers = await authHeaders();
    if (!headers) return;
    const res = await fetch(`/api/student/course-highlights/${id}`, { method: "DELETE", headers });
    if (res.ok) onDeleteHighlight(id);
  };

  const groupedByTheme = themes
    .filter((t) => colorFilter === "all" || t.color_key === colorFilter)
    .map((t) => ({
      theme: t,
      items: visibleHighlights.filter((h) => h.color_key === t.color_key),
    }));

  const courseGroups = useMemo(() => {
    if (!groupByCourse) return [];
    const map = new Map<string, { key: string; title: string; items: CourseHighlight[] }>();
    for (const h of visibleHighlights) {
      const key = h.course_id || h.course_title || "autre";
      const title = h.course_title || t("dashboard", "centerCourseLabel");
      const existing = map.get(key);
      if (existing) existing.items.push(h);
      else map.set(key, { key, title, items: [h] });
    }
    return [...map.values()];
  }, [groupByCourse, visibleHighlights, t]);

  const shellClass =
    variant === "page"
      ? "w-full bg-white border border-orange-200 rounded-xl xl:rounded-2xl p-4 md:p-5 xl:p-6 2xl:p-8"
      : "w-full lg:w-80 xl:w-96 shrink-0 bg-white border border-orange-200 rounded-xl p-4 max-h-[70vh] overflow-y-auto";

  return (
    <aside className={shellClass}>
      <div className="flex items-start justify-between gap-3 mb-4 border-b border-orange-50 pb-3">
        <h3 className="text-sm xl:text-base 2xl:text-lg font-display font-black tracking-tight shrink-0" style={{ color: BRAND.blue }}>{t("dashboard", "notesTitle")}</h3>
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] text-slate-400 leading-snug text-right hidden sm:block">
            {t("dashboard", "notesRenameColors")}
          </p>
          <button
            type="button"
            onClick={() => {
              setThemeDrafts(
                themes.map((theme) => ({
                  ...theme,
                  label: displayHighlightThemeLabel(theme, t),
                })),
              );
              setEditingThemes((v) => !v);
            }}
            className="text-orange-600 hover:bg-orange-50 p-1.5 rounded-lg shrink-0"
            title={t("dashboard", "notesRenameColors")}
            aria-label={t("dashboard", "notesRenameColors")}
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editingThemes && (
        <div className="mb-4 p-3 bg-orange-50/50 rounded-xl border border-orange-100 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-600">{t("dashboard", "notesMyThemes")}</p>
          <p className="text-[11px] text-slate-500">
            {t("dashboard", "notesThemesHint")}
          </p>
          {themeDrafts.map((t, i) => (
            <div key={t.color_key} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: t.hex_color }} />
              <input
                value={t.label}
                onChange={(e) => {
                  const next = [...themeDrafts];
                  next[i] = { ...t, label: e.target.value };
                  setThemeDrafts(next);
                }}
                className="flex-1 text-xs border border-orange-100 rounded px-2 py-1 outline-none focus:border-orange-400"
              />
            </div>
          ))}
          <button
            type="button"
            disabled={savingThemes}
            onClick={() => void saveThemes()}
            className="w-full text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white py-2 rounded-lg disabled:opacity-50"
          >
            {savingThemes ? "..." : t("dashboard", "notesSave")}
          </button>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            type="button"
            onClick={() => setColorFilter("all")}
            className={`text-[10px] xl:text-xs font-semibold px-2.5 xl:px-3 py-1 xl:py-1.5 rounded-lg border transition-colors ${
              colorFilter === "all"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-slate-600 border-orange-200 hover:border-orange-300"
            }`}
          >
            {t("dashboard", "notesAll")}
          </button>
          {themes.map((theme) => {
            const count = highlights.filter((h) => h.color_key === theme.color_key).length;
            if (count === 0) return null;
            return (
              <button
                key={theme.color_key}
                type="button"
                onClick={() => setColorFilter(theme.color_key)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                  colorFilter === theme.color_key
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-slate-600 border-orange-200 hover:border-orange-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme.hex_color }} />
                <span className="truncate max-w-[120px]">{displayHighlightThemeLabel(theme, t)}</span>
                <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {highlights.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium">
          {emptyHint ?? t("dashboard", "notesEmptyDefault")}
        </p>
      ) : visibleHighlights.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium">{t("dashboard", "notesEmptyTheme")}</p>
      ) : groupByCourse ? (
        <div className="space-y-5">
          {courseGroups.map((group) => (
            <div key={group.key}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: BRAND.blue }}>
                {group.title}
              </p>
              <ul className="space-y-2">
                {group.items.map((h) => (
                  <HighlightCard
                    key={h.id}
                    h={h}
                    showCourseMeta
                    onNavigate={() => onNavigate(h)}
                    onUpdateNote={(note) => void updateNote(h, note)}
                    onDelete={() => void deleteHighlight(h.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByTheme.map(({ theme, items }) =>
            items.length === 0 ? null : (
              <div key={theme.color_key}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.hex_color }} />
                  {displayHighlightThemeLabel(themeByKey[theme.color_key] ?? theme, t)}
                </p>
                <ul className="space-y-2">
                  {items.map((h) => (
                    <HighlightCard
                      key={h.id}
                      h={h}
                      showCourseMeta={h.source_type === "center_lesson"}
                      onNavigate={() => onNavigate(h)}
                      onUpdateNote={(note) => void updateNote(h, note)}
                      onDelete={() => void deleteHighlight(h.id)}
                    />
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      )}
    </aside>
  );
}
