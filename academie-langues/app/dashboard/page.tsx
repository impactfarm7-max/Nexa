"use client";

/**
 * ============================================================================
 * NEXA — Dashboard étudiant (v2, restructuré)
 * ============================================================================
 *
 * Changements demandés et appliqués :
 * 1. En-tête : "Bonjour" / "Bonsoir" selon l'heure réelle de l'étudiant.
 * 2. Bouton Support + cloche de notification conservés dans l'en-tête.
 *    Bouton profil retiré (déjà présent dans la Sidebar).
 * 3. Grosse carte "TCF Canada" (logo, pack, progression, quotas) supprimée :
 *    ces infos vivent maintenant dans la Sidebar (sélecteur de programme,
 *    navigation). Si tu veux garder une vue rapide des quotas restants,
 *    dis-le moi et je l'ajoute sous forme de mini-widget séparé.
 * 4. Section "Espace académique" supprimée (Cours, Bibliothèque, Mode Examen,
 *    Communauté sont déjà dans la Sidebar).
 * 5. "Pack d'entraînement" conservé : ce bloc reste lié à la matière/cursus
 *    actif (badge en haut de la section). Pour un vrai multi-cursus, il
 *    faudrait que le programme actif (actuellement géré en state local dans
 *    Sidebar.tsx) vive dans un contexte partagé ou l'URL — voir le TODO
 *    `ACTIVE_PROGRAM` plus bas.
 * 6. Nouveaux blocs d'information : Notes, Devoirs en attente, Discipline,
 *    Sessions live à venir, Todo-list (avec emplacement pour l'IA premium).
 * 7. Typographie : Google Sans pour les titres, Inter/Roboto pour le texte.
 *    -> Ce fichier utilise les classes utilitaires `font-display` (titres)
 *    et `font-sans` (texte). Ajoute ceci à ton `tailwind.config` /
 *    `layout.tsx` si ce n'est pas déjà fait :
 *
 *      // tailwind.config.ts
 *      fontFamily: {
 *        display: ["var(--font-google-sans)", "sans-serif"],
 *        sans: ["var(--font-inter)", "sans-serif"],
 *      }
 *
 *      // app/layout.tsx
 *      import { Inter } from "next/font/google";
 *      const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
 *      // Google Sans n'est pas sur next/font/google (police propriétaire
 *      // Google) : héberge le woff2 toi-même et déclare-le en @font-face
 *      // sous le nom --font-google-sans, ou remplace par "Product Sans"/
 *      // "Inter" en attendant.
 *
 * 8. Couleurs de marque : bleu #11224E, orange #F87B1B, blanc #FFFFFF
 *    (cf. palette envoyée). Centralisées dans BRAND ci-dessous.
 * 9. Responsive : grilles en colonnes qui s'empilent en mobile (cf. classes
 *    grid-cols-1 / sm: / lg:).
 * ============================================================================
 */

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Mic,
  PenTool,
  Headphones,
  ScrollText,
  ChevronRight,
  Bell,
  Phone,
  X,
  MessageCircleQuestion,
  MessageCircle,
  Star,
  NotebookPen,
  FileWarning,
  Flame,
  Radio,
  ListChecks,
  Plus,
  Check,
  Trash2,
  Sparkles,
  Lock,
  CalendarClock,
  BookOpen,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { isCenterStaff, CENTER_HOME } from "../utils/student-routes";
import { logClientActivity } from "../utils/client-activity";
import { loadStudentAccess } from "../utils/student-access-cache";
import { decryptMessage } from "@/app/utils/messageCrypto.client";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";
import { addCalendarMonths } from "@/app/utils/examCompletUnlock";

// Message de la notif in-app envoyée le jour où l'examen complet se débloque
const EXAM_COMPLET_UNLOCK_MSG =
  "🎉 Bonne nouvelle : votre examen complet TCF est débloqué ! Vous pouvez le lancer dès maintenant depuis le simulateur.";

// Message de la notif in-app envoyée les jours d'ouverture de l'expression écrite
// (étudiants de centre : chaque mercredi et samedi).
const EE_OPEN_MSG =
  "✍️ L'expression écrite est ouverte aujourd'hui ! Entraînez-vous en illimité — disponible chaque mercredi et samedi.";

// Date locale au format AAAA-MM-JJ (sert de clé anti-doublon par jour).
function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FeedbackPopup = dynamic(() => import("../components/FeedbackPopup"), { ssr: false });
const FeedbackForm = dynamic(() => import("../components/FeedbackForm"), { ssr: false });

// ----------------------------------------------------------------------------
// Palette de marque
// ----------------------------------------------------------------------------
const BRAND = {
  blue: "#11224E",
  orange: "#F87B1B",
  white: "#FFFFFF",
};

// ----------------------------------------------------------------------------
// Salutation dynamique
// ----------------------------------------------------------------------------
function useGreeting() {
  const [greeting, setGreeting] = useState("Bonjour");
  useEffect(() => {
    const compute = () => {
      const h = new Date().getHours();
      // 5h–17h59 -> Bonjour · 18h–4h59 -> Bonsoir
      setGreeting(h >= 5 && h < 18 ? "Bonjour" : "Bonsoir");
    };
    compute();
    const id = setInterval(compute, 5 * 60 * 1000); // recalcul toutes les 5 min
    return () => clearInterval(id);
  }, []);
  return greeting;
}

// ----------------------------------------------------------------------------
// Extraction de note depuis un résultat de exam_sessions
// (ee_result / chaque tâche de eo_result ont le format confirmé par
// /api/simulateur/examen : { note: "14", niveau: "C1", ... } -> note /20.
// ce_result / co_result sont sauvegardés tels quels par le client (action
// "save"), leur format exact n'a pas été confirmé : on essaie le même
// champ `note`, puis un format générique { score, total }, sinon on
// n'affiche rien plutôt que d'inventer un chiffre.)
// ----------------------------------------------------------------------------
function extractNote(result: any): { score: number; max: number } | null {
  if (!result || typeof result !== "object") return null;
  if (result.note !== undefined && result.note !== null && result.note !== "En attente") {
    const n = parseFloat(String(result.note).replace(",", "."));
    if (!Number.isNaN(n)) return { score: n, max: 20 };
  }
  if (result.score !== undefined && result.total !== undefined) {
    const s = Number(result.score);
    const t = Number(result.total);
    if (!Number.isNaN(s) && !Number.isNaN(t) && t > 0) return { score: s, max: t };
  }
  return null;
}

function extractEONote(eoResult: any): { score: number; max: number } | null {
  if (!eoResult || typeof eoResult !== "object") return null;
  const parts = [eoResult.tache1, eoResult.tache2, eoResult.tache3]
    .map(extractNote)
    .filter(Boolean) as { score: number; max: number }[];
  if (parts.length === 0) return null;
  const avg = parts.reduce((sum, p) => sum + p.score, 0) / parts.length;
  return { score: Math.round(avg * 10) / 10, max: parts[0].max };
}

// ----------------------------------------------------------------------------
// Types des nouveaux widgets
// ----------------------------------------------------------------------------
// "Mes notes" : source réelle confirmée = table `exam_sessions`
// (ce_result, co_result, ee_result, eo_result), mais UNIQUEMENT pour les
// sessions de "Mode Examen complet". Les exercices "Pack d'entraînement"
// (Zen, sujet par sujet) et "Cours et Quiz" n'ont pas de stockage serveur
// connu à ce jour — voir `NOTES_PORTEE_PARTIELLE` plus bas.
type GradeEntry = {
  id: string;
  subject: string; // ex: "Expression Écrite"
  score: number;
  max: number;
  date: string; // ISO
};

// Devoirs : source réelle confirmée = missions / mission_submissions
// (déjà utilisées dans l'ancien Dashboard).
type PendingAction = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "mission" | "course";
  courseId?: string;
  courseVersion?: string;
};

const SEEN_CENTER_COURSES_KEY = "iag_seen_center_courses_v1";

function readSeenCenterCourses(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SEEN_CENTER_COURSES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function markCenterCourseSeen(courseId: string, courseVersion?: string) {
  if (typeof window === "undefined") return;
  const seen = readSeenCenterCourses();
  seen[courseId] = courseVersion || "seen";
  window.localStorage.setItem(SEEN_CENTER_COURSES_KEY, JSON.stringify(seen));
}

// Sessions live : sources réelles
// - schedule_slots collectives (centres TCF) via /api/coaching/collective-sessions
// - live_sessions (lives centre)
// - group_coaching_sessions (B2C NEXA)
// - /api/coaching/appointments (coaching individuel)
type LiveSession = {
  id: string;
  title: string;
  type: "coaching-individuel" | "coaching-groupe" | "live-centre" | "collectif";
  scheduled_at: string;
  href?: string | null;
  modeLabel?: string;
};

type TodoItem = {
  id: string;
  content: string;
  is_done: boolean;
};

// Discipline : "homeworkSubmitted" est fiable (mission_submissions).
// "activeDays" nécessite la table lue par /api/activity (route non
// fournie pour l'instant). "liveAttendance" n'a pas d'équivalent
// "présence confirmée" dans le code partagé — seule la RÉSERVATION est
// trackée, pas la présence effective en visio. On affiche donc ces deux
// dernières comme "non connecté" plutôt que d'afficher un faux 0.
type DisciplineStats = {
  activeDays: number | null;
  liveAttendance: number | null;
  homeworkSubmitted: number;
};

export default function Dashboard() {
  const router = useRouter();
  const greeting = useGreeting();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [privateUnreadCount, setPrivateUnreadCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  // Bannières (générale + message privé) — conservées
  const [activeBroadcast, setActiveBroadcast] = useState<{ id: string; message: string } | null>(null);
  const [broadcastExpanded, setBroadcastExpanded] = useState(false);
  const [activeDirectMsg, setActiveDirectMsg] = useState<{ id: string; message: string } | null>(null);
  const [directMsgExpanded, setDirectMsgExpanded] = useState(false);

  const [pinnedFeedbacks, setPinnedFeedbacks] = useState<any[]>([]);

  const { status: pushStatus, subscribe: pushSubscribe, subscribeError } = usePushNotifications();
  const [pushBannerDismissed, setPushBannerDismissed] = useState(true);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSupportMenu, setShowSupportMenu] = useState(false);

  // -------------------- Nouveaux widgets du dashboard --------------------
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [upcomingLives, setUpcomingLives] = useState<LiveSession[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineStats>({
    activeDays: null,
    liveAttendance: null,
    homeworkSubmitted: 0,
  });
  const [widgetsLoading, setWidgetsLoading] = useState(true);

  // TODO ACTIVE_PROGRAM : pour que le "Pack d'entraînement" suive vraiment
  // la matière sélectionnée dans la Sidebar (cas double-cursus), il faudrait
  // partager ce choix via un Context global ou un paramètre d'URL plutôt que
  // de le garder en state local dans Sidebar.tsx. En attendant, on affiche
  // le pack actif issu de useSimulationLimit.
  const limitData = useSimulationLimit();
  const { packType, isAdmin, isSubValid } = limitData;
  const isTrial = !isAdmin && !isSubValid;
  const isFormation = ["acceleree", "complete", "essai"].includes(packType);
  const canUseAITodo = isAdmin || isFormation; // todo IA = fonctionnalité premium
  const { isPluriannual, showTcfPacks, loading: centerCtxLoading } = useStudentCenterContext();

  const activeProgramLabel = (() => {
    if (isPluriannual) return "Formation pluri-annuelle";
    if (isAdmin) return "Admin VIP";
    if (packType === "essai") return "Période d'essai · TCF Canada";
    if (isFormation) return packType === "acceleree" ? "Formation Accélérée · TCF Canada" : "Formation Complète · TCF Canada";
    return "TCF Canada";
  })();

  useEffect(() => {
    const DISMISS_KEY = "iag_push_banner_dismissed_until";
    const until = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    setPushBannerDismissed(Date.now() < until);
  }, []);

  const dismissPushBanner = () => {
    const DISMISS_KEY = "iag_push_banner_dismissed_until";
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setPushBannerDismissed(true);
  };

  const showPushBanner = !pushBannerDismissed && (pushStatus === "unsubscribed" || pushStatus === "error");

  const promos = isPluriannual
    ? [{ title: "Votre espace formation", desc: "Consultez vos cours, devoirs et sessions live.", color: `linear-gradient(135deg, ${BRAND.blue}, #3B5BA9)` }]
    : [
        { title: "Nouveau : Simulateur Vocal IA", desc: "Pratiquez l'oral en illimité.", color: `linear-gradient(135deg, ${BRAND.orange}, #FBBF24)` },
        { title: "Masterclass Écriture C1", desc: "Ce samedi à 18h en direct.", color: `linear-gradient(135deg, ${BRAND.blue}, #3B5BA9)` },
      ];
  const totalSlides = promos.length + pinnedFeedbacks.length;
  const [activePromo, setActivePromo] = useState(0);

  useEffect(() => {
    if (totalSlides === 0) return;
    const id = setInterval(() => setActivePromo((p) => (p + 1) % totalSlides), 5000);
    return () => clearInterval(id);
  }, [totalSlides]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // -------------------- Bannière annonce générale --------------------
  useEffect(() => {
    const loadLatestBroadcast = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [{ data: broadcast }, { data: profile }] = await Promise.all([
        supabase.from("community_messages").select("id, message").eq("channel", "general").is("center_id", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("general_last_seen_msg_id").eq("id", session.user.id).single(),
      ]);
      if (broadcast && broadcast.id !== profile?.general_last_seen_msg_id) {
        const clear = await decryptMessage(broadcast.message, { kind: "community", channel: "general" });
        setActiveBroadcast({ ...broadcast, message: clear });
      }
    };
    loadLatestBroadcast();

    let listener: any;
    let poll: NodeJS.Timeout | null = null;
    let alive = true;
    listener = supabase
      .channel("general_broadcasts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: "channel=eq.general" }, async (payload) => {
        if (payload.new.center_id) return;
        const clear = await decryptMessage(payload.new.message, { kind: "community", channel: "general" });
        setActiveBroadcast({ id: payload.new.id, message: clear });
        setBroadcastExpanded(false);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && poll) { clearInterval(poll); poll = null; }
        else if ((status === "CLOSED" || status === "CHANNEL_ERROR") && !poll && alive) {
          poll = setInterval(loadLatestBroadcast, 5000);
        }
      });

    return () => {
      alive = false;
      if (listener) supabase.removeChannel(listener);
      if (poll) clearInterval(poll);
    };
  }, []);

  const dismissBroadcast = async () => {
    if (activeBroadcast && user) {
      await supabase.from("profiles").update({ general_last_seen_msg_id: activeBroadcast.id }).eq("id", user.id);
    }
    setActiveBroadcast(null);
    setBroadcastExpanded(false);
  };

  const dismissDirectMsg = async () => {
    if (activeDirectMsg) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", activeDirectMsg.id);
    }
    setActiveDirectMsg(null);
    setDirectMsgExpanded(false);
  };

  // -------------------- Auth + profil + notifications --------------------
  useEffect(() => {
    const checkUserAndSubscription = async () => {
      const access = await loadStudentAccess();
      if (!access?.session) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const { session, profile } = access;

      if (isCenterStaff(profile)) {
        router.replace(CENTER_HOME);
        return;
      }

      setUser(session.user);
      supabase.from("profiles").update({ current_activity: "Tableau de Bord 🏠" }).eq("id", session.user.id);
      logClientActivity("Ouverture dashboard", "Tableau de bord etudiant consulte");

      const [{ data: notifs }, { data: pinned }] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("feedback").select("prenom, rating, comment").eq("pinned", true).order("created_at", { ascending: false }).limit(3),
      ]);

      if (notifs) setNotifications(notifs);
      if (pinned) setPinnedFeedbacks(pinned);

      let poll: NodeJS.Timeout | null = null;
      let alive = true;
      notifChannelRef.current = supabase
        .channel(`notifications:${session.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, (payload) => {
          const row = { ...(payload.new as any), is_read: (payload.new as any).is_read ?? false };
          setNotifications((prev) => [row, ...prev].slice(0, 30));
          setActiveDirectMsg({ id: row.id, message: row.message });
          setDirectMsgExpanded(false);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && poll) { clearInterval(poll); poll = null; }
          else if ((status === "CLOSED" || status === "CHANNEL_ERROR") && !poll && alive) {
            poll = setInterval(async () => {
              const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(30);
              if (data) setNotifications(data);
            }, 5000);
          }
        });

      setLoading(false);
      return () => {
        alive = false;
        if (notifChannelRef.current) supabase.removeChannel(notifChannelRef.current);
        if (poll) clearInterval(poll);
      };
    };
    checkUserAndSubscription();
  }, [router]);

  // -------------------- Notif in-app : examen complet débloqué --------------------
  // Le déblocage est calculé (J+20 après activation, puis un cycle par mois).
  // À l'ouverture du dashboard, si le mode vient de s'ouvrir, on crée une notif
  // in-app une seule fois par cycle (dédup localStorage + vérif base multi-appareils).
  useEffect(() => {
    if (limitData.loading || !user || isPluriannual) return;
    const access = limitData.examCompletAccess;
    if (limitData.isAdmin || !access?.canUse || access.entitledCount < 1 || !access.firstUnlockAt) return;

    const uid = user.id;
    const cycle = access.entitledCount;
    const lsKey = `iag_examcomplet_notif_${uid}_${cycle}`;
    if (localStorage.getItem(lsKey)) return;

    const firstUnlock = new Date(access.firstUnlockAt);
    const cycleStart = cycle <= 1 ? firstUnlock : addCalendarMonths(firstUnlock, cycle - 1);

    (async () => {
      // Anti-doublon multi-appareils : notif du cycle déjà présente en base ?
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("message", EXAM_COMPLET_UNLOCK_MSG)
        .gte("created_at", cycleStart.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        localStorage.setItem(lsKey, "1");
        return;
      }

      const { error } = await supabase.from("notifications").insert({
        user_id: uid,
        message: EXAM_COMPLET_UNLOCK_MSG,
      });
      if (!error) localStorage.setItem(lsKey, "1");
    })();
  }, [limitData.loading, limitData.isAdmin, limitData.examCompletAccess, user, isPluriannual]);

  // -------------------- Notif in-app : examen complet bientôt débloqué (J-3) --------------------
  // Rappel dans les 3 jours qui précèdent le déblocage (1er déblocage J+20 ou
  // prochain cycle mensuel). Une seule notif par cycle.
  useEffect(() => {
    if (limitData.loading || !user || limitData.isAdmin || isPluriannual) return;
    const access = limitData.examCompletAccess;
    if (!access) return;

    // Date de déblocage attendue : 1er déblocage, sinon prochain cycle si crédits épuisés.
    let upcoming: Date | null = null;
    if (access.daysUntilFirstUnlock != null && access.firstUnlockAt) {
      upcoming = new Date(access.firstUnlockAt);
    } else if (access.creditsLeft <= 0 && access.nextCycleAt) {
      upcoming = new Date(access.nextCycleAt);
    }
    if (!upcoming) return;

    const daysUntil = Math.ceil((upcoming.getTime() - Date.now()) / 86400000);
    if (daysUntil < 1 || daysUntil > 3) return; // uniquement dans les 3 jours qui précèdent

    const uid = user.id;
    const dateLabel = upcoming.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const msg = `⏳ Votre examen complet TCF sera débloqué le ${dateLabel}. Plus que quelques jours, préparez-vous !`;
    const lsKey = `iag_examcomplet_pre_${uid}_${localDateKey(upcoming)}`;
    if (localStorage.getItem(lsKey)) return;

    (async () => {
      // Anti-doublon multi-appareils : rappel de ce cycle déjà présent en base ?
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("message", msg)
        .limit(1);

      if (existing && existing.length > 0) {
        localStorage.setItem(lsKey, "1");
        return;
      }

      const { error } = await supabase.from("notifications").insert({
        user_id: uid,
        message: msg,
      });
      if (!error) localStorage.setItem(lsKey, "1");
    })();
  }, [limitData.loading, limitData.isAdmin, limitData.examCompletAccess, user, isPluriannual]);

  // -------------------- Notif in-app : expression écrite ouverte (centre) --------------------
  // Étudiants de centre : l'EE ouvre chaque mercredi et samedi. À l'ouverture du
  // dashboard un de ces jours, on crée une notif in-app une seule fois par jour.
  useEffect(() => {
    if (limitData.loading || !user || isPluriannual) return;
    if (!limitData.isCenterStudent || !limitData.isEeOpenDayForCenter || !limitData.canSimulate) return;

    const uid = user.id;
    const dayKey = localDateKey();
    const lsKey = `iag_ee_open_notif_${uid}_${dayKey}`;
    if (localStorage.getItem(lsKey)) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    (async () => {
      // Anti-doublon multi-appareils : notif du jour déjà présente en base ?
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("message", EE_OPEN_MSG)
        .gte("created_at", startOfDay.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        localStorage.setItem(lsKey, "1");
        return;
      }

      const { error } = await supabase.from("notifications").insert({
        user_id: uid,
        message: EE_OPEN_MSG,
      });
      if (!error) localStorage.setItem(lsKey, "1");
    })();
  }, [limitData.loading, limitData.isCenterStudent, limitData.isEeOpenDayForCenter, limitData.canSimulate, user, isPluriannual]);

  // -------------------- Messages privés / support non lus --------------------
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const [{ count: priv }, { count: sup }] = await Promise.all([
        supabase.from("private_messages").select("id", { count: "exact", head: true }).eq("to_user_id", user.id).is("read_at", null),
        supabase.from("support_messages").select("id", { count: "exact", head: true }).eq("to_user_id", user.id).is("read_at", null),
      ]);
      setPrivateUnreadCount(priv || 0);
      setSupportUnreadCount(sup || 0);
    };
    fetchUnread();
    const c1 = supabase.channel(`dashboard_private:${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "private_messages", filter: `to_user_id=eq.${user.id}` }, fetchUnread).subscribe();
    const c2 = supabase.channel(`dashboard_support:${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `to_user_id=eq.${user.id}` }, fetchUnread).subscribe();
    return () => { supabase.removeChannel(c1); supabase.removeChannel(c2); };
  }, [user?.id]);

  // -------------------- Widgets : notes / devoirs / discipline / lives / todo --------------------
  useEffect(() => {
    if (!user?.id) return;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekIso = startOfWeek.toISOString();

    const fetchWidgets = async () => {
      setWidgetsLoading(true);

      if (!isPluriannual) {
        // 1. Mes notes — examens complets TCF uniquement
        const examSessionsRes = await supabase
          .from("exam_sessions")
          .select("id, finished_at, ce_result, co_result, ee_result, eo_result")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("finished_at", weekIso)
          .order("finished_at", { ascending: false })
          .limit(10);

        if (!examSessionsRes.error && examSessionsRes.data) {
          const entries: GradeEntry[] = [];
          for (const s of examSessionsRes.data as any[]) {
            const date = s.finished_at;
            const ce = extractNote(s.ce_result);
            if (ce) entries.push({ id: `${s.id}-ce`, subject: "Compréhension Écrite", score: ce.score, max: ce.max, date });
            const co = extractNote(s.co_result);
            if (co) entries.push({ id: `${s.id}-co`, subject: "Compréhension Orale", score: co.score, max: co.max, date });
            const ee = extractNote(s.ee_result);
            if (ee) entries.push({ id: `${s.id}-ee`, subject: "Expression Écrite", score: ee.score, max: ee.max, date });
            const eo = extractEONote(s.eo_result);
            if (eo) entries.push({ id: `${s.id}-eo`, subject: "Expression Orale", score: eo.score, max: eo.max, date });
          }
          entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setGrades(entries.slice(0, 5));
        }
      } else {
        setGrades([]);
      }

      // 2. Cours et devoirs en attente
      //    - devoirs : missions / mission_submissions
      //    - cours centre : /api/student/courses (mêmes règles que Cours et Quiz)
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", user.id).maybeSingle();
      const missionQuery = supabase.from("missions").select("id, title, due_at, center_id, target_user_id");
      const scoped = profile?.center_id
        ? missionQuery.eq("center_id", profile.center_id).or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
        : missionQuery.is("center_id", null);
      const [{ data: allMissions }, { data: submitted }, { data: { session: courseSession } }] = await Promise.all([
        scoped,
        supabase.from("mission_submissions").select("mission_id, created_at").eq("user_id", user.id),
        supabase.auth.getSession(),
      ]);
      const submittedIds = new Set((submitted || []).map((s: any) => s.mission_id));
      const pending = (allMissions || [])
        .filter((m: any) => !submittedIds.has(m.id))
        .map((m: any) => ({
          id: `mission-${m.id}`,
          title: m.title || "Devoir",
          subtitle: `Devoir · ${formatShortDate(m.due_at)}`,
          href: `/tcf-canada/missions?mission=${m.id}`,
          kind: "mission" as const,
        }));

      let centerCourses: PendingAction[] = [];
      if (courseSession?.access_token) {
        try {
          const res = await fetch("/api/student/courses", {
            headers: { Authorization: `Bearer ${courseSession.access_token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const seenCourses = readSeenCenterCourses();
            centerCourses = (json.courses || [])
              .filter((course: any) => {
                const courseId = String(course.id);
                const courseVersion = String(course.updated_at || "seen");
                return seenCourses[courseId] !== courseVersion;
              })
              .map((course: any) => {
                const courseId = String(course.id);
                const courseVersion = String(course.updated_at || "seen");
                return {
                  id: `course-${courseId}`,
                  title: course.title || "Cours du centre",
                  subtitle: course.lesson_count
                    ? `Cours du centre · ${course.lesson_count} leçon${course.lesson_count > 1 ? "s" : ""}`
                    : "Cours du centre",
                  href: `/tcf-canada/cours?tab=centre&course=${courseId}`,
                  kind: "course" as const,
                  courseId,
                  courseVersion,
                };
              });
          }
        } catch (e) {
          console.warn("Chargement cours centre dashboard:", e);
        }
      }

      setPendingActions([...pending, ...centerCourses]);

      // 3. Sessions live à venir
      const liveItems: LiveSession[] = [];
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const accessToken = authSession?.access_token;

      const { data: limitProfile } = await supabase
        .from("profiles")
        .select("role, coaching_total, center_id")
        .eq("id", user.id)
        .maybeSingle();

      const hasCoachingAccess = limitProfile?.role === "admin" || (limitProfile?.coaching_total || 0) > 0;
      const centerId = limitProfile?.center_id as string | null;

      // Centre : séances collectives du planning + lives staff
      if (centerId && accessToken) {
        try {
          const collRes = await fetch("/api/coaching/collective-sessions", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (collRes.ok) {
            const collJson = await collRes.json();
            for (const c of collJson.sessions || []) {
              const isLive = (c as { kind?: string }).kind === "live";
              const kindLabel =
                (c as { kind_label?: string }).kind_label ||
                (isLive ? "Session Live" : c.mode === "en_ligne" ? "Cours en ligne" : "Séance");
              liveItems.push({
                id: `coll-${c.slot_id}-${c.session_date}`,
                title: c.title || kindLabel,
                type: isLive ? "live-centre" : "coaching-groupe",
                scheduled_at: c.scheduled_at,
                // Visio étudiant désactivée : toujours renvoyer vers la page coaching
                href: "/dashboard/coaching",
                modeLabel: kindLabel,
              });
            }
          }
        } catch {
          // silencieux
        }

        const { data: centerLives, error: livesErr } = await supabase
          .from("live_sessions")
          .select("id, title, scheduled_at, status, meeting_url, center_id")
          .eq("center_id", centerId)
          .in("status", ["scheduled", "live"])
          .gte("scheduled_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(5);

        if (!livesErr) {
          for (const live of centerLives || []) {
            liveItems.push({
              id: `live-${live.id}`,
              title: live.title || "Live du centre",
              type: "live-centre",
              scheduled_at: live.scheduled_at,
              href: "/dashboard/coaching",
              modeLabel: "Live",
            });
          }
        }
      }

      // B2C : masterclass / coaching de groupe NEXA
      if (hasCoachingAccess && !centerId) {
        const todayStr = new Date().toLocaleDateString("en-CA");
        const { data: groupSessions, error: groupErr } = await supabase
          .from("group_coaching_sessions")
          .select("id, title, session_date, session_time, status")
          .eq("status", "scheduled")
          .is("center_id", null)
          .gte("session_date", todayStr)
          .order("session_date", { ascending: true })
          .order("session_time", { ascending: true })
          .limit(5);
        if (!groupErr && groupSessions) {
          for (const g of groupSessions) {
            liveItems.push({
              id: g.id,
              title: g.title,
              type: "coaching-groupe",
              scheduled_at: new Date(`${g.session_date}T${g.session_time.slice(0, 5)}:00+01:00`).toISOString(),
              href: `/dashboard/coaching/room/group/${g.id}`,
              modeLabel: "Groupe",
            });
          }
        }
      }

      // Coaching individuel (tous profils avec token)
      if (accessToken && (hasCoachingAccess || centerId)) {
        try {
          const res = await fetch("/api/coaching/appointments", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const json = await res.json();
            const appts = (json.appointments || []).filter(
              (a: any) =>
                ["pending", "confirmed", "reporte"].includes(a.status) &&
                new Date(a.scheduled_at).getTime() + 30 * 60 * 1000 > Date.now()
            );
            for (const appt of appts.slice(0, 3)) {
              liveItems.push({
                id: `appt-${appt.id}`,
                title:
                  appt.status === "confirmed"
                    ? "Coaching individuel (confirmé)"
                    : "Coaching individuel (en attente)",
                type: "coaching-individuel",
                scheduled_at: appt.scheduled_at,
                href: "/dashboard/coaching",
                modeLabel: "Individuel",
              });
            }
          }
        } catch {
          // silencieux
        }
      }

      liveItems.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      setUpcomingLives(liveItems.slice(0, 5));

      // 4. Discipline
      //    - homeworkSubmitted : réel (mission_submissions de la semaine)
      //    - activeDays : réel — table `client_activity_logs` (route
      //      /api/activity) + `simulator_logs`, combinées pour capter les
      //      jours où l'étudiant a soit ouvert une page suivie, soit fait
      //      une simulation. NB : la lecture passe par le client Supabase
      //      directement (pas par /api/activity dont le GET est réservé
      //      aux admins) — nécessite une policy RLS du type
      //      "auth.uid() = user_id" en SELECT sur ces deux tables. Si elle
      //      n'existe pas encore, la requête échoue silencieusement et le
      //      compteur reste "—" plutôt que d'afficher un faux 0.
      //    - liveAttendance : toujours en attente de ta décision
      //      (Option A : rendez-vous confirmés passés / Option B : nouvel
      //      événement "a rejoint" dans la salle de visio).
      const submittedThisWeek = (submitted || []).filter((s: any) => !s.created_at || s.created_at >= weekIso).length;

      let activeDaysCount: number | null = null;
      const [activityLogsRes, simulatorLogsRes] = await Promise.all([
        supabase.from("client_activity_logs").select("created_at").eq("user_id", user.id).gte("created_at", weekIso),
        supabase.from("simulator_logs").select("created_at").eq("user_id", user.id).gte("created_at", weekIso),
      ]);
      if (!activityLogsRes.error && !simulatorLogsRes.error) {
        const days = new Set<string>();
        for (const row of [...(activityLogsRes.data || []), ...(simulatorLogsRes.data || [])]) {
          days.add(new Date((row as any).created_at).toLocaleDateString("en-CA")); // YYYY-MM-DD
        }
        activeDaysCount = Math.min(7, days.size);
      } else if (activityLogsRes.error) {
        console.warn("client_activity_logs non lisible (policy RLS manquante ?) :", activityLogsRes.error.message);
      }

      setDiscipline({
        activeDays: activeDaysCount,
        liveAttendance: null,
        homeworkSubmitted: submittedThisWeek,
      });

      // 5. Todo-list de la semaine — fonctionnalité réellement nouvelle,
      // nécessite la table `student_todos` (voir SQL fourni à part).
      const todosRes = await supabase
        .from("student_todos")
        .select("id, content, is_done")
        .eq("user_id", user.id)
        .gte("created_at", weekIso)
        .order("created_at", { ascending: true });
      if (!todosRes.error && todosRes.data) setTodos(todosRes.data as TodoItem[]);

      setWidgetsLoading(false);
    };

    fetchWidgets();
  }, [user?.id, isPluriannual]);

  // -------------------- Actions Todo-list --------------------
  const addTodo = async () => {
    const content = newTodo.trim();
    if (!content || !user?.id) return;
    setNewTodo("");
    const tempId = `temp-${Date.now()}`;
    setTodos((prev) => [...prev, { id: tempId, content, is_done: false }]);
    const { data, error } = await supabase
      .from("student_todos")
      .insert({ user_id: user.id, content, is_done: false })
      .select("id, content, is_done")
      .single();
    if (!error && data) {
      setTodos((prev) => prev.map((t) => (t.id === tempId ? (data as TodoItem) : t)));
    }
  };

  const toggleTodo = async (id: string, current: boolean) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, is_done: !current } : t)));
    await supabase.from("student_todos").update({ is_done: !current }).eq("id", id);
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("student_todos").delete().eq("id", id);
  };

  useEffect(() => {
    const savedProgress = localStorage.getItem("tcf_cours_progress");
    void savedProgress; // conservé si utilisé ailleurs ; plus affiché ici (carte TCF retirée)
  }, []);

  const toggleNotifications = async () => {
    const opening = !showNotifs;
    setShowNotifs(opening);
    const unread = notifications.filter((n) => !n.is_read);
    if (opening && user?.id && unread.length > 0) {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const openPrivateMessagesFromBell = () => {
    setShowNotifs(false);
    setPrivateUnreadCount(0);
    if (user?.id) {
      void supabase
        .from("private_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("to_user_id", user.id)
        .is("read_at", null);
    }
    router.push("/communaute?channel=messages");
  };

  const openSupportFromBell = () => {
    setShowNotifs(false);
    setSupportUnreadCount(0);
    if (user?.id) {
      void supabase
        .from("support_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("to_user_id", user.id)
        .is("read_at", null);
    }
    router.push("/support");
  };

  const notificationUnreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadCount = notificationUnreadCount + privateUnreadCount + supportUnreadCount;

  const displayName = useMemo(() => {
    const meta = user?.user_metadata ?? {};
    return meta.name || meta.full_name || meta.nom || meta.prenom || (user?.email ? user.email.split("@")[0] : null) || "Champion";
  }, [user]);

  const handleCallSupport = () => { setShowSupportMenu(false); window.location.href = "tel:+237683375069"; };
  const handleOpenSupportChat = () => { setShowSupportMenu(false); router.push("/support"); };
  const handleSupportClick = () => {
    if (isAdmin) { setShowSupportMenu(false); router.push("/admin?tab=support"); return; }
    setShowSupportMenu((p) => !p);
  };

  const formatShortDate = (iso: string | null) => {
    if (!iso) return "Sans échéance";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };
  const formatLiveDate = (iso: string) => {
    const d = new Date(iso);
    const day = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${day} · ${time}`;
  };

  // ============================================================
  // ÉCRAN DE CHARGEMENT
  // ============================================================
  if (loading) {
    return <StudentRouteSkeleton contentOnly variant="dashboard" />;
  }

  return (
    <>
      <FeedbackPopup />

      <div className="min-h-[100dvh] bg-[#FFFBF7] pb-24 font-sans text-neutral-900 overflow-x-hidden">
        {/* ===================== BANNIÈRES ===================== */}
        <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {activeDirectMsg && (
              <motion.div key="direct" initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="pointer-events-auto">
                <div className="max-w-2xl mx-auto">
                  <div
                    className={`text-white rounded-3xl shadow-2xl overflow-hidden ${activeDirectMsg.message.toLowerCase().includes("coaching") ? "cursor-pointer hover:brightness-110 transition-all" : ""}`}
                    style={{ backgroundColor: BRAND.blue }}
                    onClick={() => {
                      if (activeDirectMsg.message.toLowerCase().includes("coaching")) {
                        dismissDirectMsg();
                        router.push("/dashboard/coaching");
                      }
                    }}
                  >
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: BRAND.orange }}>
                        <MessageCircleQuestion size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/60 mb-1 font-display">
                          Message privé — Coach NEXA
                          {activeDirectMsg.message.toLowerCase().includes("coaching") && <span className="ml-2 text-orange-300">· Voir ma session →</span>}
                        </p>
                        <p className="text-sm font-semibold text-white/90 leading-relaxed">{activeDirectMsg.message}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); dismissDirectMsg(); }} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors shrink-0">
                        <X size={16} className="text-white/70" />
                      </button>
                    </div>
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${BRAND.orange}, #FBBF24, ${BRAND.orange})` }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeBroadcast && (
              <motion.div key="broadcast" initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="pointer-events-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-slate-900 text-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="flex items-start gap-4 p-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: BRAND.orange }}>
                        <Megaphone size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400 mb-1 font-display">Annonce NEXA</p>
                        <p className={`text-sm font-semibold text-white/90 leading-relaxed ${!broadcastExpanded ? "line-clamp-2" : ""}`}>{activeBroadcast.message}</p>
                        {activeBroadcast.message.length > 100 && !broadcastExpanded && (
                          <button onClick={() => setBroadcastExpanded(true)} className="text-[10px] font-bold text-orange-400 hover:text-orange-300 mt-1 transition-colors">Voir plus ↓</button>
                        )}
                      </div>
                      <button onClick={dismissBroadcast} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors shrink-0"><X size={16} className="text-white/70" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPushBanner && (
              <motion.div key="push" initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="pointer-events-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-amber-950 text-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0"><Bell size={18} className="text-white" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 mb-0.5 font-display">NEXA</p>
                        <p className="text-sm font-semibold text-white/90 leading-snug">{subscribeError || "Recevez vos rappels et messages directement sur votre appareil."}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={async () => { const ok = await pushSubscribe(); if (ok) setPushBannerDismissed(true); }} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl transition-colors">Autoriser</button>
                        <button onClick={dismissPushBanner} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"><X size={16} className="text-white/70" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===================== EN-TÊTE ===================== */}
        <header className={`sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 transition-all duration-300 ${scrolled ? "py-1.5 shadow-sm shadow-orange-100/40" : "py-2.5 md:py-3 xl:py-4"}`}>
          <div className="nexa-student-shell flex items-center justify-between">
            <div>
              <span className="font-bold uppercase tracking-widest text-[8px] md:text-[9px] xl:text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: BRAND.orange, backgroundColor: "#FFF3E8" }}>
                Espace Étudiant
              </span>
              <h1 className={`font-display font-black tracking-tight mt-0.5 transition-all duration-300 ${scrolled ? "text-sm md:text-base xl:text-lg" : "text-base md:text-lg xl:text-xl 2xl:text-2xl"}`} style={{ color: BRAND.blue }}>
                {greeting}, {displayName}
              </h1>
              {!scrolled && <p className="text-[10px] md:text-xs xl:text-sm text-neutral-400 font-medium mt-0.5">Voici votre semaine en un coup d'œil.</p>}
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Support */}
              <div className="relative">
                <button onClick={handleSupportClick} title="Support" className="px-3 py-2 h-10 md:h-12 rounded-full flex items-center gap-2 border transition-colors shadow-sm" style={{ backgroundColor: "#EEF2FF", borderColor: "#DCE3FF" }}>
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5" style={{ color: BRAND.blue }} />
                  <span className="text-xs md:text-sm font-semibold hidden sm:inline" style={{ color: BRAND.blue }}>Support</span>
                </button>

                <AnimatePresence>
                  {showSupportMenu && (
                    <>
                      <div className="fixed inset-0 z-40 hidden md:block" onClick={() => setShowSupportMenu(false)} />
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.95 }} className="hidden md:block absolute right-0 mt-3 w-[min(280px,calc(100vw-2rem))] bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden z-50 origin-top-right">
                        <div className="p-3 border-b border-neutral-100 bg-neutral-50/60">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-display">Service client</p>
                          <p className="text-sm font-bold text-neutral-900 mt-0.5">Comment voulez-vous nous joindre ?</p>
                        </div>
                        <div className="p-2">
                          <button onClick={handleCallSupport} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-50 transition-colors text-left group">
                            <span className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center"><Phone className="w-5 h-5 text-emerald-600" /></span>
                            <span><span className="block text-sm font-black text-neutral-900">Appeler le service client</span><span className="block text-xs font-medium text-neutral-400">Assistance par téléphone</span></span>
                          </button>
                          <button onClick={handleOpenSupportChat} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 transition-colors text-left group">
                            <span className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-blue-600" /></span>
                            <span><span className="block text-sm font-black text-neutral-900">Écrire au service client</span><span className="block text-xs font-medium text-neutral-400">Ouvre le chat avec un agent</span></span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Notifications */}
              <div className="relative">
                <button onClick={toggleNotifications} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center border border-neutral-200 hover:bg-neutral-50 transition-colors shadow-sm relative">
                  <Bell className="w-5 h-5 md:w-6 md:h-6 text-neutral-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifs && (
                    <>
                      <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowNotifs(false)} />
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 mt-3 w-[min(320px,calc(100vw-2rem))] md:w-80 bg-white border border-neutral-200 rounded-3xl shadow-2xl overflow-hidden z-50 origin-top-right">
                        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                          <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-900 font-display">Notifications</h3>
                          <button onClick={() => setShowNotifs(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-white rounded-full shadow-sm border border-neutral-200"><X size={14} /></button>
                        </div>
                        <div className="max-h-[60vh] md:max-h-80 overflow-y-auto p-2">
                          {privateUnreadCount > 0 && (
                            <button onClick={openPrivateMessagesFromBell} className="w-full p-4 rounded-2xl hover:bg-orange-50 transition-colors text-left border-b border-neutral-50 flex items-center gap-3">
                              <span className="w-9 h-9 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0"><MessageCircle className="w-4 h-4 text-orange-600" /></span>
                              <span className="flex-1 min-w-0"><span className="block text-xs font-black text-neutral-900">Messages privés</span><span className="block text-[10px] font-semibold text-neutral-400">{privateUnreadCount} non lu(s)</span></span>
                            </button>
                          )}
                          {supportUnreadCount > 0 && (
                            <button onClick={openSupportFromBell} className="w-full p-4 rounded-2xl hover:bg-blue-50 transition-colors text-left border-b border-neutral-50 flex items-center gap-3">
                              <span className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0"><MessageCircleQuestion className="w-4 h-4 text-blue-600" /></span>
                              <span className="flex-1 min-w-0"><span className="block text-xs font-black text-neutral-900">Support client</span><span className="block text-[10px] font-semibold text-neutral-400">{supportUnreadCount} réponse(s) non lue(s)</span></span>
                            </button>
                          )}
                          {notifications.length === 0 && privateUnreadCount === 0 && supportUnreadCount === 0 ? (
                            <div className="p-8 text-center text-xs font-bold text-neutral-400 uppercase tracking-widest font-display">Aucun message</div>
                          ) : (
                            notifications.map((notif) => (
                              <div key={notif.id} className="p-4 rounded-2xl transition-colors border-b border-neutral-50 last:border-none hover:bg-neutral-50">
                                <p className="text-xs font-medium text-neutral-800 leading-snug">{notif.message}</p>
                                <p className="text-[10px] text-neutral-400 font-mono mt-1">{new Date(notif.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {/* Bouton profil retiré : déjà présent dans la Sidebar */}
            </div>
          </div>
        </header>

        {/* Sheet support mobile */}
        <AnimatePresence>
          {showSupportMenu && !isAdmin && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/35 md:hidden" onClick={() => setShowSupportMenu(false)} />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="fixed inset-x-0 bottom-0 z-[100] rounded-t-[2rem] border border-blue-100 bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl md:hidden">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-200" />
                <h2 className="mb-5 text-center text-xl font-display font-black" style={{ color: BRAND.blue }}>Service client</h2>
                <div className="space-y-3">
                  <button onClick={handleCallSupport} className="flex w-full items-center gap-4 rounded-2xl border-2 border-blue-100 bg-white p-4 text-left shadow-sm active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Phone className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-base font-black text-neutral-950">Appeler le service client</span><span className="block text-xs font-semibold text-neutral-400">Assistance par téléphone</span></span>
                  </button>
                  <button onClick={handleOpenSupportChat} className="flex w-full items-center gap-4 rounded-2xl border-2 border-blue-100 bg-white p-4 text-left shadow-sm active:scale-[0.99]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><MessageCircle className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-base font-black text-neutral-950">Écrire au support</span><span className="block text-xs font-semibold text-neutral-400">Ouvre le chat avec un agent</span></span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ===================== CONTENU PRINCIPAL ===================== */}
        <div className="nexa-student-shell pt-6 xl:pt-8 2xl:pt-10">
          {(activeBroadcast || activeDirectMsg) && <div className={(activeBroadcast && activeDirectMsg) ? "h-40 md:h-36" : "h-20 md:h-16"} />}

          {/* ============ PACK D'ENTRAÎNEMENT (TCF / B2C uniquement) ============ */}
          {showTcfPacks && !centerCtxLoading && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 ml-1 flex-wrap gap-2">
              <h3 className="font-display font-black text-lg md:text-xl xl:text-2xl 2xl:text-3xl tracking-tight" style={{ color: BRAND.blue }}>
                Pack d'entraînement
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: BRAND.orange, backgroundColor: "#FFF3E8" }}>
                {activeProgramLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5 xl:gap-5 2xl:gap-6">
              <a href="/tcf-canada/comprehension/ecrit" className="relative bg-white rounded-2xl border border-neutral-200 p-3 md:p-4 xl:p-5 2xl:p-6 flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-200 group">
                {isTrial && <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: "#0E9F6E", backgroundColor: "#EAFBF2" }}>Essai</span>}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform" style={{ backgroundColor: "#FFF3E8" }}>
                  <ScrollText className="w-4.5 h-4.5" style={{ color: BRAND.orange }} />
                </div>
                <h4 className="font-display font-black text-[11px] md:text-xs uppercase tracking-tight leading-tight mb-0.5" style={{ color: BRAND.blue }}>Compréhension Écrite</h4>
                <p className="text-[9px] md:text-[10px] text-neutral-400 font-medium leading-snug">{isTrial ? "1 série gratuite" : "Lecture & analyse"}</p>
              </a>
              <a href="/tcf-canada/comprehension/orale" className="relative bg-white rounded-2xl border border-neutral-200 p-3 md:p-4 flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-200 group">
                {isTrial && <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: "#0E9F6E", backgroundColor: "#EAFBF2" }}>Essai</span>}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform" style={{ backgroundColor: "#FFF3E8" }}>
                  <Headphones className="w-4.5 h-4.5" style={{ color: BRAND.orange }} />
                </div>
                <h4 className="font-display font-black text-[11px] md:text-xs uppercase tracking-tight leading-tight mb-0.5" style={{ color: BRAND.blue }}>Compréhension Orale</h4>
                <p className="text-[9px] md:text-[10px] text-neutral-400 font-medium leading-snug">{isTrial ? "1 série gratuite" : "Écoute & audio"}</p>
              </a>
              <a href="/tcf-canada/expression-ecrite" className="relative bg-white rounded-2xl border border-neutral-200 p-3 md:p-4 flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-200 group">
                {isTrial && <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: "#0E9F6E", backgroundColor: "#EAFBF2" }}>Essai</span>}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform" style={{ backgroundColor: "#FFF3E8" }}>
                  <PenTool className="w-4.5 h-4.5" style={{ color: BRAND.orange }} />
                </div>
                <h4 className="font-display font-black text-[11px] md:text-xs uppercase tracking-tight leading-tight mb-0.5" style={{ color: BRAND.blue }}>Expression Écrite</h4>
                <p className="text-[9px] md:text-[10px] text-neutral-400 font-medium leading-snug">{isTrial ? "2 essais avec IA" : "Mode Zen"}</p>
              </a>
              {isTrial ? (
                <button onClick={() => router.push("/paywall")} className="relative bg-white rounded-2xl border border-neutral-200 p-3 md:p-4 flex flex-col text-left hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-200 group">
                  <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: BRAND.orange, backgroundColor: "#FFF3E8" }}><Star size={7} fill="currentColor" /> Pro</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ backgroundColor: "#FFF3E8" }}>
                    <Mic className="w-4.5 h-4.5" style={{ color: BRAND.orange }} />
                  </div>
                  <h4 className="font-display font-black text-[11px] md:text-xs uppercase tracking-tight leading-tight mb-0.5" style={{ color: BRAND.blue }}>Expression Orale</h4>
                  <p className="text-[9px] md:text-[10px] font-semibold leading-snug" style={{ color: BRAND.orange }}>Débloquer →</p>
                </button>
              ) : (
                <a href="/tcf-canada/expression-orale" className="relative bg-white rounded-2xl border border-neutral-200 p-3 md:p-4 flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform" style={{ backgroundColor: "#FFF3E8" }}>
                    <Mic className="w-4.5 h-4.5" style={{ color: BRAND.orange }} />
                  </div>
                  <h4 className="font-display font-black text-[11px] md:text-xs uppercase tracking-tight leading-tight mb-0.5" style={{ color: BRAND.blue }}>Expression Orale</h4>
                  <p className="text-[9px] md:text-[10px] text-neutral-400 font-medium leading-snug">Coach vocal IA</p>
                </a>
              )}
            </div>
          </section>
          )}

          {isPluriannual && (
          <section className="mb-8">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Votre parcours</p>
              <h3 className="mt-1 font-display font-black text-lg md:text-xl" style={{ color: BRAND.blue }}>
                Formation pluri-annuelle
              </h3>
              <p className="mt-2 text-sm font-medium text-neutral-500 leading-relaxed">
                Suivez vos notes, devoirs et sessions live depuis cet espace. Les packs TCF ne s&apos;appliquent pas à votre centre.
              </p>
            </div>
          </section>
          )}

          {/* ============ GRILLE D'INFORMATIONS : Notes + Devoirs ============ */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 xl:gap-7 2xl:gap-8 mb-6">
            {/* NOTES */}
            <div className="bg-white rounded-[1.75rem] border border-neutral-200 shadow-sm p-5 md:p-6 xl:p-7 2xl:p-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-black text-sm md:text-base xl:text-lg 2xl:text-xl flex items-center gap-2" style={{ color: BRAND.blue }}>
                  <NotebookPen className="w-4 h-4" style={{ color: BRAND.orange }} />
                  {isPluriannual ? "Mes notes" : "Mes notes de la semaine"}
                </h3>
                {!isPluriannual && (
                <a href="/tcf-canada/simulateur/examen" className="text-[11px] font-bold text-neutral-400 hover:text-orange-500 transition-colors">Tout voir →</a>
                )}
              </div>
              {isPluriannual ? (
                <>
                  <p className="text-[10px] text-neutral-400 font-medium mb-4">Notes de vos cours et évaluations du centre.</p>
                  {widgetsLoading ? (
                    <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
                  ) : (
                    <p className="text-sm text-neutral-400 font-medium py-6 text-center">
                      Consultez vos notes dans <a href="/tcf-canada/cours?tab=notes" className="font-bold text-orange-500 hover:underline">Mes cours → Notes</a>.
                    </p>
                  )}
                </>
              ) : (
                <>
              <p className="text-[10px] text-neutral-400 font-medium mb-4">Résultats des examens complets uniquement, pour l'instant.</p>
              {widgetsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
              ) : grades.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-6 text-center">Pas encore de résultat d'examen complet cette semaine.</p>
              ) : (
                <ul className={`space-y-2 ${pendingActions.length > 4 ? "max-h-[18rem] overflow-y-auto pr-1" : ""}`}>
                  {grades.map((g) => {
                    const pct = g.max > 0 ? Math.round((g.score / g.max) * 100) : 0;
                    const good = pct >= 50;
                    return (
                      <li key={g.id} className="flex items-center justify-between p-3 rounded-2xl border" style={{ borderColor: good ? "#D9F2E6" : "#FCE3D6", backgroundColor: good ? "#F2FBF7" : "#FFF8F2" }}>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 truncate">{g.subject}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">{new Date(g.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                        </div>
                        <span className="text-sm font-black shrink-0 ml-2" style={{ color: good ? "#0E9F6E" : BRAND.orange }}>{g.score}/{g.max}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
                </>
              )}
            </div>

            {/* COURS ET DEVOIRS EN ATTENTE */}
            <div className="bg-white rounded-[1.75rem] border border-neutral-200 shadow-sm p-5 md:p-6 xl:p-7 2xl:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-sm md:text-base xl:text-lg 2xl:text-xl flex items-center gap-2" style={{ color: BRAND.blue }}>
                  <FileWarning className="w-4 h-4 xl:w-5 xl:h-5" style={{ color: BRAND.orange }} /> Cours et devoirs en attente
                </h3>
                <a
                  href={isPluriannual ? "/tcf-canada/cours" : "/tcf-canada/cours?tab=centre"}
                  className="text-[11px] font-bold text-neutral-400 hover:text-orange-500 transition-colors"
                >
                  Tout voir →
                </a>
              </div>
              {widgetsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
              ) : pendingActions.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-6 text-center">Tout est à jour, bravo ! 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {pendingActions.map((h) => (
                    <li key={h.id}>
                      <a
                        href={h.href}
                        onClick={() => {
                          if (h.kind === "course" && h.courseId) {
                            markCenterCourseSeen(h.courseId, h.courseVersion);
                            setPendingActions((prev) => prev.filter((item) => item.id !== h.id));
                          }
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl border border-orange-100 bg-orange-50/50 hover:bg-orange-100/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 truncate">{h.title}</p>
                          <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: BRAND.orange }}>
                            {h.kind === "course" ? <BookOpen size={10} /> : <CalendarClock size={10} />}
                            {h.subtitle}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ============ DISCIPLINE (bandeau encourageant) ============ */}
          <section className="mb-6">
            <div className="rounded-[1.75rem] border border-neutral-200 shadow-sm p-5 md:p-6 xl:p-7 2xl:p-8" style={{ background: `linear-gradient(135deg, ${BRAND.blue}, #1B3370)` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-sm md:text-base xl:text-lg 2xl:text-xl flex items-center gap-2 text-white">
                  <Flame className="w-4 h-4 text-orange-400" /> Ma discipline cette semaine
                </h3>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Continuez comme ça 💪</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-display font-black text-white">
                    {discipline.activeDays === null ? "—" : <>{discipline.activeDays}<span className="text-xs text-white/50">/7</span></>}
                  </p>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mt-1">Jours actifs</p>
                  {discipline.activeDays === null && <p className="text-[8px] text-white/30 font-medium mt-0.5">À connecter</p>}
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-display font-black text-white">{discipline.liveAttendance === null ? "—" : discipline.liveAttendance}</p>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mt-1">Lives suivis</p>
                  {discipline.liveAttendance === null && <p className="text-[8px] text-white/30 font-medium mt-0.5">À connecter</p>}
                </div>
                <div className="bg-white/10 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-display font-black text-white">{discipline.homeworkSubmitted}</p>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mt-1">Devoirs rendus</p>
                </div>
              </div>
            </div>
          </section>

          {/* ============ SESSIONS LIVE + TODO LIST ============ */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 xl:gap-7 2xl:gap-8 mb-10">
            {/* SESSIONS LIVE À VENIR */}
            <div className="bg-white rounded-[1.75rem] border border-neutral-200 shadow-sm p-5 md:p-6 xl:p-7 2xl:p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-sm md:text-base xl:text-lg 2xl:text-xl flex items-center gap-2" style={{ color: BRAND.blue }}>
                  <Radio className="w-4 h-4" style={{ color: BRAND.orange }} /> Sessions live à venir
                </h3>
                <a href="/dashboard/coaching" className="text-[11px] font-bold text-neutral-400 hover:text-orange-500 transition-colors">Tout voir →</a>
              </div>
              {widgetsLoading ? (
                <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
              ) : upcomingLives.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-6 text-center">Aucune session programmée pour l'instant.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingLives.map((l) => {
                    const badge =
                      l.modeLabel ||
                      (l.type === "coaching-individuel"
                        ? "Individuel"
                        : l.type === "live-centre"
                          ? "Session Live"
                          : l.type === "coaching-groupe"
                            ? "Séance"
                            : l.type === "collectif"
                              ? "Collectif"
                              : "Groupe");
                    const isExternal = !!l.href && /^https?:\/\//i.test(l.href);
                    const content = (
                      <>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-800 truncate">{l.title}</p>
                          <p className="text-[10px] font-medium text-neutral-400">{formatLiveDate(l.scheduled_at)}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full shrink-0" style={{ color: BRAND.blue, backgroundColor: "#E7ECF7" }}>
                          {badge}
                        </span>
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {l.href ? (
                          isExternal ? (
                            <a
                              href={l.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-blue-100 bg-blue-50/50 hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
                            >
                              {content}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => router.push(l.href!)}
                              className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl border border-blue-100 bg-blue-50/50 hover:border-orange-300 hover:bg-orange-50/40 transition-colors text-left"
                            >
                              {content}
                            </button>
                          )
                        ) : (
                          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-blue-100 bg-blue-50/50">
                            {content}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* TODO LIST */}
            <div className="bg-white rounded-[1.75rem] border border-neutral-200 shadow-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-sm md:text-base flex items-center gap-2" style={{ color: BRAND.blue }}>
                  <ListChecks className="w-4 h-4" style={{ color: BRAND.orange }} /> Ma todo-list
                </h3>
                <button
                  onClick={() => { if (!canUseAITodo) router.push("/paywall"); }}
                  title={canUseAITodo ? "Suggestions IA" : "Fonctionnalité Premium"}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full"
                  style={{ color: canUseAITodo ? "#0E9F6E" : "#9CA3AF", backgroundColor: canUseAITodo ? "#EAFBF2" : "#F3F4F6" }}
                >
                  {canUseAITodo ? <Sparkles size={10} /> : <Lock size={10} />} IA
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTodo()}
                  placeholder="Ajouter une tâche pour la semaine…"
                  className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                />
                <button onClick={addTodo} className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: BRAND.orange }}>
                  <Plus size={18} />
                </button>
              </div>

              {widgetsLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
              ) : todos.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-4 text-center">Aucune tâche pour le moment — ajoutez votre premier objectif de la semaine.</p>
              ) : (
                <ul className="space-y-1.5">
                  {todos.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 group p-2 rounded-xl hover:bg-neutral-50">
                      <button onClick={() => toggleTodo(t.id, t.is_done)} className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors" style={{ borderColor: t.is_done ? "#0E9F6E" : "#D1D5DB", backgroundColor: t.is_done ? "#0E9F6E" : "transparent" }}>
                        {t.is_done && <Check size={12} className="text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${t.is_done ? "line-through text-neutral-400" : "text-neutral-700 font-medium"}`}>{t.content}</span>
                      <button onClick={() => deleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ============ ACTUALITÉS NEXA (slider promos/avis) ============ */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 ml-1">
              <h3 className="font-display font-black text-sm uppercase tracking-widest flex items-center gap-2" style={{ color: BRAND.blue }}>
                <Megaphone className="w-4 h-4" style={{ color: BRAND.orange }} /> Actualités NEXA
              </h3>
              <div className="flex gap-1">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button key={i} onClick={() => setActivePromo(i)} className="h-1.5 rounded-full transition-all duration-500" style={{ width: i === activePromo ? "16px" : "6px", backgroundColor: i === activePromo ? BRAND.orange : "#D4D4D8" }} />
                ))}
              </div>
            </div>

            <div className="relative h-36 md:h-40 rounded-[2rem] overflow-hidden group cursor-pointer shadow-lg">
              <AnimatePresence mode="wait">
                {activePromo < promos.length && (
                  <motion.div key={`promo-${activePromo}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.5 }} className="absolute inset-0 p-6 md:p-8 flex flex-col justify-center text-white" style={{ background: promos[activePromo].color }}>
                    <h4 className="text-lg md:text-2xl font-display font-black mb-1 md:mb-2">{promos[activePromo].title}</h4>
                    <p className="text-xs md:text-sm font-medium text-white/80">{promos[activePromo].desc}</p>
                  </motion.div>
                )}
                {activePromo >= promos.length && (() => {
                  const fb = pinnedFeedbacks[activePromo - promos.length];
                  if (!fb) return null;
                  return (
                    <motion.div key={`fb-${activePromo}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-slate-900 p-6 md:p-8 flex flex-col justify-center text-white">
                      <div className="flex gap-0.5 mb-2">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} fill={s <= fb.rating ? BRAND.orange : "none"} className={s <= fb.rating ? "" : "text-slate-600"} style={s <= fb.rating ? { color: BRAND.orange } : {}} />)}</div>
                      {fb.comment && <p className="text-sm md:text-base font-semibold text-white/90 line-clamp-3 mb-2 italic">"{fb.comment}"</p>}
                      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#FDBA74" }}>— {fb.prenom || "Étudiant NEXA"}</p>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <AnimatePresence>
          {showFeedbackModal && <FeedbackForm onClose={() => setShowFeedbackModal(false)} isModal={true} />}
        </AnimatePresence>
      </div>
    </>
  );
}
