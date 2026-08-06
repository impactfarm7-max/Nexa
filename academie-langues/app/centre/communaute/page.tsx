"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import {
  Send, Trash2, Pencil, X, Check, MessageCircle, Plus,
  GraduationCap, UsersRound, Loader2, Users, Hash,
  Pin, Paperclip, FileText, Download, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { useCenterRooms } from "./useCenterRooms";
import MembersDrawer from "./MembersDrawer";
import CommunauteHubInbox from "./CommunauteHubInbox";
import type { HubFilterId } from "./communauteHubInbox.core.mjs";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  ORANGE,
} from "../center-page-ui";

type Programme = { id: string; name: string; type: string };
type NiveauInfo = { id: string; annee: number; nom: string | null };
type MsgParsed = { type: "text" | "image" | "file"; content: string; filename?: string };

/* ── helpers ── */
function formatTime(d: string, locale = "fr") {
  return new Date(d).toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDateSep(d: string, locale = "fr", today = "Aujourd'hui", yesterday = "Hier") {
  const dt = new Date(d);
  const now = new Date();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (dt.toDateString() === now.toDateString()) return today;
  if (dt.toDateString() === yest.toDateString()) return yesterday;
  return dt.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
function formatSidebarTime(d: string, locale = "fr") {
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString())
    return dt.toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR", { hour: "2-digit", minute: "2-digit" });
  const diff = (now.getTime() - dt.getTime()) / 86400000;
  if (diff < 7) return dt.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { weekday: "short" });
  return dt.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "2-digit" });
}
function parseMsg(raw: string): MsgParsed {
  if (raw.startsWith("__img__:")) return { type: "image", content: raw.slice(8) };
  if (raw.startsWith("__file__:")) {
    const idx = raw.indexOf("::", 9);
    return { type: "file", content: raw.slice(9, idx < 0 ? undefined : idx), filename: idx >= 0 ? raw.slice(idx + 2) : "Fichier" };
  }
  return { type: "text", content: raw };
}

/* ── Avatar ── */
function Avatar({ url, name, role, size = "w-8 h-8" }: { url?: string | null; name: string; role?: string; size?: string }) {
  const isStaff = role && ["admin", "center_manager", "trainer", "staff", "campus_manager"].includes(role);
  if (url) return <img src={url} alt={name} className={`${size} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isStaff ? "bg-gradient-to-br from-slate-700 to-slate-900 text-orange-400" : "bg-gradient-to-br from-orange-400 to-orange-600 text-white"}`}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
function CommunauteCenterContent() {
  const { t, locale } = useI18n();
  const [userId,    setUserId]    = useState<string | null>(null);
  const [centerId,  setCenterId]  = useState<string | null>(null);
  const [centerName, setCenterName] = useState(t("centre", "communityTitle"));
  const [userRole,  setUserRole]  = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("M");
  const [loading,   setLoading]   = useState(true);

  const { rooms, loading: roomsLoading, refetch: refetchRooms, ensureMembership } = useCenterRooms(userId, centerId);

  const [programmes,  setProgrammes]  = useState<Programme[]>([]);
  const [niveauxMap,  setNiveauxMap]  = useState<Record<string, NiveauInfo[]>>({});
  const [groupesMap,  setGroupesMap]  = useState<Record<string, { id: string; nom: string; niveau_id: string | null; filiere_id: string | null }[]>>({});

  const [activeRoom,      setActiveRoom]      = useState<any>(null);
  const [messages,        setMessages]        = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage,      setNewMessage]      = useState("");
  const [isSending,       setIsSending]       = useState(false);
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hubFilter, setHubFilter] = useState<HubFilterId>("all");

  const [lastMessages,  setLastMessages]  = useState<Record<string, { text: string; time: string; sender?: string }>>({});
  const [unreadCounts,  setUnreadCounts]  = useState<Record<string, number>>({});
  const [memberCounts,  setMemberCounts]  = useState<Record<string, number>>({});
  const [pinnedMsg,     setPinnedMsg]     = useState<any>(null);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName,    setNewGroupName]    = useState("");
  const [creatingGroup,   setCreatingGroup]   = useState(false);
  const [showMembers,     setShowMembers]     = useState(false);
  const [fileUploading,   setFileUploading]   = useState(false);
  const [uploadError,     setUploadError]     = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const isAdminRole = ["admin", "center_manager", "campus_manager", "staff", "trainer"].includes(userRole);

  /* ── localStorage unread helpers ── */
  const getLastSeen = useCallback((roomId: string) => {
    if (!userId) return "";
    return localStorage.getItem(`lseen_${userId}_${roomId}`) || "";
  }, [userId]);

  const markSeen = useCallback((roomId: string) => {
    if (!userId) return;
    localStorage.setItem(`lseen_${userId}_${roomId}`, new Date().toISOString());
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
  }, [userId]);

  /* ── Auth + load ── */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, role, avatar_url, prenom, nom")
        .eq("id", session.user.id).single();

      if (profile) {
        setCenterId(profile.center_id);
        setUserRole(profile.role || "");
        setUserAvatar(profile.avatar_url || null);
        setUserInitial((profile.prenom || profile.nom || "M").charAt(0).toUpperCase());

        if (profile.center_id) {
          const [{ data: centerData }, { data: progs }] = await Promise.all([
            supabase.from("centers").select("name").eq("id", profile.center_id).single(),
            supabase.from("filieres").select("id, name, type").eq("center_id", profile.center_id).order("name"),
          ]);

          if (centerData?.name) setCenterName(centerData.name);
          setProgrammes(progs || []);

          const progIds = (progs || []).map(p => p.id);
          if (progIds.length > 0) {
            const { data: nivRows } = await supabase.from("niveaux")
              .select("id, annee, nom, filiere_id").in("filiere_id", progIds).order("annee");
            const nivMap: Record<string, NiveauInfo[]> = {};
            for (const n of nivRows || []) {
              if (!nivMap[n.filiere_id]) nivMap[n.filiere_id] = [];
              nivMap[n.filiere_id].push({ id: n.id, annee: n.annee, nom: n.nom });
            }
            setNiveauxMap(nivMap);

            const nivIds = (nivRows || []).map(n => n.id);
            const { data: grpRows } = await supabase.from("groupes")
              .select("id, nom, niveau_id, filiere_id")
              .or(`filiere_id.in.(${progIds.join(",")}),niveau_id.in.(${nivIds.length > 0 ? nivIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);
            const grpMap: Record<string, any[]> = {};
            for (const g of grpRows || []) {
              const key = g.niveau_id || g.filiere_id;
              if (!grpMap[key]) grpMap[key] = [];
              grpMap[key].push(g);
            }
            setGroupesMap(grpMap);
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  /* ── Load last messages + member counts when rooms arrive ── */
  useEffect(() => {
    if (rooms.length === 0 || !userId) return;
    const roomIds = rooms.map(r => r.id);

    supabase.from("community_room_members").select("room_id").in("room_id", roomIds)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const row of data || []) counts[row.room_id] = (counts[row.room_id] || 0) + 1;
        setMemberCounts(counts);
      });

    supabase.from("community_messages")
      .select("room_id, message, created_at, user_id, profiles:user_id(prenom)")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(roomIds.length * 5)
      .then(({ data }) => {
        const seenRooms = new Set<string>();
        const lastMsgs: Record<string, { text: string; time: string; sender?: string }> = {};
        for (const m of data || []) {
          if (!seenRooms.has(m.room_id)) {
            seenRooms.add(m.room_id);
            const parsed = parseMsg(m.message);
            lastMsgs[m.room_id] = {
              text: parsed.type === "image" ? `📷 ${t("centre", "communityPhoto")}` : parsed.type === "file" ? `📎 ${parsed.filename || t("centre", "communityFile")}` : parsed.content,
              time: m.created_at,
              sender: (m.profiles as any)?.prenom || "",
            };
          }
        }
        setLastMessages(lastMsgs);

        const unreads: Record<string, number> = {};
        for (const roomId of roomIds) {
          const lastSeen = localStorage.getItem(`lseen_${userId}_${roomId}`) || "";
          if (!lastSeen) { unreads[roomId] = 0; continue; }
          unreads[roomId] = (data || []).filter(m => m.room_id === roomId && m.created_at > lastSeen && m.user_id !== userId).length;
        }
        setUnreadCounts(unreads);
      });
  }, [rooms, userId]);

  /* ── Realtime subscriptions for unread in background rooms ── */
  useEffect(() => {
    if (!rooms.length || !userId) return;
    const bgRooms = rooms.filter(r => r.id !== activeRoom?.id);
    const channels = bgRooms.map(room =>
      supabase.channel(`unread_${room.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `room_id=eq.${room.id}` },
          (payload) => {
            if ((payload.new as any).user_id === userId) return;
            setUnreadCounts(prev => ({ ...prev, [room.id]: (prev[room.id] || 0) + 1 }));
            const parsed = parseMsg((payload.new as any).message);
            setLastMessages(prev => ({
              ...prev,
              [room.id]: {
                text: parsed.type === "image" ? `📷 ${t("centre", "communityPhoto")}` : parsed.type === "file" ? `📎 ${parsed.filename || t("centre", "communityFile")}` : parsed.content,
                time: (payload.new as any).created_at,
              },
            }));
          })
        .subscribe()
    );
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [rooms, activeRoom?.id, userId]);

  /* ── Organize rooms ── */
  const forumsMap: Record<string, any> = {};
  const classroomsByGroupe: Record<string, any> = {};
  const freeGroups: any[] = [];
  const centerAnnouncements: any[] = [];
  for (const r of rooms) {
    if (r.type === "announcement" && r.filiere_id) forumsMap[r.filiere_id] = r;
    else if (r.type === "announcement" && !r.filiere_id) centerAnnouncements.push(r);
    else if (r.type === "classroom" && r.groupe_id) classroomsByGroupe[r.groupe_id] = r;
    else if (r.type === "study_group") freeGroups.push(r);
  }

  type GroupeMeta = { id: string; nom: string; niveau_id: string | null; filiere_id: string | null };
  type ClassLeaf = { groupe: GroupeMeta; room: any; unread: number };
  type NiveauBranch = { niveau: NiveauInfo; classes: ClassLeaf[]; unread: number };
  type ProgBranch = {
    prog: Programme;
    forum: any | null;
    forumUnread: number;
    niveaux: NiveauBranch[];
    orphanClasses: ClassLeaf[];
    unread: number;
    hasContent: boolean;
  };

  const programmeTree: ProgBranch[] = useMemo(() => {
    const roomUnread = (id: string) => unreadCounts[id] || 0;
    return programmes
      .map((prog) => {
        const forum = forumsMap[prog.id] || null;
        const forumUnread = forum ? roomUnread(forum.id) : 0;
        const niveaux = niveauxMap[prog.id] || [];
        const niveauBranches: NiveauBranch[] = niveaux.map((niv) => {
          const classes: ClassLeaf[] = (groupesMap[niv.id] || [])
            .map((groupe) => {
              const room = classroomsByGroupe[groupe.id];
              if (!room) return null;
              return { groupe, room, unread: roomUnread(room.id) };
            })
            .filter(Boolean) as ClassLeaf[];
          return {
            niveau: niv,
            classes,
            unread: classes.reduce((s, c) => s + c.unread, 0),
          };
        }).filter((n) => n.classes.length > 0);

        const orphanClasses: ClassLeaf[] = (groupesMap[prog.id] || [])
          .map((groupe) => {
            const room = classroomsByGroupe[groupe.id];
            if (!room) return null;
            return { groupe, room, unread: roomUnread(room.id) };
          })
          .filter(Boolean) as ClassLeaf[];

        const unread =
          forumUnread +
          niveauBranches.reduce((s, n) => s + n.unread, 0) +
          orphanClasses.reduce((s, c) => s + c.unread, 0);

        return {
          prog,
          forum,
          forumUnread,
          niveaux: niveauBranches,
          orphanClasses,
          unread,
          hasContent: Boolean(forum || niveauBranches.length || orphanClasses.length),
        };
      })
      .filter((b) => b.hasContent);
    // forumsMap / classroomsByGroupe rebuilt each render — depend on rooms + unread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmes, niveauxMap, groupesMap, rooms, unreadCounts]);

  const activeRoomContext = useMemo(() => {
    if (!activeRoom) return null;
    if (activeRoom.type === "announcement" && !activeRoom.filiere_id) {
      return { crumbs: [t("centre", "dashboardCenter"), t("centre", "communityAnnouncements")], kind: t("centre", "communityGeneralForum") };
    }
    if (activeRoom.type === "study_group") {
      return { crumbs: [t("centre", "communityGroups"), activeRoom.name], kind: t("centre", "communityGroup") };
    }
    const prog = programmes.find((p) => p.id === activeRoom.filiere_id);
    if (activeRoom.type === "announcement" && activeRoom.filiere_id) {
      return {
        crumbs: [prog?.name || t("centre", "enrollmentProgram"), t("centre", "communityForum")],
        kind: t("centre", "communityProgramForum"),
      };
    }
    if (activeRoom.type === "classroom" && activeRoom.groupe_id) {
      let niveauName: string | null = null;
      let groupeName: string | null = null;
      let filiereName = prog?.name || null;
      for (const groups of Object.values(groupesMap)) {
        const g = groups.find((x) => x.id === activeRoom.groupe_id);
        if (!g) continue;
        groupeName = g.nom;
        if (g.filiere_id && !filiereName) {
          filiereName = programmes.find((p) => p.id === g.filiere_id)?.name || null;
        }
        if (g.niveau_id) {
          for (const nivs of Object.values(niveauxMap)) {
            const n = nivs.find((x) => x.id === g.niveau_id);
            if (n) { niveauName = n.nom?.trim() || `${t("centre", "enrollmentLevel")} ${n.annee}`; break; }
          }
        }
        break;
      }
      const crumbs = [filiereName, niveauName, groupeName || activeRoom.name].filter(Boolean) as string[];
      return { crumbs, kind: t("centre", "communityClassroom") };
    }
    return { crumbs: [activeRoom.name], kind: t("centre", "communityConversation") };
  }, [activeRoom, programmes, groupesMap, niveauxMap, t]);

  /* ── Fetch messages for active room ── */
  const fetchMessages = useCallback(async (roomId: string) => {
    setMessagesLoading(true);
    const { data } = await supabase
      .from("community_messages")
      .select("*, profiles:user_id(prenom, nom, role, avatar_url)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setMessagesLoading(false);
    const pinned = (data || []).filter((m: any) => m.pinned).pop();
    setPinnedMsg(pinned || null);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    ensureMembership(activeRoom.id);
    fetchMessages(activeRoom.id);
    markSeen(activeRoom.id);

    const channel = supabase
      .channel(`room_${activeRoom.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `room_id=eq.${activeRoom.id}` },
        async (payload) => {
          const { data: pd } = await supabase.from("profiles").select("prenom, nom, role, avatar_url").eq("id", (payload.new as any).user_id).single();
          setMessages(prev => [...prev, { ...payload.new, profiles: pd || { prenom: t("centre", "communityUnknown"), nom: "", role: "student", avatar_url: null } }]);
          const parsed = parseMsg((payload.new as any).message);
          setLastMessages(prev => ({
            ...prev,
            [activeRoom.id]: { text: parsed.type === "image" ? `📷 ${t("centre", "communityPhoto")}` : parsed.type === "file" ? `📎 ${parsed.filename || t("centre", "communityFile")}` : parsed.content, time: (payload.new as any).created_at, sender: (pd as any)?.prenom || "" },
          }));
          markSeen(activeRoom.id);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeRoom, fetchMessages, ensureMembership, markSeen]);

  /* ── Actions ── */
  const openRoom = (room: any) => {
    setActiveRoom(room);
    setEditingId(null);
    setNewMessage("");
    markSeen(room.id);
  };

  const closeRoom = () => {
    setActiveRoom(null);
    setEditingId(null);
    setNewMessage("");
    setPinnedMsg(null);
    setUploadError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !activeRoom || isSending) return;
    setIsSending(true);
    try {
      if (editingId) {
        await supabase.from("community_messages").update({ message: newMessage.trim(), edited: true }).eq("id", editingId);
        setMessages(prev => prev.map(m => m.id === editingId ? { ...m, message: newMessage.trim(), edited: true } : m));
        setEditingId(null);
      } else {
        await supabase.from("community_messages").insert([{ user_id: userId, message: newMessage.trim(), room_id: activeRoom.id, center_id: centerId }]);
      }
      setNewMessage("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } finally { setIsSending(false); }
  };

  const uploadFile = async (file: File) => {
    if (!userId || !activeRoom || !centerId) {
      setUploadError(t("centre", "communityInvalidUploadContext"));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError(t("centre", "communityFileTooLarge"));
      return;
    }
    setUploadError("");
    setFileUploading(true);
    try {
      await ensureMembership(activeRoom.id);
      const ext = file.name.split(".").pop() || "bin";
      const path = `${centerId}/${activeRoom.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("community-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("community-files").getPublicUrl(path);
      const isImage = file.type.startsWith("image/");
      const msgContent = isImage ? `__img__:${publicUrl}` : `__file__:${publicUrl}::${file.name}`;
      const { error: msgErr } = await supabase.from("community_messages").insert([{
        user_id: userId,
        message: msgContent,
        room_id: activeRoom.id,
        center_id: centerId,
      }]);
      if (msgErr) throw msgErr;
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err?.message || t("centre", "communityUploadFailed"));
    } finally { setFileUploading(false); }
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm(t("centre", "communityDeleteConfirm"))) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    await supabase.from("community_messages").delete().eq("id", id);
  };

  const togglePin = async (msg: any) => {
    const isAlreadyPinned = pinnedMsg?.id === msg.id;
    if (isAlreadyPinned) {
      setPinnedMsg(null);
      try { await supabase.from("community_messages").update({ pinned: false }).eq("id", msg.id); } catch {}
    } else {
      if (pinnedMsg) { try { await supabase.from("community_messages").update({ pinned: false }).eq("id", pinnedMsg.id); } catch {} }
      setPinnedMsg(msg);
      try { await supabase.from("community_messages").update({ pinned: true }).eq("id", msg.id); } catch {}
    }
  };

  const createAdminGroup = async () => {
    if (!newGroupName.trim() || !centerId) return;
    setCreatingGroup(true);
    const { error } = await supabase.rpc("create_community_room", {
      p_name: newGroupName.trim(), p_type: "study_group", p_center_id: centerId, p_photo_url: null, p_expires_at: null,
    });
    setCreatingGroup(false);
    if (!error) { setShowCreateGroup(false); setNewGroupName(""); await refetchRooms(); }
  };

  /* ── render message content ── */
  const renderMsgContent = (msg: any, isMe: boolean) => {
    const parsed = parseMsg(msg.message);
    if (parsed.type === "image") {
      return (
        <img src={parsed.content} alt={t("centre", "communityPhoto")} className="max-w-[220px] max-h-[200px] object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => window.open(parsed.content, "_blank")} />
      );
    }
    if (parsed.type === "file") {
      return (
        <a href={parsed.content} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${isMe ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"}`}>
          <FileText size={18} className="shrink-0 opacity-80" />
          <span className="truncate max-w-[160px]">{parsed.filename}</span>
          <Download size={13} className="shrink-0 opacity-60" />
        </a>
      );
    }
    return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{parsed.content}</p>;
  };

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  if (loading || roomsLoading) return <CenterPageLoading className="bg-[#F7F7F6]" />;

  if (!activeRoom) {
    return (
      <>
        <CommunauteHubInbox
          centerName={centerName}
          totalUnread={totalUnread}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={hubFilter}
          onFilterChange={setHubFilter}
          centerAnnouncements={centerAnnouncements}
          freeGroups={freeGroups}
          programmes={programmeTree}
          lastMessages={lastMessages}
          unreadCounts={unreadCounts}
          onOpenRoom={openRoom}
          onCreateGroup={() => setShowCreateGroup(true)}
          formatSidebarTime={(date) => formatSidebarTime(date, locale)}
        />
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-sm w-full shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium tracking-tight" style={{ color: BLUE }}>{t("centre", "communityNewGroup")}</h3>
                <button type="button" onClick={() => setShowCreateGroup(false)} className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"><X size={16} /></button>
              </div>
              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createAdminGroup()}
                placeholder="Ex. Staff, Promo 2025, Alumni…"
                autoFocus
                className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-800 outline-none mb-4 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
              />
              <button
                type="button"
                onClick={createAdminGroup}
                disabled={!newGroupName.trim() || creatingGroup}
                className="w-full h-10 rounded-full text-sm text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5 hover:opacity-90"
                style={{ backgroundColor: BLUE }}
              >
                {creatingGroup ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {t("centre", "financeCreate")}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ── Vue conversation (plein écran) ── */
  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden">
            <div className="flex flex-col h-full">

              {/* Chat header — dossier collaborateur style */}
              <div className="shrink-0 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-5 py-3 flex items-center gap-3 z-10">
                <button
                  type="button"
                  onClick={closeRoom}
                  className="h-9 w-9 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 flex items-center justify-center shrink-0"
                  aria-label={t("centre", "communityBack")}
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                  {activeRoom.type === "announcement" ? <Hash size={16} style={{ color: BLUE }} />
                    : activeRoom.type === "classroom" ? <GraduationCap size={16} style={{ color: BLUE }} />
                    : <UsersRound size={16} style={{ color: BLUE }} />}
                </div>
                <div className="flex-1 min-w-0">
                  {activeRoomContext && activeRoomContext.crumbs.length > 1 && (
                    <p className="text-xs text-neutral-400 truncate mb-0.5">
                      {activeRoomContext.crumbs.map((c, i) => (
                        <span key={`${c}-${i}`}>
                          {i > 0 && <span className="mx-1 text-neutral-300">/</span>}
                          {c}
                        </span>
                      ))}
                    </p>
                  )}
                  <h3 className="text-base font-black tracking-tight truncate" style={{ color: BLUE }}>{activeRoom.name}</h3>
                  <p className="text-xs text-neutral-500">
                    {activeRoomContext?.kind
                      || (activeRoom.type === "announcement" ? t("centre", "communityGeneralForum") : activeRoom.type === "classroom" ? t("centre", "communityClassroom") : t("centre", "communityGroup"))}
                    {memberCounts[activeRoom.id] ? ` · ${t("centre", "communityMemberCount", { count: memberCounts[activeRoom.id] })}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMembers(true)}
                  className="h-9 px-3 rounded-lg border border-neutral-200 bg-white text-neutral-700 text-sm hover:bg-neutral-50 inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Users size={14} /> {t("centre", "communityMembers")}
                </button>
              </div>

              {/* Pinned message banner */}
              {pinnedMsg && (
                <div
                  className="bg-white border-b border-neutral-200 px-5 py-2.5 flex items-center gap-3 shrink-0 cursor-pointer hover:bg-neutral-50/80 transition-colors"
                  onClick={() => document.getElementById(`msg-${pinnedMsg.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                >
                  <div className="w-1 h-8 rounded-full shrink-0 bg-neutral-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-500 mb-0.5 inline-flex items-center gap-1">
                      <Pin size={11} /> {t("centre", "communityPinnedMessage")}
                    </p>
                    <p className="text-sm text-neutral-800 truncate">
                      {parseMsg(pinnedMsg.message).content || t("centre", "communityFile")}
                    </p>
                  </div>
                  {isAdminRole && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); togglePin(pinnedMsg); }}
                      className="w-8 h-8 rounded-lg hover:bg-neutral-100 transition-colors flex items-center justify-center shrink-0"
                    >
                      <X size={14} className="text-neutral-400" />
                    </button>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-20 text-neutral-400 gap-2 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" /> {t("centre", "communityLoading")}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-dashed border-neutral-200 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle size={22} className="text-neutral-300" />
                    </div>
                    <p className="text-sm font-medium text-neutral-500">{t("centre", "communityNoMessage")}</p>
                    <p className="text-xs text-neutral-400 mt-1">{t("centre", "communityBeFirst")}</p>
                  </div>
                ) : (() => {
                  let lastDate = "";
                  return messages.map((msg: any) => {
                    const date = new Date(msg.created_at).toDateString();
                    const showDate = date !== lastDate;
                    if (showDate) lastDate = date;
                    const isMe = msg.user_id === userId;
                    const authorName = msg.profiles?.prenom ? `${msg.profiles.prenom}${msg.profiles.nom ? " " + msg.profiles.nom : ""}` : t("centre", "communityMember");
                    const authorRole = msg.profiles?.role || "student";
                    const isStaffMsg = ["admin", "center_manager", "trainer", "staff", "campus_manager"].includes(authorRole);
                    const isPinned = pinnedMsg?.id === msg.id;

                    return (
                      <div key={msg.id} id={`msg-${msg.id}`}>
                        {showDate && (
                          <div className="flex justify-center my-5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full border border-neutral-200 shadow-sm">
                              {formatDateSep(msg.created_at, locale, t("centre", "financeToday"), t("centre", "communityYesterday"))}
                            </span>
                          </div>
                        )}
                        <div className={`flex mb-2.5 items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                          {/* Avatar gauche */}
                          {!isMe && (
                            <Avatar url={msg.profiles?.avatar_url} name={authorName} role={authorRole} size="w-8 h-8" />
                          )}

                          <div className={`max-w-[65%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {/* Nom + badge */}
                            {!isMe && (
                              <div className="flex items-center gap-1.5 mb-1 ml-1">
                                <span className="text-[10px] font-bold text-neutral-500">{authorName}</span>
                                {isStaffMsg && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase" style={{ backgroundColor: BLUE, color: ORANGE }}>
                                    {authorRole === "trainer" ? "Prof" : "Staff"}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Bulle + actions au hover */}
                            <div className="group relative flex flex-col">
                              <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                isMe ? "rounded-br-sm text-white" : isStaffMsg ? "bg-white border-2 rounded-bl-sm font-medium shadow-md" : "bg-white rounded-bl-sm border border-neutral-200/80"
                              } ${isPinned ? "ring-2 ring-orange-300 ring-offset-1" : ""}`}
                                style={isMe ? { backgroundColor: BLUE } : isStaffMsg ? { borderColor: BLUE } : {}}>
                                {renderMsgContent(msg, isMe)}
                                <div className={`flex items-center gap-1 mt-1.5 ${isMe ? "justify-end" : "justify-start"}`}>
                                  <span className={`text-[9px] ${isMe ? "text-white/50" : "text-neutral-300"}`}>{formatTime(msg.created_at, locale)}</span>
                                  {msg.edited && <span className={`text-[9px] italic ${isMe ? "text-white/40" : "text-neutral-300"}`}>{t("centre", "communityEdited")}</span>}
                                  {isPinned && <Pin size={9} className={isMe ? "text-white/40" : "text-orange-400"} />}
                                </div>
                              </div>

                              {/* Actions hover */}
                              <div className={`absolute ${isMe ? "right-full mr-1.5" : "left-full ml-1.5"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                                {isAdminRole && (
                                  <button onClick={() => togglePin(msg)}
                                    className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center hover:bg-orange-50 shadow-sm transition-colors"
                                    title={isPinned ? t("centre", "communityUnpin") : t("centre", "communityPin")}>
                                    <Pin size={11} className={isPinned ? "text-orange-500" : "text-neutral-400"} />
                                  </button>
                                )}
                                {isMe && (
                                  <button onClick={() => { setEditingId(msg.id); setNewMessage(msg.message); setTimeout(() => inputRef.current?.focus(), 50); }}
                                    className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 shadow-sm transition-colors">
                                    <Pencil size={10} className="text-neutral-500" />
                                  </button>
                                )}
                                {(isMe || isAdminRole) && (
                                  <button onClick={() => deleteMessage(msg.id)}
                                    className="w-7 h-7 rounded-full bg-white border border-red-200 flex items-center justify-center hover:bg-red-50 shadow-sm transition-colors">
                                    <Trash2 size={10} className="text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Avatar droite (moi) */}
                          {isMe && (
                            userAvatar
                              ? <img src={userAvatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt={t("centre", "communityMe")} />
                              : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ backgroundColor: BLUE, color: ORANGE }}>
                                  {userInitial}
                                </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="bg-white/90 backdrop-blur-md border-t border-neutral-200 px-4 py-3 shrink-0">
                {uploadError && (
                  <p className="text-sm text-neutral-800 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 mb-2">
                    {uploadError}
                  </p>
                )}
                {editingId && (
                  <div className="flex items-center justify-between rounded-xl px-3 py-2 mb-2 border border-neutral-200 bg-neutral-50">
                    <span className="text-sm text-neutral-700 inline-flex items-center gap-1.5">
                      <Pencil size={12} /> {t("centre", "communityEditing")}
                    </span>
                    <button type="button" onClick={() => { setEditingId(null); setNewMessage(""); }} className="text-neutral-400 hover:text-neutral-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input
                    ref={fileInputRef as any}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); (e.target as any).value = ""; }}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={fileUploading}
                    className="h-10 w-10 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50">
                    {fileUploading
                      ? <Loader2 size={16} className="animate-spin text-neutral-500" />
                      : <Paperclip size={16} className="text-neutral-500" />}
                  </button>
                  <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-1">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={newMessage}
                      onChange={e => {
                        setNewMessage(e.target.value);
                        if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px"; }
                      }}
                      placeholder={t("centre", "communityMessageIn", { room: activeRoom.name })}
                      className="flex-1 rounded-2xl px-4 py-2.5 text-sm outline-none resize-none bg-white border border-neutral-200 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all"
                      style={{ maxHeight: "120px", minHeight: "42px" }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
                    />
                    <button type="submit" disabled={!newMessage.trim() || isSending}
                      className="h-10 w-10 rounded-full text-white flex items-center justify-center disabled:opacity-30 shrink-0 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: editingId ? "#10b981" : BLUE }}>
                      {editingId ? <Check size={16} /> : isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
                    </button>
                  </form>
                </div>
              </div>

            </div>

      {showCreateGroup && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-sm w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium tracking-tight" style={{ color: BLUE }}>{t("centre", "communityNewGroup")}</h3>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="h-8 w-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"><X size={16} /></button>
            </div>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createAdminGroup()}
              placeholder="Ex. Staff, Promo 2025, Alumni…"
              autoFocus
              className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-800 outline-none mb-4 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
            />
            <button
              type="button"
              onClick={createAdminGroup}
              disabled={!newGroupName.trim() || creatingGroup}
              className="w-full h-10 rounded-full text-sm text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5 hover:opacity-90"
              style={{ backgroundColor: BLUE }}
            >
              {creatingGroup ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {t("centre", "financeCreate")}
            </button>
          </div>
        </div>
      )}

      {showMembers && activeRoom && centerId && (
        <MembersDrawer roomId={activeRoom.id} roomName={activeRoom.name} centerId={centerId} onClose={() => setShowMembers(false)} />
      )}
    </div>
  );
}

export default function CommunauteCenterPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-300" /></div>}>
      <CommunauteCenterContent />
    </Suspense>
  );
}
