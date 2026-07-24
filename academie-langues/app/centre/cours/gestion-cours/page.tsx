"use client";

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  Link2,
  FileText,
  Video,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  ScanLine,
  Clock,
  Download,
  Ban,
  HelpCircle,
  Check,
  Edit3,
  Users,
  FileUp,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import CenterContentSkeleton from "@/app/components/CenterContentSkeleton";
import {
  TCF_COURSE_DISCIPLINE_CODES,
  TCF_NEUTRAL_DISCIPLINE,
  TCF_TEACHING_SUBJECTS,
  isTcfCanadaCenter,
} from "@/app/data/tcf-teaching-subjects";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

const HIGHLIGHT_COLORS = [
  { color: "#FEF08A", label: "Jaune" },
  { color: "#BBF7D0", label: "Vert" },
  { color: "#BFDBFE", label: "Bleu" },
  { color: "#FBCFE8", label: "Rose" },
  { color: "#FED7AA", label: "Orange" },
] as const;

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"] as const;

// ============================================================================
// Extension Tiptap custom pour la taille de police -- aucune extension
// officielle ne couvre ce besoin, donc on étend TextStyle nous-mêmes.
// ============================================================================
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: any) => (attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).run(),
    } as any;
  },
});

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [fontSize, setFontSize] = useState("default");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontSize,
    ],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-black transition-colors ${active ? "text-white" : "text-neutral-500 hover:bg-neutral-100"}`;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50 flex-wrap">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive("bold"))} style={editor.isActive("bold") ? { backgroundColor: BLUE } : {}} title="Gras">G</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${btnCls(editor.isActive("italic"))} italic`} style={editor.isActive("italic") ? { backgroundColor: BLUE } : {}} title="Italique">I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${btnCls(editor.isActive("underline"))} underline`} style={editor.isActive("underline") ? { backgroundColor: BLUE } : {}} title="Souligner">S</button>
        <div className="w-px h-5 bg-neutral-200 mx-1" />
        <span className="text-[9px] font-black uppercase text-neutral-400 px-1">Surlign.</span>
        {HIGHLIGHT_COLORS.map((h) => (
          <button
            key={h.color}
            type="button"
            title={h.label}
            onClick={() => {
              editor.chain().focus().toggleHighlight({ color: h.color }).run();
            }}
            className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${editor.isActive("highlight", { color: h.color }) ? "border-slate-900 scale-110" : "border-transparent"}`}
            style={{ backgroundColor: h.color }}
          />
        ))}
        <div className="w-px h-5 bg-neutral-200 mx-1" />
        <select
          value={fontSize}
          onChange={(e) => {
            const v = e.target.value;
            setFontSize(v);
            if (v === "default") (editor.commands as any).unsetFontSize();
            else (editor.commands as any).setFontSize(`${v}px`);
          }}
          className="text-xs font-bold text-neutral-600 bg-transparent outline-none border border-neutral-200 rounded-lg px-2 py-1.5"
        >
          <option value="default">Taille (px)</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s} px</option>
          ))}
        </select>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}

// ============================================================================
// Types
// ============================================================================
type Discipline = { id: string; name: string; code?: string };
type GroupeOption = { id: string; nom: string };
type Course = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  discipline_id: string;
  disciplineName: string;
  lessonCount: number;
  downloadable: boolean;
  groupeIds: string[];
  groupeNames: string[];
};
type Lesson = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  position: number;
  unlock_at: string | null;
};
type Media = {
  id: string;
  type: "video_link" | "video_upload" | "pdf";
  url: string;
  label: string | null;
};
type QuizOptionDraft = { label: string; is_correct: boolean };
type QuizQuestionDraft = { question: string; options: QuizOptionDraft[] };
type Quiz = {
  id: string;
  title: string;
  questions: { id: string; question: string; options: { id: string; label: string; is_correct: boolean }[] }[];
};

const MAX_VIDEO_MB = 80;
const MAX_PDF_MB = 20;

function defaultQuestion(): QuizQuestionDraft {
  return { question: "", options: [{ label: "", is_correct: true }, { label: "", is_correct: false }] };
}

function isLocked(unlockAt: string | null) {
  return !!unlockAt && new Date(unlockAt).getTime() > Date.now();
}

const TCF_DISCIPLINE_ORDER: string[] = [
  ...TCF_TEACHING_SUBJECTS.map((s) => s.key),
  TCF_NEUTRAL_DISCIPLINE.code,
];

function sortTcfCourseDisciplines(rows: Discipline[]): Discipline[] {
  return [...rows].sort((a, b) => {
    const ai = TCF_DISCIPLINE_ORDER.indexOf(a.code ?? "");
    const bi = TCF_DISCIPLINE_ORDER.indexOf(b.code ?? "");
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CenterCoursPage() {
  const [shellLoading, setShellLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerType, setCenterType] = useState<string>("generic");
  const [userId, setUserId] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [downloadableDraft, setDownloadableDraft] = useState(true);
  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [selectedGroupeIds, setSelectedGroupeIds] = useState<string[]>([]);

  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<"lessons" | "quizzes">("lessons");

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [mediaByLesson, setMediaByLesson] = useState<Record<string, Media[]>>({});
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [lessonEditorId, setLessonEditorId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonSubtitle, setLessonSubtitle] = useState("");
  const [lessonBody, setLessonBody] = useState("");
  const [lessonUnlockAt, setLessonUnlockAt] = useState("");
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonError, setLessonError] = useState("");

  const [mediaType, setMediaType] = useState<"video_link" | "video_upload" | "pdf">("video_link");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaLabel, setMediaLabel] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [newQuizOpen, setNewQuizOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([defaultQuestion()]);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone: "danger" | "warning";
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const lessonEditorRef = useRef<HTMLDivElement | null>(null);
  const lessonTitleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!lessonEditorId) return;
    const frame = requestAnimationFrame(() => {
      lessonEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      lessonTitleRef.current?.focus();
      lessonTitleRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [lessonEditorId]);

  const askConfirm = (dialog: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: "danger" | "warning";
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmDialog({
      title: dialog.title,
      message: dialog.message,
      confirmLabel: dialog.confirmLabel || "Confirmer",
      tone: dialog.tone || "danger",
      onConfirm: dialog.onConfirm,
    });
  };

  const runConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const loadGroupes = useCallback(async (cId: string | null) => {
    if (!cId) { setGroupes([]); return; }
    const { data: filieres } = await supabase.from("filieres").select("id").eq("center_id", cId);
    const filiereIds = (filieres || []).map((f) => f.id);
    if (filiereIds.length === 0) { setGroupes([]); return; }
    const { data: grpRows } = await supabase
      .from("groupes")
      .select("id, nom")
      .in("filiere_id", filiereIds)
      .order("nom");
    setGroupes(grpRows || []);
  }, []);

  const loadCourses = useCallback(async (cId: string | null, cType: string) => {
    const isTcf = isTcfCanadaCenter(cType);

    if (isTcf) {
      const { data: discRows } = await supabase
        .from("exam_disciplines")
        .select("id, name, code")
        .in("code", [...TCF_COURSE_DISCIPLINE_CODES]);
      setDisciplines(sortTcfCourseDisciplines(discRows || []));
    } else {
      const { data: discRows } = await supabase
        .from("exam_disciplines")
        .select("id, name")
        .eq("is_builtin", false)
        .order("name");
      setDisciplines(discRows || []);
    }

    const { data: courseRows, error: courseErr } = await supabase
      .from("courses")
      .select("id, title, description, status, discipline_id, downloadable, exam_disciplines(name), course_lessons(id), course_groupes(groupe_id, groupes(nom))")
      .eq("center_id", cId || "");

    let rows: any[] | null = courseRows;
    if (courseErr) {
      const { data: fallbackRows } = await supabase
        .from("courses")
        .select("id, title, description, status, discipline_id, downloadable, exam_disciplines(name), course_lessons(id)")
        .eq("center_id", cId || "");
      rows = fallbackRows;
    }

    setCourses(
      (rows || []).map((c: any) => {
        const links = c.course_groupes || [];
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          status: c.status,
          discipline_id: c.discipline_id,
          disciplineName: c.exam_disciplines?.name || "—",
          lessonCount: (c.course_lessons || []).length,
          downloadable: c.downloadable,
          groupeIds: links.map((l: any) => l.groupe_id),
          groupeNames: links.map((l: any) => l.groupes?.nom).filter(Boolean),
        };
      })
    );
  }, []);

  useLayoutEffect(() => {
    const bootstrap = peekCenterBootstrap();
    if (!bootstrap) return;
    setUserId(bootstrap.userId);
    setCenterId(bootstrap.centerId);
    const centerTypeFromMe = (bootstrap.me.center as { center_type?: string } | undefined)?.center_type;
    setCenterType(centerTypeFromMe || "generic");
    setShellLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const bootstrap = await loadCenterBootstrap();
      if (!bootstrap) {
        setShellLoading(false);
        setDataLoading(false);
        return;
      }

      const cId = bootstrap.centerId;
      const cType = (bootstrap.me.center as { center_type?: string } | undefined)?.center_type || "generic";

      setUserId(bootstrap.userId);
      setCenterId(cId);
      setCenterType(cType);
      setShellLoading(false);

      setDataLoading(true);
      try {
        await Promise.all([loadCourses(cId, cType), loadGroupes(cId)]);
      } finally {
        setDataLoading(false);
      }
    };
    void init();
  }, [loadCourses, loadGroupes]);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setDisciplineId("");
    setDownloadableDraft(true);
    setSelectedGroupeIds([]);
    setErrorMsg("");
  };

  const toggleGroupeSelection = (groupeId: string) => {
    setSelectedGroupeIds((prev) =>
      prev.includes(groupeId) ? prev.filter((id) => id !== groupeId) : [...prev, groupeId]
    );
  };

  const createCourse = async () => {
    setErrorMsg("");
    if (!title.trim()) return setErrorMsg("Le titre du cours est requis.");
    if (!disciplineId) {
      return setErrorMsg(isTcfCanadaCenter(centerType) ? "Choisis une rubrique TCF." : "Choisis la matière concernée.");
    }
    if (!userId) return setErrorMsg("Session invalide.");

    setSaving(true);
    try {
      const { data: course, error } = await supabase.from("courses").insert({
        center_id: centerId,
        discipline_id: disciplineId,
        title: title.trim(),
        description: description.trim() || null,
        downloadable: downloadableDraft,
        created_by: userId,
      }).select("id").single();
      if (error || !course) throw new Error(error?.message || "Erreur lors de la création.");

      if (selectedGroupeIds.length > 0) {
        const { error: grpErr } = await supabase.from("course_groupes").insert(
          selectedGroupeIds.map((groupeId) => ({ course_id: course.id, groupe_id: groupeId }))
        );
        if (grpErr) throw new Error(grpErr.message);
      }

      await loadCourses(centerId, centerType);
      resetCreateForm();
      setCreateOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = (id: string) => {
    askConfirm({
      title: "Supprimer le cours",
      message: "Supprimer ce cours, ses leçons et ses quiz ? Cette action est irréversible.",
      confirmLabel: "Supprimer",
      tone: "danger",
      onConfirm: async () => {
        await supabase.from("courses").delete().eq("id", id);
        setCourses((prev) => prev.filter((c) => c.id !== id));
        if (activeCourse?.id === id) setActiveCourse(null);
      },
    });
  };

  const togglePublish = async (course: Course) => {
    const newStatus = course.status === "published" ? "draft" : "published";
    await supabase.from("courses").update({ status: newStatus }).eq("id", course.id);
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)));
    if (activeCourse?.id === course.id) setActiveCourse({ ...activeCourse, status: newStatus });
  };

  const toggleDownloadable = async (course: Course) => {
    const next = !course.downloadable;
    await supabase.from("courses").update({ downloadable: next }).eq("id", course.id);
    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, downloadable: next } : c)));
    if (activeCourse?.id === course.id) setActiveCourse({ ...activeCourse, downloadable: next });
  };

  const openCourse = async (course: Course) => {
    setLessonEditorId(null);
    resetLessonForm();
    setActiveCourse(course);
    setActiveTab("lessons");
    setLessonsLoading(true);
    const { data: lessonRows } = await supabase
      .from("course_lessons")
      .select("id, title, subtitle, body, position, unlock_at")
      .eq("course_id", course.id)
      .order("position", { ascending: true });
    setLessons(lessonRows || []);

    if (lessonRows && lessonRows.length > 0) {
      const { data: mediaRows } = await supabase
        .from("lesson_media")
        .select("id, lesson_id, type, url, label")
        .in("lesson_id", lessonRows.map((l: any) => l.id));
      const grouped: Record<string, Media[]> = {};
      for (const m of mediaRows || []) {
        const key = (m as any).lesson_id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m as any);
      }
      setMediaByLesson(grouped);
    } else {
      setMediaByLesson({});
    }
    setLessonsLoading(false);

    await loadQuizzes(course.id);
  };

  const resetLessonForm = () => {
    setLessonTitle("");
    setLessonSubtitle("");
    setLessonBody("");
    setLessonUnlockAt("");
    setLessonError("");
    resetMediaForm();
  };

  const populateLessonForm = (lesson: Lesson) => {
    setLessonTitle(lesson.title);
    setLessonSubtitle(lesson.subtitle || "");
    setLessonBody(lesson.body || "");
    setLessonUnlockAt(toDatetimeLocalValue(lesson.unlock_at));
    setLessonError("");
    resetMediaForm();
  };

  const openNewLesson = async () => {
    if (!activeCourse || savingLesson) return;
    setSavingLesson(true);
    setLessonError("");
    const { data, error } = await supabase
      .from("course_lessons")
      .insert({
        course_id: activeCourse.id,
        title: "Nouvelle leçon",
        subtitle: null,
        body: null,
        position: lessons.length,
      })
      .select("id, title, subtitle, body, position, unlock_at")
      .single();

    if (error || !data) {
      setLessonError(error?.message || "Impossible de créer la leçon.");
      setSavingLesson(false);
      return;
    }

    const lesson = data as Lesson;
    setLessons((prev) => [...prev, lesson]);
    setMediaByLesson((prev) => ({ ...prev, [lesson.id]: [] }));
    setCourses((prev) => prev.map((c) => (c.id === activeCourse.id ? { ...c, lessonCount: c.lessonCount + 1 } : c)));
    setLessonEditorId(lesson.id);
    populateLessonForm(lesson);
    setExpandedLesson(null);
    setSavingLesson(false);
  };

  const openEditLesson = (lesson: Lesson) => {
    setLessonEditorId(lesson.id);
    populateLessonForm(lesson);
    setExpandedLesson(null);
  };

  const closeLessonEditor = (confirmEmpty = true) => {
    if (!lessonEditorId) return;

    const lesson = lessons.find((l) => l.id === lessonEditorId);
    const media = mediaByLesson[lessonEditorId] || [];
    const isEmptyDraft =
      lesson &&
      lesson.title === "Nouvelle leçon" &&
      !lessonBody.trim() &&
      !lessonSubtitle.trim() &&
      !lessonUnlockAt &&
      media.length === 0;

    if (confirmEmpty && isEmptyDraft) {
      const editorId = lessonEditorId;
      askConfirm({
        title: "Fermer sans enregistrer",
        message: "Fermer sans enregistrer ? La leçon vide sera supprimée.",
        confirmLabel: "Fermer",
        tone: "warning",
        onConfirm: async () => {
          await supabase.from("course_lessons").delete().eq("id", editorId);
          setLessons((prev) => prev.filter((l) => l.id !== editorId));
          if (activeCourse) {
            setCourses((prev) => prev.map((c) => (c.id === activeCourse.id ? { ...c, lessonCount: Math.max(0, c.lessonCount - 1) } : c)));
          }
          setLessonEditorId(null);
          resetLessonForm();
        },
      });
      return;
    }

    setLessonEditorId(null);
    resetLessonForm();
  };

  const saveLesson = async () => {
    if (!lessonEditorId || !activeCourse) return;
    if (!lessonTitle.trim()) return setLessonError("Le titre de la leçon est requis.");

    setSavingLesson(true);
    setLessonError("");
    const payload = {
      title: lessonTitle.trim(),
      subtitle: lessonSubtitle.trim() || null,
      body: lessonBody.trim() || null,
      unlock_at: lessonUnlockAt ? new Date(lessonUnlockAt).toISOString() : null,
    };

    const { data, error } = await supabase
      .from("course_lessons")
      .update(payload)
      .eq("id", lessonEditorId)
      .select("id, title, subtitle, body, position, unlock_at")
      .single();

    if (error || !data) {
      setLessonError(error?.message || "Erreur lors de l'enregistrement.");
      setSavingLesson(false);
      return;
    }

    setLessons((prev) => prev.map((l) => (l.id === lessonEditorId ? (data as Lesson) : l)));
    setLessonEditorId(null);
    resetLessonForm();
    setSavingLesson(false);
  };

  const deleteLesson = (lessonId: string) => {
    askConfirm({
      title: "Supprimer la leçon",
      message: "Supprimer cette leçon et ses médias attachés ?",
      confirmLabel: "Supprimer",
      tone: "danger",
      onConfirm: async () => {
        if (lessonEditorId === lessonId) {
          setLessonEditorId(null);
          resetLessonForm();
        }
        await supabase.from("course_lessons").delete().eq("id", lessonId);
        setLessons((prev) => prev.filter((l) => l.id !== lessonId));
        if (activeCourse) {
          setCourses((prev) => prev.map((c) => (c.id === activeCourse.id ? { ...c, lessonCount: Math.max(0, c.lessonCount - 1) } : c)));
        }
      },
    });
  };

  const resetMediaForm = () => {
    setMediaType("video_link");
    setMediaUrl("");
    setMediaLabel("");
    setMediaFile(null);
    setMediaError("");
  };

  const addMedia = async (lessonId: string) => {
    setMediaError("");

    if (mediaType === "video_link") {
      if (!mediaUrl.trim()) return setMediaError("Colle un lien vidéo (YouTube, Vimeo...).");
      const { data, error } = await supabase
        .from("lesson_media")
        .insert({ lesson_id: lessonId, type: "video_link", url: mediaUrl.trim(), label: mediaLabel.trim() || null })
        .select("id, type, url, label")
        .single();
      if (!error && data) {
        setMediaByLesson((prev) => ({ ...prev, [lessonId]: [...(prev[lessonId] || []), data as Media] }));
        setMediaUrl("");
        setMediaLabel("");
        setMediaFile(null);
        setMediaError("");
      } else {
        setMediaError(error?.message || "Erreur lors de l'ajout.");
      }
      return;
    }

    if (!mediaFile) return setMediaError("Choisis un fichier.");

    const maxMb = mediaType === "video_upload" ? MAX_VIDEO_MB : MAX_PDF_MB;
    if (mediaFile.size > maxMb * 1024 * 1024) {
      return setMediaError(`Fichier trop volumineux (max ${maxMb} Mo). Pour une vidéo plus longue, utilise un lien YouTube/Vimeo non répertorié à la place.`);
    }

    setUploadingMedia(true);
    try {
      const bucket = mediaType === "video_upload" ? "course-videos" : "course-pdfs";
      const ext = mediaFile.name.split(".").pop();
      const path = `${lessonId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, mediaFile);
      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const { data, error } = await supabase
        .from("lesson_media")
        .insert({ lesson_id: lessonId, type: mediaType, url: urlData.publicUrl, label: mediaLabel.trim() || mediaFile.name })
        .select("id, type, url, label")
        .single();
      if (error || !data) throw new Error(error?.message || "Erreur lors de l'enregistrement.");

      setMediaByLesson((prev) => ({ ...prev, [lessonId]: [...(prev[lessonId] || []), data as Media] }));
      setMediaUrl("");
      setMediaLabel("");
      setMediaFile(null);
      setMediaError("");
    } catch (e: any) {
      setMediaError(e.message || "Erreur lors de l'envoi.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const deleteMedia = async (lessonId: string, mediaId: string) => {
    await supabase.from("lesson_media").delete().eq("id", mediaId);
    setMediaByLesson((prev) => ({ ...prev, [lessonId]: (prev[lessonId] || []).filter((m) => m.id !== mediaId) }));
  };

  const loadQuizzes = async (courseId: string) => {
    setQuizzesLoading(true);
    const { data } = await supabase
      .from("quizzes")
      .select("id, title, quiz_questions(id, question, position, quiz_options(id, label, is_correct, position))")
      .eq("course_id", courseId);
    setQuizzes(
      (data || []).map((q: any) => ({
        id: q.id,
        title: q.title,
        questions: (q.quiz_questions || [])
          .sort((a: any, b: any) => a.position - b.position)
          .map((qq: any) => ({
            id: qq.id,
            question: qq.question,
            options: (qq.quiz_options || []).sort((a: any, b: any) => a.position - b.position),
          })),
      }))
    );
    setQuizzesLoading(false);
  };

  const addQuizQuestion = () => setQuizQuestions((prev) => [...prev, defaultQuestion()]);
  const removeQuizQuestion = (i: number) => setQuizQuestions((prev) => prev.filter((_, idx) => idx !== i));
  const updateQuizQuestion = (i: number, text: string) => setQuizQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, question: text } : q)));
  const addQuizOption = (qi: number) => setQuizQuestions((prev) => prev.map((q, idx) => (idx === qi ? { ...q, options: [...q.options, { label: "", is_correct: false }] } : q)));
  const removeQuizOption = (qi: number, oi: number) => setQuizQuestions((prev) => prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q)));
  const updateQuizOptionLabel = (qi: number, oi: number, label: string) =>
    setQuizQuestions((prev) => prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, label } : o)) } : q)));
  const setCorrectOption = (qi: number, oi: number) =>
    setQuizQuestions((prev) => prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) } : q)));

  const resetQuizForm = () => {
    setQuizTitle("");
    setQuizQuestions([defaultQuestion()]);
    setQuizError("");
  };

  const saveQuiz = async () => {
    setQuizError("");
    if (!quizTitle.trim()) return setQuizError("Le titre du quiz est requis.");
    if (!activeCourse || !userId) return;
    if (quizQuestions.some((q) => !q.question.trim() || q.options.some((o) => !o.label.trim()))) {
      return setQuizError("Chaque question et chaque option doivent être remplies.");
    }

    setSavingQuiz(true);
    try {
      const { data: quiz, error: quizErr } = await supabase
        .from("quizzes")
        .insert({ course_id: activeCourse.id, title: quizTitle.trim(), created_by: userId })
        .select("id")
        .single();
      if (quizErr || !quiz) throw new Error(quizErr?.message || "Erreur lors de la création du quiz.");

      for (let i = 0; i < quizQuestions.length; i++) {
        const q = quizQuestions[i];
        const { data: question, error: qErr } = await supabase
          .from("quiz_questions")
          .insert({ quiz_id: quiz.id, question: q.question.trim(), position: i })
          .select("id")
          .single();
        if (qErr || !question) continue;

        for (let j = 0; j < q.options.length; j++) {
          const o = q.options[j];
          await supabase.from("quiz_options").insert({ question_id: question.id, label: o.label.trim(), is_correct: o.is_correct, position: j });
        }
      }

      await loadQuizzes(activeCourse.id);
      resetQuizForm();
      setNewQuizOpen(false);
    } catch (e: any) {
      setQuizError(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSavingQuiz(false);
    }
  };

  const deleteQuiz = (quizId: string) => {
    askConfirm({
      title: "Supprimer le quiz",
      message: "Supprimer ce quiz ?",
      confirmLabel: "Supprimer",
      tone: "danger",
      onConfirm: async () => {
        await supabase.from("quizzes").delete().eq("id", quizId);
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      },
    });
  };

  if (shellLoading) return null;

  const isTcfCenter = isTcfCanadaCenter(centerType);
  const disciplineLabel = isTcfCenter ? "Rubrique TCF" : "Matière";
  const disciplinePlaceholder = isTcfCenter ? "Choisir une rubrique..." : "Choisir une matière...";

  if (dataLoading && !activeCourse) {
    return (
      <div className="min-h-[100dvh] bg-white text-[#11224E] pb-24 overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4" style={{ color: ORANGE }} />
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">Pédagogie</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: BLUE }}>Constructeur de cours</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest bg-neutral-100 text-neutral-400 cursor-not-allowed"
            >
              <ScanLine size={14} /> Scanner un cours (IA) <Lock size={11} />
            </button>
            <button
              disabled
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest text-white/70 shadow-md"
              style={{ backgroundColor: ORANGE }}
            >
              <Plus size={14} /> Nouveau cours
            </button>
          </div>
        </header>
        <CenterContentSkeleton variant="courses-grid" />
      </div>
    );
  }

  const renderMediaSection = (lessonId: string) => {
    const mediaList = mediaByLesson[lessonId] || [];
    return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
        <FileText size={11} /> Documents & médias
      </p>
      {mediaList.length > 0 && (
        <div className="space-y-2">
          {mediaList.map((m) => (
            <div key={m.id} className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2.5">
              {m.type === "video_link" || m.type === "video_upload" ? <Video size={14} className="text-neutral-400 shrink-0" /> : <FileText size={14} className="text-neutral-400 shrink-0" />}
              <a
                href={m.type === "video_link" ? m.url : `/document/${m.id}`}
                {...(m.type === "video_link" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex-1 min-w-0 text-xs font-bold truncate hover:underline"
                style={{ color: BLUE }}
              >
                {m.label || (m.type === "pdf" ? "Document PDF" : m.type === "video_upload" ? "Vidéo" : m.type === "video_link" ? "Lien vidéo" : "Média")}
              </a>
              <button type="button" onClick={() => deleteMedia(lessonId, m.id)} className="p-1 text-neutral-300 hover:text-red-500 shrink-0"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2.5">
        <div className="flex gap-1.5">
          {([
            { value: "video_link" as const, label: "Lien vidéo", icon: Link2 },
            { value: "video_upload" as const, label: "Vidéo", icon: Video },
            { value: "pdf" as const, label: "PDF", icon: FileText },
          ]).map((t) => (
            <button key={t.value} type="button" onClick={() => { setMediaType(t.value); setMediaError(""); }} className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${mediaType === t.value ? "bg-slate-900 text-white" : "bg-white text-neutral-500 border border-neutral-200"}`}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
        {mediaType === "video_link" ? (
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium outline-none" />
        ) : (
          <div>
            <input
              id={`media-file-${lessonId}`}
              type="file"
              accept={mediaType === "video_upload" ? "video/*" : "application/pdf"}
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
            <label
              htmlFor={`media-file-${lessonId}`}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 text-xs font-black uppercase tracking-widest text-neutral-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            >
              <FileUp size={14} />
              {mediaFile ? (
                <span className="truncate normal-case tracking-normal font-bold">{mediaFile.name}</span>
              ) : (
                <span>Choisir un fichier</span>
              )}
            </label>
            <p className="text-[9px] text-neutral-400 mt-1">Max {mediaType === "video_upload" ? MAX_VIDEO_MB : MAX_PDF_MB} Mo.</p>
          </div>
        )}
        <input value={mediaLabel} onChange={(e) => setMediaLabel(e.target.value)} placeholder="Libellé (optionnel)" className="w-full h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium outline-none" />
        {mediaError && <p className="text-[10px] font-bold text-red-500">{mediaError}</p>}
        <button type="button" onClick={() => addMedia(lessonId)} disabled={uploadingMedia} className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}>
          {uploadingMedia ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Ajouter le média
        </button>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-white text-[#11224E] pb-24 overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {activeCourse ? (
              <button onClick={() => { closeLessonEditor(false); setActiveCourse(null); }} className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-orange-600 mb-2">
                <ArrowLeft size={14} /> Tous les cours
              </button>
            ) : (
              <div className="flex items-center gap-3 mb-1">
                <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" style={{ color: ORANGE }} />
                </span>
                <span className="text-[10px] font-black tracking-widest uppercase text-neutral-400">Pédagogie</span>
              </div>
            )}
            <h1 className="text-2xl font-black tracking-tight" style={{ color: BLUE }}>
              {activeCourse ? activeCourse.title : "Constructeur de cours"}
            </h1>
          </div>

          {!activeCourse && (
            <div className="flex items-center gap-2">
              <button disabled title="Fonctionnalité premium — bientôt disponible" className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest bg-neutral-100 text-neutral-400 cursor-not-allowed">
                <ScanLine size={14} /> Scanner un cours (IA) <Lock size={11} />
              </button>
              <button onClick={() => setCreateOpen(true)} className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest text-white shadow-md" style={{ backgroundColor: ORANGE }}>
                <Plus size={14} /> Nouveau cours
              </button>
            </div>
          )}
        </header>

        <div className="max-w-5xl mx-auto px-6 pt-8">
          {!activeCourse ? (
            courses.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-white">
                <BookOpen className="h-12 w-12 text-neutral-200 mb-4" />
                <p className="text-sm font-bold text-neutral-400">Aucun cours créé pour l'instant.</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {isTcfCenter ? "Crée ton premier cours pour une rubrique TCF." : "Crée ton premier cours pour une matière."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((c) => (
                  <div key={c.id} className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm hover:border-orange-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: ORANGE }}>{c.disciplineName}</p>
                        <h3 className="font-black text-base tracking-tight truncate" style={{ color: BLUE }}>{c.title}</h3>
                      </div>
                      <button onClick={() => deleteCourse(c.id)} className="p-2 text-neutral-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {c.description && <p className="text-xs text-neutral-500 font-medium mb-3 line-clamp-2">{c.description}</p>}
                    {c.groupeNames.length > 0 ? (
                      <p className="text-[9px] font-bold text-neutral-400 mb-2 flex items-center gap-1">
                        <Users size={10} /> {c.groupeNames.join(", ")}
                      </p>
                    ) : (
                      <p className="text-[9px] font-bold text-neutral-400 mb-2">Toutes les classes</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 ${c.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500"}`}>
                        {c.status === "published" ? <Eye size={10} /> : <EyeOff size={10} />}
                        {c.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                      <button onClick={() => openCourse(c)} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: BLUE, backgroundColor: "#EEF2FF" }}>
                        Éditer →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div>
              {activeCourse.groupeNames.length > 0 && (
                <p className="text-[10px] font-bold text-neutral-500 mb-4 flex items-center gap-1.5">
                  <Users size={12} style={{ color: ORANGE }} />
                  Classes ciblées : {activeCourse.groupeNames.join(", ")}
                </p>
              )}
              {activeCourse.groupeNames.length === 0 && groupes.length > 0 && (
                <p className="text-[10px] font-bold text-neutral-400 mb-4 flex items-center gap-1.5">
                  <Users size={12} /> Visible pour toutes les classes
                </p>
              )}
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePublish(activeCourse)} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeCourse.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500"}`}>
                    {activeCourse.status === "published" ? <Eye size={12} /> : <EyeOff size={12} />}
                    {activeCourse.status === "published" ? "Publié" : "Brouillon"}
                  </button>
                  <button onClick={() => toggleDownloadable(activeCourse)} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeCourse.downloadable ? "bg-blue-50" : "bg-neutral-100 text-neutral-500"}`} style={activeCourse.downloadable ? { color: BLUE } : {}}>
                    {activeCourse.downloadable ? <Download size={12} /> : <Ban size={12} />}
                    {activeCourse.downloadable ? "Téléchargeable" : "Non téléchargeable"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeTab === "lessons" ? (
                    <button
                      onClick={openNewLesson}
                      disabled={!!lessonEditorId || savingLesson}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50"
                      style={{ backgroundColor: BLUE }}
                    >
                      {savingLesson && !lessonEditorId ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      Ajouter une leçon
                    </button>
                  ) : (
                    <>
                      <button disabled title="Fonctionnalité premium — bientôt disponible" className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-neutral-100 text-neutral-400 cursor-not-allowed">
                        <Sparkles size={13} /> Générer avec l'IA <Lock size={11} />
                      </button>
                      <button onClick={() => setNewQuizOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-md" style={{ backgroundColor: BLUE }}>
                        <Plus size={13} /> Ajouter un quiz
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5 mb-5 bg-white border border-neutral-200 rounded-xl p-1 w-fit">
                <button onClick={() => setActiveTab("lessons")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "lessons" ? "text-white" : "text-neutral-400"}`} style={activeTab === "lessons" ? { backgroundColor: BLUE } : {}}>
                  Leçons
                </button>
                <button onClick={() => setActiveTab("quizzes")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${activeTab === "quizzes" ? "text-white" : "text-neutral-400"}`} style={activeTab === "quizzes" ? { backgroundColor: BLUE } : {}}>
                  Quiz
                </button>
              </div>

              {activeTab === "lessons" ? (
                <>
                  {lessonsLoading ? (
                    <p className="text-sm text-neutral-400 text-center py-10">Chargement...</p>
                  ) : lessons.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl border border-dashed border-neutral-300 bg-white">
                      <p className="text-sm font-bold text-neutral-400">Aucune leçon encore. Ajoute la première ci-dessus.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessons.map((l, idx) => {
                        const isEditing = lessonEditorId === l.id;
                        const expanded = expandedLesson === l.id && !isEditing;
                        const media = mediaByLesson[l.id] || [];
                        const locked = isLocked(l.unlock_at);
                        return (
                          <div
                            key={l.id}
                            ref={isEditing ? lessonEditorRef : undefined}
                            className={`bg-white border rounded-2xl overflow-hidden shadow-sm scroll-mt-28 ${isEditing ? "border-orange-300 ring-1 ring-orange-100" : "border-neutral-200"}`}
                          >
                            <div className="flex items-center gap-2 px-5 py-4">
                              <GripVertical size={14} className="text-neutral-300 shrink-0" />
                              <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-black text-neutral-500 shrink-0">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black truncate" style={{ color: BLUE }}>
                                  {isEditing ? (lessonTitle.trim() || "Sans titre") : l.title}
                                </p>
                                {!isEditing && l.subtitle && <p className="text-xs text-neutral-400 font-medium truncate">{l.subtitle}</p>}
                                {isEditing && (
                                  <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: ORANGE }}>
                                    En cours d&apos;édition
                                  </p>
                                )}
                              </div>
                              {!isEditing && locked && (
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                                  <Lock size={9} /> {new Date(l.unlock_at!).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                                </span>
                              )}
                              {!isEditing && media.length > 0 && <span className="text-[9px] font-bold text-neutral-400 shrink-0">{media.length} média{media.length > 1 ? "s" : ""}</span>}
                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => closeLessonEditor()}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-neutral-100 text-neutral-500 shrink-0"
                                >
                                  <X size={11} /> Fermer
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openEditLesson(l)}
                                  disabled={!!lessonEditorId}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40 shrink-0"
                                  style={{ backgroundColor: BLUE }}
                                >
                                  <Edit3 size={11} /> Éditer
                                </button>
                              )}
                              {!isEditing && (
                                <button type="button" onClick={() => setExpandedLesson(expanded ? null : l.id)} className="p-1.5 text-neutral-400 hover:text-neutral-600 shrink-0">
                                  <ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                              )}
                            </div>

                            {isEditing && (
                              <div className="px-5 pb-5 border-t border-orange-100 pt-4 space-y-4">
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Titre de la leçon</label>
                                  <input
                                    ref={lessonTitleRef}
                                    value={lessonTitle}
                                    onChange={(e) => setLessonTitle(e.target.value)}
                                    placeholder="Ex : Introduction"
                                    className="w-full h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold outline-none focus:border-orange-300"
                                    style={{ color: BLUE }}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Sous-titre (optionnel)</label>
                                  <input
                                    value={lessonSubtitle}
                                    onChange={(e) => setLessonSubtitle(e.target.value)}
                                    placeholder="Sous-titre"
                                    className="w-full h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-xs font-semibold outline-none text-neutral-600"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Contenu</label>
                                  <RichTextEditor value={lessonBody} onChange={setLessonBody} />
                                </div>
                                {renderMediaSection(l.id)}
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 flex items-center gap-1"><Clock size={11} /> Déblocage programmé (optionnel)</label>
                                  <input type="datetime-local" value={lessonUnlockAt} onChange={(e) => setLessonUnlockAt(e.target.value)} className="w-full h-10 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-xs font-bold outline-none" style={{ color: BLUE }} />
                                  <p className="text-[9px] text-neutral-400 mt-1">Laisse vide pour un accès immédiat après publication du cours.</p>
                                </div>
                                {lessonError && <p className="text-xs font-bold text-red-500">{lessonError}</p>}
                                <div className="flex gap-2">
                                  <button type="button" onClick={saveLesson} disabled={savingLesson} className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}>
                                    {savingLesson ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
                                  </button>
                                  <button type="button" onClick={() => closeLessonEditor()} className="h-11 px-5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-500">Fermer</button>
                                </div>
                              </div>
                            )}

                            <AnimatePresence>
                              {expanded && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4 space-y-4">
                                    {locked && (
                                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-[11px] font-bold text-amber-700 flex items-center gap-2">
                                        <Lock size={12} /> Se débloque le {new Date(l.unlock_at!).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                                      </div>
                                    )}
                                    {l.body && <div className="text-xs text-neutral-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: l.body }} />}

                                    <div className="space-y-2">
                                      {media.map((m) => (
                                        <div key={m.id} className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2.5">
                                          {m.type === "video_link" || m.type === "video_upload" ? <Video size={14} className="text-neutral-400 shrink-0" /> : <FileText size={14} className="text-neutral-400 shrink-0" />}
                                          <a
                                            href={m.type === "video_link" ? m.url : `/document/${m.id}`}
                                            {...(m.type === "video_link" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                            className="flex-1 min-w-0 text-xs font-bold truncate hover:underline"
                                            style={{ color: BLUE }}
                                          >
                                            {m.label || (m.type === "pdf" ? "Document PDF" : m.type === "video_upload" ? "Vidéo" : m.type === "video_link" ? "Lien vidéo" : "Média")}
                                          </a>
                                        </div>
                                      ))}
                                    </div>

                                    <button type="button" onClick={() => deleteLesson(l.id)} className="text-[10px] font-bold text-neutral-400 hover:text-red-500 flex items-center gap-1">
                                      <Trash2 size={11} /> Supprimer cette leçon
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {newQuizOpen && (
                    <div className="bg-white border border-neutral-200 rounded-2xl p-5 mb-5 shadow-sm space-y-4">
                      <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Titre du quiz" className="w-full h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold outline-none" style={{ color: BLUE }} />

                      {quizQuestions.map((q, qi) => (
                        <div key={qi} className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2.5 relative">
                          {quizQuestions.length > 1 && (
                            <button onClick={() => removeQuizQuestion(qi)} className="absolute top-3 right-3 text-neutral-300 hover:text-red-500"><X size={14} /></button>
                          )}
                          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Question {qi + 1}</p>
                          <input value={q.question} onChange={(e) => updateQuizQuestion(qi, e.target.value)} placeholder="Énoncé de la question" className="w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold outline-none" style={{ color: BLUE }} />
                          <div className="space-y-1.5">
                            {q.options.map((o, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button onClick={() => setCorrectOption(qi, oi)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${o.is_correct ? "border-emerald-500" : "border-neutral-300"}`} style={o.is_correct ? { backgroundColor: "#10B981" } : {}}>
                                  {o.is_correct && <Check size={12} className="text-white" />}
                                </button>
                                <input value={o.label} onChange={(e) => updateQuizOptionLabel(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="flex-1 h-9 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium outline-none" />
                                {q.options.length > 2 && (
                                  <button onClick={() => removeQuizOption(qi, oi)} className="p-1.5 text-neutral-300 hover:text-red-500"><Trash2 size={12} /></button>
                                )}
                              </div>
                            ))}
                            <button onClick={() => addQuizOption(qi)} className="text-[10px] font-bold flex items-center gap-1" style={{ color: ORANGE }}>
                              <Plus size={10} /> Option
                            </button>
                          </div>
                        </div>
                      ))}

                      <button onClick={addQuizQuestion} className="text-xs font-bold flex items-center gap-1" style={{ color: BLUE }}>
                        <Plus size={12} /> Ajouter une question
                      </button>

                      {quizError && <p className="text-xs font-bold text-red-500">{quizError}</p>}

                      <div className="flex gap-2 pt-2">
                        <button onClick={saveQuiz} disabled={savingQuiz} className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50" style={{ backgroundColor: ORANGE }}>
                          {savingQuiz ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Enregistrer le quiz
                        </button>
                        <button onClick={() => { setNewQuizOpen(false); resetQuizForm(); }} className="h-11 px-5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-500">Annuler</button>
                      </div>
                    </div>
                  )}

                  {quizzesLoading ? (
                    <p className="text-sm text-neutral-400 text-center py-10">Chargement...</p>
                  ) : quizzes.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl border border-dashed border-neutral-300 bg-white">
                      <HelpCircle className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-neutral-400">Aucun quiz encore.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quizzes.map((q) => {
                        const expanded = expandedQuiz === q.id;
                        return (
                          <div key={q.id} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                            <button onClick={() => setExpandedQuiz(expanded ? null : q.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                              <HelpCircle size={16} className="text-neutral-400 shrink-0" />
                              <p className="flex-1 text-sm font-black truncate" style={{ color: BLUE }}>{q.title}</p>
                              <span className="text-[9px] font-bold text-neutral-400 shrink-0">{q.questions.length} question{q.questions.length > 1 ? "s" : ""}</span>
                              <ChevronDown size={15} className={`text-neutral-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                              {expanded && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="px-5 pb-5 border-t border-neutral-100 pt-4 space-y-3">
                                    {q.questions.map((qq, i) => (
                                      <div key={qq.id} className="bg-neutral-50 rounded-xl p-3">
                                        <p className="text-xs font-bold mb-2" style={{ color: BLUE }}>{i + 1}. {qq.question}</p>
                                        <div className="space-y-1">
                                          {qq.options.map((o) => (
                                            <p key={o.id} className={`text-[11px] font-medium pl-3 ${o.is_correct ? "text-emerald-600 font-bold" : "text-neutral-500"}`}>
                                              {o.is_correct ? "✓ " : "— "}{o.label}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                    <button onClick={() => deleteQuiz(q.id)} className="text-[10px] font-bold text-neutral-400 hover:text-red-500 flex items-center gap-1">
                                      <Trash2 size={11} /> Supprimer ce quiz
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => { setCreateOpen(false); resetCreateForm(); }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="relative w-full sm:w-[420px] h-full bg-white flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 shrink-0">
                <h2 className="text-lg font-black" style={{ color: BLUE }}>Nouveau cours</h2>
                <button onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block">{disciplineLabel}</label>
                  <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className="w-full h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-bold outline-none" style={{ color: BLUE }}>
                    <option value="">{disciplinePlaceholder}</option>
                    {disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {isTcfCenter && disciplines.length === 0 && (
                    <p className="text-[10px] font-bold text-amber-600 mt-2">
                      Rubriques TCF absentes — exécutez <code className="text-[9px]">supabase-tcf-course-disciplines.sql</code> dans Supabase.
                    </p>
                  )}
                  {isTcfCenter && disciplineId && disciplines.find((d) => d.id === disciplineId)?.code === TCF_NEUTRAL_DISCIPLINE.code && (
                    <p className="text-[10px] text-neutral-500 mt-2">
                      Cours transversal : visible pour toutes les rubriques et notions générales.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block">Titre du cours</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Introduction à l'algorithmique" className="w-full h-11 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-bold outline-none" style={{ color: BLUE }} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block">Description (optionnel)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Présentation du cours..." className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs font-medium outline-none resize-none" style={{ color: BLUE }} />
                </div>
                {groupes.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2 block flex items-center gap-1">
                      <Users size={11} /> Classes destinataires
                    </label>
                    <p className="text-[9px] text-neutral-400 mb-2">Aucune sélection = toutes les classes du centre.</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-neutral-200 rounded-xl p-2 bg-neutral-50">
                      {groupes.map((g) => (
                        <label key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedGroupeIds.includes(g.id)}
                            onChange={() => toggleGroupeSelection(g.id)}
                            className="rounded border-neutral-300"
                          />
                          <span className="text-xs font-bold" style={{ color: BLUE }}>{g.nom}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setDownloadableDraft((v) => !v)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${downloadableDraft ? "border-blue-200 bg-blue-50" : "border-neutral-200 bg-neutral-50"}`}>
                  <span className="text-xs font-bold flex items-center gap-2" style={{ color: downloadableDraft ? BLUE : "#737373" }}>
                    {downloadableDraft ? <Download size={14} /> : <Ban size={14} />} Cours téléchargeable
                  </span>
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${downloadableDraft ? "" : "bg-neutral-300"}`} style={downloadableDraft ? { backgroundColor: BLUE } : {}}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${downloadableDraft ? "left-4" : "left-0.5"}`} />
                  </div>
                </button>
                {errorMsg && <p className="text-xs font-bold text-red-500">{errorMsg}</p>}
              </div>
              <div className="px-6 py-4 border-t border-neutral-100 shrink-0">
                <button onClick={createCourse} disabled={saving} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50" style={{ backgroundColor: ORANGE }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer le cours (brouillon)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popup de confirmation (remplace window.confirm) */}
      <AnimatePresence>
        {confirmDialog && (
          <ActionConfirmModal
            key="confirm-dialog"
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            tone={confirmDialog.tone}
            busy={confirmBusy}
            onConfirm={runConfirm}
            onCancel={() => {
              if (!confirmBusy) setConfirmDialog(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionConfirmModal({
  title,
  message,
  confirmLabel,
  tone,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "warning";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDanger = tone === "danger";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: isDanger ? "#fef2f2" : "#fff7ed" }}
            >
              <AlertTriangle size={18} style={{ color: isDanger ? "#dc2626" : ORANGE }} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-sm font-black" style={{ color: BLUE }}>{title}</h3>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 h-10 rounded-xl border border-neutral-200 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: isDanger ? "#dc2626" : ORANGE }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}