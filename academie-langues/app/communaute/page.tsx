"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Send, Users, ShieldCheck, Lock, Trash2, Pencil, Pin, X, Check,
  ChevronDown, MessageCircle, Settings, Hash, GraduationCap, Megaphone, Search, PanelLeft, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import { useRooms, type CommunityRoom } from "./useRooms";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { useI18n } from "@/app/i18n/I18nProvider";

import RoomSettingsDrawer from "./RoomSettingsDrawer";
import ConversationsInbox from "./ConversationsInbox";
const EDIT_WINDOW_MS = 2 * 60 * 1000;
const PIN_DURATION_DAYS = [15, 30];

function isMessagePinned(msg: any) {
  if (!msg.pinned) return false;
  if (!msg.pinned_until) return true;
  return new Date(msg.pinned_until).getTime() > Date.now();
}

function sortMessages(rows: any[]) {
  return [...rows].sort((a, b) => {
    const aPinned = isMessagePinned(a);
    const bPinned = isMessagePinned(b);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    if (aPinned && bPinned) return new Date(b.pinned_at || b.created_at).getTime() - new Date(a.pinned_at || a.created_at).getTime();
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

// Empreinte legere d'une liste de messages : sert a detecter un vrai changement
// (ajout / edition / epinglage / suppression) sans re-render inutile lors du polling.
function messagesSignature(rows: any[]) {
  return rows.map((m) => `${m.id}:${m.edited ? 1 : 0}:${isMessagePinned(m) ? 1 : 0}`).join("|");
}

function formatTime(dateStr: string, locale = "fr") {
  return new Date(dateStr).toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr: string, locale = "fr", todayLabel: string, yesterdayLabel: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return todayLabel;
  if (d.toDateString() === yesterday.toDateString()) return yesterdayLabel;
  return d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function CommunauteContent() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCenterRoute = pathname?.startsWith("/centre/");

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerName, setCenterName] = useState("");
  const [centerType, setCenterType] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("student");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [userPrenom, setUserPrenom] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const { rooms, loading: roomsLoading, refetch: refetchRooms, regenerateInviteCode } = useRooms(user?.id || null);

  const isCenterStudent = !!centerId && userRole === "student";
  const isTcfCenterStudent = isCenterStudent && centerType === "tcf_canada";

  const visibleRooms = useMemo(() => {
    if (!isCenterStudent || !centerId) return rooms;
    return rooms.filter(
      (r) =>
        r.center_id === centerId &&
        (r.type === "announcement" || r.type === "classroom"),
    );
  }, [rooms, centerId, isCenterStudent]);

  const centerForumRooms = useMemo(
    () => visibleRooms.filter((r) => r.type === "announcement"),
    [visibleRooms],
  );
  const classroomRooms = useMemo(
    () => visibleRooms.filter((r) => r.type === "classroom"),
    [visibleRooms],
  );

  const [activeRoom, setActiveRoom] = useState<CommunityRoom | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [roomMemberRoles, setRoomMemberRoles] = useState<Record<string, string>>({});

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false);
  const [didApplyDeepLink, setDidApplyDeepLink] = useState(false);
  const [privateInboxOpen, setPrivateInboxOpen] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [repliedToMessage, setRepliedToMessage] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pinSubMenuMsgId, setPinSubMenuMsgId] = useState<string | null>(null);
  const [mobileRoomsOpen, setMobileRoomsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWithinEditWindow = useCallback((createdAt: string) => Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS, []);

  // ── Auth & profil ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");
      setUser(session.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, prenom, avatar_url, center_id, centers:center_id(name, center_type)")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserRole(profile.role || "student");
        if (profile.prenom) setUserPrenom(profile.prenom);
        setUserAvatarUrl((profile.avatar_url as string | null) || null);
        if ((profile.role === "center_manager" || profile.role === "campus_manager" || profile.role === "trainer" || profile.role === "staff" || profile.role === "manager") && !isCenterRoute) {
          router.replace("/centre/communaute");
          return;
        }
        if (profile.role === "admin") setIsAdmin(true);
        if (profile.center_id) {
          setCenterId(profile.center_id);
          const center = profile.centers as { name?: string; center_type?: string } | null;
          setCenterName(center?.name || t("dashboard", "communauteYourEstablishment"));
          setCenterType(center?.center_type || null);
        }
      }

      await supabase.from("profiles").update({ current_activity: t("dashboard", "communauteActivity") }).eq("id", session.user.id);
      logClientActivity("Ouverture communaute");

      setLoading(false);
    };
    init();
    return () => {
      if (user) supabase.from("profiles").update({ current_activity: null }).eq("id", user.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (didApplyDeepLink || roomsLoading) return;
    const roomParam = searchParams.get("room");
    const chParam = searchParams.get("channel");

    if (roomParam) {
      const r = visibleRooms.find((x) => x.id === roomParam);
      if (r) setActiveRoom(r);
    } else if (chParam === "general") {
      const announcementRoom = visibleRooms.find((r) => r.type === "announcement");
      if (announcementRoom) setActiveRoom(announcementRoom);
    } else if (visibleRooms.length > 0) {
      setActiveRoom(
        visibleRooms.find((r) => r.type === "announcement") || visibleRooms[0],
      );
    }
    setDidApplyDeepLink(true);
  }, [visibleRooms, roomsLoading, searchParams, didApplyDeepLink]);

  useEffect(() => {
    if (!activeRoom) return;
    if (!visibleRooms.some((r) => r.id === activeRoom.id)) {
      setActiveRoom(visibleRooms[0] ?? null);
    }
  }, [visibleRooms, activeRoom]);

  // ── Fetch des messages de la salle active ──
  // opts.silent : rafraichissement en arriere-plan (polling de secours) — pas de
  // spinner, pas de scroll force, et on ne met a jour l'etat que si les messages
  // ont reellement change (evite le clignotement toutes les 3 s).
  const fetchMessages = useCallback(async (roomId: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setMessagesLoading(true);

    const { data: memberRows } = await supabase.from("community_room_members").select("user_id, role").eq("room_id", roomId);
    const roleMap: Record<string, string> = {};
    for (const m of memberRows || []) roleMap[m.user_id] = m.role;
    setRoomMemberRoles(roleMap);

    const { data, error } = await supabase
      .from("community_messages")
      .select("*, profiles:user_id ( prenom, role, avatar_url )")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const withReplies = await Promise.all(
        data.map(async (msg: any) => {
          if (msg.replied_to_id) {
            const { data: parentData } = await supabase
              .from("community_messages")
              .select("id, message, user_id, created_at, profiles:user_id ( prenom, avatar_url )")
              .eq("id", msg.replied_to_id)
              .single();
            if (parentData) {
              return { ...msg, replied_to: parentData };
            }
          }
          return msg;
        })
      );
      const sorted = sortMessages(withReplies);
      if (silent) {
        // Ne re-render que si un message a ete ajoute / modifie / supprime.
        setMessages((prev) => (messagesSignature(prev) === messagesSignature(sorted) ? prev : sorted));
      } else {
        setMessages(sorted);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
    if (!silent) setMessagesLoading(false);
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    fetchMessages(activeRoom.id);

    let listener: any;
    let pollInterval: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    listener = supabase
      .channel(`room_messages_${activeRoom.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `room_id=eq.${activeRoom.id}` },
        async (payload) => {
          const { data: profileData } = await supabase.from("profiles").select("prenom, role, avatar_url").eq("id", payload.new.user_id).single();
          let newMsg: any = { ...payload.new, profiles: profileData || { prenom: t("centre", "communityUnknown"), role: "student", avatar_url: null } };
          if (payload.new.replied_to_id) {
            const { data: parentData } = await supabase
              .from("community_messages")
              .select("id, message, user_id, created_at, profiles:user_id ( prenom, avatar_url )")
              .eq("id", payload.new.replied_to_id)
              .single();
            if (parentData) {
              newMsg = { ...newMsg, replied_to: parentData };
            }
          }
          setMessages((prev) => sortMessages([...prev, newMsg]));
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_messages", filter: `room_id=eq.${activeRoom.id}` },
        async (payload) => {
          setMessages((prev) => sortMessages(prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new, profiles: m.profiles } : m))));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== payload.old.id)))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { if (pollInterval) clearInterval(pollInterval); pollInterval = null; }
        else if ((status === "CLOSED" || status === "CHANNEL_ERROR") && !pollInterval && isSubscribed) {
          pollInterval = setInterval(() => fetchMessages(activeRoom.id, { silent: true }), 3000);
        }
      });

    return () => {
      isSubscribed = false;
      if (listener) supabase.removeChannel(listener);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeRoom, fetchMessages]);

  // ── Permissions dérivées de la salle active ──
  const myRoomRole = activeRoom?.role;
  const isReadOnly = activeRoom?.type === "announcement" && myRoomRole === "member";
  const canModerateRoom = myRoomRole === "owner" || myRoomRole === "room_admin" || isAdmin;

  const autoExpandTextarea = () => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  };

  const handleTouchStart = (msgId: string) => { longPressTimer.current = setTimeout(() => setOpenMenuId(msgId), 500); };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  useEffect(() => {
    const close = () => { if (openMenuId) setOpenMenuId(null); };
    document.addEventListener("wheel", close, { passive: true });
    document.addEventListener("touchmove", close, { passive: true });
    return () => {
      document.removeEventListener("wheel", close);
      document.removeEventListener("touchmove", close);
    };
  }, [openMenuId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeRoom || isSending) return;
    setIsSending(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("community_messages").update({ message: newMessage.trim(), edited: true }).eq("id", editingId);
        if (!error) {
          setMessages((prev) => prev.map((m) => (m.id === editingId ? { ...m, message: newMessage.trim(), edited: true } : m)));
          logClientActivity("Message communaute modifie");
        } else alert(t("dashboard", "communauteEditError"));
        setEditingId(null);
      } else {
        const { error } = await supabase.from("community_messages").insert([{
          user_id: user.id,
          message: newMessage.trim(),
          room_id: activeRoom.id,
          center_id: activeRoom.center_id,
          replied_to_id: repliedToMessage?.id || null,
        }]);
    if (error) alert(`${t("dashboard", "communauteSendError")} : ${error.message}`);
        else logClientActivity("Message communaute envoye");
      }
      setNewMessage("");
      setRepliedToMessage(null);
      if (inputRef.current) inputRef.current.style.height = "auto";
    } finally {
      setIsSending(false);
    }
  };

  const startEdit = (msg: any) => {
    setOpenMenuId(null);
    setEditingId(msg.id);
    setNewMessage(msg.message);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(msg.message.length, msg.message.length); }, 50);
  };
  const cancelEdit = () => { setEditingId(null); setNewMessage(""); };

  const deleteMessage = async (messageId: string) => {
    setOpenMenuId(null);
    if (!window.confirm(t("centre", "communityDeleteConfirm"))) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const { error } = await supabase.from("community_messages").delete().eq("id", messageId);
    if (error) { alert(t("dashboard", "communauteDeleteError")); if (activeRoom) fetchMessages(activeRoom.id); }
  };

  const updateMessagePin = async (msg: any, durationDays: number | null) => {
    if (!canModerateRoom) return;
    setOpenMenuId(null);
    const nextPinned = durationDays !== null;
    const pinnedAt = nextPinned ? new Date().toISOString() : null;
    const pinnedBy = nextPinned ? user?.id : null;
    const pinnedUntil = nextPinned ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;

    setMessages((prev) => sortMessages(prev.map((m) => (m.id === msg.id ? { ...m, pinned: nextPinned, pinned_at: pinnedAt, pinned_by: pinnedBy, pinned_until: pinnedUntil } : m))));
    const { error } = await supabase.from("community_messages").update({ pinned: nextPinned, pinned_at: pinnedAt, pinned_by: pinnedBy, pinned_until: pinnedUntil }).eq("id", msg.id);
    if (error && activeRoom) fetchMessages(activeRoom.id);
  };

  const getPinnedMessages = () => messages.filter(isMessagePinned);
  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      setPinnedModalOpen(false);
      setTimeout(() => { el.scrollIntoView({ behavior: "smooth", block: "center" }); setHoveredId(msgId); setTimeout(() => setHoveredId(null), 2000); }, 100);
    }
  };

  const handleSelectRoom = (room: CommunityRoom) => {
    setPrivateInboxOpen(false);
    setActiveRoom(room);
    setMobileRoomsOpen(false);
  };

  const openPrivateInbox = () => {
    setPrivateInboxOpen(true);
    setMobileRoomsOpen(false);
  };

  const matchesSidebarSearch = (label: string) =>
    !sidebarSearch || label.toLowerCase().includes(sidebarSearch.toLowerCase());

  const renderSidebarRoom = (room: CommunityRoom, sectionLabel: string) => {
    if (!matchesSidebarSearch(room.name) && !matchesSidebarSearch(sectionLabel)) return null;
    const isActive = !privateInboxOpen && activeRoom?.id === room.id;
    const iconEl =
      room.type === "announcement" ? (
        <Hash size={16} style={{ color: BRAND.orange }} />
      ) : (
        <GraduationCap size={16} className="text-blue-500" />
      );
    const bg = room.type === "announcement" ? "#FFF4EC" : "#EFF6FF";

    return (
      <button
        key={room.id}
        onClick={() => handleSelectRoom(room)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
          isActive ? "bg-orange-50 border border-orange-200" : "hover:bg-orange-50/50 border border-transparent"
        }`}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          {room.photo_url ? (
            <img src={room.photo_url} alt="" className="w-full h-full rounded-xl object-cover" />
          ) : (
            iconEl
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`${STUDENT_TEXT.sidebarItem} ${isActive ? STUDENT_TEXT.sidebarItemActive : STUDENT_TEXT.sidebarItemIdle} truncate`}
            style={{ color: isActive ? BRAND.blue : "#404040" }}
          >
            {room.name}
          </p>
          <p
            className={`${STUDENT_TEXT.sidebarMeta} truncate mt-0.5`}
            style={{ color: isActive ? BRAND.orange : "#a3a3a3" }}
          >
            {room.type === "announcement" ? t("dashboard", "communauteCenterAnnouncements") : t("centre", "communityClassroom")}
          </p>
        </div>
      </button>
    );
  };

  if (loading || roomsLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#FFFBF7]">
        <div className="w-8 h-8 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isCenterStudent) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-orange-200 rounded-xl p-8 max-w-md text-center">
          <Users size={36} className="mx-auto text-orange-300 mb-4" />
          <h2 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>{t("dashboard", "communauteCenterTitle")}</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            {t("dashboard", "communauteReservedBody")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-[#FFFBF7] flex font-sans selection:bg-orange-500/30 overflow-hidden">
      {openMenuId && <div className="fixed inset-0 z-20" onMouseDown={() => setOpenMenuId(null)} onTouchStart={() => setOpenMenuId(null)} />}

      {settingsOpen && activeRoom && (
        <RoomSettingsDrawer
          room={activeRoom}
          isGlobalAdmin={isAdmin}
          onClose={() => setSettingsOpen(false)}
          onRegenerateCode={regenerateInviteCode}
          onRoomUpdated={refetchRooms}
        />
      )}

      {pinnedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl flex flex-col overflow-hidden border border-orange-200" style={{ height: "min(600px, 92vh)" }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-orange-100 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <Pin size={18} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <p className={`${STUDENT_TEXT.cardTitle} truncate`} style={{ color: BRAND.blue }}>{t("dashboard", "communautePinnedMessages")}</p>
                <p className="text-xs text-neutral-400">{t("dashboard", "communauteMessageCount", { count: getPinnedMessages().length })}</p>
              </div>
              <button onClick={() => setPinnedModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-orange-50">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {getPinnedMessages().length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-400">
                  <Pin size={36} className="opacity-20" />
                  <p className="text-sm font-semibold">{t("dashboard", "communauteNoPinned")}</p>
                </div>
              ) : getPinnedMessages().map((msg) => (
                <button key={msg.id} onClick={() => scrollToMessage(msg.id)} className="w-full text-left p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors group">
                  <div className="flex items-start gap-3 mb-2">
                    <ProfileAvatar
                      url={msg.profiles?.avatar_url}
                      name={msg.profiles?.prenom || t("dashboard", "sidebarDefaultStudentName")}
                      role={msg.profiles?.role}
                      size="w-8 h-8"
                      rounded="rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-600">{msg.profiles?.prenom || t("dashboard", "sidebarDefaultStudentName")}</p>
                      <p className="text-[10px] text-neutral-400">{formatTime(msg.created_at, locale)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 line-clamp-2 leading-relaxed group-hover:text-neutral-900">{msg.message}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mobileRoomsOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileRoomsOpen(false)} aria-hidden />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border border-orange-200 flex flex-col overflow-hidden"
            style={{ maxHeight: "85dvh", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-100 shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 border border-orange-200">
                <MessageCircle size={18} style={{ color: BRAND.orange }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>{t("dashboard", "communauteRooms")} · {centerName || t("dashboard", "communauteYourEstablishment")}</p>
                <p className={STUDENT_TEXT.sidebarMeta} style={{ color: BRAND.orange }}>
                  {t("dashboard", "communauteRoomCount", { count: visibleRooms.length })}
                </p>
              </div>
              <button
                onClick={() => setMobileRoomsOpen(false)}
                aria-label={t("dashboard", "communauteCloseRoomList")}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-orange-50 text-neutral-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-orange-50 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder={t("dashboard", "communauteSearchRoom")}
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-[#FFFBF7] border border-orange-100 text-sm font-medium outline-none focus:border-orange-300 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {centerForumRooms.length > 0 && (
                <div className="mb-1">
                  <p
                    className={`${STUDENT_TEXT.cardLabel} px-3 pt-2 pb-1.5 flex items-center gap-2`}
                    style={{ color: BRAND.orange }}
                  >
                    <Megaphone size={12} style={{ color: BRAND.orange }} /> {t("dashboard", "communauteCenterGroup")}
                  </p>
                  {centerForumRooms.map((r) => renderSidebarRoom(r, centerName))}
                </div>
              )}
              {classroomRooms.length > 0 && (
                <div className="mb-1 pt-2 border-t border-orange-50">
                  <p
                    className={`${STUDENT_TEXT.cardLabel} px-3 pt-2 pb-1.5 flex items-center gap-2`}
                    style={{ color: BRAND.blue }}
                  >
                    <GraduationCap size={12} style={{ color: BRAND.blue }} /> {t("centre", "communityClassroom")}
                  </p>
                  {classroomRooms.map((r) => renderSidebarRoom(r, t("centre", "communityClassroom")))}
                </div>
              )}
              {visibleRooms.length === 0 && (
                <p className="text-sm text-neutral-400 text-center px-4 py-8 leading-relaxed">
                  {t("dashboard", "communauteNoRooms")}
                </p>
              )}
            </div>
            <div className="px-3 py-3 border-t border-orange-100 shrink-0">
              <button
                type="button"
                onClick={openPrivateInbox}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  privateInboxOpen
                    ? "bg-orange-50 border-orange-200"
                    : "border-orange-100 bg-white hover:bg-orange-50/50"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                  <MessageCircle size={16} style={{ color: BRAND.orange }} />
                </div>
                <p className={`${STUDENT_TEXT.sidebarItem} ${STUDENT_TEXT.sidebarItemActive}`} style={{ color: BRAND.blue }}>
                  {t("dashboard", "communautePrivateMessages")}
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PANNEAU GAUCHE (vertical) ── */}
      <aside className="w-[280px] xl:w-[300px] 2xl:w-[320px] bg-white border-r border-orange-100 flex flex-col shrink-0 h-full hidden md:flex">
        <div className="px-4 xl:px-5 pt-5 pb-3 border-b border-orange-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 border border-orange-200">
              <MessageCircle size={20} style={{ color: BRAND.orange }} />
            </div>
            <div className="min-w-0">
              <p className={`${STUDENT_TEXT.cardLabel} leading-none mb-0.5`} style={{ color: BRAND.orange }}>{t("centre", "communityTitle")}</p>
              <h2 className={`${STUDENT_TEXT.pageTitle} leading-tight truncate`} style={{ color: BRAND.blue }}>{centerName || t("dashboard", "communauteYourEstablishment")}</h2>
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder={t("dashboard", "communauteSearch")}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#FFFBF7] border border-orange-100 text-xs font-medium outline-none focus:border-orange-300 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {centerForumRooms.length > 0 && (
            <div className="mb-1">
              <p
                className={`${STUDENT_TEXT.cardLabel} px-3 pt-3 pb-1.5 flex items-center gap-2`}
                style={{ color: BRAND.orange }}
              >
                <Megaphone size={12} style={{ color: BRAND.orange }} /> {t("dashboard", "communauteCenterGroup")}
              </p>
              {centerForumRooms.map((r) => renderSidebarRoom(r, centerName))}
            </div>
          )}

          {classroomRooms.length > 0 && (
            <div className="mb-1 pt-2 border-t border-orange-50">
              <p
                className={`${STUDENT_TEXT.cardLabel} px-3 pt-2 pb-1.5 flex items-center gap-2`}
                style={{ color: BRAND.blue }}
              >
                <GraduationCap size={12} style={{ color: BRAND.blue }} /> {t("centre", "communityClassroom")}
              </p>
              {classroomRooms.map((r) => renderSidebarRoom(r, t("centre", "communityClassroom")))}
            </div>
          )}

          {visibleRooms.length === 0 && (
            <p className="text-[11px] text-neutral-400 text-center px-4 py-6 leading-relaxed">
              {t("dashboard", "communauteNoRoomsContact")}
            </p>
          )}
        </div>

        <div className="px-3 py-3 border-t border-orange-100">
          <button
            type="button"
            onClick={openPrivateInbox}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
              privateInboxOpen
                ? "bg-orange-50 border-orange-200"
                : "border-orange-100 bg-white hover:bg-orange-50/50"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
              <MessageCircle size={16} style={{ color: BRAND.orange }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${STUDENT_TEXT.sidebarItem} ${STUDENT_TEXT.sidebarItemActive}`} style={{ color: BRAND.blue }}>
                {t("dashboard", "communautePrivateMessages")}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── PANNEAU DROIT ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#FFFBF7]">
        {/* Sélecteur mobile */}
        <div className="md:hidden border-b border-orange-100 bg-white shrink-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              aria-label={t("dashboard", "supportBack")}
              className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-orange-200 bg-white text-neutral-700 active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setMobileRoomsOpen(true)}
              aria-label={t("dashboard", "communauteOpenRoomList")}
              className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-neutral-700 active:scale-95 transition-transform"
            >
              <PanelLeft size={18} />
            </button>
            <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-none py-0.5">
              {visibleRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleSelectRoom(room)}
                  className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl ${STUDENT_TEXT.tab} border transition-colors ${
                    !privateInboxOpen && activeRoom?.id === room.id
                      ? `${STUDENT_TEXT.tabActive} bg-orange-500 text-white border-orange-500`
                      : "bg-white text-neutral-600 border-orange-200"
                  }`}
                  style={!privateInboxOpen && activeRoom?.id === room.id ? undefined : { color: BRAND.blue }}
                >
                  {room.name}
                </button>
              ))}
              <button
                type="button"
                onClick={openPrivateInbox}
                className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl ${STUDENT_TEXT.tab} border transition-colors ${
                  privateInboxOpen
                    ? `${STUDENT_TEXT.tabActive} bg-orange-500 text-white border-orange-500`
                    : "bg-white text-neutral-600 border-orange-200"
                }`}
                style={privateInboxOpen ? undefined : { color: BRAND.blue }}
              >
                {t("dashboard", "communautePrivateMessages")}
              </button>
            </div>
          </div>
        </div>

        {privateInboxOpen && user ? (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <ConversationsInbox userId={user.id} centerId={centerId} />
          </div>
        ) : !activeRoom ? (
          <main className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={28} style={{ color: BRAND.orange }} />
              </div>
              <h3 className={`${STUDENT_TEXT.sectionTitle} mb-2`} style={{ color: BRAND.blue }}>{t("centre", "communityTitle")} {centerName || t("dashboard", "communauteYourEstablishment")}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {isTcfCenterStudent
                  ? t("dashboard", "communauteSelectRoomGrouped")
                  : t("dashboard", "communauteSelectRoom")}
              </p>
            </div>
          </main>
        ) : (
          <div className="flex flex-col h-full min-h-0">
            <header className="bg-white/95 backdrop-blur-sm border-b border-orange-100 px-4 md:px-5 xl:px-6 py-3 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-orange-100" style={{
                backgroundColor: activeRoom.type === "announcement" ? "#FFF4EC" : "#EFF6FF",
              }}>
                {activeRoom.type === "announcement" ? (
                  <Hash size={18} style={{ color: BRAND.orange }} />
                ) : (
                  <GraduationCap size={18} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>{activeRoom.name}</h1>
                <p
                  className={STUDENT_TEXT.sidebarMeta}
                  style={{ color: activeRoom.type === "announcement" ? BRAND.orange : BRAND.blue }}
                >
                  {activeRoom.type === "announcement" ? t("dashboard", "communauteGroupOf", { name: centerName || t("dashboard", "communauteYourEstablishment") }) : t("centre", "communityClassroom")}
                </p>
              </div>
              {canModerateRoom && (
                <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors shrink-0">
                  <Settings size={16} className="text-neutral-600" />
                </button>
              )}
            </header>

        <>
          {getPinnedMessages().length > 0 && (
            <button onClick={() => setPinnedModalOpen(true)} className="sticky top-0 z-20 w-full px-6 py-2 bg-orange-100 border-b-2 border-orange-300 hover:bg-orange-150 transition-all flex items-center gap-3 group">
              <Pin size={16} className="text-orange-700 shrink-0" />
              <div className="flex-1 text-left w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
                <p className="text-xs font-black text-orange-700 uppercase tracking-wider">
                  {t("dashboard", "communautePinnedCount", { count: getPinnedMessages().length })}
                </p>
                <p className="text-sm font-semibold text-orange-900 line-clamp-1">{getPinnedMessages()[getPinnedMessages().length - 1]?.message}</p>
              </div>
              <ChevronDown size={16} className="text-orange-700 group-hover:translate-y-0.5 transition-transform shrink-0" />
            </button>
          )}

          <main className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 scroll-smooth" onScroll={() => setOpenMenuId(null)}>
            <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col space-y-3">
              <div className="text-center my-4">
                <span className="px-4 py-2 bg-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-inner">
                  {t("dashboard", "communauteHistoryStart")} · {activeRoom.name}
                </span>
              </div>

              {messagesLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300 max-w-md mx-auto w-full">
                  <Users size={32} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-black text-slate-900 mb-1">{t("dashboard", "communauteEmptyTitle")}</h3>
                  <p className="text-slate-400 font-medium text-xs">{t("dashboard", "communauteEmptyBody")}</p>
                </div>
              ) : (() => {
                let lastDateStr = "";
                let showedPinnedHeader = false;
                return messages.map((msg) => {
                  const msgDate = new Date(msg.created_at).toDateString();
                  const isPinned = isMessagePinned(msg);
                  const showPinnedSep = isPinned && !showedPinnedHeader;
                  if (showPinnedSep) showedPinnedHeader = true;
                  const showDateSep = !isPinned && msgDate !== lastDateStr;
                  if (showDateSep) lastDateStr = msgDate;
                  const isMe = msg.user_id === user?.id;
                  const authorGlobalRole = msg.profiles?.role;
                  const authorRoomRole = roomMemberRoles[msg.user_id];
                  const isCoach = ["admin", "trainer", "center_manager"].includes(authorGlobalRole);
                  const isRoomMod = authorRoomRole === "owner" || authorRoomRole === "room_admin";
                  const canAct = isMe && isWithinEditWindow(msg.created_at);
                  const canPin = canModerateRoom;
                  const canAdminDeleteOther = canModerateRoom && !isMe;
                  const canOpenMenu = canAct || canPin || canAdminDeleteOther;
                  const canDelete = canAct || canAdminDeleteOther;
                  const isHovered = hoveredId === msg.id;
                  const menuOpen = openMenuId === msg.id;
                  const showChevron = canOpenMenu && (isHovered || menuOpen);

                  return (
                    <div key={msg.id} id={`msg-${msg.id}`}>
                      {showPinnedSep && (
                        <div className="flex items-center justify-center my-4">
                          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-[0.18em] rounded-full border border-orange-200">
                            <Pin size={11} /> {t("dashboard", "communautePinnedMessages")}
                          </span>
                        </div>
                      )}
                      {showDateSep && (
                        <div className="flex items-center justify-center my-4">
                          <span className="px-4 py-1.5 bg-slate-200/80 text-slate-500 text-[9px] font-black uppercase tracking-[0.18em] rounded-full">
                            {formatDateSeparator(msg.created_at, locale, t("centre", "financeToday"), t("centre", "communityYesterday"))}
                          </span>
                        </div>
                      )}
                      {msg.replied_to && (
                        <div className={`mb-2 ${isMe ? "mr-12" : "ml-12"}`}>
                          <div className="border-l-4 border-slate-300 bg-slate-50 rounded-r px-3 py-2">
                            <p className="text-[10px] font-bold text-slate-500">{msg.replied_to.profiles?.prenom || t("dashboard", "sidebarDefaultStudentName")}</p>
                            <p className="text-sm text-slate-600 line-clamp-2">{msg.replied_to.message}</p>
                          </div>
                        </div>
                      )}
                      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? "mr-2" : "ml-12"}`}>
                          <span className="text-[10px] font-bold text-slate-400">{isMe ? t("dashboard", "communauteYou") : msg.profiles?.prenom || t("dashboard", "sidebarDefaultStudentName")}</span>
                          {isCoach && !isMe && (
                            <span className="text-[8px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider" style={{ backgroundColor: BRAND.blue, color: BRAND.orange }}>
                              {t("dashboard", "communauteCenterTeam")}
                            </span>
                          )}
                          {!isCoach && isRoomMod && !isMe && (
                            <span className="inline-flex items-center gap-1 text-[8px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md uppercase font-black tracking-widest">
                              <ShieldCheck size={9} /> {t("centre", "membersRoomAdmin")}
                            </span>
                          )}
                          {isPinned && (
                            <span className="inline-flex items-center gap-1 text-[8px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md uppercase font-black tracking-widest">
                              <Pin size={9} /> {t("dashboard", "communautePinnedBadge")}
                            </span>
                          )}
                        </div>

                        <div className={`flex items-end gap-3 max-w-[92%] sm:max-w-[85%] md:max-w-[70%] xl:max-w-[65%] ${isMe ? "flex-row-reverse" : ""}`}>
                          <ProfileAvatar
                            url={isMe ? userAvatarUrl : msg.profiles?.avatar_url}
                            name={isMe ? (userPrenom || t("dashboard", "sidebarDefaultStudentName")) : msg.profiles?.prenom || t("dashboard", "sidebarDefaultStudentName")}
                            role={isMe ? userRole : authorGlobalRole}
                            size="w-9 h-9"
                            rounded="rounded-[14px]"
                            className="mb-5 shadow-sm"
                            fallback={
                              isCoach && !(isMe ? userAvatarUrl : msg.profiles?.avatar_url) ? (
                                <ShieldCheck size={16} className="text-orange-400" />
                              ) : undefined
                            }
                            fallbackClassName={
                              isCoach && !(isMe ? userAvatarUrl : msg.profiles?.avatar_url)
                                ? "bg-slate-900 border-2 border-slate-800"
                                : ""
                            }
                          />
                          <div className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                            <div
                              className={`relative px-5 py-3.5 text-sm font-medium leading-relaxed shadow-sm select-none ${
                                isPinned ? "bg-orange-50 border-2 border-orange-300 text-slate-900 rounded-[1.5rem] rounded-bl-sm"
                                : isMe ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-[1.5rem] rounded-br-sm border border-orange-400/50"
                                : isCoach ? "bg-white border-2 border-slate-900 text-slate-900 rounded-[1.5rem] rounded-bl-sm font-bold"
                                : "bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] rounded-bl-sm"
                              }`}
                              onMouseEnter={() => canOpenMenu && setHoveredId(msg.id)}
                              onMouseLeave={() => !menuOpen && setHoveredId(null)}
                              onTouchStart={() => canOpenMenu && handleTouchStart(msg.id)}
                              onTouchEnd={handleTouchEnd}
                              onTouchMove={handleTouchEnd}
                            >
                              <span className={showChevron ? (isMe ? "pl-5" : "pr-7") : ""}>{msg.message}</span>

                              {canOpenMenu && (
                                <>
                                  <div className={`absolute top-2 z-30 ${isMe ? "left-2" : "right-2"}`} style={{ opacity: showChevron ? 1 : 0, transition: "opacity 0.15s ease" }}>
                                    <button
                                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId((prev) => (prev === msg.id ? null : msg.id)); }}
                                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId((prev) => (prev === msg.id ? null : msg.id)); }}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ${isMe ? "bg-orange-400/60 hover:bg-orange-400/90 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-600"}`}
                                    >
                                      <ChevronDown size={12} />
                                    </button>
                                  </div>

                                  {menuOpen && pinSubMenuMsgId !== msg.id && (
                                    <div
                                      className={`z-30 w-44 bg-white rounded-2xl overflow-hidden border border-slate-100 max-md:fixed max-md:inset-x-4 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] max-md:w-auto max-md:top-auto md:absolute md:top-[18px] md:-translate-y-1/2 ${isMe ? "md:-left-47" : "md:-right-44"}`}
                                      style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.15)", maxHeight: "400px" }}
                                    >
                                      {canAct && (
                                        <>
                                          <button onMouseDown={(e) => { e.stopPropagation(); startEdit(msg); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-left">
                                            <Pencil size={15} className="text-slate-400 shrink-0" /> {t("dashboard", "communauteEdit")}
                                          </button>
                                          <div className="h-px bg-slate-100 mx-3" />
                                        </>
                                      )}
                                      {canPin && (
                                        <button onMouseDown={(e) => { e.stopPropagation(); setOpenMenuId(null); setPinSubMenuMsgId(msg.id); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-left">
                                          <Pin size={15} className="text-orange-500 shrink-0" /> {isPinned ? t("centre", "communityUnpin") : t("centre", "communityPin")}
                                        </button>
                                      )}
                                      {canPin && <div className="h-px bg-slate-100 mx-3" />}
                                      <button onMouseDown={(e) => { e.stopPropagation(); setRepliedToMessage(msg); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-left">
                                        <MessageCircle size={15} className="text-slate-400 shrink-0" /> {t("dashboard", "communauteReply")}
                                      </button>
                                      {canDelete && (
                                        <>
                                          <div className="h-px bg-slate-100 mx-3" />
                                          <button onMouseDown={(e) => { e.stopPropagation(); deleteMessage(msg.id); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 text-left">
                                            <Trash2 size={15} className="shrink-0" /> {t("dashboard", "communauteDelete")}
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {pinSubMenuMsgId === msg.id && (
                                    <div
                                      className={`z-30 w-44 bg-white rounded-2xl overflow-hidden border border-slate-100 max-md:fixed max-md:inset-x-4 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] max-md:w-auto max-md:top-auto md:absolute md:top-[18px] md:-translate-y-1/2 ${isMe ? "md:-left-47" : "md:-right-44"}`}
                                      style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.15)", maxHeight: "400px" }}
                                    >
                                      <button onMouseDown={(e) => { e.stopPropagation(); setPinSubMenuMsgId(null); setOpenMenuId(msg.id); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-left">
                                        <X size={15} className="text-slate-400 shrink-0" /> {t("dashboard", "communauteBack")}
                                      </button>
                                      <div className="h-px bg-slate-100 mx-3" />
                                      {isPinned ? (
                                        <button onMouseDown={(e) => { e.stopPropagation(); updateMessagePin(msg, null); setPinSubMenuMsgId(null); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 text-left">
                                          <Pin size={15} className="shrink-0" /> {t("centre", "communityUnpin")}
                                        </button>
                                      ) : PIN_DURATION_DAYS.map((days) => (
                                        <button key={days} onMouseDown={(e) => { e.stopPropagation(); updateMessagePin(msg, days); setPinSubMenuMsgId(null); }} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-left">
                                          <Pin size={15} className="text-orange-500 shrink-0" /> {t("dashboard", "communautePinForDays", { days })}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 ${isMe ? "mr-1" : "ml-1"}`}>
                              {msg.edited && <span className="text-[9px] text-slate-400 italic">{t("centre", "communityEdited")} ·</span>}
                              <span className="text-[10px] font-semibold text-slate-400">{formatTime(msg.created_at, locale)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="bg-white/95 backdrop-blur-sm border-t border-orange-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0">
            <div className="w-full max-w-4xl xl:max-w-5xl mx-auto flex flex-col gap-2">
              {editingId && (
                <div className="flex items-center justify-between bg-orange-50 border-l-4 border-orange-400 rounded-r-2xl pl-4 pr-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Pencil size={12} className="text-orange-500 shrink-0" />
                    <span className="text-xs font-bold text-orange-700">{t("centre", "communityEditing")}</span>
                  </div>
                  <button onClick={cancelEdit} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-orange-100 text-orange-500"><X size={13} /></button>
                </div>
              )}
              {repliedToMessage && (
                <div className="flex items-start justify-between bg-slate-50 border-l-4 border-slate-400 rounded-r-2xl pl-4 pr-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-600">{t("dashboard", "communauteReplyTo")} {repliedToMessage.profiles?.prenom || t("dashboard", "sidebarDefaultStudentName")}</p>
                    <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed mt-1">{repliedToMessage.message}</p>
                  </div>
                  <button onClick={() => setRepliedToMessage(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 shrink-0 ml-3"><X size={13} /></button>
                </div>
              )}
              {isReadOnly ? (
                <div className="flex items-center justify-center gap-3 h-14 bg-slate-100 rounded-full px-6 border-2 border-slate-200">
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <p className="text-xs font-bold text-slate-500">{t("dashboard", "communauteReadOnly")}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    placeholder={editingId ? t("dashboard", "communauteEditPlaceholder") : t("dashboard", "communauteWriteIn", { room: activeRoom.name })}
                    className={`flex-1 border-2 focus:bg-white outline-none rounded-2xl px-5 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 transition-all resize-none overflow-y-auto ${editingId ? "bg-orange-50 border-orange-300 focus:border-orange-500" : "bg-[#FFFBF7] border-orange-100 focus:border-orange-400"}`}
                    style={{ maxHeight: "200px", minHeight: "44px" }}
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); autoExpandTextarea(); }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className={`w-12 h-12 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shrink-0 ${editingId ? "bg-emerald-500 hover:bg-emerald-600" : "bg-orange-500 hover:bg-orange-600"}`}
                  >
                    {editingId ? <Check size={20} /> : <Send size={20} className="ml-1" />}
                  </button>
                </form>
              )}
            </div>
          </footer>
        </>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunautePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[100dvh] items-center justify-center bg-[#FFFBF7]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    }>
      <CommunauteContent />
    </Suspense>
  );
}
