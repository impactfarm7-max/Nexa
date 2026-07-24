"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { sanitizeLessonHtml } from "@/app/utils/sanitizeLessonHtml";
import {
  applyHighlightsToContainer,
  buildAnchorFromSelection,
  scrollToHighlight,
  unwrapPendingMark,
  wrapRangeAsPending,
} from "@/app/utils/highlightAnchor";
import { DEFAULT_HIGHLIGHT_THEMES, themeMapByKey, type HighlightSourceType } from "@/app/utils/highlightConstants";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import type { HighlightTheme } from "./CoursNotesPanel";
import { downloadLessonAttachment, downloadLessonContentPdf } from "@/app/utils/downloadLessonPack";

export type CourseHighlight = {
  id: string;
  source_type: string;
  source_id: string;
  course_id?: string | null;
  course_title?: string | null;
  lesson_title?: string | null;
  selected_text: string;
  note: string | null;
  color_key: string;
  anchor: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type LessonMedia = {
  id: string;
  type: string;
  url: string;
  label: string | null;
};

type Props = {
  sourceType: HighlightSourceType;
  sourceId: string;
  title: string;
  subtitle?: string | null;
  htmlContent: string;
  onClose: () => void;
  footer?: React.ReactNode;
  media?: LessonMedia[];
  downloadable?: boolean;
  scrollToHighlightId?: string | null;
  onScrollToHighlightDone?: () => void;
  courseId?: string | null;
  /** Nom du centre / entreprise pour le PDF */
  orgName?: string | null;
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
}

export default function LessonReader({
  sourceType,
  sourceId,
  title,
  subtitle,
  htmlContent,
  onClose,
  footer,
  media,
  downloadable = true,
  scrollToHighlightId,
  onScrollToHighlightDone,
  courseId,
  orgName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingMarkRef = useRef<HTMLElement | null>(null);
  const [highlights, setHighlights] = useState<CourseHighlight[]>([]);
  const [themes, setThemes] = useState<HighlightTheme[]>(DEFAULT_HIGHLIGHT_THEMES);
  const [popover, setPopover] = useState<{ x: number; y: number; text: string; anchor: Record<string, unknown> } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [highlightError, setHighlightError] = useState("");

  const colorHex = themeMapByKey(themes);

  const loadData = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setLoading(true);
    try {
      const [hRes, tRes] = await Promise.all([
        fetch(`/api/student/course-highlights?source_type=${sourceType}&source_id=${encodeURIComponent(sourceId)}`, { headers }),
        fetch("/api/student/highlight-themes", { headers }),
      ]);
      const hJson = await hRes.json();
      const tJson = await tRes.json();
      if (hRes.ok) setHighlights(hJson.highlights ?? []);
      if (tRes.ok) setThemes(tJson.themes ?? DEFAULT_HIGHLIGHT_THEMES);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sanitized = sanitizeLessonHtml(htmlContent);

  const clearPendingHighlight = useCallback(() => {
    unwrapPendingMark(pendingMarkRef.current);
    pendingMarkRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || loading || popover) return;
    applyHighlightsToContainer(
      el,
      highlights.map((h) => ({
        id: h.id,
        selected_text: h.selected_text,
        color_key: h.color_key,
        anchor: h.anchor as Parameters<typeof applyHighlightsToContainer>[1][0]["anchor"],
        hex_color: colorHex[h.color_key]?.hex_color,
      })),
      Object.fromEntries(Object.entries(colorHex).map(([k, v]) => [k, v.hex_color]))
    );
  }, [sanitized, highlights, loading, colorHex, popover]);

  useEffect(() => {
    if (!scrollToHighlightId || !containerRef.current || loading) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tryScroll = () => {
      if (!containerRef.current) return;
      const ok = scrollToHighlight(containerRef.current, scrollToHighlightId);
      if (ok) {
        onScrollToHighlightDone?.();
      } else if (attempts < 12) {
        attempts += 1;
        timer = setTimeout(tryScroll, 80);
      }
    };

    tryScroll();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [scrollToHighlightId, highlights, loading, onScrollToHighlightDone]);

  useEffect(() => {
    if (!popover) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPopover(null);
        clearPendingHighlight();
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (target instanceof Element && target.closest("[data-highlight-popover]")) return;
      setPopover(null);
      clearPendingHighlight();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [popover, clearPendingHighlight]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setPopover(null);
      return;
    }
    const anchor = buildAnchorFromSelection(containerRef.current, range);
    const text = sel.toString().trim();
    if (!anchor || !text) {
      setPopover(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setNoteDraft("");
    const pendingMark = wrapRangeAsPending(range.cloneRange());
    pendingMarkRef.current = pendingMark;
    sel.removeAllRanges();

    setPopover({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      text,
      anchor: anchor as unknown as Record<string, unknown>,
    });
  };

  const createHighlight = async (colorKey: string) => {
    if (!popover) return;
    const headers = await authHeaders();
    if (!headers) return;
    setHighlightError("");
    const res = await fetch("/api/student/course-highlights", {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_type: sourceType,
        source_id: sourceId,
        ...(sourceType === "center_lesson" ? { course_id: courseId || undefined } : {}),
        selected_text: popover.text,
        color_key: colorKey,
        note: noteDraft.trim() || null,
        anchor: popover.anchor,
      }),
    });
    const json = await res.json();
    if (res.ok && json.highlight) {
      clearPendingHighlight();
      setHighlights((prev) => [...prev, json.highlight]);
      setPopover(null);
      window.getSelection()?.removeAllRanges();
      return;
    }
    setHighlightError(json.error || "Impossible d'enregistrer le surlignage.");
  };

  const handleDownloadContent = async () => {
    if (!downloadable || downloading) return;
    setDownloading(true);
    setDownloadError("");
    const result = await downloadLessonContentPdf({ title, subtitle, htmlContent, orgName });
    if (!result.ok) setDownloadError(result.error || "Échec du téléchargement.");
    setDownloading(false);
  };

  const handleDownloadAttachment = async (m: LessonMedia) => {
    if (!downloadable || downloadingMediaId) return;
    setDownloadingMediaId(m.id);
    setDownloadError("");
    const result = await downloadLessonAttachment({
      mediaId: m.id,
      label: m.label,
      type: m.type,
    });
    if (!result.ok) setDownloadError(result.error || "Échec du téléchargement.");
    setDownloadingMediaId(null);
  };

  return (
    <div className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
      <div className="flex flex-nowrap items-center justify-end gap-2 mb-4">
        {downloadable && (
          <button
            type="button"
            onClick={() => void handleDownloadContent()}
            disabled={downloading}
            className="text-xs xl:text-sm font-semibold text-white px-3 py-2 rounded-lg transition-opacity flex items-center gap-1.5 shrink-0 min-h-[40px] disabled:opacity-60"
            style={{ backgroundColor: BRAND.orange }}
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloading ? "Préparation…" : "Télécharger le contenu"}
          </button>
        )}
        <button
          onClick={onClose}
          className="text-xs xl:text-sm font-semibold text-orange-600 bg-white border border-orange-200 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1.5 shrink-0 min-h-[40px]"
        >
          <X className="w-3.5 h-3.5" /> Fermer
        </button>
      </div>
      {downloadError && (
        <p className="text-xs font-bold text-red-500 mb-3 text-right">{downloadError}</p>
      )}
      {highlightError && (
        <p className="text-xs font-bold text-red-500 mb-3 text-right">{highlightError}</p>
      )}

      <article className="bg-white p-4 sm:p-5 md:p-7 xl:p-8 2xl:p-10 rounded-xl xl:rounded-2xl border border-orange-200 relative overflow-x-auto">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-orange-400 rounded-t-xl" />
          {subtitle && (
            <p className="text-[10px] xl:text-xs font-semibold text-orange-500 mb-1">{subtitle}</p>
          )}
          <h2 className={`${STUDENT_TEXT.sectionTitle} mb-4 sm:mb-5 leading-snug`} style={{ color: BRAND.blue }}>{title}</h2>
          {sourceType === "center_lesson" && (
            <p className="text-[11px] text-slate-500 mb-3">
              Sélectionnez du texte pour surligner — vos notes apparaîtront dans l’onglet Notes.
            </p>
          )}
          <div
            ref={containerRef}
            onMouseUp={handleMouseUp}
            onTouchEnd={() => {
              window.setTimeout(() => handleMouseUp(), 10);
            }}
            className="prose prose-sm sm:prose-base md:prose-lg xl:prose-xl max-w-none marker:text-orange-500 [&_::selection]:bg-slate-200/80 break-words"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />

          {media && media.length > 0 && (
            <div className="mt-8 pt-5 border-t border-orange-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-display font-black uppercase tracking-wider" style={{ color: BRAND.blue }}>Ressources</h3>
                {!downloadable && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Lecture seule</span>
                )}
              </div>
              {media.map((m) => {
                const canDownloadFile = downloadable && m.type !== "video_link";
                const isBusy = downloadingMediaId === m.id;
                return (
                  <div key={m.id} className="rounded-lg border border-orange-200 p-3 bg-orange-50/40 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {m.type === "video_link" && (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-orange-600 hover:underline">
                          {m.label || "Voir la vidéo"}
                        </a>
                      )}
                      {m.type === "pdf" && (
                        <a href={`/document/${m.id}`} className="text-sm font-bold text-orange-600 hover:underline truncate block">
                          {m.label || "Ouvrir le PDF"}
                        </a>
                      )}
                      {m.type === "video_upload" && (
                        <a href={`/document/${m.id}`} className="text-sm font-bold text-orange-600 hover:underline truncate block">
                          {m.label || "Voir la vidéo"}
                        </a>
                      )}
                      {m.type !== "video_link" && m.type !== "pdf" && m.type !== "video_upload" && (
                        <a href={`/document/${m.id}`} className="text-sm font-bold text-orange-600 hover:underline truncate block">
                          {m.label || "Ouvrir"}
                        </a>
                      )}
                    </div>
                    {canDownloadFile && (
                      <button
                        type="button"
                        onClick={() => void handleDownloadAttachment(m)}
                        disabled={!!downloadingMediaId}
                        className="shrink-0 flex items-center gap-1 h-9 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
                        style={{ backgroundColor: BRAND.blue }}
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Télécharger
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {footer && <div className="mt-8 pt-5 border-t border-orange-100">{footer}</div>}
      </article>

      {popover && (
        <>
          {/* Mobile : bottom sheet */}
          <div
            className="md:hidden fixed inset-0 z-[100] bg-black/35"
            onClick={() => {
              setPopover(null);
              clearPendingHighlight();
            }}
          />
          <div
            data-highlight-popover
            className="md:hidden fixed inset-x-0 bottom-0 z-[101] bg-white border-t border-orange-200 rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl max-h-[70vh] overflow-y-auto"
            onMouseDown={(e) => e.preventDefault()}
          >
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Surligner</p>
            <p className="text-xs text-slate-500 line-clamp-3 mb-2 italic">&ldquo;{popover.text}&rdquo;</p>
            <p className="text-[10px] text-orange-600 mb-3">Choisissez une couleur pour confirmer.</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {themes.map((t) => (
                <button
                  key={t.color_key}
                  type="button"
                  title={t.label}
                  onClick={() => void createHighlight(t.color_key)}
                  className="flex flex-col items-center gap-1 min-h-[44px]"
                >
                  <span
                    className="w-9 h-9 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: t.hex_color }}
                  />
                  <span className="text-[8px] font-bold text-slate-500 truncate w-full text-center">{t.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Note optionnelle..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              className="w-full text-sm border border-orange-100 rounded-lg px-3 py-2.5 outline-none focus:border-orange-400"
            />
          </div>

          {/* Desktop : popover flottant */}
          <div
            data-highlight-popover
            className="hidden md:block fixed z-[100] -translate-x-1/2 -translate-y-full"
            style={{ left: popover.x, top: popover.y }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="bg-white border border-orange-200 shadow-md rounded-xl p-3 w-72 xl:w-80">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Surligner</p>
              <p className="text-[10px] xl:text-xs text-slate-500 line-clamp-2 mb-2 italic">&ldquo;{popover.text}&rdquo;</p>
              <p className="text-[9px] text-orange-600 mb-2">Choisissez une couleur pour confirmer le surlignage.</p>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {themes.map((t) => (
                  <button
                    key={t.color_key}
                    type="button"
                    title={t.label}
                    onClick={() => void createHighlight(t.color_key)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-sm group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: t.hex_color }}
                    />
                    <span className="text-[8px] font-bold text-slate-500 truncate w-full text-center leading-tight">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Note optionnelle..."
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                className="w-full text-xs border border-orange-100 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
