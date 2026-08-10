"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileEdit, Clock, CheckCircle2,
  UploadCloud, Send, FileText, AlertCircle,
  Star, X, Loader2, Paperclip, ChevronDown, ChevronUp, Lock,
  Mic, Video, Trophy
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  allowsFormat,
  normalizeSubmissionFormats,
  type SubmissionFormat,
} from "@/app/utils/missionSubmissionFormats";

type Mission = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  correction_mode?: string;
  submission_formats?: SubmissionFormat[] | string[] | null;
  rank?: number | null;
  rank_total?: number | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
};

type Correction = {
  note: number;
  niveau: string;
  commentaire_global: string;
  erreurs: { faute: string; correction: string; explication: string }[];
  version_ideale: string;
  conseil_coach: string;
};

type Submission = {
  id: string;
  mission_id: string;
  answer_text: string | null;
  file_url: string | null;
  file_name: string | null;
  status: "correcting" | "done" | "pending_review";
  correction: Correction | null;
  created_at: string;
};

const MISSIONS_PACKS = ["ivoire", "cauris", "acceleree", "complete"];

function MissionsPageContent() {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const highlightMissionId = searchParams.get("mission");
  const isCenterRoute = pathname?.startsWith("/centre/student");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"todo" | "done">("todo");
  const [session, setSession] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Submission state per mission
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [attachedFile, setAttachedFile] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedCorrection, setExpandedCorrection] = useState<Record<string, boolean>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const scrolledToMissionRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return router.push("/login");
      setSession(s);

      const { data: profile } = await supabase
        .from("profiles")
        .select("pack_name, role, center_id")
        .eq("id", s.user.id)
        .single();

      const pack = profile?.pack_name?.toLowerCase() || "aucun";
      const isAdmin = profile?.role === "admin";
      const hasCenter = !!profile?.center_id;
      const allowed = isAdmin || hasCenter || MISSIONS_PACKS.includes(pack);
      setHasAccess(allowed);

      if (!allowed) { setLoading(false); return; }

      supabase.from("profiles").update({ current_activity: t("dashboard", "missionsActivityDoingHomework") }).eq("id", s.user.id);
      logClientActivity("Ouverture missions", "Page Missions & Devoirs consultee");

      const res = await fetch("/api/missions/student", {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      const studentData = res.ok ? await res.json() : { missions: [] };

      const mData = studentData.missions || [];
      setMissions(mData.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        created_at: m.created_at,
        correction_mode: m.correction_mode,
        submission_formats: normalizeSubmissionFormats(m.submission_formats),
        rank: m.rank,
        rank_total: m.rank_total,
        attachment_url: m.attachment_url,
        attachment_name: m.attachment_name,
      })));

      const map: Record<string, Submission> = {};
      mData.forEach((m: any) => {
        if (m.submission) map[m.id] = m.submission as Submission;
      });
      setSubmissions(map);
      setLoading(false);
    };
    init();
  }, [router, t]);

  useEffect(() => {
    if (!highlightMissionId || loading || scrolledToMissionRef.current) return;
    const exists = missions.some((m) => m.id === highlightMissionId);
    if (!exists) return;

    setActiveTab(submissions[highlightMissionId] ? "done" : "todo");
    setHighlightedId(highlightMissionId);
    scrolledToMissionRef.current = true;

    const timer = window.setTimeout(() => {
      document.getElementById(`mission-${highlightMissionId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);

    const clearTimer = window.setTimeout(() => setHighlightedId(null), 2500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightMissionId, loading, missions, submissions]);

  const handleFileChange = (missionId: string, file: File | null) => {
    setAttachedFile(prev => ({ ...prev, [missionId]: file }));
  };

  const handleSubmit = async (mission: Mission) => {
    const formats = normalizeSubmissionFormats(mission.submission_formats);
    const text = allowsFormat(formats, "text") ? (answerText[mission.id]?.trim() || "") : "";
    const file = attachedFile[mission.id];

    if (allowsFormat(formats, "text") && !text && !file) return;
    if (!allowsFormat(formats, "text") && !file) return;
    if (!session) return;

    setSubmitting(prev => ({ ...prev, [mission.id]: true }));

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileMime: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${session.user.id}/${mission.id}_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("mission-files")
          .upload(path, file, { upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from("mission-files").getPublicUrl(path);
          fileUrl = urlData.publicUrl;
          fileName = file.name;
          fileMime = file.type || null;
        }
      }

      const res = await fetch("/api/missions/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mission_id: mission.id,
          mission_title: mission.title,
          mission_description: mission.description,
          answer_text: text,
          file_url: fileUrl,
          file_name: fileName,
          file_mime: fileMime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data.errorCode as string | undefined;
        const errKey =
          code === "UNAUTHORIZED" ? "missionsErrUnauthorized"
          : code === "MISSION_ID_REQUIRED" ? "missionsErrMissionIdRequired"
          : code === "TEXT_OR_FILE_REQUIRED" ? "missionsErrTextOrFileRequired"
          : code === "NOT_FOUND" ? "missionsErrNotFound"
          : code === "NOT_ASSIGNED" ? "missionsErrNotAssigned"
          : code === "TEXT_NOT_ALLOWED" ? "missionsErrTextNotAllowed"
          : code === "FILE_TYPE_NOT_ALLOWED" ? "missionsErrFileTypeNotAllowed"
          : code === "ALREADY_SUBMITTED" ? "missionsErrAlreadySubmitted"
          : code === "SAVE_FAILED" ? "missionsErrSaveFailed"
          : code === "SERVER" ? "missionsErrServer"
          : null;
        alert(
          errKey
            ? t("dashboard", errKey, data.format ? { format: data.format } : undefined)
            : (data.error || t("dashboard", "missionsSubmitError")),
        );
        return;
      }

      const newSub: Submission = {
        id: data.submission_id,
        mission_id: mission.id,
        answer_text: text || null,
        file_url: fileUrl,
        file_name: fileName,
        status: data.status,
        correction: data.correction || null,
        created_at: new Date().toISOString(),
      };
      setSubmissions(prev => ({ ...prev, [mission.id]: newSub }));

      if (data.status === "done") {
        const rankRes = await fetch("/api/missions/student", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          const updated = (rankData.missions || []).find((m: any) => m.id === mission.id);
          if (updated) {
            setMissions(prev => prev.map(m => m.id === mission.id ? {
              ...m,
              rank: updated.rank,
              rank_total: updated.rank_total,
            } : m));
          }
        }
      }
      logClientActivity("Mission soumise", mission.title, {
        mission_id: mission.id,
        has_file: Boolean(fileUrl),
        has_text: Boolean(text),
      });

      setAnswerText(prev => ({ ...prev, [mission.id]: "" }));
      setAttachedFile(prev => ({ ...prev, [mission.id]: null }));

    } catch (err) {
      alert(t("dashboard", "missionsNetworkError"));
    } finally {
      setSubmitting(prev => ({ ...prev, [mission.id]: false }));
    }
  };

  const missionsTodo = missions.filter(m => !submissions[m.id]);
  const missionsDone = missions.filter(m => !!submissions[m.id]);

  const ScoreColor = (note: number) =>
    note >= 16 ? "text-emerald-600" : note >= 12 ? "text-blue-600" : note >= 8 ? "text-amber-600" : "text-red-500";

  const ScoreBg = (note: number) =>
    note >= 16 ? "bg-emerald-50 border-emerald-200" : note >= 12 ? "bg-blue-50 border-blue-200" : note >= 8 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  if (!loading && hasAccess === false) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFBF7] font-sans text-neutral-900 flex flex-col overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60">
          <div className="nexa-student-shell py-3 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition-colors group">
              <ArrowLeft className="w-4 h-4 text-neutral-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className={STUDENT_TEXT.pageTitle} style={{ color: BRAND.blue }}>{t("dashboard", "missionsTitle")}</h1>
              <p className="text-[10px] font-semibold" style={{ color: BRAND.orange }}>{t("dashboard", "studentSpace")}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center bg-white border border-orange-200 rounded-xl p-8">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
              <Lock className="w-7 h-7 text-orange-400" />
            </div>
            <h2 className={`${STUDENT_TEXT.sectionTitle} mb-2`} style={{ color: BRAND.blue }}>{t("dashboard", "missionsReservedTitle")}</h2>
            <p className="text-neutral-500 text-sm leading-relaxed">
              {t("dashboard", "missionsReservedBody")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] font-sans text-neutral-900 pb-24 md:pb-12 overflow-x-hidden">

      <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60">
        <div className="nexa-student-shell py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition-colors group">
            <ArrowLeft className="w-4 h-4 text-neutral-600 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className={STUDENT_TEXT.pageTitle} style={{ color: BRAND.blue }}>{t("dashboard", "missionsTitle")}</h1>
            <p className="text-[10px] font-semibold" style={{ color: BRAND.orange }}>{t("dashboard", "missionsSubmitHere")}</p>
          </div>
        </div>
      </header>

      <main className="nexa-student-shell pt-5 pb-6 space-y-5 xl:space-y-6">

        <div className="bg-white border border-orange-200 rounded-xl p-4 md:p-5 xl:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className={`${STUDENT_TEXT.sectionTitle} mb-1`} style={{ color: BRAND.blue }}>{t("dashboard", "missionsPracticalTitle")}</h2>
            <p className="text-neutral-500 text-sm xl:text-base max-w-md">
              {t("dashboard", "missionsPracticalHint")}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg text-center min-w-[80px]">
              <span className="block text-xl font-bold" style={{ color: BRAND.orange }}>{missionsTodo.length}</span>
              <span className="text-[10px] font-semibold text-neutral-500">{t("dashboard", "missionsPending")}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg text-center min-w-[80px]">
              <span className="block text-xl font-bold text-emerald-600">{missionsDone.length}</span>
              <span className="text-[10px] font-semibold text-emerald-600">{t("dashboard", "missionsDone")}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("todo")}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeTab === "todo"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-neutral-600 border-orange-200 hover:border-orange-300"
            }`}
          >
            {t("dashboard", "missionsTodoTab", { count: missionsTodo.length })}
          </button>
          <button
            onClick={() => setActiveTab("done")}
            className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeTab === "done"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-neutral-600 border-orange-200 hover:border-orange-300"
            }`}
          >
            {t("dashboard", "missionsDoneTab", { count: missionsDone.length })}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">

              {/* ── À FAIRE ── */}
              {activeTab === "todo" && missionsTodo.length === 0 && (
                <motion.div key="empty-todo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14 bg-white rounded-xl border border-dashed border-orange-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h3 className={`${STUDENT_TEXT.cardTitle} mb-1`} style={{ color: BRAND.blue }}>{t("dashboard", "missionsAllCaughtUp")}</h3>
                  <p className="text-neutral-500 text-sm">{t("dashboard", "missionsNoPending")}</p>
                </motion.div>
              )}

              {activeTab === "todo" && missionsTodo.map((mission) => {
                const formats = normalizeSubmissionFormats(mission.submission_formats);
                const allowText = allowsFormat(formats, "text");
                const allowFile = allowsFormat(formats, "file");
                const allowAudio = allowsFormat(formats, "audio");
                const allowVideo = allowsFormat(formats, "video");
                const allowAnyMedia = allowFile || allowAudio || allowVideo;
                const canSubmit = (allowText && !!answerText[mission.id]?.trim()) || !!attachedFile[mission.id];

                return (
                <motion.div
                  key={mission.id}
                  id={`mission-${mission.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
                    highlightedId === mission.id
                      ? "border-orange-400 ring-2 ring-orange-300"
                      : "border-orange-200"
                  }`}
                >

                  <div className="p-4 md:p-5 border-b border-orange-100 flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0 border border-orange-100">
                      <FileEdit className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3" /> {t("dashboard", "missionsPostedOn", { date: new Date(mission.created_at).toLocaleDateString(dateLocale) })}
                      </span>
                      <h3 className={`${STUDENT_TEXT.cardTitle} leading-snug mb-1`} style={{ color: BRAND.blue }}>{mission.title}</h3>
                      {mission.description && <p className="text-sm text-neutral-600 leading-relaxed font-medium">{mission.description}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formats.map((f) => (
                          <span key={f} className="text-[9px] font-bold uppercase tracking-wide text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                            {f === "text" ? t("dashboard", "missionsFormatText") : f === "file" ? t("dashboard", "missionsFormatFile") : f === "audio" ? t("dashboard", "missionsFormatAudio") : t("dashboard", "missionsFormatVideo")}
                          </span>
                        ))}
                      </div>
                      {mission.attachment_url && (
                        <a href={mission.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                          <Paperclip className="w-3.5 h-3.5" /> {mission.attachment_name || t("dashboard", "missionsAttachment")}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-4 md:p-5 bg-orange-50/30">
                    <h4 className="text-xs font-semibold mb-3" style={{ color: BRAND.blue }}>{t("dashboard", "missionsYourWork")}</h4>
                    {allowText && (
                      <textarea
                        placeholder={t("dashboard", "missionsAnswerPlaceholder")}
                        className="w-full h-28 bg-white border border-orange-200 rounded-lg p-3 text-sm text-neutral-700 outline-none focus:border-orange-400 transition-colors resize-none mb-3"
                        value={answerText[mission.id] || ""}
                        onChange={(e) => setAnswerText(prev => ({ ...prev, [mission.id]: e.target.value }))}
                      />
                    )}

                    {/* Fichier attaché */}
                    {attachedFile[mission.id] && (
                      <div className="flex items-center gap-2 mb-4 bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-xl text-sm">
                        <Paperclip className="w-4 h-4 text-[#eb670e] shrink-0" />
                        <span className="text-orange-900 font-bold flex-1 truncate">{attachedFile[mission.id]!.name}</span>
                        <button onClick={() => handleFileChange(mission.id, null)} className="text-orange-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 shadow-sm">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-t border-orange-100 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {allowFile && (
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-orange-200 px-3 py-2 rounded-lg hover:border-orange-400 transition-colors cursor-pointer">
                            <UploadCloud className="w-4 h-4" /> {t("dashboard", "missionsFormatFile")}
                            <input type="file" accept=".pdf,image/*,.doc,.docx,.txt" className="hidden" onClick={(e) => (e.currentTarget.value = '')} onChange={(e) => handleFileChange(mission.id, e.target.files?.[0] || null)} />
                          </label>
                        )}

                        {allowAudio && (
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-orange-200 px-3 py-2 rounded-lg hover:border-orange-400 transition-colors cursor-pointer">
                            <Mic className="w-4 h-4 text-rose-500" /> {t("dashboard", "missionsFormatAudio")}
                            <input type="file" accept="audio/*" capture="user" className="hidden" onClick={(e) => (e.currentTarget.value = '')} onChange={(e) => handleFileChange(mission.id, e.target.files?.[0] || null)} />
                          </label>
                        )}

                        {allowVideo && (
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-orange-200 px-3 py-2 rounded-lg hover:border-orange-400 transition-colors cursor-pointer">
                            <Video className="w-4 h-4 text-blue-500" /> {t("dashboard", "missionsFormatVideo")}
                            <input type="file" accept="video/*" capture="environment" className="hidden" onClick={(e) => (e.currentTarget.value = '')} onChange={(e) => handleFileChange(mission.id, e.target.files?.[0] || null)} />
                          </label>
                        )}

                        {!allowAnyMedia && !allowText && (
                          <p className="text-xs text-amber-600">{t("dashboard", "missionsNoFormat")}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleSubmit(mission)}
                        disabled={!canSubmit || submitting[mission.id]}
                        className="w-full lg:w-auto min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submitting[mission.id] ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> {t("dashboard", "missionsSending")}</>
                        ) : (
                          <>{t("dashboard", "missionsSubmit")} <Send className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
                );
              })}

              {/* ── CORRIGÉS ── */}
              {activeTab === "done" && missionsDone.length === 0 && (
                <motion.div key="empty-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14 bg-white rounded-xl border border-dashed border-orange-200">
                  <AlertCircle className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">{t("dashboard", "missionsNoGraded")}</p>
                </motion.div>
              )}

              {activeTab === "done" && missionsDone.map((mission) => {
                const sub = submissions[mission.id];
                const corr = sub?.correction as Correction | null;
                const isExpanded = expandedCorrection[mission.id];

                return (
                  <motion.div
                    key={mission.id}
                    id={`mission-${mission.id}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
                      highlightedId === mission.id
                        ? "border-orange-400 ring-2 ring-orange-300"
                        : "border-orange-200"
                    }`}
                  >

                    <div className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className={`${STUDENT_TEXT.cardTitle} mb-0.5`} style={{ color: BRAND.blue }}>{mission.title}</h3>
                          <p className="text-xs text-neutral-500 font-medium">{t("dashboard", "missionsSubmittedOn", { date: new Date(sub.created_at).toLocaleDateString(dateLocale) })}</p>
                        </div>
                      </div>

                      {corr ? (
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${ScoreBg(corr.note)}`}>
                            <div className="text-center">
                              <span className={`text-3xl font-black ${ScoreColor(corr.note)}`}>{corr.note}</span>
                              <span className="text-neutral-400 text-sm font-bold">/20</span>
                            </div>
                            <div>
                              <p className={`text-sm font-black ${ScoreColor(corr.note)}`}>{corr.niveau}</p>
                              <div className="flex gap-0.5 mt-0.5">
                                {[1,2,3,4,5].map(i => (
                                  <Star key={i} className={`w-3 h-3 ${corr.note / 4 >= i ? "text-amber-400 fill-amber-400" : "text-neutral-200"}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          {mission.rank && mission.rank_total && mission.rank_total > 1 && (
                            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black">
                              <Trophy className="w-4 h-4" />
                              {mission.rank === 1
                                ? t("dashboard", "missionsRankFirst", { total: mission.rank_total })
                                : t("dashboard", "missionsRankNth", { rank: mission.rank, total: mission.rank_total })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                          {t("dashboard", "missionsCorrectionPending")}
                        </span>
                      )}
                    </div>

                    {corr && (
                      <>
                        <div className="px-6 md:px-8 pb-4">
                          <p className="text-sm text-neutral-600 leading-relaxed bg-neutral-50 border border-neutral-200 rounded-2xl p-4 italic font-medium">
                            "{corr.commentaire_global}"
                          </p>
                        </div>

                        <button
                          onClick={() => setExpandedCorrection(prev => ({ ...prev, [mission.id]: !isExpanded }))}
                          className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-orange-100 text-xs font-semibold text-neutral-500 hover:text-orange-600 hover:bg-orange-50/50 transition-colors"
                        >
                          {isExpanded ? <><ChevronUp className="w-4 h-4" /> {t("dashboard", "missionsHideDetail")}</> : <><ChevronDown className="w-4 h-4" /> {t("dashboard", "missionsShowCorrection")}</>}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-6 md:px-8 pb-8 space-y-6 border-t border-neutral-100 pt-6">

                                {corr.erreurs?.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3">{t("dashboard", "missionsPointsToFix")}</p>
                                    <div className="space-y-3">
                                      {corr.erreurs.map((err, i) => (
                                        <div key={i} className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4">
                                          <p className="text-xs font-black text-red-500 mb-1">{t("dashboard", "missionsFault")}</p>
                                          <p className="text-sm text-neutral-700 mb-2 line-through decoration-red-300">{err.faute}</p>
                                          <p className="text-xs font-black text-emerald-600 mb-1">{t("dashboard", "missionsCorrection")}</p>
                                          <p className="text-sm text-emerald-700 font-medium mb-2">{err.correction}</p>
                                          <p className="text-xs text-neutral-500 italic">{err.explication}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {corr.version_ideale && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">{t("dashboard", "missionsIdealVersion")}</p>
                                    <div className="bg-blue-50 border border-blue-200/60 rounded-2xl p-4">
                                      <p className="text-sm text-neutral-700 leading-relaxed font-medium">{corr.version_ideale}</p>
                                    </div>
                                  </div>
                                )}

                                {corr.conseil_coach && (
                                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: BRAND.orange }}>{t("dashboard", "missionsCoachTip")}</p>
                                    <p className="text-sm text-neutral-700 leading-relaxed">{corr.conseil_coach}</p>
                                  </div>
                                )}

                                {sub.file_url && (
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t("dashboard", "missionsAttachedFile")}</p>
                                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm font-bold text-[#eb670e] bg-orange-50 border border-orange-200 px-4 py-3 rounded-xl hover:bg-orange-100 transition-colors w-fit">
                                      <FileText className="w-4 h-4" /> {sub.file_name || t("dashboard", "missionsSeeFile")}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </motion.div>
                );
              })}

            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      }
    >
      <MissionsPageContent />
    </Suspense>
  );
}