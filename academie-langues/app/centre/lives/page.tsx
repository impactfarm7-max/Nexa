"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video, Calendar, Clock, Users, Plus, Settings2, Radio, Lock, X, Trash2,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { loadCenterBootstrap } from "@/app/utils/center-me-cache";
import { JOIN_BEFORE_MS, sessionStartMs, sessionEndMs } from "@/app/utils/collectiveLive";
import {
  BLUE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
  OutlineHeaderButton,
  EmptyState,
} from "../center-page-ui";

const ORANGE = "#eb670e";

type LivePerson = {
  id: string;
  label: string;
  role: string;
  email?: string | null;
};

type AudienceGroupe = {
  id: string;
  name: string;
  student_ids: string[];
  student_count: number;
};

type AudienceProgramme = {
  id: string;
  name: string;
  student_ids: string[];
  student_count: number;
  groupes: AudienceGroupe[];
};

type LiveItem = {
  id: string;
  slot_id: string;
  kind: string;
  kanban: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  mode?: string;
  formateur?: string | null;
  formateur_id?: string | null;
  participants?: Array<{ id: string; prenom?: string | null; nom?: string | null; role?: string | null }>;
  participant_ids?: string[];
  can_join?: boolean;
};

function fmtDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fmtTime(t?: string) {
  if (!t) return "—";
  return t.slice(0, 5);
}

function roleLabel(role: string) {
  if (role === "student") return "Étudiant";
  if (role === "trainer") return "Formateur";
  if (role === "center_manager") return "Directeur";
  if (role === "campus_manager") return "Campus";
  if (role === "staff") return "Staff";
  if (role === "admin") return "Admin";
  return role;
}

function canJoinSession(item: LiveItem) {
  if (item.kanban !== "planifie" || !item.slot_id) return false;
  if (typeof item.can_join === "boolean") return item.can_join;
  const start = sessionStartMs(item.date, item.start_time || "09:00");
  const end = sessionEndMs(item.date, item.end_time || "10:00");
  const now = Date.now();
  return now >= start - JOIN_BEFORE_MS && now <= end;
}

function sessionStatus(item: LiveItem): "join" | "upcoming" | "ended" | "cancelled" {
  if (item.kanban === "annule") return "cancelled";
  if (item.kanban === "realise") return "ended";
  const end = sessionEndMs(item.date, item.end_time || "10:00");
  if (Date.now() > end) return "ended";
  if (canJoinSession(item)) return "join";
  return "upcoming";
}

export default function CentreLivesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livesReady, setLivesReady] = useState(false);
  const [sessions, setSessions] = useState<LiveItem[]>([]);
  const [people, setPeople] = useState<LivePerson[]>([]);
  const [audiences, setAudiences] = useState<AudienceProgramme[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<LiveItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [formateurId, setFormateurId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [peopleFilter, setPeopleFilter] = useState("");
  const [peopleTab, setPeopleTab] = useState<"students" | "staff">("students");
  const [audienceProgrammeId, setAudienceProgrammeId] = useState("");
  const [audienceGroupeIds, setAudienceGroupeIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadCenterBootstrap();
      // Sessions Live (invitations ciblées) — tous types de centre (TCF, pluri, courte)
      setLivesReady(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée.");
        setLoading(false);
        return;
      }
      setToken(session.access_token);

      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
      const res = await fetch(`/api/centre/lives?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Impossible de charger les sessions.");

      setSessions((json.items || []) as LiveItem[]);
      setPeople((json.people || []) as LivePerson[]);
      setAudiences((json.audiences || []) as AudienceProgramme[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setStartTime("10:00");
    setEndTime("11:00");
    setFormateurId("");
    setSelectedIds([]);
    setFormError("");
    setPeopleFilter("");
    setPeopleTab("students");
    setAudienceProgrammeId("");
    setAudienceGroupeIds([]);
    setPanelOpen(true);
  };

  const openEdit = (item: LiveItem) => {
    setEditing(item);
    setTitle(item.title || "");
    setDate(item.date);
    setStartTime(item.start_time?.slice(0, 5) || "10:00");
    setEndTime(item.end_time?.slice(0, 5) || "11:00");
    setFormateurId(item.formateur_id || "");
    setSelectedIds(item.participant_ids || []);
    setFormError("");
    setPeopleFilter("");
    setPeopleTab("students");
    setAudienceProgrammeId("");
    setAudienceGroupeIds([]);
    setPanelOpen(true);
  };

  const mergeStudentIds = (ids: string[]) => {
    const students = ids.filter((id) => people.find((p) => p.id === id)?.role === "student");
    if (students.length === 0) return 0;
    setSelectedIds((prev) => [...new Set([...prev, ...students])]);
    setPeopleTab("students");
    return students.length;
  };

  const selectedAudienceProgramme = useMemo(
    () => audiences.find((a) => a.id === audienceProgrammeId) || null,
    [audiences, audienceProgrammeId]
  );

  const toggleAudienceGroupe = (groupeId: string) => {
    setAudienceGroupeIds((prev) =>
      prev.includes(groupeId) ? prev.filter((id) => id !== groupeId) : [...prev, groupeId]
    );
  };

  /** Aperçu avant validation : classes cochées, sinon tout le programme. */
  const audiencePreview = useMemo(() => {
    if (!selectedAudienceProgramme) {
      return { scopeLabel: "", groupeNames: [] as string[], people: [] as LivePerson[] };
    }
    const useClasses = audienceGroupeIds.length > 0;
    const selectedGroupes = useClasses
      ? selectedAudienceProgramme.groupes.filter((g) => audienceGroupeIds.includes(g.id))
      : selectedAudienceProgramme.groupes;
    const ids = [
      ...new Set(
        useClasses
          ? selectedGroupes.flatMap((g) => g.student_ids)
          : selectedAudienceProgramme.student_ids
      ),
    ];
    const previewPeople = ids
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is LivePerson => Boolean(p))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
    const scopeLabel = useClasses
      ? selectedGroupes.map((g) => g.name).join(" · ")
      : `Tout le programme « ${selectedAudienceProgramme.name} »`;
    return {
      scopeLabel,
      groupeNames: selectedGroupes.map((g) => g.name),
      people: previewPeople,
    };
  }, [selectedAudienceProgramme, audienceGroupeIds, people]);

  const applyAudiencePreview = () => {
    const n = mergeStudentIds(audiencePreview.people.map((p) => p.id));
    if (n === 0) {
      setFormError("Aucun inscrit actif à ajouter pour cette audience.");
      return;
    }
    setFormError("");
  };

  const alreadyInvitedCount = useMemo(() => {
    if (audiencePreview.people.length === 0) return 0;
    return audiencePreview.people.filter((p) => selectedIds.includes(p.id)).length;
  }, [audiencePreview.people, selectedIds]);

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredPeople = useMemo(() => {
    const q = peopleFilter.trim().toLowerCase();
    return people.filter((p) => {
      const isStudent = p.role === "student";
      if (peopleTab === "students" ? !isStudent : isStudent) return false;
      if (!q) return true;
      return (
        p.label.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        roleLabel(p.role).toLowerCase().includes(q)
      );
    });
  }, [people, peopleFilter, peopleTab]);

  const trainers = useMemo(
    () =>
      people.filter((p) =>
        ["trainer", "center_manager", "campus_manager", "staff", "admin"].includes(p.role)
      ),
    [people]
  );

  const selectedStudentsCount = useMemo(
    () => selectedIds.filter((id) => people.find((p) => p.id === id)?.role === "student").length,
    [selectedIds, people]
  );
  const selectedStaffCount = useMemo(
    () =>
      selectedIds.filter((id) => {
        const role = people.find((p) => p.id === id)?.role;
        return Boolean(role && role !== "student");
      }).length,
    [selectedIds, people]
  );

  const allVisibleSelected =
    filteredPeople.length > 0 && filteredPeople.every((p) => selectedIds.includes(p.id));

  const toggleAllVisibleParticipants = () => {
    const ids = filteredPeople.map((p) => p.id);
    if (ids.length === 0) return;
    setSelectedIds((prev) => {
      const allOn = ids.every((id) => prev.includes(id));
      if (allOn) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const handleSave = async () => {
    if (!token) return;
    if (!title.trim()) { setFormError("Titre requis."); return; }
    if (!date) { setFormError("Date requise."); return; }
    if (selectedIds.length === 0) { setFormError("Sélectionnez au moins un participant."); return; }
    setSaving(true);
    setFormError("");

    const payload = {
      title: title.trim(),
      specific_date: date,
      start_time: startTime,
      end_time: endTime,
      formateur_id: formateurId || null,
      participant_ids: selectedIds,
      ...(editing ? { id: editing.slot_id } : {}),
    };

    const res = await fetch("/api/centre/lives", {
      method: editing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setFormError(json.error || "Enregistrement impossible.");
      return;
    }
    setPanelOpen(false);
    await load();
  };

  const handleCancel = async (item: LiveItem) => {
    if (!token || !confirm("Annuler cette Session Live ?")) return;
    const res = await fetch("/api/centre/lives", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: item.slot_id, action: "cancel" }),
    });
    if (res.ok) await load();
  };

  const handleDelete = async (item: LiveItem) => {
    if (!token || !confirm("Supprimer définitivement cette session ?")) return;
    const res = await fetch(`/api/centre/lives?id=${item.slot_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) await load();
  };

  const { joinable, upcoming, past } = useMemo(() => {
    const joinable: LiveItem[] = [];
    const upcoming: LiveItem[] = [];
    const past: LiveItem[] = [];
    for (const s of sessions) {
      const st = sessionStatus(s);
      if (st === "join") joinable.push(s);
      else if (st === "upcoming") upcoming.push(s);
      else past.push(s);
    }
    return { joinable, upcoming, past };
  }, [sessions]);

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title="Sessions Live"
          actions={
            livesReady ? (
              <>
                <OutlineHeaderButton onClick={openCreate}>
                  <Plus size={15} /> Nouvelle session
                </OutlineHeaderButton>
                <OutlineHeaderButton onClick={() => router.push("/centre/parametres/live")}>
                  <Settings2 size={14} /> Rappels
                </OutlineHeaderButton>
              </>
            ) : undefined
          }
        />
      }
    >
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium -mt-1 mb-2 max-w-2xl">
          Invitez des étudiants, formateurs ou staff à une visioconférence. Vous pouvez aussi convier un programme ou des classes (inscrits actifs).
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {livesReady && joinable.length > 0 && (
          <section>
            <SectionTitle icon={Radio} label="En direct — rejoindre" accent />
            <div className="space-y-3">
              {joinable.map((s) => (
                <SessionCard
                  key={s.id}
                  item={s}
                  onJoin={() => router.push(`/tcf-canada/live/room/${s.slot_id}?date=${s.date}`)}
                  onEdit={() => openEdit(s)}
                  onCancel={() => handleCancel(s)}
                  joinable
                />
              ))}
            </div>
          </section>
        )}

        {livesReady && upcoming.length > 0 && (
          <section>
            <SectionTitle icon={Calendar} label="À venir" />
            <div className="space-y-3">
              {upcoming.map((s) => (
                <SessionCard
                  key={s.id}
                  item={s}
                  onEdit={() => openEdit(s)}
                  onCancel={() => handleCancel(s)}
                  onDelete={() => handleDelete(s)}
                />
              ))}
            </div>
          </section>
        )}

        {livesReady && sessions.length === 0 && !error && (
          <EmptyState
            title="Aucune Session Live"
            hint="Créez une session et choisissez les participants (étudiants, formateurs, staff)."
            action={
              <OutlineHeaderButton onClick={openCreate}>
                <Plus size={16} /> Créer une session
              </OutlineHeaderButton>
            }
          />
        )}

        {livesReady && past.length > 0 && (
          <section>
            <SectionTitle icon={Clock} label="Terminées ou annulées (21 jours)" muted />
            <div className="space-y-2 opacity-70">
              {past.slice(0, 8).map((s) => (
                <SessionCard key={s.id} item={s} compact />
              ))}
            </div>
          </section>
        )}
      </CenterPageBody>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full sm:w-[440px] h-full bg-white shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b flex items-center justify-between bg-neutral-50 shrink-0">
              <h3 className="text-base font-black" style={{ color: BLUE }}>
                {editing ? "Modifier la session" : "Nouvelle Session Live"}
              </h3>
              <button type="button" onClick={() => setPanelOpen(false)} className="p-2 text-neutral-400 hover:text-black rounded-xl hover:bg-neutral-200">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs font-bold text-red-600">{formError}</div>
              )}

              <label className="block">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Titre</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full p-3 bg-neutral-50 border rounded-xl text-sm font-medium outline-none focus:border-blue-400" placeholder="Ex. Brief équipe, Q&A TCF…" />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 w-full p-3 bg-neutral-50 border rounded-xl text-sm font-medium outline-none focus:border-blue-400" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Début</span>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1.5 w-full p-3 bg-neutral-50 border rounded-xl text-sm font-medium outline-none focus:border-blue-400" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Fin</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1.5 w-full p-3 bg-neutral-50 border rounded-xl text-sm font-medium outline-none focus:border-blue-400" />
                </label>
              </div>

              <label className="block">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Animateur (optionnel)</span>
                <select value={formateurId} onChange={(e) => setFormateurId(e.target.value)} className="mt-1.5 w-full p-3 bg-neutral-50 border rounded-xl text-sm font-medium outline-none focus:border-blue-400">
                  <option value="">—</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>

              {audiences.length > 0 && (
                <div className="rounded-xl border border-black/[0.08] bg-[#F7F7F6] p-3.5 space-y-3">
                  <div>
                    <p className="text-[11px] font-extrabold tracking-tight" style={{ color: BLUE }}>
                      Convier une audience
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Choisissez un programme, éventuellement des classes, puis <span className="font-semibold text-neutral-700">vérifiez la liste</span> avant de l&apos;ajouter à la session.
                    </p>
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">1. Programme</span>
                    <select
                      value={audienceProgrammeId}
                      onChange={(e) => {
                        setAudienceProgrammeId(e.target.value);
                        setAudienceGroupeIds([]);
                      }}
                      className="mt-1.5 w-full p-2.5 bg-white border border-black/[0.08] rounded-xl text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                    >
                      <option value="">— Choisir un programme —</option>
                      {audiences.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.student_count} inscrit{a.student_count === 1 ? "" : "s"} actif{a.student_count === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedAudienceProgramme && (
                    <>
                      {selectedAudienceProgramme.groupes.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">
                              2. Classes (optionnel)
                            </p>
                            {audienceGroupeIds.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setAudienceGroupeIds([])}
                                className="text-[10px] font-semibold text-neutral-500 hover:text-[#11224E]"
                              >
                                Tout le programme
                              </button>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-700">Tout le programme</span>
                            )}
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1 border border-black/[0.06] rounded-xl bg-white p-2">
                            {selectedAudienceProgramme.groupes.map((g) => {
                              const on = audienceGroupeIds.includes(g.id);
                              return (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => toggleAudienceGroupe(g.id)}
                                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold transition-colors ${
                                    on
                                      ? "bg-[#11224E]/[0.08] text-[#11224E] ring-1 ring-[#11224E]/20"
                                      : "hover:bg-neutral-50 text-neutral-700"
                                  }`}
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center text-[8px] ${
                                        on ? "bg-[#11224E] border-[#11224E] text-white" : "border-neutral-300 bg-white"
                                      }`}
                                      aria-hidden
                                    >
                                      {on ? "✓" : ""}
                                    </span>
                                    <span className="truncate">{g.name}</span>
                                  </span>
                                  <span className="text-[10px] text-neutral-400 shrink-0 tabular-nums">
                                    {g.student_count} étud.
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1.5 leading-snug">
                            {audienceGroupeIds.length === 0
                              ? "Aucune classe cochée → aperçu = tous les inscrits du programme."
                              : `${audienceGroupeIds.length} classe${audienceGroupeIds.length > 1 ? "s" : ""} cochée${audienceGroupeIds.length > 1 ? "s" : ""} → aperçu limité à ces classes.`}
                          </p>
                        </div>
                      )}

                      <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-black/[0.06] flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                              3. Aperçu avant ajout
                            </p>
                            <p className="text-[11px] font-semibold text-[#11224E] mt-0.5 truncate" title={audiencePreview.scopeLabel}>
                              {audiencePreview.scopeLabel || "—"}
                            </p>
                          </div>
                          <span className="text-[11px] font-extrabold tabular-nums shrink-0" style={{ color: BLUE }}>
                            {audiencePreview.people.length}
                          </span>
                        </div>
                        {audiencePreview.people.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-neutral-400 text-center">
                            Aucun inscrit actif dans cette audience.
                          </p>
                        ) : (
                          <ul className="max-h-40 overflow-y-auto divide-y divide-black/[0.04]">
                            {audiencePreview.people.map((p) => {
                              const already = selectedIds.includes(p.id);
                              return (
                                <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-neutral-800 truncate">{p.label}</span>
                                  {already ? (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 shrink-0">
                                      Déjà choisi
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 shrink-0">
                                      À ajouter
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {alreadyInvitedCount > 0 && audiencePreview.people.length > 0 && (
                          <p className="px-3 py-1.5 text-[10px] text-neutral-400 border-t border-black/[0.04]">
                            {alreadyInvitedCount}/{audiencePreview.people.length} déjà dans les participants
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={applyAudiencePreview}
                        disabled={audiencePreview.people.length === 0 || alreadyInvitedCount === audiencePreview.people.length}
                        className="w-full h-10 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
                        style={{ backgroundColor: BLUE }}
                      >
                        {alreadyInvitedCount === audiencePreview.people.length && audiencePreview.people.length > 0
                          ? "Déjà tous ajoutés"
                          : `Ajouter ${audiencePreview.people.length - alreadyInvitedCount} personne${audiencePreview.people.length - alreadyInvitedCount > 1 ? "s" : ""} à la session`}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                    Participants retenus ({selectedIds.length})
                  </span>
                  <span className="text-[9px] font-bold text-neutral-400">
                    {selectedStudentsCount} étud. · {selectedStaffCount} staff
                  </span>
                </div>
                {selectedIds.length > 0 && (
                  <div className="mb-2 max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-xl border border-black/[0.06] bg-[#F7F7F6]">
                    {selectedIds.map((id) => {
                      const p = people.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleParticipant(id)}
                          title="Retirer"
                          className="inline-flex items-center gap-1 max-w-full px-2 py-1 rounded-lg bg-white border border-black/[0.06] text-[11px] font-semibold text-[#11224E] hover:border-red-200 hover:text-red-600"
                        >
                          <span className="truncate">{p.label}</span>
                          <X size={11} className="shrink-0 opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5 mb-2 p-1 bg-neutral-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPeopleTab("students")}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                      peopleTab === "students"
                        ? "bg-white text-[#11224E] shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    Étudiants
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeopleTab("staff")}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                      peopleTab === "staff"
                        ? "bg-white text-[#11224E] shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700"
                    }`}
                  >
                    Formateurs / Staff
                  </button>
                </div>
                <input
                  value={peopleFilter}
                  onChange={(e) => setPeopleFilter(e.target.value)}
                  placeholder={peopleTab === "students" ? "Rechercher un étudiant…" : "Rechercher un formateur / staff…"}
                  className="w-full mb-2 p-2.5 bg-neutral-50 border rounded-xl text-xs font-medium outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={toggleAllVisibleParticipants}
                  disabled={filteredPeople.length === 0}
                  className="w-full mb-2 py-2 rounded-xl border border-neutral-200 bg-white text-[10px] font-black uppercase tracking-widest text-[#11224E] hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {allVisibleSelected
                    ? peopleTab === "staff"
                      ? "Tout désélectionner (formateurs / staff)"
                      : "Tout désélectionner (étudiants)"
                    : peopleTab === "staff"
                      ? "Tout sélectionner (formateurs / staff)"
                      : "Tout sélectionner (étudiants)"}
                </button>
                <div className="max-h-56 overflow-y-auto border border-neutral-200 rounded-xl p-2 space-y-1">
                  {filteredPeople.length === 0 ? (
                    <p className="text-xs text-neutral-400 p-2">
                      {peopleTab === "students" ? "Aucun étudiant." : "Aucun formateur / staff."}
                    </p>
                  ) : (
                    filteredPeople.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleParticipant(p.id)}
                        />
                        <span className="text-xs font-bold flex-1 min-w-0 truncate">{p.label}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          p.role === "student" ? "text-amber-600" : "text-blue-600"
                        }`}>
                          {roleLabel(p.role)}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-neutral-50 shrink-0 flex gap-2">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex-1 py-3 rounded-xl border text-xs font-black uppercase tracking-widest text-neutral-500"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? "…" : editing ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CenterPageLayout>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  accent,
  muted,
}: {
  icon: React.ElementType;
  label: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <h2 className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3 ${muted ? "text-neutral-400" : "text-neutral-500"}`}>
      <Icon size={14} className={accent ? "text-emerald-500" : ""} />
      {label}
    </h2>
  );
}

function SessionCard({
  item,
  onJoin,
  onEdit,
  onCancel,
  onDelete,
  joinable,
  compact,
}: {
  item: LiveItem;
  onJoin?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  joinable?: boolean;
  compact?: boolean;
}) {
  const cancelled = item.kanban === "annule";
  const count = item.participants?.length ?? item.participant_ids?.length ?? 0;

  return (
    <div
      className={`bg-white border rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-shadow ${
        joinable ? "border-emerald-200 shadow-sm ring-1 ring-emerald-100" : "border-neutral-200/80"
      } ${compact ? "p-3" : "p-4 sm:p-5"}`}
    >
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${joinable ? "bg-emerald-50" : "bg-blue-50"}`}>
        <Video size={18} className={joinable ? "text-emerald-600" : "text-blue-600"} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate" style={{ color: BLUE }}>
          {item.title || "Session Live"}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5 capitalize">{fmtDate(item.date)}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {fmtTime(item.start_time)} – {fmtTime(item.end_time)}
          </span>
          {item.formateur && <span>Animateur : {item.formateur}</span>}
          <span className="flex items-center gap-1">
            <Users size={11} /> {count} participant{count > 1 ? "s" : ""}
          </span>
        </div>
        {cancelled && (
          <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
            Annulée
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {joinable && onJoin && (
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 transition-colors min-h-[44px]"
          >
            <Radio size={14} /> Rejoindre
          </button>
        )}
        {!joinable && !compact && sessionStatus(item) === "upcoming" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-neutral-400 bg-neutral-50 border border-neutral-100">
            <Lock size={11} /> Ouvre 15 min avant
          </span>
        )}
        {onEdit && !compact && (
          <button type="button" onClick={onEdit} className="px-3 py-2 rounded-xl text-[10px] font-bold border border-neutral-200 hover:border-orange-300">
            Éditer
          </button>
        )}
        {onCancel && !compact && !cancelled && (
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-xl text-[10px] font-bold text-red-500 border border-red-100 hover:bg-red-50">
            Annuler
          </button>
        )}
        {onDelete && !compact && (
          <button type="button" onClick={onDelete} className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50" title="Supprimer">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
