"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Trash2, X, Loader2, Check, ArrowLeft,
  Users, User, Clock, Calendar, Send, ChevronDown, ChevronRight,
  BookOpen, CheckCircle2, AlertTriangle, Lock, Eye, Trophy,
  UserCheck, UserX, Sparkles, PenLine, Paperclip, UploadCloud,
  Mic, Video
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  ALL_SUBMISSION_FORMATS,
  SUBMISSION_FORMAT_LABELS,
  type SubmissionFormat,
} from "@/app/utils/missionSubmissionFormats";
const BLUE = "#11224E";
const ORANGE = "#eb670e";

type TeachingSubject = {
  filiere_matiere_id: string;
  discipline_name: string;
  filiere_name: string;
  niveau_annee: number | null;
  filiere_id: string;
  niveau_id: string | null;
};

type GroupeOption = { id: string; nom: string };
type StudentOption = { id: string; prenom: string; nom: string; enrollment_id: string; groupe_id: string | null };

type Devoir = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  unlock_at: string | null;
  created_at: string;
  target_scope: string;
  correction_mode: string;
  submission_formats: SubmissionFormat[];
  submission_count: number;
  pending_count: number;
  attachment_url: string | null;
  attachment_name: string | null;
};

type Submission = {
  id: string;
  user_id?: string;
  student_name: string;
  answer_text: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  created_at: string;
  correction: any;
  admin_comment: string | null;
  rank?: number | null;
  rank_total?: number | null;
};

type MissionStats = {
  eligible_count: number;
  submitted_count: number;
  not_submitted_count: number;
  not_submitted: { id: string; name: string }[];
  mission: { correction_mode: string };
};

export default function TrainerDevoirsPage() {
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerType, setCenterType] = useState<string>("generic");
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<TeachingSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<TeachingSubject | null>(null);

  const [devoirs, setDevoirs] = useState<Devoir[]>([]);
  const [devoirsLoading, setDevoirsLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDevoir, setSelectedDevoir] = useState<Devoir | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [missionStats, setMissionStats] = useState<MissionStats | null>(null);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [manualModal, setManualModal] = useState<Submission | null>(null);
  const [manualNote, setManualNote] = useState("");
  const [manualComment, setManualComment] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [pendingInbox, setPendingInbox] = useState<Array<{
    id: string;
    mission_id: string;
    mission_title: string;
    filiere_matiere_id: string | null;
    student_name: string;
    status: string;
    created_at: string;
  }>>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Formulaire création
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState<"all" | "groupes" | "students">("all");
  const [targetGroupeIds, setTargetGroupeIds] = useState<string[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [correctionMode, setCorrectionMode] = useState<"auto" | "manual">("auto");
  const [submissionFormats, setSubmissionFormats] = useState<SubmissionFormat[]>(["text", "file"]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [dueAt, setDueAt] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      setSessionToken(session.access_token);

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, role")
        .eq("id", session.user.id)
        .single();

      setCenterId(profile?.center_id || null);
      setUserRole(profile?.role || null);

      if (!profile?.center_id) { setLoading(false); return; }

      const { data: centerRow } = await supabase
        .from("centers")
        .select("center_type")
        .eq("id", profile.center_id)
        .maybeSingle();
      const cType = centerRow?.center_type || "generic";
      setCenterType(cType);

      const isTcf = isTcfCanadaCenter(cType);

      if (isTcf) {
        const res = await fetch("/api/centre/init-tcf-matieres", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const tcfSubjects: TeachingSubject[] = json.subjects || [];
          setSubjects(tcfSubjects);
          if (tcfSubjects.length > 0) setSelectedSubject(tcfSubjects[0]);
        }
      } else if (profile.role === "trainer") {
        const { data: mfData } = await supabase
          .from("matiere_formateurs")
          .select(`filiere_matiere_id, filiere_matieres(id, filiere_id, niveau_id, annee, exam_disciplines(name), filieres(name), niveaux(annee))`)
          .eq("formateur_id", session.user.id);

        setSubjects((mfData || []).map((mf: any) => {
          const fm = mf.filiere_matieres;
          return {
            filiere_matiere_id: mf.filiere_matiere_id,
            discipline_name: fm?.exam_disciplines?.name || "—",
            filiere_name: fm?.filieres?.name || "—",
            niveau_annee: fm?.niveaux?.annee || fm?.annee || null,
            filiere_id: fm?.filiere_id || "",
            niveau_id: fm?.niveau_id || null,
          };
        }));
      } else {
        const { data: fmData } = await supabase
          .from("filiere_matieres")
          .select("id, filiere_id, niveau_id, annee, exam_disciplines(name), filieres(name, center_id), niveaux(annee)")
          .eq("filieres.center_id", profile.center_id);

        setSubjects((fmData || []).filter((fm: any) => fm.filieres?.center_id === profile.center_id).map((fm: any) => ({
          filiere_matiere_id: fm.id,
          discipline_name: fm.exam_disciplines?.name || "—",
          filiere_name: fm.filieres?.name || "—",
          niveau_annee: fm.niveaux?.annee || fm.annee || null,
          filiere_id: fm.filiere_id,
          niveau_id: fm.niveau_id || null,
        })));
      }

      setLoading(false);
    })();
  }, []);

  const loadPendingInbox = useCallback(async (token?: string | null) => {
    const auth = token || sessionToken;
    if (!auth) return { items: [] as Array<{
      id: string;
      mission_id: string;
      mission_title: string;
      filiere_matiere_id: string | null;
      student_name: string;
      status: string;
      created_at: string;
    }>, by_mission: {} as Record<string, { total: number; pending: number }> };
    try {
      const res = await fetch("/api/centre/missions/pending", {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
      });
      if (!res.ok) {
        return { items: [], by_mission: {} };
      }
      const json = await res.json();
      const items = json.items || [];
      setPendingInbox(items);
      return {
        items: items as Array<{
          id: string;
          mission_id: string;
          mission_title: string;
          filiere_matiere_id: string | null;
          student_name: string;
          status: string;
          created_at: string;
        }>,
        by_mission: (json.by_mission || {}) as Record<string, { total: number; pending: number }>,
      };
    } catch {
      return { items: [], by_mission: {} };
    }
  }, [sessionToken]);

  useEffect(() => {
    if (sessionToken) void loadPendingInbox(sessionToken);
  }, [sessionToken, loadPendingInbox]);

  // ============================================================
  // CHARGER DEVOIRS D'UNE MATIÈRE
  // ============================================================
  const loadDevoirs = useCallback(async () => {
    if (!selectedSubject || !centerId) return;
    setDevoirsLoading(true);

    const { data: missionRows } = await supabase
      .from("missions")
      .select("id, title, description, due_at, unlock_at, created_at, target_user_id, groupe_id, correction_mode, submission_formats, attachment_url, attachment_name")
      .eq("center_id", centerId)
      .eq("filiere_matiere_id", selectedSubject.filiere_matiere_id)
      .order("created_at", { ascending: false });

    const missionIds = (missionRows || []).map((m: any) => m.id);
    const groupeCounts: Record<string, number> = {};
    const studentCounts: Record<string, number> = {};

    const { by_mission } = sessionToken
      ? await loadPendingInbox(sessionToken)
      : { by_mission: {} as Record<string, { total: number; pending: number }> };

    if (missionIds.length > 0) {
      const [mgResult, msResult] = await Promise.all([
        supabase.from("mission_groupes").select("mission_id").in("mission_id", missionIds),
        supabase.from("mission_students").select("mission_id").in("mission_id", missionIds),
      ]);
      const mgRows = mgResult.error ? [] : mgResult.data;
      const msRows = msResult.error ? [] : msResult.data;

      for (const g of mgRows || []) {
        groupeCounts[g.mission_id] = (groupeCounts[g.mission_id] || 0) + 1;
      }
      for (const s of msRows || []) {
        studentCounts[s.mission_id] = (studentCounts[s.mission_id] || 0) + 1;
      }
    }

    setDevoirs((missionRows || []).map((m: any) => {
      let target_scope = "Tous";
      if (studentCounts[m.id]) target_scope = `${studentCounts[m.id]} élève(s)`;
      else if (groupeCounts[m.id]) target_scope = `${groupeCounts[m.id]} classe(s)`;
      else if (m.target_user_id) target_scope = "Individuel";
      else if (m.groupe_id) target_scope = "Classe";

      const counts = by_mission[m.id] || { total: 0, pending: 0 };
      const formats = Array.isArray(m.submission_formats) && m.submission_formats.length > 0
        ? m.submission_formats.filter((f: string) => ALL_SUBMISSION_FORMATS.includes(f as SubmissionFormat))
        : [...ALL_SUBMISSION_FORMATS];

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        due_at: m.due_at,
        unlock_at: m.unlock_at,
        created_at: m.created_at,
        target_scope,
        correction_mode: m.correction_mode || "auto",
        submission_formats: formats as SubmissionFormat[],
        submission_count: counts.total,
        pending_count: counts.pending,
        attachment_url: m.attachment_url || null,
        attachment_name: m.attachment_name || null,
      };
    }));

    setDevoirsLoading(false);
  }, [selectedSubject, centerId, sessionToken, loadPendingInbox]);

  useEffect(() => {
    if (selectedSubject) {
      loadDevoirs();
      setSelectedDevoir(null);
      setShowCreateForm(false);
    }
  }, [selectedSubject, loadDevoirs]);

  // Charger groupes et étudiants quand une matière est sélectionnée
  useEffect(() => {
    if (!selectedSubject) return;
    (async () => {
      // Groupes de la filière/niveau
      let grpQuery = supabase.from("groupes").select("id, nom").eq("filiere_id", selectedSubject.filiere_id);
      if (selectedSubject.niveau_id && !isTcfCanadaCenter(centerType)) {
        grpQuery = grpQuery.eq("niveau_id", selectedSubject.niveau_id);
      }
      const { data: grpData } = await grpQuery;
      setGroupes(grpData || []);

      let enrollQuery = supabase
        .from("enrollments")
        .select("id, student_id, groupe_id, profiles:student_id(prenom, nom)")
        .eq("filiere_id", selectedSubject.filiere_id)
        .eq("status", "active");
      if (selectedSubject.niveau_id && !isTcfCanadaCenter(centerType)) {
        enrollQuery = enrollQuery.eq("niveau_id", selectedSubject.niveau_id);
      }
      const { data: enrollData } = await enrollQuery;

      setStudents((enrollData || []).map((e: any) => ({
        id: e.student_id,
        prenom: e.profiles?.prenom || "",
        nom: e.profiles?.nom || "",
        enrollment_id: e.id,
        groupe_id: e.groupe_id || null,
      })).sort((a: StudentOption, b: StudentOption) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)));
    })();
  }, [selectedSubject, centerType]);

  // ============================================================
  // CRÉER UN DEVOIR
  // ============================================================
  const toggleGroupe = (id: string) => {
    setTargetGroupeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleStudent = (id: string) => {
    setTargetStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSubmissionFormat = (format: SubmissionFormat) => {
    setSubmissionFormats((prev) => {
      if (prev.includes(format)) {
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== format);
      }
      return [...prev, format];
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) { setError("Le titre est requis."); return; }
    if (submissionFormats.length === 0) {
      setError("Choisissez au moins un format de soumission."); return;
    }
    if (targetType === "groupes" && targetGroupeIds.length === 0) {
      setError("Sélectionnez au moins une classe."); return;
    }
    if (targetType === "students" && targetStudentIds.length === 0) {
      setError("Sélectionnez au moins un élève."); return;
    }
    if (!selectedSubject || !centerId || !userId) return;
    setSaving(true); setError("");

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (attachedFile) {
      const ext = attachedFile.name.split(".").pop() || "bin";
      const path = `${centerId}/devoirs/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("mission-files")
        .upload(path, attachedFile, { upsert: false });

      if (uploadError) {
        setError("Échec de l'envoi du fichier joint.");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("mission-files").getPublicUrl(path);
      attachmentUrl = urlData.publicUrl;
      attachmentName = attachedFile.name;
    }

    const payload: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || null,
      center_id: centerId,
      formateur_id: userId,
      filiere_matiere_id: selectedSubject.filiere_matiere_id,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      unlock_at: unlockAt ? new Date(unlockAt).toISOString() : null,
      correction_mode: correctionMode,
      submission_formats: submissionFormats,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      target_user_id: null,
      groupe_id: targetType === "groupes" && targetGroupeIds.length === 1 ? targetGroupeIds[0] : null,
    };

    const { data: newMission, error: insErr } = await supabase
      .from("missions")
      .insert(payload)
      .select("id")
      .single();

    if (insErr || !newMission) {
      setError(insErr?.message || "Erreur lors de la création.");
      setSaving(false);
      return;
    }

    if (targetType === "groupes" && targetGroupeIds.length > 0) {
      await supabase.from("mission_groupes").insert(
        targetGroupeIds.map(gid => ({ mission_id: newMission.id, groupe_id: gid }))
      );
    }

    if (targetType === "students" && targetStudentIds.length > 0) {
      await supabase.from("mission_students").insert(
        targetStudentIds.map(sid => ({ mission_id: newMission.id, user_id: sid }))
      );
    }

    let notifyStudents = students;
    if (targetType === "students") {
      notifyStudents = students.filter(s => targetStudentIds.includes(s.id));
    } else if (targetType === "groupes") {
      notifyStudents = students.filter(s => s.groupe_id && targetGroupeIds.includes(s.groupe_id));
    }

    if (notifyStudents.length > 0) {
      const notifications = notifyStudents.map(s => ({
        user_id: s.id,
        message: `📝 Nouveau devoir : ${title.trim()} (${selectedSubject.discipline_name})`,
      }));
      await supabase.from("notifications").insert(notifications);
    }

    setTitle(""); setDescription(""); setDueAt(""); setUnlockAt("");
    setTargetType("all"); setTargetGroupeIds([]); setTargetStudentIds([]);
    setCorrectionMode("auto"); setSubmissionFormats(["text", "file"]); setAttachedFile(null);
    setShowCreateForm(false);
    await loadDevoirs();
    setSaving(false);
  };

  // ============================================================
  // SUPPRIMER UN DEVOIR
  // ============================================================
  const deleteDevoir = async (id: string) => {
    if (!confirm("Supprimer ce devoir et toutes ses soumissions ?")) return;
    await supabase.from("missions").delete().eq("id", id);
    setDevoirs(prev => prev.filter(d => d.id !== id));
    if (selectedDevoir?.id === id) setSelectedDevoir(null);
  };

  // ============================================================
  // CHARGER LES SOUMISSIONS D'UN DEVOIR
  // ============================================================
  const loadSubmissions = useCallback(async (devoir: Devoir) => {
    setSelectedDevoir(devoir);
    setSubmissionsLoading(true);
    setMissionStats(null);
    setSubmissions([]);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmissionsLoading(false); return; }

    try {
      const res = await fetch(`/api/centre/missions/stats?mission_id=${encodeURIComponent(devoir.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setMissionStats(data);
        setSubmissions(data.submissions || []);
      } else {
        console.error("stats error:", data.error);
        setSubmissions([]);
      }
    } catch (err) {
      console.error("stats fetch failed:", err);
      setSubmissions([]);
    }
    setSubmissionsLoading(false);
  }, []);

  // Rafraîchir le panneau ouvert quand les compteurs changent (nouvelle soumission)
  useEffect(() => {
    if (!selectedDevoir) return;
    const updated = devoirs.find((d) => d.id === selectedDevoir.id);
    if (!updated) return;
    if (
      updated.submission_count !== selectedDevoir.submission_count ||
      updated.pending_count !== selectedDevoir.pending_count
    ) {
      void loadSubmissions(updated);
    }
  }, [devoirs, selectedDevoir, loadSubmissions]);

  // Ouvrir automatiquement le premier devoir à corriger
  useEffect(() => {
    if (devoirsLoading || selectedDevoir || !selectedSubject) return;
    const withPending = devoirs.find((d) => d.pending_count > 0);
    if (withPending) void loadSubmissions(withPending);
  }, [devoirs, devoirsLoading, selectedDevoir, selectedSubject, loadSubmissions]);

  const handleAiCorrect = async (submissionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCorrectingId(submissionId);
    try {
      const res = await fetch("/api/centre/missions/correct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ submission_id: submissionId, action: "ai" }),
      });
      if (res.ok && selectedDevoir) await loadSubmissions(selectedDevoir);
      else {
        const data = await res.json();
        alert(data.error || "Erreur de correction.");
      }
    } finally {
      setCorrectingId(null);
    }
  };

  const handleManualSave = async () => {
    if (!manualModal) return;
    const note = Number(manualNote);
    if (!Number.isFinite(note) || note < 0 || note > 20) {
      alert("Note invalide (0-20).");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setManualSaving(true);
    try {
      const res = await fetch("/api/centre/missions/correct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          submission_id: manualModal.id,
          action: "manual",
          note,
          commentaire_global: manualComment,
        }),
      });
      if (res.ok) {
        setManualModal(null);
        setManualNote("");
        setManualComment("");
        if (selectedDevoir) await loadSubmissions(selectedDevoir);
        await loadPendingInbox(session.access_token);
        await loadDevoirs();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur de sauvegarde.");
      }
    } finally {
      setManualSaving(false);
    }
  };

  if (loading) return <CenterPageLoading />;

  const isTcfCenter = isTcfCanadaCenter(centerType);
  const isLocked = (unlockAt: string | null) => unlockAt && new Date(unlockAt).getTime() > Date.now();
  const isPastDue = (dueAt: string | null) => dueAt && new Date(dueAt).getTime() < Date.now();

  return (
    <div className="min-h-[100dvh] bg-white text-[#11224E] flex flex-col h-screen overflow-hidden">

        {/* HEADER */}
        <header className="shrink-0 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md px-6 py-5 z-20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <a href="/centre/cours" className="p-1 rounded-lg hover:bg-neutral-100 transition-colors"><ArrowLeft size={14} /></a>
                <FileText size={16} style={{ color: ORANGE }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Devoirs & Missions</span>
                {isTcfCenter && (
                  <span className="text-[9px] font-black uppercase text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">TCF Canada</span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: BLUE }}>
                {selectedSubject ? `${selectedSubject.discipline_name} — ${selectedSubject.filiere_name}` : isTcfCenter ? "Devoirs TCF Canada" : "Sélectionnez une matière"}
              </h1>
              {isTcfCenter && selectedSubject && (
                <p className="text-[11px] text-neutral-500 mt-1">
                  Ciblage multi-classes · Suivi des rendus · Correction IA ou manuelle · Classement élèves
                </p>
              )}
              {pendingInbox.length > 0 && (
                <p className="text-[11px] font-bold text-amber-700 mt-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {pendingInbox.length} devoir{pendingInbox.length > 1 ? "s" : ""} à corriger — ouvrez le devoir concerné ci-dessous
                </p>
              )}
            </div>
            {selectedSubject && (
              <button onClick={() => setShowCreateForm(true)} className="h-9 px-4 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 hover:opacity-90 transition-all" style={{ backgroundColor: ORANGE }}>
                <Plus size={14} /> Nouveau devoir
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* ══════════ GAUCHE : MES MATIÈRES ══════════ */}
          <div className="w-72 border-r border-neutral-200 bg-white flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                {userRole === "trainer" ? "Mes matières" : "Toutes les matières"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {subjects.length === 0 && (
                <p className="text-xs text-neutral-400 text-center py-8 px-4">Aucune matière assignée.</p>
              )}
              {subjects.map(s => {
                const isActive = selectedSubject?.filiere_matiere_id === s.filiere_matiere_id;
                const pendingForSubject = pendingInbox.filter((p) => p.filiere_matiere_id === s.filiere_matiere_id).length;
                return (
                  <button key={s.filiere_matiere_id} onClick={() => setSelectedSubject(s)} className={`w-full text-left p-3 rounded-xl transition-colors ${isActive ? "text-white" : "hover:bg-neutral-50"}`} style={isActive ? { backgroundColor: BLUE } : {}}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black truncate">{s.discipline_name}</p>
                      {pendingForSubject > 0 && (
                        <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-amber-400 text-amber-950" : "bg-amber-100 text-amber-700"}`}>
                          {pendingForSubject}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 ${isActive ? "text-white/60" : "text-neutral-400"}`}>
                      {s.filiere_name}{s.niveau_annee ? ` · Niv. ${s.niveau_annee}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════ CENTRE : LISTE DES DEVOIRS ══════════ */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedSubject ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-300">
                <FileText size={48} className="mb-3 opacity-40" />
                <p className="text-xs font-bold uppercase">Choisissez une matière à gauche</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* FORMULAIRE DE CRÉATION */}
                {showCreateForm && (
                  <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: BLUE }}>
                        <Plus size={14} style={{ color: ORANGE }} /> Nouveau devoir
                      </h3>
                      <button onClick={() => setShowCreateForm(false)} className="p-1.5 text-neutral-400 hover:text-black"><X size={16} /></button>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Titre *</label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Rédiger un paragraphe sur votre quartier" className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" style={{ color: BLUE }} />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Consigne / Description</label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Instructions détaillées, critères d'évaluation..." className="w-full p-3 rounded-xl border bg-neutral-50 text-xs font-medium outline-none resize-none focus:border-blue-500" />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Fichier joint (optionnel)</label>
                      {attachedFile ? (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl">
                          <Paperclip size={14} style={{ color: ORANGE }} />
                          <span className="text-xs font-bold text-orange-900 flex-1 truncate">{attachedFile.name}</span>
                          <button type="button" onClick={() => setAttachedFile(null)} className="p-1 text-orange-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-xs font-bold text-neutral-500 hover:border-orange-300 hover:text-orange-600 cursor-pointer transition-colors">
                          <UploadCloud size={14} /> PDF, image, audio ou vidéo
                          <input type="file" accept=".pdf,image/*,audio/*,video/*" className="hidden" onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>

                    {/* Ciblage */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-2">Destinataires</label>
                      <div className="flex gap-2 mb-3">
                        {([
                          { value: "all" as const, label: "Tous", icon: Users },
                          { value: "groupes" as const, label: "Classes", icon: BookOpen },
                          { value: "students" as const, label: "Élèves", icon: User },
                        ]).map(({ value, label, icon: Icon }) => (
                          <button key={value} onClick={() => setTargetType(value)} className={`flex-1 h-10 rounded-xl border-2 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${targetType === value ? "border-orange-400 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-400 hover:border-neutral-300"}`}>
                            <Icon size={13} /> {label}
                          </button>
                        ))}
                      </div>

                      {targetType === "groupes" && groupes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto">
                          {groupes.map(g => (
                            <button key={g.id} type="button" onClick={() => toggleGroupe(g.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${targetGroupeIds.includes(g.id) ? "border-orange-400 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}>
                              {g.nom}
                            </button>
                          ))}
                        </div>
                      )}

                      {targetType === "students" && students.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto">
                          {students.map(s => (
                            <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${targetStudentIds.includes(s.id) ? "border-orange-400 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-300"}`}>
                              {s.nom} {s.prenom}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-neutral-400">
                        {targetType === "all" && `${students.length} élève(s) recevront ce devoir.`}
                        {targetType === "groupes" && targetGroupeIds.length > 0 && `${students.filter(s => s.groupe_id && targetGroupeIds.includes(s.groupe_id)).length} élève(s) dans ${targetGroupeIds.length} classe(s).`}
                        {targetType === "students" && targetStudentIds.length > 0 && `${targetStudentIds.length} élève(s) sélectionné(s).`}
                      </p>
                    </div>

                    {/* Formats de soumission */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-2">Formats de soumission *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { value: "text" as const, label: "Texte", icon: FileText },
                          { value: "file" as const, label: "Fichier", icon: Paperclip },
                          { value: "audio" as const, label: "Audio", icon: Mic },
                          { value: "video" as const, label: "Vidéo", icon: Video },
                        ]).map(({ value, label, icon: Icon }) => {
                          const active = submissionFormats.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => toggleSubmissionFormat(value)}
                              className={`h-10 rounded-xl border-2 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                                active
                                  ? "border-orange-400 bg-orange-50 text-orange-700"
                                  : "border-neutral-200 text-neutral-400 hover:border-neutral-300"
                              }`}
                            >
                              <Icon size={13} /> {label}
                              {active && <Check size={12} className="ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-1">
                        Les étudiants ne pourront rendre que via le(s) format(s) coché(s).
                      </p>
                    </div>

                    {/* Mode correction */}
                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 block mb-2">Mode de correction</label>
                      <div className="flex gap-2">
                        {([
                          { value: "auto" as const, label: "Automatique (IA)", icon: Sparkles },
                          { value: "manual" as const, label: "Manuelle", icon: PenLine },
                        ]).map(({ value, label, icon: Icon }) => (
                          <button key={value} type="button" onClick={() => setCorrectionMode(value)}
                            className={`flex-1 h-10 rounded-xl border-2 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all ${correctionMode === value ? "border-blue-400 bg-blue-50 text-blue-700" : "border-neutral-200 text-neutral-400 hover:border-neutral-300"}`}>
                            <Icon size={13} /> {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-1">
                        {correctionMode === "auto"
                          ? "La soumission est corrigée automatiquement par l'IA."
                          : "Les soumissions arrivent chez vous pour correction manuelle ou IA au choix."}
                      </p>
                    </div>

                    {/* Planification */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1 flex items-center gap-1"><Lock size={10} /> Déblocage programmé</label>
                        <input type="datetime-local" value={unlockAt} onChange={(e) => setUnlockAt(e.target.value)} className="w-full h-10 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none" />
                        <p className="text-[9px] text-neutral-400 mt-0.5">Vide = visible immédiatement.</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1 flex items-center gap-1"><Calendar size={10} /> Date limite</label>
                        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full h-10 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none" />
                        <p className="text-[9px] text-neutral-400 mt-0.5">Vide = pas de deadline.</p>
                      </div>
                    </div>

                    {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>}

                    <button onClick={handleCreate} disabled={saving} className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all" style={{ backgroundColor: BLUE }}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Déployer le devoir
                    </button>
                  </div>
                )}

                {/* LISTE DES DEVOIRS */}
                {devoirsLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-neutral-300" /></div>
                ) : devoirs.length === 0 && !showCreateForm ? (
                  <div className="text-center py-16">
                    <FileText size={48} className="text-neutral-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-neutral-400">Aucun devoir créé pour cette matière.</p>
                    <button onClick={() => setShowCreateForm(true)} className="mt-4 px-4 py-2 rounded-xl text-xs font-black uppercase text-white hover:opacity-90 transition-all" style={{ backgroundColor: ORANGE }}>
                      <span className="flex items-center gap-1.5"><Plus size={14} /> Créer le premier</span>
                    </button>
                  </div>
                ) : (
                  devoirs.map(d => {
                    const locked = isLocked(d.unlock_at);
                    const pastDue = isPastDue(d.due_at);
                    const isSelected = selectedDevoir?.id === d.id;

                    return (
                      <div key={d.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${isSelected ? "border-orange-300 shadow-md" : "border-neutral-200 hover:border-neutral-300"}`}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => loadSubmissions(d)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              loadSubmissions(d);
                            }
                          }}
                          className="w-full text-left p-5 flex items-start justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-black" style={{ color: BLUE }}>{d.title}</p>
                              {locked && (
                                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                                  <Lock size={8} /> Verrouillé
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">{d.target_scope}</span>
                              {d.correction_mode === "manual" && (
                                <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Manuel</span>
                              )}
                              {(d.submission_formats || []).map((f) => (
                                <span key={f} className="text-[9px] font-bold text-neutral-500 bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded">
                                  {SUBMISSION_FORMAT_LABELS[f]?.split(" ")[0] || f}
                                </span>
                              ))}
                            </div>
                            {d.description && <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{d.description}</p>}
                            {d.attachment_url && (
                              <a href={d.attachment_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                className="text-[10px] font-bold mt-1 inline-flex items-center gap-1" style={{ color: ORANGE }}>
                                <Paperclip size={10} /> {d.attachment_name || "Pièce jointe"}
                              </a>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-400">
                              <span>{new Date(d.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                              {d.due_at && (
                                <span className={`flex items-center gap-0.5 ${pastDue ? "text-red-500 font-bold" : ""}`}>
                                  <Calendar size={9} /> {pastDue ? "Expiré" : `Deadline ${new Date(d.due_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`}
                                </span>
                              )}
                              {d.unlock_at && (
                                <span className="flex items-center gap-0.5">
                                  <Clock size={9} /> Déblocage {new Date(d.unlock_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-black" style={{ color: BLUE }}>{d.submission_count}</p>
                              <p className="text-[9px] text-neutral-400">rendu{d.submission_count > 1 ? "s" : ""}</p>
                            </div>
                            {d.pending_count > 0 && (
                              <span className="text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">{d.pending_count}</span>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteDevoir(d.id); }} className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {/* Soumissions (affichées si sélectionné) */}
                        {isSelected && (
                          <div className="border-t border-neutral-100 bg-neutral-50/50 p-5">
                            {submissionsLoading ? (
                              <p className="text-xs text-neutral-400 text-center py-4">Chargement...</p>
                            ) : (
                              <>
                                {missionStats && (
                                  <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-white rounded-xl border p-3 text-center">
                                      <p className="text-lg font-black" style={{ color: BLUE }}>{missionStats.submitted_count}/{missionStats.eligible_count}</p>
                                      <p className="text-[9px] font-bold text-neutral-400 uppercase">Rendus</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 text-center">
                                      <p className="text-lg font-black text-emerald-600">{missionStats.submitted_count}</p>
                                      <p className="text-[9px] font-bold text-emerald-500 uppercase flex items-center justify-center gap-0.5"><UserCheck size={9} /> Envoyés</p>
                                    </div>
                                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
                                      <p className="text-lg font-black text-amber-600">{missionStats.not_submitted_count}</p>
                                      <p className="text-[9px] font-bold text-amber-500 uppercase flex items-center justify-center gap-0.5"><UserX size={9} /> Manquants</p>
                                    </div>
                                  </div>
                                )}

                                {missionStats && missionStats.not_submitted.length > 0 && (
                                  <div className="mb-4 bg-white rounded-xl border p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">N&apos;ont pas rendu ({missionStats.not_submitted.length})</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {missionStats.not_submitted.map(s => (
                                        <span key={s.id} className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{s.name}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {submissions.length === 0 ? (
                                  <p className="text-xs text-neutral-400 text-center py-4 italic">Aucune soumission pour ce devoir.</p>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{submissions.length} soumission{submissions.length > 1 ? "s" : ""}</p>
                                    {submissions.map(sub => {
                                      const corr = sub.correction;
                                      const scoreColor = corr ? (corr.note >= 16 ? "text-emerald-600" : corr.note >= 12 ? "text-blue-600" : corr.note >= 8 ? "text-amber-600" : "text-red-600") : "";

                                      return (
                                        <div key={sub.id} className="bg-white rounded-xl border p-4">
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="text-xs font-black" style={{ color: BLUE }}>{sub.student_name}</p>
                                              <p className="text-[10px] text-neutral-400 mt-0.5">{new Date(sub.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                              {corr && sub.rank && sub.rank_total && sub.rank_total > 1 && (
                                                <span className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-0.5">
                                                  <Trophy size={9} /> {sub.rank}e/{sub.rank_total}
                                                </span>
                                              )}
                                              {corr ? (
                                                <span className={`text-sm font-black ${scoreColor}`}>{corr.note}/20</span>
                                              ) : (
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${sub.status === "pending_review" ? "text-amber-600 border-amber-200 bg-amber-50" : "text-neutral-400 border-neutral-200"}`}>
                                                  {sub.status === "pending_review" ? "En attente" : sub.status === "correcting" ? "Correction..." : sub.status}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {sub.answer_text && <p className="text-xs text-neutral-600 mt-2 line-clamp-3 leading-relaxed">{sub.answer_text}</p>}
                                          {sub.file_url && (
                                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold mt-2 inline-flex items-center gap-1" style={{ color: ORANGE }}>
                                              <FileText size={10} /> {sub.file_name || "Fichier joint"}
                                            </a>
                                          )}
                                          {!corr && (sub.status === "pending_review" || sub.status === "correcting") && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
                                              {d.correction_mode !== "manual" && sub.answer_text && (
                                                <button
                                                  onClick={() => handleAiCorrect(sub.id)}
                                                  disabled={correctingId === sub.id}
                                                  className="flex-1 h-8 rounded-lg text-[10px] font-black uppercase text-white flex items-center justify-center gap-1 disabled:opacity-50"
                                                  style={{ backgroundColor: BLUE }}
                                                >
                                                  {correctingId === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                  Corriger (IA)
                                                </button>
                                              )}
                                              <button
                                                onClick={() => { setManualModal(sub); setManualNote(""); setManualComment(""); }}
                                                className={`flex-1 h-8 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 ${
                                                  d.correction_mode === "manual"
                                                    ? "text-white"
                                                    : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                                }`}
                                                style={d.correction_mode === "manual" ? { backgroundColor: ORANGE } : undefined}
                                              >
                                                <PenLine size={12} /> {d.correction_mode === "manual" ? "Corriger" : "Manuelle"}
                                              </button>
                                            </div>
                                          )}
                                          {corr?.commentaire_global && (
                                            <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                                              <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5">{corr.corrected_by === "manual" ? "Correction enseignant" : "Correction IA"}</p>
                                              <p className="text-[11px] text-emerald-800 italic">{corr.commentaire_global}</p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

      {manualModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black" style={{ color: BLUE }}>Correction manuelle</h3>
              <button onClick={() => setManualModal(null)} className="p-1 text-neutral-400 hover:text-black"><X size={16} /></button>
            </div>
            <p className="text-xs text-neutral-500">{manualModal.student_name}</p>
            <div>
              <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Note /20 *</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                inputMode="decimal"
                value={manualNote}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setManualNote("");
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isFinite(n)) return;
                  if (n > 20) setManualNote("20");
                  else if (n < 0) setManualNote("0");
                  else setManualNote(raw);
                }}
                className="w-full h-10 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none" style={{ color: BLUE }}
              />
              <p className="text-[9px] text-neutral-400 mt-1">Entre 0 et 20 inclus.</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Commentaire</label>
              <textarea value={manualComment} onChange={(e) => setManualComment(e.target.value)} rows={3}
                placeholder="Retour pour l'élève..."
                className="w-full p-3 rounded-xl border bg-neutral-50 text-xs font-medium outline-none resize-none" />
            </div>
            <button onClick={handleManualSave} disabled={manualSaving}
              className="w-full h-10 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}>
              {manualSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
