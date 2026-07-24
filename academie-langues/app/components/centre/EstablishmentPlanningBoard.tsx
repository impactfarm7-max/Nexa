"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronLeft, ChevronRight, MapPin, Ban, RefreshCw,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";

const BLUE = "#11224E";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type EstSlot = {
  slot_id: string;
  day_of_week: number;
  actual_date: string;
  start_time: string;
  end_time: string;
  title: string;
  formateur_prenom: string | null;
  room_name: string | null;
  status: string;
  filiere_name?: string;
};

type PendingReport = {
  id: string;
  slot_id: string;
  exception_date: string;
  reason: string | null;
  schedule_slots: {
    id: string;
    title: string | null;
    start_time: string;
    end_time: string;
    room_name: string | null;
    day_of_week: number;
  };
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const FREE_BLOCKS = [
  { start: "08:00", end: "10:00" },
  { start: "10:00", end: "12:00" },
  { start: "13:00", end: "15:00" },
  { start: "15:00", end: "17:00" },
];

function overlaps(a0: string, a1: string, b0: string, b1: string) {
  return a0 < b1 && b0 < a1;
}

function isPastDay(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  return cmp.getTime() < today.getTime();
}

type Props = { centerId: string };

export default function EstablishmentPlanningBoard({ centerId }: Props) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<EstSlot[]>([]);
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [error, setError] = useState("");
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weekStr = weekStart.toISOString().split("T")[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
      const res = await fetch(
        `/api/center/planning-slots?week_start=${encodeURIComponent(weekStr)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Chargement impossible.");
      setSlots(json.slots || []);
      setPending(json.pending_reports || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }, [weekStr]);

  useEffect(() => {
    void load();
  }, [load, centerId]);

  const byDay = useMemo(() => {
    const map: Record<number, EstSlot[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const s of slots) {
      const d = Number(s.day_of_week);
      if (map[d]) map[d].push(s);
    }
    return map;
  }, [slots]);

  const freeCells = useMemo(() => {
    const cells: { day: number; date: string; start: string; end: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      if (isPastDay(d)) continue;
      const dateStr = d.toISOString().slice(0, 10);
      const daySlots = byDay[i + 1] || [];
      for (const block of FREE_BLOCKS) {
        const busy = daySlots.some(
          (s) =>
            s.status !== "cancelled" &&
            overlaps(fmt5(s.start_time), fmt5(s.end_time), block.start, block.end),
        );
        if (!busy) cells.push({ day: i + 1, date: dateStr, start: block.start, end: block.end });
      }
    }
    return cells;
  }, [byDay, weekStart]);

  const placeReport = async (exceptionId: string, cell: { date: string; start: string; end: string }) => {
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
      const res = await fetch("/api/center/planning-slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "place_reschedule",
          exception_id: exceptionId,
          new_date: cell.date,
          new_start_time: cell.start,
          new_end_time: cell.end,
          reason: "Report placé sur plage libre (calendrier établissement)",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Placement impossible.");
      setPlacingId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const navigate = (dir: "prev" | "next") => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
    setWeekStart(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-neutral-900">Calendrier établissement</h2>
          <p className="text-sm text-neutral-500">Toutes les filières · plages libres · reports</p>
        </div>
        <div className="flex items-center gap-0.5 bg-neutral-100 rounded-xl p-0.5 border">
          <button type="button" onClick={() => navigate("prev")} className="p-1.5 rounded-lg hover:bg-white text-neutral-500">
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="text-[10px] font-bold uppercase px-2 tracking-wider hover:text-orange-600"
          >
            {weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </button>
          <button type="button" onClick={() => navigate("next")} className="p-1.5 rounded-lg hover:bg-white text-neutral-500">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-neutral-400 gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-neutral-100 min-h-[320px]">
              {DAYS.map((day, idx) => {
                const dayNum = idx + 1;
                const daySlots = byDay[dayNum] || [];
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + idx);
                const isPast = isPastDay(dayDate);
                const isToday = dayDate.toDateString() === new Date().toDateString();
                return (
                  <div key={day} className={`min-w-0 ${isPast ? "opacity-55" : ""}`}>
                    <div
                      className={`px-2 py-2 border-b border-neutral-100 ${
                        isPast ? "bg-neutral-100" : isToday ? "bg-orange-50" : "bg-neutral-50"
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase ${isPast ? "text-neutral-300" : "text-neutral-500"}`}>
                        {day}
                      </p>
                      <p className={`text-xs ${isPast ? "text-neutral-300" : isToday ? "text-orange-600 font-bold" : "text-neutral-400"}`}>
                        {dayDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className={`p-1.5 space-y-1.5 ${isPast ? "bg-neutral-50/80" : ""}`}>
                      {daySlots.map((s) => (
                        <div
                          key={`${s.slot_id}-${s.actual_date}`}
                          className={`rounded-lg border px-1.5 py-1.5 text-[10px] ${
                            s.status === "cancelled"
                              ? "border-red-100 bg-red-50 text-red-700"
                              : s.status === "rescheduled"
                                ? "border-amber-100 bg-amber-50 text-amber-800"
                                : "border-neutral-100 bg-neutral-50 text-neutral-800"
                          } ${isPast ? "grayscale-[0.35]" : ""}`}
                        >
                          <p className="font-semibold truncate">{fmt5(s.start_time)}–{fmt5(s.end_time)}</p>
                          <p className="truncate opacity-80">{s.title || "Cours"}</p>
                          {s.filiere_name && <p className="truncate text-neutral-400">{s.filiere_name}</p>}
                          {s.room_name && (
                            <p className="truncate text-neutral-400 flex items-center gap-0.5">
                              <MapPin size={9} /> {s.room_name}
                            </p>
                          )}
                        </div>
                      ))}
                      {!isPast && FREE_BLOCKS.filter((b) => {
                        return !(daySlots || []).some(
                          (s) =>
                            s.status !== "cancelled" &&
                            overlaps(fmt5(s.start_time), fmt5(s.end_time), b.start, b.end),
                        );
                      }).map((b) => {
                        const dateStr = dayDate.toISOString().slice(0, 10);
                        const active = placingId;
                        return (
                          <button
                            key={`${dayNum}-${b.start}`}
                            type="button"
                            disabled={!active || saving}
                            onClick={() => active && placeReport(active, { date: dateStr, start: b.start, end: b.end })}
                            className={`w-full rounded-lg border border-dashed px-1.5 py-2 text-[10px] transition-colors ${
                              active
                                ? "border-[#11224E] bg-[#11224E]/5 text-[#11224E] hover:bg-[#11224E]/10"
                                : "border-neutral-200 text-neutral-300"
                            }`}
                          >
                            Libre {b.start}–{b.end}
                          </button>
                        );
                      })}
                      {isPast && daySlots.length === 0 && (
                        <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-300 text-center py-3">
                          Passé
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kanban reports */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[560px]">
          <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center gap-2">
            <RefreshCw size={13} style={{ color: BLUE }} />
            <p className="text-xs font-medium text-neutral-800">À replanifier</p>
            <span className="ml-auto text-[10px] text-neutral-400">{pending.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {pending.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-8 px-2">
                Aucun report en attente de placement.
              </p>
            ) : (
              pending.map((p) => {
                const slot = p.schedule_slots;
                const selected = placingId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlacingId(selected ? null : p.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      selected ? "border-[#11224E] bg-[#11224E]/5" : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Ban size={12} className="text-amber-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-900 truncate">
                          {slot?.title || "Cours"}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          Annulé le {p.exception_date}
                          {slot ? ` · était ${fmt5(slot.start_time)}–${fmt5(slot.end_time)}` : ""}
                        </p>
                        {p.reason && (
                          <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">Motif : {p.reason}</p>
                        )}
                        {selected && (
                          <p className="text-[10px] font-medium mt-2" style={{ color: BLUE }}>
                            Cliquez une case « Libre » pour placer
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="px-3 py-2 border-t border-neutral-100 text-[10px] text-neutral-400">
            {freeCells.length} plage(s) libre(s) cette semaine
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt5(t: string) {
  return (t || "").substring(0, 5);
}
