"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import {
  CalendarDays,
  Lock,
  Video,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CalendarClock,
  MonitorPlay,
  MapPin,
  Users,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { collectiveJoinPath, JOIN_BEFORE_MS, sessionEndMs, sessionStartMs } from "@/app/utils/collectiveLive";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizeCoachingError, localizeCollectiveTitle } from "@/app/utils/coachingErrorI18n";

// --- TYPES EXISTANTS ---
type SessionMode = "en_ligne" | "presentiel";

type Appointment = {
  id: string;
  scheduled_at: string;
  original_scheduled_at?: string | null;
  status: "pending" | "confirmed" | "refused" | "cancelled" | "reporte" | string;
  session_mode: SessionMode;
  note: string | null;
  admin_note: string | null;
  cancel_reason: string | null;
  reschedule_reason?: string | null;
  rescheduled_date?: string | null;
  rescheduled_time?: string | null;
  created_at: string;
};

type GroupSession = {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  duration_min: number;
  status: string;
};

// --- NOUVEAU TYPE B2B (Multi-centres) ---
type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  session_type: "staff_live" | "peer_study";
  meeting_url: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
};

// Séance collective (cours / coaching de groupe) ou Session Live issue du planning du centre
type CollectiveSession = {
  slot_id: string;
  session_date: string;
  title: string;
  start_time: string;
  end_time: string;
  mode: string;
  room_name: string | null;
  online_link: string | null;
  scheduled_at: string;
  ends_at: number;
  kind?: "group" | "live";
  session_scope?: string;
  kind_label?: string;
  my_response?: { status: string; reason: string } | null;
};

type BookingStep = "select" | "confirming" | "success";

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});
function sessionModeLabel(mode: SessionMode | string | null | undefined, inPerson: string, visio: string) {
  return mode === "presentiel" ? inPerson : visio;
}

function inJoinWindow(startMs: number, endMs: number) {
  const now = Date.now();
  return now >= startMs - JOIN_BEFORE_MS && now <= endMs + 30 * 60 * 1000;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CoachingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale, { weekday: "short" }),
    );
  }, [dateLocale]);
  const isCenterRoute = pathname?.startsWith("/centre/student");
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [token, setToken] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [centerConfig, setCenterConfig] = useState<any>(null); // Accréditations du centre

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]); // Les lives du centre
  const [collectiveSessions, setCollectiveSessions] = useState<CollectiveSession[]>([]); // Coaching de groupe (planning)

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<BookingStep>("select");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMode, setActionMode] = useState<"none" | "cancel" | "reschedule">("none");
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [justBooked, setJustBooked] = useState(false);
  const [bookingNote, setBookingNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [refuseKey, setRefuseKey] = useState<string | null>(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [refuseError, setRefuseError] = useState("");

  const groupStartMs = (g: GroupSession) =>
    new Date(`${g.session_date}T${g.session_time.slice(0, 5)}:00+01:00`).getTime();

  const sessionKey = (c: Pick<CollectiveSession, "slot_id" | "session_date">) =>
    `${c.slot_id}:${c.session_date}`;

  const fetchCollectiveSessions = async (accessToken: string) => {
    const collRes = await fetch("/api/coaching/collective-sessions", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (collRes.ok) {
      const collJson = await collRes.json();
      setCollectiveSessions(collJson.sessions ?? []);
    }
  };

  const handleRefuseCollective = async (c: CollectiveSession) => {
    if (!token || refusing) return;
    const reason = refuseReason.trim();
    if (reason.length < 3) {
      setRefuseError(t("dashboard", "coachingErrorReasonMin"));
      return;
    }
    setRefusing(true);
    setRefuseError("");
    try {
      const res = await fetch("/api/coaching/collective-sessions/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot_id: c.slot_id,
          session_date: c.session_date,
          reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefuseError(localizeCoachingError(json.error, t, "coachingErrorRefuse"));
        return;
      }
      setRefuseKey(null);
      setRefuseReason("");
      await fetchCollectiveSessions(token);
      logClientActivity("Refus séance groupe", `${c.title} · ${c.session_date}`, {
        slot_id: c.slot_id,
        reason,
      });
    } catch {
      setRefuseError(t("dashboard", "coachingErrorGeneric"));
    } finally {
      setRefusing(false);
    }
  };

  const visibleGroupSessions = groupSessions.filter(
    (g) => groupStartMs(g) + g.duration_min * 60 * 1000 > Date.now()
  );

  const upcomingAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) =>
          ["pending", "confirmed", "reporte"].includes(appointment.status) &&
          new Date(appointment.scheduled_at).getTime() + 30 * 60 * 1000 > Date.now()
      ),
    [appointments]
  );

  const fetchAppointments = async (accessToken: string) => {
    const res = await fetch("/api/coaching/appointments", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const json = await res.json();
      setAppointments(json.appointments ?? []);
    }
  };

  // --- LE BLOC MODIFIÉ CHIRURGICALEMENT (DÉCOUPLAGE DE LA REQUÊTE) ---
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.push("/login"); return; }
      
      setToken(session.access_token);

      // 1. Requête sécurisée uniquement sur la table profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserProfile(profile);

        // 2. Validation immédiate de l'accès (Premium OU Centre)
        const isAuthorized = (profile.coaching_total || 0) > 0 || profile.role === "admin" || profile.center_id;

        if (isAuthorized) {
          setHasAccess(true); // LE CADENAS ROUGE DISPARAÎT ICI
          logClientActivity("Ouverture coaching", "Page de reservation coaching consultee");
          await fetchAppointments(session.access_token);
          
          const todayStr = new Date().toLocaleDateString("en-CA");
          // Masterclass legacy (B2C NEXA) — les étudiants de centre utilisent le coaching de groupe du planning.
          if (!profile.center_id) {
            const { data: groups, error: groupsError } = await supabase
              .from("group_coaching_sessions")
              .select("id, title, description, session_date, session_time, duration_min, status")
              .eq("status", "scheduled")
              .is("center_id", null)
              .gte("session_date", todayStr)
              .order("session_date", { ascending: true })
              .order("session_time", { ascending: true });

            if (groupsError) console.error("Erreur groupes:", groupsError);
            setGroupSessions(groups ?? []);
          } else {
            setGroupSessions([]);
          }

          // Si l'étudiant appartient à un centre, on va chercher les lives et la configuration
          if (profile.center_id) {
            const { data: lives, error: livesError } = await supabase
              .from("live_sessions")
              .select("*")
              .in("status", ["scheduled", "live"])
              .gte("scheduled_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
              .order("scheduled_at", { ascending: true });

            if (livesError) console.error("Erreur lives:", livesError);
            setLiveSessions(lives ?? []);

            // Coaching de groupe = séances collectives du planning ciblant les classes de l'étudiant
            try {
              const collRes = await fetch("/api/coaching/collective-sessions", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (collRes.ok) {
                const collJson = await collRes.json();
                setCollectiveSessions(collJson.sessions ?? []);
              }
            } catch (e) {
              console.error("Erreur séances collectives:", e);
            }

            // 3. Requête asynchrone isolée pour les droits du centre
            supabase
              .from("centers")
              .select("allow_student_lives, max_live_participants")
              .eq("id", profile.center_id)
              .single()
              .then(({ data: c }) => {
                if (c) setCenterConfig(c);
              });
          }
        }
      }
      setLoading(false);
    };
    checkAccess();
  }, [router]);
  // --- FIN DU BLOC MODIFIÉ ---

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getDaysArray = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7;
    const days: Array<Date | null> = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInCalendar = getDaysArray();

  const isSlotPast = (time: string) => {
    if (!selectedDate) return true;
    const slotDate = new Date(`${formatDateValue(selectedDate)}T${time}`);
    return slotDate.getTime() < Date.now() + 30 * 60 * 1000;
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !token) return;
    setBookingStep("confirming");
    setErrorMessage("");

    try {
      const scheduledAt = new Date(`${formatDateValue(selectedDate)}T${selectedTime}`);
      const res = await fetch("/api/coaching/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scheduled_at: scheduledAt.toISOString(),
          note: bookingNote.trim() || null,
          session_mode: "presentiel",
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(localizeCoachingError(json.error, t, "coachingErrorGeneric"));
        setBookingStep("select");
        return;
      }

      setBookingNote("");
      await fetchAppointments(token);
      logClientActivity("Demande coaching présentiel", scheduledAt.toLocaleString(dateLocale), { scheduled_at: scheduledAt.toISOString() });
      setSelectedDate(null);
      setSelectedTime(null);
      setBookingStep("select");
      setJustBooked(true);
      setTimeout(() => setJustBooked(false), 5000);
    } catch (error) {
      setErrorMessage(t("dashboard", "coachingErrorGeneric"));
      setBookingStep("select");
    }
  };

  const handleCancelAppointment = async (id: string) => {
    setCancelling(true);
    try {
      const res = await fetch("/api/coaching/appointments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, cancel_reason: cancelReason.trim() || null }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErrorMessage(localizeCoachingError(json.error, t, "coachingErrorCancel"));
        return;
      }
      setActionMode("none");
      setCancelReason("");
      setRescheduleDate("");
      setRescheduleTime(null);
      setRescheduleReason("");
      setBookingStep("select");
      setSelectedDate(null);
      setSelectedTime(null);
      setErrorMessage("");
      await fetchAppointments(token);
    } catch {
      setErrorMessage(t("dashboard", "coachingErrorGeneric"));
    } finally {
      setCancelling(false);
    }
  };

  const handleRescheduleAppointment = async (id: string) => {
    if (!rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
      setErrorMessage(t("dashboard", "coachingErrorRescheduleFields"));
      return;
    }
    setRescheduling(true);
    setErrorMessage("");
    try {
      const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}`);
      const res = await fetch("/api/coaching/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id,
          action: "reschedule",
          scheduled_at: scheduledAt.toISOString(),
          reschedule_reason: rescheduleReason.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(localizeCoachingError(json.error, t, "coachingErrorReschedule"));
        return;
      }
      setActionMode("none");
      setRescheduleDate("");
      setRescheduleTime(null);
      setRescheduleReason("");
      await fetchAppointments(token);
    } catch {
      setErrorMessage(t("dashboard", "coachingErrorGeneric"));
    } finally {
      setRescheduling(false);
    }
  };

  const appointmentStatusMeta = (status: string) => {
    if (status === "confirmed") return { label: t("dashboard", "coachingStatusConfirmed"), badge: t("dashboard", "coachingBadgeConfirmed"), className: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 };
    if (status === "reporte") return { label: t("dashboard", "coachingStatusReschedule"), badge: t("dashboard", "coachingBadgeReschedule"), className: "bg-blue-50 text-blue-600 border-blue-200", icon: CalendarClock };
    if (status === "refused") return { label: t("dashboard", "coachingStatusRefused"), badge: t("dashboard", "coachingBadgeRefused"), className: "bg-red-50 text-red-600 border-red-200", icon: XCircle };
    if (status === "cancelled") return { label: t("dashboard", "coachingStatusCancelled"), badge: t("dashboard", "coachingBadgeCancelled"), className: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: XCircle };
    return { label: t("dashboard", "coachingStatusReserved"), badge: t("dashboard", "coachingBadgeReserved"), className: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 };
  };

  const statusMeta = (status: string) => {
    if (status === "confirmed") return { label: t("dashboard", "coachingStatusConfirmedM"), className: "text-emerald-700 bg-emerald-50 border-emerald-100", icon: CheckCircle2 };
    if (status === "reporte") return { label: t("dashboard", "coachingStatusReschedule"), className: "text-blue-700 bg-blue-50 border-blue-100", icon: CalendarClock };
    if (status === "refused") return { label: t("dashboard", "coachingStatusRefusedM"), className: "text-red-700 bg-red-50 border-red-100", icon: XCircle };
    if (status === "cancelled") return { label: t("dashboard", "coachingStatusCancelledM"), className: "text-neutral-500 bg-neutral-100 border-neutral-200", icon: XCircle };
    return { label: t("dashboard", "coachingStatusReserved"), className: "text-emerald-700 bg-emerald-50 border-emerald-100", icon: CheckCircle2 };
  };

  if (loading) {
    return <StudentRouteSkeleton contentOnly variant="page" />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#FFFBF7] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[2rem] border border-neutral-200 shadow-sm w-full max-w-md flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className={`${STUDENT_TEXT.sectionTitle} mb-3`} style={{ color: BRAND.blue }}>{t("dashboard", "coachingPremiumTitle")}</h1>
          <p className="text-neutral-500 mb-8 font-medium text-sm">{t("dashboard", "coachingPremiumBody")}</p>
          <button onClick={() => router.push(isCenterRoute ? "/dashboard" : "/profil")} className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all" style={{ backgroundColor: BRAND.blue, color: BRAND.white }}>
            {t("dashboard", "coachingUpgrade")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 flex flex-col overflow-x-hidden">
      
      {/* HEADER PLEINE LARGEUR */}
      <header className="bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 sticky top-0 z-40 py-3 md:py-4 shrink-0">
        <div className="nexa-student-shell flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <button onClick={() => router.push("/dashboard")} className="min-w-[44px] min-h-[44px] w-11 h-11 bg-orange-50/80 rounded-xl flex items-center justify-center border border-orange-100 hover:bg-orange-100/60 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4 text-neutral-600" />
            </button>
            <div className="min-w-0">
              <h1 className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>
                {userProfile?.center_id ? t("dashboard", "coachingLiveTitle") : t("dashboard", "coachingSessionsTitle")}
              </h1>
              <p className={`${STUDENT_TEXT.subtitle} mt-0.5`}>
                {userProfile?.center_id
                  ? t("dashboard", "coachingJoinCenterHint")
                  : (userProfile?.coaching_total === 9999 ? t("dashboard", "coachingUnlimited") : t("dashboard", "coachingRemaining", { count: Math.max(0, (userProfile?.coaching_total || 0) - (userProfile?.coaching_used || 0)) }))}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="nexa-student-shell flex-1 pt-6 md:pt-8 space-y-6 md:space-y-8 xl:space-y-10 pb-6">
        
        {/* SÉANCE 1-ON-1 À VENIR (HERO) */}
        {upcomingAppointment && (
          <section className={`w-full bg-white border rounded-2xl p-5 md:p-8 xl:p-10 shadow-sm transition-all ${justBooked ? "border-emerald-300 ring-2 ring-emerald-100" : "border-orange-100/80"}`}>
            {errorMessage && actionMode !== "none" && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorMessage}
              </div>
            )}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 mt-1 ${justBooked ? "bg-emerald-50 border-emerald-200" : upcomingAppointment.session_mode === "presentiel" ? "bg-amber-50 border-amber-100" : "bg-orange-50 border-orange-100"}`}>
                  {justBooked ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : upcomingAppointment.session_mode === "presentiel" ? (
                    <MapPin className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Video className="w-6 h-6 text-[#eb670e]" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const meta = appointmentStatusMeta(upcomingAppointment.status);
                    const StatusIcon = meta.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" /> {meta.badge}
                      </span>
                    );
                  })()}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                    upcomingAppointment.session_mode === "presentiel"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {upcomingAppointment.session_mode === "presentiel" ? <MapPin className="w-3 h-3" /> : <MonitorPlay className="w-3 h-3" />}
                    {sessionModeLabel(upcomingAppointment.session_mode, t("dashboard", "coachingModeInPerson"), t("dashboard", "coachingModeVisio"))}
                  </span>
                  </div>
                  <h3 className={`${STUDENT_TEXT.sectionTitle} mt-2`} style={{ color: BRAND.blue }}>
                    {new Date(upcomingAppointment.scheduled_at).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(upcomingAppointment.scheduled_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                  </h3>
                  {upcomingAppointment.status === "pending" && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">{t("dashboard", "coachingPendingSent")}</p>
                  )}
                  {upcomingAppointment.status === "reporte" && upcomingAppointment.reschedule_reason && (
                    <p className="text-xs text-blue-600 font-medium mt-1">{t("dashboard", "coachingReason", { reason: upcomingAppointment.reschedule_reason })}</p>
                  )}
                  {upcomingAppointment.original_scheduled_at && upcomingAppointment.status === "reporte" && (
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {t("dashboard", "coachingPreviousDate", { date: new Date(upcomingAppointment.original_scheduled_at).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" }) })}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col gap-3">
                {upcomingAppointment.session_mode === "presentiel" ? (
                <span className="text-xs font-semibold text-amber-800 border border-amber-200 px-4 py-3 rounded-xl bg-amber-50 flex items-center gap-2 justify-center text-center">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {upcomingAppointment.status === "confirmed"
                    ? t("dashboard", "coachingConfirmedCenter")
                    : t("dashboard", "coachingInPersonSent")}
                </span>
                ) : upcomingAppointment.status === "confirmed" && inJoinWindow(
                  new Date(upcomingAppointment.scheduled_at).getTime(),
                  new Date(upcomingAppointment.scheduled_at).getTime() + 60 * 60 * 1000,
                ) ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/coaching/room/${upcomingAppointment.id}`)}
                    className="w-full min-h-[44px] py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: BRAND.blue }}
                  >
                    <Video className="w-4 h-4" /> {t("dashboard", "coachingJoinVisio")}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-blue-800 border border-blue-200 px-4 py-3 rounded-xl bg-blue-50 flex items-center gap-2 justify-center text-center">
                    <Video className="w-4 h-4 shrink-0" />
                    {upcomingAppointment.status === "confirmed"
                      ? t("dashboard", "coachingRoomOpens")
                      : t("dashboard", "coachingAwaitConfirm")}
                  </span>
                )}

                {actionMode === "none" && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => { setActionMode("reschedule"); setErrorMessage(""); }}
                      className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                      <CalendarClock className="w-4 h-4" /> {t("dashboard", "coachingReschedule")}
                    </button>
                    <button
                      onClick={() => { setActionMode("cancel"); setErrorMessage(""); }}
                      className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> {t("dashboard", "coachingCancel")}
                    </button>
                  </div>
                )}

                {actionMode === "cancel" && (
                  <div className="flex flex-col gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200 w-full sm:w-72">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("dashboard", "coachingCancelSession")}</p>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      maxLength={200}
                      rows={2}
                      placeholder={t("dashboard", "coachingReasonOptional")}
                      className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 focus:border-red-400 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setActionMode("none")} className="flex-1 text-xs font-bold text-neutral-500 bg-white border border-neutral-200 py-1.5 rounded-md hover:bg-neutral-100">{t("dashboard", "coachingBack")}</button>
                      <button onClick={() => handleCancelAppointment(upcomingAppointment.id)} disabled={cancelling} className="flex-1 text-xs font-bold bg-red-600 text-white py-1.5 rounded-md hover:bg-red-500 disabled:opacity-50">
                        {cancelling ? "..." : t("dashboard", "coachingConfirmCancel")}
                      </button>
                    </div>
                  </div>
                )}

                {actionMode === "reschedule" && (
                  <div className="flex flex-col gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200 w-full sm:w-80">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("dashboard", "coachingRescheduleSession")}</p>
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={formatDateValue(today)}
                      onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTime(null); }}
                      className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 focus:border-blue-400 outline-none"
                    />
                    {rescheduleDate && (
                      <div className="grid max-h-[220px] grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
                        {timeSlots.map((time) => {
                          const slotDate = new Date(`${rescheduleDate}T${time}`);
                          const isDisabled = slotDate.getTime() < Date.now() + 30 * 60 * 1000;
                          const isSelected = rescheduleTime === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setRescheduleTime(time)}
                              className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                isDisabled ? "bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed"
                                : isSelected ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-neutral-200 text-neutral-700 hover:border-blue-400"
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      maxLength={200}
                      rows={2}
                      placeholder={t("dashboard", "coachingRescheduleReason")}
                      className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 focus:border-blue-400 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setActionMode("none")} className="flex-1 text-xs font-bold text-neutral-500 bg-white border border-neutral-200 py-1.5 rounded-md hover:bg-neutral-100">{t("dashboard", "coachingBack")}</button>
                      <button
                        onClick={() => handleRescheduleAppointment(upcomingAppointment.id)}
                        disabled={rescheduling || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim()}
                        className="flex-1 text-xs font-bold bg-blue-600 text-white py-1.5 rounded-md hover:bg-blue-500 disabled:opacity-50"
                      >
                        {rescheduling ? "..." : t("dashboard", "coachingSendReschedule")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* RÉSERVER UNE SESSION (CALENDRIER 1-ON-1) */}
        {!upcomingAppointment && (
          <section className="w-full bg-white border border-orange-100/80 rounded-2xl shadow-sm p-5 md:p-8 xl:p-10">
            <AnimatePresence mode="wait">
              {bookingStep === "select" && (
                <motion.div key="select" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-[#eb670e]" />
                      </div>
                      <h2 className={STUDENT_TEXT.sectionTitle} style={{ color: BRAND.blue }}>{t("dashboard", "coachingClaimInPerson")}</h2>
                    </div>

                    {errorMessage && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {errorMessage}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-6 bg-orange-50/50 p-1.5 rounded-xl border border-orange-100/50">
                      <button onClick={prevMonth} disabled={currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()} className="min-w-[44px] min-h-[44px] p-2 bg-white rounded-lg text-neutral-500 border border-neutral-200 shadow-sm disabled:opacity-20">
                        <ChevronLeft size={14} />
                      </button>
                      <h3 className={STUDENT_TEXT.cardLabel} style={{ color: BRAND.blue }}>
                        {currentMonth.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}
                      </h3>
                      <button onClick={nextMonth} className="min-w-[44px] min-h-[44px] p-2 bg-white rounded-lg text-neutral-500 border border-neutral-200 shadow-sm">
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {weekDays.map(day => <span key={day} className="text-[10px] font-bold text-neutral-400 uppercase">{day}</span>)}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {daysInCalendar.map((date, i) => {
                        if (!date) return <div key={i} className="aspect-square" />;
                        const isSunday = date.getDay() === 0;
                        const isPast = date < today;
                        const isDisabled = isSunday || isPast;
                        const isSelected = selectedDate?.toDateString() === date.toDateString();

                        return (
                          <button
                            key={i} disabled={isDisabled} onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                            className={`aspect-square min-h-[40px] flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                              isDisabled ? "text-neutral-200 bg-transparent cursor-not-allowed" 
                              : isSelected ? "bg-[#11224E] text-white shadow-sm" 
                              : "text-neutral-700 hover:bg-orange-50 hover:text-[#eb670e] bg-neutral-50 border border-neutral-200/40"
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-orange-100/80 pt-6 lg:pt-0 lg:pl-8 flex flex-col">
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-4">{t("dashboard", "coachingSlotsParis")}</h3>
                    
                    {!selectedDate ? (
                      <div className="flex-1 border border-dashed border-orange-200 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-orange-50/30 min-h-[200px]">
                        <CalendarCheck className="w-6 h-6 text-neutral-300 mb-2" />
                        <p className="text-xs font-semibold text-neutral-400">{t("dashboard", "coachingPickDate")}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                          {timeSlots.map((time) => {
                            const isSelected = selectedTime === time;
                            const isDisabled = isSlotPast(time);
                            return (
                              <button
                                key={time} disabled={isDisabled} onClick={() => setSelectedTime(time)}
                                className={`min-h-[44px] py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                  isDisabled ? "bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed" 
                                  : isSelected ? "bg-[#eb670e] border-[#eb670e] text-white shadow-sm" 
                                  : "bg-white border-neutral-200 text-neutral-700 hover:border-[#eb670e] hover:text-[#eb670e]"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>

                        {selectedTime && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-[11px] font-medium text-amber-800 leading-snug">
                                {t("dashboard", "coachingInPersonOnly")}
                              </p>
                            </div>
                            <textarea
                              value={bookingNote} onChange={(e) => setBookingNote(e.target.value)} maxLength={100} rows={2}
                              placeholder={t("dashboard", "coachingTopicPlaceholder")}
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#eb670e] transition-colors resize-none"
                            />
                            <button
                              onClick={handleBooking}
                              className="w-full min-h-[44px] py-3.5 bg-[#11224E] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
                            >
                              {t("dashboard", "coachingClaimAt", { day: selectedDate.getDate(), month: selectedDate.getMonth() + 1, time: selectedTime })}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {bookingStep === "confirming" && (
                <motion.div key="confirming" className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-[#eb670e] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-neutral-500 font-medium mt-4">{t("dashboard", "coachingSendingRequest")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* NOUVEAU BLOC : LIVES B2B ET GROUPES */}
        {(Boolean(userProfile?.center_id) || liveSessions.length > 0 || visibleGroupSessions.length > 0 || collectiveSessions.length > 0 || centerConfig?.allow_student_lives) && (
          <section className="w-full mb-8">
            <div className="flex items-center justify-between mb-3 ml-1 pr-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {t("dashboard", "coachingScheduledByCenter")}
              </h3>
              
              {false && centerConfig?.allow_student_lives && (
                <button 
                  onClick={() => alert("Le module de création de salon d'étude arrive bientôt ! Vous pourrez inviter jusqu'à " + (centerConfig.max_live_participants || 4) + " camarades.")}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#eb670e] hover:bg-orange-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Plus size={14} /> Créer un salon
                </button>
              )}
            </div>

            {liveSessions.length === 0 && visibleGroupSessions.length === 0 && collectiveSessions.length === 0 ? (
              <div className="bg-white border border-orange-100/80 rounded-2xl p-6 text-center">
                <MonitorPlay className="w-8 h-8 text-orange-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-600">{t("dashboard", "coachingNoLive")}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {t("dashboard", "coachingNoLiveHint")}
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-5">
              
              {/* LIVES DES CENTRES */}
              {liveSessions.map((live) => (
                <div key={live.id} className="bg-white border border-orange-100/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-colors">
                  <div>
                    {live.session_type === "staff_live" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-2 inline-flex items-center gap-1">
                        <MonitorPlay size={10} /> {t("dashboard", "coachingOfficialCourse")}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mb-2 inline-flex items-center gap-1">
                        <Users size={10} /> {t("dashboard", "coachingStudentRoom")}
                      </span>
                    )}
                    <h4 className={`${STUDENT_TEXT.cardTitle} mt-1`} style={{ color: BRAND.blue }}>{live.title}</h4>
                    {live.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{live.description}</p>}
                    <p className="text-xs font-bold text-neutral-400 mt-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {new Date(live.scheduled_at).toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(live.scheduled_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    {live.meeting_url && inJoinWindow(
                      new Date(live.scheduled_at).getTime(),
                      new Date(live.scheduled_at).getTime() + (live.duration_minutes || 60) * 60 * 1000,
                    ) ? (
                      <a
                        href={live.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Video size={14} /> {t("dashboard", "coachingJoin")}
                      </a>
                    ) : (
                      <button disabled className="w-full py-2 bg-neutral-50 text-neutral-400 rounded-lg text-xs font-bold border border-neutral-200 cursor-not-allowed">
                        {t("dashboard", "coachingProgrammedByCenter")}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* COACHING DE GROUPE + SESSIONS LIVE (planning centre) */}
              {collectiveSessions.map((c) => {
                const isLive = c.kind === "live" || c.session_scope === "live";
                const badgeLabel = isLive
                  ? t("dashboard", "coachingLiveBadge")
                  : c.mode === "en_ligne"
                    ? t("dashboard", "coachingOnlineCourse")
                    : t("dashboard", "coachingSession");
                const key = sessionKey(c);
                const refused = c.my_response?.status === "refused";
                const isRefusingThis = refuseKey === key;
                return (
                <div key={key} className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors ${refused ? "border-red-100 opacity-90" : "border-orange-100/80 hover:border-indigo-200"}`}>
                  <div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2 inline-flex items-center gap-1 ${isLive ? "text-emerald-700 bg-emerald-50" : "text-indigo-600 bg-indigo-50"}`}>
                      {isLive ? <MonitorPlay size={10} /> : <Users size={10} />}
                      {badgeLabel}
                    </span>
                    {refused && (
                      <span className="ml-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2 inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-100">
                        {t("dashboard", "coachingStatusRefused")}
                      </span>
                    )}
                    <h4 className={`${STUDENT_TEXT.cardTitle} mt-1`} style={{ color: BRAND.blue }}>
                      {localizeCollectiveTitle(c.title, isLive ? "live" : "group", t)}
                    </h4>
                    <p className="text-xs font-bold text-neutral-400 mt-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {new Date(c.scheduled_at).toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })} · {c.start_time.slice(0, 5)}
                    </p>
                    {!isLive && c.mode !== "en_ligne" && (
                      <p className="text-[10px] font-bold text-amber-600 mt-1">{c.room_name ? t("dashboard", "coachingInPersonRoom", { room: c.room_name }) : t("dashboard", "coachingInPerson")}</p>
                    )}
                    {c.mode === "en_ligne" && (
                      <p className="text-[10px] font-bold text-neutral-400 mt-1">{t("dashboard", "coachingVisioByCenter")}</p>
                    )}
                    {refused && c.my_response?.reason && (
                      <p className="text-[11px] text-red-700 mt-2 font-medium leading-snug">
                        {t("dashboard", "coachingReason", { reason: c.my_response.reason })}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                    {refused ? (
                      <button disabled className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 cursor-not-allowed">
                        {t("dashboard", "coachingYouRefused")}
                      </button>
                    ) : isRefusingThis ? (
                      <div className="space-y-2">
                        {refuseError && (
                          <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {refuseError}
                          </p>
                        )}
                        <textarea
                          value={refuseReason}
                          onChange={(e) => setRefuseReason(e.target.value)}
                          maxLength={500}
                          rows={3}
                          placeholder={t("dashboard", "coachingRefuseReason")}
                          className="w-full text-xs px-2 py-1.5 rounded-md border border-neutral-200 focus:border-red-400 outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setRefuseKey(null); setRefuseReason(""); setRefuseError(""); }}
                            className="flex-1 text-xs font-bold text-neutral-500 bg-white border border-neutral-200 py-2 rounded-md hover:bg-neutral-100"
                          >
                            {t("dashboard", "coachingBack")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRefuseCollective(c)}
                            disabled={refusing}
                            className="flex-1 text-xs font-bold bg-red-600 text-white py-2 rounded-md hover:bg-red-500 disabled:opacity-50"
                          >
                            {refusing ? "..." : t("dashboard", "coachingConfirmRefuse")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {c.mode === "presentiel" || (!isLive && c.mode !== "en_ligne") ? (
                          <button disabled className="w-full py-2 bg-neutral-50 text-neutral-400 rounded-lg text-xs font-bold border border-neutral-200 cursor-not-allowed">
                            {c.room_name ? t("dashboard", "coachingInPersonRoom", { room: c.room_name }) : t("dashboard", "coachingModeInPerson")}
                          </button>
                        ) : inJoinWindow(sessionStartMs(c.session_date, c.start_time), sessionEndMs(c.session_date, c.end_time)) ? (
                          <button
                            type="button"
                            onClick={() => router.push(collectiveJoinPath(c.slot_id, c.session_date))}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <Video size={14} /> {t("dashboard", "coachingJoin")}
                          </button>
                        ) : (
                          <button disabled className="w-full py-2 bg-neutral-50 text-neutral-400 rounded-lg text-xs font-bold border border-neutral-200 cursor-not-allowed">
                            {t("dashboard", "coachingRoomOpensShort")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setRefuseKey(key); setRefuseReason(""); setRefuseError(""); }}
                          className="w-full min-h-[40px] py-2 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <XCircle size={14} /> {t("dashboard", "coachingRefuseWithReason")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                );
              })}

              {/* ANCIENS GROUPES TCF */}
              {visibleGroupSessions.map((g) => (
                <div key={g.id} className="bg-white border border-orange-100/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md mb-2 inline-block">{t("dashboard", "coachingMasterclassTcf")}</span>
                    <h4 className={STUDENT_TEXT.cardTitle} style={{ color: BRAND.blue }}>{g.title}</h4>
                    {g.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{g.description}</p>}
                    <p className="text-xs font-bold text-neutral-400 mt-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {new Date(groupStartMs(g)).toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(groupStartMs(g)).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    {inJoinWindow(groupStartMs(g), groupStartMs(g) + (g.duration_min || 60) * 60 * 1000) ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/coaching/room/group/${g.id}`)}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Video size={14} /> {t("dashboard", "coachingJoin")}
                      </button>
                    ) : (
                      <button disabled className="w-full py-2 bg-neutral-50 text-neutral-400 rounded-lg text-xs font-bold border border-neutral-200 cursor-not-allowed">
                        {t("dashboard", "coachingRoomOpensShort")}
                      </button>
                    )}
                  </div>
                </div>
              ))}

            </div>
            )}
          </section>
        )}

        {/* HISTORIQUE */}
        <section className="w-full">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3 ml-1">{t("dashboard", "coachingHistory")}</h3>
          <div className="bg-white border border-orange-100/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="divide-y divide-neutral-100">
              {appointments.filter(a => new Date(a.scheduled_at).getTime() + 30 * 60 * 1000 < Date.now() || a.status === 'cancelled' || a.status === 'refused').length === 0 ? (
                <p className="text-xs font-semibold text-neutral-400 text-center py-8">{t("dashboard", "coachingNoHistory")}</p>
              ) : (
                appointments.filter(a => new Date(a.scheduled_at).getTime() + 30 * 60 * 1000 < Date.now() || a.status === 'cancelled' || a.status === 'refused')
                .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                .map((appointment) => {
                  const meta = statusMeta(appointment.status);
                  return (
                    <div key={appointment.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:bg-neutral-50/50 transition-colors gap-3">
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-[9px] border w-24 text-center ${meta.className}`}>
                          {meta.label}
                        </span>
                        <div>
                          <p className="font-bold" style={{ color: BRAND.blue }}>
                            {new Date(appointment.scheduled_at).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <p className="text-neutral-400 font-medium mt-0.5">{new Date(appointment.scheduled_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      {appointment.admin_note && <span className="text-neutral-500 italic max-w-xs truncate hidden sm:block bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">{t("dashboard", "coachingNote")} {appointment.admin_note}</span>}
                      {appointment.cancel_reason && <span className="text-neutral-500 italic max-w-xs truncate hidden sm:block bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">{t("dashboard", "coachingCancelReasonLabel")} {appointment.cancel_reason}</span>}
                      {appointment.reschedule_reason && appointment.status === "reporte" && <span className="text-neutral-500 italic max-w-xs truncate hidden sm:block bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">{t("dashboard", "coachingRescheduleReasonLabel")} {appointment.reschedule_reason}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}