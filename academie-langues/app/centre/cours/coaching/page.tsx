"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import {
  CalendarDays,
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  CalendarClock,
  MonitorPlay,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

type Appointment = {
  id: string;
  scheduled_at: string;
  original_scheduled_at?: string | null;
  status: "pending" | "confirmed" | "refused" | "cancelled" | "effectue" | "reporte" | string;
  session_mode?: "en_ligne" | "presentiel" | string;
  note: string | null;
  admin_note: string | null;
  cancel_reason: string | null;
  reschedule_reason?: string | null;
  rescheduled_date?: string | null;
  rescheduled_time?: string | null;
  profiles?: { id: string; prenom: string | null; nom: string | null; email: string | null } | null;
};

type Stats = { pending: number; confirmed: number; reporte: number; effectue: number };

type Masterclass = {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  duration_min: number;
  scheduled_at: string;
  status: string;
};

function studentName(a: Appointment) {
  const p = a.profiles;
  const full = [p?.prenom, p?.nom].filter(Boolean).join(" ").trim();
  return full || p?.email || "Étudiant";
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sessionModeLabel(mode?: string | null) {
  return mode === "presentiel" ? "Présentiel" : "En visio";
}

function SessionModeBadge({ mode }: { mode?: string | null }) {
  const isPresentiel = mode === "presentiel";
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
      isPresentiel ? "text-amber-700 bg-amber-50 border-amber-200" : "text-blue-700 bg-blue-50 border-blue-200"
    }`}>
      {isPresentiel ? <MapPin size={10} /> : <MonitorPlay size={10} />}
      {sessionModeLabel(mode)}
    </span>
  );
}

function canJoin(a: Appointment) {
  if (a.session_mode === "presentiel") return false;
  if (a.status !== "confirmed") return false;
  const start = new Date(a.scheduled_at).getTime();
  const now = Date.now();
  return now >= start - 15 * 60 * 1000 && now <= start + 30 * 60 * 1000;
}

export default function CenterCoachingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, confirmed: 0, reporte: 0, effectue: 0 });
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refuseFor, setRefuseFor] = useState<string | null>(null);
  const [refuseNote, setRefuseNote] = useState("");

  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", duration_min: 60 });

  const load = async (accessToken: string) => {
    const [reqRes, mcRes] = await Promise.all([
      fetch("/api/centre/coaching", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/centre/group-coaching", { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    if (!reqRes.ok) {
      const json = await reqRes.json().catch(() => ({}));
      setError(json.error || "Impossible de charger les demandes.");
      return;
    }
    const json = await reqRes.json();
    setAppointments(json.appointments ?? []);
    setPastAppointments(json.pastAppointments ?? []);
    setStats(json.stats ?? { pending: 0, confirmed: 0, reporte: 0, effectue: 0 });
    if (mcRes.ok) {
      const mcJson = await mcRes.json();
      setMasterclasses(mcJson.sessions ?? []);
    }
  };

  const createMasterclass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/centre/group-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          session_date: form.date,
          session_time: form.time,
          duration_min: Number(form.duration_min) || 60,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Création impossible.");
        return;
      }
      setShowCreate(false);
      setForm({ title: "", description: "", date: "", time: "", duration_min: 60 });
      await load(token);
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setCreating(false);
    }
  };

  const cancelMasterclass = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/centre/group-coaching", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Annulation impossible.");
        return;
      }
      await load(token);
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/login"); return; }
      setToken(session.access_token);
      await load(session.access_token);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => { load(token); }, 30000);
    return () => clearInterval(id);
  }, [token]);

  const pending = useMemo(() => appointments.filter((a) => a.status === "pending"), [appointments]);
  const reporte = useMemo(() => appointments.filter((a) => a.status === "reporte"), [appointments]);
  const confirmed = useMemo(() => appointments.filter((a) => a.status === "confirmed"), [appointments]);

  const patch = async (id: string, status: "confirmed" | "refused" | "effectue", admin_note?: string) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/centre/coaching", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status, admin_note: admin_note ?? null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Action impossible.");
        return;
      }
      setRefuseFor(null);
      setRefuseNote("");
      await load(token);
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#eb670e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full text-neutral-900 font-sans pb-24">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
            <Video className="w-5 h-5 text-[#eb670e]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#11224E]">Coaching du centre</h1>
            <p className="text-xs font-semibold text-neutral-400 mt-0.5">
              Validez et animez les séances 1-on-1 de vos étudiants
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 max-w-2xl">
          {[
            { label: "En attente", value: stats.pending, color: "#f59e0b" },
            { label: "Reports", value: stats.reporte, color: "#2563eb" },
            { label: "Confirmées", value: stats.confirmed, color: "#059669" },
            { label: "Effectuées", value: stats.effectue, color: BLUE },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold flex items-center gap-2 max-w-2xl">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* DEMANDES EN ATTENTE */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <CalendarDays className="w-4 h-4 text-[#eb670e]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#11224E]">Demandes 1-on-1</h2>
          </div>

          {pending.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
              <p className="text-xs font-semibold text-neutral-400">Aucune demande en attente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {pending.map((a) => (
                  <motion.div
                    key={a.id}
                    layout
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase border border-amber-100">
                          En attente
                        </span>
                        <SessionModeBadge mode={a.session_mode} />
                        </div>
                        <h4 className="font-bold text-sm text-[#11224E] mt-2">{studentName(a)}</h4>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1 capitalize">
                          <Clock className="w-3 h-3" /> {fmtWhen(a.scheduled_at)}
                        </p>
                      </div>
                    </div>

                    {a.note && (
                      <p className="text-xs text-neutral-600 italic bg-neutral-50 p-2 rounded-lg border border-neutral-200 mt-3">
                        « {a.note} »
                      </p>
                    )}

                    {refuseFor === a.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={refuseNote}
                          onChange={(e) => setRefuseNote(e.target.value)}
                          maxLength={200}
                          rows={2}
                          placeholder="Motif du refus (optionnel)"
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-neutral-200 focus:border-red-400 outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setRefuseFor(null); setRefuseNote(""); }}
                            className="flex-1 text-xs font-bold text-neutral-500 bg-white border border-neutral-200 py-2 rounded-lg hover:bg-neutral-100"
                          >
                            Retour
                          </button>
                          <button
                            onClick={() => patch(a.id, "refused", refuseNote.trim() || undefined)}
                            disabled={busyId === a.id}
                            className="flex-1 text-xs font-bold bg-red-600 text-white py-2 rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmer le refus"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => patch(a.id, "confirmed")}
                          disabled={busyId === a.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Accepter</>}
                        </button>
                        <button
                          onClick={() => setRefuseFor(a.id)}
                          disabled={busyId === a.id}
                          className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-neutral-200 hover:border-red-200 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Refuser
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* DEMANDES DE REPORT PAR L'ÉTUDIANT */}
        {reporte.length > 0 && (
          <section className="lg:col-span-12 space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#11224E]">Reports demandés par les étudiants</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reporte.map((a) => (
                <div key={a.id} className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase border border-blue-100">
                        Report demandé
                      </span>
                      <SessionModeBadge mode={a.session_mode} />
                      </div>
                      <h4 className="font-bold text-sm text-[#11224E] mt-2">{studentName(a)}</h4>
                      {a.original_scheduled_at && (
                        <p className="text-[10px] text-neutral-400 mt-1 line-through capitalize">
                          {fmtWhen(a.original_scheduled_at)}
                        </p>
                      )}
                      <p className="text-xs text-blue-700 font-semibold flex items-center gap-1 mt-1 capitalize">
                        <Clock className="w-3 h-3" /> Nouvelle date : {fmtWhen(a.scheduled_at)}
                      </p>
                    </div>
                  </div>
                  {a.reschedule_reason && (
                    <p className="text-xs text-neutral-600 italic bg-blue-50/60 p-2 rounded-lg border border-blue-100 mt-3">
                      Motif : « {a.reschedule_reason} »
                    </p>
                  )}
                  {refuseFor === a.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={refuseNote}
                        onChange={(e) => setRefuseNote(e.target.value)}
                        maxLength={200}
                        rows={2}
                        placeholder="Motif du refus (optionnel)"
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-neutral-200 focus:border-red-400 outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setRefuseFor(null); setRefuseNote(""); }} className="flex-1 text-xs font-bold text-neutral-500 bg-white border border-neutral-200 py-2 rounded-lg hover:bg-neutral-100">Retour</button>
                        <button onClick={() => patch(a.id, "refused", refuseNote.trim() || undefined)} disabled={busyId === a.id} className="flex-1 text-xs font-bold bg-red-600 text-white py-2 rounded-lg hover:bg-red-500 disabled:opacity-50">Refuser le report</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => patch(a.id, "confirmed")} disabled={busyId === a.id} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50">
                        {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Valider la nouvelle date</>}
                      </button>
                      <button onClick={() => setRefuseFor(a.id)} disabled={busyId === a.id} className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-neutral-200 hover:border-red-200 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50">
                        <XCircle className="w-4 h-4" /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SESSIONS CONFIRMÉES */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 ml-1">
            <Users className="w-4 h-4 text-[#11224E]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#11224E]">Séances confirmées</h2>
          </div>

          {confirmed.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
              <p className="text-xs font-semibold text-neutral-400">Aucune séance confirmée à venir.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {confirmed.map((a) => (
                <div key={a.id} className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <CheckCircle2 size={10} /> Confirmée
                    </span>
                    <SessionModeBadge mode={a.session_mode} />
                    </div>
                    <h4 className="font-black text-sm text-[#11224E] mt-2">{studentName(a)}</h4>
                    <p className="text-xs font-bold text-neutral-400 mt-2 flex items-center gap-1.5 capitalize">
                      <Clock className="w-3.5 h-3.5" /> {fmtWhen(a.scheduled_at)}
                    </p>
                    {a.note && <p className="text-xs text-neutral-500 mt-2 line-clamp-2 italic">« {a.note} »</p>}
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
                    {a.session_mode === "presentiel" ? (
                      <span className="flex-1 py-2 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex justify-center items-center gap-2 text-center px-2">
                        <MapPin size={14} /> Séance en présentiel
                      </span>
                    ) : canJoin(a) ? (
                      <button
                        onClick={() => router.push(`/dashboard/coaching/room/${a.id}`)}
                        className="flex-1 py-2 bg-[#11224E] text-white rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors flex justify-center items-center gap-2 animate-pulse"
                      >
                        <Video size={14} /> Rejoindre
                      </button>
                    ) : (
                      <button disabled className="flex-1 py-2 bg-neutral-50 text-neutral-400 rounded-lg text-xs font-bold border border-neutral-200 cursor-not-allowed">
                        S&apos;ouvre 15 min avant
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HISTORIQUE */}
          {pastAppointments.length > 0 && (
            <div className="pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3 ml-1">Historique</h3>
              <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm divide-y divide-neutral-100">
                {pastAppointments.map((a) => {
                  const isCancelled = a.status === "cancelled";
                  const isRefused = a.status === "refused";
                  const label = isCancelled ? "Annulée" : isRefused ? "Refusée" : "Effectuée";
                  return (
                  <div key={a.id} className="p-4 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-[9px] border w-20 text-center shrink-0 ${
                        isCancelled ? "bg-red-50 text-red-600 border-red-100" : isRefused ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}>
                        {label}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#11224E]">{studentName(a)}</p>
                        <p className="text-neutral-400 font-medium mt-0.5 capitalize">{fmtWhen(a.scheduled_at)}</p>
                        {a.cancel_reason && <p className="text-[10px] text-red-500 mt-1 truncate">Motif annulation : {a.cancel_reason}</p>}
                        {a.reschedule_reason && <p className="text-[10px] text-blue-500 mt-1 truncate">Motif report : {a.reschedule_reason}</p>}
                      </div>
                    </div>
                  </div>
                );})}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MASTERCLASS / COACHING DE GROUPE */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 ml-1">
            <Sparkles className="w-4 h-4 text-[#eb670e]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#11224E]">Masterclass du centre</h2>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[#eb670e] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Planifier une masterclass
          </button>
        </div>

        {masterclasses.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
            <p className="text-xs font-semibold text-neutral-400">Aucune masterclass programmée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {masterclasses.map((m) => (
              <div key={m.id} className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                      m.status === "cancelled" ? "text-neutral-500 bg-neutral-100" : "text-purple-600 bg-purple-50"
                    }`}>
                      <Users size={10} /> {m.status === "cancelled" ? "Annulée" : "Masterclass"}
                    </span>
                    {m.status === "scheduled" && (
                      <button
                        onClick={() => cancelMasterclass(m.id)}
                        disabled={busyId === m.id}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Annuler la masterclass"
                      >
                        {busyId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  <h4 className="font-black text-sm text-[#11224E] mt-2">{m.title}</h4>
                  {m.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{m.description}</p>}
                  <p className="text-xs font-bold text-neutral-400 mt-3 flex items-center gap-1.5 capitalize">
                    <Clock className="w-3.5 h-3.5" /> {fmtWhen(m.scheduled_at)} · {m.duration_min} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL CRÉATION MASTERCLASS */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-[#11224E]">
                <h3 className="font-black text-white text-sm uppercase tracking-wider">Planifier une masterclass</h3>
                <button onClick={() => setShowCreate(false)} className="text-white/60 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={createMasterclass} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">Titre</label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    maxLength={120}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb670e]"
                    placeholder="Ex: Préparation intensive TCF"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">Description (optionnel)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={1000}
                    rows={2}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb670e] resize-none"
                    placeholder="Programme de la séance..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">Date</label>
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb670e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">Heure</label>
                    <input
                      required
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb670e]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">Durée (minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    step={15}
                    value={form.duration_min}
                    onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb670e]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full mt-2 bg-[#eb670e] hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer la planification"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
