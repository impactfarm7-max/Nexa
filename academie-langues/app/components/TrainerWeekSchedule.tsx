"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Ban,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type WeekSlot = {
  slot_id: string;
  day_of_week: number;
  actual_date: string;
  start_time: string;
  end_time: string;
  title: string;
  discipline_name: string | null;
  room_name: string | null;
  mode: string;
  status: "normal" | "cancelled" | "rescheduled" | "substituted";
};

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTime(t: string) {
  return t.substring(0, 5);
}

export default function TrainerWeekSchedule() {
  const [centerId, setCenterId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .single();
      if (!cancelled) {
        setCenterId(profile?.center_id || null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadWeek = useCallback(async () => {
    if (!centerId || !userId) return;
    setWeekLoading(true);
    setError("");
    const weekStr = weekStart.toISOString().split("T")[0];
    const { data, error: rpcErr } = await supabase.rpc("get_weekly_schedule", {
      p_center_id: centerId,
      p_week_start: weekStr,
      p_filiere_id: null,
      p_niveau_id: null,
      p_formateur_id: userId,
    });
    if (rpcErr) {
      console.error("[TrainerWeekSchedule]", rpcErr);
      setError("Planning indisponible pour le moment.");
      setWeekSlots([]);
    } else {
      setWeekSlots((data as WeekSlot[]) || []);
    }
    setWeekLoading(false);
  }, [centerId, userId, weekStart]);

  useEffect(() => {
    if (centerId && userId) void loadWeek();
  }, [loadWeek, centerId, userId]);

  const navigateWeek = (dir: "prev" | "next") => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
    setWeekStart(d);
  };

  const slotsByDay: Record<number, WeekSlot[]> = {};
  for (let d = 1; d <= 6; d++) slotsByDay[d] = [];
  for (const s of weekSlots) {
    if (slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week].push(s);
  }

  const activeCount = weekSlots.filter((s) => s.status !== "cancelled").length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-5 text-sm text-neutral-400">
        Chargement du planning…
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-black/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={16} style={{ color: ORANGE }} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Mon planning</p>
            <p className="text-sm font-extrabold truncate" style={{ color: BLUE }}>
              {activeCount} session{activeCount !== 1 ? "s" : ""} cette semaine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => navigateWeek("prev")}
              className="p-1.5 rounded-md hover:bg-white text-neutral-500"
              aria-label="Semaine précédente"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-bold uppercase px-2 tracking-wider text-neutral-600">
              {weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
            </span>
            <button
              type="button"
              onClick={() => navigateWeek("next")}
              className="p-1.5 rounded-md hover:bg-white text-neutral-500"
              aria-label="Semaine suivante"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <Link
            href="/centre/mon-planning"
            className="text-[11px] font-bold uppercase tracking-wider text-orange-600 hover:underline"
          >
            Voir tout
          </Link>
        </div>
      </div>

      <div className="p-3 max-h-[320px] overflow-y-auto">
        {weekLoading ? (
          <p className="text-sm text-neutral-400 text-center py-8">Chargement…</p>
        ) : error ? (
          <p className="text-sm text-amber-700 text-center py-8">{error}</p>
        ) : weekSlots.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">Aucun cours cette semaine.</p>
        ) : (
          <div className="space-y-3">
            {DAYS.map((dayLabel, idx) => {
              const dayNum = idx + 1;
              const daySlots = (slotsByDay[dayNum] || [])
                .slice()
                .sort((a, b) => a.start_time.localeCompare(b.start_time));
              if (daySlots.length === 0) return null;
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + idx);
              return (
                <div key={dayLabel}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    {dayLabel} {dayDate.getDate()}/{dayDate.getMonth() + 1}
                  </p>
                  <ul className="space-y-1.5">
                    {daySlots.map((slot) => {
                      const cancelled = slot.status === "cancelled";
                      return (
                        <li
                          key={`${slot.slot_id}-${slot.actual_date}`}
                          className={`rounded-xl border border-black/[0.06] px-3 py-2 ${
                            cancelled ? "opacity-50" : "bg-[#F7F7F6]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono font-bold text-neutral-500 inline-flex items-center gap-1">
                              <Clock size={11} />
                              {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                            </span>
                            {cancelled ? (
                              <span className="text-[10px] font-bold text-red-600 inline-flex items-center gap-0.5">
                                <Ban size={10} /> Annulé
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`text-xs font-extrabold mt-0.5 ${cancelled ? "line-through" : ""}`}
                            style={{ color: BLUE }}
                          >
                            {slot.title}
                          </p>
                          {slot.room_name ? (
                            <p className="text-[10px] font-medium text-neutral-500 mt-0.5 inline-flex items-center gap-1">
                              {slot.mode === "en_ligne" ? (
                                <Video size={10} className="text-blue-500" />
                              ) : (
                                <MapPin size={10} style={{ color: ORANGE }} />
                              )}
                              {slot.room_name}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
