"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Video,
  User, AlertTriangle, Ban, RefreshCw, UserCheck, BookOpen, Bell
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { useI18n } from "@/app/i18n/I18nProvider";
const BLUE = "#11224E";
const ORANGE = "#eb670e";

type WeekSlot = {
  slot_id: string;
  day_of_week: number;
  actual_date: string;
  start_time: string;
  end_time: string;
  title: string;
  discipline_name: string | null;
  formateur_prenom: string | null;
  room_name: string | null;
  mode: string;
  online_link: string | null;
  status: "normal" | "cancelled" | "rescheduled" | "substituted";
  exception_reason: string | null;
  exception_id: string | null;
};

const STATUS_CONFIG: Record<string, { labelKey: string; icon: typeof Ban; bg: string; text: string; border: string }> = {
  normal: { labelKey: "scheduleConfirmed", icon: BookOpen, bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { labelKey: "scheduleCancelled", icon: Ban, bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  rescheduled: { labelKey: "scheduleRescheduled", icon: RefreshCw, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  substituted: { labelKey: "scheduleReplacement", icon: UserCheck, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
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

function isPastDay(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  return cmp.getTime() < today.getTime();
}

export default function TrainerSchedulePage() {
  const { locale, t } = useI18n();
  const days = ["scheduleMonday", "scheduleTuesday", "scheduleWednesday", "scheduleThursday", "scheduleFriday", "scheduleSaturday"].map((key) => t("centre", key));
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState("");

  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<WeekSlot | null>(null);

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, prenom, nom")
        .eq("id", session.user.id)
        .single();

      setCenterId(profile?.center_id || null);
      setTrainerName(`${profile?.prenom || ""} ${profile?.nom || ""}`.trim());
      setLoading(false);
    })();
  }, []);

  // ============================================================
  // CHARGER LE PLANNING DE LA SEMAINE
  // ============================================================
  const loadWeek = useCallback(async () => {
    if (!centerId || !userId) return;
    setWeekLoading(true);
    const weekStr = weekStart.toISOString().split("T")[0];

    const { data, error } = await supabase.rpc("get_weekly_schedule", {
      p_center_id: centerId,
      p_week_start: weekStr,
      p_filiere_id: null,
      p_niveau_id: null,
      p_formateur_id: userId,
    });

    if (error) console.error("Erreur planning:", error);
    setWeekSlots(data || []);
    setWeekLoading(false);
  }, [centerId, userId, weekStart]);

  useEffect(() => {
    if (centerId && userId) loadWeek();
  }, [loadWeek, centerId, userId]);

  // Navigation
  const navigateWeek = (dir: "prev" | "next") => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
    setWeekStart(d);
  };
  const goToday = () => setWeekStart(getMonday(new Date()));

  // Grouper par jour
  const slotsByDay: Record<number, WeekSlot[]> = {};
  for (let d = 1; d <= 6; d++) slotsByDay[d] = [];
  for (const s of weekSlots) {
    if (slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week].push(s);
  }

  // Stats de la semaine
  const totalSlots = weekSlots.length;
  const cancelledCount = weekSlots.filter(s => s.status === "cancelled").length;
  const activeCount = totalSlots - cancelledCount;
  const totalHours = weekSlots
    .filter(s => s.status !== "cancelled")
    .reduce((sum, s) => {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      return sum + (eh * 60 + em - sh * 60 - sm) / 60;
    }, 0);

  if (loading) return <CenterPageLoading />;

  return (
    <div className="min-h-[100dvh] bg-white text-[#11224E] flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <header className="shrink-0 border-b border-neutral-200 bg-white px-6 py-5 z-20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} style={{ color: ORANGE }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t("centre", "scheduleTitle")}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: BLUE }}>
                {t("centre", "scheduleHello", { name: trainerName.split(" ")[0] || t("centre", "scheduleTrainer") })}
              </h1>
            </div>

            {/* Navigateur de semaine */}
            <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-0.5 border">
              <button onClick={() => navigateWeek("prev")} className="p-2 rounded-lg hover:bg-white text-neutral-500 transition-colors"><ChevronLeft size={14} /></button>
              <button onClick={goToday} className="text-[10px] font-black uppercase px-3 tracking-wider hover:text-orange-600 transition-colors">
                {t("centre", "scheduleWeekOf", { date: weekStart.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "long" }) })}
              </button>
              <button onClick={() => navigateWeek("next")} className="p-2 rounded-lg hover:bg-white text-neutral-500 transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* Résumé de la semaine */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
              <BookOpen size={13} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700">{t("centre", "scheduleCourses", { count: activeCount })}</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
              <Clock size={13} className="text-blue-600" />
              <span className="text-[10px] font-black text-blue-700">{t("centre", "scheduleHoursWeek", { count: totalHours.toFixed(0) })}</span>
            </div>
            {cancelledCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5">
                <Ban size={13} className="text-red-500" />
                <span className="text-[10px] font-black text-red-600">{t("centre", cancelledCount > 1 ? "scheduleCancelledMany" : "scheduleCancelledOne", { count: cancelledCount })}</span>
              </div>
            )}
          </div>
        </header>

        {/* CONTENU */}
        <div className="flex-1 overflow-y-auto p-4">
          {weekLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-neutral-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : totalSlots === 0 ? (
            <div className="max-w-md mx-auto mt-20 text-center">
              <Calendar size={48} className="text-neutral-200 mx-auto mb-4" />
              <p className="text-lg font-black" style={{ color: BLUE }}>{t("centre", "scheduleNoCourse")}</p>
              <p className="text-sm text-neutral-400 mt-2">{t("centre", "scheduleNoCourseHelp")}</p>
            </div>
          ) : (
            /* GRILLE HEBDOMADAIRE */
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              {/* En-tête des jours */}
              <div className="grid grid-cols-6 border-b bg-neutral-50">
                {days.map((day, i) => {
                  const dayDate = new Date(weekStart);
                  dayDate.setDate(dayDate.getDate() + i);
                  const isToday = dayDate.toDateString() === new Date().toDateString();
                  const isPast = isPastDay(dayDate);
                  const daySlotCount = (slotsByDay[i + 1] || []).filter(s => s.status !== "cancelled").length;

                  return (
                    <div
                      key={day}
                      className={`py-3 text-center border-r last:border-r-0 ${
                        isPast ? "bg-neutral-100/80" : isToday ? "bg-orange-50" : ""
                      }`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-wider ${isPast ? "text-neutral-300" : "text-neutral-500"}`}>
                        {day}
                      </p>
                      <p
                        className={`text-sm font-black mt-0.5 ${
                          isPast ? "text-neutral-300" : isToday ? "text-orange-600" : ""
                        }`}
                        style={!isPast && !isToday ? { color: BLUE } : undefined}
                      >
                        {dayDate.getDate()}/{dayDate.getMonth() + 1}
                      </p>
                      {daySlotCount > 0 && (
                        <p className={`text-[9px] font-bold mt-0.5 ${isPast ? "text-neutral-300" : "text-neutral-400"}`}>
                          {daySlotCount} cours
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Corps */}
              <div className="grid grid-cols-6 divide-x divide-neutral-100 min-h-[450px]">
                {days.map((_, dayIdx) => {
                  const dayNum = dayIdx + 1;
                  const daySlots = (slotsByDay[dayNum] || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
                  const dayDate = new Date(weekStart);
                  dayDate.setDate(dayDate.getDate() + dayIdx);
                  const isToday = dayDate.toDateString() === new Date().toDateString();
                  const isPast = isPastDay(dayDate);

                  return (
                    <div
                      key={dayIdx}
                      className={`p-2 space-y-2 ${
                        isPast ? "bg-neutral-50/90 opacity-55" : isToday ? "bg-orange-50/20" : ""
                      }`}
                    >
                      {daySlots.map(slot => {
                        const cfg = STATUS_CONFIG[slot.status] || STATUS_CONFIG.normal;
                        const StatusIcon = cfg.icon;
                        const isCancelled = slot.status === "cancelled";

                        return (
                          <button
                            key={`${slot.slot_id}-${slot.actual_date}`}
                            onClick={() => setSelectedSlot(slot)}
                            className={`w-full p-3 rounded-xl border text-left transition-all hover:shadow-md ${cfg.border} ${isCancelled || isPast ? "opacity-40" : ""} ${isPast ? "grayscale-[0.35]" : ""}`}
                          >
                            {/* Horaire */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[10px] font-mono font-black text-neutral-400 flex items-center gap-0.5">
                                <Clock size={9} /> {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                              </span>
                              {slot.status !== "normal" && (
                                <StatusIcon size={12} className={cfg.text} />
                              )}
                            </div>

                            {/* Titre */}
                            <p className={`text-xs font-black leading-tight ${isCancelled ? "line-through" : ""}`} style={{ color: BLUE }}>
                              {slot.title}
                            </p>

                            {/* Salle */}
                            {slot.room_name && (
                              <p className="text-[10px] font-bold flex items-center gap-1 mt-1.5 truncate" style={{ color: BLUE }}>
                                {slot.mode === "en_ligne" ? <Video size={9} className="text-blue-500" /> : <MapPin size={9} style={{ color: ORANGE }} />}
                                {slot.room_name}
                              </p>
                            )}

                            {/* Badge remplacement */}
                            {slot.status === "substituted" && (
                              <p className="text-[9px] font-bold text-blue-600 mt-1 flex items-center gap-0.5">
                                <UserCheck size={9} /> {t("centre", "scheduleYouReplace")}
                              </p>
                            )}
                          </button>
                        );
                      })}

                      {daySlots.length === 0 && (
                        <div className="h-full flex items-center justify-center py-12">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isPast ? "text-neutral-200" : "text-neutral-200"}`}>
                            {isPast ? t("centre", "schedulePast") : t("centre", "scheduleFree")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      {/* ══════════ DÉTAIL D'UN CRÉNEAU (modal léger) ══════════ */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedSlot(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedSlot(null)} className="absolute top-4 right-4 text-neutral-400 hover:text-black" aria-label={t("centre", "scheduleClose")}>✕</button>

            {/* Statut */}
            {(() => {
              const cfg = STATUS_CONFIG[selectedSlot.status] || STATUS_CONFIG.normal;
              const StatusIcon = cfg.icon;
              return (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text} ${cfg.border} mb-4`}>
                  <StatusIcon size={12} /> {t("centre", cfg.labelKey)}
                </div>
              );
            })()}

            {/* Titre + horaire */}
            <h3 className="text-lg font-black" style={{ color: BLUE }}>{selectedSlot.title}</h3>
            <p className="text-sm text-neutral-500 font-bold mt-1 flex items-center gap-1.5">
              <Clock size={14} />
              {days[selectedSlot.day_of_week - 1]} {formatTime(selectedSlot.start_time)} — {formatTime(selectedSlot.end_time)}
            </p>

            {/* Infos */}
            <div className="mt-4 space-y-2.5 text-xs">
              {selectedSlot.room_name && (
                <div className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2.5 border">
                  {selectedSlot.mode === "en_ligne" ? <Video size={14} className="text-blue-500" /> : <MapPin size={14} style={{ color: ORANGE }} />}
                  <span className="font-bold" style={{ color: BLUE }}>{selectedSlot.room_name}</span>
                </div>
              )}

              {selectedSlot.online_link && selectedSlot.mode === "en_ligne" && (
                <a href={selectedSlot.online_link} target="_blank" rel="noopener noreferrer" className="block bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-blue-700 font-bold hover:bg-blue-100 transition-colors truncate">
                  🔗 {selectedSlot.online_link}
                </a>
              )}

              {selectedSlot.discipline_name && (
                <div className="flex items-center gap-2 bg-neutral-50 rounded-xl px-3 py-2.5 border">
                  <BookOpen size={14} className="text-neutral-400" />
                  <span className="font-bold text-neutral-600">{t("centre", "scheduleSubject")} {selectedSlot.discipline_name}</span>
                </div>
              )}
            </div>

            {/* Raison d'exception */}
            {selectedSlot.exception_reason && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-700">{selectedSlot.exception_reason}</p>
              </div>
            )}

            {/* Remplacement */}
            {selectedSlot.status === "substituted" && selectedSlot.formateur_prenom && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                <UserCheck size={14} className="text-blue-600" />
                <p className="text-xs font-bold text-blue-700">{t("centre", "scheduleReplacementHelp")}</p>
              </div>
            )}

            {/* Date précise */}
            <p className="text-[10px] text-neutral-400 font-bold mt-4 text-center uppercase tracking-wider">
              {new Date(selectedSlot.actual_date).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
