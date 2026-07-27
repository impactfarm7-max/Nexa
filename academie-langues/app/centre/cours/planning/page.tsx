"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon, Plus, X, Loader2, Trash2,
  ChevronLeft, ChevronRight, Clock, User, Users, MapPin, Video,
  AlertTriangle, Check, Ban, RefreshCw, UserCheck, Monitor,
  Printer, Filter, CalendarDays, SlidersHorizontal, Sparkles, ChevronDown,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import TcfPlanningBoard, { type TcfPlanningKind } from "@/app/components/centre/TcfPlanningBoard";
import EstablishmentPlanningBoard from "@/app/components/centre/EstablishmentPlanningBoard";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { isPastCalendarDay, localDateIso } from "@/app/utils/planning-calendar";
import {
  CenterPageLayout,
  BackButton,
  OutlineHeaderButton,
  AgentIaComingSoonButton,
  PAGE_BG,
  centerNotoSans,
} from "@/app/centre/center-page-ui";

// ─── palette ─────────────────────────────────────────────────────────────────
const BLUE   = "#11224E";
const ORANGE = "#eb670e";
const DAYS   = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ─── types ───────────────────────────────────────────────────────────────────
type FiliereOption    = { id: string; name: string };
type NiveauOption     = { id: string; annee: number | null; mois: number | null };
type TrainerOption    = { id: string; prenom: string; nom: string | null };
type DisciplineOption = { id: string; name: string };
type GroupeOption = {
  id: string;
  nom: string;
  niveau_id?: string | null;
  filiere_id?: string | null;
  filiere_name?: string | null;
  niveau_label?: string | null;
};

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
  groupe_id?: string | null;
  is_tronc_commun?: boolean;
};

type SidePanel =
  | { type: "add_slot"; dayOfWeek?: number }
  | { type: "edit_slot"; slotId: string }
  | { type: "exception"; slotId: string; date: string; existingExceptionId?: string }
  | null;

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  normal:      { label: "Actif",    bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled:   { label: "Annulé",   bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200" },
  rescheduled: { label: "Reporté",  bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  substituted: { label: "Remplacé", bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
const fmt5 = (t: string) => t.substring(0, 5);

/** Compare à minuit local — true si la date est strictement avant aujourd'hui. */
function isPastDay(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  return cmp.getTime() < today.getTime();
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function CenterPlanningPage() {
  const [loading,    setLoading]    = useState(true);
  const [centerId,   setCenterId]   = useState<string | null>(null);
  const [centerType, setCenterType] = useState<string>("generic");
  const [sessionToken, setSessionToken] = useState("");
  const [userId,     setUserId]     = useState<string | null>(null);
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0);

  const [filieres,           setFilieres]           = useState<FiliereOption[]>([]);
  const [selectedFiliereId,  setSelectedFiliereId]  = useState("");
  const [niveaux,            setNiveaux]            = useState<NiveauOption[]>([]);
  const [selectedNiveauId,   setSelectedNiveauId]   = useState("");
  const [selectedGroupeId,   setSelectedGroupeId]   = useState("");
  const [trainers,           setTrainers]           = useState<TrainerOption[]>([]);
  const [selectedTrainerId,  setSelectedTrainerId]  = useState("");
  const [selectedRoom,       setSelectedRoom]       = useState("");
  const [disciplines,        setDisciplines]        = useState<DisciplineOption[]>([]);
  const [groupes,            setGroupes]            = useState<GroupeOption[]>([]);
  const [allFiliereGroupes,  setAllFiliereGroupes]  = useState<GroupeOption[]>([]);
  const [planningView,       setPlanningView]       = useState<"classe" | "etablissement">("classe");

  const [weekStart,    setWeekStart]    = useState<Date>(getMonday(new Date()));
  const [weekSlots,    setWeekSlots]    = useState<WeekSlot[]>([]);
  const [weekLoading,  setWeekLoading]  = useState(false);
  const [sidePanel,    setSidePanel]    = useState<SidePanel>(null);
  const [showPrint,    setShowPrint]    = useState(false);
  const [tcfPlanningMode, setTcfPlanningMode] = useState<TcfPlanningKind | null>(null);
  /** Filtres Formateur/Salle : repliés une fois la classe choisie (évite le bruit à chaque clic). */
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [smartClassFilter, setSmartClassFilter] = useState<"all" | "free_rooms" | "no_formateur" | "cancelled">("all");
  const [centerRooms, setCenterRooms] = useState<string[]>([]);

  // ── init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      setSessionToken(session.access_token);
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
      const cId = profile?.center_id ?? null;
      setCenterId(cId);
      if (cId) {
        const [{ data: filData }, { data: trainData }, { data: centerRow }] = await Promise.all([
          supabase.from("filieres").select("id, name").eq("center_id", cId).eq("status", "published"),
          supabase.from("profiles").select("id, prenom, nom").eq("center_id", cId).eq("role", "trainer"),
          supabase.from("centers").select("center_type").eq("id", cId).single(),
        ]);
        setFilieres(filData ?? []);
        setTrainers(trainData ?? []);
        setCenterType(centerRow?.center_type || "generic");
        const { data: roomRows } = await supabase
          .from("schedule_slots")
          .select("room_name")
          .eq("center_id", cId)
          .not("room_name", "is", null);
        const rooms = new Set<string>();
        for (const r of roomRows ?? []) {
          const name = (r.room_name || "").trim();
          if (name) rooms.add(name);
        }
        setCenterRooms(Array.from(rooms).sort((a, b) => a.localeCompare(b, "fr")));
      }
      setLoading(false);
    })();
  }, []);

  // ── sub-filters on filière change ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedFiliereId) {
      setNiveaux([]); setDisciplines([]); setGroupes([]); setAllFiliereGroupes([]);
      return;
    }
    (async () => {
      const [{ data: nivData }, { data: matData }] = await Promise.all([
        supabase.from("niveaux").select("id, annee, mois").eq("filiere_id", selectedFiliereId).order("annee"),
        supabase.from("filiere_matieres").select("discipline_id, exam_disciplines(id, name)").eq("filiere_id", selectedFiliereId),
      ]);
      const niveauxRows = nivData ?? [];
      setNiveaux(niveauxRows);

      // Classes : par filiere_id OU par niveau_id des niveaux de la filière
      const niveauIds = niveauxRows.map((n) => n.id);
      const [{ data: byFiliere }, { data: byNiveau }] = await Promise.all([
        supabase.from("groupes").select("id, nom, niveau_id, filiere_id").eq("filiere_id", selectedFiliereId),
        niveauIds.length
          ? supabase.from("groupes").select("id, nom, niveau_id, filiere_id").in("niveau_id", niveauIds)
          : Promise.resolve({ data: [] as GroupeOption[] }),
      ]);
      const niveauLabel = (nid: string | null | undefined) => {
        if (!nid) return null;
        const n = niveauxRows.find((x) => x.id === nid);
        if (!n) return null;
        return n.annee != null ? `Niv. ${n.annee}` : n.mois != null ? `${n.mois}m` : "Niveau";
      };
      const map = new Map<string, GroupeOption>();
      for (const g of [...(byFiliere ?? []), ...(byNiveau ?? [])]) {
        map.set(g.id, {
          ...g,
          filiere_name: undefined,
          niveau_label: niveauLabel(g.niveau_id),
        });
      }
      const merged = Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      setAllFiliereGroupes(merged);
      setGroupes(merged);

      const discMap = new Map<string, string>();
      for (const m of matData ?? []) {
        const d = (m as any).exam_disciplines;
        if (d) discMap.set(d.id, d.name);
      }
      setDisciplines(Array.from(discMap.entries()).map(([id, name]) => ({ id, name })));
      setSelectedNiveauId(""); setSelectedGroupeId(""); setSelectedTrainerId(""); setSelectedRoom("");
      setFiltersExpanded(true);
      setSmartClassFilter("all");
    })();
  }, [selectedFiliereId]);

  // Filtrer classes par niveau (centres libres)
  useEffect(() => {
    if (!selectedFiliereId) return;
    if (!selectedNiveauId) {
      setGroupes(allFiliereGroupes);
      return;
    }
    const hasNiveauLinks = allFiliereGroupes.some((g) => g.niveau_id);
    const nextList = hasNiveauLinks
      ? allFiliereGroupes.filter((g) => g.niveau_id === selectedNiveauId)
      : allFiliereGroupes.filter(
          (g) => g.niveau_id === selectedNiveauId || (!g.niveau_id && g.filiere_id === selectedFiliereId),
        );
    setGroupes(nextList);
    setSelectedGroupeId((prev) => (prev && nextList.some((g) => g.id === prev) ? prev : ""));
  }, [selectedNiveauId, allFiliereGroupes, selectedFiliereId]);

  // ── load week ────────────────────────────────────────────────────────────
  const loadWeek = useCallback(async () => {
    if (!centerId || !selectedFiliereId) return;
    setWeekLoading(true);
    const weekStr = weekStart.toISOString().split("T")[0];
    // Centres libres : ne pas filtrer par niveau côté RPC — un tronc commun
    // reste ancré sur le niveau d'origine mais doit apparaître sur toutes les
    // classes liées (schedule_slot_groupes), y compris d'autres niveaux.
    const isLibre = !isTcfCanadaCenter(centerType);
    const { data, error } = await supabase.rpc("get_weekly_schedule", {
      p_center_id:    centerId,
      p_week_start:   weekStr,
      p_filiere_id:   selectedFiliereId,
      p_niveau_id:    isLibre ? null : (selectedNiveauId || null),
      p_formateur_id: selectedTrainerId || null,
    });
    if (error) console.error("planning:", error);
    let rows: WeekSlot[] = (data ?? []) as WeekSlot[];

    const bySlot = new Map<string, string[]>();
    const slotIdsFromRpc = Array.from(new Set(rows.map((r) => r.slot_id)));

    if (slotIdsFromRpc.length > 0) {
      const { data: links } = await supabase
        .from("schedule_slot_groupes")
        .select("slot_id, groupe_id")
        .in("slot_id", slotIdsFromRpc);
      for (const l of links ?? []) {
        const arr = bySlot.get(l.slot_id) || [];
        arr.push(l.groupe_id);
        bySlot.set(l.slot_id, arr);
      }
    }

    // Complément : créneaux liés à la classe courante absents du résultat RPC
    if (isLibre && selectedGroupeId) {
      const { data: extraLinks } = await supabase
        .from("schedule_slot_groupes")
        .select("slot_id, groupe_id")
        .eq("groupe_id", selectedGroupeId);
      for (const l of extraLinks ?? []) {
        const arr = bySlot.get(l.slot_id) || [];
        if (!arr.includes(l.groupe_id)) arr.push(l.groupe_id);
        bySlot.set(l.slot_id, arr);
      }
      const missingIds = (extraLinks ?? [])
        .map((l) => l.slot_id)
        .filter((id) => !slotIdsFromRpc.includes(id));

      if (missingIds.length > 0) {
        const { data: missingSlots } = await supabase
          .from("schedule_slots")
          .select("id, day_of_week, start_time, end_time, title, room_name, mode, online_link, formateur_id, groupe_id, specific_date")
          .eq("center_id", centerId)
          .eq("filiere_id", selectedFiliereId)
          .in("id", missingIds);

        const formateurIds = Array.from(
          new Set((missingSlots ?? []).map((s) => s.formateur_id).filter(Boolean) as string[]),
        );
        const prenomById = new Map<string, string>();
        if (formateurIds.length > 0) {
          const { data: trainersMap } = await supabase
            .from("profiles")
            .select("id, prenom")
            .in("id", formateurIds);
          for (const t of trainersMap ?? []) prenomById.set(t.id, t.prenom);
        }

        const monday = new Date(weekStart);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(weekStart);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        for (const s of missingSlots ?? []) {
          const dow = Number(s.day_of_week);
          if (s.specific_date) {
            const d = new Date(`${s.specific_date}T12:00:00`);
            if (d < monday || d > sunday) continue;
          }
          const actual = s.specific_date
            || (() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + (dow - 1));
              return d.toISOString().slice(0, 10);
            })();
          rows.push({
            slot_id: s.id,
            day_of_week: dow,
            actual_date: actual,
            start_time: s.start_time,
            end_time: s.end_time,
            title: s.title || "",
            discipline_name: null,
            formateur_prenom: s.formateur_id ? (prenomById.get(s.formateur_id) ?? null) : null,
            room_name: s.room_name,
            mode: s.mode || "presentiel",
            online_link: s.online_link,
            status: "normal",
            exception_reason: null,
            exception_id: null,
            groupe_id: s.groupe_id,
          });
        }
      }
    }

    rows = rows.map((r) => {
      const gids = bySlot.get(r.slot_id) || [];
      return {
        ...r,
        is_tronc_commun: gids.length >= 2,
        groupe_id: r.groupe_id || gids[0] || null,
      };
    });

    if (selectedGroupeId) {
      rows = rows.filter((r) => {
        const gids = bySlot.get(r.slot_id) || [];
        return r.groupe_id === selectedGroupeId || gids.includes(selectedGroupeId);
      });
    }

    const seen = new Set<string>();
    rows = rows.filter((r) => {
      const key = `${r.slot_id}|${r.actual_date}|${fmt5(r.start_time)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setWeekSlots(rows);
    setWeekLoading(false);
  }, [centerId, centerType, selectedFiliereId, selectedNiveauId, selectedTrainerId, selectedGroupeId, weekStart]);

  useEffect(() => { if (selectedFiliereId) loadWeek(); }, [loadWeek, selectedFiliereId]);

  // ── week nav ─────────────────────────────────────────────────────────────
  const navigateWeek = (dir: "prev" | "next") => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
    setWeekStart(d);
  };

  // ── rooms from loaded slots ───────────────────────────────────────────────
  const roomOptions = useMemo(() => {
    const rooms = new Set<string>(centerRooms);
    weekSlots.forEach((s) => { if (s.room_name) rooms.add(s.room_name); });
    return Array.from(rooms).sort((a, b) => a.localeCompare(b, "fr"));
  }, [weekSlots, centerRooms]);

  const freeRoomsThisWeek = useMemo(() => {
    const used = new Set(
      weekSlots.filter((s) => s.status !== "cancelled" && s.room_name).map((s) => s.room_name as string),
    );
    return roomOptions.filter((r) => !used.has(r));
  }, [weekSlots, roomOptions]);

  // ── filtered slots ────────────────────────────────────────────────────────
  const filteredSlots = useMemo(() => {
    return weekSlots.filter((s) => {
      if (selectedRoom && s.room_name !== selectedRoom) return false;
      if (smartClassFilter === "cancelled" && s.status !== "cancelled") return false;
      if (smartClassFilter === "no_formateur" && (s.status === "cancelled" || s.formateur_prenom)) return false;
      // free_rooms = insight only (liste), ne masque pas le calendrier
      return true;
    });
  }, [weekSlots, selectedRoom, smartClassFilter]);

  // ── group by day ─────────────────────────────────────────────────────────
  const slotsByDay: Record<number, WeekSlot[]> = {};
  for (let d = 1; d <= 6; d++) slotsByDay[d] = [];
  for (const s of filteredSlots) {
    if (slotsByDay[s.day_of_week]) slotsByDay[s.day_of_week].push(s);
  }

  const selectedFiliere = filieres.find((f) => f.id === selectedFiliereId);
  const isTcfCenter = isTcfCanadaCenter(centerType);
  const tcfFiliere = filieres.find((f) => f.name.toLowerCase().includes("tcf")) ?? filieres[0];
  const libreReady = isTcfCenter || Boolean(
    (niveaux.length === 0 || selectedNiveauId) && selectedGroupeId
  );
  const selectedGroupe = groupes.find((g) => g.id === selectedGroupeId) || allFiliereGroupes.find((g) => g.id === selectedGroupeId);

  // Une fois la classe prête, replier Formateur/Salle (réouvrable via « Modifier filtres »)
  useEffect(() => {
    if (!isTcfCenter && libreReady) setFiltersExpanded(false);
  }, [libreReady, selectedGroupeId, isTcfCenter]);

  const openTcfPlanning = (mode: TcfPlanningKind) => {
    if (!tcfFiliere) return;
    setSelectedFiliereId(tcfFiliere.id);
    setTcfPlanningMode(mode);
    setSelectedNiveauId("");
  };

  if (loading) return <CenterPageLoading />;

  const pageTitle = !isTcfCenter && planningView === "etablissement"
    ? "Établissement"
    : selectedFiliere
      ? selectedFiliere.name
      : "Emploi du temps";

  const showBack =
    Boolean(selectedFiliereId) || (!isTcfCenter && planningView === "etablissement");

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <CenterPageLayout
      className={centerNotoSans.className}
      header={
        <header
          className="shrink-0 border-b border-black/[0.06] z-20"
          style={{ backgroundColor: PAGE_BG }}
        >
          <div className="nexa-center-shell py-3 flex items-center justify-between gap-4 min-h-[68px]">
            <div className="flex items-center gap-3 min-w-0">
              {showBack && (
                <BackButton
                  onClick={() => {
                    setSelectedFiliereId("");
                    setWeekSlots([]);
                    setTcfPlanningMode(null);
                    setPlanningView("classe");
                    setSelectedNiveauId("");
                    setSelectedGroupeId("");
                    setSelectedTrainerId("");
                    setSelectedRoom("");
                    setFiltersExpanded(true);
                    setSmartClassFilter("all");
                  }}
                />
              )}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate" style={{ color: BLUE }}>
                  {pageTitle}
                </h1>
                {selectedFiliere && planningView === "classe" && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 truncate mt-0.5">
                    {isTcfCenter && tcfPlanningMode === "collective"
                      ? "Coaching de groupe"
                      : isTcfCenter && tcfPlanningMode === "individual"
                        ? "Séances individuelles"
                        : selectedGroupe
                          ? selectedGroupe.nom
                          : "Planning hebdomadaire"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isTcfCenter && centerId && (
                <div className="flex items-center gap-1 rounded-lg p-1 border border-black/[0.08]" style={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                  <button
                    type="button"
                    onClick={() => setPlanningView("classe")}
                    className={`h-8 px-3.5 rounded-md text-sm transition-colors ${
                      planningView === "classe" ? "bg-white text-[#11224E] font-semibold shadow-sm" : "text-neutral-500"
                    }`}
                  >
                    Classe
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPlanningView("etablissement"); setSidePanel(null); }}
                    className={`h-8 px-3.5 rounded-md text-sm transition-colors ${
                      planningView === "etablissement" ? "bg-white text-[#11224E] font-semibold shadow-sm" : "text-neutral-500"
                    }`}
                  >
                    Établissement
                  </button>
                </div>
              )}
              <AgentIaComingSoonButton title="Agent IA NEXA — filtres intelligents avancés à venir" />
              {selectedFiliereId && planningView === "classe" && (
                <>
                  {!isTcfCenter && (
                    <OutlineHeaderButton onClick={() => setShowPrint(true)} disabled={!libreReady}>
                      <Printer size={14} /> Imprimer
                    </OutlineHeaderButton>
                  )}
                  {(isTcfCenter ? tcfPlanningMode === "collective" : libreReady) && (
                    <OutlineHeaderButton onClick={() => setSidePanel({ type: "add_slot" })}>
                      <Plus size={14} /> {isTcfCenter ? "Nouveau coaching" : "Nouveau créneau"}
                    </OutlineHeaderButton>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Filter bar ── */}
          {selectedFiliereId && planningView === "classe" && (
            <div className="nexa-center-shell pb-3 flex items-center gap-2 flex-wrap">
              <SlidersHorizontal size={13} className="text-neutral-400 shrink-0" />

              {isTcfCenter && tcfPlanningMode ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wide border ${
                      tcfPlanningMode === "collective"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {tcfPlanningMode === "collective" ? (
                      <><Users size={10} /> Coaching de groupe</>
                    ) : (
                      <><User size={10} /> Séances individuelles</>
                    )}
                  </span>
                  {tcfPlanningMode === "collective" && groupes.length > 0 && (
                    <>
                      <span className="w-px h-5 bg-neutral-200 shrink-0" />
                      <div className="flex gap-1.5 flex-wrap">
                        {groupes.map((g) => (
                          <FilterPill key={g.id} active={selectedGroupeId === g.id} onClick={() => setSelectedGroupeId(selectedGroupeId === g.id ? "" : g.id)}>
                            {g.nom}
                          </FilterPill>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : !isTcfCenter ? (
                <>
                  {/* Compact summary once ready — Formateur/Salle masqués par défaut */}
                  {libreReady && !filtersExpanded ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white/70 text-[#11224E]">
                        {selectedNiveauId
                          ? `Niv. ${niveaux.find((n) => n.id === selectedNiveauId)?.annee ?? niveaux.find((n) => n.id === selectedNiveauId)?.mois ?? "—"}`
                          : "Niveau"}
                        <span className="text-neutral-300">·</span>
                        {selectedGroupe?.nom || "Classe"}
                        {selectedTrainerId && (
                          <>
                            <span className="text-neutral-300">·</span>
                            {trainers.find((t) => t.id === selectedTrainerId)?.prenom}
                          </>
                        )}
                        {selectedRoom && (
                          <>
                            <span className="text-neutral-300">·</span>
                            {selectedRoom}
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiltersExpanded(true)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white/70 text-neutral-600 hover:bg-white inline-flex items-center gap-1"
                      >
                        <Filter size={12} /> Modifier filtres
                      </button>
                      {(selectedTrainerId || selectedRoom || smartClassFilter !== "all") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTrainerId("");
                            setSelectedRoom("");
                            setSmartClassFilter("all");
                          }}
                          className="h-8 px-3 rounded-lg text-xs text-neutral-500 hover:text-neutral-800"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {niveaux.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <span className="text-xs text-neutral-500">Niveau</span>
                          {niveaux.map((n) => (
                            <FilterPill
                              key={n.id}
                              active={selectedNiveauId === n.id}
                              onClick={() => {
                                setSelectedNiveauId(n.id);
                                setSelectedGroupeId("");
                                setFiltersExpanded(true);
                              }}
                            >
                              Niv. {n.annee ?? `${n.mois}m`}
                            </FilterPill>
                          ))}
                        </div>
                      )}

                      {(selectedNiveauId || niveaux.length === 0) && (
                        <>
                          {niveaux.length > 0 && <span className="w-px h-5 bg-neutral-200 shrink-0" />}
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <span className="text-xs text-neutral-500">Classe</span>
                            {groupes.length === 0 ? (
                              <span className="text-[10px] text-neutral-400 italic">Aucune classe pour ce niveau</span>
                            ) : (
                              groupes.map((g) => (
                                <FilterPill
                                  key={g.id}
                                  active={selectedGroupeId === g.id}
                                  onClick={() => setSelectedGroupeId(g.id)}
                                >
                                  {g.nom}
                                </FilterPill>
                              ))
                            )}
                          </div>
                        </>
                      )}

                      {libreReady && (
                        <>
                          {(trainers.length > 0 || roomOptions.length > 0) && (
                            <span className="w-px h-5 bg-neutral-200 shrink-0" />
                          )}
                          {trainers.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap items-center">
                              <span className="text-xs text-neutral-500">Formateur</span>
                              {trainers.slice(0, 8).map((t) => (
                                <FilterPill
                                  key={t.id}
                                  active={selectedTrainerId === t.id}
                                  color="blue"
                                  onClick={() => setSelectedTrainerId(selectedTrainerId === t.id ? "" : t.id)}
                                >
                                  {t.prenom}
                                </FilterPill>
                              ))}
                            </div>
                          )}
                          {roomOptions.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap items-center">
                              <span className="text-xs text-neutral-500">Salle</span>
                              {roomOptions.map((r) => (
                                <FilterPill
                                  key={r}
                                  active={selectedRoom === r}
                                  color="purple"
                                  onClick={() => setSelectedRoom(selectedRoom === r ? "" : r)}
                                >
                                  <MapPin size={10} className="inline mr-0.5" />{r}
                                </FilterPill>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setFiltersExpanded(false)}
                            className="h-8 px-3 rounded-lg text-xs text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-1"
                          >
                            <ChevronDown size={12} className="rotate-180" /> Réduire
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* Smart filters — toujours accessibles une fois la classe prête */}
                  {libreReady && (
                    <div className="w-full flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1">
                        <Sparkles size={11} style={{ color: ORANGE }} /> Intelligent
                      </span>
                      {(
                        [
                          { id: "all" as const, label: "Tout" },
                          { id: "free_rooms" as const, label: `Salles libres (${freeRoomsThisWeek.length})` },
                          { id: "no_formateur" as const, label: "Sans formateur" },
                          { id: "cancelled" as const, label: "Annulés" },
                        ]
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSmartClassFilter(f.id)}
                          className={`h-7 px-2.5 rounded-md text-[11px] border transition-colors ${
                            smartClassFilter === f.id
                              ? "bg-[#11224E] border-[#11224E] text-white font-semibold"
                              : "bg-white/70 border-black/[0.08] text-neutral-600 hover:bg-white"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                      {smartClassFilter === "free_rooms" && (
                        <span className="text-[11px] text-neutral-500">
                          {freeRoomsThisWeek.length === 0
                            ? "Toutes les salles connues ont au moins un cours cette semaine."
                            : <>Sans cours : <span className="font-semibold text-[#11224E]">{freeRoomsThisWeek.join(" · ")}</span></>}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
              {/* Niveau pills */}
              {niveaux.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  <FilterPill active={!selectedNiveauId} onClick={() => setSelectedNiveauId("")}>Tous niveaux</FilterPill>
                  {niveaux.map((n) => (
                    <FilterPill key={n.id} active={selectedNiveauId === n.id} onClick={() => setSelectedNiveauId(selectedNiveauId === n.id ? "" : n.id)}>
                      Niv. {n.annee ?? `${n.mois}m`}
                    </FilterPill>
                  ))}
                </div>
              )}

              {niveaux.length > 0 && (groupes.length > 0 || trainers.length > 0 || roomOptions.length > 0) && (
                <span className="w-px h-5 bg-neutral-200 shrink-0" />
              )}

              {groupes.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {groupes.map((g) => (
                    <FilterPill key={g.id} active={selectedGroupeId === g.id} onClick={() => setSelectedGroupeId(selectedGroupeId === g.id ? "" : g.id)}>
                      {g.nom}
                    </FilterPill>
                  ))}
                </div>
              )}

              {trainers.length > 0 && (
                <div className="flex gap-1.5 flex-wrap items-center">
                  <span className="text-xs text-neutral-500">Formateur</span>
                  {trainers.slice(0, 6).map((t) => (
                    <FilterPill key={t.id} active={selectedTrainerId === t.id} color="blue" onClick={() => setSelectedTrainerId(selectedTrainerId === t.id ? "" : t.id)}>
                      {t.prenom}
                    </FilterPill>
                  ))}
                </div>
              )}

              {roomOptions.length > 0 && (
                <div className="flex gap-1.5 flex-wrap items-center">
                  <span className="text-xs text-neutral-500">Salle</span>
                  {roomOptions.map((r) => (
                    <FilterPill key={r} active={selectedRoom === r} color="purple" onClick={() => setSelectedRoom(selectedRoom === r ? "" : r)}>
                      <MapPin size={10} className="inline mr-0.5" />{r}
                    </FilterPill>
                  ))}
                </div>
              )}
                </>
              )}

              {/* Week nav */}
              {((!isTcfCenter && libreReady) || (isTcfCenter && tcfPlanningMode === "collective")) ? (
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateWeek("prev")}
                  className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white/70 text-xs font-medium text-neutral-700 hover:bg-white inline-flex items-center gap-1.5"
                >
                  <ChevronLeft size={14} /> Semaine précédente
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(getMonday(new Date()))}
                  className="h-8 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-orange-600"
                  title="Revenir à cette semaine"
                >
                  {weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </button>
                <button
                  type="button"
                  onClick={() => navigateWeek("next")}
                  className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white/70 text-xs font-medium text-neutral-700 hover:bg-white inline-flex items-center gap-1.5"
                >
                  Semaine suivante <ChevronRight size={14} />
                </button>
              </div>
              ) : null}
            </div>
          )}
        </header>
      }
    >
        {/* ── CONTENT ── */}
        <div className="nexa-center-shell pt-4 sm:pt-5 pb-8">
          {!isTcfCenter && planningView === "etablissement" && centerId ? (
            <EstablishmentPlanningBoard centerId={centerId} trainers={trainers} />
          ) : !selectedFiliereId ? (
            <div className="max-w-4xl mx-auto space-y-8 pt-2">
              {isTcfCenter ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                    <CalendarDays size={12} /> Planning TCF Canada
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => openTcfPlanning("collective")}
                      disabled={!tcfFiliere}
                      className="group bg-white border-2 border-neutral-200 hover:border-orange-400 p-6 rounded-2xl text-left transition-all hover:shadow-md disabled:opacity-50"
                    >
                      <Users className="w-8 h-8 mb-4" style={{ color: ORANGE }} />
                      <h3 className="font-black text-lg" style={{ color: BLUE }}>Coaching de groupe</h3>
                      <p className="text-xs text-neutral-500 mt-2">Le centre / le formateur planifie pour une ou plusieurs classes.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openTcfPlanning("individual")}
                      disabled={!tcfFiliere}
                      className="group bg-white border-2 border-neutral-200 hover:border-blue-400 p-6 rounded-2xl text-left transition-all hover:shadow-md disabled:opacity-50"
                    >
                      <User className="w-8 h-8 mb-4" style={{ color: BLUE }} />
                      <h3 className="font-black text-lg" style={{ color: BLUE }}>Séances individuelles</h3>
                      <p className="text-xs text-neutral-500 mt-2">Demandes programmées par les étudiants depuis leur espace Live.</p>
                    </button>
                  </div>
                </>
              ) : (
              <>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                  <CalendarDays size={12} /> Sélectionnez un programme à planifier
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filieres.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setPlanningView("classe"); setSelectedFiliereId(f.id); }}
                      className="group bg-white border-2 border-neutral-200 hover:border-orange-400 p-5 rounded-2xl text-left transition-all hover:shadow-md"
                    >
                      <span className="w-2.5 h-2.5 rounded-full block mb-4" style={{ backgroundColor: ORANGE }} />
                      <h3 className="font-black text-base leading-tight group-hover:text-orange-600 transition-colors" style={{ color: BLUE }}>{f.name}</h3>
                      <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider mt-3 flex items-center gap-1">
                        <CalendarIcon size={10} /> Filière → Niveau → Classe
                      </p>
                    </button>
                  ))}
                  {filieres.length === 0 && (
                    <p className="col-span-full text-center text-xs text-neutral-400 py-16 italic">
                      Aucun programme publié. Publiez d'abord une filière.
                    </p>
                  )}
                </div>
              </div>

              {filieres.length > 0 && (
                <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Filter size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-black text-sm" style={{ color: BLUE }}>Parcours classe-first</p>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Choisissez une <strong>filière</strong>, puis un <strong>niveau</strong> et une <strong>classe</strong> avant d’ouvrir la grille.
                        Utilisez l’onglet <strong>Établissement</strong> pour le calendrier global et les reports à placer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          ) : isTcfCenter && tcfPlanningMode && sessionToken ? (
            <TcfPlanningBoard key={kanbanRefreshKey} kind={tcfPlanningMode} token={sessionToken} />
          ) : !isTcfCenter && !libreReady ? (
            <div className="max-w-lg mx-auto mt-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto">
                <Users size={20} style={{ color: ORANGE }} />
              </div>
              <h2 className="text-lg font-black" style={{ color: BLUE }}>
                {niveaux.length > 0 && !selectedNiveauId ? "Choisissez un niveau" : "Choisissez une classe"}
              </h2>
              <p className="text-sm text-neutral-500">
                {niveaux.length > 0 && !selectedNiveauId
                  ? "Sélectionnez d’abord le niveau dans la barre de filtres, puis la classe."
                  : "La grille hebdomadaire s’ouvre après le choix de la classe."}
              </p>
            </div>
          ) : weekLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-neutral-300" />
            </div>
          ) : (
            /* ═══ WEEKLY GRID ══════════════════════════════════════════ */
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-6 border-b bg-neutral-50">
                {DAYS.map((day, i) => {
                  const dayDate = new Date(weekStart);
                  dayDate.setDate(dayDate.getDate() + i);
                  const isToday = dayDate.toDateString() === new Date().toDateString();
                  const isPast = isPastDay(dayDate);
                  return (
                    <div
                      key={day}
                      className={`py-3 text-center border-r last:border-r-0 ${
                        isPast ? "bg-neutral-200/70" : isToday ? "bg-orange-50" : ""
                      }`}
                    >
                      <p className={`text-[9px] font-black uppercase tracking-wider ${isPast ? "text-neutral-400" : "text-neutral-500"}`}>
                        {day}
                      </p>
                      <p
                        className={`text-sm font-black mt-0.5 ${
                          isPast ? "text-neutral-400" : isToday ? "text-orange-600" : ""
                        }`}
                        style={!isPast && !isToday ? { color: BLUE } : undefined}
                      >
                        {dayDate.getDate()}/{dayDate.getMonth() + 1}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Grid body */}
              <div className="grid grid-cols-6 divide-x divide-neutral-100 min-h-[480px]">
                {DAYS.map((_, dayIdx) => {
                  const dayNum   = dayIdx + 1;
                  const daySlots = (slotsByDay[dayNum] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
                  const dayDate  = new Date(weekStart);
                  dayDate.setDate(dayDate.getDate() + dayIdx);
                  const dateStr  = dayDate.toISOString().split("T")[0];
                  const isPast   = isPastDay(dayDate);

                  return (
                    <div
                      key={dayIdx}
                      className={`p-2 space-y-2 min-h-[200px] ${isPast ? "bg-neutral-100/80" : ""}`}
                    >
                      {daySlots.map((slot) => {
                        const st          = STATUS_STYLES[slot.status] ?? STATUS_STYLES.normal;
                        const isCancelled = slot.status === "cancelled";
                        return (
                          <button
                            key={`${slot.slot_id}-${slot.actual_date}`}
                            onClick={() => setSidePanel(
                              slot.exception_id
                                ? { type: "exception", slotId: slot.slot_id, date: dateStr, existingExceptionId: slot.exception_id }
                                : { type: "exception", slotId: slot.slot_id, date: dateStr }
                            )}
                            className={`w-full p-3 rounded-xl border text-left transition-all hover:shadow-md ${st.border} ${isCancelled ? "opacity-50" : ""} ${isPast ? "opacity-45 grayscale-[0.45]" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[10px] font-mono font-black text-neutral-400 flex items-center gap-0.5">
                                <Clock size={9} /> {fmt5(slot.start_time)}-{fmt5(slot.end_time)}
                              </span>
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {slot.is_tronc_commun && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Tronc commun
                                  </span>
                                )}
                                {slot.status !== "normal" && (
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${st.bg} ${st.text} border ${st.border}`}>{st.label}</span>
                                )}
                              </div>
                            </div>
                            <p className={`text-xs font-black leading-tight ${isCancelled ? "line-through" : ""}`} style={{ color: BLUE }}>{slot.title}</p>
                            <div className="mt-2 space-y-0.5">
                              {slot.formateur_prenom && (
                                <p className="text-[10px] text-neutral-400 flex items-center gap-1 truncate"><User size={9} />{slot.formateur_prenom}</p>
                              )}
                              {slot.room_name && (
                                <p className="text-[10px] font-bold flex items-center gap-1 truncate" style={{ color: BLUE }}>
                                  {slot.mode === "en_ligne" ? <Video size={9} className="text-blue-500" /> : <MapPin size={9} style={{ color: ORANGE }} />}
                                  {slot.room_name}
                                </p>
                              )}
                            </div>
                            {slot.exception_reason && (
                              <p className="text-[9px] text-red-500 font-medium mt-1.5 italic truncate">{slot.exception_reason}</p>
                            )}
                          </button>
                        );
                      })}

                      {daySlots.length === 0 && !isPast && (
                        <button
                          onClick={() => setSidePanel({ type: "add_slot", dayOfWeek: dayNum })}
                          className="w-full h-20 rounded-xl border-2 border-dashed border-neutral-200 hover:border-orange-300 flex items-center justify-center text-neutral-300 hover:text-orange-500 transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                      {daySlots.length === 0 && isPast && (
                        <div className="h-20 rounded-xl border border-dashed border-neutral-200 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                          Passé
                        </div>
                      )}
                      {daySlots.length > 0 && !isPast && (
                        <button
                          onClick={() => setSidePanel({ type: "add_slot", dayOfWeek: dayNum })}
                          className="w-full py-1.5 rounded-lg hover:bg-orange-50 text-neutral-300 hover:text-orange-500 transition-colors flex items-center justify-center"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      {/* ═══ SIDE PANEL ═══════════════════════════════════════════════════ */}
      {sidePanel && (
        <SlotPanel
          type={sidePanel}
          centerId={centerId!}
          userId={userId!}
          sessionToken={sessionToken}
          filiereId={selectedFiliereId}
          filiereName={selectedFiliere?.name ?? ""}
          niveaux={niveaux}
          groupes={isTcfCenter ? groupes : allFiliereGroupes}
          trainers={trainers}
          disciplines={disciplines}
          isTcfCenter={isTcfCenter}
          defaultNiveauId={selectedNiveauId}
          defaultGroupeId={selectedGroupeId}
          onClose={() => setSidePanel(null)}
          onSaved={() => {
            setSidePanel(null);
            if (isTcfCenter) setKanbanRefreshKey((k) => k + 1);
            else loadWeek();
          }}
        />
      )}

      {/* ═══ PRINT MODAL ══════════════════════════════════════════════════ */}
      {showPrint && (
        <PrintPlanningModal
          weekStart={weekStart}
          slotsByDay={slotsByDay}
          filiereName={selectedFiliere?.name ?? ""}
          onClose={() => setShowPrint(false)}
        />
      )}
    </CenterPageLayout>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────────────────────
function FilterPill({ children, active, onClick, color = "orange" }: {
  children: React.ReactNode; active: boolean; onClick: () => void; color?: "orange" | "blue" | "purple";
}) {
  const activeStyle =
    color === "blue"   ? "bg-blue-50 border-blue-200 text-blue-800" :
    color === "purple" ? "bg-violet-50 border-violet-200 text-violet-800" :
                         "bg-neutral-900 border-neutral-900 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3.5 rounded-full text-sm border transition-colors ${
        active ? activeStyle : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PRINT MODAL
// ════════════════════════════════════════════════════════════════════════════
function PrintPlanningModal({ weekStart, slotsByDay, filiereName, onClose }: {
  weekStart: Date; slotsByDay: Record<number, WeekSlot[]>; filiereName: string; onClose: () => void;
}) {
  const totalSlots = Object.values(slotsByDay).reduce((a, d) => a + d.length, 0);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-3xl w-full p-8 rounded-2xl shadow-2xl my-8">
        <div className="print:hidden flex justify-end gap-3 mb-6 pb-5 border-b">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase text-white" style={{ backgroundColor: ORANGE }}>
            <Printer size={15} /> Imprimer / PDF
          </button>
          <button onClick={onClose} className="p-2.5 bg-neutral-100 rounded-xl hover:bg-neutral-200"><X size={17} /></button>
        </div>

        <div className="flex justify-between items-start border-b-2 pb-5 mb-6" style={{ borderColor: BLUE }}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Emploi du temps</p>
            <h1 className="text-2xl font-black uppercase mt-1" style={{ color: BLUE }}>{filiereName}</h1>
            <p className="text-xs font-bold mt-1" style={{ color: ORANGE }}>
              Semaine du {weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
          <p className="text-[10px] text-neutral-500">{totalSlots} créneau(x)</p>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {DAYS.map((day, i) => {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const slots   = (slotsByDay[i + 1] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
            return (
              <div key={day} className="border-t-2 pt-3" style={{ borderColor: BLUE }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: BLUE }}>{day}</p>
                <p className="text-[10px] text-neutral-400 mb-3">{dayDate.getDate()}/{dayDate.getMonth() + 1}</p>
                {slots.map((s) => (
                  <div key={s.slot_id} className={`mb-2 p-2 rounded-lg border ${s.status === "cancelled" ? "opacity-50 border-red-200 bg-red-50" : "border-neutral-200 bg-neutral-50"}`}>
                    <p className="text-[9px] font-mono text-neutral-400">{fmt5(s.start_time)}–{fmt5(s.end_time)}</p>
                    <p className="text-[10px] font-black mt-0.5" style={{ color: BLUE }}>{s.title}</p>
                    {s.formateur_prenom && <p className="text-[8px] text-neutral-400 mt-0.5">{s.formateur_prenom}</p>}
                    {s.room_name && <p className="text-[8px] font-bold mt-0.5" style={{ color: ORANGE }}>{s.room_name}</p>}
                  </div>
                ))}
                {slots.length === 0 && <p className="text-[9px] text-neutral-300 italic">—</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SLOT PANEL
// ════════════════════════════════════════════════════════════════════════════
function SlotPanel({
  type, centerId, userId, sessionToken, filiereId, filiereName, niveaux, groupes, trainers, disciplines,
  isTcfCenter, defaultNiveauId, defaultGroupeId, onClose, onSaved,
}: {
  type: NonNullable<SidePanel>;
  centerId: string; userId: string; sessionToken: string; filiereId: string; filiereName: string;
  niveaux: NiveauOption[]; groupes: GroupeOption[]; trainers: TrainerOption[];
  disciplines: DisciplineOption[]; isTcfCenter?: boolean;
  defaultNiveauId?: string; defaultGroupeId?: string;
  onClose: () => void; onSaved: () => void;
}) {
  const isAddSlot   = type.type === "add_slot";
  const isException = type.type === "exception";
  const isEditSlot  = type.type === "edit_slot";

  const [dayOfWeek,      setDayOfWeek]      = useState(type.type === "add_slot" && type.dayOfWeek ? type.dayOfWeek : 1);
  const [startTime,      setStartTime]      = useState("08:00");
  const [endTime,        setEndTime]        = useState("10:00");
  const [disciplineId,   setDisciplineId]   = useState("");
  const [slotTitle,      setSlotTitle]      = useState("");
  const [formateurId,    setFormateurId]    = useState("");
  const [roomName,       setRoomName]       = useState("");
  const [mode,           setMode]           = useState<"presentiel" | "en_ligne">("presentiel");
  const [onlineLink,     setOnlineLink]     = useState("");
  const [niveauId,       setNiveauId]       = useState(defaultNiveauId || "");
  const [groupeId,       setGroupeId]       = useState(defaultGroupeId || "");
  const [specificDate,   setSpecificDate]   = useState("");
  const [selectedGroupeIds, setSelectedGroupeIds] = useState<string[]>(
    !isTcfCenter && defaultGroupeId ? [defaultGroupeId] : [],
  );
  const [isTroncCommun,  setIsTroncCommun]  = useState(false);
  const [includeOtherPrograms, setIncludeOtherPrograms] = useState(false);
  const [centerGroupes,  setCenterGroupes]  = useState<GroupeOption[]>([]);
  const [troncLoading,   setTroncLoading]   = useState(false);
  const [dupWeeks,       setDupWeeks]       = useState(4);
  const [dupMsg,         setDupMsg]         = useState("");
  const [panelMode,      setPanelMode]      = useState<"manage" | "edit">("manage");

  const [exType,         setExType]         = useState<"cancelled" | "rescheduled" | "substituted">("cancelled");
  const [exReason,       setExReason]       = useState("");
  const [exNewDate,      setExNewDate]      = useState("");
  const [exNewStart,     setExNewStart]     = useState("");
  const [exNewEnd,       setExNewEnd]       = useState("");
  const [exNewRoom,      setExNewRoom]      = useState("");
  const [exSubstituteId, setExSubstituteId] = useState("");
  const [exPendingPlace, setExPendingPlace] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const [knownRooms, setKnownRooms] = useState<string[]>([]);

  const lockedNiveauId = !isTcfCenter ? (defaultNiveauId || niveauId) : niveauId;
  const lockedGroupeId = !isTcfCenter ? (defaultGroupeId || groupeId) : groupeId;

  const lockedGroupe = useMemo(
    () =>
      groupes.find((g) => g.id === lockedGroupeId)
      || centerGroupes.find((g) => g.id === lockedGroupeId),
    [groupes, centerGroupes, lockedGroupeId],
  );

  const lockedNiveau = useMemo(
    () => niveaux.find((n) => n.id === lockedNiveauId),
    [niveaux, lockedNiveauId],
  );

  const enrichLabel = useCallback((g: GroupeOption): GroupeOption => {
    if (g.filiere_name || g.niveau_label) return g;
    const niv = g.niveau_id ? niveaux.find((n) => n.id === g.niveau_id) : undefined;
    return {
      ...g,
      filiere_name: g.filiere_id === filiereId ? filiereName : (g.filiere_name || null),
      niveau_label: niv
        ? (niv.annee != null ? `Niv. ${niv.annee}` : niv.mois != null ? `${niv.mois}m` : "Niveau")
        : (g.niveau_id === lockedNiveauId && lockedNiveau
          ? (lockedNiveau.annee != null ? `Niv. ${lockedNiveau.annee}` : "Niveau")
          : null),
    };
  }, [niveaux, filiereId, filiereName, lockedNiveauId, lockedNiveau]);

  // Même programme = toutes les classes de la filière (tous niveaux), hors classe courante
  const troncSameProgram = useMemo(() => {
    return groupes
      .filter((g) => g.id !== lockedGroupeId)
      .map(enrichLabel)
      .sort((a, b) => {
        const na = (a.niveau_label || "").localeCompare(b.niveau_label || "", "fr");
        if (na !== 0) return na;
        return a.nom.localeCompare(b.nom, "fr");
      });
  }, [groupes, lockedGroupeId, enrichLabel]);

  // Autres programmes (chargé à la demande)
  const troncOtherPrograms = useMemo(() => {
    if (!includeOtherPrograms) return [] as GroupeOption[];
    const sameIds = new Set(groupes.map((g) => g.id));
    return centerGroupes
      .filter((g) => g.id !== lockedGroupeId && !sameIds.has(g.id))
      .sort((a, b) => {
        const fa = (a.filiere_name || "").localeCompare(b.filiere_name || "", "fr");
        if (fa !== 0) return fa;
        const na = (a.niveau_label || "").localeCompare(b.niveau_label || "", "fr");
        if (na !== 0) return na;
        return a.nom.localeCompare(b.nom, "fr");
      });
  }, [includeOtherPrograms, centerGroupes, groupes, lockedGroupeId]);

  // Figé depuis le parcours classe-first
  useEffect(() => {
    if (isTcfCenter) return;
    if (defaultNiveauId) setNiveauId(defaultNiveauId);
    if (defaultGroupeId) {
      setGroupeId(defaultGroupeId);
      setSelectedGroupeIds((prev) => {
        const base = prev.includes(defaultGroupeId) ? prev : [defaultGroupeId, ...prev.filter((id) => id !== defaultGroupeId)];
        return base.length ? base : [defaultGroupeId];
      });
    }
  }, [isTcfCenter, defaultNiveauId, defaultGroupeId]);

  // Classes du centre pour tronc cross-programme
  useEffect(() => {
    if (isTcfCenter || !isTroncCommun || !includeOtherPrograms || !centerId) return;
    let cancelled = false;
    (async () => {
      setTroncLoading(true);
      try {
        const { data: filRows } = await supabase
          .from("filieres")
          .select("id, name")
          .eq("center_id", centerId)
          .eq("status", "published");
        const filMap = new Map((filRows ?? []).map((f) => [f.id, f.name as string]));
        const fids = Array.from(filMap.keys());
        if (fids.length === 0) { if (!cancelled) setCenterGroupes([]); return; }

        const { data: nivRows } = await supabase
          .from("niveaux")
          .select("id, annee, mois, filiere_id")
          .in("filiere_id", fids);
        const nivMap = new Map(
          (nivRows ?? []).map((n) => [
            n.id,
            {
              filiere_id: n.filiere_id as string,
              label: n.annee != null ? `Niv. ${n.annee}` : n.mois != null ? `${n.mois}m` : "Niveau",
            },
          ]),
        );
        const nids = (nivRows ?? []).map((n) => n.id);

        const [{ data: byF }, { data: byN }] = await Promise.all([
          supabase.from("groupes").select("id, nom, niveau_id, filiere_id").in("filiere_id", fids),
          nids.length
            ? supabase.from("groupes").select("id, nom, niveau_id, filiere_id").in("niveau_id", nids)
            : Promise.resolve({ data: [] as GroupeOption[] }),
        ]);
        const map = new Map<string, GroupeOption>();
        for (const g of [...(byF ?? []), ...(byN ?? [])]) {
          const niv = g.niveau_id ? nivMap.get(g.niveau_id) : undefined;
          const fid = g.filiere_id || niv?.filiere_id || null;
          map.set(g.id, {
            id: g.id,
            nom: g.nom,
            niveau_id: g.niveau_id,
            filiere_id: fid,
            filiere_name: fid ? filMap.get(fid) || null : null,
            niveau_label: niv?.label || null,
          });
        }
        if (!cancelled) setCenterGroupes(Array.from(map.values()));
      } finally {
        if (!cancelled) setTroncLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isTcfCenter, isTroncCommun, includeOtherPrograms, centerId]);

  // Salles : niveau → filière (tronc) → centre (cross-programme)
  useEffect(() => {
    if (isTcfCenter || !centerId) return;
    (async () => {
      let q = supabase
        .from("schedule_slots")
        .select("room_name")
        .eq("center_id", centerId)
        .not("room_name", "is", null);
      if (includeOtherPrograms && isTroncCommun) {
        // centre entier
      } else if (isTroncCommun && filiereId) {
        q = q.eq("filiere_id", filiereId);
      } else if (filiereId && lockedNiveauId) {
        q = q.eq("filiere_id", filiereId).eq("niveau_id", lockedNiveauId);
      } else if (filiereId) {
        q = q.eq("filiere_id", filiereId);
      }
      const { data } = await q.limit(120);
      const set = new Set<string>();
      for (const r of data ?? []) {
        if (r.room_name?.trim()) set.add(r.room_name.trim());
      }
      setKnownRooms(Array.from(set).sort((a, b) => a.localeCompare(b, "fr")));
    })();
  }, [isTcfCenter, filiereId, lockedNiveauId, centerId, isTroncCommun, includeOtherPrograms]);

  const toggleTroncGroupe = (gid: string) => {
    setSelectedGroupeIds((prev) => {
      const primary = lockedGroupeId || groupeId;
      const without = prev.filter((id) => id !== gid);
      const next = prev.includes(gid) ? without : [...without, gid];
      return primary && !next.includes(primary) ? [primary, ...next] : next;
    });
  };
  useEffect(() => {
    if (type.type === "edit_slot" || type.type === "exception") {
      (async () => {
        const { data } = await supabase.from("schedule_slots").select("*").eq("id", type.slotId).single();
        if (data) {
          setDayOfWeek(data.day_of_week);
          setStartTime(data.start_time?.substring(0, 5) ?? "08:00");
          setEndTime(data.end_time?.substring(0, 5)     ?? "10:00");
          setDisciplineId(data.discipline_id ?? "");
          setSlotTitle(data.title            ?? "");
          setFormateurId(data.formateur_id   ?? "");
          setRoomName(data.room_name         ?? "");
          setMode(data.mode                  ?? "presentiel");
          setOnlineLink(data.online_link     ?? "");
          // Centres libres : garder le contexte grille si fourni
          setNiveauId((!isTcfCenter && defaultNiveauId) ? defaultNiveauId : (data.niveau_id ?? defaultNiveauId ?? ""));
          setGroupeId((!isTcfCenter && defaultGroupeId) ? defaultGroupeId : (data.groupe_id ?? defaultGroupeId ?? ""));
          if (data.specific_date) setSpecificDate(data.specific_date);
          const { data: grpLinks } = await supabase
            .from("schedule_slot_groupes")
            .select("groupe_id")
            .eq("slot_id", type.slotId);
          const gids = (grpLinks ?? []).map((l) => l.groupe_id);
          const primary = (!isTcfCenter && defaultGroupeId) ? defaultGroupeId : (data.groupe_id || gids[0] || "");
          const merged = primary
            ? Array.from(new Set([primary, ...gids]))
            : gids;
          setSelectedGroupeIds(merged);
          setIsTroncCommun(merged.length >= 2);
          // Si des classes hors filière courante → activer le toggle
          if (merged.length >= 2) {
            const sameIds = new Set(groupes.map((g) => g.id));
            if (merged.some((id) => id !== primary && !sameIds.has(id))) {
              setIncludeOtherPrograms(true);
            }
          }
        }
      })();
      if (type.type === "exception" && type.existingExceptionId) {
        (async () => {
          const { data: ex } = await supabase.from("schedule_exceptions").select("*").eq("id", type.existingExceptionId).single();
          if (ex) {
            setExType(ex.type); setExReason(ex.reason ?? "");
            setExNewDate(ex.new_date ?? "");
            setExNewStart(ex.new_start_time?.substring(0, 5) ?? "");
            setExNewEnd(ex.new_end_time?.substring(0, 5)     ?? "");
            setExNewRoom(ex.new_room_name           ?? "");
            setExSubstituteId(ex.substitute_formateur_id ?? "");
            setExPendingPlace(ex.type === "rescheduled" && !ex.new_date);
          }
        })();
      }
    }
  }, [type, defaultNiveauId, defaultGroupeId, isTcfCenter, groupes]);

  // Notify students in-app (+ forum classroom) after saving a collective slot
  const notifyStudents = async (title: string, slotId: string, sessionDate: string | null) => {
    try {
      const dateLabel = sessionDate
        ? new Date(`${sessionDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        : (DAYS[dayOfWeek - 1] ?? "");
      const modeLabel = mode === "en_ligne" ? "En ligne (visio NEXA)" : "Présentiel";
      const joinPath =
        mode === "en_ligne" && slotId && sessionDate
          ? `/tcf-canada/live/room/${slotId}?date=${sessionDate}`
          : null;
      const baseMsg = `📅 Nouvelle séance programmée — « ${title} » · ${dateLabel} · ${startTime}–${endTime} · ${modeLabel}${roomName && mode === "presentiel" ? ` · ${roomName}` : ""}${joinPath ? `\n🔗 Rejoindre : ${joinPath}` : ""}`;

      const groupeIds = isTcfCenter
        ? selectedGroupeIds
        : (isTroncCommun
            ? Array.from(new Set([lockedGroupeId || groupeId, ...selectedGroupeIds].filter(Boolean)))
            : (lockedGroupeId || groupeId ? [lockedGroupeId || groupeId] : []));
      if (groupeIds.length > 0) {
        const { data: rooms } = await supabase
          .from("community_rooms")
          .select("id, groupe_id")
          .eq("center_id", centerId)
          .eq("type", "classroom")
          .in("groupe_id", groupeIds);

        for (const room of rooms ?? []) {
          await supabase.from("community_messages").insert({
            user_id: userId,
            message: baseMsg,
            room_id: room.id,
            center_id: centerId,
          });
        }
      } else {
        await supabase.from("community_messages").insert({
          user_id: userId,
          message: baseMsg,
          center_id: centerId,
          filiere_id: filiereId || null,
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/centre/tcf-planning/notify-slot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            slot_id: slotId,
            session_date: sessionDate,
            title,
            start_time: startTime,
            end_time: endTime,
            mode,
            event: "created",
          }),
        });
      }
    } catch (_) {
      // silent — notification best-effort
    }
  };

  const handleSaveSlot = async () => {
    if (!startTime || !endTime)           { setError("Horaires requis."); return; }
    if (!slotTitle.trim() && !disciplineId) { setError("Titre ou matière requis."); return; }
    if (isTcfCenter && !specificDate) { setError("Date de la séance requise."); return; }
    if (isTcfCenter && selectedGroupeIds.length === 0) {
      setError("Sélectionnez au moins une classe pour le coaching de groupe.");
      return;
    }
    if (!isTcfCenter) {
      const effectiveNiveau = lockedNiveauId || niveauId;
      const effectiveGroupe = lockedGroupeId || groupeId;
      if (niveaux.length > 0 && !effectiveNiveau) { setError("Niveau obligatoire."); return; }
      if (isTroncCommun) {
        const extras = selectedGroupeIds.filter((id) => id !== effectiveGroupe);
        if (!effectiveGroupe || extras.length < 1) {
          setError("Tronc commun : ajoutez au moins une autre classe.");
          return;
        }
        if (mode === "presentiel" && !roomName.trim()) {
          setError("Salle obligatoire pour le tronc commun en présentiel.");
          return;
        }
      } else if (!effectiveGroupe) {
        setError("Classe obligatoire.");
        return;
      }
    }
    setSaving(true); setError("");

    let resolvedDay = dayOfWeek;
    if (isTcfCenter && specificDate) {
      const d = new Date(`${specificDate}T12:00:00`);
      resolvedDay = d.getDay() === 0 ? 7 : d.getDay();
    }

    // Centres libres → RPC atomique via API
    if (!isTcfCenter) {
      const effectiveNiveau = lockedNiveauId || niveauId;
      const effectiveGroupe = lockedGroupeId || groupeId;
      const troncIds = effectiveGroupe
        ? Array.from(new Set([effectiveGroupe, ...selectedGroupeIds.filter((id) => id !== effectiveGroupe)]))
        : selectedGroupeIds;
      try {
        const res = await fetch("/api/center/planning-slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: "upsert",
            slot_id: (type.type === "edit_slot" || type.type === "exception") ? type.slotId : null,
            filiere_id: filiereId,
            niveau_id: effectiveNiveau || null,
            groupe_id: isTroncCommun ? effectiveGroupe : effectiveGroupe,
            groupe_ids: isTroncCommun ? troncIds : (effectiveGroupe ? [effectiveGroupe] : []),
            day_of_week: resolvedDay,
            start_time: startTime,
            end_time: endTime,
            discipline_id: disciplineId || null,
            title: slotTitle.trim() || disciplines.find((d) => d.id === disciplineId)?.name || null,
            formateur_id: formateurId || null,
            room_name: mode === "presentiel" ? (roomName.trim() || null) : null,
            mode,
            online_link: null, // LiveKit NEXA — pas de lien externe
            is_tronc_commun: isTroncCommun,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error || "Enregistrement impossible.");
          setSaving(false);
          return;
        }
        if (type.type === "add_slot" && json.slot_id) {
          await notifyStudents(
            slotTitle.trim() || disciplines.find((d) => d.id === disciplineId)?.name || "Nouveau cours",
            json.slot_id,
            null,
          );
        }
        setSaving(false);
        onSaved();
        return;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur réseau.");
        setSaving(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      center_id: centerId, filiere_id: filiereId,
      niveau_id: null,
      groupe_id: null,
      day_of_week: resolvedDay, start_time: startTime, end_time: endTime,
      discipline_id: disciplineId || null,
      title: slotTitle.trim() || "Coaching de groupe",
      formateur_id: formateurId || null,
      room_name: roomName.trim() || null,
      online_link: null,
      mode, created_by: userId,
      session_scope: "collective",
      specific_date: specificDate || null,
    };

    if (type.type === "edit_slot") {
      const { error: err } = await supabase.from("schedule_slots").update(payload).eq("id", type.slotId);
      if (err) { setError(err.message); setSaving(false); return; }
      await supabase.from("schedule_slot_groupes").delete().eq("slot_id", type.slotId);
      if (selectedGroupeIds.length > 0) {
        const { error: grpErr } = await supabase.from("schedule_slot_groupes").insert(
          selectedGroupeIds.map((gid) => ({ slot_id: type.slotId, groupe_id: gid }))
        );
        if (grpErr) { setError(grpErr.message); setSaving(false); return; }
      }
    } else {
      const { data: inserted, error: err } = await supabase.from("schedule_slots").insert(payload).select("id").single();
      if (err) { setError(err.message); setSaving(false); return; }
      if (inserted?.id && selectedGroupeIds.length > 0) {
        const { error: grpErr } = await supabase.from("schedule_slot_groupes").insert(
          selectedGroupeIds.map((gid) => ({ slot_id: inserted.id, groupe_id: gid }))
        );
        if (grpErr) { setError(grpErr.message); setSaving(false); return; }
      }
      await notifyStudents(
        slotTitle.trim() || "Coaching de groupe",
        inserted.id,
        specificDate || null
      );
    }
    setSaving(false);
    onSaved();
  };

  const handleSaveException = async () => {
    if (type.type !== "exception") return;
    if (!exReason.trim()) { setError("Motif obligatoire."); return; }
    if (exType === "rescheduled" && !exPendingPlace) {
      if (!exNewDate || !exNewStart || !exNewEnd) {
        setError("Date et horaires de report obligatoires (ou cochez « placer plus tard »).");
        return;
      }
    }
    setSaving(true); setError("");

    if (!isTcfCenter) {
      try {
        const res = await fetch("/api/center/planning-slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: "save_exception",
            slot_id: type.slotId,
            exception_id: type.existingExceptionId || null,
            exception_date: type.date,
            type: exType,
            reason: exReason.trim(),
            new_date: exType === "rescheduled" && !exPendingPlace ? exNewDate : null,
            new_start_time: exType === "rescheduled" && !exPendingPlace ? exNewStart : null,
            new_end_time: exType === "rescheduled" && !exPendingPlace ? exNewEnd : null,
            new_room_name: exType === "rescheduled" && !exPendingPlace ? exNewRoom.trim() || null : null,
            substitute_formateur_id: exType === "substituted" ? exSubstituteId || null : null,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setError(json.error || "Enregistrement impossible."); setSaving(false); return; }
        setSaving(false);
        onSaved();
        return;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur réseau.");
        setSaving(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      slot_id: type.slotId, exception_date: type.date, type: exType,
      reason: exReason.trim() || null, created_by: userId,
    };
    if (exType === "rescheduled") {
      payload.new_date = exPendingPlace ? null : (exNewDate || null);
      payload.new_start_time = exPendingPlace ? null : (exNewStart || null);
      payload.new_end_time = exPendingPlace ? null : (exNewEnd || null);
      payload.new_room_name = exPendingPlace ? null : (exNewRoom.trim() || null);
    }
    if (exType === "substituted") payload.substitute_formateur_id = exSubstituteId || null;

    if (type.existingExceptionId) {
      const { error: err } = await supabase.from("schedule_exceptions").update(payload).eq("id", type.existingExceptionId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("schedule_exceptions").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  };

  const handleDuplicateWeeks = async () => {
    if (type.type !== "exception" && type.type !== "edit_slot") return;
    const slotId = type.slotId;
    setSaving(true); setError(""); setDupMsg("");
    try {
      const res = await fetch("/api/center/planning-slots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: "materialize",
          slot_id: slotId,
          from_date: type.type === "exception" ? type.date : new Date().toISOString().slice(0, 10),
          weeks: dupWeeks,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Duplication impossible."); setSaving(false); return; }
      setDupMsg(`Créés : ${json.created ?? 0} · Ignorés (conflit) : ${json.skipped ?? 0}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (type.type !== "edit_slot" && type.type !== "exception") return;
    if (!confirm("Supprimer ce créneau ?")) return;
    await supabase.from("schedule_slots").delete().eq("id", type.slotId);
    onSaved();
  };

  const handleDeleteException = async () => {
    if (type.type !== "exception" || !type.existingExceptionId) return;
    if (!confirm("Rétablir le cours normal ?")) return;
    await supabase.from("schedule_exceptions").delete().eq("id", type.existingExceptionId);
    onSaved();
  };

  const showSlotForm = isAddSlot || isEditSlot || (isException && !isTcfCenter && panelMode === "edit");
  const showExceptionForm = isException && (isTcfCenter || panelMode === "manage");

  const panelTitle = isAddSlot
    ? (isTcfCenter ? "Nouveau coaching de groupe" : "Nouveau créneau")
    : showSlotForm ? "Modifier le créneau"
    : "Gérer ce cours";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] h-full bg-white shadow-2xl flex flex-col border-l border-neutral-200">

        <div className="px-5 py-4 border-b border-neutral-100 flex items-start justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="text-lg font-medium text-neutral-900 tracking-tight">{panelTitle}</h3>
            {isException && (
              <p className="text-sm text-neutral-500 mt-0.5">Date : {(type as { date?: string }).date}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full text-neutral-500 hover:bg-neutral-100 flex items-center justify-center shrink-0"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {isException && !isTcfCenter && (
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-full">
              <button
                type="button"
                onClick={() => setPanelMode("manage")}
                className={`flex-1 h-8 rounded-full text-sm transition-colors ${panelMode === "manage" ? "bg-white shadow-sm text-neutral-900 font-medium" : "text-neutral-500"}`}
              >
                Annuler / Reporter
              </button>
              <button
                type="button"
                onClick={() => setPanelMode("edit")}
                className={`flex-1 h-8 rounded-full text-sm transition-colors ${panelMode === "edit" ? "bg-white shadow-sm text-neutral-900 font-medium" : "text-neutral-500"}`}
              >
                Modifier
              </button>
            </div>
          )}

          {showExceptionForm ? (
            <>
              <div className="bg-neutral-50 rounded-xl p-3 border text-xs">
                <p className="font-black" style={{ color: BLUE }}>{slotTitle || "—"}</p>
                <p className="text-neutral-400 mt-0.5">{DAYS[(dayOfWeek - 1)]} {startTime}–{endTime} · {roomName || "Sans salle"}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block mb-2">Que se passe-t-il ?</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "cancelled"   as const, label: "Annuler",   icon: Ban,       cls: "red" },
                    { value: "rescheduled" as const, label: "Reporter",  icon: RefreshCw, cls: "amber" },
                    { value: "substituted" as const, label: "Remplacer", icon: UserCheck, cls: "blue" },
                  ]).map(({ value, label, icon: Icon, cls }) => (
                    <button key={value} type="button" onClick={() => setExType(value)} className={`p-3 rounded-xl border-2 text-center transition-all ${exType === value ? `border-${cls}-400 bg-${cls}-50` : "border-neutral-200 hover:border-neutral-300"}`}>
                      <Icon size={16} className={`mx-auto mb-1 ${exType === value ? `text-${cls}-600` : "text-neutral-400"}`} />
                      <span className="text-[10px] font-black uppercase">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <PanelField label="Motif (obligatoire)">
                <textarea value={exReason} onChange={(e) => setExReason(e.target.value)} placeholder="Prof malade, fête nationale..." rows={2} className="w-full p-3 bg-neutral-50 border rounded-xl text-xs font-medium outline-none resize-none focus:border-blue-400" />
              </PanelField>

              {exType === "rescheduled" && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase text-amber-700">Nouveau créneau</p>
                  {!isTcfCenter && (
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exPendingPlace}
                        onChange={(e) => setExPendingPlace(e.target.checked)}
                      />
                      Placer plus tard (calendrier établissement)
                    </label>
                  )}
                  {!exPendingPlace && (
                    <>
                      <PanelField label="Nouvelle date"><input type="date" value={exNewDate} onChange={(e) => setExNewDate(e.target.value)} className={panelInputCls} /></PanelField>
                      <div className="grid grid-cols-2 gap-2">
                        <PanelField label="Début"><input type="time" value={exNewStart} onChange={(e) => setExNewStart(e.target.value)} className={panelInputCls} /></PanelField>
                        <PanelField label="Fin">  <input type="time" value={exNewEnd}   onChange={(e) => setExNewEnd(e.target.value)}   className={panelInputCls} /></PanelField>
                      </div>
                      <PanelField label="Salle"><input value={exNewRoom} onChange={(e) => setExNewRoom(e.target.value)} placeholder="Même salle si vide" className={panelInputCls} /></PanelField>
                    </>
                  )}
                </div>
              )}

              {exType === "substituted" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <PanelField label="Formateur remplaçant">
                    <select value={exSubstituteId} onChange={(e) => setExSubstituteId(e.target.value)} className={panelInputCls}>
                      <option value="">Choisir...</option>
                      {trainers.map((t) => <option key={t.id} value={t.id}>{t.prenom} {t.nom ?? ""}</option>)}
                    </select>
                  </PanelField>
                </div>
              )}
            </>
          ) : showSlotForm ? (
            <>
              {isTcfCenter && (
                <PanelField label="Date de la séance">
                  <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className={panelInputCls} />
                </PanelField>
              )}

              {!isTcfCenter && (
              <PanelField label="Jour">
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className={panelInputCls}>
                  {DAYS.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
                </select>
              </PanelField>
              )}

              <div className="grid grid-cols-2 gap-3">
                <PanelField label="Début"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={panelInputCls} /></PanelField>
                <PanelField label="Fin">  <input type="time" value={endTime}   onChange={(e) => setEndTime(e.target.value)}   className={panelInputCls} /></PanelField>
              </div>

              {!isTcfCenter && (
              <PanelField label="Matière">
                <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)} className={panelInputCls}>
                  <option value="">Pas de matière (titre libre)</option>
                  {disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </PanelField>
              )}

              {(isTcfCenter || !disciplineId) && (
                <PanelField label={isTcfCenter ? "Titre de la séance" : "Titre libre"}>
                  <input value={slotTitle} onChange={(e) => setSlotTitle(e.target.value)} placeholder={isTcfCenter ? "Ex : Expression orale — groupe A" : "Ex : Étude dirigée..."} className={panelInputCls} />
                </PanelField>
              )}

              <PanelField label="Formateur">
                <select value={formateurId} onChange={(e) => setFormateurId(e.target.value)} className={panelInputCls}>
                  <option value="">À définir</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.prenom} {t.nom ?? ""}</option>)}
                </select>
              </PanelField>

              {!isTcfCenter && (
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                  <p className="text-xs text-neutral-500">Contexte</p>
                  <p className="text-sm font-medium text-neutral-900 mt-0.5">
                    {lockedNiveau
                      ? `Niveau ${lockedNiveau.annee ?? `${lockedNiveau.mois}m`}`
                      : "Niveau —"}
                    {" · "}
                    {lockedGroupe?.nom || "Classe —"}
                  </p>
                  {filiereName && (
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{filiereName}</p>
                  )}
                </div>
              )}

              {!isTcfCenter && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-neutral-300"
                      checked={isTroncCommun}
                      onChange={(e) => {
                        setIsTroncCommun(e.target.checked);
                        if (!e.target.checked) setIncludeOtherPrograms(false);
                        const primary = lockedGroupeId || groupeId || defaultGroupeId || "";
                        setSelectedGroupeIds(primary ? [primary] : []);
                        if (!e.target.checked) setGroupeId(primary);
                      }}
                    />
                    <span>
                      <span className="text-sm font-medium text-neutral-900 block">Tronc commun</span>
                      <span className="text-xs text-neutral-500">
                        Ajouter d’autres classes (autres niveaux du programme, ou d’autres programmes)
                      </span>
                    </span>
                  </label>

                  {isTroncCommun && (
                    <div className="space-y-3 pt-1 border-t border-neutral-100">
                      {lockedGroupe && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 text-sm text-neutral-800">
                          <Check size={14} className="text-neutral-500 shrink-0" />
                          <span className="font-medium truncate">{lockedGroupe.nom}</span>
                          <span className="ml-auto text-xs text-neutral-400 shrink-0">Actuelle</span>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-neutral-500 mb-1.5">
                          Même programme{filiereName ? ` · ${filiereName}` : ""} — tous niveaux
                        </p>
                        <div className="space-y-0.5 max-h-40 overflow-y-auto rounded-xl border border-neutral-100">
                          {troncSameProgram.length === 0 ? (
                            <p className="text-xs text-neutral-400 italic px-3 py-4">Aucune autre classe dans ce programme.</p>
                          ) : (
                            troncSameProgram.map((g) => (
                              <label key={g.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedGroupeIds.includes(g.id)}
                                  onChange={() => toggleTroncGroupe(g.id)}
                                  className="rounded border-neutral-300"
                                />
                                <span className="min-w-0 truncate text-neutral-900">{g.nom}</span>
                                {g.niveau_label && (
                                  <span className="ml-auto text-xs text-neutral-400 shrink-0">{g.niveau_label}</span>
                                )}
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300"
                          checked={includeOtherPrograms}
                          onChange={(e) => setIncludeOtherPrograms(e.target.checked)}
                        />
                        <span className="text-sm text-neutral-800">Inclure d’autres programmes</span>
                      </label>

                      {includeOtherPrograms && (
                        <div>
                          <p className="text-xs text-neutral-500 mb-1.5">Autres programmes du centre</p>
                          <div className="space-y-0.5 max-h-44 overflow-y-auto rounded-xl border border-neutral-100">
                            {troncLoading ? (
                              <p className="text-xs text-neutral-400 px-3 py-4 flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin" /> Chargement…
                              </p>
                            ) : troncOtherPrograms.length === 0 ? (
                              <p className="text-xs text-neutral-400 italic px-3 py-4">Aucune classe hors programme.</p>
                            ) : (
                              troncOtherPrograms.map((g) => (
                                <label key={g.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-50 cursor-pointer text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedGroupeIds.includes(g.id)}
                                    onChange={() => toggleTroncGroupe(g.id)}
                                    className="rounded border-neutral-300"
                                  />
                                  <span className="min-w-0 truncate text-neutral-900">{g.nom}</span>
                                  <span className="ml-auto text-[10px] text-neutral-400 shrink-0 text-right max-w-[45%] truncate">
                                    {[g.filiere_name, g.niveau_label].filter(Boolean).join(" · ")}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-neutral-400">
                        Min. 1 autre classe{mode === "presentiel" ? " · salle obligatoire en présentiel" : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isTcfCenter && groupes.length > 0 && (
                <PanelField label="Classes concernées">
                  <div className="space-y-1.5 max-h-32 overflow-y-auto border border-neutral-200 rounded-xl p-2">
                    {groupes.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-neutral-50 cursor-pointer text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={selectedGroupeIds.includes(g.id)}
                          onChange={() => setSelectedGroupeIds((prev) =>
                            prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                          )}
                        />
                        {g.nom}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-neutral-400">
                    Au moins une classe est requise. Pour inviter des personnes hors classe, utilisez Sessions Live.
                  </p>
                </PanelField>
              )}

              <PanelField label="Mode">
                <div className="flex gap-1 p-1 bg-neutral-100 rounded-full">
                  {([
                    { v: "presentiel" as const, label: "Présentiel", icon: MapPin },
                    { v: "en_ligne"   as const, label: "En ligne",   icon: Monitor },
                  ]).map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setMode(v)}
                      className={`flex-1 h-9 rounded-full text-sm inline-flex items-center justify-center gap-1.5 transition-colors ${
                        mode === v ? "bg-white shadow-sm text-neutral-900 font-medium" : "text-neutral-500"
                      }`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </PanelField>

              {mode === "presentiel" && (
                <PanelField label={isTroncCommun && !isTcfCenter ? "Salle (obligatoire)" : "Salle"}>
                  <input
                    list={!isTcfCenter ? "planning-known-rooms" : undefined}
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={knownRooms.length ? "Choisir ou saisir…" : "Salle 101, Labo…"}
                    className={panelInputCls}
                  />
                  {!isTcfCenter && knownRooms.length > 0 && (
                    <datalist id="planning-known-rooms">
                      {knownRooms.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  )}
                  {!isTcfCenter && (
                    <p className="mt-1.5 text-xs text-neutral-400">
                      {isTroncCommun
                        ? includeOtherPrograms
                          ? "Suggestions : salles déjà utilisées dans le centre."
                          : "Suggestions : salles déjà utilisées dans ce programme."
                        : "Suggestions : salles déjà utilisées sur ce niveau."}
                    </p>
                  )}
                </PanelField>
              )}

              {mode === "en_ligne" && (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                  Visio NEXA (LiveKit) automatique — séance de groupe. Les apprenants rejoignent depuis Coaching / Live.
                </div>
              )}

              {!isTcfCenter && (isEditSlot || isException) && (
                <div className="rounded-xl border border-dashed border-neutral-300 p-4 space-y-3 bg-neutral-50">
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Dupliquer cette plage</p>
                  <p className="text-[11px] text-neutral-500">Génère des occurrences datées sur N semaines (conflits formateur ignorés).</p>
                  <div className="flex items-end gap-2">
                    <PanelField label="Semaines">
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={dupWeeks}
                        onChange={(e) => setDupWeeks(Math.min(52, Math.max(1, Number(e.target.value) || 1)))}
                        className={panelInputCls}
                      />
                    </PanelField>
                    <button
                      type="button"
                      onClick={handleDuplicateWeeks}
                      disabled={saving}
                      className="h-11 px-4 rounded-xl text-xs font-black uppercase text-white shrink-0 disabled:opacity-50"
                      style={{ backgroundColor: ORANGE }}
                    >
                      Dupliquer
                    </button>
                  </div>
                  {dupMsg && <p className="text-[11px] font-medium text-emerald-700">{dupMsg}</p>}
                </div>
              )}
            </>
          ) : null}

          {error && (
            <p className="text-sm text-neutral-800 bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            {(isEditSlot || (isException && panelMode === "edit")) && (
              <button type="button" onClick={handleDeleteSlot} className="h-9 px-3 rounded-full text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5">
                <Trash2 size={14} /> Supprimer
              </button>
            )}
            {showExceptionForm && type.type === "exception" && type.existingExceptionId && (
              <button type="button" onClick={handleDeleteException} className="h-9 px-3 rounded-full text-sm text-neutral-700 hover:bg-neutral-100 inline-flex items-center gap-1.5">
                <RefreshCw size={14} /> Rétablir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-full border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50">
              Annuler
            </button>
            <button
              type="button"
              onClick={showExceptionForm ? handleSaveException : handleSaveSlot}
              disabled={saving}
              className="h-9 px-5 rounded-full text-sm text-white inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: BLUE }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UI atoms ────────────────────────────────────────────────────────────────
const panelInputCls = "w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-shadow";

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-neutral-500 block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

