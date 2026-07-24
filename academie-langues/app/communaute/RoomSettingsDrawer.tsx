"use client";

import { useEffect, useState } from "react";
import { X, Copy, RefreshCcw, Crown, ShieldCheck, UserMinus, Camera, Check, CalendarClock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import type { CommunityRoom } from "./useRooms";

const BRAND = { blue: "#11224E", orange: "#F87B1B" };

import ProfileAvatar from "@/app/components/ProfileAvatar";

type Member = { user_id: string; role: string; prenom: string; avatar_url: string | null };

type ScheduleEvent = {
  id: string;
  type: "cours" | "live" | "examen" | "autre";
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  meeting_url: string | null;
  exam_template_id: string | null;
  disciplineName: string | null;
};

type Option = { id: string; name: string };

export default function RoomSettingsDrawer({
  room,
  isGlobalAdmin,
  onClose,
  onRegenerateCode,
  onRoomUpdated,
}: {
  room: CommunityRoom;
  isGlobalAdmin: boolean;
  onClose: () => void;
  onRegenerateCode: (roomId: string) => Promise<string>;
  onRoomUpdated: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canManage = room.role === "owner" || room.role === "room_admin" || isGlobalAdmin;
  const isClassroom = room.type === "classroom";

  // ── Emploi du temps (classrooms uniquement) ──
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [disciplines, setDisciplines] = useState<Option[]>([]);
  const [templates, setTemplates] = useState<Option[]>([]);
  const [evType, setEvType] = useState<"cours" | "live" | "examen" | "autre">("cours");
  const [evTitle, setEvTitle] = useState("");
  const [evDisciplineId, setEvDisciplineId] = useState("");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evMeetingUrl, setEvMeetingUrl] = useState("");
  const [evExamTemplateId, setEvExamTemplateId] = useState("");
  const [evSaving, setEvSaving] = useState(false);
  const [evError, setEvError] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_room_members")
      .select("user_id, role, profiles:user_id(prenom, avatar_url)")
      .eq("room_id", room.id);
    setMembers(
      (data || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        prenom: m.profiles?.prenom || "Étudiant",
        avatar_url: m.profiles?.avatar_url || null,
      })),
    );
    setLoading(false);
  };

  const fetchEvents = async () => {
    if (!isClassroom) { setEventsLoading(false); return; }
    setEventsLoading(true);
    const { data } = await supabase
      .from("schedule_events")
      .select("id, type, title, starts_at, ends_at, location, meeting_url, exam_template_id, exam_disciplines(name)")
      .eq("room_id", room.id)
      .order("starts_at", { ascending: true });
    setEvents(
      (data || []).map((e: any) => ({
        ...e,
        disciplineName: e.exam_disciplines?.name || null,
      }))
    );
    setEventsLoading(false);
  };

  useEffect(() => {
    fetchMembers();
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (!addEventOpen) return;
    (async () => {
      const { data: discs } = await supabase.from("exam_disciplines").select("id, name").order("name");
      setDisciplines(discs || []);
      const { data: tpls } = await supabase.from("exam_templates").select("id, name");
      setTemplates(tpls || []);
    })();
  }, [addEventOpen]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    await onRegenerateCode(room.id);
    onRoomUpdated();
  };

  const setRole = async (userId: string, newRole: "member" | "room_admin") => {
    await supabase.from("community_room_members").update({ role: newRole }).eq("room_id", room.id).eq("user_id", userId);
    fetchMembers();
  };

  const removeMember = async (userId: string) => {
    if (!window.confirm("Retirer ce membre de la salle ?")) return;
    await supabase.from("community_room_members").delete().eq("room_id", room.id).eq("user_id", userId);
    fetchMembers();
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${room.id}/photo.${ext}`;
    const { error } = await supabase.storage.from("room-photos").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("room-photos").getPublicUrl(path);
      await supabase.from("community_rooms").update({ photo_url: data.publicUrl }).eq("id", room.id);
      onRoomUpdated();
    } else {
      alert("Erreur lors de l'envoi de la photo : " + error.message);
    }
    setUploading(false);
  };

  const resetEventForm = () => {
    setEvType("cours");
    setEvTitle("");
    setEvDisciplineId("");
    setEvStart("");
    setEvEnd("");
    setEvLocation("");
    setEvMeetingUrl("");
    setEvExamTemplateId("");
    setEvError("");
  };

  const handleCreateEvent = async () => {
    setEvError("");
    if (!evTitle.trim()) return setEvError("Le titre est requis.");
    if (!evStart || !evEnd) return setEvError("Date de début et de fin requises.");
    if (evType === "examen" && !evExamTemplateId) return setEvError("Choisis le modèle d'examen.");

    setEvSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");

      const { error } = await supabase.from("schedule_events").insert({
        room_id: room.id,
        type: evType,
        title: evTitle.trim(),
        discipline_id: evDisciplineId || null,
        starts_at: new Date(evStart).toISOString(),
        ends_at: new Date(evEnd).toISOString(),
        location: evLocation.trim() || null,
        meeting_url: evType === "live" ? evMeetingUrl.trim() || null : null,
        exam_template_id: evType === "examen" ? evExamTemplateId : null,
        created_by: session.user.id,
      });
      if (error) throw new Error(error.message);

      await fetchEvents();
      resetEventForm();
      setAddEventOpen(false);
    } catch (e: any) {
      setEvError(e.message || "Erreur lors de la création.");
    } finally {
      setEvSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!window.confirm("Supprimer ce créneau ?")) return;
    await supabase.from("schedule_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[2rem] flex flex-col overflow-hidden shadow-2xl" style={{ height: "min(720px, 94vh)" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="relative w-12 h-12 shrink-0">
            {room.photo_url ? (
              <img src={room.photo_url} alt="" className="w-12 h-12 rounded-2xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center font-black text-orange-600">
                {room.name.charAt(0)}
              </div>
            )}
            {canManage && (
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center cursor-pointer border-2 border-white">
                <Camera size={11} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </label>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{room.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {room.type === "classroom" ? "Salle de classe" : room.type === "announcement" ? "Annonces" : "Groupe éphémère"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {canManage && (
          <div className="px-5 py-4 border-b border-slate-100 space-y-2 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lien d'invitation</p>
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5">
              <p className="flex-1 text-xs font-bold text-slate-700 truncate">{room.invite_code}</p>
              <button onClick={copyLink} className="p-1.5 text-slate-500 hover:text-orange-600" title="Copier le code">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button onClick={regenerate} className="p-1.5 text-slate-500 hover:text-orange-600" title="Régénérer le lien">
                <RefreshCcw size={14} />
              </button>
            </div>
            {uploading && <p className="text-[10px] text-slate-400">Envoi de la photo...</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* ── EMPLOI DU TEMPS (classrooms uniquement) ── */}
          {isClassroom && (
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <CalendarClock size={12} /> Emploi du temps
                </p>
                {canManage && (
                  <button
                    onClick={() => setAddEventOpen((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ color: BRAND.orange, backgroundColor: "#FFF3E8" }}
                  >
                    <Plus size={10} /> Créneau
                  </button>
                )}
              </div>

              {addEventOpen && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-3 space-y-2.5">
                  <div className="flex gap-2">
                    {(["cours", "live", "examen", "autre"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setEvType(t)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${evType === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="Titre (ex : Cours de grammaire)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Début</label>
                      <input type="datetime-local" value={evStart} onChange={(e) => setEvStart(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-200" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Fin</label>
                      <input type="datetime-local" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-orange-200" />
                    </div>
                  </div>
                  <select value={evDisciplineId} onChange={(e) => setEvDisciplineId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200">
                    <option value="">Matière (optionnel)</option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  {evType === "live" && (
                    <input
                      value={evMeetingUrl}
                      onChange={(e) => setEvMeetingUrl(e.target.value)}
                      placeholder="Lien de la visio"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  )}
                  {evType === "examen" && (
                    <select value={evExamTemplateId} onChange={(e) => setEvExamTemplateId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200">
                      <option value="">Choisir le modèle d'examen...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                  {(evType === "cours" || evType === "autre") && (
                    <input
                      value={evLocation}
                      onChange={(e) => setEvLocation(e.target.value)}
                      placeholder="Lieu (optionnel)"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  )}
                  {evError && <p className="text-[10px] font-bold text-red-500">{evError}</p>}
                  <button
                    onClick={handleCreateEvent}
                    disabled={evSaving}
                    className="w-full py-2.5 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    style={{ backgroundColor: BRAND.orange }}
                  >
                    {evSaving ? "Publication..." : "Publier le créneau"}
                  </button>
                </div>
              )}

              {eventsLoading ? (
                <p className="text-xs text-slate-400 text-center py-3">Chargement...</p>
              ) : events.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Aucun créneau publié pour l'instant.</p>
              ) : (
                <div className="space-y-1.5">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{ev.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(ev.starts_at).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {new Date(ev.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          {ev.disciplineName ? ` · ${ev.disciplineName}` : ""}
                        </p>
                      </div>
                      {canManage && (
                        <button onClick={() => deleteEvent(ev.id)} className="p-1.5 text-slate-300 hover:text-red-500 shrink-0">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MEMBRES ── */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              {members.length} membre{members.length > 1 ? "s" : ""}
            </p>
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Chargement...</p>
            ) : (
              <div className="space-y-1.5">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 py-2">
                    <ProfileAvatar url={m.avatar_url} name={m.prenom} size="w-8 h-8" />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.prenom}</p>
                      {m.role === "owner" && <Crown size={12} className="text-orange-500 shrink-0" />}
                      {m.role === "room_admin" && <ShieldCheck size={12} className="text-orange-500 shrink-0" />}
                    </div>
                    {canManage && m.role !== "owner" && (
                      <div className="flex items-center gap-1 shrink-0">
                        {m.role === "member" ? (
                          <button onClick={() => setRole(m.user_id, "room_admin")} className="text-[10px] font-bold text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-50">
                            Nommer admin
                          </button>
                        ) : (
                          <button onClick={() => setRole(m.user_id, "member")} className="text-[10px] font-bold text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-50">
                            Retirer admin
                          </button>
                        )}
                        <button onClick={() => removeMember(m.user_id)} className="p-1.5 text-slate-300 hover:text-red-500">
                          <UserMinus size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}