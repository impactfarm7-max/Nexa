"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronLeft, ChevronRight, MapPin, Ban, RefreshCw,
  Printer, User, Sparkles, X,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const WEEKS_VISIBLE = 3;

type TrainerOption = { id: string; prenom: string; nom: string | null };

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
    formateur_id?: string | null;
    day_of_week: number;
  };
};

type SmartFilter =
  | "all"
  | "free_rooms"
  | "no_formateur"
  | "cancelled"
  | "busy_rooms";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function weekIso(d: Date): string {
  return d.toISOString().split("T")[0];
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

function fmt5(t: string) {
  return (t || "").substring(0, 5);
}

type WeekBundle = { weekStart: Date; slots: EstSlot[]; loading: boolean };

type Props = {
  centerId: string;
  trainers?: TrainerOption[];
};

export default function EstablishmentPlanningBoard({ centerId, trainers = [] }: Props) {
  const [anchorMonday, setAnchorMonday] = useState(() => getMonday(new Date()));
  const [weeks, setWeeks] = useState<WeekBundle[]>([]);
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [error, setError] = useState("");
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [placeRoom, setPlaceRoom] = useState("");
  const [placeFormateurId, setPlaceFormateurId] = useState("");
  const [saving, setSaving] = useState(false);
  const [smartFilter, setSmartFilter] = useState<SmartFilter>("all");
  const [showPrint, setShowPrint] = useState(false);
  const [knownRooms, setKnownRooms] = useState<string[]>([]);

  const trainerById = useMemo(() => {
    const m = new Map<string, TrainerOption>();
    for (const t of trainers) m.set(t.id, t);
    return m;
  }, [trainers]);

  const load = useCallback(async () => {
    setError("");
    const mondayList = Array.from({ length: WEEKS_VISIBLE }, (_, i) => addDays(anchorMonday, i * 7));
    setWeeks(mondayList.map((weekStart) => ({ weekStart, slots: [], loading: true })));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");

      const results = await Promise.all(
        mondayList.map(async (ws) => {
          const res = await fetch(
            `/api/center/planning-slots?week_start=${encodeURIComponent(weekIso(ws))}`,
            { headers: { Authorization: `Bearer ${session.access_token}` } },
          );
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || "Chargement impossible.");
          return {
            weekStart: ws,
            slots: (json.slots || []) as EstSlot[],
            pending: (json.pending_reports || []) as PendingReport[],
          };
        }),
      );

      setWeeks(results.map((r) => ({ weekStart: r.weekStart, slots: r.slots, loading: false })));
      // Pending is centre-wide — take from first week response
      setPending(results[0]?.pending || []);

      const rooms = new Set<string>();
      for (const r of results) {
        for (const s of r.slots) {
          if (s.room_name) rooms.add(s.room_name);
        }
      }
      for (const p of results[0]?.pending || []) {
        if (p.schedule_slots?.room_name) rooms.add(p.schedule_slots.room_name);
      }
      setKnownRooms(Array.from(rooms).sort((a, b) => a.localeCompare(b, "fr")));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur.");
      setWeeks(mondayList.map((weekStart) => ({ weekStart, slots: [], loading: false })));
    }
  }, [anchorMonday]);

  useEffect(() => {
    void load();
  }, [load, centerId]);

  const allSlots = useMemo(() => weeks.flatMap((w) => w.slots), [weeks]);

  const freeRoomsThisWeek = useMemo(() => {
    const first = weeks[0];
    if (!first) return [] as string[];
    const used = new Set(
      first.slots
        .filter((s) => s.status !== "cancelled" && s.room_name)
        .map((s) => s.room_name as string),
    );
    return knownRooms.filter((r) => !used.has(r));
  }, [weeks, knownRooms]);

  const busyRoomsThisWeek = useMemo(() => {
    const first = weeks[0];
    if (!first) return [] as string[];
    const used = new Set(
      first.slots
        .filter((s) => s.status !== "cancelled" && s.room_name)
        .map((s) => s.room_name as string),
    );
    return knownRooms.filter((r) => used.has(r));
  }, [weeks, knownRooms]);

  const filterSlots = useCallback(
    (slots: EstSlot[]): EstSlot[] => {
      if (smartFilter === "all" || smartFilter === "free_rooms") return slots;
      if (smartFilter === "cancelled") return slots.filter((s) => s.status === "cancelled");
      if (smartFilter === "no_formateur") {
        return slots.filter((s) => s.status !== "cancelled" && !s.formateur_prenom);
      }
      if (smartFilter === "busy_rooms") {
        const busy = new Set(busyRoomsThisWeek);
        return slots.filter((s) => s.room_name && busy.has(s.room_name));
      }
      return slots;
    },
    [smartFilter, busyRoomsThisWeek],
  );

  const selectPending = (p: PendingReport) => {
    if (placingId === p.id) {
      setPlacingId(null);
      setPlaceRoom("");
      setPlaceFormateurId("");
      return;
    }
    setPlacingId(p.id);
    setPlaceRoom(p.schedule_slots?.room_name || "");
    setPlaceFormateurId(p.schedule_slots?.formateur_id || "");
  };

  const placeReport = async (
    exceptionId: string,
    cell: { date: string; start: string; end: string },
  ) => {
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
          new_room_name: placeRoom.trim() || null,
          new_formateur_id: placeFormateurId || null,
          reason: "Report placé sur plage libre (calendrier établissement)",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Placement impossible.");
      setPlacingId(null);
      setPlaceRoom("");
      setPlaceFormateurId("");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  };

  const navigate = (dir: "prev" | "next") => {
    setAnchorMonday((prev) => addDays(prev, dir === "next" ? 7 : -7));
  };

  const freeCellsCount = useMemo(() => {
    let n = 0;
    for (const w of weeks) {
      const byDay: Record<number, EstSlot[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      for (const s of filterSlots(w.slots)) {
        const d = Number(s.day_of_week);
        if (byDay[d]) byDay[d].push(s);
      }
      for (let i = 0; i < 6; i++) {
        const d = addDays(w.weekStart, i);
        if (isPastDay(d)) continue;
        const daySlots = byDay[i + 1] || [];
        for (const block of FREE_BLOCKS) {
          const busy = daySlots.some(
            (s) =>
              s.status !== "cancelled" &&
              overlaps(fmt5(s.start_time), fmt5(s.end_time), block.start, block.end),
          );
          if (!busy) n += 1;
        }
      }
    }
    return n;
  }, [weeks, filterSlots]);

  const placing = pending.find((p) => p.id === placingId) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#11224E]">Calendrier établissement</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {WEEKS_VISIBLE} semaines · plages libres · reports · filtres intelligents
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrint(true)}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
            style={{ color: BLUE, border: `1.5px solid ${BLUE}` }}
          >
            <Printer size={14} /> Imprimer
          </button>
          <div className="flex items-center gap-0.5 bg-black/[0.04] rounded-lg p-0.5 border border-black/[0.06]">
            <button
              type="button"
              onClick={() => navigate("prev")}
              className="p-1.5 rounded-md hover:bg-white text-neutral-500"
              aria-label="Semaines précédentes"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setAnchorMonday(getMonday(new Date()))}
              className="text-[10px] font-bold uppercase px-2 tracking-wider hover:text-[#eb670e]"
            >
              Cette semaine
            </button>
            <button
              type="button"
              onClick={() => navigate("next")}
              className="p-1.5 rounded-md hover:bg-white text-neutral-500"
              aria-label="Semaines suivantes"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Smart filters */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          <Sparkles size={11} style={{ color: ORANGE }} /> Filtres
        </span>
        {(
          [
            { id: "all", label: "Tout" },
            { id: "free_rooms", label: `Salles libres (${freeRoomsThisWeek.length})` },
            { id: "busy_rooms", label: "Salles occupées" },
            { id: "no_formateur", label: "Sans formateur" },
            { id: "cancelled", label: "Annulés" },
          ] as { id: SmartFilter; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSmartFilter(f.id)}
            className={`h-8 px-3 rounded-lg text-xs border transition-colors ${
              smartFilter === f.id
                ? "bg-[#11224E] border-[#11224E] text-white font-semibold"
                : "bg-white/70 border-black/[0.08] text-neutral-600 hover:bg-white"
            }`}
          >
            {f.label}
          </button>
        ))}
        {smartFilter === "free_rooms" && freeRoomsThisWeek.length > 0 && (
          <p className="text-[11px] text-neutral-500 w-full sm:w-auto">
            Cette semaine sans cours :{" "}
            <span className="font-semibold text-[#11224E]">{freeRoomsThisWeek.join(" · ")}</span>
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 print:hidden">
          {error}
        </p>
      )}

      {/* Placement bar */}
      {placing && (
        <div
          className="print:hidden rounded-xl border px-3 py-3 space-y-2"
          style={{ borderColor: `${BLUE}33`, backgroundColor: `${BLUE}08` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[#11224E]">
                Placement · {placing.schedule_slots?.title || "Cours"}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Choisissez formateur / salle puis cliquez une case « Libre »
              </p>
            </div>
            <button type="button" onClick={() => selectPending(placing)} className="p-1 text-neutral-400 hover:text-neutral-700">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <User size={10} /> Formateur
              </span>
              <select
                value={placeFormateurId}
                onChange={(e) => setPlaceFormateurId(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg border border-black/[0.08] bg-white px-2 text-sm"
              >
                <option value="">Conserver / aucun</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.prenom}{t.nom ? ` ${t.nom}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <MapPin size={10} /> Salle
              </span>
              <input
                list="est-room-suggestions"
                value={placeRoom}
                onChange={(e) => setPlaceRoom(e.target.value)}
                placeholder="ex. AMPHI THEATRE"
                className="mt-1 w-full h-9 rounded-lg border border-black/[0.08] bg-white px-2 text-sm"
              />
              <datalist id="est-room-suggestions">
                {knownRooms.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4 max-h-[min(72vh,820px)] overflow-y-auto pr-0.5 print:max-h-none print:overflow-visible">
          {weeks.map((w) => (
            <WeekGrid
              key={weekIso(w.weekStart)}
              weekStart={w.weekStart}
              slots={filterSlots(w.slots)}
              loading={w.loading}
              placingId={placingId}
              saving={saving}
              onPlace={placeReport}
              smartFilter={smartFilter}
              freeRoomsHint={smartFilter === "free_rooms" ? freeRoomsThisWeek : []}
            />
          ))}
        </div>

        <div className="bg-white/80 rounded-xl border border-black/[0.06] overflow-hidden flex flex-col max-h-[560px] print:hidden">
          <div className="px-3 py-2.5 border-b border-black/[0.06] flex items-center gap-2">
            <RefreshCw size={13} style={{ color: BLUE }} />
            <p className="text-xs font-semibold text-[#11224E]">À replanifier</p>
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
                const formateur = slot?.formateur_id ? trainerById.get(slot.formateur_id) : null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPending(p)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      selected
                        ? "border-[#11224E] bg-[#11224E]/5"
                        : "border-black/[0.06] hover:bg-black/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Ban size={12} className="text-amber-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 truncate">
                          {slot?.title || "Cours"}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          Annulé le {p.exception_date}
                          {slot ? ` · était ${fmt5(slot.start_time)}–${fmt5(slot.end_time)}` : ""}
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                          {formateur && (
                            <span className="text-[10px] text-neutral-500 inline-flex items-center gap-0.5">
                              <User size={9} /> {formateur.prenom}
                            </span>
                          )}
                          {slot?.room_name && (
                            <span className="text-[10px] font-medium inline-flex items-center gap-0.5" style={{ color: ORANGE }}>
                              <MapPin size={9} /> {slot.room_name}
                            </span>
                          )}
                        </div>
                        {p.reason && (
                          <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">Motif : {p.reason}</p>
                        )}
                        {selected && (
                          <p className="text-[10px] font-medium mt-2" style={{ color: BLUE }}>
                            Ajustez formateur/salle puis cliquez « Libre »
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="px-3 py-2 border-t border-black/[0.06] text-[10px] text-neutral-400">
            {freeCellsCount} plage(s) libre(s) sur {WEEKS_VISIBLE} semaine(s) · {allSlots.length} créneau(x)
          </div>
        </div>
      </div>

      {showPrint && (
        <EstablishmentPrintModal
          weeks={weeks}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

function WeekGrid({
  weekStart,
  slots,
  loading,
  placingId,
  saving,
  onPlace,
  smartFilter,
  freeRoomsHint,
}: {
  weekStart: Date;
  slots: EstSlot[];
  loading: boolean;
  placingId: string | null;
  saving: boolean;
  onPlace: (exceptionId: string, cell: { date: string; start: string; end: string }) => void;
  smartFilter: SmartFilter;
  freeRoomsHint: string[];
}) {
  const byDay = useMemo(() => {
    const map: Record<number, EstSlot[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const s of slots) {
      const d = Number(s.day_of_week);
      if (map[d]) map[d].push(s);
    }
    return map;
  }, [slots]);

  const label = `Semaine du ${weekStart.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}`;

  return (
    <div className="bg-white/80 rounded-xl border border-black/[0.06] overflow-hidden est-print-week">
      <div className="px-3 py-2 border-b border-black/[0.06] flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#11224E]">{label}</p>
        {smartFilter === "free_rooms" && freeRoomsHint.length > 0 && (
          <p className="text-[10px] text-neutral-400 truncate max-w-[50%]">
            Libres : {freeRoomsHint.join(", ")}
          </p>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-neutral-400 gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-black/[0.04] min-h-[200px]">
          {DAYS.map((day, idx) => {
            const dayNum = idx + 1;
            const daySlots = byDay[dayNum] || [];
            const dayDate = addDays(weekStart, idx);
            const isPast = isPastDay(dayDate);
            const isToday = dayDate.toDateString() === new Date().toDateString();
            return (
              <div key={day} className={`min-w-0 ${isPast ? "opacity-55" : ""}`}>
                <div
                  className={`px-2 py-2 border-b border-black/[0.04] ${
                    isPast ? "bg-neutral-100" : isToday ? "bg-orange-50" : "bg-black/[0.02]"
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
                            : "border-black/[0.06] bg-black/[0.02] text-neutral-800"
                      } ${isPast ? "grayscale-[0.35]" : ""}`}
                    >
                      <p className="font-semibold truncate">{fmt5(s.start_time)}–{fmt5(s.end_time)}</p>
                      <p className="truncate opacity-80">{s.title || "Cours"}</p>
                      {s.filiere_name && <p className="truncate text-neutral-400">{s.filiere_name}</p>}
                      {s.formateur_prenom && (
                        <p className="truncate text-neutral-400 flex items-center gap-0.5">
                          <User size={9} /> {s.formateur_prenom}
                        </p>
                      )}
                      {s.room_name && (
                        <p className="truncate text-neutral-400 flex items-center gap-0.5">
                          <MapPin size={9} /> {s.room_name}
                        </p>
                      )}
                    </div>
                  ))}
                  {!isPast &&
                    FREE_BLOCKS.filter((b) => {
                      return !(daySlots || []).some(
                        (s) =>
                          s.status !== "cancelled" &&
                          overlaps(fmt5(s.start_time), fmt5(s.end_time), b.start, b.end),
                      );
                    }).map((b) => {
                      const dateStr = weekIso(dayDate);
                      const active = placingId;
                      return (
                        <button
                          key={`${dayNum}-${b.start}`}
                          type="button"
                          disabled={!active || saving}
                          onClick={() =>
                            active && onPlace(active, { date: dateStr, start: b.start, end: b.end })
                          }
                          className={`w-full rounded-lg border border-dashed px-1.5 py-2 text-[10px] transition-colors print:hidden ${
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
                  {!isPast && daySlots.length === 0 && smartFilter !== "all" && (
                    <p className="text-[9px] text-neutral-300 text-center py-2">Aucun</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EstablishmentPrintModal({
  weeks,
  onClose,
}: {
  weeks: WeekBundle[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0">
      <div className="bg-white max-w-5xl w-full p-6 sm:p-8 rounded-2xl shadow-2xl my-8 print:shadow-none print:rounded-none print:max-w-none print:my-0">
        <div className="print:hidden flex justify-end gap-3 mb-6 pb-5 border-b">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase text-white"
            style={{ backgroundColor: ORANGE }}
          >
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button type="button" onClick={onClose} className="p-2.5 bg-neutral-100 rounded-xl hover:bg-neutral-200">
            <X size={17} />
          </button>
        </div>

        <div className="flex justify-between items-start border-b-2 pb-5 mb-6" style={{ borderColor: BLUE }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Emploi du temps</p>
            <h1 className="text-2xl font-black uppercase mt-1" style={{ color: BLUE }}>Établissement</h1>
            <p className="text-xs font-bold mt-1" style={{ color: ORANGE }}>
              {WEEKS_VISIBLE} semaines à partir du{" "}
              {weeks[0]?.weekStart.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {weeks.map((w) => {
            const byDay: Record<number, EstSlot[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
            for (const s of w.slots) {
              const d = Number(s.day_of_week);
              if (byDay[d]) byDay[d].push(s);
            }
            return (
              <div key={weekIso(w.weekStart)} className="break-inside-avoid">
                <p className="text-sm font-bold mb-3" style={{ color: BLUE }}>
                  Semaine du{" "}
                  {w.weekStart.toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {DAYS.map((day, i) => {
                    const dayDate = addDays(w.weekStart, i);
                    const daySlots = (byDay[i + 1] ?? []).sort((a, b) =>
                      a.start_time.localeCompare(b.start_time),
                    );
                    return (
                      <div key={day} className="border-t-2 pt-2" style={{ borderColor: BLUE }}>
                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: BLUE }}>
                          {day}
                        </p>
                        <p className="text-[10px] text-neutral-400 mb-2">
                          {dayDate.getDate()}/{dayDate.getMonth() + 1}
                        </p>
                        {daySlots.map((s) => (
                          <div
                            key={`${s.slot_id}-${s.actual_date}`}
                            className={`mb-1.5 p-1.5 rounded border text-[9px] ${
                              s.status === "cancelled"
                                ? "opacity-50 border-red-200 bg-red-50"
                                : "border-neutral-200 bg-neutral-50"
                            }`}
                          >
                            <p className="font-mono text-neutral-400">
                              {fmt5(s.start_time)}–{fmt5(s.end_time)}
                            </p>
                            <p className="font-bold" style={{ color: BLUE }}>
                              {s.title}
                            </p>
                            {s.filiere_name && <p className="text-neutral-400">{s.filiere_name}</p>}
                            {s.formateur_prenom && <p className="text-neutral-400">{s.formateur_prenom}</p>}
                            {s.room_name && (
                              <p className="font-bold" style={{ color: ORANGE }}>
                                {s.room_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
