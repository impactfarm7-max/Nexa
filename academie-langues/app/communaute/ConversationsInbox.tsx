"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, ChevronLeft, RefreshCcw, MessageCircle } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { encryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
import { useI18n } from "@/app/i18n/I18nProvider";

type Conversation = {
  otherId: string;
  prenom: string;
  role: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

type MessageableUser = { id: string; prenom: string; role: string };

export default function ConversationsInbox({
  userId,
  centerId,
  initialOpenUserId,
  onUnreadCountChange,
}: {
  userId: string;
  centerId: string | null;
  initialOpenUserId?: string | null;
  onUnreadCountChange?: (count: number) => void;
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeOtherId, setActiveOtherId] = useState<string | null>(null);
  const [activeOtherInfo, setActiveOtherInfo] = useState<MessageableUser | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [messageableUsers, setMessageableUsers] = useState<MessageableUser[]>([]);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!data) {
      setLoadingList(false);
      return;
    }

    const decrypted = await decryptRows(data, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));

    const map = new Map<string, Conversation>();
    for (const m of decrypted) {
      const otherId = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
      const existing = map.get(otherId);
      if (!existing) {
        map.set(otherId, {
          otherId,
          prenom: "",
          role: "",
          lastMessage: m.message,
          lastAt: m.created_at,
          unread: m.to_user_id === userId && !m.read_at ? 1 : 0,
        });
      } else if (m.to_user_id === userId && !m.read_at) {
        existing.unread += 1;
      }
    }

    const ids = Array.from(map.keys());
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, prenom, role").in("id", ids);
      for (const p of profiles || []) {
        const c = map.get(p.id);
        if (c) {
          c.prenom = p.prenom || t("dashboard", "communauteDefaultUser");
          c.role = p.role;
        }
      }
    }

    const list = Array.from(map.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    setConversations(list);
    onUnreadCountChange?.(list.reduce((sum, c) => sum + c.unread, 0));
    setLoadingList(false);
  }, [userId, onUnreadCountChange]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchThread = useCallback(async (otherId: string) => {
    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: true });
    const filtered = (data || []).filter(
      (m: any) => (m.from_user_id === userId && m.to_user_id === otherId) || (m.from_user_id === otherId && m.to_user_id === userId)
    );
    const decrypted = await decryptRows(filtered, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));
    setThreadMessages(decrypted);

    const hasUnread = filtered.some((m: any) => m.to_user_id === userId && !m.read_at);
    if (hasUnread) {
      await supabase.from("private_messages").update({ read_at: new Date().toISOString() }).eq("to_user_id", userId).eq("from_user_id", otherId).is("read_at", null);
      fetchConversations();
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [userId, fetchConversations]);

  // Realtime : nouveaux messages entrants
  useEffect(() => {
    const ch = supabase
      .channel(`inbox_${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `to_user_id=eq.${userId}` }, (payload) => {
        if (activeOtherId && activeOtherId === payload.new.from_user_id) fetchThread(activeOtherId);
        else fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, activeOtherId, fetchConversations, fetchThread]);

  const openConversation = useCallback(async (otherId: string, info?: MessageableUser) => {
    setActiveOtherId(otherId);
    setPickerOpen(false);
    if (info) {
      setActiveOtherInfo(info);
    } else {
      const conv = conversations.find((c) => c.otherId === otherId);
      if (conv) {
        setActiveOtherInfo({ id: otherId, prenom: conv.prenom, role: conv.role });
      } else {
        const { data } = await supabase.from("profiles").select("id, prenom, role").eq("id", otherId).single();
        setActiveOtherInfo(data ? { id: data.id, prenom: data.prenom || t("dashboard", "communauteDefaultUser"), role: data.role } : null);
      }
    }
    await fetchThread(otherId);
  }, [conversations, fetchThread]);

  // Ouverture forcée depuis l'extérieur (ex: clic "Message privé" sur un message de salle)
  useEffect(() => {
    if (initialOpenUserId) openConversation(initialOpenUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenUserId]);

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || !activeOtherId || sending) return;
    setSending(true);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const enc = await encryptMessage(msg, { kind: "private", userA: userId, userB: activeOtherId });
    await supabase.from("private_messages").insert([{ from_user_id: userId, to_user_id: activeOtherId, message: enc, center_id: centerId }]);
    await fetchThread(activeOtherId);
    await fetchConversations();
    setSending(false);
  };

  const openPicker = async () => {
    setPickerOpen(true);
    const { data: myRooms } = await supabase.from("community_room_members").select("room_id").eq("user_id", userId);
    const roomIds = (myRooms || []).map((r: any) => r.room_id);
    if (!roomIds.length) {
      setMessageableUsers([]);
      return;
    }
    const { data: members } = await supabase
      .from("community_room_members")
      .select("user_id, profiles:user_id(prenom, role)")
      .in("room_id", roomIds)
      .neq("user_id", userId);
    const map = new Map<string, MessageableUser>();
    for (const m of members || []) {
      const p: any = m.profiles;
      if (p) map.set(m.user_id, { id: m.user_id, prenom: p.prenom || t("dashboard", "communauteDefaultUser"), role: p.role });
    }
    setMessageableUsers(Array.from(map.values()).sort((a, b) => a.prenom.localeCompare(b.prenom)));
  };

  const filteredUsers = messageableUsers.filter((u) => u.prenom.toLowerCase().includes(search.toLowerCase()));
  const isProfessor = (role: string) => ["admin", "trainer", "center_manager"].includes(role);

  // ===================== VUE FIL (thread actif) =====================
  if (activeOtherId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <button onClick={() => setActiveOtherId(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-600 text-xs shrink-0">
            {activeOtherInfo?.prenom?.charAt(0) || "?"}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{activeOtherInfo?.prenom || t("dashboard", "communauteConversation")}</p>
            {activeOtherInfo && isProfessor(activeOtherInfo.role) && (
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{t("dashboard", "communauteProfessor")}</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {threadMessages.map((msg, i) => {
            const isMe = msg.from_user_id === userId;
            const prev = threadMessages[i - 1];
            const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center my-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? "bg-slate-900 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                    <p className="leading-relaxed">{msg.message}</p>
                    <p className="text-[10px] mt-1 text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                      {isMe && msg.read_at && <span className="ml-1">· {t("dashboard", "messagesReadIndicator")}</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-end gap-3 shrink-0 bg-white">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t("dashboard", "communauteMessageTo", { name: activeOtherInfo?.prenom || "" })}
            className="flex-1 bg-slate-100 rounded-3xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 resize-none overflow-y-auto"
            style={{ maxHeight: "200px", minHeight: "40px" }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending} className="w-10 h-10 bg-slate-900 disabled:opacity-40 rounded-full flex items-center justify-center shrink-0">
            {sending ? <RefreshCcw size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
          </button>
        </div>
      </div>
    );
  }

  // ===================== VUE PICKER (nouvelle conversation) =====================
  if (pickerOpen) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <button onClick={() => setPickerOpen(false)} className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
            <ChevronLeft size={18} />
          </button>
          <p className="font-bold text-slate-900 text-sm">{t("dashboard", "communauteNewConversation")}</p>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("dashboard", "communauteSearchEllipsis")} className="flex-1 bg-transparent outline-none text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10 font-medium px-6">{t("dashboard", "communauteNoSharedContacts")}</p>
          ) : (
            filteredUsers.map((u) => (
              <button key={u.id} onClick={() => openConversation(u.id, u)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b border-slate-50">
                <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-600 text-xs">
                  {u.prenom.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{u.prenom}</p>
                  {isProfessor(u.role) && <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{t("dashboard", "communauteProfessor")}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ===================== VUE LISTE (inbox) =====================
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="font-bold text-slate-900 text-sm">{t("dashboard", "communautePrivateMessages")}</p>
        <button onClick={openPicker} className="p-2 bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100">
          <MessageCircle size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loadingList ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <RefreshCcw size={16} className="animate-spin" />
            <span className="text-sm">{t("centre", "communityLoading")}</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 space-y-3 px-6">
            <MessageCircle size={32} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">{t("dashboard", "communauteNoConversations")}</p>
            <button onClick={openPicker} className="text-xs font-bold text-orange-600">{t("dashboard", "communauteStartConversation")}</button>
          </div>
        ) : (
          conversations.map((c) => (
            <button key={c.otherId} onClick={() => openConversation(c.otherId)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 text-left border-b border-slate-50">
              <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-600 text-sm shrink-0">
                {c.prenom.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">{c.prenom}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(c.lastAt).toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit" })}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0">
                  {c.unread > 9 ? "9+" : c.unread}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}