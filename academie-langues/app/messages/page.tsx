"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, ShieldCheck, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { encryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

type PrivateMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " - " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [conversationName, setConversationName] = useState("NEXA");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCenterRoute = pathname?.startsWith("/centre/");

  const fetchMessages = async (uid: string, scopeCenterId: string | null = centerId) => {
    let query = supabase
      .from("private_messages")
      .select("*")
      .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
      .order("created_at", { ascending: true });
    query = scopeCenterId ? query.eq("center_id", scopeCenterId) : query.is("center_id", null);

    const { data } = await query;

    if (data) {
      const decrypted = await decryptRows(data, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));
      setMessages(decrypted);

      let readQuery = supabase
        .from("private_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("to_user_id", uid)
        .is("read_at", null);
      readQuery = scopeCenterId ? readQuery.eq("center_id", scopeCenterId) : readQuery.is("center_id", null);
      await readQuery;
    }
  };

  const fetchAdminId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const res = await fetch("/api/messages/admin-id", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return {
        adminId: json.adminId as string,
        centerId: (json.centerId as string | null) || null,
        centerName: (json.centerName as string) || "NEXA",
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const context = await fetchAdminId();
      if (context) {
        setAdminId(context.adminId);
        setCenterId(context.centerId);
        setConversationName(context.centerName);
        await fetchMessages(session.user.id, context.centerId);
      } else {
        await fetchMessages(session.user.id, null);
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    let channel: any;
    let pollInterval: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const setupListener = () => {
      channel = supabase
        .channel("pm_student_" + userId)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `to_user_id=eq.${userId}`,
        }, (payload) => {
          const rowCenterId = (payload.new as any)?.center_id || null;
          if (rowCenterId === centerId) fetchMessages(userId, centerId);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = null;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            if (!pollInterval && isSubscribed) {
              pollInterval = setInterval(() => fetchMessages(userId, centerId), 5000);
            }
          }
        });
    };

    setupListener();
    return () => {
      isSubscribed = false;
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [userId, centerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoExpandTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    autoExpandTextarea();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = newMessage.trim();
    if (!msg || !userId || sending) return;

    let aId = adminId;
    let messageCenterId = centerId;
    if (!aId) {
      const adminFromHistory = messages.find((m) => m.from_user_id !== userId);
      if (adminFromHistory) {
        aId = adminFromHistory.from_user_id;
      } else {
        const context = await fetchAdminId();
        if (!context?.adminId) return alert("Impossible de contacter le support pour l'instant.");
        aId = context.adminId;
        messageCenterId = context.centerId;
        setCenterId(context.centerId);
        setConversationName(context.centerName);
      }
      setAdminId(aId);
    }

    setSending(true);
    setNewMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const enc = await encryptMessage(msg, { kind: "private", userA: userId, userB: aId });
    await supabase.from("private_messages").insert([{
      from_user_id: userId,
      to_user_id: aId,
      message: enc,
      center_id: messageCenterId,
    }]);
    await fetchMessages(userId, messageCenterId);
    setSending(false);
  };

  return (
    <div className="min-h-[100dvh] h-[calc(100dvh-70px-env(safe-area-inset-bottom,0px))] md:h-[100dvh] bg-[#FFFBF7] text-neutral-900 flex flex-col overflow-x-hidden">
      <div className="nexa-student-shell bg-white border-b border-neutral-200 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm shrink-0">
        <Link href="/dashboard" className="min-w-[44px] min-h-[44px] p-2 -ml-1 text-neutral-500 hover:text-neutral-900 transition-colors flex items-center justify-center">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>{conversationName}</p>
          <p className={STUDENT_TEXT.subtitle}>Support & Accompagnement</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto nexa-student-shell py-4 space-y-3 pb-28 md:pb-24">
        {loading ? (
          <div className="flex items-center justify-center mt-16 gap-2 text-neutral-400">
            <RefreshCcw size={16} className="animate-spin" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center mt-16 space-y-4 px-6">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto border border-orange-100">
              <ShieldCheck size={28} className="text-orange-500" />
            </div>
            <p className="font-bold text-neutral-700">Aucun message pour l&apos;instant</p>
            <p className="text-sm text-neutral-400">Envoie un message au support. On te repond rapidement.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.from_user_id === userId;
            const prevMsg = messages[i - 1];
            const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-3">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0 mb-5">
                      <ShieldCheck size={12} className="text-orange-500" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[92%] sm:max-w-[85%] md:max-w-[75%] xl:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`px-5 py-3 rounded-2xl text-sm shadow-sm min-w-[60px] ${
                      isMe
                        ? "bg-orange-500 text-white rounded-br-sm"
                        : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm"
                    }`}>
                      <p className="leading-relaxed">{msg.message}</p>
                    </div>
                    <p className="text-[10px] px-1 text-neutral-400">
                      {formatTime(msg.created_at)}
                      {isMe && msg.read_at && <span className="ml-1"> - Lu</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="fixed left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl bottom-[calc(70px+env(safe-area-inset-bottom,0px))] md:bottom-0 bg-white border-t border-neutral-200 nexa-student-shell py-3 flex items-end gap-3 z-30"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <textarea
          ref={textareaRef}
          value={newMessage}
          onChange={handleMessageChange}
          placeholder="Ecrire un message..."
          rows={1}
          className="flex-1 bg-neutral-100 rounded-3xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400/30 text-neutral-800 transition resize-none overflow-y-auto"
          disabled={sending}
          style={{ maxHeight: "200px", minHeight: "44px" }}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="min-w-[44px] min-h-[44px] w-11 h-11 bg-orange-500 disabled:opacity-40 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-md shadow-orange-500/20"
        >
          {sending ? <RefreshCcw size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
        </button>
      </form>
    </div>
  );
}
