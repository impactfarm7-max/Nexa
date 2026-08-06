"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Bell, Radar, Users, Target, Headphones, ImageIcon, Building2,
  Key, Phone, User, Trash2, Send,
  Activity, PlusCircle, Mail,
  Timer, Award, MessageSquare, MessageCircle,
  Download, BookOpen, BarChart3, FileDown, FileText,
  Star, Pin, PinOff, X, CheckCircle, MessageCircleCode, Ban, Zap,
  BellRing, Radio, RefreshCcw, CalendarCheck, XCircle, Menu, Pause, Play
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { encryptMessage, decryptRows } from "@/app/utils/messageCrypto.client";
import AdminFeedbackSection from "../components/AdminFeedbackSection";
import { OFFERS_CONFIG } from "@/app/data/packOffers";
import { useI18n } from "@/app/i18n/I18nProvider";

type StudentProfile = {
  id: string; prenom: string | null; email: string | null; phone: string | null;
  ville: string | null; role: string; formation: string | null; current_level: string;
  subscription_ends_at: string | null; tag_status: "actif" | "revoque" | "termine" | string; last_sign_in_at: string | null;
  subscription_paused_at: string | null;
  current_activity: string | null; simulations_completed: number; created_at: string; updated_at: string | null;
  pack_name: string | null;
  relance_count?: number | null;
  ee_total?: number; ee_used?: number; exam_total?: number; exam_used?: number;
  exam_4m_total?: number; exam_4m_used?: number;
  eo_total?: number; eo_used?: number; coaching_total?: number; coaching_used?: number;
};

type Mission = { id: string; title: string; description: string; created_at: string; };

type CommunityMessage = { 
  id: string; user_id: string; message: string; channel: string; created_at: string; 
  profiles: { prenom: string; role: string; } 
};

type Feedback = {
  id: string; user_id: string; prenom: string | null;
  rating: number; comment: string | null; created_at: string;
  pinned: boolean;
};

type PrivateMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  image_url?: string | null;
  created_at: string;
  read_at: string | null;
};

type GuestSupportMessage = {
  id: string;
  guest_token: string;
  guest_name: string | null;
  guest_email: string | null;
  sender: "guest" | "admin";
  sender_user_id?: string | null;
  message: string;
  image_url?: string | null;
  created_at: string;
  read_at: string | null;
};

type SupportConversation = {
  kind: "student" | "guest" | "center";
  student_id: string;
  guest_token?: string;
  linked_student_id?: string;
  prenom: string;
  email?: string | null;
  center_name?: string | null;
  last_message: string;
  last_at: string;
  unread: number;
};

type CenterApplication = {
  id: string;
  center_name: string;
  center_type: string | null;
  country: string | null;
  city: string;
  address: string | null;
  manager_name: string;
  manager_role: string | null;
  email: string;
  phone: string;
  student_volume: string | null;
  needs: string[] | null;
  message: string | null;
  status: "new" | "contacted" | "approved" | "rejected";
  center_code: string | null;
  created_at: string;
  updated_at: string | null;
};

type CoachingAppointment = {
  id: string;
  user_id: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "refused" | string;
  note: string | null;
  admin_note: string | null;
  profiles?: {
    id: string;
    prenom: string | null;
    email: string | null;
    phone: string | null;
    pack_name: string | null;
    coaching_total: number | null;
    coaching_used: number | null;
  };
};

type ClientActivityLog = {
  id: string;
  user_id: string;
  action: string;
  details: string | null;
  metadata: Record<string, any> | null;
  user_agent: string | null;
  created_at: string;
  profiles: {
    id: string;
    prenom: string | null;
    email: string | null;
    phone: string | null;
    pack_name: string | null;
    role: string | null;
  } | null;
};

function getSupportImageUrl(msg: { image_url?: string | null; message?: string }) {
  if (msg.image_url) return msg.image_url;
  return (msg.message || "").match(/Image jointe\s*:\s*(https?:\/\/\S+)/)?.[1] || null;
}

function getSupportMessageText(message: string) {
  return message
    .replace(/\n*\s*Image jointe\s*:\s*https?:\/\/\S+\s*/g, "")
    .trim();
}

const CHANNELS = [
  { id: "general", name: "Général" },
  { id: "tcf", name: "TCF Canada" },
  { id: "anglais", name: "Anglais" },
];

export default function RealAdminDashboard() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("crm_all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pmSearch, setPmSearch] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 

  const [missions, setMissions] = useState<Mission[]>([]);
  const [newMission, setNewMission] = useState({ title: "", description: "", target: "all" });
  const [isDeploying, setIsDeploying] = useState(false);
  
  const [activeChannel, setActiveChannel] = useState("general");
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [newCommMsg, setNewCommMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const missionSubmissionsRef = useRef<HTMLDivElement>(null);
  
  const [adminUser, setAdminUser] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [centerApplications, setCenterApplications] = useState<CenterApplication[]>([]);
  const [centersLoading, setCentersLoading] = useState(false);
  const [centerActionId, setCenterActionId] = useState<string | null>(null);
  const [centerCredentials, setCenterCredentials] = useState<{ email: string; password: string; name: string; centerName: string; centerCode?: string } | null>(null);
  
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [successData, setSuccessData] = useState<{student: StudentProfile, config: any} | null>(null);
  const [packEmailSending, setPackEmailSending] = useState(false);
  const [packEmailSent, setPackEmailSent] = useState(false);
  const [packActionId, setPackActionId] = useState<string | null>(null);

  // Soumissions
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "done" | "pending_review">("all");
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [submissionComments, setSubmissionComments] = useState<Record<string, string>>({});
  const [commentSendingId, setCommentSendingId] = useState<string | null>(null);
  const [commentSentId, setCommentSentId] = useState<string | null>(null);

  // Historique simulateurs
  const [simHistory, setSimHistory] = useState<{ date: string; count: number; uniqueUsers: { prenom: string; mode: string; userId: string }[] }[]>([]);
  const [simHistoryLoading, setSimHistoryLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Actions clients
  const [clientActivities, setClientActivities] = useState<ClientActivityLog[]>([]);
  const [clientActivitiesLoading, setClientActivitiesLoading] = useState(false);
  const [clientActivitiesError, setClientActivitiesError] = useState("");
  const [selectedActivityUserId, setSelectedActivityUserId] = useState<string | null>(null);

  // Suppression de compte
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Création compte étudiant
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ prenom: "", email: "", phone: "", ville: "", genre: "", formation: "tcf" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; prenom: string; phone?: string } | null>(null);
  const [credsCopied, setCredsCopied] = useState(false);

  // Bibliothèque — indexation PDFs
  const [indexingPdfs, setIndexingPdfs] = useState(false);
  const [indexResults, setIndexResults] = useState<{ total: number; indexed: number; skipped: number; errors: number; errorDetails: string[] } | null>(null);

  // Push notifications
  const [pushForm, setPushForm] = useState({ title: "", body: "", url: "/dashboard", targetUserId: "" });
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; total: number; inAppSent?: number } | null>(null);

  // Coaching
  const [coachingAppointments, setCoachingAppointments] = useState<CoachingAppointment[]>([]);
  const [pastCoachingAppointments, setPastCoachingAppointments] = useState<CoachingAppointment[]>([]);
  const [coachingStats, setCoachingStats] = useState<{ pending: number; confirmed: number; effectue: number }>({ pending: 0, confirmed: 0, effectue: 0 });
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState("");
  const [groupSessions, setGroupSessions] = useState<any[]>([]);
  const [groupEligibleCount, setGroupEligibleCount] = useState(0);
  const [groupForm, setGroupForm] = useState({ title: "", description: "", date: "", time: "", duration_min: 60 });
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupCancelId, setGroupCancelId] = useState<string | null>(null);
  const [coachingActionId, setCoachingActionId] = useState<string | null>(null);
  const [coachingDecisionToast, setCoachingDecisionToast] = useState<{
    status: "confirmed" | "refused" | "cancelled";
    student: string;
  } | null>(null);
  const [coachingModal, setCoachingModal] = useState<{
    appointmentId: string;
    action: "refused" | "cancelled";
    reason: string;
  } | null>(null);

  // Messages privés
  const [dmOpen, setDmOpen] = useState(false);
  const [dmStudent, setDmStudent] = useState<StudentProfile | null>(null);
  const [dmMessages, setDmMessages] = useState<PrivateMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const dmEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<{ student_id: string; prenom: string; last_message: string; last_at: string; unread: number }[]>([]);

  // Support client
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportStudent, setSupportStudent] = useState<StudentProfile | null>(null);
  const [supportGuest, setSupportGuest] = useState<SupportConversation | null>(null);
  const [supportMessages, setSupportMessages] = useState<PrivateMessage[]>([]);
  const [convoMode, setConvoMode] = useState<"bot" | "human">("bot");
  const [convoModeLoading, setConvoModeLoading] = useState(false);
  const [guestSupportMessages, setGuestSupportMessages] = useState<GuestSupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [supportImage, setSupportImage] = useState<File | null>(null);
  const [supportImagePreview, setSupportImagePreview] = useState<string | null>(null);
  const [supportSendError, setSupportSendError] = useState<string | null>(null);
  const [supportSending, setSupportSending] = useState(false);
  const supportEndRef = useRef<HTMLDivElement>(null);
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "support") setActiveTab("support");
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // ⚠️ Ne jamais sélectionner pin_hash — champ sensible inutile pour l'admin UI
    const { data, error } = await supabase
      .from('profiles')
      .select('id, prenom, email, phone, ville, role, formation, current_level, subscription_ends_at, subscription_paused_at, tag_status, last_sign_in_at, current_activity, simulations_completed, created_at, updated_at, pack_name, relance_count, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used')
      .is('center_id', null)
      .order('created_at', { ascending: false });
    if (!error) setStudents((data || []).filter(s => s.tag_status !== 'supprime'));
    setLoading(false);
  };

  const fetchMissions = async () => {
    const { data, error } = await supabase.from('missions').select('*').is('center_id', null).order('created_at', { ascending: false });
    if (!error) setMissions(data || []);
  };

  const fetchSubmissions = async () => {
    setSubmissionsLoading(true);
    try {
      // refreshSession garantit un access_token valide même après HMR ou expiration
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) {
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!session?.access_token) return;

      const res = await fetch("/api/admin/missions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.submissions ?? []);
      } else {
        console.error("fetchSubmissions HTTP error:", res.status, await res.text());
      }
    } catch (e) {
      console.error("fetchSubmissions error:", e);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchSimHistory = async () => {
    setSimHistoryLoading(true);
    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/simulator-history", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSimHistory(json.days ?? []);
      }
    } catch (e) {
      console.error("fetchSimHistory error:", e);
    } finally {
      setSimHistoryLoading(false);
    }
  };

  const fetchClientActivities = async () => {
    setClientActivitiesLoading(true);
    setClientActivitiesError("");
    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      if (!session?.access_token) return;

      const res = await fetch("/api/activity?limit=250", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setClientActivities(json.activities ?? []);
      } else {
        const text = await res.text();
        setClientActivitiesError(text || `Erreur HTTP ${res.status}`);
        console.error("fetchClientActivities HTTP error:", res.status, text);
      }
    } catch (e) {
      setClientActivitiesError("Impossible de charger les actions clients.");
      console.error("fetchClientActivities error:", e);
    } finally {
      setClientActivitiesLoading(false);
    }
  };

  const fetchCoachingAppointments = async () => {
    setCoachingLoading(true);
    setCoachingError("");
    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      if (!session?.access_token) {
        setCoachingError("Session admin introuvable. Reconnectez-vous.");
        return;
      }

      const res = await fetch("/api/admin/coaching", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCoachingAppointments(json.appointments ?? []);
        setPastCoachingAppointments(json.pastAppointments ?? json.completed ?? []);
        setCoachingStats({
          pending: json.stats?.pending ?? 0,
          confirmed: json.stats?.confirmed ?? 0,
          effectue: json.stats?.effectue ?? json.stats?.completed30d ?? 0,
        });
      } else {
        const text = await res.text();
        setCoachingError(text || `Erreur HTTP ${res.status}`);
        console.error("fetchCoachingAppointments HTTP error:", res.status, text);
      }
    } catch (e) {
      setCoachingError("Impossible de charger le coaching.");
      console.error("fetchCoachingAppointments error:", e);
    } finally {
      setCoachingLoading(false);
    }
  };

  const fetchGroupSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/group-coaching", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setGroupSessions(json.sessions ?? []);
        setGroupEligibleCount(json.eligibleCount ?? 0);
      }
    } catch {
      /* silencieux */
    }
  };

  const handleCreateGroupSession = async () => {
    setGroupError("");
    if (!groupForm.title.trim() || !groupForm.date || !groupForm.time) {
      setGroupError("Titre, date et heure sont requis.");
      return;
    }
    setGroupSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/group-coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title: groupForm.title.trim(),
          description: groupForm.description.trim() || null,
          session_date: groupForm.date,
          session_time: groupForm.time,
          duration_min: Number(groupForm.duration_min),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGroupError(json.error || "Erreur lors de la création.");
        return;
      }
      setGroupForm({ title: "", description: "", date: "", time: "", duration_min: 60 });
      await fetchGroupSessions();
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleCancelGroupSession = async (id: string) => {
    setGroupCancelId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/admin/group-coaching", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) await fetchGroupSessions();
    } finally {
      setGroupCancelId(null);
    }
  };

  const fetchFeedbacks = async () => {
    setFeedbackLoading(true);
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setFeedbacks(data);
    }
    setFeedbackLoading(false);
  };

  const fetchCenterApplications = async () => {
    setCentersLoading(true);
    const { data, error } = await supabase
      .from("center_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setCenterApplications(data as CenterApplication[]);
    setCentersLoading(false);
  };

  const updateCenterApplicationStatus = async (id: string, status: CenterApplication["status"]) => {
    setCenterActionId(id);
    if (status === "approved") {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/centers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ applicationId: id }),
      });
      const json = await res.json();
      setCenterActionId(null);
      if (!res.ok) {
        alert(json.error || "Impossible d'approuver le centre.");
        return;
      }
      setCenterCredentials(json.credentials);
      fetchCenterApplications();
      return;
    }

    const { error } = await supabase
      .from("center_applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setCenterActionId(null);
    if (!error) fetchCenterApplications();
  };

  const fetchCommunityMessages = async (channelId: string) => {
    const { data, error } = await supabase.from('community_messages').select('*, profiles:user_id ( prenom, role )').eq('channel', channelId).is('center_id', null).order('created_at', { ascending: true });
    if (!error && data) {
      const decrypted = await decryptRows(data, () => ({ kind: "community", channel: channelId }));
      setCommunityMessages(decrypted);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  useEffect(() => {
    const initAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace("/login"); return; }

      // Vérification du rôle admin côté DB (pas trust du client)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        window.location.replace("/dashboard");
        return;
      }

      setAdminUser(session.user);
    };
    initAdmin(); fetchStudents(); fetchMissions(); fetchSubmissions(); fetchFeedbacks(); fetchCoachingAppointments(); fetchClientActivities();
    const timer = setInterval(() => { setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); }, 1000);

    let presencePollInterval: NodeJS.Timeout | null = null;
    let commPollInterval: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const channel = supabase.channel('online-users', { config: { presence: { key: 'user_id' } } });
    channel.on('presence', { event: 'sync' }, () => { setOnlineUsers(Object.keys(channel.presenceState())); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (presencePollInterval) clearInterval(presencePollInterval);
          presencePollInterval = null;
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          if (!presencePollInterval && isSubscribed) {
            presencePollInterval = setInterval(() => {
              setOnlineUsers(Object.keys(channel.presenceState()));
            }, 5000);
          }
        }
      });

    const commListener = supabase.channel('public:community_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => { fetchCommunityMessages(activeChannel); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (commPollInterval) clearInterval(commPollInterval);
          commPollInterval = null;
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          if (!commPollInterval && isSubscribed) {
            commPollInterval = setInterval(() => fetchCommunityMessages(activeChannel), 5000);
          }
        }
      });

    return () => {
      isSubscribed = false;
      clearInterval(timer);
      if (presencePollInterval) clearInterval(presencePollInterval);
      if (commPollInterval) clearInterval(commPollInterval);
      channel.unsubscribe();
      supabase.removeChannel(commListener);
    };
  }, [activeChannel]);

  useEffect(() => {
    if (activeTab === "feedbacks") fetchFeedbacks();
    if (activeTab === "missions" || activeTab === "soumissions") fetchSubmissions();
    if (activeTab === "examens") fetchSimHistory();
    if (activeTab === "coaching") fetchCoachingAppointments();
    if (activeTab === "coaching") fetchGroupSessions();
    if (activeTab === "actions" || activeTab === "overview") fetchClientActivities();
    if (activeTab === "messages") fetchConversations();
    if (activeTab === "support") fetchSupportConversations();
    if (activeTab === "centres") fetchCenterApplications();
  }, [activeTab]);

  useEffect(() => {
    if (!adminUser) return;
    fetchConversations();
    fetchSupportConversations();
  }, [adminUser, students]);

  // Scroll automatique dans le modal DM
  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages, guestSupportMessages]);

  // Realtime permanent — reçoit toutes les réponses des étudiants
  useEffect(() => {
    if (!adminUser) return;
    let ch: any;
    let pmPollInterval: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const setupPmListener = () => {
      ch = supabase.channel("pm_admin_global_" + adminUser.id)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        }, (payload) => {
          // Met toujours à jour la liste des conversations
          fetchConversations();
          // Met à jour le modal si le bon étudiant est ouvert (envoyé OU reçu)
          if (dmOpen && dmStudent && (payload.new.from_user_id === dmStudent.id || payload.new.to_user_id === dmStudent.id)) {
            fetchDmMessages(dmStudent.id);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            if (pmPollInterval) clearInterval(pmPollInterval);
            pmPollInterval = null;
          } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
            if (!pmPollInterval && isSubscribed) {
              pmPollInterval = setInterval(() => {
                fetchConversations();
                if (dmOpen && dmStudent) {
                  fetchDmMessages(dmStudent.id);
                }
              }, 5000);
            }
          }
        });
    };

    setupPmListener();
    return () => {
      isSubscribed = false;
      if (ch) supabase.removeChannel(ch);
      if (pmPollInterval) clearInterval(pmPollInterval);
    };
  }, [adminUser, dmOpen, dmStudent]);

  useEffect(() => {
    if (!adminUser) return;
    const ch = supabase.channel("support_admin_global_" + adminUser.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      }, (payload) => {
        fetchSupportConversations();
        if (supportOpen && supportStudent && (payload.new.from_user_id === supportStudent.id || payload.new.to_user_id === supportStudent.id)) {
          fetchSupportMessages(supportStudent.id);
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "guest_support_messages",
      }, (payload) => {
        fetchSupportConversations();
        if (supportGuest && payload.new.guest_token === (supportGuest.guest_token || supportGuest.student_id)) {
          fetchGuestSupportMessages(supportGuest.guest_token || supportGuest.student_id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminUser, supportOpen, supportStudent]);

  const assignOfferToStudent = async (offerKey: keyof typeof OFFERS_CONFIG) => {
    if (!selectedStudent) return;
    setIsAssigning(true);

    const config = OFFERS_CONFIG[offerKey];

    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      const res = await fetch("/api/admin/assign-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ studentId: selectedStudent.id, packKey: offerKey, config }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      if (json.warning) console.warn("assign-pack main update échoué (fallback utilisé):", json.warning);

      await fetchStudents();
      setPackModalOpen(false);
      setPackEmailSent(false);
      setSuccessData({ student: selectedStudent, config });
    } catch (err: any) {
      alert("Erreur lors de l'attribution du pack : " + err.message);
    }

    setIsAssigning(false);
  };

  const cancelSubscription = async (studentId: string, prenom: string | null) => {
    if (!confirm(`Révoquer l'accès de ${prenom || 'cet étudiant'} ? Son abonnement sera annulé et son statut passera à "Révoqué".`)) return;
    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      const res = await fetch("/api/admin/assign-pack", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ studentId, prenom }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      fetchStudents();
    } catch (err: any) {
      alert("Erreur lors de la révocation : " + err.message);
    }
  };

  const togglePackPause = async (student: StudentProfile) => {
    const isPaused = Boolean(student.subscription_paused_at);
    const verb = isPaused ? "réactiver" : "mettre en pause";
    const consequence = isPaused
      ? "La durée passée en pause sera ajoutée à sa date de fin."
      : "Le client perdra temporairement son accès et ses jours restants seront conservés.";
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} le pack de ${student.prenom || "ce client"} ?\n\n${consequence}`)) return;

    setPackActionId(student.id);
    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      const res = await fetch("/api/admin/assign-pack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ studentId: student.id, action: isPaused ? "resume" : "pause" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      await fetchStudents();
    } catch (err: any) {
      alert(`Erreur lors de la ${isPaused ? "réactivation" : "mise en pause"} : ${err.message}`);
    } finally {
      setPackActionId(null);
    }
  };

  const markAsTermine = async (studentId: string, prenom: string | null) => {
    if (!confirm(`Marquer ${prenom || 'cet étudiant'} comme "Terminé" ? Son statut sera mis à jour.`)) return;
    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      const res = await fetch("/api/admin/assign-pack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ studentId, tag_status: "termine" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      fetchStudents();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const getWhatsAppLink = (student: StudentProfile, config: any) => {
    const appLink = "https://iag-academy.com/login";
    const text = `🎉 Félicitations ${student.prenom || ''} !\n\nTon paiement a bien été validé. Ton *${config.name}* est officiellement ACTIVÉ sur ton compte pour une durée de ${config.days} jours.\n\nTes crédits d'entraînement et ton accès Premium sont débloqués. Connecte-toi vite pour commencer :\n👉 ${appLink}\n\nBon courage ! 🇨🇦`;
    const phone = student.phone ? student.phone.replace(/[^0-9+]/g, '') : '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const normalizeWhatsAppPhone = (phone: string | null) => {
    if (!phone) return "";
    let cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
    return cleaned.replace(/^\+/, "");
  };

  const getRelanceMessage = (student: StudentProfile) => {
    const name = student.prenom ? ` ${student.prenom}` : "";
    return `Bonjour${name}, votre periode d'essai NEXA est terminee. Pour garder votre acces a l'application et continuer votre preparation, vous pouvez effectuer un achat. Repondez a ce message et nous allons vous guider pour activer votre pack.`;
  };

  const isTrialAccessProfile = (student: StudentProfile) => {
    const pack = student.pack_name?.toLowerCase() || "aucun";
    if (pack === "essai") return true;
    if (pack !== "complete" || !student.created_at || !student.subscription_ends_at) return false;
    const createdAt = new Date(student.created_at).getTime();
    const endsAt = new Date(student.subscription_ends_at).getTime();
    return Number.isFinite(createdAt) && Number.isFinite(endsAt) && endsAt - createdAt <= 26 * 60 * 60 * 1000;
  };

  const hasActivatedPack = (student: StudentProfile) => {
    const pack = student.pack_name?.toLowerCase() || "aucun";
    return pack !== "aucun" && !isTrialAccessProfile(student);
  };

  const getStudentOfferConfig = (student: StudentProfile) => {
    if (!hasActivatedPack(student)) return null;
    const pack = student.pack_name?.toLowerCase() as keyof typeof OFFERS_CONFIG;
    return OFFERS_CONFIG[pack] || null;
  };

  const relanceStudent = async (student: StudentProfile) => {
    const phone = normalizeWhatsAppPhone(student.phone);
    if (!phone) {
      alert("Aucun numero WhatsApp n'est enregistre pour cet etudiant.");
      return;
    }

    const nextCount = (student.relance_count || 0) + 1;
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, relance_count: nextCount } : s));
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(getRelanceMessage(student))}`, "_blank");

    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      const res = await fetch("/api/admin/assign-pack", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ studentId: student.id, action: "relance" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur inconnue");
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, relance_count: json.relance_count ?? nextCount } : s));
    } catch (err: any) {
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, relance_count: student.relance_count || 0 } : s));
      alert("WhatsApp a ete ouvert, mais le compteur de relance n'a pas pu etre enregistre : " + err.message);
    }
  };

  const sendPackActivationEmail = async () => {
    if (!successData || !successData.student.email) return;
    setPackEmailSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/pack-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          studentId: successData.student.id,
          packName: successData.config.name,
          days: successData.config.days,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Email non envoyé.");
        return;
      }
      setPackEmailSent(true);
      setTimeout(() => setPackEmailSent(false), 2800);
    } catch {
      alert("Erreur réseau pendant l'envoi de l'email.");
    } finally {
      setPackEmailSending(false);
    }
  };

  const handleCreateStudent = async () => {
    if (!createForm.prenom.trim() || !createForm.email.trim()) return;
    setCreateLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Erreur."); return; }
      setCreatedCredentials({ email: json.email, password: json.password, prenom: json.prenom, phone: createForm.phone });
      setShowCreateModal(false);
      setCreateForm({ prenom: "", email: "", phone: "", ville: "", genre: "", formation: "tcf" });
      fetchStudents();
    } catch {
      alert("Erreur réseau.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-student", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ studentId: studentToDelete.id }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Erreur."); return; }
      setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
      setStudentToDelete(null);
    } catch {
      alert("Erreur réseau.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getCredentialsWhatsApp = (creds: typeof createdCredentials) => {
    if (!creds) return "";
    const text = `Bonjour ${creds.prenom} ! 👋\n\nVotre compte NEXA a été créé avec succès.\n\n🔑 *Vos identifiants de connexion :*\n📧 Email : ${creds.email}\n🔒 Mot de passe : ${creds.password}\n\n👉 Connectez-vous ici : https://iag-academy.com/login\n\nBon entraînement ! 🇨🇦`;
    const phone = creds.phone ? creds.phone.replace(/[^0-9+]/g, '') : '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const getCredentialsEmailLink = (creds: typeof createdCredentials) => {
    if (!creds) return "";
    const subject = `Vos identifiants NEXA`;
    const body = `Bonjour ${creds.prenom},\n\nVotre compte a été créé avec succès sur NEXA.\n\nVos identifiants :\n- Email : ${creds.email}\n- Mot de passe : ${creds.password}\n\nConnectez-vous sur : https://iag-academy.com/login\n\nN'hésitez pas à changer votre mot de passe après la première connexion.\n\nL'équipe NEXA`;
    return `mailto:${creds.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyCredentials = (creds: typeof createdCredentials) => {
    if (!creds) return;
    const text = `Email : ${creds.email}\nMot de passe : ${creds.password}`;
    navigator.clipboard.writeText(text);
    setCredsCopied(true);
    setTimeout(() => setCredsCopied(false), 2000);
  };

  const generateNewPassword = async (email: string | null) => {
    if (!email) return alert("Pas d'email.");
    const newPin = prompt(`Nouveau PIN (4 chiffres) pour ${email} :`);
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      if (newPin !== null) alert("PIN invalide : 4 chiffres requis.");
      return;
    }

    // Hachage PBKDF2 via WebCrypto (même format que le serveur : "pbkdf2:salt:hash")
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const keyMaterial = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(newPin), "PBKDF2", false, ["deriveBits"]
    );
    // Utiliser les octets UTF-8 du string hex comme sel, identique au comportement Node.js crypto
    const saltForDerivation = new TextEncoder().encode(saltHex);
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltForDerivation, iterations: 100000, hash: "SHA-512" },
      keyMaterial, 512
    );
    const hashHex = Array.from(new Uint8Array(derived)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const pinHash = `pbkdf2:${saltHex}:${hashHex}`;

    const { error } = await supabase.from('profiles').update({ pin_hash: pinHash }).eq('email', email);
    if (error) {
      alert("Erreur lors de la mise à jour du PIN.");
    } else {
      alert(`✅ PIN réinitialisé. Transmettez le nouveau code (${newPin}) à l'étudiant via un canal sécurisé.`);
    }
  };

  const exportToCSV = () => {
    const rows = students.map(s => {
      const nowMs = new Date().getTime();
      let statut = "Expiré";
      if (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > nowMs) statut = "Premium";
      else if (s.created_at) {
        const days = (nowMs - new Date(s.created_at).getTime()) / (1000 * 3600 * 24);
        if (days < 3) statut = "Essai"; else if (days < 5) statut = "Grace";
      }
      return [s.prenom || "Inconnu", s.email || "-", s.phone || "-", s.formation || "-", statut, s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"].join(";");
    });
    // BOM UTF-8 (accents) + directive "sep=;" lue par Excel FR ET EN pour séparer les colonnes
    const csvContent = "﻿" + ["sep=;", "Nom;Email;Telephone;Formation;Statut;Inscription", ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `NEXA_Etudiants_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const rows = students.map(s => {
      const nowMs = new Date().getTime();
      let statut = "Expiré";
      if (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > nowMs) statut = "Premium";
      else if (s.created_at) {
        const days = (nowMs - new Date(s.created_at).getTime()) / (1000 * 3600 * 24);
        if (days < 3) statut = "Essai"; else if (days < 5) statut = "Grace";
      }
      return [
        s.prenom || "Inconnu",
        s.email || "-",
        s.phone || "-",
        s.formation || "-",
        statut,
        s.created_at ? new Date(s.created_at).toLocaleDateString() : "-",
      ];
    });

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(234, 88, 12);
    doc.text("NEXA", 14, 16);
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Liste des étudiants (${students.length})`, 14, 23);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, 14, 28);

    autoTable(doc, {
      startY: 33,
      head: [["Nom", "Email", "Téléphone", "Formation", "Statut", "Inscription"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`NEXA_Etudiants_${new Date().toLocaleDateString()}.pdf`);
  };

  const fetchDmMessages = async (studentId: string) => {
    if (!adminUser) return;
    // Pas de filtre serveur — RLS retourne tous les messages visibles, on filtre côté client
    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .is("center_id", null)
      .order("created_at", { ascending: true });
    const filtered = (data || []).filter(msg => msg.from_user_id === studentId || msg.to_user_id === studentId);
    const decrypted = await decryptRows(filtered, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));
    setDmMessages(decrypted);
    if (filtered.some(msg => msg.from_user_id === studentId && !msg.read_at)) {
      await supabase
        .from("private_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("from_user_id", studentId)
        .is("center_id", null)
        .is("read_at", null);
      await fetchConversations();
    }
  };

  const openDm = (student: StudentProfile) => {
    setDmStudent(student);
    setDmOpen(true);
    fetchDmMessages(student.id);
  };

  const sendDm = async () => {
    const msg = dmInput.trim();
    if (!msg || !dmStudent || !adminUser || dmSending) return;
    setDmSending(true);
    setDmInput("");
    const enc = await encryptMessage(msg, { kind: "private", userA: adminUser.id, userB: dmStudent.id });
    await supabase.from("private_messages").insert([{
      from_user_id: adminUser.id,
      to_user_id: dmStudent.id,
      message: enc,
      center_id: null,
    }]);
    await fetchDmMessages(dmStudent.id);
    setDmSending(false);
  };

  const fetchConversations = async () => {
    if (!adminUser) return;
    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .is("center_id", null)
      .order("created_at", { ascending: false });
    if (!data) return;

    const decryptedData = await decryptRows(data, (m: any) => ({ kind: "private", userA: m.from_user_id, userB: m.to_user_id }));

    // Récupère les prénoms des participants distincts
    const participantIds = [...new Set(data.flatMap((msg: any) => [msg.from_user_id, msg.to_user_id]))];
    const { data: profiles } = participantIds.length > 0
      ? await supabase
        .from("profiles")
        .select("id, prenom, role, center_id")
        .in("id", participantIds)
      : { data: [] as any[] };
    const profileMap = new Map((profiles || []).filter((p: any) => !p.center_id).map((p: any) => [p.id, p]));

    const map = new Map<string, { student_id: string; prenom: string; last_message: string; last_at: string; unread: number }>();
    decryptedData.forEach((msg: any) => {
      const fromProfile = profileMap.get(msg.from_user_id);
      const toProfile = profileMap.get(msg.to_user_id);
      if (!fromProfile && !toProfile) return;
      const sid = fromProfile?.role !== "admin" ? msg.from_user_id : toProfile?.role !== "admin" ? msg.to_user_id : msg.from_user_id;
      const prenom = profileMap.get(sid)?.prenom || students.find(s => s.id === sid)?.prenom || sid;
      if (!map.has(sid)) {
        map.set(sid, { student_id: sid, prenom, last_message: msg.message, last_at: msg.created_at, unread: 0 });
      }
      if (msg.from_user_id === sid && !msg.read_at) {
        map.get(sid)!.unread++;
      }
    });
    setConversations([...map.values()]);
  };

  const fetchSupportMessages = async (studentId: string) => {
    if (!adminUser) return;
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: true });
    const filtered = (data || []).filter(msg => msg.from_user_id === studentId || msg.to_user_id === studentId);
    const decrypted = await decryptRows(filtered, () => ({ kind: "support", studentId }));
    setSupportMessages(decrypted);
    if (filtered.some(msg => msg.from_user_id === studentId && !msg.read_at)) {
      await supabase
        .from("support_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("from_user_id", studentId)
        .is("read_at", null);
      await fetchSupportConversations();
    }
  };

  // 🤖 Mode conversation (bot vs humain) — takeover
  // IMPORTANT : la clé doit être identique à celle utilisée par le bot (runSupportBot).
  // Compte (ou invité dont l'email = compte) -> student.id. Invité pur -> guest_token.
  const resolveConvo = (): { key: string; kind: "account" | "guest" } | null => {
    if (supportStudent) return { key: supportStudent.id, kind: "account" };
    if (supportGuest?.linked_student_id) return { key: supportGuest.linked_student_id, kind: "account" };
    if (supportGuest) return { key: supportGuest.guest_token || supportGuest.student_id, kind: "guest" };
    return null;
  };

  const fetchConvoMode = async (conversationKey: string) => {
    const { data } = await supabase
      .from("support_conversations")
      .select("mode")
      .eq("conversation_key", conversationKey)
      .maybeSingle();
    setConvoMode((data?.mode as "bot" | "human") || "bot");
  };

  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = url.split("/").pop()?.split("?")[0] || "piece-jointe.png";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  // Fermer la conversation = rendre la main au bot automatiquement
  const closeSupport = async () => {
    const convo = resolveConvo();
    if (convo && convoMode === "human") {
      await supabase.from("support_conversations").upsert(
        { conversation_key: convo.key, kind: convo.kind, mode: "bot" },
        { onConflict: "conversation_key" }
      );
    }
    setConvoMode("bot");
    setSupportOpen(false);
  };

  const toggleConvoMode = async () => {
    const convo = resolveConvo();
    if (!convo || convoModeLoading) return;
    const next = convoMode === "bot" ? "human" : "bot";
    setConvoModeLoading(true);
    const { error } = await supabase
      .from("support_conversations")
      .upsert({ conversation_key: convo.key, kind: convo.kind, mode: next }, { onConflict: "conversation_key" });
    if (!error) setConvoMode(next);
    else alert(`Erreur changement de mode : ${error.message}`);
    setConvoModeLoading(false);
  };

  const openSupport = (student: StudentProfile) => {
    setSupportStudent(student);
    setSupportGuest(null);
    setSupportOpen(true);
    fetchSupportMessages(student.id);
    fetchConvoMode(student.id);
  };

  const fetchGuestSupportMessages = async (guestToken: string) => {
    const { data } = await supabase
      .from("guest_support_messages")
      .select("*")
      .eq("guest_token", guestToken)
      .order("created_at", { ascending: true });

    const rows = (data || []) as GuestSupportMessage[];
    const decrypted = await decryptRows(rows, () => ({ kind: "guest", token: guestToken }));
    setGuestSupportMessages(decrypted);
    if (rows.some(msg => msg.sender === "guest" && !msg.read_at)) {
      await supabase
        .from("guest_support_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("guest_token", guestToken)
        .eq("sender", "guest")
        .is("read_at", null);
      await fetchSupportConversations();
    }
  };

  const openGuestSupport = (conversation: SupportConversation) => {
    setSupportStudent(null);
    setSupportGuest(conversation);
    setSupportOpen(true);
    fetchGuestSupportMessages(conversation.guest_token || conversation.student_id);
    // Clé mode = student.id si l'invité est lié à un compte (cohérent avec le bot), sinon guest_token
    fetchConvoMode(conversation.linked_student_id || conversation.guest_token || conversation.student_id);
    if (conversation.linked_student_id) fetchSupportMessages(conversation.linked_student_id);
    else setSupportMessages([]);
  };

  const uploadSupportImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/support/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Upload impossible");
    return json.url as string;
  };

  const setSupportImageFile = (file: File | null) => {
    setSupportImage(file);
    if (supportImagePreview) URL.revokeObjectURL(supportImagePreview);
    setSupportImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const sendSupport = async () => {
    const msg = supportInput.trim();
    if ((!msg && !supportImage) || (!supportStudent && !supportGuest) || !adminUser || supportSending) return;
    setSupportSending(true);
    setSupportSendError(null);

    try {
      const imageUrl = supportImage ? await uploadSupportImage(supportImage) : null;
      if (supportImage && !imageUrl) throw new Error("L'image n'a pas ete envoyee. Reessayez.");

      if (supportStudent) {
        const messageWithFallback = imageUrl
          ? `${msg}${msg ? "\n\n" : ""}Image jointe : ${imageUrl}`
          : msg;
        const encMsg = await encryptMessage(messageWithFallback, { kind: "support", studentId: supportStudent.id });
        const { data: inserted, error } = await supabase.from("support_messages").insert([{
          from_user_id: adminUser.id,
          to_user_id: supportStudent.id,
          message: encMsg,
          image_url: imageUrl,
        }]).select("id, image_url").single();
        if (error) throw new Error(error.message);
        if (imageUrl && inserted?.image_url !== imageUrl) {
          throw new Error("Le message est parti mais l'image n'a pas ete enregistree. Verifiez la colonne image_url dans Supabase.");
        }
        await fetchSupportMessages(supportStudent.id);
      } else if (supportGuest) {
        const guestToken = supportGuest.guest_token || supportGuest.student_id;
        const messageWithFallback = imageUrl
          ? `${msg}${msg ? "\n\n" : ""}Image jointe : ${imageUrl}`
          : msg;
        const encMsg = await encryptMessage(messageWithFallback, { kind: "guest", token: guestToken });
        const { data: inserted, error } = await supabase.from("guest_support_messages").insert([{
          guest_token: guestToken,
          guest_name: supportGuest.prenom,
          guest_email: supportGuest.email || null,
          sender: "admin",
          sender_user_id: adminUser.id,
          message: encMsg,
          image_url: imageUrl,
        }]).select("id, image_url").single();
        if (error) throw new Error(error.message);
        if (imageUrl && inserted?.image_url !== imageUrl) {
          throw new Error("Le message est parti mais l'image n'a pas ete enregistree. Verifiez la colonne image_url dans Supabase.");
        }
        await fetchGuestSupportMessages(guestToken);
      }

      // Répondre manuellement = prendre la main : le bot s'arrête sur cette conversation
      const convo = resolveConvo();
      if (convo && convoMode !== "human") {
        await supabase.from("support_conversations").upsert(
          { conversation_key: convo.key, kind: convo.kind, mode: "human" },
          { onConflict: "conversation_key" }
        );
        setConvoMode("human");
      }

      setSupportInput("");
      setSupportImageFile(null);
      await fetchSupportConversations();
    } catch (error: any) {
      setSupportSendError(error?.message || "Impossible d'envoyer l'image.");
    } finally {
      setSupportSending(false);
    }
  };

  const fetchSupportConversations = async () => {
    if (!adminUser) return;
    const [{ data }, { data: guestData }] = await Promise.all([
      supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("guest_support_messages")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const supportRows = data || [];
    const guestRows = (guestData || []) as GuestSupportMessage[];
    const participantIds = [...new Set(supportRows.flatMap((msg: any) => [msg.from_user_id, msg.to_user_id]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, prenom, email, role, center_id, centers:center_id(name)")
      .in("id", participantIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const decryptedSupportRows = await decryptRows(supportRows, (m: any) => {
      const fromP = profileMap.get(m.from_user_id);
      const toP = profileMap.get(m.to_user_id);
      const sid = fromP?.role !== "admin" ? m.from_user_id : toP?.role !== "admin" ? m.to_user_id : m.from_user_id;
      return { kind: "support", studentId: sid };
    });
    const decryptedGuestRows = await decryptRows(guestRows, (m: any) => ({ kind: "guest", token: m.guest_token }));

    const map = new Map<string, SupportConversation>();
    decryptedSupportRows.forEach((msg: any) => {
      const fromProfile = profileMap.get(msg.from_user_id);
      const toProfile = profileMap.get(msg.to_user_id);
      if (!fromProfile && !toProfile) return;
      const sid = fromProfile?.role !== "admin" ? msg.from_user_id : toProfile?.role !== "admin" ? msg.to_user_id : msg.from_user_id;
      const profile: any = profileMap.get(sid);
      const isCenterSupport = Boolean(profile?.center_id);
      const centerName = profile?.centers?.name || null;
      const prenom = isCenterSupport
        ? (centerName || profile?.prenom || "Centre")
        : profile?.prenom || students.find(s => s.id === sid)?.prenom || sid;
      if (!map.has(sid)) {
        map.set(sid, {
          kind: isCenterSupport ? "center" : "student",
          student_id: sid,
          prenom,
          email: profile?.email || null,
          center_name: centerName,
          last_message: msg.message,
          last_at: msg.created_at,
          unread: 0,
        });
      }
      if (msg.from_user_id === sid && !msg.read_at) {
        map.get(sid)!.unread++;
      }
    });

    decryptedGuestRows.forEach((msg) => {
      const key = `guest:${msg.guest_token}`;
      const prenom = msg.guest_name || msg.guest_email || "Invite connexion";
      if (!map.has(key)) {
        map.set(key, {
          kind: "guest",
          student_id: msg.guest_token,
          guest_token: msg.guest_token,
          prenom,
          email: msg.guest_email,
          last_message: msg.message,
          last_at: msg.created_at,
          unread: 0,
        });
      } else {
        const current = map.get(key)!;
        if (new Date(msg.created_at).getTime() > new Date(current.last_at).getTime()) {
          current.last_message = msg.message;
          current.last_at = msg.created_at;
        }
        current.guest_token = current.guest_token || msg.guest_token;
        current.email = current.email || msg.guest_email;
      }
      if (msg.sender === "guest" && !msg.read_at) {
        map.get(key)!.unread++;
      }
    });

    setSupportConversations([...map.values()].sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()));
  };

  const sendNotification = async (studentId: string, prenom: string | null) => {
    const student = students.find(s => s.id === studentId) || { id: studentId, prenom } as any;
    openDm(student);
  };

  const broadcastMessage = async () => {
    const msg = prompt(`Message pour tous les ${students.length} étudiants :`);
    if (!msg) return;
    await supabase.from('notifications').insert(students.map(s => ({ user_id: s.id, message: msg })));
  };

  const deployMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMission.title.trim()) return;
    setIsDeploying(true);

    const missionDescription = newMission.target === 'all'
      ? newMission.description.trim()
      : `[Cible: ${newMission.target.toUpperCase()}] ${newMission.description.trim()}`;

    // Utilise l'API server (service key) pour contourner les RLS sur missions
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ title: newMission.title.trim(), description: missionDescription }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Erreur : ${err.error}`);
      setIsDeploying(false);
      return;
    }

    // Envoyer les notifications aux étudiants ciblés — missions réservées aux packs ivoire, cauris, acceleree, complete
    const MISSIONS_PACKS = ["ivoire", "cauris", "acceleree", "complete"];
    let targetStudents = students.filter(s => MISSIONS_PACKS.includes(s.pack_name?.toLowerCase() || ""));
    if (newMission.target === 'tcf') targetStudents = targetStudents.filter(s => s.formation === 'tcf');
    if (newMission.target === 'anglais') targetStudents = targetStudents.filter(s => s.formation === 'anglais');
    if (newMission.target === 'premium') targetStudents = targetStudents.filter(s => s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > new Date().getTime());

    if (targetStudents.length > 0) {
      const notifications = targetStudents.map(s => ({ user_id: s.id, message: `🎯 Nouvelle mission assignée : ${newMission.title.trim()}` }));
      await supabase.from('notifications').insert(notifications);
    }

    setNewMission({ title: "", description: "", target: "all" });
    fetchMissions();
    setIsDeploying(false);
    alert(`Mission déployée avec succès à ${targetStudents.length} étudiant(s) !`);
  };

  const deleteMission = async (id: string) => {
    if (!confirm("Supprimer cette mission ?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/admin/missions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ id }),
    });
    fetchMissions();
  };

  const handleIndexPdfs = async () => {
    if (!confirm("Lancer l'indexation de tous les PDFs non-indexés ?")) return;
    setIndexingPdfs(true);
    setIndexResults(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/bibliotheque/index-pdfs", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const json = await res.json();
    if (json.results) {
      const indexed = json.results.filter((r: any) => r.status === "indexed").length;
      const skipped = json.results.filter((r: any) => r.status?.startsWith("skipped")).length;
      const errorItems: any[] = json.results.filter((r: any) => r.status?.startsWith("error"));
      const errorDetails = errorItems.map((r: any) => `${r.titre}: ${r.status}`);
      setIndexResults({ total: json.total, indexed, skipped, errors: errorItems.length, errorDetails });
    }
    setIndexingPdfs(false);
  };

  const sendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommMsg.trim() || !adminUser) return;
    const msg = newCommMsg.trim(); setNewCommMsg("");
    const enc = await encryptMessage(msg, { kind: "community", channel: activeChannel });
    await supabase.from('community_messages').insert([{ user_id: adminUser.id, message: enc, channel: activeChannel, center_id: null }]);
  };

  const deleteCommunityMessage = async (id: string) => {
    if (confirm("Supprimer ce message ?")) await supabase.from('community_messages').delete().eq('id', id).is('center_id', null);
  };

  const deleteFeedback = async (id: string) => {
    if (confirm("Supprimer cet avis ?")) { await supabase.from('feedback').delete().eq('id', id); fetchFeedbacks(); }
  };

  const togglePinFeedback = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase.from('feedback').update({ pinned: !currentPinned }).eq('id', id);
    if (!error) setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, pinned: !currentPinned } : f));
  };

  const sendPushNotification = async () => {
    if (!pushForm.title || !pushForm.body) return;
    setPushSending(true);
    setPushResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body: any = { title: pushForm.title, body: pushForm.body, url: pushForm.url || "/dashboard" };
      if (pushForm.targetUserId) body.user_id = pushForm.targetUserId;
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setPushResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setPushSending(false);
    }
  };

  const sendSubmissionComment = async (submissionId: string) => {
    const comment = submissionComments[submissionId]?.trim();
    if (!comment) return;

    setCommentSendingId(submissionId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/submission-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ submissionId, comment }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Commentaire non envoyé.");
        return;
      }

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? { ...sub, admin_comment: comment, admin_comment_at: new Date().toISOString() }
            : sub
        )
      );
      setSubmissionComments((prev) => ({ ...prev, [submissionId]: "" }));
      setCommentOpenId(null);
      setCommentSentId(submissionId);
      setTimeout(() => setCommentSentId(null), 2500);
    } finally {
      setCommentSendingId(null);
    }
  };

  const handleCoachingDecision = async (appointmentId: string, status: "confirmed" | "refused" | "cancelled", admin_note = "") => {
    if (status === "refused" || status === "cancelled") {
      setCoachingModal({ appointmentId, action: status, reason: "" });
      return;
    }

    const appointment = coachingAppointments.find((item) => item.id === appointmentId);
    setCoachingActionId(appointmentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/coaching", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ id: appointmentId, status, admin_note }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Action impossible.");
        return;
      }
      await fetchCoachingAppointments();
      await fetchStudents();
      setCoachingDecisionToast({
        status,
        student: appointment?.profiles?.prenom || appointment?.profiles?.email || "Étudiant",
      });
      setTimeout(() => setCoachingDecisionToast(null), 2800);
    } finally {
      setCoachingActionId(null);
    }
  };

  const submitCoachingModal = async () => {
    if (!coachingModal) return;
    const { appointmentId, action, reason } = coachingModal;
    const appointment = coachingAppointments.find((item) => item.id === appointmentId);
    setCoachingModal(null);
    setCoachingActionId(appointmentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/coaching", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ id: appointmentId, status: action, admin_note: reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Action impossible.");
        return;
      }
      await fetchCoachingAppointments();
      await fetchStudents();
      setCoachingDecisionToast({
        status: action,
        student: appointment?.profiles?.prenom || appointment?.profiles?.email || "Étudiant",
      });
      setTimeout(() => setCoachingDecisionToast(null), 2800);
    } finally {
      setCoachingActionId(null);
    }
  };

  const countPack = (pack: string) => students.filter(s => s.pack_name === pack).length;
  const countSansPack = students.filter(s => !hasActivatedPack(s)).length;
  const now = new Date().getTime();

  const activeStudents = students.filter(s => onlineUsers.includes(s.id));
  const onSimulatorCount = activeStudents.length;
  const countInExam = activeStudents.filter(s => s.current_activity?.toLowerCase().includes('exam')).length;
  const countInZen = activeStudents.filter(s => s.current_activity?.toLowerCase().includes('zen') || s.current_activity?.toLowerCase().includes('pratique')).length;
  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1) : "–";
  const pinnedCount = feedbacks.filter(f => f.pinned).length;
  const filteredFeedbacks = feedbacks.filter(f => ratingFilter === 0 || f.rating === ratingFilter).filter(f => !pinnedOnly || f.pinned);

  const activityStudents = Array.from(
    clientActivities.reduce((map, activity) => {
      const current = map.get(activity.user_id);
      if (!current) {
        map.set(activity.user_id, {
          user_id: activity.user_id,
          profiles: activity.profiles,
          count: 1,
          latest_at: activity.created_at,
        });
        return map;
      }

      current.count += 1;
      if (new Date(activity.created_at).getTime() > new Date(current.latest_at).getTime()) {
        current.latest_at = activity.created_at;
      }
      return map;
    }, new Map<string, { user_id: string; profiles: ClientActivityLog["profiles"]; count: number; latest_at: string }>())
  ).map(([, value]) => value).sort((a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime());

  const filteredActivityStudents = activityStudents.filter((item) => {
    const profile = item.profiles;
    const haystack = [
      profile?.prenom,
      profile?.email,
      profile?.phone,
      profile?.pack_name,
    ].filter(Boolean).join(" ").toLowerCase();
    return !searchQuery.trim() || haystack.includes(searchQuery.trim().toLowerCase());
  });
  const selectedActivityStudent = activityStudents.find((item) => item.user_id === selectedActivityUserId) ?? null;
  const selectedClientActivities = selectedActivityUserId
    ? clientActivities.filter((activity) => activity.user_id === selectedActivityUserId)
    : [];
  const activeClientCount7d = activityStudents.length;

  const submissionsByMission = submissions.reduce((acc, submission) => {
    const missionId = submission.mission_id || submission.missions?.id;
    if (!missionId) return acc;
    if (!acc[missionId]) acc[missionId] = [];
    acc[missionId].push(submission);
    return acc;
  }, {} as Record<string, any[]>);

  const pendingMissionSubmissionsCount = submissions.filter((submission) => submission.status === "pending_review").length;
  const selectedMission = missions.find((mission) => mission.id === selectedMissionId) ?? null;
  const selectedMissionSubmissions = selectedMissionId ? (submissionsByMission[selectedMissionId] ?? []) : [];
  const filteredSelectedMissionSubmissions = selectedMissionSubmissions.filter(
    (submission: any) => submissionFilter === "all" || submission.status === submissionFilter
  );

  const selectMissionAndShowSubmissions = (missionId: string) => {
    setSelectedMissionId(missionId);
    window.setTimeout(() => {
      missionSubmissionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const exportSelectedActivityPdf = async () => {
    if (!selectedActivityStudent) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const profile = selectedActivityStudent.profiles;
    const studentName = profile?.prenom || profile?.email || "Client sans nom";
    const generatedAt = new Date().toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    const writeLabelValue = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(value || "-", margin + 34, y);
      y += 6;
    };

    doc.setFillColor(255, 102, 0);
    doc.rect(0, 0, pageWidth, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Historique d'activite client", margin, 10.5);

    y = 26;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.text(studentName, margin, y);
    y += 10;

    writeLabelValue("Email", profile?.email || "Email indisponible");
    writeLabelValue("Telephone", profile?.phone || "-");
    writeLabelValue("Pack", profile?.pack_name || "sans pack");
    writeLabelValue("Periode", "7 derniers jours");
    writeLabelValue("Actions", String(selectedClientActivities.length));
    writeLabelValue("Genere le", generatedAt);

    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    if (selectedClientActivities.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(90, 90, 90);
      doc.text("Aucune activite enregistree pour cet etudiant.", margin, y);
    } else {
      selectedClientActivities.forEach((activity, index) => {
        const when = new Date(activity.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
        const details = activity.details || "-";
        const detailsLines = doc.splitTextToSize(details, contentWidth - 8);
        const userAgentLines = activity.user_agent
          ? doc.splitTextToSize(`Appareil : ${activity.user_agent}`, contentWidth - 8)
          : [];

        ensureSpace(22 + detailsLines.length * 5 + userAgentLines.length * 4);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y - 5, contentWidth, 14 + detailsLines.length * 5 + userAgentLines.length * 4, 2, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 102, 0);
        doc.text(`${index + 1}. ${activity.action}`, margin + 4, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(when, pageWidth - margin - doc.getTextWidth(when), y);

        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(detailsLines, margin + 4, y);
        y += detailsLines.length * 5;

        if (userAgentLines.length > 0) {
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          doc.text(userAgentLines, margin + 4, y);
          y += userAgentLines.length * 4;
        }

        y += 7;
      });
    }

    const safeName = studentName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "client";

    doc.save(`historique-activite-${safeName}.pdf`);
  };

  const renderSubmissionCard = (sub: any) => {
    const corr = sub.correction;
    const scoreColor = corr ? (corr.note >= 16 ? "text-emerald-400" : corr.note >= 12 ? "text-blue-400" : corr.note >= 8 ? "text-amber-400" : "text-red-400") : "";

    return (
      <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-500 text-sm shrink-0">
              {sub.profiles?.prenom?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-bold text-white text-sm">{sub.profiles?.prenom || "Inconnu"}</p>
              <p className="text-[10px] text-slate-500">{sub.profiles?.email}</p>
              <p className="text-xs text-orange-400 font-bold mt-1">{sub.missions?.title}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {corr ? (
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-black ${scoreColor}`}>{corr.note}</span>
                <span className="text-slate-500 text-sm">/20</span>
                <span className={`text-xs font-black ${scoreColor}`}>{corr.niveau}</span>
              </div>
            ) : (
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${sub.status === "pending_review" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-slate-500 border-slate-700"}`}>
                {sub.status === "pending_review" ? "En attente" : sub.status}
              </span>
            )}
            <span className="text-[9px] text-slate-600">{new Date(sub.created_at).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>

        {sub.answer_text && (
          <div className="px-5 pb-4 border-t border-slate-800 pt-4">
            <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Reponse</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{sub.answer_text}</p>
          </div>
        )}

        {sub.file_url && (
          <div className="px-5 pb-4">
            <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
              <FileText className="w-3.5 h-3.5" /> {sub.file_name || "Fichier joint"}
            </a>
          </div>
        )}

        {corr && (
          <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/40">
            <p className="text-[9px] font-black uppercase text-emerald-400 mb-2">Correction IA</p>
            <p className="text-xs text-slate-400 italic leading-relaxed">{corr.commentaire_global}</p>
            {corr.conseil_coach && (
              <p className="text-xs text-orange-300 mt-2">Conseil : {corr.conseil_coach}</p>
            )}
          </div>
        )}

        {sub.admin_comment && (
          <div className="border-t border-slate-800 px-5 py-4 bg-orange-500/5">
            <p className="text-[9px] font-black uppercase text-orange-400 mb-2">Commentaire admin</p>
            <p className="text-sm text-slate-200 leading-relaxed">{sub.admin_comment}</p>
            {sub.admin_comment_at && (
              <p className="text-[9px] text-slate-600 mt-2">
                Envoye le {new Date(sub.admin_comment_at).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        )}

        <div className="border-t border-slate-800 px-5 py-4">
          <button
            onClick={() => {
              const opening = commentOpenId !== sub.id;
              setCommentOpenId(opening ? sub.id : null);
              if (opening && !submissionComments[sub.id]) {
                setSubmissionComments((prev) => ({ ...prev, [sub.id]: sub.admin_comment || "" }));
              }
            }}
            className={`flex items-center gap-2 text-sm font-black transition-colors ${
              commentOpenId === sub.id ? "text-orange-400" : "text-slate-400 hover:text-orange-400"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Faire un commentaire
            {commentSentId === sub.id && (
              <span className="ml-2 text-[10px] text-emerald-400 uppercase tracking-widest">Envoye</span>
            )}
          </button>

          <AnimatePresence>
            {commentOpenId === sub.id && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <textarea
                    value={submissionComments[sub.id] || ""}
                    onChange={(e) => setSubmissionComments((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                    placeholder="Ecrivez votre commentaire a l'etudiant..."
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-orange-500 transition-colors resize-none placeholder:text-slate-500"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => sendSubmissionComment(sub.id)}
                      disabled={commentSendingId === sub.id || !submissionComments[sub.id]?.trim()}
                      className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                    >
                      {commentSendingId === sub.id ? (
                        <Activity className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Envoyer
                    </button>
                    <button
                      onClick={() => setCommentOpenId(null)}
                      disabled={commentSendingId === sub.id}
                      className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 font-sans flex overflow-x-hidden md:overflow-hidden">
      {centerCredentials && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-emerald-500/30 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
              <Building2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white">Centre approuve</h3>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Transmettez ces acces a {centerCredentials.name} pour {centerCredentials.centerName}.
            </p>
            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</p>
              <p className="font-mono text-sm font-bold text-white">{centerCredentials.email}</p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Mot de passe</p>
              <p className="font-mono text-lg font-black tracking-widest text-orange-400">{centerCredentials.password}</p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Code centre</p>
              <p className="font-mono text-lg font-black tracking-widest text-emerald-400">{centerCredentials.centerCode || "-"}</p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Connexion</p>
              <p className="font-mono text-sm font-bold text-white">/login</p>
            </div>
            <div className="mt-5 grid gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(`Centre : ${centerCredentials.centerName}\nCode centre : ${centerCredentials.centerCode || "-"}\nEmail : ${centerCredentials.email}\nMot de passe : ${centerCredentials.password}\nLien connexion : ${window.location.origin}/login`)}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-emerald-500"
              >
                Copier les acces
              </button>
              <button
                onClick={() => setCenterCredentials(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {coachingDecisionToast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-5 py-4 rounded-2xl border shadow-2xl flex items-center gap-3 ${
              coachingDecisionToast.status === "confirmed"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-100 shadow-emerald-950/30"
                : coachingDecisionToast.status === "cancelled"
                  ? "bg-orange-500/15 border-orange-500/30 text-orange-100 shadow-orange-950/30"
                  : "bg-red-500/15 border-red-500/30 text-red-100 shadow-red-950/30"
            }`}
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 500, damping: 18 }}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                coachingDecisionToast.status === "confirmed" ? "bg-emerald-500" : coachingDecisionToast.status === "cancelled" ? "bg-orange-500" : "bg-red-500"
              }`}
            >
              {coachingDecisionToast.status === "confirmed" ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : (
                <XCircle className="w-5 h-5 text-white" />
              )}
            </motion.div>
            <div>
              <p className="text-sm font-black text-white">
                Rendez-vous {coachingDecisionToast.status === "confirmed" ? "confirmé" : coachingDecisionToast.status === "cancelled" ? "annulé" : "refusé"}
              </p>
              <p className="text-xs text-slate-300 font-bold">
                Notification et email envoyés à {coachingDecisionToast.student}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 🔴 MODAL REFUS / ANNULATION COACHING */}
      <AnimatePresence>
        {coachingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${coachingModal.action === "cancelled" ? "bg-orange-500/20" : "bg-red-500/20"}`}>
                  <XCircle className={`w-5 h-5 ${coachingModal.action === "cancelled" ? "text-orange-400" : "text-red-400"}`} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {coachingModal.action === "cancelled" ? "Annuler le rendez-vous" : "Refuser le rendez-vous"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                    {coachingModal.action === "cancelled" ? "Le quota sera restitué à l'étudiant" : "La demande sera rejetée"}
                  </p>
                </div>
              </div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                {coachingModal.action === "cancelled" ? "Motif d'annulation" : "Motif du refus"}
                <span className="text-slate-600 ml-1 font-bold normal-case tracking-normal">(obligatoire)</span>
              </label>
              <textarea
                value={coachingModal.reason}
                onChange={(e) => setCoachingModal({ ...coachingModal, reason: e.target.value })}
                placeholder={coachingModal.action === "cancelled" ? "Ex : Indisponibilité du coach, problème technique..." : "Ex : Créneau incompatible, préférez un autre horaire..."}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 font-medium focus:outline-none focus:border-orange-500/50 resize-none mb-5"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setCoachingModal(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest hover:border-slate-600 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={submitCoachingModal}
                  disabled={!coachingModal.reason.trim()}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    coachingModal.action === "cancelled"
                      ? "bg-orange-500 hover:bg-orange-400 text-white"
                      : "bg-red-500 hover:bg-red-400 text-white"
                  }`}
                >
                  {coachingModal.action === "cancelled" ? "Confirmer l'annulation" : "Confirmer le refus"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 MODAL D'ATTRIBUTION DES PACKS */}
      <AnimatePresence>
        {packModalOpen && selectedStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-[2rem] p-6 w-full max-w-5xl shadow-2xl relative overflow-hidden">
              <button onClick={() => setPackModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"><X size={20}/></button>
              
              <div className="mb-6">
                <h3 className="text-2xl font-black text-white flex items-center gap-2"><Award className="text-orange-500"/> Attribuer une Offre</h3>
                <p className="text-slate-400 mt-1">Sélectionnez le pack pour <strong className="text-white">{selectedStudent.prenom || selectedStudent.email}</strong>.</p>
                
                {hasActivatedPack(selectedStudent) && (
                  <div className="mt-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <Zap className="text-yellow-500 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Pack Actuel : {OFFERS_CONFIG[selectedStudent.pack_name as keyof typeof OFFERS_CONFIG]?.name}</p>
                      <p className="text-sm font-bold text-white">
                        Consommation : {selectedStudent.ee_used || 0} EE / {selectedStudent.exam_used || 0} Examens EE / {selectedStudent.exam_4m_used || 0} Examens Complets
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {Object.entries(OFFERS_CONFIG).map(([key, config]) => (
                  <button key={key} onClick={() => assignOfferToStudent(key as keyof typeof OFFERS_CONFIG)} disabled={isAssigning}
                    className={`${config.color} border border-white/10 rounded-2xl p-5 text-left hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group`}
                  >
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                    <h4 className="text-lg font-black text-white mb-1">{config.name}</h4>
                    <ul className="text-xs text-white/80 space-y-1 font-medium mb-4">
                      <li>• Valide {config.days} jours</li>
                      <li>• Mode Zen EE : {config.ee === 9999 ? "Illimité" : config.ee}</li>
                      <li>• Examens Officiels EE : {config.exam_ee === 9999 ? "Illimité" : config.exam_ee}</li>
                      {config.exam_4m > 0 && <li>• Examens Complets 4M : {config.exam_4m}</li>}
                      {config.eo > 0 && <li>• Sim. Orales (EO) : {config.eo === 9999 ? "Illimitées" : config.eo}</li>}
                      {config.coaching > 0 && <li>• Coaching : {config.coaching === 9999 ? "Inclus" : `${config.coaching} séances`}</li>}
                    </ul>
                    <div className="bg-black/20 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-white flex items-center gap-2 w-fit">
                      <CheckCircle size={12}/> Attribuer
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 MODAL DE SUCCÈS & COMMUNICATION */}
      <AnimatePresence>
        {successData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-emerald-500/30 rounded-[2rem] p-8 w-full max-w-md shadow-2xl text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Pack Activé !</h3>
              <p className="text-slate-400 text-sm mb-8">Le <strong>{successData.config.name}</strong> de {successData.student.prenom || "l'étudiant"} est officiellement actif. Prévenez-le maintenant :</p>
              
              <div className="flex flex-col gap-3">
                {successData.student.phone ? (
                  <a href={getWhatsAppLink(successData.student, successData.config)} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#1EBE57] text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#25D366]/20">
                    <MessageCircleCode size={18} /> Prévenir sur WhatsApp
                  </a>
                ) : (
                  <button disabled className="w-full bg-slate-800 text-slate-500 py-4 rounded-xl font-black flex items-center justify-center gap-2 cursor-not-allowed">Pas de numéro enregistré</button>
                )}
                
                <button
                  onClick={sendPackActivationEmail}
                  disabled={packEmailSending || !successData.student.email}
                  className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                    packEmailSent
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                  }`}
                >
                  {packEmailSending ? (
                    <RefreshCcw size={18} className="animate-spin" />
                  ) : packEmailSent ? (
                    <CheckCircle size={18} />
                  ) : (
                    <Mail size={18} />
                  )}
                  {packEmailSent ? "Email envoyé" : packEmailSending ? "Envoi..." : successData.student.email ? "Envoyer un email" : "Pas d'email enregistré"}
                </button>
                
                <button onClick={() => { setSuccessData(null); setPackEmailSent(false); }} className="mt-4 text-slate-500 hover:text-white text-sm font-bold underline transition-colors">Fermer la fenêtre</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ MODAL CRÉATION COMPTE ÉTUDIANT */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2"><User className="w-5 h-5 text-orange-400" /> Créer un compte étudiant</h3>
                  <p className="text-slate-400 text-xs mt-1">Les identifiants seront générés automatiquement.</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Prénom *</label>
                    <input value={createForm.prenom} onChange={e => setCreateForm(p => ({ ...p, prenom: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors"
                      placeholder="Marie" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Téléphone</label>
                    <input value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors"
                      placeholder="+225 07 00 00 00" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Email *</label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors"
                    placeholder="marie@exemple.com" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Ville</label>
                    <input value={createForm.ville} onChange={e => setCreateForm(p => ({ ...p, ville: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors"
                      placeholder="Abidjan" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Genre</label>
                    <select value={createForm.genre} onChange={e => setCreateForm(p => ({ ...p, genre: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors">
                      <option value="">Non précisé</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Formation</label>
                  <div className="flex gap-2">
                    {[{ val: "tcf", label: "TCF Canada" }, { val: "anglais", label: "Anglais IELTS" }].map(({ val, label }) => (
                      <button key={val} onClick={() => setCreateForm(p => ({ ...p, formation: val }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${createForm.formation === val ? "bg-orange-500 border-orange-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={handleCreateStudent} disabled={createLoading || !createForm.prenom.trim() || !createForm.email.trim()}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
                  {createLoading ? <><RefreshCcw className="w-4 h-4 animate-spin" /> Création...</> : <><PlusCircle className="w-4 h-4" /> Créer le compte</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔑 MODAL IDENTIFIANTS CRÉÉS */}
      <AnimatePresence>
        {createdCredentials && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-emerald-500/30 rounded-[2rem] p-8 w-full max-w-md shadow-2xl text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-1">Compte créé !</h3>
              <p className="text-slate-400 text-sm mb-6">Transmettez ces identifiants à <strong className="text-white">{createdCredentials.prenom}</strong></p>

              <div className="bg-slate-800 rounded-2xl p-5 mb-6 text-left space-y-3 border border-slate-700">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Email</p>
                  <p className="text-white font-bold text-sm font-mono">{createdCredentials.email}</p>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mot de passe</p>
                  <p className="text-orange-400 font-black text-lg font-mono tracking-widest">{createdCredentials.password}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={() => copyCredentials(createdCredentials)}
                  className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${credsCopied ? "bg-emerald-500 text-white" : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"}`}>
                  {credsCopied ? <><CheckCircle className="w-4 h-4" /> Copié !</> : <><Key className="w-4 h-4" /> Copier les identifiants</>}
                </button>

                {createdCredentials.phone && (
                  <a href={getCredentialsWhatsApp(createdCredentials)} target="_blank" rel="noopener noreferrer"
                    className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE57] text-white font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20">
                    <MessageCircleCode className="w-4 h-4" /> Envoyer sur WhatsApp
                  </a>
                )}

                <a href={getCredentialsEmailLink(createdCredentials)}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700">
                  <Mail className="w-4 h-4" /> Envoyer par Email
                </a>

                <button onClick={() => setCreatedCredentials(null)} className="mt-2 text-slate-500 hover:text-white text-sm font-bold underline transition-colors">
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🗑️ MODAL CONFIRMATION SUPPRESSION */}
      <AnimatePresence>
        {studentToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-red-500/30 rounded-[2rem] p-8 w-full max-w-md shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/30">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Masquer ce compte ?</h3>
              <p className="text-slate-400 text-sm mb-2">
                Vous allez masquer le compte de <strong className="text-white">{studentToDelete.prenom}</strong>
              </p>
              <p className="text-xs text-slate-500 mb-8 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                {studentToDelete.email}<br />
                <span className="text-slate-300">Le compte ne sera plus visible dans le dashboard.</span> Les données restent intactes en base.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStudentToDelete(null)} disabled={deleteLoading}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-colors disabled:opacity-50">
                  Annuler
                </button>
                <button onClick={handleDeleteStudent} disabled={deleteLoading}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ? <><RefreshCcw className="w-4 h-4 animate-spin" /> Masquage...</> : <><Trash2 className="w-4 h-4" /> Confirmer</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 MODAL CONVERSATION PRIVÉE */}
      <AnimatePresence>
        {dmOpen && dmStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
              style={{ height: "min(600px, 90vh)" }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-orange-500">
                  {dmStudent.prenom?.charAt(0) || "?"}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{dmStudent.prenom || "Étudiant"}</p>
                  <p className="text-xs text-slate-500">{dmStudent.email}</p>
                </div>
                <button onClick={() => setDmOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 sm:px-4">
                {dmMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                    <MessageCircle className="w-10 h-10 opacity-30" />
                    <p className="text-sm font-bold">Démarrer la conversation</p>
                  </div>
                ) : dmMessages.map((msg, i) => {
                  const isAdmin = msg.from_user_id === adminUser?.id;
                  const imageUrl = getSupportImageUrl(msg);
                  const messageText = getSupportMessageText(msg.message || "");
                  const prev = dmMessages[i - 1];
                  const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full">
                            {new Date(msg.created_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        </div>
                      )}
                      <div className={`flex w-full items-end gap-2 ${isAdmin ? "justify-end pl-10 sm:pl-16" : "justify-start pr-10 sm:pr-16"}`}>
                        {!isAdmin && (
                          <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-black text-orange-500">
                            {dmStudent.prenom?.charAt(0) || "?"}
                          </div>
                        )}
                        <div className={`flex min-w-0 max-w-full flex-col gap-1 ${isAdmin ? "items-end" : "items-start"}`}>
                          <div className={`w-fit max-w-full break-words px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            isAdmin
                              ? "rounded-2xl rounded-br-sm bg-orange-500 text-white"
                              : "rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200"
                          }`}>
                            {imageUrl && (
                              <button type="button" onClick={() => downloadImage(imageUrl)} className="mb-2 block w-full overflow-hidden rounded-xl border border-white/10 bg-black/10 text-left transition-opacity hover:opacity-90">
                                <img
                                  src={imageUrl}
                                  alt="Capture envoyee"
                                  className="block max-h-56 w-auto max-w-[min(260px,65vw)] object-contain"
                                />
                                <span className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest ${isAdmin ? "text-blue-100" : "text-slate-500"}`}>
                                  <Download className="w-3 h-3" /> Télécharger l'image
                                </span>
                              </button>
                            )}
                            {messageText && <p className="whitespace-pre-wrap">{messageText}</p>}
                          </div>
                          <p className={`px-1 text-[10px] leading-none ${isAdmin ? "text-slate-500" : "text-slate-600"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {isAdmin && msg.read_at && <span className="ml-1">· Lu</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={dmEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  value={dmInput}
                  onChange={e => setDmInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDm(); } }}
                  placeholder={`Message à ${dmStudent.prenom || "l'étudiant"}...`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition-colors"
                  disabled={dmSending}
                />
                <button onClick={sendDm} disabled={!dmInput.trim() || dmSending}
                  className="w-10 h-10 bg-orange-500 disabled:opacity-40 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95">
                  {dmSending ? <RefreshCcw size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL SUPPORT CLIENT */}
      <AnimatePresence>
        {supportOpen && (supportStudent || supportGuest) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
              style={{ height: "min(600px, 90vh)" }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-blue-300">
                  {(supportStudent?.prenom || supportGuest?.prenom || "?").charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{supportStudent?.prenom || supportGuest?.prenom || "Invite"}</p>
                  <p className="text-xs text-slate-500 truncate">{supportStudent?.email || supportGuest?.email || "Support avant connexion"}</p>
                </div>
                <button
                  onClick={toggleConvoMode}
                  disabled={convoModeLoading}
                  title={convoMode === "bot" ? "Prendre la main (désactiver le bot)" : "Rendre la main au bot"}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 ${
                    convoMode === "bot"
                      ? "bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25"
                      : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                  }`}
                >
                  {convoModeLoading ? "..." : convoMode === "bot" ? "🤖 Bot actif · Prendre la main" : "🙋 Humain · Rendre au bot"}
                </button>
                <button onClick={closeSupport} className="p-2 text-slate-500 hover:text-white transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 sm:px-4">
                {(() => {
                  const visibleSupportMessages = supportGuest?.linked_student_id ? supportMessages : (supportGuest ? [] : supportMessages);
                  const timeline = [
                    ...visibleSupportMessages.map((msg) => ({ ...msg, source: "account" as const })),
                    ...guestSupportMessages.map((msg) => ({ ...msg, source: "guest" as const })),
                  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                  if (timeline.length === 0) {
                    return (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
                    <Headphones className="w-10 h-10 opacity-30" />
                    <p className="text-sm font-bold">Demarrer la conversation support</p>
                  </div>
                    );
                  }

                  return timeline.map((msg: any, i) => {
                  // Côté support (droite) = tout ce qui ne vient PAS de l'étudiant/invité (admin OU bot, peu importe quel admin id)
                  const studentSideId = supportStudent?.id || supportGuest?.linked_student_id;
                  const isAdmin = msg.source === "guest" ? msg.sender !== "guest" : msg.from_user_id !== studentSideId;
                  const imageUrl = getSupportImageUrl(msg);
                  const messageText = getSupportMessageText(msg.message || "");
                  const prev = timeline[i - 1];
                  const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                  return (
                    <div key={`${msg.source}:${msg.id}`}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full">
                            {new Date(msg.created_at).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        </div>
                      )}
                      {msg.source === "guest" && supportGuest?.linked_student_id && (
                        <div className="my-2 text-center">
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                            Message envoye hors connexion
                          </span>
                        </div>
                      )}
                      <div className={`flex w-full items-end gap-2 ${isAdmin ? "justify-end pl-10 sm:pl-16" : "justify-start pr-10 sm:pr-16"}`}>
                        {!isAdmin && (
                          <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-black text-blue-400">
                            {(supportStudent?.prenom || supportGuest?.prenom || "?").charAt(0)}
                          </div>
                        )}
                        <div className={`flex min-w-0 max-w-full flex-col gap-1 ${isAdmin ? "items-end" : "items-start"}`}>
                          <div className={`w-fit max-w-full break-words px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                            isAdmin
                              ? "rounded-2xl rounded-br-sm bg-blue-600 text-white"
                              : "rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-800 text-slate-200"
                          }`}>
                            {imageUrl && (
                              <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="mb-2 block overflow-hidden rounded-xl border border-white/10 bg-black/10">
                                <img
                                  src={imageUrl}
                                  alt="Capture support"
                                  className="block max-h-56 w-auto max-w-[min(260px,65vw)] object-contain"
                                />
                                <span className={`block px-3 py-2 text-[10px] font-black uppercase tracking-widest ${isAdmin ? "text-blue-100" : "text-slate-500"}`}>
                                  Ouvrir l'image
                                </span>
                              </a>
                            )}
                            {messageText && <p className="whitespace-pre-wrap">{messageText}</p>}
                          </div>
                          <p className={`px-1 text-[10px] leading-none ${isAdmin ? "text-slate-500" : "text-slate-600"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {isAdmin && msg.read_at && <span className="ml-1">· Lu</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                  });
                })()}
                <div ref={supportEndRef} />
              </div>

              <div className="border-t border-slate-800 px-4 py-3 shrink-0">
                {supportImagePreview && (
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-2">
                    <img src={supportImagePreview} alt="Apercu" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{supportImage?.name}</p>
                      <p className="text-[10px] text-slate-500">Image prete a envoyer</p>
                    </div>
                    <button type="button" onClick={() => setSupportImageFile(null)} className="rounded-lg p-2 text-slate-500 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {supportSendError && (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                    {supportSendError}
                  </div>
                )}
                <div className="flex items-center gap-3">
                <label className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer">
                  <ImageIcon size={16} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => setSupportImageFile(e.target.files?.[0] || null)}
                    disabled={supportSending}
                  />
                </label>
                <input
                  type="text"
                  value={supportInput}
                  onChange={e => setSupportInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSupport(); } }}
                  placeholder={`Reponse support a ${supportStudent?.prenom || supportGuest?.prenom || "l'etudiant"}...`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                  disabled={supportSending}
                />
                <button onClick={sendSupport} disabled={(!supportInput.trim() && !supportImage) || supportSending}
                  className="w-10 h-10 bg-blue-600 disabled:opacity-40 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95">
                  {supportSending ? <RefreshCcw size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
                </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 🧭 BARRE LATÉRALE - LES RUBRIQUES */}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 md:w-64 md:h-screen md:z-50 md:overflow-visible ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-orange-600 p-2 rounded-xl"><Radar className="w-5 h-5" /></div>
              <h1 className="text-xl font-black">TCF<span className="text-orange-500">.Admin</span></h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <button onClick={() => window.location.href = "/dashboard"} className="flex items-center gap-2 text-slate-400 hover:text-orange-500 text-xs font-bold transition-colors">← Retour au Dashboard</button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-6" onClick={() => setSidebarOpen(false)}>
          <p className="text-[10px] font-black uppercase text-slate-600 mb-2 mt-2 tracking-widest px-2">Gestion Étudiants</p>
          <button onClick={() => setActiveTab("crm_all")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "crm_all" ? "bg-orange-500 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Users className="w-4 h-4" /> Tous</div>
            <span className="text-xs bg-slate-800/50 px-2 rounded-full">{students.length}</span>
          </button>
          <button onClick={() => setActiveTab("crm_aucun")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "crm_aucun" ? "bg-slate-700 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-slate-500"/> Sans Pack</div>
            <span className="text-xs bg-slate-800/50 px-2 rounded-full">{countSansPack}</span>
          </button>

          <p className="text-[10px] font-black uppercase text-slate-600 mb-2 mt-6 tracking-widest px-2">Packs d'entraînement</p>
          {Object.entries(OFFERS_CONFIG).map(([key, config]) => {
            const isActive = activeTab === `crm_${key}`;
            return (
              <button key={key} onClick={() => setActiveTab(`crm_${key}`)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isActive ? `${config.color} text-white` : "text-slate-400 hover:bg-slate-900"}`}>
                <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : config.color.replace('bg-', 'bg-').replace('-600', '-500').replace('-700', '-500').replace('-900', '-500')}`} /> {config.name}</div>
                <span className="text-xs bg-slate-800/50 px-2 rounded-full">{countPack(key)}</span>
              </button>
            )
          })}

          <p className="text-[10px] font-black uppercase text-slate-600 mb-2 mt-6 tracking-widest px-2">Plateforme</p>
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "overview" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <Zap className="w-4 h-4" /> Vue d'ensemble
          </button>
          <button onClick={() => setActiveTab("actions")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "actions" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Activity className="w-4 h-4" /> Actions Clients</div>
            <span className="text-xs bg-slate-800/50 px-2 rounded-full">{clientActivities.length}</span>
          </button>
          <button onClick={() => setActiveTab("examens")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "examens" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <BarChart3 className="w-4 h-4" /> Radar Simulateurs
          </button>
          <button onClick={() => setActiveTab("missions")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "missions" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Target className="w-4 h-4" /> Missions & Devoirs</div>
            {pendingMissionSubmissionsCount > 0 && (
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{pendingMissionSubmissionsCount}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("coaching")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "coaching" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><CalendarCheck className="w-4 h-4" /> Coaching</div>
            {coachingAppointments.filter(a => a.status === "pending").length > 0 && (
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{coachingAppointments.filter(a => a.status === "pending").length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("centres")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "centres" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Building2 className="w-4 h-4" /> Centres B2B</div>
            {centerApplications.filter(c => c.status === "new").length > 0 && (
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{centerApplications.filter(c => c.status === "new").length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("messages")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "messages" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><MessageCircle className="w-4 h-4" /> Messages Privés</div>
            {conversations.filter(c => c.unread > 0).length > 0 && (
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{conversations.reduce((acc, c) => acc + c.unread, 0)}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("support")} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "support" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <div className="flex items-center gap-3"><Headphones className="w-4 h-4" /> Support Client</div>
            {supportConversations.filter(c => c.unread > 0).length > 0 && (
              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{supportConversations.reduce((acc, c) => acc + c.unread, 0)}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("communaute")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "communaute" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <MessageCircle className="w-4 h-4" /> Modération Forum
          </button>
          <button onClick={() => setActiveTab("retours")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "retours" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <MessageCircle className="w-4 h-4" /> Retours Utilisateurs
          </button>
          <button onClick={() => setActiveTab("feedbacks")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "feedbacks" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <Star className="w-4 h-4" /> Avis Clients
          </button>
          <button onClick={() => setActiveTab("push")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "push" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-slate-900"}`}>
            <BellRing className="w-4 h-4" /> Notifications Push
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-y-auto">
        <header className="min-h-[4rem] md:h-20 px-4 md:px-8 py-3 md:py-0 flex items-center gap-3 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white transition-colors shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <div className="relative flex-1 md:w-96 md:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Chercher un étudiant..." className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-orange-500 text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <button onClick={exportToCSV} className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"><Download className="w-4 h-4" /><span className="hidden sm:inline">Exporter CSV</span></button>
            <button onClick={exportToPDF} className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"><Download className="w-4 h-4" /><span className="hidden sm:inline">Exporter PDF</span></button>
            <button onClick={broadcastMessage} className="px-3 md:px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /><span className="hidden sm:inline">Annonce</span></button>
            <div className="font-mono font-bold text-orange-400 flex items-center gap-1.5 border-l border-slate-800 pl-3 md:pl-4 text-xs md:text-sm"><Activity className="w-4 h-4 animate-pulse" />{currentTime}</div>
          </div>
        </header>

        <div className="p-4 md:p-8">

          {/* 👥 ONGLET CRM */}
          {activeTab.startsWith("crm") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    {activeTab === "crm_all" ? "Tous les étudiants" :
                     activeTab === "crm_aucun" ? "Étudiants Classiques (Sans Pack)" :
                     OFFERS_CONFIG[activeTab.replace('crm_', '') as keyof typeof OFFERS_CONFIG]?.name}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Gérez les accès, surveillez la consommation et effectuez les upgrades.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" /> Créer un compte
                </button>
              </div>

              {(() => {
                const sc = students.filter(s => classFilter === 'all' || s.formation === classFilter);
                const cAll = sc.length;
                const cActifs = sc.filter(s => s.tag_status !== 'revoque' && s.tag_status !== 'termine' && !s.subscription_paused_at && !!s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now).length;
                const cPaused = sc.filter(s => s.tag_status !== 'revoque' && s.tag_status !== 'termine' && !!s.subscription_paused_at).length;
                const cExpires = sc.filter(s => {
                  if (s.tag_status === 'revoque' || s.tag_status === 'termine') return false;
                  if (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now) return false;
                  const noPack = !hasActivatedPack(s);
                  return noPack && !!s.created_at && (now - new Date(s.created_at).getTime()) > 24 * 3600 * 1000;
                }).length;
                const cTermines = sc.filter(s => s.tag_status === 'termine').length;
                const cRevoques = sc.filter(s => s.tag_status === 'revoque').length;
                const badge = (n: number, active: boolean) => (
                  <span className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-md ${active ? "bg-white/25 text-white" : "bg-slate-800 text-slate-400"}`}>{n}</span>
                );
                return (
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mb-6 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button onClick={() => setClassFilter('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${classFilter === 'all' ? "bg-orange-600 text-white" : "text-slate-400 hover:text-white"}`}>Toutes classes</button>
                      <button onClick={() => setClassFilter('tcf')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${classFilter === 'tcf' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>TCF Canada</button>
                      <button onClick={() => setClassFilter('anglais')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${classFilter === 'anglais' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>Anglais IELTS</button>
                    </div>
                    <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                      <button onClick={() => setStatusFilter('all')} className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'all' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>Tous{badge(cAll, statusFilter === 'all')}</button>
                      <button onClick={() => setStatusFilter('premium')} className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'premium' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>Actifs{badge(cActifs, statusFilter === 'premium')}</button>
                      <button onClick={() => setStatusFilter('paused')} className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'paused' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"}`}>En pause{badge(cPaused, statusFilter === 'paused')}</button>
                      <button onClick={() => setStatusFilter('expire')} className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'expire' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"}`}>Expirés{badge(cExpires, statusFilter === 'expire')}</button>
                      <button onClick={() => setStatusFilter('termine')} className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'termine' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>Terminés{badge(cTermines, statusFilter === 'termine')}</button>
                      <button onClick={() => setStatusFilter('revoque')} className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'revoque' ? "bg-red-700 text-white" : "text-slate-400 hover:text-white"}`}>Révoqués{badge(cRevoques, statusFilter === 'revoque')}</button>
                    </div>
                  </div>
                );
              })()}

              {/* Mobile cards */}
              <div className="block md:hidden space-y-3 mb-4">
                {loading ? (
                  <div className="p-8 text-center text-slate-500 animate-pulse font-bold uppercase text-xs">Synchronisation...</div>
                ) : students
                  .filter(s => s.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone?.includes(searchQuery))
                  .filter(s => classFilter === 'all' || s.formation === classFilter)
                  .filter(s => {
                    if (activeTab === "crm_all") return true;
                    if (activeTab === "crm_aucun") return !hasActivatedPack(s);
                    return hasActivatedPack(s) && s.pack_name === activeTab.replace('crm_', '');
                  })
                  .filter(s => {
                    if (statusFilter === 'all') return true;
                    if (statusFilter === 'paused') return !!s.subscription_paused_at && s.tag_status !== 'revoque' && s.tag_status !== 'termine';
                    if (statusFilter === 'revoque') return s.tag_status === 'revoque';
                    if (s.tag_status === 'revoque') return false;
                    if (statusFilter === 'termine') return s.tag_status === 'termine';
                    if (s.tag_status === 'termine') return false;
                    const isPm = !s.subscription_paused_at && s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now;
                    if (statusFilter === 'premium') return !!isPm;
                    if (statusFilter === 'expire') {
                      const noPack = !hasActivatedPack(s);
                      const trialExpired = s.created_at && (now - new Date(s.created_at).getTime()) > 24 * 3600 * 1000;
                      return !isPm && noPack && !!trialExpired;
                    }
                    return true;
                  })
                  .map(student => {
                    const pauseReference = student.subscription_paused_at ? new Date(student.subscription_paused_at).getTime() : now;
                    const isPm = student.subscription_ends_at && new Date(student.subscription_ends_at).getTime() > pauseReference;
                    const dleft = isPm ? Math.ceil((new Date(student.subscription_ends_at!).getTime() - pauseReference) / (1000 * 3600 * 24)) : 0;
                    const cfg = getStudentOfferConfig(student);
                    const isTrialAccess = isTrialAccessProfile(student);
                    const canRelance = !hasActivatedPack(student) && student.tag_status !== 'revoque' && student.tag_status !== 'termine';
                    let statStr = "Expiré"; let statColor = "text-red-400 bg-red-500/10 border-red-500/30";
                    if (isPm && isTrialAccess) {
                      statStr = "Essai 24h";
                      statColor = "text-orange-400 bg-orange-500/10 border-orange-500/30";
                    }
                    if (!isPm && student.created_at) {
                      const age = Math.floor((now - new Date(student.created_at).getTime()) / (1000 * 3600 * 24));
                      if (age < 3) { statStr = `Essai (Jour ${age + 1})`; statColor = "text-orange-400 bg-orange-500/10 border-orange-500/30"; }
                      else if (age < 5) { statStr = "En Grâce"; statColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"; }
                    }
                    return (
                      <div key={student.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-orange-500 shrink-0">{student.prenom?.charAt(0) || "U"}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white">{student.prenom || "Sans nom"}</p>
                            {student.email && <p className="text-xs text-slate-400 truncate">{student.email}</p>}
                            {student.phone && <p className="text-xs text-slate-400">{student.phone}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            {isPm && cfg ? (
                              <>
                                <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-black ${cfg.color} text-white`}>{cfg.name}</span>
                                <p className={`text-[10px] font-bold mt-1 ${student.subscription_paused_at ? "text-amber-400" : "text-emerald-400"}`}>{student.subscription_paused_at ? `En pause · ${dleft}j conservés` : `${dleft}j restants`}</p>
                              </>
                            ) : (
                              <>
                                <span className={`text-[10px] px-2 py-1 rounded-md border uppercase font-black ${statColor}`}>{statStr}</span>
                                {isPm && isTrialAccess && <p className="text-[10px] font-bold text-orange-400 mt-1">{dleft}j restant{dleft > 1 ? "s" : ""}</p>}
                              </>
                            )}
                          </div>
                        </div>
                        {isPm && cfg && (
                          <div className="grid grid-cols-3 gap-1.5 mb-3">
                            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-center">
                              <p className="text-[8px] text-slate-500 font-bold uppercase">Zen EE</p>
                              <p className="text-xs font-black text-white">{student.ee_total === 9999 ? "∞" : `${Math.max(0, (student.ee_total||0)-(student.ee_used||0))}/${student.ee_total||0}`}</p>
                            </div>
                            <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-center">
                              <p className="text-[8px] text-slate-500 font-bold uppercase">Examens</p>
                              <p className="text-xs font-black text-white">{student.exam_total === 9999 ? "∞" : `${Math.max(0, (student.exam_total||0)-(student.exam_used||0))}/${student.exam_total||0}`}</p>
                            </div>
                            <div className={`p-1.5 rounded-lg border text-center ${cfg.coaching > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-slate-950 border-slate-800 opacity-40"}`}>
                              <p className={`text-[8px] font-bold uppercase ${cfg.coaching > 0 ? "text-orange-400" : "text-slate-500"}`}>Coaching</p>
                              <p className={`text-xs font-black ${cfg.coaching > 0 ? "text-orange-500" : "text-slate-600"}`}>{student.coaching_total === 9999 ? "Inclus" : `${Math.max(0, (student.coaching_total||0)-(student.coaching_used||0))}/${student.coaching_total||0}`}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setSelectedStudent(student); setPackModalOpen(true); }} className="flex-1 bg-white text-slate-900 hover:bg-orange-500 hover:text-white text-xs font-black uppercase py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95">
                            <Award size={13} /> {hasActivatedPack(student) ? "Changer Pack" : "Activer Pack"}
                          </button>
                          {canRelance && (
                            <button onClick={() => relanceStudent(student)} className="px-3 py-2.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl text-xs font-black flex items-center gap-1 border border-[#25D366]/30 transition-colors">
                              <MessageCircleCode size={12} /> Relance ({student.relance_count || 0})
                            </button>
                          )}
                          <button onClick={() => generateNewPassword(student.email)} className="px-3 py-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors">
                            <Key size={12} /> PIN
                          </button>
                          <button onClick={() => sendNotification(student.id, student.prenom)} className="px-3 py-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors">
                            <Bell size={12} /> Msg
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800">
                          {student.tag_status !== 'revoque' && student.tag_status !== 'termine' ? (
                            <>
                              <button onClick={() => cancelSubscription(student.id, student.prenom)} className="text-[10px] text-red-500/70 hover:text-red-400 font-bold uppercase flex items-center gap-1 transition-colors"><Ban size={10} /> Révoquer</button>
                              {hasActivatedPack(student) && (
                                <>
                                  <button disabled={packActionId === student.id} onClick={() => togglePackPause(student)} className={`text-[10px] font-bold uppercase flex items-center gap-1 transition-colors disabled:opacity-50 ${student.subscription_paused_at ? "text-emerald-400 hover:text-emerald-300" : "text-amber-400/80 hover:text-amber-300"}`}>
                                    {student.subscription_paused_at ? <Play size={10} /> : <Pause size={10} />} {student.subscription_paused_at ? "Réactiver" : "Pause"}
                                  </button>
                                  <button onClick={() => markAsTermine(student.id, student.prenom)} className="text-[10px] text-blue-400/70 hover:text-blue-400 font-bold uppercase flex items-center gap-1 transition-colors"><CheckCircle size={10} /> Terminé</button>
                                </>
                              )}
                            </>
                          ) : (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${student.tag_status === 'revoque' ? 'text-red-400 border-red-800 bg-red-900/20' : 'text-blue-400 border-blue-800 bg-blue-900/20'}`}>
                              {student.tag_status === 'revoque' ? '⛔ Révoqué' : '✅ Terminé'}
                            </span>
                          )}
                          <button onClick={() => setStudentToDelete(student)} className="ml-auto text-[10px] text-slate-600 hover:text-red-500 font-bold uppercase flex items-center gap-1 transition-colors"><Trash2 size={10} /> Supprimer</button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl pb-10">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="p-5">Étudiant & Contact</th>
                      <th className="p-5">Statut & Progression Quotas</th>
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {loading ? (
                      <tr><td colSpan={3} className="p-10 text-center text-slate-500 animate-pulse font-bold uppercase text-xs">Synchronisation...</td></tr>
                    ) : students
                      .filter(s => s.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone?.includes(searchQuery))
                      .filter(s => classFilter === 'all' || s.formation === classFilter)
                      .filter(s => {
                        if (activeTab === "crm_all") return true;
                        if (activeTab === "crm_aucun") return !hasActivatedPack(s);
                        return hasActivatedPack(s) && s.pack_name === activeTab.replace('crm_', '');
                      })
                      .filter(s => {
                        if (statusFilter === 'all') return true;
                        if (statusFilter === 'paused') return !!s.subscription_paused_at && s.tag_status !== 'revoque' && s.tag_status !== 'termine';
                        if (statusFilter === 'revoque') return s.tag_status === 'revoque';
                        if (s.tag_status === 'revoque') return false;
                        if (statusFilter === 'termine') return s.tag_status === 'termine';
                        if (s.tag_status === 'termine') return false;
                        const isPremium = !s.subscription_paused_at && s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now;
                        const hadPack = s.pack_name && s.pack_name !== 'aucun';
                        if (statusFilter === 'premium') return !!isPremium;
                        if (statusFilter === 'expire') {
                          // Essai expiré : aucun pack souscrit, compte > 24 heures
                          const noPack = !hasActivatedPack(s);
                          const trialExpired = s.created_at && (now - new Date(s.created_at).getTime()) > 24 * 3600 * 1000;
                          return !isPremium && noPack && !!trialExpired;
                        }
                        return true;
                      })
                      .map((student) => {
                        const pauseReference = student.subscription_paused_at ? new Date(student.subscription_paused_at).getTime() : now;
                        let isPremium = student.subscription_ends_at && new Date(student.subscription_ends_at).getTime() > pauseReference;
                        let daysLeft = isPremium ? Math.ceil((new Date(student.subscription_ends_at!).getTime() - pauseReference) / (1000 * 3600 * 24)) : 0;
                        const config = getStudentOfferConfig(student);
                        const isTrialAccess = isTrialAccessProfile(student);
                        const canRelance = !hasActivatedPack(student) && student.tag_status !== 'revoque' && student.tag_status !== 'termine';

                        return (
                          <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-5 w-1/4">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-orange-500 shrink-0 mt-1">{student.prenom?.charAt(0) || "U"}</div>
                                <div>
                                  <p className="font-bold text-white text-base">{student.prenom || "Sans nom"}</p>
                                  <div className="flex flex-col gap-1 mt-2">
                                    {student.email && <span className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3"/> {student.email}</span>}
                                    {student.phone && <span className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3"/> {student.phone}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-5">
                              {/* 📊 CAS 1 : C'est un nouveau Pack avec des quotas */}
                              {isPremium && config ? (
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className={`text-[10px] px-3 py-1 rounded-md uppercase font-black ${config.color} text-white tracking-widest shadow-sm`}>{config.name}</span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${student.subscription_paused_at ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"}`}><Timer size={10} className="inline mr-1"/> {student.subscription_paused_at ? `En pause · ${daysLeft}j conservés` : `${daysLeft}j restants`}</span>
                                  </div>
                                  
                                  {/* 🎯 L'AFFICHAGE DU ADMIN EST MAINTENANT : RESTANT / TOTAL */}
                                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-1">
                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Mode Zen EE</span>
                                      <span className="text-sm font-black text-white">{student.ee_total === 9999 ? "∞" : `${Math.max(0, (student.ee_total || 0) - (student.ee_used || 0))} / ${student.ee_total || 0}`}</span>
                                    </div>
                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Examens EE</span>
                                      <span className="text-sm font-black text-white">{student.exam_total === 9999 ? "∞" : `${Math.max(0, (student.exam_total || 0) - (student.exam_used || 0))} / ${student.exam_total || 0}`}</span>
                                    </div>
                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Examens 4M</span>
                                      <span className="text-sm font-black text-white">{student.exam_4m_total === 9999 ? "∞" : `${Math.max(0, (student.exam_4m_total || 0) - (student.exam_4m_used || 0))} / ${student.exam_4m_total || 0}`}</span>
                                    </div>
                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col items-center justify-center text-center">
                                      <span className="text-[9px] text-slate-500 font-bold uppercase mb-1">Simulations EO</span>
                                      <span className="text-sm font-black text-white">{student.eo_total === 9999 ? "∞" : `${Math.max(0, (student.eo_total || 0) - (student.eo_used || 0))} / ${student.eo_total || 0}`}</span>
                                    </div>
                                    <div className={`p-2 rounded-lg border flex flex-col items-center justify-center text-center ${config.coaching > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-slate-950 border-slate-800 opacity-40"}`}>
                                      <span className={`text-[9px] font-bold uppercase mb-1 ${config.coaching > 0 ? "text-orange-400" : "text-slate-500"}`}>Coaching</span>
                                      <span className={`text-sm font-black ${config.coaching > 0 ? "text-orange-500" : "text-slate-600"}`}>{student.coaching_total === 9999 ? "Inclus" : `${Math.max(0, (student.coaching_total || 0) - (student.coaching_used || 0))} / ${student.coaching_total || 0}`}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : 
                              /* 📊 CAS 2 : Classique / Expiré / Essai */
                              (
                                (() => {
                                  let statutStr = "Expiré";
                                  let detailStr = "Accès restreint";
                                  let colorClass = "text-red-400 bg-red-500/10 border-red-500/30";
                                  
                                  if (isPremium && isTrialAccess) {
                                    statutStr = "Essai 24h";
                                    detailStr = `${daysLeft}j restants`;
                                    colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/30";
                                  }
                                  if (!isPremium && student.created_at) {
                                    const ageDays = Math.floor((now - new Date(student.created_at).getTime()) / (1000 * 3600 * 24));
                                    if (ageDays < 3) {
                                      statutStr = `Essai (Jour ${ageDays + 1})`;
                                      detailStr = "Période gratuite";
                                      colorClass = "text-orange-400 bg-orange-500/10 border-orange-500/30";
                                    } else if (ageDays < 5) {
                                      statutStr = "En Grâce";
                                      detailStr = "Paiement attendu";
                                      colorClass = "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
                                    }
                                  }
                                  return (
                                    <div className="flex flex-col items-start gap-2">
                                      <span className={`text-[10px] px-3 py-1 rounded-md border uppercase tracking-widest font-black ${colorClass}`}>{statutStr}</span>
                                      <p className="text-xs text-slate-500">{detailStr}</p>
                                    </div>
                                  )
                                })()
                              )}
                            </td>

                            <td className="p-5 text-right align-top">
                              <div className="flex flex-col items-end gap-2">
                                <button onClick={() => { setSelectedStudent(student); setPackModalOpen(true); }} className="bg-white text-slate-900 hover:bg-orange-500 hover:text-white hover:border-transparent text-[10px] font-black uppercase px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all">
                                  <Award size={14} /> {hasActivatedPack(student) ? "Changer Pack" : "Activer un Pack"}
                                </button>
                                {canRelance && (
                                  <button onClick={() => relanceStudent(student)} className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/30 text-[10px] font-black uppercase px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all">
                                    <MessageCircleCode size={14} /> Relance ({student.relance_count || 0})
                                  </button>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                  <button onClick={() => generateNewPassword(student.email)} className="text-[9px] text-slate-500 hover:text-white font-bold uppercase flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700"><Key size={10} /> PIN</button>
                                  <button onClick={() => sendNotification(student.id, student.prenom)} className="text-[9px] text-slate-500 hover:text-white font-bold uppercase flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700"><Bell size={10} /> Message</button>
                                </div>

                                {student.tag_status !== 'revoque' && student.tag_status !== 'termine' && (
                                  <>
                                    <button onClick={() => cancelSubscription(student.id, student.prenom)} className="text-[9px] text-red-500/70 hover:text-red-400 font-bold uppercase flex items-center gap-1 mt-2 transition-colors">
                                      <Ban size={10} /> Révoquer l'accès
                                    </button>
                                    {hasActivatedPack(student) && (
                                      <>
                                        <button disabled={packActionId === student.id} onClick={() => togglePackPause(student)} className={`text-[9px] font-bold uppercase flex items-center gap-1 transition-colors disabled:opacity-50 ${student.subscription_paused_at ? "text-emerald-400 hover:text-emerald-300" : "text-amber-400/80 hover:text-amber-300"}`}>
                                          {student.subscription_paused_at ? <Play size={10} /> : <Pause size={10} />} {student.subscription_paused_at ? "Réactiver le pack" : "Mettre en pause"}
                                        </button>
                                        <button onClick={() => markAsTermine(student.id, student.prenom)} className="text-[9px] text-blue-400/70 hover:text-blue-400 font-bold uppercase flex items-center gap-1 transition-colors">
                                          <CheckCircle size={10} /> Marquer terminé
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                                {student.tag_status === 'revoque' && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border text-red-400 border-red-800 bg-red-900/20 mt-2">
                                    ⛔ Révoqué
                                  </span>
                                )}
                                {student.tag_status === 'termine' && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border text-blue-400 border-blue-800 bg-blue-900/20 mt-2">
                                    ✅ Terminé
                                  </span>
                                )}

                                <button onClick={() => setStudentToDelete(student)} className="text-[9px] text-slate-600 hover:text-red-500 font-bold uppercase flex items-center gap-1 mt-1 transition-colors border-t border-slate-800 pt-2 w-full justify-end">
                                  <Trash2 size={10} /> Supprimer le compte
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ⚡ VUE D'ENSEMBLE */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-6"><Zap className="text-orange-500 w-7 h-7" /> Vue d'ensemble</h2>

                {/* KPIs principaux */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                  <div className="bg-slate-900 border border-orange-500/30 p-5 rounded-[1.5rem] relative overflow-hidden">
                    <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-3">En ligne maintenant</p>
                    <p className="text-4xl font-black text-orange-500">{onlineUsers.length}</p>
                    <p className="text-xs text-slate-500 mt-1">sur la plateforme</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-[1.5rem]">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Total étudiants</p>
                    <p className="text-4xl font-black text-white">{students.length}</p>
                    <p className="text-xs text-slate-500 mt-1">{students.filter(s => { const d = new Date(s.created_at); return (now - d.getTime()) < 7*24*3600*1000; }).length} cette semaine</p>
                  </div>
                  <div className="bg-slate-900 border border-emerald-500/20 p-5 rounded-[1.5rem]">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-3">Premium actifs</p>
                    <p className="text-4xl font-black text-emerald-400">{students.filter(s => !s.subscription_paused_at && s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now).length}</p>
                    <p className="text-xs text-slate-500 mt-1">abonnements en cours</p>
                  </div>
                  <div className="bg-slate-900 border border-amber-500/20 p-5 rounded-[1.5rem]">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-3">Packs en pause</p>
                    <p className="text-4xl font-black text-amber-400">{students.filter(s => !!s.subscription_paused_at).length}</p>
                    <p className="text-xs text-slate-500 mt-1">jours conservés</p>
                  </div>
                  <div className="bg-slate-900 border border-amber-500/20 p-5 rounded-[1.5rem]">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-3">En essai</p>
                    <p className="text-4xl font-black text-amber-400">{students.filter(s => { if (s.subscription_paused_at || (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now)) return false; const age = now - new Date(s.created_at).getTime(); return age < 3*24*3600*1000; }).length}</p>
                    <p className="text-xs text-slate-500 mt-1">période gratuite</p>
                  </div>
                  <div className="bg-slate-900 border border-red-500/20 p-5 rounded-[1.5rem]">
                    <p className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-3">Expirés</p>
                    <p className="text-4xl font-black text-red-400">{students.filter(s => { if (s.subscription_paused_at || (s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now)) return false; const age = now - new Date(s.created_at).getTime(); return age >= 3*24*3600*1000; }).length}</p>
                    <p className="text-xs text-slate-500 mt-1">à convertir</p>
                  </div>
                </div>

                {/* Répartition des packs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions clients - 7 jours</p>
                      <button onClick={() => setActiveTab("actions")} className="text-[10px] font-black uppercase text-orange-400 hover:text-orange-300">Voir tout</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <p className="text-2xl font-black text-white">{clientActivities.length}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">actions</p>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <p className="text-2xl font-black text-orange-400">{activeClientCount7d}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">clients actifs</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {clientActivities.slice(0, 4).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-white truncate">{activity.profiles?.prenom || activity.profiles?.email || "Client"}</p>
                            <p className="text-[11px] text-slate-400 truncate">{activity.action}</p>
                          </div>
                          <span className="text-[10px] text-slate-600 shrink-0">{new Date(activity.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      ))}
                      {!clientActivitiesLoading && clientActivities.length === 0 && (
                        <p className="text-xs text-slate-500 font-bold">{clientActivitiesError || "Aucune action enregistree pour le moment."}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-5">Répartition des packs</p>
                    <div className="space-y-3">
                      {Object.entries(OFFERS_CONFIG).map(([key, config]) => {
                        const count = countPack(key);
                        const pct = students.length ? Math.round((count / students.length) * 100) : 0;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-300">{config.name}</span>
                              <span className="text-xs font-black text-white">{count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${config.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-500">Sans pack</span>
                          <span className="text-xs font-black text-slate-400">{countSansPack}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-600 rounded-full" style={{ width: `${students.length ? Math.round((countSansPack / students.length) * 100) : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-5">Avis clients</p>
                    <div className="flex items-end gap-4 mb-5">
                      <p className="text-5xl font-black text-white">{avgRating}</p>
                      <div className="pb-1">
                        <div className="flex gap-0.5 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`w-4 h-4 ${parseFloat(avgRating) >= i ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">{feedbacks.length} avis · {pinnedCount} épinglés</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[5,4,3,2,1].map(rating => {
                        const count = feedbacks.filter(f => f.rating === rating).length;
                        const pct = feedbacks.length ? Math.round((count / feedbacks.length) * 100) : 0;
                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-4">{rating}★</span>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Indexation bibliothèque */}
                  <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Bibliothèque — Recherche plein texte</p>
                    <p className="text-xs text-slate-500 mb-5">Extrait et indexe le contenu textuel des PDFs pour activer la recherche interne dans les livres.</p>
                    <button
                      onClick={handleIndexPdfs}
                      disabled={indexingPdfs}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition"
                    >
                      <FileDown size={16} />
                      {indexingPdfs ? "Indexation en cours…" : "Indexer les PDFs"}
                    </button>
                    {indexResults && (
                      <>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-emerald-400">{indexResults.indexed}</p>
                            <p className="text-[10px] text-emerald-500 font-bold uppercase">Indexés</p>
                          </div>
                          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-slate-400">{indexResults.skipped}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Ignorés</p>
                          </div>
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                            <p className="text-lg font-black text-red-400">{indexResults.errors}</p>
                            <p className="text-[10px] text-red-500 font-bold uppercase">Erreurs</p>
                          </div>
                        </div>
                        {indexResults.errorDetails.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {indexResults.errorDetails.map((msg, i) => (
                              <p key={i} className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-1.5 font-mono break-all">{msg}</p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Inscriptions récentes */}
                  <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-6">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-5">Dernières inscriptions</p>
                  <div className="divide-y divide-slate-800">
                    {students.slice(0, 8).map(s => {
                      const isPremium = s.subscription_ends_at && new Date(s.subscription_ends_at).getTime() > now;
                      return (
                        <div key={s.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-500 text-xs">{s.prenom?.charAt(0) || "?"}</div>
                            <div>
                              <p className="text-sm font-bold text-white">{s.prenom || "–"}</p>
                              <p className="text-[10px] text-slate-500">{s.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${isPremium ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-slate-500 border-slate-700 bg-slate-800"}`}>
                              {isPremium ? (s.pack_name || "Premium") : "Gratuit"}
                            </span>
                            <span className="text-[10px] text-slate-600">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>{/* end inscriptions card */}
                </div>{/* end 2-col grid */}
              </div>
            </motion.div>
          )}

          {/* 📊 AUTRES ONGLETS */}
          {activeTab === "actions" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Activity className="text-orange-500 w-7 h-7" /> Actions Clients
                  </h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Historique automatique conserve pendant 7 jours
                  </p>
                </div>
                <button
                  onClick={fetchClientActivities}
                  disabled={clientActivitiesLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCcw className={`w-4 h-4 ${clientActivitiesLoading ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-5">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Actions enregistrees</p>
                  <p className="text-4xl font-black text-white">{clientActivities.length}</p>
                  <p className="text-xs text-slate-500 mt-1">sur les 7 derniers jours</p>
                </div>
                <div className="bg-slate-900 border border-orange-500/20 rounded-[1.5rem] p-5">
                  <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-3">Clients actifs</p>
                  <p className="text-4xl font-black text-orange-400">{activeClientCount7d}</p>
                  <p className="text-xs text-slate-500 mt-1">au moins une action</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-5">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Recherche</p>
                  <p className="text-4xl font-black text-white">{filteredActivityStudents.length}</p>
                  <p className="text-xs text-slate-500 mt-1">etudiants affiches</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Etudiants</p>
                  </div>

                  {clientActivitiesLoading && (
                    <div className="p-8 text-center text-sm font-bold text-slate-500">Chargement des etudiants...</div>
                  )}

                  {!clientActivitiesLoading && clientActivitiesError && (
                    <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
                      {clientActivitiesError}
                    </div>
                  )}

                  {!clientActivitiesLoading && !clientActivitiesError && filteredActivityStudents.length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm font-black text-white">Aucun etudiant trouve</p>
                      <p className="text-xs text-slate-500 mt-1">Les etudiants apparaitront ici des qu'une activite est detectee.</p>
                    </div>
                  )}

                  <div className="divide-y divide-slate-800">
                    {!clientActivitiesLoading && filteredActivityStudents.map((item) => {
                      const profile = item.profiles;
                      const isSelected = selectedActivityUserId === item.user_id;
                      return (
                        <button
                          key={item.user_id}
                          onClick={() => setSelectedActivityUserId(item.user_id)}
                          className={`w-full text-left px-5 py-4 transition-colors ${isSelected ? "bg-orange-500/10" : "hover:bg-slate-950/60"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isSelected ? "bg-orange-500 text-white" : "bg-slate-800 text-orange-400"}`}>
                              {(profile?.prenom || profile?.email || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-white truncate">{profile?.prenom || "Client sans nom"}</p>
                              <p className="text-[11px] text-slate-500 truncate">{profile?.email || "Email indisponible"}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-flex rounded-full bg-slate-950 border border-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300">
                                {item.count}
                              </span>
                              <p className="text-[10px] text-slate-600 mt-1">{new Date(item.latest_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden min-h-[420px]">
                  <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Activites de l'etudiant</p>
                      <p className="text-lg font-black text-white truncate">
                        {selectedActivityStudent?.profiles?.prenom || selectedActivityStudent?.profiles?.email || "Selectionnez un etudiant"}
                      </p>
                    </div>
                    {selectedActivityStudent && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase text-slate-400">
                          {selectedClientActivities.length} action{selectedClientActivities.length > 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={exportSelectedActivityPdf}
                          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {!selectedActivityUserId && (
                    <div className="h-[340px] flex items-center justify-center p-8 text-center">
                      <div>
                        <Activity className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                        <p className="text-sm font-black text-white">Cliquez sur un etudiant</p>
                        <p className="text-xs text-slate-500 mt-1">Son historique des 7 derniers jours s'affichera ici.</p>
                      </div>
                    </div>
                  )}

                  {selectedActivityUserId && selectedClientActivities.length === 0 && (
                    <div className="p-8 text-center text-sm font-bold text-slate-500">Aucune activite pour cet etudiant.</div>
                  )}

                  {selectedActivityUserId && selectedClientActivities.length > 0 && (
                    <div className="divide-y divide-slate-800">
                      {selectedClientActivities.map((activity) => (
                        <div key={activity.id} className="px-5 py-4">
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                              <Activity className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-sm font-black text-orange-300">{activity.action}</p>
                                <span className="text-[10px] font-mono text-slate-600">
                                  {new Date(activity.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} - {new Date(activity.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              {activity.details && <p className="text-xs text-slate-400 leading-relaxed">{activity.details}</p>}
                              {activity.user_agent && <p className="text-[10px] text-slate-600 mt-2 truncate">{activity.user_agent}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "examens" && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-3"><Radar className="text-emerald-500 w-7 h-7" /> Radar Simulateurs</h2>
              </div>

              {/* Stats live */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-[2rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" /></div>
                  <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-4">Sur les Simulateurs</p>
                  <p className="text-4xl font-black text-white">{onSimulatorCount}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-4 flex items-center gap-2"><Timer size={14}/> Mode Examen</p>
                  <p className="text-4xl font-black text-orange-500">{countInExam}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-4 flex items-center gap-2"><BookOpen size={14}/> Mode Zen</p>
                  <p className="text-4xl font-black text-blue-500">{countInZen}</p>
                </div>
              </div>

              {/* Historique par jour */}
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-5 flex items-center gap-2">
                  <Activity size={12} /> Historique — 30 derniers jours
                </p>

                {simHistoryLoading && (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                )}

                {!simHistoryLoading && simHistory.length === 0 && (
                  <p className="text-slate-600 text-sm italic text-center py-8">Aucune activité simulateur enregistrée.</p>
                )}

                {!simHistoryLoading && simHistory.length > 0 && (() => {
                  const maxCount = Math.max(...simHistory.map(d => d.count), 1);
                  return (
                    <div className="space-y-2">
                      {simHistory.map((day) => {
                        const isExpanded = expandedDay === day.date;
                        const barWidth = Math.max((day.count / maxCount) * 100, 4);
                        const label = new Date(day.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
                        return (
                          <div key={day.date}>
                            <button
                              onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                              className="w-full flex items-center gap-3 group hover:bg-slate-800/50 rounded-xl px-3 py-2 transition-colors"
                            >
                              <span className="text-[10px] font-black text-slate-500 w-20 shrink-0 text-left uppercase">{label}</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-white w-6 text-right shrink-0">{day.count}</span>
                              <span className="text-[9px] text-slate-600 shrink-0">{isExpanded ? "▲" : "▼"}</span>
                            </button>

                            {isExpanded && (
                              <div className="ml-24 mt-1 mb-2 flex flex-wrap gap-2">
                                {day.uniqueUsers.map((u, i) => {
                                  const modeColor = u.mode === "examen" ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                    : u.mode === "oral" ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20";
                                  return (
                                    <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${modeColor}`}>
                                      {u.prenom} · {u.mode}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* 🎯 MISSIONS & DEVOIRS */}
          {activeTab === "missions" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Missions & Devoirs</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Déployer des exercices aux étudiants</p>
                </div>
              </div>

              {/* Formulaire nouvelle mission */}
              <form onSubmit={deployMission} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-5 mb-8">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nouvelle mission</p>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Titre *</label>
                  <input type="text" placeholder="ex: Rédige un paragraphe sur ton quartier idéal" value={newMission.title} onChange={e => setNewMission(m => ({ ...m, title: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Description / Consigne</label>
                  <textarea rows={3} placeholder="Détails de la mission, conseils, critères d'évaluation..." value={newMission.description} onChange={e => setNewMission(m => ({ ...m, description: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cible</label>
                  <select value={newMission.target} onChange={e => setNewMission(m => ({ ...m, target: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors">
                    <option value="all">Tous les étudiants</option>
                    <option value="tcf">TCF Canada uniquement</option>
                    <option value="anglais">Anglais uniquement</option>
                    <option value="premium">Premium uniquement</option>
                  </select>
                </div>
                <button type="submit" disabled={isDeploying || !newMission.title.trim()} className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20">
                  {isDeploying ? <><Activity className="w-4 h-4 animate-spin" /> Déploiement...</> : <><Send className="w-4 h-4" /> Déployer la mission</>}
                </button>
              </form>

              {/* Liste des missions */}
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Missions actives ({missions.length})</p>
              <div className="space-y-3">
                {missions.length === 0 && <p className="text-slate-600 text-sm italic text-center py-8">Aucune mission déployée pour l'instant.</p>}
                {missions.map(m => (
                  <div key={m.id} role="button" tabIndex={0} onClick={() => selectMissionAndShowSubmissions(m.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectMissionAndShowSubmissions(m.id); } }} className={`w-full text-left bg-slate-900 border rounded-2xl p-5 flex items-start justify-between gap-4 transition-all cursor-pointer ${selectedMissionId === m.id ? "border-orange-500/60 shadow-lg shadow-orange-500/10" : "border-slate-800 hover:border-orange-500/30"}`}>
                    <div>
                      <p className="font-bold text-white text-sm">{m.title}</p>
                      {m.description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.description}</p>}
                      <p className="text-[10px] text-slate-600 mt-2">{new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
                          {(submissionsByMission[m.id] ?? []).length} soumission{(submissionsByMission[m.id] ?? []).length > 1 ? "s" : ""}
                        </span>
                        {(submissionsByMission[m.id] ?? []).filter((submission: any) => submission.status === "pending_review").length > 0 && (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            {(submissionsByMission[m.id] ?? []).filter((submission: any) => submission.status === "pending_review").length} en attente
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={(event) => { event.stopPropagation(); deleteMission(m.id); }} className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Soumissions rattachees aux missions */}
          {activeTab === "missions" && (
            <motion.div ref={missionSubmissionsRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl mx-auto mt-8">
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden min-h-[360px]">
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Soumissions de la mission</p>
                    <p className="text-lg font-black text-white truncate">{selectedMission?.title || "Cliquez sur une mission"}</p>
                  </div>
                  {selectedMission && (
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase text-slate-400 shrink-0">
                      {selectedMissionSubmissions.length} rendu{selectedMissionSubmissions.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {selectedMission && (
                  <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap gap-2">
                    {[["all", "Toutes"], ["done", "Corrigees IA"], ["pending_review", "En attente"]].map(([val, label]) => (
                      <button key={val} onClick={() => setSubmissionFilter(val as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${submissionFilter === val ? "bg-orange-500 text-white" : "bg-slate-950 border border-slate-800 text-slate-400 hover:border-orange-500/40"}`}>
                        {label}
                        <span className="ml-2 opacity-60">
                          {val === "all" ? selectedMissionSubmissions.length : selectedMissionSubmissions.filter((s: any) => s.status === val).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {!selectedMission && (
                  <div className="h-[280px] flex items-center justify-center p-8 text-center">
                    <div>
                      <FileDown className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                      <p className="text-sm font-black text-white">Selectionnez une mission</p>
                      <p className="text-xs text-slate-500 mt-1">Toutes les reponses des etudiants seront classees ici.</p>
                    </div>
                  </div>
                )}

                {selectedMission && submissionsLoading && (
                  <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Chargement...</p>
                )}

                {selectedMission && !submissionsLoading && filteredSelectedMissionSubmissions.length === 0 && (
                  <p className="text-slate-600 text-sm italic text-center py-10">Aucune soumission pour cette mission.</p>
                )}

                {selectedMission && !submissionsLoading && filteredSelectedMissionSubmissions.length > 0 && (
                  <div className="p-5 space-y-4">
                    {filteredSelectedMissionSubmissions.map(renderSubmissionCard)}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "communaute" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Modération Forum</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Surveiller et modérer les échanges</p>
                </div>
              </div>

              {/* Sélecteur de canal */}
              <div className="flex gap-2 mb-5">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => { setActiveChannel(ch.id); fetchCommunityMessages(ch.id); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeChannel === ch.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-orange-500/40"}`}>
                    {ch.name}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-[1.5rem] p-5 space-y-3 min-h-0 mb-4">
                {communityMessages.length === 0 && <p className="text-slate-600 text-sm italic text-center py-10">Aucun message dans ce canal.</p>}
                {communityMessages.map(msg => (
                  <div key={msg.id} className={`flex items-start gap-3 group ${msg.profiles?.role === 'admin' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${msg.profiles?.role === 'admin' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-orange-400'}`}>
                      {msg.profiles?.prenom?.charAt(0) || "?"}
                    </div>
                    <div className={`max-w-[75%] ${msg.profiles?.role === 'admin' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-500">{msg.profiles?.prenom || "Inconnu"}</span>
                        {msg.profiles?.role === 'admin' && <span className="text-[8px] font-black uppercase text-orange-500 border border-orange-500/30 px-1.5 py-0.5 rounded">Admin</span>}
                        <span className="text-[9px] text-slate-700">{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.profiles?.role === 'admin' ? 'bg-orange-500/10 border border-orange-500/20 text-orange-100' : 'bg-slate-800 text-slate-200'}`}>
                        {msg.message}
                      </div>
                    </div>
                    <button onClick={() => deleteCommunityMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all mt-2 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Envoyer un message */}
              <form onSubmit={sendAdminMessage} className="flex gap-3">
                <input type="text" placeholder="Écrire un message en tant qu'admin..." value={newCommMsg} onChange={e => setNewCommMsg(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors" />
                <button type="submit" disabled={!newCommMsg.trim()} className="px-5 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* 📥 SOUMISSIONS */}
          {activeTab === "soumissions" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <FileDown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Soumissions</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Devoirs rendus par les étudiants</p>
                </div>
              </div>

              {/* Filtres */}
              <div className="flex gap-2 mb-6">
                {[["all", "Toutes"], ["done", "Corrigées IA"], ["pending_review", "En attente"]].map(([val, label]) => (
                  <button key={val} onClick={() => setSubmissionFilter(val as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${submissionFilter === val ? "bg-orange-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-orange-500/40"}`}>
                    {label}
                    <span className="ml-2 opacity-60">
                      {val === "all" ? submissions.length : submissions.filter(s => s.status === val).length}
                    </span>
                  </button>
                ))}
              </div>

              {submissionsLoading && <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Chargement...</p>}

              <div className="space-y-4">
                {submissions
                  .filter(s => submissionFilter === "all" || s.status === submissionFilter)
                  .map((sub) => {
                    const corr = sub.correction;
                    const scoreColor = corr ? (corr.note >= 16 ? "text-emerald-400" : corr.note >= 12 ? "text-blue-400" : corr.note >= 8 ? "text-amber-400" : "text-red-400") : "";

                    return (
                      <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-5 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-500 text-sm shrink-0">
                              {sub.profiles?.prenom?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{sub.profiles?.prenom || "Inconnu"}</p>
                              <p className="text-[10px] text-slate-500">{sub.profiles?.email}</p>
                              <p className="text-xs text-orange-400 font-bold mt-1">{sub.missions?.title}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {corr ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black ${scoreColor}`}>{corr.note}</span>
                                <span className="text-slate-500 text-sm">/20</span>
                                <span className={`text-xs font-black ${scoreColor}`}>{corr.niveau}</span>
                              </div>
                            ) : (
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${sub.status === "pending_review" ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-slate-500 border-slate-700"}`}>
                                {sub.status === "pending_review" ? "En attente" : sub.status}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-600">{new Date(sub.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                        </div>

                        {/* Réponse de l'étudiant */}
                        {sub.answer_text && (
                          <div className="px-5 pb-4 border-t border-slate-800 pt-4">
                            <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Réponse</p>
                            <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{sub.answer_text}</p>
                          </div>
                        )}

                        {/* Fichier */}
                        {sub.file_url && (
                          <div className="px-5 pb-4">
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
                              <FileText className="w-3.5 h-3.5" /> {sub.file_name || "Fichier joint"}
                            </a>
                          </div>
                        )}

                        {/* Correction IA */}
                        {corr && (
                          <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/40">
                            <p className="text-[9px] font-black uppercase text-emerald-400 mb-2">Correction IA</p>
                            <p className="text-xs text-slate-400 italic leading-relaxed">{corr.commentaire_global}</p>
                            {corr.conseil_coach && (
                              <p className="text-xs text-orange-300 mt-2">💡 {corr.conseil_coach}</p>
                            )}
                          </div>
                        )}

                        {sub.admin_comment && (
                          <div className="border-t border-slate-800 px-5 py-4 bg-orange-500/5">
                            <p className="text-[9px] font-black uppercase text-orange-400 mb-2">Commentaire admin</p>
                            <p className="text-sm text-slate-200 leading-relaxed">{sub.admin_comment}</p>
                            {sub.admin_comment_at && (
                              <p className="text-[9px] text-slate-600 mt-2">
                                Envoyé le {new Date(sub.admin_comment_at).toLocaleDateString("fr-FR")}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="border-t border-slate-800 px-5 py-4">
                          <button
                            onClick={() => {
                              const opening = commentOpenId !== sub.id;
                              setCommentOpenId(opening ? sub.id : null);
                              if (opening && !submissionComments[sub.id]) {
                                setSubmissionComments((prev) => ({ ...prev, [sub.id]: sub.admin_comment || "" }));
                              }
                            }}
                            className={`flex items-center gap-2 text-sm font-black transition-colors ${
                              commentOpenId === sub.id ? "text-orange-400" : "text-slate-400 hover:text-orange-400"
                            }`}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Faire un commentaire
                            {commentSentId === sub.id && (
                              <span className="ml-2 text-[10px] text-emerald-400 uppercase tracking-widest">Envoyé</span>
                            )}
                          </button>

                          <AnimatePresence>
                            {commentOpenId === sub.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, y: -8 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -8 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-4 space-y-4">
                                  <textarea
                                    value={submissionComments[sub.id] || ""}
                                    onChange={(e) => setSubmissionComments((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                                    placeholder="Écrivez votre commentaire à l'étudiant..."
                                    rows={4}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-slate-100 text-sm outline-none focus:border-orange-500 transition-colors resize-none placeholder:text-slate-500"
                                  />
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => sendSubmissionComment(sub.id)}
                                      disabled={commentSendingId === sub.id || !submissionComments[sub.id]?.trim()}
                                      className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                                    >
                                      {commentSendingId === sub.id ? (
                                        <Activity className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4" />
                                      )}
                                      Envoyer
                                    </button>
                                    <button
                                      onClick={() => setCommentOpenId(null)}
                                      disabled={commentSendingId === sub.id}
                                      className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}

                {!submissionsLoading && submissions.filter(s => submissionFilter === "all" || s.status === submissionFilter).length === 0 && (
                  <p className="text-slate-600 text-sm italic text-center py-10">Aucune soumission pour ce filtre.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* COACHING */}
          {activeTab === "coaching" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <CalendarCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Coaching</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gestion des rendez-vous</p>
                  </div>
                </div>
                <button
                  onClick={fetchCoachingAppointments}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:border-orange-500/40 text-xs font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Actualiser
                </button>
              </div>

              {/* Group coaching card */}
              <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Programmer une session groupe</h3>
                  <span className="text-[11px] font-bold text-slate-400">{groupEligibleCount} étudiant(s) éligible(s)</span>
                </div>

                {groupError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold">{groupError}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    value={groupForm.title}
                    onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
                    placeholder="Titre (ex : Révision grammaire B1)"
                    maxLength={120}
                    className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-800"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={groupForm.date}
                      onChange={(e) => setGroupForm({ ...groupForm, date: e.target.value })}
                      className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-2 py-2.5 text-sm text-slate-800"
                    />
                    <input
                      type="time"
                      value={groupForm.time}
                      onChange={(e) => setGroupForm({ ...groupForm, time: e.target.value })}
                      className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-2 py-2.5 text-sm text-slate-800"
                    />
                    <select
                      value={groupForm.duration_min}
                      onChange={(e) => setGroupForm({ ...groupForm, duration_min: Number(e.target.value) })}
                      className="bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-2 py-2.5 text-sm text-slate-800"
                    >
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                    </select>
                  </div>
                </div>

                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Description (optionnel)"
                  maxLength={1000}
                  rows={2}
                  className="w-full mb-3 bg-slate-50 border border-slate-200 focus:border-orange-400 outline-none rounded-xl px-3 py-2.5 text-sm text-slate-800 resize-none"
                />

                <button
                  onClick={handleCreateGroupSession}
                  disabled={groupSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
                >
                  {groupSubmitting ? "Programmation..." : "Programmer + notifier tout le monde"}
                </button>

                {groupSessions.filter((g) => g.status === "scheduled").length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-4 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Sessions groupe à venir</p>
                    {groupSessions
                      .filter((g) => g.status === "scheduled")
                      .map((g) => (
                        <div key={g.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{g.title}</p>
                            <p className="text-xs font-bold text-orange-600 mt-0.5">
                              {new Date(g.scheduled_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} · {g.duration_min} min
                            </p>
                          </div>
                          <button
                            onClick={() => handleCancelGroupSession(g.id)}
                            disabled={groupCancelId === g.id}
                            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-red-300 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 shrink-0"
                          >
                            {groupCancelId === g.id ? "..." : "Annuler"}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Stats banner */}
              {!coachingLoading && (
                <div className="grid grid-cols-3 gap-3 mb-8">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-amber-400">{coachingStats.pending}</p>
                    <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest mt-1">En attente</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-400">{coachingStats.confirmed}</p>
                    <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest mt-1">Confirmés</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
                    <p className="text-3xl font-black text-slate-300">{coachingStats.effectue}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Effectués (30j)</p>
                  </div>
                </div>
              )}

              {coachingLoading && <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Chargement...</p>}

              {!coachingLoading && coachingError && (
                <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
                  {coachingError}
                </div>
              )}

              {/* Upcoming */}
              {!coachingLoading && (
                <>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">À venir</p>
                  <div className="space-y-4 mb-8">
                    {coachingAppointments.length === 0 && (
                      <p className="text-slate-600 text-sm italic text-center py-6 bg-slate-900/50 rounded-2xl border border-slate-800">Aucun rendez-vous futur.</p>
                    )}
                    {coachingAppointments.map((appointment) => {
                      const student = appointment.profiles;
                      const isPending = appointment.status === "pending";
                      const isConfirmed = appointment.status === "confirmed";
                      const remaining =
                        student?.coaching_total === 9999
                          ? "Illimité"
                          : `${Math.max(0, (student?.coaching_total || 0) - (student?.coaching_used || 0))} / ${student?.coaching_total || 0}`;
                      return (
                        <div key={appointment.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-500 text-sm shrink-0">
                                {student?.prenom?.charAt(0) || "?"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-white text-sm">{student?.prenom || "Étudiant"}</p>
                                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${isConfirmed ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"}`}>
                                    {isConfirmed ? "Confirmé" : "En attente"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">{student?.email}</p>
                                {student?.phone && <p className="text-[10px] text-slate-500">{student.phone}</p>}
                                <p className="text-sm text-orange-400 font-black mt-3">
                                  {new Date(appointment.scheduled_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à{" "}
                                  {new Date(appointment.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                                  Pack : {student?.pack_name || "aucun"} •{" "}
                                  <span className={remaining === "0 / 0" || remaining.startsWith("0 /") ? "text-red-400" : "text-emerald-400"}>
                                    Coaching restant : {remaining}
                                  </span>
                                </p>
                                {appointment.note && (
                                  <p className="text-xs text-slate-300 mt-4 leading-relaxed bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                                    {appointment.note}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isPending && (
                              <div className="flex md:flex-col gap-2 shrink-0">
                                <button
                                  onClick={() => handleCoachingDecision(appointment.id, "confirmed")}
                                  disabled={coachingActionId === appointment.id}
                                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-all active:scale-95"
                                >
                                  {coachingActionId === appointment.id ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => handleCoachingDecision(appointment.id, "refused")}
                                  disabled={coachingActionId === appointment.id}
                                  className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-all active:scale-95"
                                >
                                  {coachingActionId === appointment.id ? <Activity className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  Refuser
                                </button>
                              </div>
                            )}
                            {isConfirmed && (
                              <div className="flex md:flex-col gap-2 shrink-0">
                                {(() => {
                                  const start = new Date(appointment.scheduled_at).getTime();
                                  const now = Date.now();
                                  const joinable = now >= start - 15 * 60 * 1000 && now <= start + 30 * 60 * 1000;
                                  if (!joinable) return null;
                                  return (
                                    <button
                                      onClick={() => { window.location.href = `/dashboard/coaching/room/${appointment.id}`; }}
                                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Rejoindre
                                    </button>
                                  );
                                })()}
                                <button
                                  onClick={() => handleCoachingDecision(appointment.id, "cancelled")}
                                  disabled={coachingActionId === appointment.id}
                                  className="px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait transition-all active:scale-95"
                                >
                                  {coachingActionId === appointment.id ? <Activity className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  Annuler RDV
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Past sessions */}
                  <>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 mt-2">Effectués (30 derniers jours)</p>
                    {pastCoachingAppointments.length === 0 ? (
                      <p className="text-slate-700 text-sm italic text-center py-6 bg-slate-900/50 rounded-2xl border border-slate-800">Aucune séance effectuée sur les 30 derniers jours.</p>
                    ) : (
                    <div className="space-y-3">
                        {pastCoachingAppointments.map((appointment) => {
                          const student = appointment.profiles;
                          const isEffectue = appointment.status === "effectue";
                          return (
                            <div key={appointment.id} className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isEffectue ? "bg-slate-900/60 border-slate-800/60 opacity-80" : "bg-slate-900 border-slate-800"}`}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black text-slate-400 text-sm shrink-0">
                                  {student?.prenom?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-slate-300 text-sm">{student?.prenom || "Étudiant"}</p>
                                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded border text-slate-400 border-slate-600 bg-slate-800">
                                      {isEffectue ? "Effectué" : "À confirmer"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-600 mt-0.5">
                                    {new Date(appointment.scheduled_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à{" "}
                                    {new Date(appointment.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                              {!isEffectue && (
                                <button
                                  onClick={async () => {
                                    setCoachingActionId(appointment.id);
                                    const { data: { session } } = await supabase.auth.getSession();
                                    await fetch("/api/admin/coaching", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
                                      body: JSON.stringify({ id: appointment.id, status: "effectue" }),
                                    });
                                    setCoachingActionId(null);
                                    fetchCoachingAppointments();
                                  }}
                                  disabled={coachingActionId === appointment.id}
                                  className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500/40 hover:text-emerald-400 text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-50"
                                >
                                  {coachingActionId === appointment.id ? <Activity className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Marquer effectué
                                </button>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    )}
                  </>
                </>
              )}
            </motion.div>
          )}

          {/* 💬 RETOURS UTILISATEURS */}
          {activeTab === "retours" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Retours Utilisateurs</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Feedback et suggestions des utilisateurs</p>
                </div>
              </div>
              <AdminFeedbackSection searchQuery={searchQuery} />
            </motion.div>
          )}

          {/* ⭐ AVIS CLIENTS */}
          {activeTab === "feedbacks" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Avis Clients</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Note moyenne : {avgRating} / 5 — {feedbacks.length} avis</p>
                </div>
              </div>

              {/* Filtres */}
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <button onClick={() => setRatingFilter(0)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${ratingFilter === 0 ? "bg-orange-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-orange-500/40"}`}>Tous</button>
                {[5,4,3,2,1].map(r => (
                  <button key={r} onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${ratingFilter === r ? "bg-amber-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-amber-500/40"}`}>{r}★</button>
                ))}
                <button onClick={() => setPinnedOnly(!pinnedOnly)} className={`ml-auto px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${pinnedOnly ? "bg-blue-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500/40"}`}>
                  <Pin className="w-3 h-3" /> Épinglés ({pinnedCount})
                </button>
              </div>

              {feedbackLoading && <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Chargement des avis...</p>}
              <div className="space-y-4">
                {filteredFeedbacks.length === 0 && !feedbackLoading && <p className="text-slate-600 text-sm italic text-center py-10">Aucun avis pour ce filtre.</p>}
                {filteredFeedbacks.map(f => (
                  <div key={f.id} className={`bg-slate-900 border rounded-2xl p-5 transition-all ${f.pinned ? "border-amber-500/40 shadow-lg shadow-amber-500/5" : "border-slate-800"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-500 text-sm">{f.prenom?.charAt(0) || "?"}</div>
                        <div>
                          <p className="font-bold text-white text-sm">{f.prenom || "Anonyme"}</p>
                          <div className="flex gap-0.5 mt-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={`w-3 h-3 ${f.rating >= i ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.pinned && <span className="text-[9px] font-black uppercase text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-500/5">Épinglé</span>}
                        <span className="text-[10px] text-slate-600">{new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                        <button onClick={() => togglePinFeedback(f.id, f.pinned)} className="text-slate-600 hover:text-amber-400 transition-colors">
                          {f.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteFeedback(f.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {f.comment && <p className="text-sm text-slate-300 mt-3 leading-relaxed border-t border-slate-800 pt-3">{f.comment}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CENTRES B2B */}
          {activeTab === "centres" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl mx-auto">
              <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Centres B2B</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Demandes d'ouverture de centre</p>
                  </div>
                </div>
                <button onClick={fetchCenterApplications} className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400">
                  <RefreshCcw className={`w-4 h-4 ${centersLoading ? "animate-spin" : ""}`} />
                  Actualiser
                </button>
              </div>

              {centersLoading ? (
                <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Chargement des demandes centres...</p>
              ) : centerApplications.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center">
                  <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Aucune demande de centre pour l'instant</p>
                  <p className="text-sm text-slate-600 mt-1">Les demandes envoyees depuis "Creer un centre" apparaitront ici.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {centerApplications.map((application) => {
                    const statusConfig = {
                      new: { label: "Nouveau", className: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
                      contacted: { label: "Contacte", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
                      approved: { label: "Approuve", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
                      rejected: { label: "Rejete", className: "bg-red-500/10 text-red-300 border-red-500/20" },
                    }[application.status];

                    return (
                      <div key={application.id} className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black text-white">{application.center_name}</h3>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${statusConfig.className}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Demande du {new Date(application.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => updateCenterApplicationStatus(application.id, "contacted")} disabled={centerActionId === application.id} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-amber-300 hover:bg-amber-500 hover:text-white disabled:opacity-50">Contacte</button>
                            <button onClick={() => updateCenterApplicationStatus(application.id, "approved")} disabled={centerActionId === application.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500 hover:text-white disabled:opacity-50">Approuver</button>
                            <button onClick={() => updateCenterApplicationStatus(application.id, "rejected")} disabled={centerActionId === application.id} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50">Rejeter</button>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Responsable</p>
                            <p className="mt-2 font-bold text-white">{application.manager_name}</p>
                            {application.manager_role && <p className="text-xs font-semibold text-slate-500">{application.manager_role}</p>}
                            <div className="mt-3 space-y-1 text-xs font-semibold text-slate-400">
                              <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-orange-400" /> {application.email}</p>
                              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-orange-400" /> {application.phone}</p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Centre</p>
                            <p className="mt-2 text-sm font-bold text-white">{application.city}</p>
                            {application.address && <p className="text-xs font-semibold text-slate-500">{application.address}</p>}
                            {application.student_volume && <p className="mt-3 text-xs font-semibold text-slate-400">Volume: {application.student_volume}</p>}
                            {application.center_code && (
                              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Code centre</p>
                                <p className="font-mono text-lg font-black tracking-widest text-white">{application.center_code}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {application.message && (
                          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Message</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-300">{application.message}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* SUPPORT CLIENT */}
          {activeTab === "support" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Support Client</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Assistance compte, paiement et technique</p>
                </div>
              </div>

              {supportConversations.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center">
                  <Headphones className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Aucune demande support pour l&apos;instant</p>
                  <p className="text-sm text-slate-600 mt-1">Les messages envoyes depuis le bouton Support apparaitront ici.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supportConversations.map(convo => {
                    const student = students.find(s => s.id === convo.student_id);
                    const supportProfile = student || {
                      id: convo.student_id,
                      prenom: convo.prenom,
                      email: convo.email || null,
                      phone: null,
                      ville: null,
                      role: convo.kind === "center" ? "center_manager" : "student",
                      formation: null,
                      current_level: "",
                      subscription_ends_at: null,
                      subscription_paused_at: null,
                      tag_status: "actif",
                      last_sign_in_at: null,
                      current_activity: null,
                      simulations_completed: 0,
                      created_at: convo.last_at,
                      updated_at: null,
                      pack_name: null,
                    } as StudentProfile;
                    return (
                      <button key={`${convo.kind}:${convo.student_id}:${convo.guest_token || ""}`} onClick={() => { convo.guest_token ? openGuestSupport(convo) : openSupport(supportProfile); }}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-blue-600/50 rounded-2xl p-4 flex items-center gap-4 transition-all text-left group">
                        <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-blue-400 shrink-0">
                          {convo.prenom.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{convo.prenom}</p>
                            {convo.guest_token && (
                              <span className="text-[9px] font-black bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Invite</span>
                            )}
                            {convo.kind === "center" && (
                              <span className="text-[9px] font-black bg-orange-500/10 text-orange-300 border border-orange-500/20 px-1.5 py-0.5 rounded-full">Centre B2B</span>
                            )}
                            {convo.unread > 0 && (
                              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{convo.unread}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{convo.last_message}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-600">{new Date(convo.last_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                          <Send size={12} className="text-slate-600 group-hover:text-blue-400 transition-colors mt-1 ml-auto" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* 💬 MESSAGES PRIVÉS */}
          {activeTab === "messages" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Messages Privés</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Conversations avec les étudiants</p>
                </div>
              </div>

              {/* 🔎 Recherche pour initier une conversation */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={pmSearch}
                  onChange={(e) => setPmSearch(e.target.value)}
                  placeholder="Nouvelle conversation : nom, email ou téléphone..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 text-white"
                />
              </div>

              {pmSearch.trim() ? (
                (() => {
                  const q = pmSearch.toLowerCase().trim();
                  const results = students.filter(s =>
                    s.prenom?.toLowerCase().includes(q) ||
                    s.email?.toLowerCase().includes(q) ||
                    s.phone?.includes(pmSearch.trim())
                  ).slice(0, 30);
                  return results.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
                      <p className="text-slate-400 font-bold">Aucun étudiant trouvé</p>
                      <p className="text-sm text-slate-600 mt-1">Essayez un autre nom, email ou numéro.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {results.map(s => (
                        <button key={s.id} onClick={() => { setPmSearch(""); openDm(s); }}
                          className="w-full bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 flex items-center gap-4 transition-all text-left group">
                          <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-orange-500 shrink-0">
                            {s.prenom?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white">{s.prenom || "Étudiant"}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{s.email || "-"}{s.phone ? ` · ${s.phone}` : ""}</p>
                          </div>
                          <Send size={14} className="text-slate-600 group-hover:text-orange-500 transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  );
                })()
              ) : conversations.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-12 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Aucune conversation pour l&apos;instant</p>
                  <p className="text-sm text-slate-600 mt-1">Cliquez sur &quot;Msg&quot; dans la liste des étudiants pour démarrer une conversation.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(convo => {
                    const student = students.find(s => s.id === convo.student_id);
                    return (
                      <button key={convo.student_id} onClick={() => { if (student) openDm(student); }}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex items-center gap-4 transition-all text-left group">
                        <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-orange-500 shrink-0">
                          {convo.prenom.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{convo.prenom}</p>
                            {convo.unread > 0 && (
                              <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">{convo.unread}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{convo.last_message}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-slate-600">{new Date(convo.last_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                          <Send size={12} className="text-slate-600 group-hover:text-orange-500 transition-colors mt-1 ml-auto" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-xs text-slate-600 text-center mt-6">Vous pouvez aussi ouvrir une conversation depuis la fiche d&apos;un étudiant (bouton &quot;Msg&quot;).</p>
            </motion.div>
          )}

          {/* 🔔 PANNEAU NOTIFICATIONS PUSH */}
          {activeTab === "push" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <BellRing className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Notifications Push</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Envoyer à un étudiant ou à tous</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-5">
                {/* Titre */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Titre *</label>
                  <input
                    type="text"
                    placeholder="ex: 🎯 Nouveau défi disponible !"
                    value={pushForm.title}
                    onChange={(e) => setPushForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Corps */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Message *</label>
                  <textarea
                    rows={3}
                    placeholder="ex: Ta session d'entraînement TCF Canada t'attend. Connecte-toi maintenant !"
                    value={pushForm.body}
                    onChange={(e) => setPushForm(p => ({ ...p, body: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">URL de destination</label>
                  <input
                    type="text"
                    placeholder="/dashboard"
                    value={pushForm.url}
                    onChange={(e) => setPushForm(p => ({ ...p, url: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {/* Ciblage */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Destinataire <span className="text-slate-600 normal-case font-medium">(vide = broadcast à tous)</span>
                  </label>
                  <select
                    value={pushForm.targetUserId}
                    onChange={(e) => setPushForm(p => ({ ...p, targetUserId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="">📣 Tous les abonnés</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.prenom || s.email} — {s.pack_name || "sans pack"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton envoi */}
                <button
                  onClick={sendPushNotification}
                  disabled={pushSending || !pushForm.title || !pushForm.body}
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
                >
                  {pushSending ? (
                    <><Activity className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Envoyer la notification</>
                  )}
                </button>

                {/* Résultat */}
                {pushResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pushResult.sent > 0 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-widest">
                      In-app: {pushResult.inAppSent ?? 0}
                    </span>
                    {pushResult.sent} notification{pushResult.sent > 1 ? "s" : ""} envoyée{pushResult.sent > 1 ? "s" : ""} sur {pushResult.total} abonné{pushResult.total > 1 ? "s" : ""}.
                  </motion.div>
                )}
              </div>

              {/* Info cron */}
              <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
                <Radio className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Rappel automatique actif</p>
                  <p className="text-sm text-slate-500 font-medium">
                    Le cron Vercel envoie automatiquement un rappel à tous les étudiants abonnés inactifs depuis plus de 48h — tous les 2 jours à 9h00.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
