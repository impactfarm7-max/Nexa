"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Headphones,
  ImageIcon,
  Loader2,
  RefreshCcw,
  Send,
  X,
} from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";

type Conversation = {
  student_id: string;
  prenom: string;
  email: string | null;
  center_id: string | null;
  center_name: string | null;
  last_message: string;
  last_at: string;
  unread: number;
};

type SupportMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  image_url?: string | null;
  created_at: string;
  read_at: string | null;
  is_bot?: boolean;
};

type StudentInfo = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  center_id: string | null;
  center_name: string | null;
};

function formatTime(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getImageUrlFromMessage(msg: SupportMessage) {
  if (msg.image_url) return msg.image_url;
  return msg.message.match(/Image jointe\s*:\s*(https?:\/\/\S+)/)?.[1] || null;
}

function getMessageTextWithoutImageLink(message: string) {
  return (message || "")
    .replace(/\n*\s*Image jointe\s*:\s*https?:\/\/\S+\s*/g, "")
    .trim();
}

export default function SuperadminSupportPage() {
  const { t, locale } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ conversations: Conversation[] }>("/api/superadmin/support");
      setConversations(json.conversations || []);
    } catch (e: any) {
      setError(e.message || t("superadmin", "supportLoadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const openThread = useCallback(async (studentId: string) => {
    setSelectedId(studentId);
    setThreadLoading(true);
    setSendError(null);
    try {
      const json = await superadminFetch<{ student: StudentInfo; messages: SupportMessage[] }>(
        `/api/superadmin/support?studentId=${encodeURIComponent(studentId)}`
      );
      setStudent(json.student);
      setMessages(json.messages || []);
      setConversations((prev) =>
        prev.map((c) => (c.student_id === studentId ? { ...c, unread: 0 } : c))
      );
    } catch (e: any) {
      setSendError(e.message || t("superadmin", "supportLoadError"));
    } finally {
      setThreadLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageChange = (file: File | null) => {
    setSelectedImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadSupportImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/support/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || t("superadmin", "supportSendError"));
    return json.url as string;
  };

  const sendReply = async () => {
    if (!selectedId || (!input.trim() && !selectedImage) || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const imageUrl = selectedImage ? await uploadSupportImage(selectedImage) : null;
      await superadminFetch("/api/superadmin/support", {
        method: "POST",
        body: JSON.stringify({
          studentId: selectedId,
          message: input.trim(),
          imageUrl,
        }),
      });
      setInput("");
      handleImageChange(null);
      await openThread(selectedId);
      await loadConversations(true);
    } catch (e: any) {
      setSendError(e.message || t("superadmin", "supportSendError"));
    } finally {
      setSending(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">{t("superadmin", "supportTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("superadmin", "supportSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => loadConversations(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("superadmin", "supportRefresh")}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[22rem_1fr]">
        <section className="rounded-3xl border border-white/[0.08] bg-[#0b1120] overflow-hidden flex flex-col">
          <div className="border-b border-white/[0.07] px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "supportInbox")}
            </p>
            {totalUnread > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                {totalUnread}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("superadmin", "supportLoading")}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Headphones className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                <p className="text-sm font-bold text-slate-400">{t("superadmin", "supportEmpty")}</p>
                <p className="mt-1 text-xs text-slate-600">{t("superadmin", "supportEmptyHint")}</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.map((convo) => {
                  const active = selectedId === convo.student_id;
                  return (
                    <button
                      key={convo.student_id}
                      type="button"
                      onClick={() => openThread(convo.student_id)}
                      className={`w-full rounded-2xl p-3 text-left transition ${
                        active
                          ? "bg-orange-500/15 border border-orange-500/30"
                          : "border border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-sm font-black text-orange-300">
                          {(convo.prenom || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-white">{convo.prenom}</p>
                            {convo.unread > 0 && (
                              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                                {convo.unread}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[10px] font-semibold text-orange-300/80">
                            {convo.center_name || t("superadmin", "supportUnknownCenter")}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{convo.last_message}</p>
                        </div>
                        <p className="shrink-0 text-[10px] text-slate-600">{formatDay(convo.last_at, locale)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-[#0b1120] overflow-hidden flex flex-col min-h-[70vh]">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <Headphones className="mb-3 h-12 w-12 text-slate-700" />
              <p className="text-sm font-bold text-slate-400">{t("superadmin", "supportSelectThread")}</p>
            </div>
          ) : (
            <>
              <div className="border-b border-white/[0.07] px-4 py-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setStudent(null);
                    setMessages([]);
                  }}
                  className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white lg:hidden"
                  aria-label={t("superadmin", "supportBack")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">
                    {[student?.prenom, student?.nom].filter(Boolean).join(" ") || student?.email || "…"}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-slate-500">
                    {student?.center_name || t("superadmin", "supportUnknownCenter")}
                    {student?.email ? ` · ${student.email}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
                {threadLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("superadmin", "supportLoading")}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const fromStudent = msg.from_user_id === selectedId;
                    const imageUrl = getImageUrlFromMessage(msg);
                    const text = getMessageTextWithoutImageLink(msg.message);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${fromStudent ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            fromStudent
                              ? "bg-white/[0.05] border border-white/10 text-slate-200 rounded-tl-sm"
                              : "bg-orange-500 text-white rounded-tr-sm"
                          }`}
                        >
                          {msg.is_bot && (
                            <p className="mb-1 text-[10px] font-black uppercase tracking-wider opacity-70">
                              {t("superadmin", "supportBotLabel")}
                            </p>
                          )}
                          {text && <p className="whitespace-pre-wrap">{text}</p>}
                          {imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={t("superadmin", "supportImageAlt")}
                              className="mt-2 max-h-48 rounded-xl border border-white/10"
                            />
                          )}
                          <p className={`mt-1 text-[10px] ${fromStudent ? "text-slate-500" : "text-orange-100/70"}`}>
                            {formatTime(msg.created_at, locale)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-white/[0.07] p-4 space-y-2">
                {imagePreview && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <p className="flex-1 text-xs text-slate-400">{t("superadmin", "supportImageReady")}</p>
                    <button type="button" onClick={() => handleImageChange(null)} className="p-1 text-slate-500 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {sendError && (
                  <p className="text-xs font-semibold text-red-400">{sendError}</p>
                )}
                <div className="flex items-end gap-2">
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:text-white">
                    <ImageIcon className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                    rows={1}
                    placeholder={t("superadmin", "supportInputPlaceholder")}
                    className="min-h-[44px] max-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sending || (!input.trim() && !selectedImage)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
