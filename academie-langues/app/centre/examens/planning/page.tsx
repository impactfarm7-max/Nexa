"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Plus, Loader2, Calendar, Users, User, BookOpen,
  ChevronLeft, ChevronRight, X, Send, Unlock, Zap, Pencil
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { examensComplets } from "@/app/data/examens_complets";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, ORANGE, PAGE_BG } from "@/app/centre/center-page-ui";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resetFormState(setters: {
  setEditingSessionId: (v: string | null) => void;
  setTitle: (v: string) => void;
  setExamenId: (v: string) => void;
  setScheduledAt: (v: string) => void;
  setSessionType: (v: "scheduled" | "exceptional") => void;
  setTargetType: (v: "all" | "groupes" | "students") => void;
  setTargetGroupeIds: (v: string[]) => void;
  setTargetStudentIds: (v: string[]) => void;
  setOpenNow: (v: boolean) => void;
  setError: (v: string) => void;
}) {
  setters.setEditingSessionId(null);
  setters.setTitle("");
  setters.setExamenId("1");
  setters.setScheduledAt("");
  setters.setSessionType("scheduled");
  setters.setTargetType("all");
  setters.setTargetGroupeIds([]);
  setters.setTargetStudentIds([]);
  setters.setOpenNow(false);
  setters.setError("");
}

type GroupeOption = { id: string; nom: string };
type StudentOption = { id: string; prenom: string; nom: string; groupe_id: string | null };
type DayEntry = {
  session_id: string;
  title: string;
  examen_id: number;
  scheduled_at: string;
  students: { id: string; name: string; status: string }[];
};

export default function TcfExamPlanningPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState("generic");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [days, setDays] = useState<Record<string, DayEntry[]>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [examenId, setExamenId] = useState("1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sessionType, setSessionType] = useState<"scheduled" | "exceptional">("scheduled");
  const [targetType, setTargetType] = useState<"all" | "groupes" | "students">("all");
  const [targetGroupeIds, setTargetGroupeIds] = useState<string[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [openNow, setOpenNow] = useState(false);

  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [unlockStudentId, setUnlockStudentId] = useState("");
  const [unlockExamenId, setUnlockExamenId] = useState("");
  const [unlockExpires, setUnlockExpires] = useState("");
  const [unlockReason, setUnlockReason] = useState("");

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
      if (!profile?.center_id) { setLoading(false); return; }
      const { data: center } = await supabase.from("centers").select("center_type").eq("id", profile.center_id).single();
      setCenterType(center?.center_type || "generic");

      const { data: filiere } = await supabase.from("filieres").select("id").eq("center_id", profile.center_id).eq("name", "TCF Canada").maybeSingle();
      if (filiere?.id) {
        const [{ data: grpData }, { data: enrollData }] = await Promise.all([
          supabase.from("groupes").select("id, nom").eq("filiere_id", filiere.id),
          supabase.from("enrollments").select("student_id, groupe_id, profiles:student_id(prenom, nom)").eq("filiere_id", filiere.id).eq("status", "active"),
        ]);
        setGroupes(grpData || []);
        setStudents((enrollData || []).map((e: any) => ({
          id: e.student_id,
          prenom: e.profiles?.prenom || "",
          nom: e.profiles?.nom || "",
          groupe_id: e.groupe_id || null,
        })));
      }
      setLoading(false);
    })();
  }, []);

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setCalendarLoading(false); return; }
    const res = await fetch(`/api/centre/tcf-exams/calendar?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setDays(json.days || {});
    }
    setCalendarLoading(false);
  }, [month]);

  useEffect(() => { if (!loading) loadCalendar(); }, [loading, loadCalendar]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const toggleGroupe = (id: string) => setTargetGroupeIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleStudent = (id: string) => setTargetStudentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const closeForm = () => {
    setShowForm(false);
    resetFormState({
      setEditingSessionId, setTitle, setExamenId, setScheduledAt, setSessionType,
      setTargetType, setTargetGroupeIds, setTargetStudentIds, setOpenNow, setError,
    });
  };

  const openCreateForm = () => {
    resetFormState({
      setEditingSessionId, setTitle, setExamenId, setScheduledAt, setSessionType,
      setTargetType, setTargetGroupeIds, setTargetStudentIds, setOpenNow, setError,
    });
    setShowForm(true);
  };

  const openEditForm = async (entry: DayEntry) => {
    setError("");
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const res = await fetch(`/api/centre/tcf-exams?session_id=${entry.session_id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error || "Impossible de charger la séance.");
      return;
    }

    const s = json.session;
    setEditingSessionId(s.id);
    setTitle(s.title || "");
    setExamenId(String(s.examen_id || 1));
    setScheduledAt(toDatetimeLocal(s.scheduled_at));
    setSessionType(s.session_type === "exceptional" ? "exceptional" : "scheduled");
    setTargetType(s.target_scope || "all");
    setTargetGroupeIds(json.groupe_ids || []);
    setTargetStudentIds(json.student_ids || []);
    setOpenNow(s.status === "open");
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !scheduledAt) { setError("Titre et date requis."); return; }
    setSaving(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/centre/tcf-exams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        title: title.trim(),
        examen_id: Number(examenId),
        scheduled_at: new Date(scheduledAt).toISOString(),
        session_type: sessionType,
        target_scope: targetType,
        groupe_ids: targetGroupeIds,
        student_ids: targetStudentIds,
        open_now: openNow,
      }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Erreur");
    else {
      closeForm();
      await loadCalendar();
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingSessionId || !title.trim() || !scheduledAt) {
      setError("Titre et date requis.");
      return;
    }
    setSaving(true);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/centre/tcf-exams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        session_id: editingSessionId,
        title: title.trim(),
        examen_id: Number(examenId),
        scheduled_at: new Date(scheduledAt).toISOString(),
        session_type: sessionType,
        open_now: openNow,
      }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Erreur");
    else {
      closeForm();
      await loadCalendar();
    }
    setSaving(false);
  };

  const handleUnlock = async () => {
    if (!unlockStudentId || !unlockExpires) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/centre/tcf-exams/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        user_id: unlockStudentId,
        examen_id: unlockExamenId ? Number(unlockExamenId) : null,
        expires_at: new Date(unlockExpires).toISOString(),
        reason: unlockReason,
      }),
    });
    if (res.ok) {
      setShowUnlock(false);
      setUnlockStudentId(""); setUnlockExpires(""); setUnlockReason("");
    }
    setSaving(false);
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  if (!isTcfCanadaCenter(centerType)) {
    return (
      <div className="min-h-[100dvh] p-12 text-center" style={{ backgroundColor: PAGE_BG }}>
          <p className="text-sm font-semibold text-neutral-500">{t("centre", "examensPlanningTcfOnly")}</p>
          <Link href="/centre/examens/examensuniversels" className="mt-4 inline-block text-xs font-bold uppercase tracking-wider hover:underline" style={{ color: BLUE }}>
            {t("centre", "financeBack")}
          </Link>
      </div>
    );
  }

  const [year, mon] = month.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const startPad = (firstDay.getDay() + 6) % 7;
  const monthLabel = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const selectedEntries = selectedDay ? days[selectedDay] || [] : [];

  return (
    <div className="min-h-[100dvh] flex flex-col h-screen overflow-hidden text-[#11224E]" style={{ backgroundColor: PAGE_BG }}>
        <header className="shrink-0 border-b border-black/[0.06] px-6 py-5 flex items-center justify-between gap-3" style={{ backgroundColor: PAGE_BG }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href="/centre/examens/examensuniversels" className="p-1 rounded-lg hover:bg-black/[0.03]"><ArrowLeft size={14} /></Link>
              <Calendar size={16} className="text-neutral-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Examens TCF</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: BLUE }}>Planning des examens complets</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/centre/examens/resultats" className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-xs font-semibold flex items-center gap-1.5 hover:bg-black/[0.03]">
              Résultats
            </Link>
            <button onClick={() => setShowUnlock(true)} className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-xs font-semibold flex items-center gap-1.5 hover:bg-black/[0.03]">
              <Unlock size={14} /> Débloquer
            </button>
            <button onClick={openCreateForm} className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5" style={{ backgroundColor: BLUE }}>
              <Plus size={14} /> Nouvelle séance
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-neutral-100"><ChevronLeft size={16} /></button>
              <p className="text-sm font-black capitalize">{monthLabel}</p>
              <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-neutral-100"><ChevronRight size={16} /></button>
            </div>
            {calendarLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-neutral-300" /></div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                    <div key={d} className="text-[9px] font-black text-center text-neutral-400 uppercase">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((day, i) => {
                    if (day === null) return <div key={`e-${i}`} />;
                    const key = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const entries = days[key] || [];
                    const isSelected = selectedDay === key;
                    return (
                      <button key={key} onClick={() => setSelectedDay(key)}
                        className={`min-h-[72px] p-1.5 rounded-xl border text-left transition-all ${isSelected ? "border-orange-400 bg-orange-50" : entries.length ? "border-blue-200 bg-blue-50/50 hover:border-orange-300" : "border-neutral-100 hover:border-neutral-200"}`}>
                        <span className="text-[10px] font-black">{day}</span>
                        {entries.length > 0 && (
                          <p className="text-[8px] font-bold text-orange-600 mt-1">{entries.length} séance{entries.length > 1 ? "s" : ""}</p>
                        )}
                        {entries.slice(0, 2).map(e => (
                          <p key={e.session_id} className="text-[7px] text-neutral-500 truncate">{e.students.length} él.</p>
                        ))}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
              {selectedDay ? new Date(selectedDay + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Sélectionnez un jour"}
            </p>
            {selectedEntries.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">Aucune séance ce jour.</p>
            ) : (
              <div className="space-y-4">
                {selectedEntries.map(entry => (
                  <div key={entry.session_id} className="border rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black" style={{ color: BLUE }}>{entry.title}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          Examen {String(entry.examen_id).padStart(2, "0")} · {new Date(entry.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditForm(entry)}
                        className="shrink-0 h-7 px-2 rounded-lg border text-[9px] font-black uppercase flex items-center gap-1 hover:bg-neutral-50"
                      >
                        <Pencil size={11} /> Modifier
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.students.map(s => (
                        <span key={s.id} className={`text-[9px] font-bold px-2 py-0.5 rounded border ${s.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.status === "no_show" ? "bg-red-50 text-red-600 border-red-200" : "bg-neutral-50 text-neutral-600 border-neutral-200"}`}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border w-full max-w-lg p-5 space-y-4 my-8">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black">
                  {editingSessionId ? "Modifier la séance" : "Nouvelle séance d'examen"}
                </h3>
                <button onClick={closeForm}><X size={18} /></button>
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre *" className="w-full h-10 px-3 rounded-xl border text-xs font-bold" />
              <select value={examenId} onChange={e => setExamenId(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs font-bold">
                {examensComplets.map(e => <option key={e.id} value={e.id}>{e.titre}</option>)}
              </select>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs font-bold" />
              <div className="flex gap-2">
                {(["scheduled", "exceptional"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setSessionType(t)}
                    className={`flex-1 h-9 rounded-xl border text-[10px] font-black uppercase ${sessionType === t ? "border-orange-400 bg-orange-50 text-orange-700" : "border-neutral-200"}`}>
                    {t === "scheduled" ? "Planifiée" : "Exceptionnelle"}
                  </button>
                ))}
              </div>
              {sessionType === "exceptional" && (
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input type="checkbox" checked={openNow} onChange={e => setOpenNow(e.target.checked)} />
                  <Zap size={14} className="text-orange-500" /> Ouvrir immédiatement (4h)
                </label>
              )}
              <div className="flex gap-2">
                {([{ v: "all" as const, l: "Tous", I: Users }, { v: "groupes" as const, l: "Classes", I: BookOpen }, { v: "students" as const, l: "Élèves", I: User }]).map(({ v, l, I: Icon }) => (
                  <button key={v} type="button" onClick={() => !editingSessionId && setTargetType(v)} disabled={!!editingSessionId}
                    className={`flex-1 h-9 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1 ${targetType === v ? "border-orange-400 bg-orange-50" : "border-neutral-200"} ${editingSessionId ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <Icon size={12} /> {l}
                  </button>
                ))}
              </div>
              {editingSessionId && (
                <p className="text-[10px] text-neutral-400 italic">Le ciblage élèves/classes ne peut pas être modifié après création.</p>
              )}
              {targetType === "groupes" && (
                <div className={`flex flex-wrap gap-1 max-h-24 overflow-y-auto ${editingSessionId ? "opacity-50 pointer-events-none" : ""}`}>
                  {groupes.map(g => (
                    <button key={g.id} type="button" onClick={() => toggleGroupe(g.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${targetGroupeIds.includes(g.id) ? "border-orange-400 bg-orange-50" : "border-neutral-200"}`}>{g.nom}</button>
                  ))}
                </div>
              )}
              {targetType === "students" && (
                <div className={`flex flex-wrap gap-1 max-h-32 overflow-y-auto ${editingSessionId ? "opacity-50 pointer-events-none" : ""}`}>
                  {students.map(s => (
                    <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${targetStudentIds.includes(s.id) ? "border-orange-400 bg-orange-50" : "border-neutral-200"}`}>{s.nom} {s.prenom}</button>
                  ))}
                </div>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={editingSessionId ? handleUpdate : handleCreate}
                disabled={saving}
                className="w-full h-10 rounded-xl text-white text-xs font-black uppercase flex items-center justify-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : editingSessionId ? <Pencil size={14} /> : <Send size={14} />}
                {editingSessionId ? "Enregistrer" : "Déployer"}
              </button>
            </div>
          </div>
        )}

        {showUnlock && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border w-full max-w-md p-5 space-y-3">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-sm font-black">Déblocage exceptionnel</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Ouvre l&apos;examen complet pour un élève jusqu&apos;à une date/heure précise.</p>
                </div>
                <button onClick={() => setShowUnlock(false)}><X size={18} /></button>
              </div>
              <select value={unlockStudentId} onChange={e => setUnlockStudentId(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs font-bold">
                <option value="">Choisir un élève...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>)}
              </select>
              <select value={unlockExamenId} onChange={e => setUnlockExamenId(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs font-bold">
                <option value="">Tous les examens (libre)</option>
                {examensComplets.map(e => <option key={e.id} value={e.id}>{e.titre}</option>)}
              </select>
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1 block">Valable jusqu&apos;au</label>
                <input type="datetime-local" value={unlockExpires} onChange={e => setUnlockExpires(e.target.value)} className="w-full h-10 px-3 rounded-xl border text-xs font-bold" />
              </div>
              <input value={unlockReason} onChange={e => setUnlockReason(e.target.value)} placeholder="Motif (optionnel)" className="w-full h-10 px-3 rounded-xl border text-xs" />
              <button onClick={handleUnlock} disabled={saving || !unlockStudentId || !unlockExpires} className="w-full h-10 rounded-xl text-white text-xs font-black disabled:opacity-50" style={{ backgroundColor: ORANGE }}>Valider le déblocage</button>
            </div>
          </div>
        )}
    </div>
  );
}
