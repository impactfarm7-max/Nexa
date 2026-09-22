"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Calendar, MapPin, BookOpen, X, Pencil, CalendarPlus } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  BLUE,
  ORANGE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
  CenterSelect,
} from "@/app/centre/center-page-ui";

type PlanningSlot = {
  id: string;
  title: string;
  room_name: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  groupe_id: string | null;
  scheduled_at: string;
  has_convocation?: boolean;
};

type Meta = {
  filieres: { id: string; name: string }[];
  rooms: string[];
  groupes: { id: string; nom: string; filiere_id: string | null }[];
  matieres: { id: string; filiere_id: string; label: string; credits: number | null }[];
  students: { id: string; name: string; groupe_id: string | null }[];
  planningSlots?: PlanningSlot[];
  exam_convocation_from_planning?: "manual" | "auto";
};

type Convocation = {
  id: string;
  epreuve_label: string;
  scheduled_at: string;
  duration_minutes: number | null;
  room_name: string;
  status: string;
  target_scope: string;
  filiere_id?: string | null;
  filiere_matiere_id?: string | null;
  instructions?: string | null;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExamConvocationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState<Convocation[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filiereId, setFiliereId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [epreuveLabel, setEpreuveLabel] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("120");
  const [roomName, setRoomName] = useState("");
  const [customRoom, setCustomRoom] = useState("");
  const [instructions, setInstructions] = useState("");
  const [targetScope, setTargetScope] = useState<"all" | "groupes" | "students">("groupes");
  const [groupeIds, setGroupeIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [scheduleSlotId, setScheduleSlotId] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  }, []);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    const [listRes, metaRes] = await Promise.all([
      fetch("/api/centre/exam-convocations", { headers }),
      fetch("/api/centre/exam-convocations?meta=1", { headers }),
    ]);
    const listJson = await listRes.json();
    const metaJson = await metaRes.json();
    if (!listRes.ok) setError(listJson.error || "Chargement impossible.");
    else setList(listJson.convocations || []);
    if (metaRes.ok) setMeta(metaJson);
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const matieresFiltered = useMemo(
    () => (meta?.matieres || []).filter((m) => !filiereId || m.filiere_id === filiereId),
    [meta, filiereId],
  );
  const groupesFiltered = useMemo(
    () => (meta?.groupes || []).filter((g) => !filiereId || g.filiere_id === filiereId),
    [meta, filiereId],
  );

  const resetForm = () => {
    setEditingId(null);
    setFiliereId("");
    setMatiereId("");
    setEpreuveLabel("");
    setScheduledAt("");
    setDuration("120");
    setRoomName("");
    setCustomRoom("");
    setInstructions("");
    setTargetScope("groupes");
    setGroupeIds([]);
    setStudentIds([]);
    setScheduleSlotId(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openFromPlanning = (slot: PlanningSlot) => {
    resetForm();
    setScheduleSlotId(slot.id);
    setEpreuveLabel(slot.title);
    setScheduledAt(toLocalInput(new Date(slot.scheduled_at).toISOString()));
    setDuration(String(slot.duration_minutes || 120));
    if (slot.room_name) {
      const known = (meta?.rooms || []).includes(slot.room_name);
      if (known) setRoomName(slot.room_name);
      else {
        setRoomName("__custom__");
        setCustomRoom(slot.room_name);
      }
    }
    if (slot.groupe_id) {
      setTargetScope("groupes");
      setGroupeIds([slot.groupe_id]);
      const g = meta?.groupes.find((x) => x.id === slot.groupe_id);
      if (g?.filiere_id) setFiliereId(g.filiere_id);
    }
    setShowForm(true);
  };

  const openEdit = async (id: string) => {
    const headers = await authHeaders();
    if (!headers) return;
    setError("");
    const res = await fetch(`/api/centre/exam-convocations?id=${id}`, { headers });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      return;
    }
    const c = json.convocation as Convocation;
    setEditingId(c.id);
    setFiliereId(c.filiere_id || "");
    setMatiereId(c.filiere_matiere_id || "");
    setEpreuveLabel(c.epreuve_label || "");
    setScheduledAt(toLocalInput(c.scheduled_at));
    setDuration(c.duration_minutes != null ? String(c.duration_minutes) : "");
    const known = (meta?.rooms || []).includes(c.room_name);
    if (known) {
      setRoomName(c.room_name);
      setCustomRoom("");
    } else {
      setRoomName("__custom__");
      setCustomRoom(c.room_name || "");
    }
    setInstructions(c.instructions || "");
    setTargetScope((c.target_scope as "all" | "groupes" | "students") || "groupes");
    setGroupeIds(json.groupe_ids || []);
    setStudentIds(json.student_ids || []);
    setShowForm(true);
  };

  const submit = async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setSaving(true);
    setError("");
    const room = roomName === "__custom__" ? customRoom.trim() : roomName.trim();
    const payload = {
      filiere_id: filiereId || null,
      filiere_matiere_id: matiereId || null,
      epreuve_label: epreuveLabel.trim(),
      scheduled_at: scheduledAt,
      duration_minutes: duration ? Number(duration) : null,
      room_name: room,
      instructions: instructions.trim() || null,
      target_scope: targetScope,
      groupe_ids: groupeIds,
      student_ids: studentIds,
      status: "published" as const,
      notify: true,
      schedule_slot_id: scheduleSlotId,
    };

    const res = await fetch("/api/centre/exam-convocations", {
      method: editingId ? "PATCH" : "POST",
      headers,
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Enregistrement impossible.");
      return;
    }
    setShowForm(false);
    resetForm();
    await load();
  };

  const cancelConvocation = async (id: string) => {
    if (!confirm("Annuler cette convocation ?")) return;
    const headers = await authHeaders();
    if (!headers) return;
    await fetch("/api/centre/exam-convocations", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    await load();
  };

  const setPlanningMode = async (mode: "manual" | "auto") => {
    if (meta?.exam_convocation_from_planning === mode) return;
    const headers = await authHeaders();
    if (!headers) return;
    setSavingMode(true);
    const res = await fetch("/api/centre/exam-convocations", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ exam_convocation_from_planning: mode }),
    });
    const json = await res.json().catch(() => ({}));
    setSavingMode(false);
    if (!res.ok) {
      setError(json.error || "Impossible de changer le mode.");
      return;
    }
    setMeta((prev) => (prev ? { ...prev, exam_convocation_from_planning: mode } : prev));
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  const planningSlots = meta?.planningSlots || [];
  const planningMode = meta?.exam_convocation_from_planning || "manual";

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title="Convocations d'examens"
          backButton={
            <Link href="/centre/examens/examensuniversels" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08]">
              <ArrowLeft size={16} />
            </Link>
          }
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="h-9 px-3 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1.5"
              style={{ backgroundColor: ORANGE }}
            >
              <Plus size={14} /> Nouvelle convocation
            </button>
          }
        />
      }
    >
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium -mt-1 mb-4">
          Création manuelle ou depuis un créneau daté coché « Examen ». Distinct des sessions live / coaching.
        </p>

        <section className="mb-5 rounded-xl border border-black/[0.08] bg-white px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-neutral-400 mb-2">
            Depuis le planning
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingMode}
              onClick={() => void setPlanningMode("manual")}
              className={`h-8 px-3 rounded-lg text-[12px] font-bold border ${
                planningMode === "manual"
                  ? "text-white border-transparent"
                  : "text-neutral-600 border-black/[0.1] bg-white"
              }`}
              style={planningMode === "manual" ? { backgroundColor: BLUE } : undefined}
            >
              Manuel
            </button>
            <button
              type="button"
              disabled={savingMode}
              onClick={() => void setPlanningMode("auto")}
              className={`h-8 px-3 rounded-lg text-[12px] font-bold border ${
                planningMode === "auto"
                  ? "text-white border-transparent"
                  : "text-neutral-600 border-black/[0.1] bg-white"
              }`}
              style={planningMode === "auto" ? { backgroundColor: ORANGE } : undefined}
            >
              Automatique
            </button>
          </div>
          <p className="mt-2 text-[12px] font-medium text-neutral-500">
            {planningMode === "auto"
              ? "Les créneaux datés cochés « Examen » (avec salle) créent la convocation à la publication / matérialisation."
              : "Vous créez les convocations à la main, ou via « Créer une convocation » sur un créneau examen."}
          </p>
        </section>

        {error && !showForm && (
          <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>
        )}

        {planningSlots.length > 0 && (
          <section className="mb-6">
            <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-neutral-400 mb-2 flex items-center gap-1.5">
              <CalendarPlus size={13} /> Créneaux examen (planning)
            </h3>
            <div className="space-y-2">
              {planningSlots.slice(0, 8).map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: BLUE }}>{slot.title}</p>
                    <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                      {slot.specific_date} · {slot.start_time}–{slot.end_time}
                      {slot.room_name ? ` · ${slot.room_name}` : ""}
                      {slot.has_convocation ? " · déjà convoqué" : ""}
                    </p>
                  </div>
                  {!slot.has_convocation && (
                    <button
                      type="button"
                      onClick={() => openFromPlanning(slot)}
                      className="h-8 px-3 rounded-lg text-[11px] font-bold text-white"
                      style={{ backgroundColor: BLUE }}
                    >
                      Créer une convocation
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/[0.1] bg-white px-4 py-10 text-center text-sm text-neutral-500">
              Aucune convocation pour l&apos;instant.
            </div>
          ) : (
            list.map((c) => (
              <div key={c.id} className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold" style={{ color: BLUE }}>{c.epreuve_label}</p>
                  <p className="mt-1 text-[12px] font-semibold text-neutral-500 inline-flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1"><Calendar size={12} /> {new Date(c.scheduled_at).toLocaleString("fr-FR")}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.room_name}</span>
                    {c.duration_minutes ? <span>{c.duration_minutes} min</span> : null}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                    {c.status === "cancelled" ? "Annulée" : c.status === "draft" ? "Brouillon" : "Publiée"}
                    {" · "}{c.target_scope}
                  </p>
                </div>
                {c.status !== "cancelled" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openEdit(c.id)}
                      className="h-8 px-3 rounded-lg border border-black/[0.1] text-xs font-bold inline-flex items-center gap-1"
                      style={{ color: BLUE }}
                    >
                      <Pencil size={12} /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelConvocation(c.id)}
                      className="h-8 px-3 rounded-lg border border-red-200 text-xs font-bold text-red-600"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-black/[0.08] shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                <h2 className="text-[15px] font-extrabold" style={{ color: BLUE }}>
                  {editingId ? "Modifier la convocation" : "Nouvelle convocation"}
                </h2>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="h-8 w-8 rounded-lg hover:bg-black/[0.04] inline-flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">Programme</span>
                  <CenterSelect
                    value={filiereId}
                    onChange={(v) => { setFiliereId(v); setMatiereId(""); }}
                    options={[
                      { value: "", label: "— Optionnel —" },
                      ...(meta?.filieres || []).map((f) => ({ value: f.id, label: f.name })),
                    ]}
                    className="mt-1"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">UE / Épreuve</span>
                  <CenterSelect
                    value={matiereId}
                    onChange={(v) => {
                      setMatiereId(v);
                      const m = matieresFiltered.find((x) => x.id === v);
                      if (m) setEpreuveLabel(m.label);
                    }}
                    options={[
                      { value: "", label: "— Saisie libre ci-dessous —" },
                      ...matieresFiltered.map((m) => ({ value: m.id, label: m.label })),
                    ]}
                    className="mt-1"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">Libellé de l&apos;épreuve *</span>
                  <input
                    value={epreuveLabel}
                    onChange={(e) => setEpreuveLabel(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none"
                    placeholder="Ex. Algorithmique — partiel"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase text-neutral-400">Date & heure *</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="mt-1 w-full h-10 px-2 rounded-lg border border-black/[0.08] text-sm font-semibold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase text-neutral-400">Durée (min)</span>
                    <input
                      type="number"
                      min={15}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">Salle *</span>
                  <CenterSelect
                    value={roomName}
                    onChange={setRoomName}
                    options={[
                      { value: "", label: "Choisir…" },
                      ...(meta?.rooms || []).map((r) => ({ value: r, label: r })),
                      { value: "__custom__", label: "Autre salle…" },
                    ]}
                    className="mt-1"
                  />
                </label>
                {roomName === "__custom__" && (
                  <input
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold"
                    placeholder="Nom de la salle"
                  />
                )}

                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">Cible</span>
                  <CenterSelect
                    value={targetScope}
                    onChange={(v) => setTargetScope(v as "all" | "groupes" | "students")}
                    options={[
                      { value: "all", label: "Tous les étudiants du programme" },
                      { value: "groupes", label: "Promotions" },
                      { value: "students", label: "Étudiants précis" },
                    ]}
                    className="mt-1"
                  />
                </label>

                {targetScope === "groupes" && (
                  <div className="rounded-lg border border-black/[0.08] max-h-40 overflow-y-auto divide-y">
                    {groupesFiltered.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupeIds.includes(g.id)}
                          onChange={(e) => {
                            setGroupeIds((prev) => e.target.checked ? [...prev, g.id] : prev.filter((x) => x !== g.id));
                          }}
                        />
                        {g.nom}
                      </label>
                    ))}
                    {groupesFiltered.length === 0 && (
                      <p className="px-3 py-2 text-xs text-neutral-400">Aucune promotion.</p>
                    )}
                  </div>
                )}

                {targetScope === "students" && (
                  <div className="rounded-lg border border-black/[0.08] max-h-40 overflow-y-auto divide-y">
                    {(meta?.students || []).map((s) => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentIds.includes(s.id)}
                          onChange={(e) => {
                            setStudentIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id));
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}

                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-neutral-400">Consignes (optionnel)</span>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-black/[0.08] text-sm font-medium"
                    placeholder="Apporter une pièce d'identité, calculatrice interdite…"
                  />
                </label>
              </div>
              <div className="px-4 py-3 border-t border-black/[0.06] flex justify-end gap-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="h-9 px-3 rounded-lg border text-xs font-bold" style={{ color: BLUE }}>
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submit()}
                  className="h-9 px-3 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: ORANGE }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                  {editingId ? "Enregistrer" : "Publier"}
                </button>
              </div>
            </div>
          </div>
        )}
      </CenterPageBody>
    </CenterPageLayout>
  );
}
