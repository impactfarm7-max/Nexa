"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck,
  CheckCircle,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  GraduationCap,
  Headphones,
  ImageIcon,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Radar,
  RefreshCcw,
  Search,
  Send,
  Settings,
  Pin,
  PinOff,
  Star,
  Target,
  Trash2,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { useI18n } from "@/app/i18n/I18nProvider";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";

type Center = {
  id: string;
  name: string;
  code?: string | null;
  signup_slug?: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  center_type?: string | null;
};

type CenterStudent = {
  id: string;
  prenom: string | null;
  email: string | null;
  phone: string | null;
  ville: string | null;
  current_activity: string | null;
  last_seen_at: string | null;
  last_sign_in_at: string | null;
  simulations_completed: number | null;
  tag_status: string | null;
  pack_name: string | null;
  coaching_total: number | null;
  coaching_used: number | null;
  created_at: string;
};

type CenterTrainer = {
  id: string;
  prenom: string | null;
  email: string | null;
  phone: string | null;
  ville: string | null;
  current_activity: string | null;
  last_seen_at: string | null;
  last_sign_in_at: string | null;
  tag_status: string | null;
  created_at: string;
  permissions: string[];
  role_label?: string | null;
};

type CenterAdminData = {
  missions: any[];
  submissions: any[];
  coaching: any[];
  messages: any[];
  communityMessages: any[];
  feedbacks: any[];
  userFeedbacks: any[];
  supportMessages: any[];
};

type CommunityMessage = {
  id: string;
  user_id: string;
  message: string;
  channel: string;
  created_at: string;
  profiles: { prenom: string; role: string } | null;
};

const CHANNELS = [
  { id: "general", name: "Général" },
  { id: "tcf", name: "TCF Canada" },
  { id: "anglais", name: "Anglais" },
];

function getCommunityMessageDisplay(message?: string | null) {
  const content = (message || "").trim();
  if (/^enc:v\d+:/i.test(content)) {
    return {
      text: "Ancien message chiffre non lisible dans la moderation.",
      encrypted: true,
    };
  }
  return { text: content, encrypted: false };
}

function getSupportImageUrl(msg: { image_url?: string | null; message?: string }) {
  if (msg.image_url) return msg.image_url;
  return (msg.message || "").match(/Image jointe\s*:\s*(https?:\/\/\S+)/)?.[1] || null;
}

function getSupportMessageText(message: string) {
  return message
    .replace(/\n*\s*Image jointe\s*:\s*https?:\/\/\S+\s*/g, "")
    .trim();
}

const TRAINER_PERMISSION_OPTIONS = [
  { id: "students", label: "Tous les etudiants", icon: Users },
  { id: "trainers", label: "Formateurs", icon: GraduationCap },
  { id: "overview", label: "Vue d'ensemble", icon: Zap },
  { id: "radar", label: "Radar Simulateurs", icon: BarChart3 },
  { id: "missions", label: "Missions & Devoirs", icon: Target },
  { id: "submissions", label: "Soumissions", icon: FileText },
  { id: "coaching", label: "Coaching", icon: CalendarCheck },
  { id: "messages", label: "Messages Prives", icon: MessageCircle },
  { id: "forum", label: "Moderation Forum", icon: MessageCircle },
  { id: "support", label: "Support", icon: Headphones },
  { id: "reviews", label: "Avis Clients", icon: Star },
  { id: "push", label: "Notifications Push", icon: BellRing },
];

const DEFAULT_TRAINER_TAB_ORDER = ["students", "trainers", "overview", "radar", "missions", "coaching", "messages", "forum", "support", "reviews", "push"];

export default function CenterDashboardPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const [center, setCenter] = useState<Center | null>(null);
  const [students, setStudents] = useState<CenterStudent[]>([]);
  const [trainers, setTrainers] = useState<CenterTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [trainersLoading, setTrainersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingTrainer, setCreatingTrainer] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; prenom: string; phone?: string } | null>(null);
  const [createdTrainerCredentials, setCreatedTrainerCredentials] = useState<{ email: string; password: string; prenom: string; phone?: string; roleLabel?: string } | null>(null);
  const [form, setForm] = useState({ prenom: "", email: "", phone: "", ville: "", genre: "" });
  const [trainerForm, setTrainerForm] = useState({ prenom: "", email: "", phone: "", ville: "", genre: "", roleLabel: "Formateur", permissions: [] as string[] });
  const [activeTab, setActiveTab] = useState("students");
  const [centerRole, setCenterRole] = useState("manager");
  const [centerPermissions, setCenterPermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [adminData, setAdminData] = useState<CenterAdminData>({
    missions: [],
    submissions: [],
    coaching: [],
    messages: [],
    communityMessages: [],
    feedbacks: [],
    userFeedbacks: [],
    supportMessages: [],
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [pushForm, setPushForm] = useState({ title: "", body: "", url: "/centre/student/dashboard", targetUserId: "" });
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; total: number; targets: number } | null>(null);
  const [newMission, setNewMission] = useState({ title: "", description: "", target: "all", targetUserId: "", targetQuery: "" });
  const [isDeploying, setIsDeploying] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "done" | "pending_review">("all");
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [submissionComments, setSubmissionComments] = useState<Record<string, string>>({});
  const [commentSendingId, setCommentSendingId] = useState<string | null>(null);
  const [commentSentId, setCommentSentId] = useState<string | null>(null);
  const [coachingActionId, setCoachingActionId] = useState<string | null>(null);
  const [coachingModal, setCoachingModal] = useState<{ appointmentId: string; action: "refused" | "cancelled"; reason: string } | null>(null);
  const [coachingToast, setCoachingToast] = useState<{ status: string; student: string } | null>(null);
  const [managerUserId, setManagerUserId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState("general");
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [newCommMsg, setNewCommMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [feedbackActionId, setFeedbackActionId] = useState<string | null>(null);
  const [supportInput, setSupportInput] = useState("");
  const [supportImage, setSupportImage] = useState<File | null>(null);
  const [supportImagePreview, setSupportImagePreview] = useState<string | null>(null);
  const [supportSendError, setSupportSendError] = useState<string | null>(null);
  const [supportSending, setSupportSending] = useState(false);
  const [signupLinkCopied, setSignupLinkCopied] = useState(false);
  const supportEndRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const active = students.filter((student) => student.current_activity || student.last_seen_at).length;
    const simulations = students.reduce((sum, student) => sum + (student.simulations_completed || 0), 0);
    return { total: students.length, active, simulations };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.prenom, student.email, student.phone, student.ville]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [students, searchQuery]);

  const registrationHistory = useMemo(() => {
    return [...students]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [students]);

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    students: { title: "Tous les etudiants", subtitle: "Gerez les acces et suivez les activites du centre." },
    overview: { title: "Vue d'ensemble", subtitle: "Resume operationnel de votre centre." },
    radar: { title: "Radar Simulateurs", subtitle: "Suivez l'utilisation des simulations par vos apprenants." },
    missions: { title: "Missions & Devoirs", subtitle: "Pilotez les devoirs et travaux a remettre." },
    submissions: { title: "Soumissions", subtitle: "Controlez les devoirs envoyes par vos etudiants." },
    trainers: { title: "Formateurs", subtitle: "Creez et gerez les comptes formateurs du centre." },
    coaching: { title: "Coaching", subtitle: "Suivez les demandes et activites de coaching." },
    messages: { title: "Messages Prives", subtitle: "Conversations avec les etudiants du centre." },
    forum: { title: "Moderation Forum", subtitle: "Gardez un oeil sur les echanges de la communaute." },
    support: { title: "Support", subtitle: "Contactez l'equipe technique IAG Academy." },
    reviews: { title: "Avis Clients", subtitle: "Avis et temoignages lies au centre." },
    push: { title: "Notifications Push", subtitle: "Envoyez des rappels aux etudiants du centre." },
  };

  const isStaffSession = centerRole === "staff";
  const canAccess = (permission: string) => {
    if (!isStaffSession) return true;
    if (permission === "support") return centerPermissions.includes("support") || centerPermissions.includes("returns");
    return centerPermissions.includes(permission);
  };
  const canUseTab = (tab: string) => tab === "submissions" ? canAccess("missions") || canAccess("submissions") : canAccess(tab);
  const firstAllowedTab = () => DEFAULT_TRAINER_TAB_ORDER.find((tab) => canAccess(tab)) || "overview";
  const permissionLabel = (permission: string) => TRAINER_PERMISSION_OPTIONS.find((option) => option.id === permission)?.label || permission;
  const centerSignupRef = center?.signup_slug || center?.code;
  const centerSignupParam = center?.signup_slug ? "centre" : "centerCode";
  const centerSignupLink = centerSignupRef && typeof window !== "undefined"
    ? `${window.location.origin}/login?signup=1&${centerSignupParam}=${encodeURIComponent(centerSignupRef)}${isTcfCanadaCenter(center?.center_type) ? "" : `&lang=${locale}`}`
    : "";

  const copyCenterSignupLink = async () => {
    if (!centerSignupLink) return;
    await navigator.clipboard.writeText(centerSignupLink);
    setSignupLinkCopied(true);
    window.setTimeout(() => setSignupLinkCopied(false), 1800);
  };

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const readJson = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: `Reponse non JSON (${res.status})`, details: text.slice(0, 180) };
    }
  };

  const normalizeWhatsAppPhone = (phone?: string | null) => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length === 9 && digits.startsWith("6")) digits = `237${digits}`;
    return digits.length >= 8 ? digits : "";
  };

  const buildAccessMessage = (
    credentials: { email: string; password: string; prenom: string; roleLabel?: string },
    kind: "student" | "trainer",
  ) => {
    const loginUrl = kind === "trainer"
      ? `${window.location.origin}/login`
      : centerSignupRef
        ? `${window.location.origin}/login?${centerSignupParam}=${encodeURIComponent(centerSignupRef)}`
        : `${window.location.origin}/login`;
    const centerLine = center?.name ? `Centre : ${center.name}\n` : "";
    const roleLabel = kind === "trainer" ? (credentials.roleLabel || "formateur") : "etudiant";

    return `Bonjour ${credentials.prenom},\n\nVotre compte ${roleLabel} est cree.\n\n${centerLine}Email : ${credentials.email}\nMot de passe : ${credentials.password}\nLien de connexion : ${loginUrl}\n\nConservez ces identifiants et ne les partagez pas.`;
  };

  const sendAccessViaWhatsApp = (
    credentials: { email: string; password: string; prenom: string; phone?: string; roleLabel?: string },
    kind: "student" | "trainer",
  ) => {
    const phone = normalizeWhatsAppPhone(credentials.phone);
    if (!phone) {
      alert("Aucun numero WhatsApp valide n'a ete saisi pour ce compte.");
      return;
    }
    const message = encodeURIComponent(buildAccessMessage(credentials, kind));
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const sendAccessViaEmail = (
    credentials: { email: string; password: string; prenom: string; roleLabel?: string },
    kind: "student" | "trainer",
  ) => {
    const subject = encodeURIComponent(kind === "trainer" ? "Vos acces formateur" : "Vos acces etudiant");
    const body = encodeURIComponent(buildAccessMessage(credentials, kind));
    window.location.href = `mailto:${credentials.email}?subject=${subject}&body=${body}`;
  };

  const loadStudents = async () => {
    const token = await getToken();
    if (!token) return;
    setStudentsLoading(true);
    try {
      const res = await fetch("/api/center/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await readJson(res);
      if (res.ok) setStudents(json.students || []);
    } catch (error) {
      console.warn("center students load error:", error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadTrainers = async () => {
    const token = await getToken();
    if (!token) return;
    setTrainersLoading(true);
    try {
      const res = await fetch("/api/center/trainers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await readJson(res);
      if (res.ok) setTrainers(json.trainers || []);
    } catch (error) {
      console.warn("center trainers load error:", error);
    } finally {
      setTrainersLoading(false);
    }
  };

  const fetchCommunityMessages = async (channelId: string, centerId?: string | null) => {
    const scopeCenterId = centerId ?? center?.id;
    if (!scopeCenterId) return;
    const { data, error } = await supabase
      .from("community_messages")
      .select("*, profiles:user_id ( prenom, role )")
      .eq("channel", channelId)
      .eq("center_id", scopeCenterId)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("[forum centre] fetch error:", error);
      return;
    }
    setCommunityMessages(data as CommunityMessage[]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendCenterMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommMsg.trim() || !managerUserId || !center?.id) return;
    const msg = newCommMsg.trim();
    setNewCommMsg("");
    const { error } = await supabase.from("community_messages").insert([{
      user_id: managerUserId,
      message: msg,
      channel: activeChannel,
      center_id: center.id,
    }]);
    if (error) {
      console.error("[forum centre] insert error:", error);
      alert(`Message non envoye : ${error.message}`);
      setNewCommMsg(msg);
    }
  };

  const deleteCommunityMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_community_message", id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Suppression refusee.");
      return;
    }
    fetchCommunityMessages(activeChannel, center?.id);
  };

  const togglePinFeedback = async (id: string, currentPinned: boolean) => {
    const token = await getToken();
    if (!token) return;
    setFeedbackActionId(id);
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "pin_feedback", id, pinned: !currentPinned }),
    });
    setFeedbackActionId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Action impossible.");
      return;
    }
    setAdminData((prev) => ({
      ...prev,
      feedbacks: prev.feedbacks.map((f: any) => f.id === id ? { ...f, pinned: !currentPinned } : f),
    }));
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm("Supprimer cet avis ?")) return;
    const token = await getToken();
    if (!token) return;
    setFeedbackActionId(id);
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_feedback", id }),
    });
    setFeedbackActionId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Suppression impossible.");
      return;
    }
    setAdminData((prev) => ({
      ...prev,
      feedbacks: prev.feedbacks.filter((f: any) => f.id !== id),
    }));
  };

  const loadAdminData = async () => {
    const token = await getToken();
    if (!token) return;
    setDataLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/center/admin-data", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const json = await readJson(res);
      if (res.ok) {
        setAdminData({
          missions: json.missions || [],
          submissions: json.submissions || [],
          coaching: json.coaching || [],
          messages: json.messages || [],
          communityMessages: json.communityMessages || [],
          feedbacks: json.feedbacks || [],
          userFeedbacks: json.userFeedbacks || [],
          supportMessages: json.supportMessages || [],
        });
      } else {
        console.warn("center admin data error:", json.error || json.details);
      }
    } catch (error) {
      console.warn("center admin data load error:", error);
    } finally {
      window.clearTimeout(timeout);
      setDataLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/center/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await readJson(res);
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      setCenter(json.center);
      setCenterRole(json.role || "manager");
      setCenterPermissions(Array.isArray(json.permissions) ? json.permissions : []);
      if (json.role === "staff") {
        const permissions = Array.isArray(json.permissions) ? json.permissions : [];
        const normalizedPermissions = permissions.includes("returns") && !permissions.includes("support")
          ? [...permissions, "support"]
          : permissions;
        setActiveTab(DEFAULT_TRAINER_TAB_ORDER.find((tab) => normalizedPermissions.includes(tab)) || "overview");
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setManagerUserId(session.user.id);
      void fetchCommunityMessages(activeChannel, json.center?.id);
      setLoading(false);
      void loadStudents();
      void loadTrainers();
      void loadAdminData();
    };

    init().catch((error) => {
      console.warn("center admin init error:", error);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (centerRole !== "staff") return;
    if (!canUseTab(activeTab)) setActiveTab(firstAllowedTab());
  }, [centerRole, centerPermissions, activeTab]);

  useEffect(() => {
    if (!center?.id) return;
    void fetchCommunityMessages(activeChannel, center.id);
    const listener = supabase
      .channel(`center-community:${center.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages", filter: `center_id=eq.${center.id}` }, () => {
        fetchCommunityMessages(activeChannel, center.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(listener); };
  }, [center?.id, activeChannel]);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [adminData.supportMessages]);

  useEffect(() => {
    if (!managerUserId) return;
    const incoming = supabase
      .channel(`center-support-in:${managerUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `to_user_id=eq.${managerUserId}` }, () => {
        void loadAdminData();
      })
      .subscribe();
    const outgoing = supabase
      .channel(`center-support-out:${managerUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `from_user_id=eq.${managerUserId}` }, () => {
        void loadAdminData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(incoming);
      supabase.removeChannel(outgoing);
    };
  }, [managerUserId]);

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.email.trim()) return;
    const token = await getToken();
    if (!token) return;

    setCreating(true);
    const res = await fetch("/api/center/students", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const json = await readJson(res);
    setCreating(false);

    if (!res.ok) {
      alert(json.error || "Impossible de creer l'etudiant.");
      return;
    }

    setCreatedCredentials({ email: json.email, password: json.password, prenom: json.prenom, phone: form.phone.trim() });
    setForm({ prenom: "", email: "", phone: "", ville: "", genre: "" });
    loadStudents();
    loadAdminData();
  };

  const handleStudentApproval = async (studentId: string, action: "approve" | "reject") => {
    const token = await getToken();
    if (!token) return;
    const confirmed = action === "approve" || confirm("Refuser cette demande de compte etudiant ?");
    if (!confirmed) return;

    const res = await fetch("/api/center/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ studentId, action }),
    });
    const json = await readJson(res);
    if (!res.ok) {
      alert(json.error || "Action impossible.");
      return;
    }
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId ? { ...student, tag_status: json.tag_status } : student
      )
    );
    void loadAdminData();
  };

  const createTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerForm.prenom.trim() || !trainerForm.email.trim()) return;
    const token = await getToken();
    if (!token) return;

    setCreatingTrainer(true);
    const res = await fetch("/api/center/trainers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(trainerForm),
    });
    const json = await readJson(res);
    setCreatingTrainer(false);

    if (!res.ok) {
      alert(json.error || "Impossible de creer le formateur.");
      return;
    }

    setCreatedTrainerCredentials({ email: json.email, password: json.password, prenom: json.prenom, phone: trainerForm.phone.trim(), roleLabel: json.roleLabel || trainerForm.roleLabel.trim() || "Formateur" });
    setTrainerForm({ prenom: "", email: "", phone: "", ville: "", genre: "", roleLabel: "Formateur", permissions: [] });
    loadTrainers();
  };

  const sendPushNotification = async () => {
    if (!pushForm.title.trim() || !pushForm.body.trim()) return;
    const token = await getToken();
    if (!token) return;
    setPushSending(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/center/admin-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "push",
          title: pushForm.title.trim(),
          body: pushForm.body.trim(),
          url: pushForm.url.trim() || "/centre/student/dashboard",
          targetUserId: pushForm.targetUserId || undefined,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) {
        alert(json.error || "Notification non envoyee.");
        return;
      }
      setPushResult({ sent: json.sent, total: json.total, targets: json.targets || 0 });
    } catch (error) {
      console.error("[push centre] error:", error);
      alert("Erreur lors de l'envoi.");
    } finally {
      setPushSending(false);
    }
  };

  const setSupportImageFile = (file: File | null) => {
    setSupportImage(file);
    if (supportImagePreview) URL.revokeObjectURL(supportImagePreview);
    setSupportImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadSupportImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/support/upload", { method: "POST", body: formData });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error || "Upload impossible");
    return json.url as string;
  };

  const sendCenterSupport = async () => {
    const message = supportInput.trim();
    if ((!message && !supportImage) || supportSending) return;
    const token = await getToken();
    if (!token) return;
    setSupportSending(true);
    setSupportSendError(null);
    try {
      const imageUrl = supportImage ? await uploadSupportImage(supportImage) : null;
      const res = await fetch("/api/center/admin-data", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "support_message", message, imageUrl }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Message support non envoye.");
      setSupportInput("");
      setSupportImageFile(null);
      await loadAdminData();
    } catch (error: any) {
      setSupportSendError(error?.message || "Impossible d'envoyer le message.");
    } finally {
      setSupportSending(false);
    }
  };

  const deployMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMission.title.trim()) return;
    const token = await getToken();
    if (!token) return;
    setIsDeploying(true);
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "mission", ...newMission }),
    });
    const json = await readJson(res);
    setIsDeploying(false);
    if (!res.ok) {
      alert(json.error || "Mission non creee.");
      return;
    }
    setNewMission({ title: "", description: "", target: "all", targetUserId: "", targetQuery: "" });
    await loadAdminData();
    alert(`Mission deployee a ${json.notified || 0} etudiant(s) du centre.`);
  };

  const deleteMission = async (id: string) => {
    if (!confirm("Supprimer cette mission ?")) return;
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete_mission", id }),
    });
    const json = await readJson(res);
    if (!res.ok) {
      alert(json.error || "Mission non supprimee.");
      return;
    }
    loadAdminData();
  };

  const sendSubmissionComment = async (submissionId: string) => {
    const comment = submissionComments[submissionId]?.trim();
    if (!comment) return;
    const token = await getToken();
    if (!token) return;

    setCommentSendingId(submissionId);
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "submission_comment", submissionId, comment }),
    });
    const json = await readJson(res);
    setCommentSendingId(null);

    if (!res.ok) {
      alert(json.error || "Commentaire non envoye.");
      return;
    }

    setAdminData((current) => ({
      ...current,
      submissions: current.submissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, admin_comment: comment, admin_comment_at: json.admin_comment_at || new Date().toISOString() }
          : submission
      ),
    }));
    setSubmissionComments((current) => ({ ...current, [submissionId]: "" }));
    setCommentOpenId(null);
    setCommentSentId(submissionId);
    window.setTimeout(() => setCommentSentId(null), 2500);
  };

  const sendManualGrade = async (submissionId: string, note: number, commentaire: string) => {
    const token = await getToken();
    if (!token) return false;
    const res = await fetch("/api/centre/missions/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        submission_id: submissionId,
        action: "manual",
        note,
        commentaire_global: commentaire,
      }),
    });
    const json = await readJson(res);
    if (!res.ok) {
      alert(json.error || "Correction non enregistree.");
      return false;
    }
    setAdminData((current) => ({
      ...current,
      submissions: current.submissions.map((submission) =>
        submission.id === submissionId
          ? { ...submission, status: "done", correction: json.correction }
          : submission
      ),
    }));
    return true;
  };

  const sendCoachingDecision = async (appointmentId: string, status: "confirmed" | "refused" | "cancelled" | "effectue", admin_note = "") => {
    const token = await getToken();
    if (!token) return false;

    setCoachingActionId(appointmentId);
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "coaching_decision", id: appointmentId, status, admin_note }),
    });
    const json = await readJson(res);
    setCoachingActionId(null);

    if (!res.ok) {
      alert(json.error || "Action impossible.");
      return false;
    }

    await loadAdminData();
    await loadStudents();
    const appointment = adminData.coaching.find((item) => item.id === appointmentId);
    setCoachingToast({ status, student: appointment?.profiles?.prenom || appointment?.profiles?.email || "Etudiant" });
    window.setTimeout(() => setCoachingToast(null), 2800);
    return true;
  };

  const handleCoachingDecision = async (appointmentId: string, status: "confirmed" | "refused" | "cancelled" | "effectue") => {
    if (status === "refused" || status === "cancelled") {
      setCoachingModal({ appointmentId, action: status, reason: "" });
      return;
    }
    await sendCoachingDecision(appointmentId, status);
  };

  const submitCoachingModal = async () => {
    if (!coachingModal) return;
    const { appointmentId, action, reason } = coachingModal;
    setCoachingModal(null);
    await sendCoachingDecision(appointmentId, action, reason);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return <CenterPageLoading embedded variant="dark" mode="admin" />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b111d] text-slate-100">
      {coachingToast && (
        <div className="fixed right-5 top-5 z-[80] rounded-2xl border border-emerald-500/30 bg-slate-900 px-5 py-4 shadow-2xl shadow-black/30">
          <p className="text-sm font-black text-white">Coaching mis a jour</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{coachingToast.student}</p>
        </div>
      )}

      {coachingModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white">
              {coachingModal.action === "refused" ? "Refuser la demande" : "Annuler le rendez-vous"}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-400">Ajoutez un motif optionnel pour l'etudiant.</p>
            <textarea
              value={coachingModal.reason}
              onChange={(event) => setCoachingModal({ ...coachingModal, reason: event.target.value })}
              rows={4}
              placeholder="Motif..."
              className="mt-5 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-orange-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCoachingModal(null)}
                className="rounded-xl border border-slate-700 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitCoachingModal}
                className="rounded-xl bg-orange-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-500"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-800 bg-[#070b18] xl:flex xl:flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-white">{center?.name}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Centre Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-3">
          <div>
            <Link href="/centre/dashboard" className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-400 transition-colors hover:text-orange-400">
              Retour au Dashboard
            </Link>
            <Link href="/centre/mon-compte" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-900 hover:text-orange-400">
              <User className="h-5 w-5" />
              Mon compte
            </Link>
          </div>

          {canAccess("students") && (
            <div>
              <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-widest text-slate-600">Administration</p>
              <button onClick={() => setActiveTab("students")} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition-all ${activeTab === "students" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-slate-900"}`}>
                <span className="flex items-center gap-3"><Settings className="h-5 w-5" /> Dashboard Admin</span>
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px]">{stats.total}</span>
              </button>
            </div>
          )}

          {(canAccess("students") || canAccess("overview") || canAccess("trainers")) && (
            <div>
              <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-widest text-slate-600">Gestion etudiants</p>
              {canAccess("students") && (
                <button onClick={() => setActiveTab("students")} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black ${activeTab === "students" ? "bg-slate-900 text-slate-200" : "text-slate-400 hover:bg-slate-900"}`}>
                  <span className="flex items-center gap-3"><Users className="h-5 w-5" /> Tous</span>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px]">{stats.total}</span>
                </button>
              )}
              {canAccess("overview") && (
                <button onClick={() => setActiveTab("overview")} className={`mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold ${activeTab === "overview" ? "bg-slate-900 text-slate-200" : "text-slate-400 hover:bg-slate-900"}`}>
                  <span className="flex items-center gap-3"><Activity className="h-5 w-5" /> Actifs</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">{stats.active}</span>
                </button>
              )}
              {canAccess("trainers") && (
                <button onClick={() => setActiveTab("trainers")} className={`mt-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold ${activeTab === "trainers" ? "bg-slate-900 text-slate-200" : "text-slate-400 hover:bg-slate-900"}`}>
                  <span className="flex items-center gap-3"><GraduationCap className="h-5 w-5" /> Formateurs</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">{trainers.length}</span>
                </button>
              )}
            </div>
          )}

          <div>
            <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-widest text-slate-600">Plateforme</p>
            {canAccess("overview") && <AdminNavButton active={activeTab === "overview"} icon={Zap} label="Vue d'ensemble" onClick={() => setActiveTab("overview")} />}
            {canAccess("radar") && <AdminNavButton active={activeTab === "radar"} icon={BarChart3} label="Radar Simulateurs" onClick={() => setActiveTab("radar")} />}
            {canAccess("missions") && <AdminNavButton active={activeTab === "missions"} icon={Target} label="Missions & Devoirs" onClick={() => setActiveTab("missions")} />}
            {canAccess("coaching") && <AdminNavButton active={activeTab === "coaching"} icon={CalendarCheck} label="Coaching" onClick={() => setActiveTab("coaching")} />}
            {canAccess("messages") && <AdminNavButton active={activeTab === "messages"} icon={MessageCircle} label="Messages Prives" onClick={() => setActiveTab("messages")} />}
            {canAccess("forum") && <AdminNavButton active={activeTab === "forum"} icon={MessageCircle} label="Moderation Forum" onClick={() => setActiveTab("forum")} />}
            {canAccess("support") && <AdminNavButton active={activeTab === "support"} icon={Headphones} label="Support" onClick={() => setActiveTab("support")} />}
            {canAccess("reviews") && <AdminNavButton active={activeTab === "reviews"} icon={Star} label="Avis Clients" onClick={() => setActiveTab("reviews")} />}
            {canAccess("push") && <AdminNavButton active={activeTab === "push"} icon={BellRing} label="Notifications Push" onClick={() => setActiveTab("push")} />}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-5">
          <button onClick={signOut} className="flex items-center gap-3 text-sm font-bold text-slate-400 hover:text-red-400">
            <LogOut className="h-5 w-5" />
            Deconnexion
          </button>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#080d19]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-10">
            <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500 md:flex md:max-w-md">
              <Search className="h-5 w-5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chercher un etudiant..."
                className="h-full w-full bg-transparent text-sm font-medium text-slate-200 outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="md:hidden">
              <p className="text-lg font-black text-white">{center?.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Dashboard Admin</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => { loadStudents(); loadTrainers(); loadAdminData(); }} className="hidden items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-black text-slate-300 hover:border-orange-500/40 md:flex">
                <RefreshCcw className={`h-4 w-4 ${studentsLoading || trainersLoading || dataLoading ? "animate-spin" : ""}`} />
                Actualiser
              </button>
              <button onClick={signOut} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-400">
                <LogOut className="h-4 w-4" />
                Sortir
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 lg:px-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{pageTitles[activeTab]?.title || "Dashboard Admin"}</h1>
              <p className="mt-2 text-sm font-medium text-slate-400">{pageTitles[activeTab]?.subtitle || "Gestion du centre."}</p>
            </div>
            {activeTab === "trainers" && canAccess("trainers") && (
              <button onClick={() => setTimeout(() => document.getElementById("center-create-trainer")?.scrollIntoView({ behavior: "smooth" }), 50)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 hover:bg-orange-500">
                <Plus className="h-5 w-5" />
                Creer un formateur
              </button>
            )}
          </div>

          {activeTab === "students" && canAccess("students") && (
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <Stat icon={Users} label="Etudiants" value={stats.total} />
              <Stat icon={Activity} label="Avec activite" value={stats.active} />
              <Stat icon={GraduationCap} label="Simulations" value={stats.simulations} />
            </div>
          )}

          {activeTab === "students" && canAccess("students") && centerSignupLink && (
            <div className="mb-8 rounded-[1.5rem] border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">Lien d'inscription du centre</p>
                  <p className="mt-2 break-all text-sm font-bold text-orange-50">{centerSignupLink}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyCenterSignupLink}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-500"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {signupLinkCopied ? "Copie" : "Copier"}
                  </button>
                  <Link
                    href={centerSignupLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-orange-200 hover:border-orange-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === "overview" && canAccess("overview") && (
            <div className="space-y-6">
              <div className="grid gap-5 xl:grid-cols-3">
                <PanelCard icon={Users} title="Apprenants inscrits" value={stats.total} detail="Etudiants rattaches a votre centre" />
                <PanelCard icon={Activity} title="Activite recente" value={stats.active} detail="Etudiants avec une activite detectee" />
                <PanelCard icon={Radar} title="Simulations" value={stats.simulations} detail="Total simulations realisees" />
              </div>

              <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Inscriptions</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Historique des inscriptions</h2>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {registrationHistory.length} recentes
                  </span>
                </div>

                {registrationHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                    <p className="text-sm font-bold text-slate-500">Aucune inscription pour le moment.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {registrationHistory.map((student) => (
                      <div key={student.id} className="grid gap-4 p-5 transition-colors hover:bg-slate-800/40 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-sm font-black text-orange-400">
                            {(student.prenom || student.email || "E").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">{student.prenom || "Etudiant"}</p>
                            <p className="truncate text-xs font-semibold text-slate-400">{student.email || "Email non renseigne"}</p>
                            {student.ville && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-600">{student.ville}</p>}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-left md:text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inscrit le</p>
                          <p className="mt-1 text-sm font-black text-slate-200">
                            {new Date(student.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "students" && canAccess("students") && (
          <div className="grid gap-6 2xl:grid-cols-[0.85fr_1.4fr]">
          <form id="center-create-student" onSubmit={createStudent} className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Nouveau compte</p>
              <h2 className="mt-1 text-2xl font-black text-white">Creer un etudiant</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Le compte sera automatiquement rattache a votre centre.</p>
            </div>

            <div className="space-y-3">
              <Input icon={User} placeholder="Prenom" value={form.prenom} onChange={(v) => setForm((p) => ({ ...p, prenom: v }))} required />
              <Input icon={Mail} type="email" placeholder="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} required />
              <Input icon={Phone} type="tel" placeholder="Telephone / WhatsApp" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
              <Input icon={Building2} placeholder="Ville" value={form.ville} onChange={(v) => setForm((p) => ({ ...p, ville: v }))} />
              <select value={form.genre} onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))} className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-slate-300 outline-none focus:border-orange-500">
                <option value="">Genre</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>

            <button disabled={creating} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 text-sm font-black uppercase tracking-widest text-white hover:bg-orange-500 disabled:opacity-50">
              {creating ? "Creation..." : "Creer le compte"}
              {!creating && <Plus className="h-4 w-4" />}
            </button>

            {createdCredentials && (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-800">Compte cree pour {createdCredentials.prenom}</p>
                <p className="mt-2 text-xs font-bold text-emerald-700">Email : {createdCredentials.email}</p>
                <p className="text-xs font-bold text-emerald-700">Mot de passe : {createdCredentials.password}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(buildAccessMessage(createdCredentials, "student"))}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copier les acces
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAccessViaWhatsApp(createdCredentials, "student")}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Envoyer WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => sendAccessViaEmail(createdCredentials, "student")}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Envoyer mail
                  </button>
                </div>
              </div>
            )}
          </form>

          <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="p-5 pb-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Suivi</p>
                <h2 className="mt-1 text-2xl font-black text-white">Etudiants du centre</h2>
              </div>
              <button onClick={loadStudents} className="mr-5 mt-5 rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-500 hover:text-orange-400">
                <RefreshCcw className={`h-4 w-4 ${studentsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {students.length === 0 ? (
              <div className="m-5 rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-bold text-slate-500">Aucun etudiant pour le moment</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredStudents.map((student) => {
                  const isPendingApproval = student.tag_status === "pending_center_approval";
                  const statusLabel = isPendingApproval ? "En attente validation" : (student.tag_status || "actif");
                  return (
                  <div key={student.id} className="p-5 transition-colors hover:bg-slate-800/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-black text-orange-500">
                          {(student.prenom || "E").charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-white">{student.prenom || "Etudiant"}</p>
                          <p className="text-xs font-semibold text-slate-400">{student.email}</p>
                          {student.phone && <p className="mt-1 text-xs font-semibold text-slate-500">{student.phone}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${isPendingApproval ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-slate-950 text-slate-400"}`}>
                          {statusLabel}
                        </span>
                        {isPendingApproval && (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleStudentApproval(student.id, "approve")}
                              className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-400"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStudentApproval(student.id, "reject")}
                              className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/20"
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                      <p className="rounded-xl border border-slate-800 bg-slate-950 p-3">Activite: <span className="text-slate-300">{student.current_activity || "Aucune"}</span></p>
                      <p className="rounded-xl border border-slate-800 bg-slate-950 p-3">Simulations: <span className="text-white">{student.simulations_completed || 0}</span></p>
                      <p className="rounded-xl border border-slate-800 bg-slate-950 p-3">Connexion: <span className="text-slate-300">{student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleDateString("fr-FR") : "Jamais"}</span></p>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
          </div>
          )}

          {activeTab === "trainers" && canAccess("trainers") && (
            <div className="grid gap-6 2xl:grid-cols-[0.85fr_1.4fr]">
              <form id="center-create-trainer" onSubmit={createTrainer} className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-5 shadow-sm">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Nouveau formateur</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Creer un formateur</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">Le compte sera rattache a votre centre avec un acces staff.</p>
                </div>

                <div className="space-y-3">
                  <Input icon={User} placeholder="Prenom du formateur" value={trainerForm.prenom} onChange={(v) => setTrainerForm((p) => ({ ...p, prenom: v }))} required />
                  <Input icon={Mail} type="email" placeholder="Email" value={trainerForm.email} onChange={(v) => setTrainerForm((p) => ({ ...p, email: v }))} required />
                  <Input icon={Phone} type="tel" placeholder="Telephone / WhatsApp" value={trainerForm.phone} onChange={(v) => setTrainerForm((p) => ({ ...p, phone: v }))} />
                  <Input icon={GraduationCap} placeholder="Nom du role / fonction (ex: Correcteur, Coach oral)" value={trainerForm.roleLabel} onChange={(v) => setTrainerForm((p) => ({ ...p, roleLabel: v }))} />
                  <Input icon={Building2} placeholder="Ville" value={trainerForm.ville} onChange={(v) => setTrainerForm((p) => ({ ...p, ville: v }))} />
                  <select value={trainerForm.genre} onChange={(e) => setTrainerForm((p) => ({ ...p, genre: e.target.value }))} className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-bold text-slate-300 outline-none focus:border-orange-500">
                    <option value="">Genre</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                  <details className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <summary className="cursor-pointer text-sm font-black text-slate-200">
                      Champ d'action
                      <span className="ml-2 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-orange-300">
                        {trainerForm.permissions.length} acces
                      </span>
                    </summary>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {TRAINER_PERMISSION_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const checked = trainerForm.permissions.includes(option.id);
                        return (
                          <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-xs font-black transition ${checked ? "border-orange-500 bg-orange-500/10 text-orange-100" : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => setTrainerForm((prev) => ({
                                ...prev,
                                permissions: e.target.checked
                                  ? [...prev.permissions, option.id]
                                  : prev.permissions.filter((permission) => permission !== option.id),
                              }))}
                              className="h-4 w-4 accent-orange-600"
                            />
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  </details>
                </div>

                <button disabled={creatingTrainer} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 text-sm font-black uppercase tracking-widest text-white hover:bg-orange-500 disabled:opacity-50">
                  {creatingTrainer ? "Creation..." : "Creer le formateur"}
                  {!creatingTrainer && <Plus className="h-4 w-4" />}
                </button>

                {createdTrainerCredentials && (
                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-800">Formateur cree pour {createdTrainerCredentials.prenom}</p>
                    <p className="mt-2 text-xs font-bold text-emerald-700">Role : {createdTrainerCredentials.roleLabel || "Formateur"}</p>
                    <p className="mt-2 text-xs font-bold text-emerald-700">Email : {createdTrainerCredentials.email}</p>
                    <p className="text-xs font-bold text-emerald-700">Mot de passe : {createdTrainerCredentials.password}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(buildAccessMessage(createdTrainerCredentials, "trainer"))}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copier les acces
                      </button>
                      <button
                        type="button"
                        onClick={() => sendAccessViaWhatsApp(createdTrainerCredentials, "trainer")}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Envoyer WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => sendAccessViaEmail(createdTrainerCredentials, "trainer")}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Envoyer mail
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="p-5 pb-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">Equipe pedagogique</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Formateurs du centre</h2>
                  </div>
                  <button onClick={loadTrainers} className="mr-5 mt-5 rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-500 hover:text-orange-400">
                    <RefreshCcw className={`h-4 w-4 ${trainersLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {trainers.length === 0 ? (
                  <div className="m-5 rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
                    <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-bold text-slate-500">Aucun formateur pour le moment</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {trainers.map((trainer) => (
                      <div key={trainer.id} className="p-5 transition-colors hover:bg-slate-800/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-black text-orange-500">
                              {(trainer.prenom || "F").charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-white">{trainer.prenom || "Formateur"}</p>
                              <p className="text-xs font-semibold text-slate-400">{trainer.email}</p>
                              {trainer.phone && <p className="mt-1 text-xs font-semibold text-slate-500">{trainer.phone}</p>}
                            </div>
                          </div>
                          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
                            {trainer.role_label || "Formateur"}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                          <p className="rounded-xl border border-slate-800 bg-slate-950 p-3">Activite: <span className="text-slate-300">{trainer.current_activity || "Aucune"}</span></p>
                          <p className="rounded-xl border border-slate-800 bg-slate-950 p-3">Ville: <span className="text-slate-300">{trainer.ville || "-"}</span></p>
                          <p className="rounded-xl border border-slate-800 bg-slate-950 p-3">Connexion: <span className="text-slate-300">{trainer.last_sign_in_at ? new Date(trainer.last_sign_in_at).toLocaleDateString("fr-FR") : "Jamais"}</span></p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(trainer.permissions || []).length === 0 ? (
                            <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Aucun acces defini</span>
                          ) : (
                            trainer.permissions.map((permission) => (
                              <span key={permission} className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
                                {permissionLabel(permission)}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "radar" && canAccess("radar") && <RadarPanel students={students} />}
          {activeTab === "missions" && canAccess("missions") && <MissionsPanel students={students} missions={adminData.missions} submissions={adminData.submissions} newMission={newMission} setNewMission={setNewMission} isDeploying={isDeploying} onDeploy={deployMission} onDelete={deleteMission} commentOpenId={commentOpenId} setCommentOpenId={setCommentOpenId} submissionComments={submissionComments} setSubmissionComments={setSubmissionComments} commentSendingId={commentSendingId} commentSentId={commentSentId} onSendComment={sendSubmissionComment} onManualGrade={sendManualGrade} />}
          {activeTab === "submissions" && (canAccess("submissions") || canAccess("missions")) && <SubmissionsPanel submissions={adminData.submissions} submissionFilter={submissionFilter} setSubmissionFilter={setSubmissionFilter} commentOpenId={commentOpenId} setCommentOpenId={setCommentOpenId} submissionComments={submissionComments} setSubmissionComments={setSubmissionComments} commentSendingId={commentSendingId} commentSentId={commentSentId} onSendComment={sendSubmissionComment} onManualGrade={sendManualGrade} />}
          {activeTab === "coaching" && canAccess("coaching") && <CoachingPanel sessions={adminData.coaching} actionId={coachingActionId} onDecision={handleCoachingDecision} onRefresh={loadAdminData} />}
          {activeTab === "messages" && canAccess("messages") && <MessagesPanel messages={adminData.messages} students={students} onRefresh={loadAdminData} />}
          {activeTab === "forum" && canAccess("forum") && (
            <div className="w-full max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Moderation Forum</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Surveiller et moderer les echanges du centre</p>
                </div>
              </div>

              <div className="flex gap-2 mb-5">
                {CHANNELS.map(ch => (
                  <button key={ch.id} onClick={() => setActiveChannel(ch.id)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeChannel === ch.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-orange-500/40"}`}>
                    {ch.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-[1.5rem] p-5 space-y-3 min-h-0 mb-4">
                {communityMessages.length === 0 && <p className="text-slate-600 text-sm italic text-center py-10">Aucun message dans ce canal.</p>}
                {communityMessages.map(msg => {
                  const isManager = msg.profiles?.role === "center_manager" || msg.user_id === managerUserId;
                  const displayMessage = getCommunityMessageDisplay(msg.message);
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 group ${isManager ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${isManager ? "bg-orange-500 text-white" : "bg-slate-800 text-orange-400"}`}>
                        {msg.profiles?.prenom?.charAt(0) || "?"}
                      </div>
                      <div className={`max-w-[75%] ${isManager ? "items-end" : "items-start"} flex flex-col`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-slate-500">{msg.profiles?.prenom || "Inconnu"}</span>
                          {isManager && <span className="text-[8px] font-black uppercase text-orange-500 border border-orange-500/30 px-1.5 py-0.5 rounded">Centre</span>}
                          <span className="text-[9px] text-slate-700">{new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${displayMessage.encrypted ? "border border-amber-500/30 bg-amber-500/10 text-amber-100 italic" : isManager ? "bg-orange-500/10 border border-orange-500/20 text-orange-100" : "bg-slate-800 text-slate-200"}`}>
                          {displayMessage.text}
                        </div>
                      </div>
                      <button onClick={() => deleteCommunityMessage(msg.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all mt-2 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendCenterMessage} className="flex gap-3">
                <input type="text" placeholder="Ecrire un message en tant que centre..." value={newCommMsg} onChange={e => setNewCommMsg(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors" />
                <button type="submit" disabled={!newCommMsg.trim()} className="px-5 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
          {activeTab === "support" && canAccess("support") && (
            <CenterSupportPanel
              messages={adminData.supportMessages}
              currentUserId={managerUserId}
              input={supportInput}
              setInput={setSupportInput}
              image={supportImage}
              imagePreview={supportImagePreview}
              setImage={setSupportImageFile}
              sendError={supportSendError}
              sending={supportSending}
              onSend={sendCenterSupport}
              endRef={supportEndRef}
            />
          )}
          {activeTab === "reviews" && canAccess("reviews") && (() => {
            const feedbacks = adminData.feedbacks || [];
            const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((acc: number, f: any) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : "–";
            const pinnedCount = feedbacks.filter((f: any) => f.pinned).length;
            const filteredFeedbacks = feedbacks
              .filter((f: any) => ratingFilter === 0 || f.rating === ratingFilter)
              .filter((f: any) => !pinnedOnly || f.pinned);

            return (
              <div className="w-full max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Avis Clients</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Note moyenne : {avgRating} / 5 — {feedbacks.length} avis</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  <button onClick={() => setRatingFilter(0)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${ratingFilter === 0 ? "bg-orange-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-orange-500/40"}`}>Tous</button>
                  {[5,4,3,2,1].map(r => (
                    <button key={r} onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${ratingFilter === r ? "bg-amber-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-amber-500/40"}`}>{r}★</button>
                  ))}
                  <button onClick={() => setPinnedOnly(!pinnedOnly)} className={`ml-auto px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${pinnedOnly ? "bg-blue-500 text-white" : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-blue-500/40"}`}>
                    <Pin className="w-3 h-3" /> Epingles ({pinnedCount})
                  </button>
                </div>

                {dataLoading && <p className="text-slate-500 text-sm text-center py-10 animate-pulse">Chargement des avis...</p>}
                <div className="space-y-4">
                  {filteredFeedbacks.length === 0 && !dataLoading && <p className="text-slate-600 text-sm italic text-center py-10">Aucun avis pour ce filtre.</p>}
                  {filteredFeedbacks.map((f: any) => (
                    <div key={f.id} className={`bg-slate-900 border rounded-2xl p-5 transition-all ${f.pinned ? "border-amber-500/40 shadow-lg shadow-amber-500/5" : "border-slate-800"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-black text-orange-500 text-sm">{(f.prenom || f.profiles?.prenom || "?").charAt(0)}</div>
                          <div>
                            <p className="font-bold text-white text-sm">{f.prenom || f.profiles?.prenom || "Anonyme"}</p>
                            <div className="flex gap-0.5 mt-0.5">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} className={`w-3 h-3 ${(f.rating || 0) >= i ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.pinned && <span className="text-[9px] font-black uppercase text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded bg-amber-500/5">Epingle</span>}
                          <span className="text-[10px] text-slate-600">{f.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR') : ""}</span>
                          <button disabled={feedbackActionId === f.id} onClick={() => togglePinFeedback(f.id, !!f.pinned)} className="text-slate-600 hover:text-amber-400 transition-colors disabled:opacity-40">
                            {f.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          <button disabled={feedbackActionId === f.id} onClick={() => deleteFeedback(f.id)} className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {f.comment && <p className="text-sm text-slate-300 mt-3 leading-relaxed border-t border-slate-800 pt-3">{f.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {activeTab === "push" && canAccess("push") && (
            <div className="w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <BellRing className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Notifications Push</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Envoyer a un etudiant ou a tous les etudiants du centre</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Titre *</label>
                  <input
                    type="text"
                    placeholder="ex: Nouveau cours disponible"
                    value={pushForm.title}
                    onChange={(e) => setPushForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Message *</label>
                  <textarea
                    rows={3}
                    placeholder="ex: Ta session d'entrainement TCF Canada t'attend."
                    value={pushForm.body}
                    onChange={(e) => setPushForm(p => ({ ...p, body: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">URL de destination</label>
                  <input
                    type="text"
                    placeholder="/centre/student/dashboard"
                    value={pushForm.url}
                    onChange={(e) => setPushForm(p => ({ ...p, url: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Destinataire <span className="text-slate-600 normal-case font-medium">(vide = tous les etudiants du centre)</span>
                  </label>
                  <select
                    value={pushForm.targetUserId}
                    onChange={(e) => setPushForm(p => ({ ...p, targetUserId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="">📣 Tous les etudiants du centre</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.prenom || s.email}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={sendPushNotification}
                  disabled={pushSending || !pushForm.title.trim() || !pushForm.body.trim()}
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
                >
                  {pushSending ? (
                    <><Activity className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Envoyer la notification</>
                  )}
                </button>

                {pushResult && (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pushResult.targets > 0 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Notification creee pour {pushResult.targets} etudiant{pushResult.targets > 1 ? "s" : ""}. Push navigateur : {pushResult.sent} / {pushResult.total} appareil{pushResult.total > 1 ? "s" : ""} abonne{pushResult.total > 1 ? "s" : ""}.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-800 bg-[#070b18] px-3 py-2 xl:hidden">
        <Link href="/centre/dashboard" className="flex flex-col items-center gap-1 text-slate-500">
          <GraduationCap className="h-5 w-5" />
          <span className="text-[10px] font-black">Accueil</span>
        </Link>
        <Link href="/centre/admin" className="flex flex-col items-center gap-1 text-orange-600">
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-black">Admin</span>
        </Link>
      </nav>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <Icon className="mb-3 h-5 w-5 text-orange-600" />
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function AdminNavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-all ${
        active ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PanelCard({ icon: Icon, title, value, detail }: { icon: any; title: string; value: number; detail: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-6">
      <Icon className="mb-5 h-6 w-6 text-orange-500" />
      <p className="text-4xl font-black text-white">{value}</p>
      <h3 className="mt-3 font-black text-slate-200">{title}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">{detail}</p>
    </div>
  );
}

function FeatureShell({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">Donnees filtrees uniquement sur les apprenants de ce centre.</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function RadarPanel({ students }: { students: CenterStudent[] }) {
  const ranked = [...students].sort((a, b) => (b.simulations_completed || 0) - (a.simulations_completed || 0));
  return (
    <FeatureShell icon={BarChart3} title="Radar Simulateurs">
      <div className="grid gap-3 md:grid-cols-3">
        <PanelMini label="Etudiants" value={students.length} />
        <PanelMini label="Actifs" value={students.filter((student) => student.current_activity || student.last_seen_at).length} />
        <PanelMini label="Simulations" value={students.reduce((sum, student) => sum + (student.simulations_completed || 0), 0)} />
      </div>
      <DataList items={ranked} empty="Aucune activite simulateur.">
        {(student: CenterStudent) => (
          <Row title={student.prenom || "Etudiant"} subtitle={student.email || ""} meta={`${student.simulations_completed || 0} simulations`} />
        )}
      </DataList>
    </FeatureShell>
  );
}

function MissionsPanel({
  students,
  missions,
  submissions,
  newMission,
  setNewMission,
  isDeploying,
  onDeploy,
  onDelete,
  commentOpenId,
  setCommentOpenId,
  submissionComments,
  setSubmissionComments,
  commentSendingId,
  commentSentId,
  onSendComment,
  onManualGrade,
}: {
  students: CenterStudent[];
  missions: any[];
  submissions: any[];
  newMission: { title: string; description: string; target: string; targetUserId: string; targetQuery: string };
  setNewMission: React.Dispatch<React.SetStateAction<{ title: string; description: string; target: string; targetUserId: string; targetQuery: string }>>;
  isDeploying: boolean;
  onDeploy: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  commentOpenId: string | null;
  setCommentOpenId: React.Dispatch<React.SetStateAction<string | null>>;
  submissionComments: Record<string, string>;
  setSubmissionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentSendingId: string | null;
  commentSentId: string | null;
  onSendComment: (submissionId: string) => void;
  onManualGrade: (submissionId: string, note: number, commentaire: string) => Promise<boolean>;
}) {
  const [openMissionId, setOpenMissionId] = useState<string | null>(null);
  const matchingStudents = useMemo(() => {
    const query = newMission.targetQuery.trim().toLowerCase();
    if (!query) return students.slice(0, 8);
    return students
      .filter((student) =>
        [student.prenom, student.email, student.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [students, newMission.targetQuery]);
  const selectedStudent = students.find((student) => student.id === newMission.targetUserId);

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Missions & Devoirs</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Deployer des exercices aux etudiants</p>
        </div>
      </div>

      <form onSubmit={onDeploy} className="mb-8 space-y-5 rounded-[2rem] border border-slate-800 bg-slate-900 p-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nouvelle mission</p>
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Titre *</label>
          <input
            type="text"
            placeholder="ex: Redige un paragraphe sur ton quartier ideal"
            value={newMission.title}
            onChange={(e) => setNewMission((mission) => ({ ...mission, title: e.target.value }))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-orange-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Description / Consigne</label>
          <textarea
            rows={3}
            placeholder="Details de la mission, conseils, criteres d'evaluation..."
            value={newMission.description}
            onChange={(e) => setNewMission((mission) => ({ ...mission, description: e.target.value }))}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-orange-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Cible</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setNewMission((mission) => ({ ...mission, target: "all", targetUserId: "", targetQuery: "" }))}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-black transition-colors ${
                newMission.target === "all"
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-orange-500/50"
              }`}
            >
              Tous les etudiants
            </button>
            <button
              type="button"
              onClick={() => setNewMission((mission) => ({ ...mission, target: "student" }))}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-black transition-colors ${
                newMission.target === "student"
                  ? "border-orange-500 bg-orange-500/10 text-white"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-orange-500/50"
              }`}
            >
              Un etudiant specifique
            </button>
          </div>

          {newMission.target === "student" && (
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={newMission.targetQuery}
                  onChange={(e) => setNewMission((mission) => ({ ...mission, targetQuery: e.target.value, targetUserId: "" }))}
                  placeholder="Rechercher par nom, email ou telephone"
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-sm font-bold text-white outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
                />
              </div>

              {selectedStudent && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-white">{selectedStudent.prenom || "Etudiant"}</p>
                    <p className="text-xs font-semibold text-orange-200/80">{selectedStudent.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewMission((mission) => ({ ...mission, targetUserId: "", targetQuery: "" }))}
                    className="text-[10px] font-black uppercase tracking-widest text-orange-200 hover:text-white"
                  >
                    Changer
                  </button>
                </div>
              )}

              {!selectedStudent && (
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {matchingStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setNewMission((mission) => ({ ...mission, targetUserId: student.id, targetQuery: student.prenom || student.email || "" }))}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-left transition-colors hover:border-orange-500/40 hover:bg-slate-800"
                    >
                      <span>
                        <span className="block text-sm font-black text-white">{student.prenom || "Etudiant"}</span>
                        <span className="block text-xs font-semibold text-slate-500">{student.email}</span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choisir</span>
                    </button>
                  ))}
                  {matchingStudents.length === 0 && (
                    <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-sm font-bold text-slate-500">Aucun etudiant trouve.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={isDeploying || !newMission.title.trim() || (newMission.target === "student" && !newMission.targetUserId)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-500 disabled:opacity-50"
        >
          {isDeploying ? <><Activity className="h-4 w-4 animate-spin" /> Deploiement...</> : <><Send className="h-4 w-4" /> Deployer la mission</>}
        </button>
      </form>

      <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Missions actives ({missions.length})</p>
      <div className="space-y-3">
        {missions.length === 0 && <p className="py-8 text-center text-sm italic text-slate-600">Aucune mission deployee pour l'instant.</p>}
        {missions.map((mission: any) => {
          const missionSubmissions = submissions.filter((submission) => submission.mission_id === mission.id);
          const isOpen = openMissionId === mission.id;

          return (
            <div key={mission.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="flex items-start justify-between gap-4 p-5 transition-colors hover:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => setOpenMissionId(isOpen ? null : mission.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{mission.title}</span>
                    <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-300">
                      {missionSubmissions.length} soumission(s)
                    </span>
                  </div>
                  {mission.description && <p className="mt-1 text-xs leading-relaxed text-slate-400">{mission.description}</p>}
                  <p className="mt-2 text-[10px] text-slate-600">{new Date(mission.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {isOpen ? "Fermer" : "Voir"}
                  </span>
                  {mission.center_id && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(mission.id);
                      }}
                      className="mt-1 text-slate-600 transition-colors hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-800 bg-slate-950/35 p-4">
                  <SubmissionCards
                    submissions={missionSubmissions}
                    empty="Aucune soumission pour cette mission."
                    commentOpenId={commentOpenId}
                    setCommentOpenId={setCommentOpenId}
                    submissionComments={submissionComments}
                    setSubmissionComments={setSubmissionComments}
                    commentSendingId={commentSendingId}
                    commentSentId={commentSentId}
                    onSendComment={onSendComment}
                    onManualGrade={onManualGrade}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SubmissionsPanel({
  submissions,
  submissionFilter,
  setSubmissionFilter,
  commentOpenId,
  setCommentOpenId,
  submissionComments,
  setSubmissionComments,
  commentSendingId,
  commentSentId,
  onSendComment,
  onManualGrade,
}: {
  submissions: any[];
  submissionFilter: "all" | "done" | "pending_review";
  setSubmissionFilter: React.Dispatch<React.SetStateAction<"all" | "done" | "pending_review">>;
  commentOpenId: string | null;
  setCommentOpenId: React.Dispatch<React.SetStateAction<string | null>>;
  submissionComments: Record<string, string>;
  setSubmissionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentSendingId: string | null;
  commentSentId: string | null;
  onSendComment: (submissionId: string) => void;
  onManualGrade: (submissionId: string, note: number, commentaire: string) => Promise<boolean>;
}) {
  const filteredSubmissions = submissions.filter((submission) => submissionFilter === "all" || submission.status === submissionFilter);
  const pendingCount = submissions.filter((s) => s.status === "pending_review").length;

  return (
    <FeatureShell icon={FileDown} title="Soumissions">
      {pendingCount > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {pendingCount} devoir(s) en attente de correction.{" "}
          <Link href="/centre/cours/devoirs" className="font-black underline underline-offset-2 hover:text-amber-100">
            Ouvrir Cours → Devoirs
          </Link>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["all", "Toutes"],
          ["done", "Corrigees IA"],
          ["pending_review", "En attente"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSubmissionFilter(value as "all" | "done" | "pending_review")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
              submissionFilter === value
                ? "bg-orange-600 text-white"
                : "border border-slate-800 bg-slate-950 text-slate-400 hover:border-orange-500/40"
            }`}
          >
            {label}
            <span className="ml-2 opacity-60">
              {value === "all" ? submissions.length : submissions.filter((submission) => submission.status === value).length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <SubmissionCards
          submissions={filteredSubmissions}
          empty="Aucune soumission pour ce filtre."
          commentOpenId={commentOpenId}
          setCommentOpenId={setCommentOpenId}
          submissionComments={submissionComments}
          setSubmissionComments={setSubmissionComments}
          commentSendingId={commentSendingId}
          commentSentId={commentSentId}
          onSendComment={onSendComment}
          onManualGrade={onManualGrade}
        />
      </div>
    </FeatureShell>
  );
}

function SubmissionCards({
  submissions,
  empty,
  commentOpenId,
  setCommentOpenId,
  submissionComments,
  setSubmissionComments,
  commentSendingId,
  commentSentId,
  onSendComment,
  onManualGrade,
}: {
  submissions: any[];
  empty: string;
  commentOpenId: string | null;
  setCommentOpenId: React.Dispatch<React.SetStateAction<string | null>>;
  submissionComments: Record<string, string>;
  setSubmissionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentSendingId: string | null;
  commentSentId: string | null;
  onSendComment: (submissionId: string) => void;
  onManualGrade: (submissionId: string, note: number, commentaire: string) => Promise<boolean>;
}) {
  const [gradeOpenId, setGradeOpenId] = useState<string | null>(null);
  const [gradeNote, setGradeNote] = useState("");
  const [gradeComment, setGradeComment] = useState("");
  const [gradeSavingId, setGradeSavingId] = useState<string | null>(null);

  if (submissions.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center text-sm font-bold text-slate-500">{empty}</p>;
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        const corr = submission.correction;
        const scoreColor = corr
          ? corr.note >= 16
            ? "text-emerald-400"
            : corr.note >= 12
              ? "text-blue-400"
              : corr.note >= 8
                ? "text-amber-400"
                : "text-red-400"
          : "";
        const needsGrade = !corr && (submission.status === "pending_review" || submission.status === "correcting");

        return (
          <div key={submission.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-orange-500">
                  {submission.profiles?.prenom?.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{submission.profiles?.prenom || "Inconnu"}</p>
                  <p className="text-[10px] text-slate-500">{submission.profiles?.email}</p>
                  <p className="mt-1 text-xs font-bold text-orange-400">{submission.missions?.title}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {corr ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-black ${scoreColor}`}>{corr.note}</span>
                    <span className="text-sm text-slate-500">/20</span>
                    <span className={`text-xs font-black ${scoreColor}`}>{corr.niveau}</span>
                  </div>
                ) : (
                  <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${
                    submission.status === "pending_review"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-slate-700 text-slate-500"
                  }`}>
                    {submission.status === "pending_review" ? "En attente" : submission.status}
                  </span>
                )}
                <span className="text-[9px] text-slate-600">{new Date(submission.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>

            {submission.answer_text && (
              <div className="border-t border-slate-800 px-5 pb-4 pt-4">
                <p className="mb-2 text-[9px] font-black uppercase text-slate-500">Reponse</p>
                <p className="line-clamp-3 text-sm leading-relaxed text-slate-300">{submission.answer_text}</p>
              </div>
            )}

            {submission.file_url && (
              <div className="px-5 pb-4">
                <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 transition-colors hover:text-orange-300">
                  <FileText className="h-3.5 w-3.5" /> {submission.file_name || "Fichier joint"}
                </a>
              </div>
            )}

            {corr && (
              <div className="border-t border-slate-800 bg-slate-950/40 px-5 py-4">
                <p className="mb-2 text-[9px] font-black uppercase text-emerald-400">Correction {corr.corrected_by === "manual" ? "enseignant" : "IA"}</p>
                <p className="text-xs italic leading-relaxed text-slate-400">{corr.commentaire_global}</p>
                {corr.conseil_coach && <p className="mt-2 text-xs text-orange-300">Conseil: {corr.conseil_coach}</p>}
              </div>
            )}

            {submission.admin_comment && (
              <div className="border-t border-slate-800 bg-orange-500/5 px-5 py-4">
                <p className="mb-2 text-[9px] font-black uppercase text-orange-400">Commentaire admin</p>
                <p className="text-sm leading-relaxed text-slate-200">{submission.admin_comment}</p>
                {submission.admin_comment_at && (
                  <p className="mt-2 text-[9px] text-slate-600">
                    Envoye le {new Date(submission.admin_comment_at).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            )}

            {needsGrade && (
              <div className="border-t border-amber-500/20 bg-amber-500/5 px-5 py-4">
                {gradeOpenId !== submission.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGradeOpenId(submission.id);
                      setGradeNote("");
                      setGradeComment("");
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-amber-950 transition-colors hover:bg-amber-400"
                  >
                    Corriger manuellement
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Note /20 + commentaire</p>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      inputMode="decimal"
                      value={gradeNote}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setGradeNote("");
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n)) return;
                        if (n > 20) setGradeNote("20");
                        else if (n < 0) setGradeNote("0");
                        else setGradeNote(raw);
                      }}
                      placeholder="Note (0-20)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none focus:border-amber-500"
                    />
                    <textarea
                      value={gradeComment}
                      onChange={(e) => setGradeComment(e.target.value)}
                      placeholder="Commentaire pour l'etudiant..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-amber-500"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={gradeSavingId === submission.id}
                        onClick={async () => {
                          const note = Number(gradeNote);
                          if (!Number.isFinite(note) || note < 0 || note > 20) {
                            alert("Note invalide (0-20).");
                            return;
                          }
                          setGradeSavingId(submission.id);
                          const ok = await onManualGrade(submission.id, note, gradeComment);
                          setGradeSavingId(null);
                          if (ok) {
                            setGradeOpenId(null);
                            setGradeNote("");
                            setGradeComment("");
                          }
                        }}
                        className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {gradeSavingId === submission.id ? "Enregistrement..." : "Valider la note"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradeOpenId(null)}
                        className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  const opening = commentOpenId !== submission.id;
                  setCommentOpenId(opening ? submission.id : null);
                  if (opening && !submissionComments[submission.id]) {
                    setSubmissionComments((current) => ({ ...current, [submission.id]: submission.admin_comment || "" }));
                  }
                }}
                className={`flex items-center gap-2 text-sm font-black transition-colors ${
                  commentOpenId === submission.id ? "text-orange-400" : "text-slate-400 hover:text-orange-400"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Faire un commentaire
                {commentSentId === submission.id && <span className="ml-2 text-[10px] uppercase tracking-widest text-emerald-400">Envoye</span>}
              </button>

              {commentOpenId === submission.id && (
                <div className="pt-4">
                  <textarea
                    value={submissionComments[submission.id] || ""}
                    onChange={(event) => setSubmissionComments((current) => ({ ...current, [submission.id]: event.target.value }))}
                    placeholder="Ecrivez votre commentaire a l'etudiant..."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-orange-500"
                  />
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onSendComment(submission.id)}
                      disabled={commentSendingId === submission.id || !submissionComments[submission.id]?.trim()}
                      className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commentSendingId === submission.id ? <Activity className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Envoyer
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentOpenId(null)}
                      disabled={commentSendingId === submission.id}
                      className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoachingPanel({
  sessions,
  actionId,
  onDecision,
  onRefresh,
}: {
  sessions: any[];
  actionId: string | null;
  onDecision: (appointmentId: string, status: "confirmed" | "refused" | "cancelled" | "effectue") => void;
  onRefresh: () => void;
}) {
  const now = Date.now();
  const normalizedSessions = sessions.map((session) => {
    const isPast = new Date(session.scheduled_at).getTime() < now;
    return isPast && session.status === "confirmed" ? { ...session, status: "effectue" } : session;
  });
  const upcoming = normalizedSessions
    .filter((session) => new Date(session.scheduled_at).getTime() > now && (session.status === "pending" || session.status === "confirmed"))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const past = normalizedSessions
    .filter((session) => session.status === "effectue" && new Date(session.scheduled_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  const stats = {
    pending: upcoming.filter((session) => session.status === "pending").length,
    confirmed: upcoming.filter((session) => session.status === "confirmed").length,
    effectue: past.length,
  };

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Coaching</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Gestion des rendez-vous du centre</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-orange-500/40"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Actualiser
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
          <p className="text-3xl font-black text-amber-400">{stats.pending}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-500/70">En attente</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
          <p className="text-3xl font-black text-emerald-400">{stats.confirmed}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-500/70">Confirmes</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 text-center">
          <p className="text-3xl font-black text-slate-300">{stats.effectue}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Effectues (30j)</p>
        </div>
      </div>

      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">A venir</p>
      <div className="mb-8 space-y-4">
        {upcoming.length === 0 && (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/50 py-6 text-center text-sm italic text-slate-600">Aucun rendez-vous futur.</p>
        )}
        {upcoming.map((appointment) => {
          const student = appointment.profiles;
          const isPending = appointment.status === "pending";
          const isConfirmed = appointment.status === "confirmed";
          const remaining =
            student?.coaching_total === 9999
              ? "Illimite"
              : `${Math.max(0, (student?.coaching_total || 0) - (student?.coaching_used || 0))} / ${student?.coaching_total || 0}`;

          return (
            <div key={appointment.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-orange-500">
                    {student?.prenom?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-white">{student?.prenom || "Etudiant"}</p>
                      <span className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${isConfirmed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
                        {isConfirmed ? "Confirme" : "En attente"}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{student?.email}</p>
                    {student?.phone && <p className="text-[10px] text-slate-500">{student.phone}</p>}
                    <p className="mt-3 text-sm font-black text-orange-400">
                      {new Date(appointment.scheduled_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} a{" "}
                      {new Date(appointment.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span className={remaining === "0 / 0" || remaining.startsWith("0 /") ? "text-red-400" : "text-emerald-400"}>
                        Coaching restant : {remaining}
                      </span>
                    </p>
                    {appointment.note && (
                      <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">{appointment.note}</p>
                    )}
                  </div>
                </div>

                {isPending && (
                  <div className="flex shrink-0 gap-2 md:flex-col">
                    <button
                      type="button"
                      onClick={() => onDecision(appointment.id, "confirmed")}
                      disabled={actionId === appointment.id}
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-50"
                    >
                      {actionId === appointment.id ? <Activity className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecision(appointment.id, "refused")}
                      disabled={actionId === appointment.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
                    >
                      {actionId === appointment.id ? <Activity className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Refuser
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div className="flex shrink-0 gap-2 md:flex-col">
                    <button
                      type="button"
                      onClick={() => onDecision(appointment.id, "cancelled")}
                      disabled={actionId === appointment.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-orange-300 transition-all hover:bg-orange-500/20 disabled:cursor-wait disabled:opacity-50"
                    >
                      {actionId === appointment.id ? <Activity className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Annuler RDV
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Effectues (30 derniers jours)</p>
      {past.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/50 py-6 text-center text-sm italic text-slate-700">Aucune seance effectuee sur les 30 derniers jours.</p>
      ) : (
        <div className="space-y-3">
          {past.map((appointment) => {
            const student = appointment.profiles;
            return (
              <div key={appointment.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 opacity-80 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-400">
                    {student?.prenom?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-300">{student?.prenom || "Etudiant"}</p>
                      <span className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[9px] font-black uppercase text-slate-400">Effectue</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      {new Date(appointment.scheduled_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} a{" "}
                      {new Date(appointment.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MessagesPanel({ messages, students, onRefresh }: { messages: any[]; students: CenterStudent[]; onRefresh: () => void }) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const conversations = useMemo(() => {
    const map = new Map<string, { student: CenterStudent; lastMessage: string; lastAt: string; unread: number }>();
    messages.forEach((message) => {
      const studentId = studentMap.has(message.from_user_id) ? message.from_user_id : message.to_user_id;
      const student = studentMap.get(studentId);
      if (!student) return;
      const current = map.get(studentId);
      if (!current || new Date(message.created_at).getTime() > new Date(current.lastAt).getTime()) {
        map.set(studentId, {
          student,
          lastMessage: message.message || "",
          lastAt: message.created_at,
          unread: current?.unread || 0,
        });
      }
      if (message.from_user_id === studentId && !message.read_at) {
        const row = map.get(studentId);
        if (row) row.unread += 1;
      }
    });
    return [...map.values()].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [messages, studentMap]);

  useEffect(() => {
    if (!selectedStudentId && conversations[0]?.student.id) {
      setSelectedStudentId(conversations[0].student.id);
    }
  }, [conversations, selectedStudentId]);

  const selectedStudent = studentMap.get(selectedStudentId) || conversations[0]?.student || null;
  const selectedMessages = selectedStudent
    ? messages
        .filter((message) => message.from_user_id === selectedStudent.id || message.to_user_id === selectedStudent.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = messageInput.trim();
    if (!content || !selectedStudent || sending) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSending(true);
    const res = await fetch("/api/center/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: "private_message", toUserId: selectedStudent.id, message: content }),
    });
    setSending(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Message non envoye.");
      return;
    }
    setMessageInput("");
    onRefresh();
  };

  return (
    <FeatureShell icon={MessageCircle} title="Messages Prives">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-3">
          <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Conversations</p>
          {conversations.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-800 p-4 text-sm font-bold text-slate-500">Aucune conversation pour les etudiants du centre.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.student.id}
                  onClick={() => setSelectedStudentId(conversation.student.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedStudent?.id === conversation.student.id
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-slate-800 bg-slate-900/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">{conversation.student.prenom || conversation.student.email || "Etudiant"}</p>
                    {conversation.unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{conversation.unread}</span>}
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{conversation.lastMessage}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-[520px] flex-col rounded-3xl border border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 p-4">
            <p className="text-sm font-black text-white">{selectedStudent?.prenom || selectedStudent?.email || "Selectionnez une conversation"}</p>
            <p className="text-xs font-semibold text-slate-500">{selectedStudent?.email || "Messages prives du centre uniquement"}</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {selectedMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm font-bold text-slate-600">
                Selectionnez un etudiant ou demarrez une conversation.
              </div>
            ) : (
              selectedMessages.map((message) => {
                const isStudent = message.from_user_id === selectedStudent?.id;
                return (
                  <div key={message.id} className={`flex ${isStudent ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${
                      isStudent
                        ? "rounded-bl-sm border border-slate-800 bg-slate-900 text-slate-200"
                        : "rounded-br-sm bg-orange-600 text-white"
                    }`}>
                      <p className={`mb-1 text-[9px] font-black uppercase tracking-widest ${isStudent ? "text-slate-500" : "text-orange-100"}`}>
                        {isStudent ? "Etudiant" : "Centre"}
                      </p>
                      <p>{message.message}</p>
                      <p className={`mt-1 text-[10px] ${isStudent ? "text-slate-600" : "text-orange-100"}`}>
                        {new Date(message.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={sendMessage} className="flex gap-3 border-t border-slate-800 p-4">
            <input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={!selectedStudent || sending}
              placeholder={selectedStudent ? `Message a ${selectedStudent.prenom || "l'etudiant"}...` : "Selectionnez un etudiant"}
              className="h-12 flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm font-bold text-white outline-none focus:border-orange-500"
            />
            <button disabled={!messageInput.trim() || !selectedStudent || sending} className="flex h-12 items-center gap-2 rounded-2xl bg-orange-600 px-5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40">
              <Send className="h-4 w-4" />
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </FeatureShell>
  );
}

function CenterSupportPanel({
  messages,
  currentUserId,
  input,
  setInput,
  image,
  imagePreview,
  setImage,
  sendError,
  sending,
  onSend,
  endRef,
}: {
  messages: any[];
  currentUserId: string | null;
  input: string;
  setInput: (value: string) => void;
  image: File | null;
  imagePreview: string | null;
  setImage: (file: File | null) => void;
  sendError: string | null;
  sending: boolean;
  onSend: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const timeline = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <FeatureShell icon={Headphones} title="Support IAG Academy">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">Support B2B</p>
          <h2 className="mt-2 text-2xl font-black text-white">Contacter l'equipe technique</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Les demandes envoyees ici remontent directement dans le dashboard admin IAG Academy.
          </p>
          <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-blue-200">Canal prioritaire centre</p>
            <p className="mt-2 text-sm font-semibold text-slate-300">Compte, acces, bug technique, configuration du centre.</p>
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
          <div className="border-b border-slate-800 p-4">
            <p className="text-sm font-black text-white">Conversation support</p>
            <p className="text-xs font-semibold text-slate-500">Equipe technique IAG Academy</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {timeline.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm font-bold text-slate-600">
                <Headphones className="mb-3 h-10 w-10 opacity-40" />
                Envoyez votre premiere demande au support IAG.
              </div>
            ) : (
              timeline.map((message) => {
                const isMe = message.from_user_id === currentUserId;
                const imageUrl = getSupportImageUrl(message);
                const messageText = getSupportMessageText(message.message || "");
                return (
                  <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${
                      isMe
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm border border-slate-800 bg-slate-900 text-slate-200"
                    }`}>
                      <p className={`mb-1 text-[9px] font-black uppercase tracking-widest ${isMe ? "text-blue-100" : "text-slate-500"}`}>
                        {isMe ? "Centre" : "Support IAG"}
                      </p>
                      {imageUrl && (
                        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="mb-2 block overflow-hidden rounded-xl border border-white/10 bg-black/10">
                          <img src={imageUrl} alt="Capture support" className="block max-h-56 w-auto max-w-[min(260px,65vw)] object-contain" />
                          <span className={`block px-3 py-2 text-[10px] font-black uppercase tracking-widest ${isMe ? "text-blue-100" : "text-slate-500"}`}>
                            Ouvrir l'image
                          </span>
                        </a>
                      )}
                      {messageText && <p className="whitespace-pre-wrap">{messageText}</p>}
                      <p className={`mt-2 text-[10px] ${isMe ? "text-blue-100" : "text-slate-600"}`}>
                        {new Date(message.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-800 p-4">
            {imagePreview && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-2">
                <img src={imagePreview} alt="Apercu" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{image?.name}</p>
                  <p className="text-[10px] text-slate-500">Image prete a envoyer</p>
                </div>
                <button type="button" onClick={() => setImage(null)} className="rounded-lg p-2 text-slate-500 hover:text-red-400">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}
            {sendError && (
              <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                {sendError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-slate-900 text-slate-400 transition-colors hover:bg-slate-800">
                <ImageIcon className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => setImage(event.target.files?.[0] || null)}
                  disabled={sending}
                />
              </label>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }}
                placeholder="Ecrire au support IAG..."
                disabled={sending}
                className="h-12 flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm font-bold text-white outline-none focus:border-blue-500"
              />
              <button onClick={onSend} disabled={(!input.trim() && !image) || sending} className="flex h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40">
                {sending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer
              </button>
            </div>
          </div>
        </section>
      </div>
    </FeatureShell>
  );
}

function UserFeedbackPanel({ feedbacks }: { feedbacks: any[] }) {
  return (
    <FeatureShell icon={MessageCircle} title="Retours Utilisateurs">
      <DataList items={feedbacks} empty="Aucun retour utilisateur pour ce centre.">
        {(feedback: any) => <Row title={feedback.profiles?.prenom || "Etudiant"} subtitle={feedback.message || feedback.content || feedback.description || "Retour utilisateur"} meta={feedback.status || "nouveau"} />}
      </DataList>
    </FeatureShell>
  );
}

function DataList<T>({ items, empty, children }: { items: T[]; empty: string; children: (item: T) => React.ReactNode }) {
  if (items.length === 0) {
    return <div className="mt-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center text-sm font-bold text-slate-500">{empty}</div>;
  }
  return <div className="mt-6 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-950/40">{items.map((item: any) => <div key={item.id} className="p-4">{children(item)}</div>)}</div>;
}

function Row({ title, subtitle, meta }: { title: string; subtitle: string; meta: string }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>
      <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{meta}</span>
    </div>
  );
}

function PanelMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function Input({ icon: Icon, value, onChange, placeholder, type = "text", required = false }: {
  icon: any;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 focus-within:border-orange-500">
      <div className="pl-4 pr-2 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-2 text-sm font-bold text-slate-100 outline-none placeholder:font-medium placeholder:text-slate-500"
      />
    </div>
  );
}
