"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Headphones, ImageIcon, RefreshCcw, Send, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { encryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

type SupportMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  image_url?: string | null;
  created_at: string;
  read_at: string | null;
  sender?: "guest" | "admin";
  sender_user_id?: string | null;
  sender_name?: string | null;
};

function formatTime(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getImageUrlFromMessage(msg: SupportMessage) {
  if (msg.image_url) return msg.image_url;
  return msg.message.match(/Image jointe\s*:\s*(https?:\/\/\S+)/)?.[1] || null;
}

const BOT_MARKER = String.fromCharCode(0x200b); // zero-width space (marqueur bot)

function getMessageTextWithoutImageLink(message: string) {
  const m = (message || "").startsWith(BOT_MARKER) ? message.slice(BOT_MARKER.length) : message;
  return m
    .replace(/\n*\s*Image jointe\s*:\s*https?:\/\/\S+\s*/g, "")
    .trim();
}

function isBotMessage(message: string) {
  return (message || "").startsWith(BOT_MARKER);
}

export default function SupportPage() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const [user, setUser] = useState<any>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestConversationStarted, setGuestConversationStarted] = useState(false);
  const [isCenterUser, setIsCenterUser] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async (uid: string, centerUser = isCenterUser) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: true });

    const rows = (data || []).filter((msg: SupportMessage) => msg.from_user_id === uid || msg.to_user_id === uid);
    const decrypted = await decryptRows(rows, () => ({ kind: "support", studentId: uid }));
    setMessages(decrypted);

    const adminIds = [...new Set(rows
      .filter((msg: SupportMessage) => msg.from_user_id !== uid)
      .map((msg: SupportMessage) => msg.from_user_id)
    )];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, prenom")
        .in("id", adminIds);
      const fallback = centerUser ? t("dashboard", "supportCenterDefaultAgent") : t("dashboard", "supportDefaultAgent");
      setAdminNames(Object.fromEntries((profiles || []).map((p: any) => [p.id, p.prenom || fallback])));
    } else {
      setAdminNames({});
    }

    const unread = rows.some((msg) => msg.to_user_id === uid && !msg.read_at);
    if (unread) {
      await supabase
        .from("support_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("to_user_id", uid)
        .is("read_at", null);
    }
  };

  const fetchGuestMessages = async (token: string) => {
    const res = await fetch(`/api/support/guest?token=${encodeURIComponent(token)}`);
    const json = await res.json();
    setMessages(json.messages || []);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const storedToken = localStorage.getItem("iag_guest_support_token") || crypto.randomUUID();
        localStorage.setItem("iag_guest_support_token", storedToken);
        setGuestToken(storedToken);
        setGuestName("");
        setGuestEmail("");
        setMessages([]);
        setLoading(false);
        return;
      }

      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, center_id")
        .eq("id", session.user.id)
        .single();

      setIsCenterUser(Boolean(profile?.center_id));

      if (profile?.role === "superadmin") {
        router.push("/superadmin/support");
        return;
      }

      if (profile?.role === "admin") {
        router.push("/admin?tab=support");
        return;
      }

      const isCenter = Boolean(profile?.center_id);
      const adminIdUrl = isCenter
        ? "/api/messages/admin-id"
        : "/api/messages/admin-id?scope=iag-support";
      const res = await fetch(adminIdUrl, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.adminId) setAdminId(json.adminId);

      await supabase
        .from("profiles")
        .update({ current_activity: isCenter ? "Support centre" : "Support client" })
        .eq("id", session.user.id);

      await fetchMessages(session.user.id, isCenter);
      setLoading(false);
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("support_student_" + user.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `to_user_id=eq.${user.id}`,
      }, () => fetchMessages(user.id))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!guestToken || user || !guestConversationStarted) return;
    const interval = setInterval(() => {
      fetchGuestMessages(guestToken);
    }, 5000);
    return () => clearInterval(interval);
  }, [guestToken, user, guestConversationStarted, guestEmail]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = url.split("/").pop()?.split("?")[0] || "piece-jointe.png";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const uploadSupportImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/support/upload", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || t("dashboard", "supportUploadError"));
    return json.url as string;
  };

  const handleImageChange = (file: File | null) => {
    setSelectedImage(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if ((!msg && !selectedImage) || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const imageUrl = selectedImage ? await uploadSupportImage(selectedImage) : null;

      if (selectedImage && !imageUrl) {
        throw new Error("L'image n'a pas ete envoyee. Reessayez.");
      }

      if (user && adminId) {
        const messageWithFallback = imageUrl
          ? `${msg}${msg ? "\n\n" : ""}Image jointe : ${imageUrl}`
          : msg;
        const encMsg = await encryptMessage(messageWithFallback, { kind: "support", studentId: user.id });
        const { data: inserted, error } = await supabase.from("support_messages").insert([{
          from_user_id: user.id,
          to_user_id: adminId,
          message: encMsg,
          image_url: imageUrl,
        }]).select("id, image_url").single();
        if (error) throw new Error(error.message);
        if (imageUrl && inserted?.image_url !== imageUrl) {
          throw new Error("Le message est parti mais l'image n'a pas ete enregistree. Verifiez la colonne image_url dans Supabase.");
        }
        await fetchMessages(user.id);
        // Bot B2C uniquement — le support centre part vers le suivi réseau, sans mélange.
        if (!isCenterUser) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              setBotTyping(true);
              fetch("/api/support/bot", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
                .then(() => fetchMessages(user.id))
                .catch(() => {})
                .finally(() => setBotTyping(false));
            }
          } catch { setBotTyping(false); }
        }
      } else if (guestToken) {
        setBotTyping(true);
        const res = await fetch("/api/support/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: guestToken, guestName, guestEmail, message: msg, imageUrl }),
        });
        const json = await res.json();
        if (!res.ok) { setBotTyping(false); throw new Error(json.error || t("dashboard", "supportMessageError")); }
        setGuestConversationStarted(true);
        await fetchGuestMessages(guestToken);
        setBotTyping(false);
      }

      setInput("");
      handleImageChange(null);
    } catch (error: any) {
      setSendError(error?.message || t("dashboard", "supportUploadError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] h-[calc(100dvh-70px-env(safe-area-inset-bottom,0px))] md:h-[100dvh] bg-[#FFFBF7] text-neutral-900 flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200 shrink-0">
        <div className="nexa-student-shell py-3 md:py-4 flex items-center gap-3">
          <button
            onClick={() => router.push(user ? "/dashboard" : "/login")}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
            aria-label={t("dashboard", "supportBack")}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className={`${STUDENT_TEXT.pageTitle} leading-tight truncate`} style={{ color: BRAND.blue }}>{t("dashboard", "supportTitle")}</p>
            <p className={`${STUDENT_TEXT.subtitle} truncate`}>
              {user
                ? (isCenterUser ? t("dashboard", "supportCenterSubtitle") : t("dashboard", "supportUserSubtitle"))
                : t("dashboard", "supportGuestSubtitle")}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-5">
        <div className="nexa-student-shell space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
              <RefreshCcw className="w-4 h-4 animate-spin" />
              <span className="text-sm font-bold">{t("dashboard", "supportLoading")}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto border border-blue-100 mb-4">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
              <p className="font-black text-slate-800">{t("dashboard", "supportNeedHelp")}</p>
              <p className="text-sm text-slate-400 mt-1">{isCenterUser ? t("dashboard", "supportCenterEmptyBody") : t("dashboard", "supportEmptyBody")}</p>
            </div>
          ) : messages.map((msg, i) => {
            const isMe = user ? msg.from_user_id === user.id : msg.sender === "guest";
            const bot = !isMe && isBotMessage(msg.message || "");
            const rawResponder = msg.sender_name || (msg.from_user_id ? adminNames[msg.from_user_id] : null) || t("dashboard", "supportDefaultAgent");
            const responderName = !isMe
              ? (bot ? t("dashboard", "supportAssistant") : `${rawResponder} (${t("dashboard", "supportAgentSuffix")})`)
              : null;
            const imageUrl = getImageUrlFromMessage(msg);
            const messageText = getMessageTextWithoutImageLink(msg.message || "");
            const prev = messages[i - 1];
            const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[92%] sm:max-w-[85%] md:max-w-[70%] xl:max-w-[65%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {responderName && (
                      <p className="mb-1 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {responderName}
                      </p>
                    )}
                    <div className={`w-fit max-w-full px-5 py-3.5 text-sm font-medium leading-relaxed shadow-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-[1.5rem] rounded-br-sm"
                      : "bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] rounded-bl-sm"
                  }`}>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => downloadImage(imageUrl)}
                        className="mb-2 block w-full overflow-hidden rounded-2xl border border-black/5 bg-white/10 text-left transition-opacity hover:opacity-90"
                      >
                        <img
                          src={imageUrl}
                          alt={t("dashboard", "supportImageAlt")}
                          className="block max-h-72 w-auto max-w-[min(280px,70vw)] object-contain"
                        />
                        <span className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                          <ImageIcon className="w-3 h-3" /> {t("dashboard", "supportDownloadImage")}
                        </span>
                      </button>
                    )}
                    {messageText && <p>{messageText}</p>}
                    <p className={`text-[10px] mt-1 ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                      {formatTime(msg.created_at, dateLocale)}{isMe && msg.read_at ? ` · ${t("dashboard", "supportRead")}` : ""}
                    </p>
                  </div>
                  </div>
                </div>
              </div>
            );
          })}
          {botTyping && (
            <div className="flex justify-start">
              <div className="flex flex-col items-start">
                <p className="mb-1 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400">{t("dashboard", "supportAssistant")}</p>
                <div className="bg-white border border-slate-200 rounded-[1.5rem] rounded-bl-sm px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="bg-white/85 backdrop-blur-xl border-t border-slate-200 p-4 shrink-0">
        {!user && (
          <div className="nexa-student-shell grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t("dashboard", "supportGuestName")}
              className="h-11 rounded-2xl bg-slate-100 border-2 border-slate-100 focus:border-blue-500 focus:bg-white outline-none px-4 text-sm font-medium transition-colors"
            />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder={t("dashboard", "supportGuestEmail")}
              className="h-11 rounded-2xl bg-slate-100 border-2 border-slate-100 focus:border-blue-500 focus:bg-white outline-none px-4 text-sm font-medium transition-colors"
            />
          </div>
        )}
        {imagePreview && (
          <div className="nexa-student-shell mb-3 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-2">
            <img src={imagePreview} alt={t("dashboard", "supportPreviewAlt")} className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-slate-800">{selectedImage?.name}</p>
              <p className="text-[10px] font-semibold text-slate-400">{t("dashboard", "supportImageReady")}</p>
            </div>
            <button type="button" onClick={() => handleImageChange(null)} className="rounded-full bg-white p-2 text-slate-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {sendError && (
          <div className="nexa-student-shell mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {sendError}
          </div>
        )}
        <div className="nexa-student-shell flex items-center gap-3">
          <label className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors shrink-0">
            <ImageIcon className="w-5 h-5" />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
              disabled={sending}
            />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t("dashboard", "supportInputPlaceholder")}
            className="flex-1 min-h-[44px] h-14 rounded-full bg-slate-100 border-2 border-slate-100 focus:border-blue-500 focus:bg-white outline-none px-6 text-sm font-medium transition-colors"
            disabled={sending || (!!user && !adminId)}
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && !selectedImage) || sending || (!!user && !adminId)}
            className="min-w-[44px] min-h-[44px] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0"
          >
            {sending ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </footer>
    </div>
  );
}
