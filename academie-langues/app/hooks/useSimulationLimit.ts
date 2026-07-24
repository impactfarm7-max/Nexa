"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import {
  computeExamCompletAccess,
  type ExamCompletAccess,
} from "@/app/utils/examCompletUnlock";
import { isPluriannualCenter } from "@/app/data/center-types";

// Utilitaires de dates pour les Formations et Essais
function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function getWeekStr() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return d.getFullYear() + '-W' + (1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7));
}

// Caches locaux pour le confort utilisateur
const LS_PREFIX = "iag_zen_sim_";
function lsGet(key: string): number { return typeof window !== "undefined" ? parseInt(localStorage.getItem(key) || "0", 10) : 0; }
function lsSet(key: string, n: number) { if (typeof window !== "undefined") localStorage.setItem(key, String(n)); }

const UNLIMITED = 9999;

export function useSimulationLimit() {
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  // 1. STATUT DE L'ÉTUDIANT
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCenterStudent, setIsCenterStudent] = useState(false);
  const [isPluriannualStudent, setIsPluriannualStudent] = useState(false);
  const [isSubValid, setIsSubValid] = useState(false);
  const [packType, setPackType] = useState<string>("aucun");
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);

  // 2. QUOTAS GLOBAUX (Packs)
  const [quotas, setQuotas] = useState({
    eeTotal: 0, eeUsed: 0,
    examTotal: 0, examUsed: 0,
    exam4mTotal: 0, exam4mUsed: 0,
    eoTotal: 0, eoUsed: 0,
    coachingTotal: 0, coachingUsed: 0,
  });

  // 3. COMPTEURS TEMPORELS (Formations & Classique)
  const [dailyZenCount, setDailyZenCount] = useState(0); // Max 1/jour (ou 3/jour pour essai)
  const [weeklyEOCount, setWeeklyEOCount] = useState(0); // Max 3/semaine
  const [trialTotalUsed, setTrialTotalUsed] = useState(0); // Essai : cumulatif sur 24 heures (max 6)

  const init = async () => {
    const today = getTodayStr();
    const thisWeek = getWeekStr();

    const localDailyCount = lsGet(LS_PREFIX + today);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    userIdRef.current = user.id;

    const { data, error: selectError } = await supabase
      .from("profiles")
      .select("role, center_id, daily_sim_count, daily_sim_date, weekly_eo_count, weekly_eo_reset_date, pack_name, subscription_ends_at, subscription_paused_at, created_at, activated_at, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used")
      .eq("id", user.id)
      .single();

    // Si le SELECT échoue (colonne manquante en DB), on tente un fallback minimal
    let profileData = data as any;
    if (selectError || !profileData) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("role, center_id, pack_name, subscription_ends_at, subscription_paused_at, created_at, daily_sim_count, daily_sim_date, weekly_eo_count, weekly_eo_reset_date")
        .eq("id", user.id)
        .single();
      profileData = fallback as any;
    }

    const profile = profileData;
    if (!profile) { setLoading(false); return; }
    const centerStudent = !!profile.center_id && profile.role !== "admin" && profile.role !== "center_manager" && profile.role !== "trainer";
    setIsCenterStudent(centerStudent);

    let pluriannualStudent = profile.pack_name?.toLowerCase() === "pluriannuel";
    if (centerStudent && profile.center_id && !pluriannualStudent) {
      const { data: centerRow } = await supabase
        .from("centers")
        .select("center_type")
        .eq("id", profile.center_id)
        .maybeSingle();
      pluriannualStudent = isPluriannualCenter(centerRow?.center_type);
    }
    setIsPluriannualStudent(pluriannualStudent);

    // 👑 ADMIN BYPASS
    if (profile.role === "admin") {
      setIsAdmin(true);
      setIsSubValid(true);
      setPackType("admin");
      setLoading(false);
      return;
    }

    // VALIDITÉ & ANCIENNETÉ
    if (profile.subscription_ends_at && !profile.subscription_paused_at) setIsSubValid(new Date(profile.subscription_ends_at).getTime() > Date.now());
    else setIsSubValid(false);
    setActivatedAt(profile.activated_at ?? profile.created_at ?? null);
    setSubscriptionEndsAt(profile.subscription_ends_at ?? null);

    let resolvedPackType = profile.pack_name?.toLowerCase() || "aucun";
    if (resolvedPackType === "complete" && profile.created_at && profile.subscription_ends_at) {
      const createdAt = new Date(profile.created_at).getTime();
      const endsAt = new Date(profile.subscription_ends_at).getTime();
      if (Number.isFinite(createdAt) && Number.isFinite(endsAt) && endsAt - createdAt <= 26 * 60 * 60 * 1000) {
        resolvedPackType = "essai";
      }
    }
    setPackType(
      pluriannualStudent
        ? "pluriannuel"
        : centerStudent && resolvedPackType === "aucun"
          ? "ivoire"
          : resolvedPackType,
    );

    const unsetQuota = (value: number | null | undefined) => value == null;

    setQuotas(
      pluriannualStudent
        ? {
            eeTotal: 0, eeUsed: 0,
            examTotal: 0, examUsed: 0,
            exam4mTotal: 0, exam4mUsed: 0,
            eoTotal: 0, eoUsed: 0,
            coachingTotal: 0, coachingUsed: 0,
          }
        : {
            eeTotal: centerStudent && unsetQuota(profile.ee_total) ? UNLIMITED : profile.ee_total ?? 0,
            eeUsed: profile.ee_used || 0,
            examTotal: centerStudent && unsetQuota(profile.exam_total) ? 24 : profile.exam_total ?? 0,
            examUsed: profile.exam_used || 0,
            exam4mTotal: centerStudent && unsetQuota(profile.exam_4m_total) ? 4 : profile.exam_4m_total ?? 0,
            exam4mUsed: profile.exam_4m_used || 0,
            eoTotal: centerStudent && unsetQuota(profile.eo_total) ? 36 : profile.eo_total ?? 0,
            eoUsed: profile.eo_used || 0,
            coachingTotal: centerStudent && unsetQuota(profile.coaching_total) ? 8 : profile.coaching_total ?? 0,
            coachingUsed: profile.coaching_used || 0,
          },
    );

    const isTrialUser = !pluriannualStudent
      && !["raphia", "ebene", "cauris", "ivoire", "acceleree", "complete", "essai", "pluriannuel"].includes(profile.pack_name?.toLowerCase() || "")
      && profile.role !== "admin";
    if (isTrialUser) setTrialTotalUsed(profile.ee_used ?? 0);

    // SYNCHRO QUOTIDIENNE (EE)
    let resolvedDaily: number;
    if (isTrialUser) {
      // Pour les essais : compteur journalier (reset chaque jour, max 3/jour)
      resolvedDaily = profile.daily_sim_date === today ? (profile.daily_sim_count ?? 0) : 0;
    } else {
      const serverDaily = profile.daily_sim_date === today ? (profile.daily_sim_count ?? 0) : 0;
      resolvedDaily = Math.max(serverDaily, localDailyCount);
    }
    setDailyZenCount(resolvedDaily);
    lsSet(LS_PREFIX + today, resolvedDaily);

    // SYNCHRO HEBDOMADAIRE (EO)
    const serverWeekly = profile.weekly_eo_reset_date === thisWeek ? (profile.weekly_eo_count ?? 0) : 0;
    setWeeklyEOCount(serverWeekly);

    // Mise à jour DB si besoin de reset quotidien
    const updates: any = {};
    if (isTrialUser && profile.daily_sim_date !== today) {
      updates.daily_sim_count = 0; updates.daily_sim_date = today;
    } else if (!isTrialUser && (resolvedDaily !== (profile.daily_sim_date === today ? profile.daily_sim_count : 0) || profile.daily_sim_date !== today)) {
      updates.daily_sim_count = resolvedDaily; updates.daily_sim_date = today;
    }
    if (profile.weekly_eo_reset_date !== thisWeek) {
      updates.weekly_eo_count = serverWeekly; updates.weekly_eo_reset_date = thisWeek;
    }
    if (Object.keys(updates).length > 0) await supabase.from("profiles").update(updates).eq("id", user.id);

    setLoading(false);
  };

  // Chargement initial
  useEffect(() => { init(); }, []);

  // Recharge quand l'onglet redevient visible (changement d'onglet) ou quand la fenêtre reprend le focus
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === "visible") init(); };
    const handleFocus = () => { init(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const isPackStudent = ["raphia", "ebene", "cauris", "ivoire"].includes(packType);
  const isFormation = ["acceleree", "complete"].includes(packType);
  const isFullAccessTrial = packType === "essai" && isSubValid;
  const hasFormationAccess = isFormation || isFullAccessTrial;
  const isTrial = !isPluriannualStudent && !isPackStudent && !isFormation && !isFullAccessTrial && !isAdmin;

  // Constantes essai
  const TRIAL_LIMIT = 6; // 2 séries × 3 tâches
  const TRIAL_DAYS = 1;
  const isInTrialPeriod = activatedAt
    ? Math.floor((Date.now() - new Date(activatedAt).getTime()) / (1000 * 3600 * 24)) < TRIAL_DAYS
    : false;

  const examCompletAccess: ExamCompletAccess = useMemo(
    () =>
      computeExamCompletAccess({
        activated_at: activatedAt,
        created_at: activatedAt,
        subscription_ends_at: subscriptionEndsAt,
        exam_4m_total: quotas.exam4mTotal,
        exam_4m_used: quotas.exam4mUsed,
      }),
    [activatedAt, subscriptionEndsAt, quotas.exam4mTotal, quotas.exam4mUsed],
  );

  // Vérifie si crédit disponible (gère 9999)
  const hasCredit = (used: number, total: number) => isAdmin || total === UNLIMITED || used < total;
  const calcLeft = (used: number, total: number) => isAdmin || total === UNLIMITED ? Infinity : Math.max(0, total - used);

  // ==========================================
  // 🟢 AUTORISATIONS (Le vigile)
  // ==========================================

  // Étudiants de centre : expression écrite ouverte uniquement le mercredi (3)
  // et le samedi (6), illimitée ces jours-là. (getDay() = jour local du client.)
  const dayOfWeek = new Date().getDay();
  const isEeOpenDayForCenter = dayOfWeek === 3 || dayOfWeek === 6;

  // EXPRESSION ÉCRITE (Zen)
  const canSimulateZen = isAdmin || (
    isPluriannualStudent ? false :
    isCenterStudent ? (isSubValid && isEeOpenDayForCenter) :
    isPackStudent && isSubValid ? hasCredit(quotas.eeUsed, quotas.eeTotal) :
    hasFormationAccess && isSubValid ? dailyZenCount < 1 :
    isTrial ? (isInTrialPeriod && trialTotalUsed < TRIAL_LIMIT && dailyZenCount < 3) :
    false
  );
  
  // EXPRESSION ORALE : 3/semaine pour Formations, sinon quota du pack
  const canSimulateEO = isAdmin || (
    !isPluriannualStudent && isSubValid && (
      hasFormationAccess ? weeklyEOCount < 3 :
      isPackStudent ? hasCredit(quotas.eoUsed, quotas.eoTotal) : false
    )
  );

  // EXAMENS EE
  const canSimulateEE = isAdmin || (
    !isPluriannualStudent && isSubValid && (hasFormationAccess || (isPackStudent && hasCredit(quotas.examUsed, quotas.examTotal)))
  );
  
  // EXAMENS COMPLETS 4M (cycles mensuels après J+20)
  const canSimulateExamenComplet = isAdmin || (
    !isPluriannualStudent && isSubValid && packType !== "raphia" && packType !== "aucun" && examCompletAccess.canUse
  );

  const canBookCoaching = isAdmin || (
    !isPluriannualStudent && isSubValid && (hasFormationAccess || (isPackStudent && hasCredit(quotas.coachingUsed, quotas.coachingTotal)))
  );

  // ==========================================
  // 🔴 DÉCOMPTE DES CRÉDITS
  // ==========================================

  const recordUsage = async (fieldUsed: string, currentValue: number) => {
    if (isAdmin || !userIdRef.current) return;
    const newUsed = currentValue + 1;
    setQuotas(prev => ({ ...prev, [fieldUsed]: newUsed })); 
    
    // Correspondance avec le nom des colonnes Supabase
    const dbColumn = fieldUsed === 'eeUsed' ? 'ee_used' : 
                     fieldUsed === 'examUsed' ? 'exam_used' : 
                     fieldUsed === 'exam4mUsed' ? 'exam_4m_used' : 
                     fieldUsed === 'eoUsed' ? 'eo_used' : 'coaching_used';
                     
    await supabase.from("profiles").update({ [dbColumn]: newUsed }).eq("id", userIdRef.current);
  };

  const recordZenSimulation = async () => {
    if (isAdmin || !userIdRef.current) return;
    if (isPackStudent) {
      if (quotas.eeTotal !== UNLIMITED) await recordUsage('eeUsed', quotas.eeUsed);
    } else if (hasFormationAccess) {
      const newCount = dailyZenCount + 1; setDailyZenCount(newCount); lsSet(LS_PREFIX + getTodayStr(), newCount);
      await supabase.from("profiles").update({ daily_sim_count: newCount, daily_sim_date: getTodayStr() }).eq("id", userIdRef.current);
    } else if (isTrial) {
      // Essai : incrément journalier + total cumulatif (ee_used)
      const newDaily = dailyZenCount + 1; setDailyZenCount(newDaily);
      const newTotal = trialTotalUsed + 1; setTrialTotalUsed(newTotal);
      await supabase.from("profiles").update({ daily_sim_count: newDaily, daily_sim_date: getTodayStr(), ee_used: newTotal }).eq("id", userIdRef.current);
    }
  };

  const recordEOSimulation = async () => {
    if (isAdmin || !userIdRef.current) return;
    if (hasFormationAccess) {
      const newCount = weeklyEOCount + 1; setWeeklyEOCount(newCount);
      await supabase.from("profiles").update({ weekly_eo_count: newCount, weekly_eo_reset_date: getWeekStr() }).eq("id", userIdRef.current);
    } else if (isPackStudent && quotas.eoTotal !== UNLIMITED) {
      await recordUsage('eoUsed', quotas.eoUsed);
    }
  };

  // Calcul dynamique des restes à afficher sur le Dashboard
  const getZenLeft = () => {
    if (isAdmin) return Infinity;
    if (isPluriannualStudent) return 0;
    if (isCenterStudent) return isEeOpenDayForCenter ? Infinity : 0; // ouvert mercredi/samedi
    if (isPackStudent) return calcLeft(quotas.eeUsed, quotas.eeTotal);
    if (hasFormationAccess) return Math.max(0, 1 - dailyZenCount);
    if (isTrial) return Math.max(0, TRIAL_LIMIT - trialTotalUsed);
    return Math.max(0, 1 - dailyZenCount); // Formations
  };

  const getEOLeft = () => {
    if (isAdmin) return Infinity;
    if (hasFormationAccess) return Math.max(0, 3 - weeklyEOCount);
    if (isPackStudent) return calcLeft(quotas.eoUsed, quotas.eoTotal);
    return 0;
  };

  const incrementTrialCount = () => {
    if (isTrial) {
      setDailyZenCount(prev => prev + 1);
      setTrialTotalUsed(prev => prev + 1);
    }
  };

  return {
    loading, isAdmin, isCenterStudent, isPluriannualStudent, isSubValid, packType, isTrial,
    /** Alias rétrocompat (simulateur oral, etc.) — essai gratuit 24 h */
    isEssaiPack: isTrial,
    activatedAt,
    isEeOpenDayForCenter,
    examCompletAccess,
    trialDailyLeft: isTrial ? Math.max(0, 3 - dailyZenCount) : null,
    
    canSimulate: canSimulateZen, 
    canSimulateEE,
    canSimulateExamenComplet,
    canSimulateEO,
    canBookCoaching,

    recordSimulation: recordZenSimulation,
    recordExamSimulation: () => quotas.examTotal !== UNLIMITED && recordUsage('examUsed', quotas.examUsed),
    recordExam4mSimulation: () => quotas.exam4mTotal !== UNLIMITED && recordUsage('exam4mUsed', quotas.exam4mUsed),
    recordEOSimulation,
    recordCoachingSession: () => quotas.coachingTotal !== UNLIMITED && recordUsage('coachingUsed', quotas.coachingUsed),
    incrementTrialCount,

    simulationsLeft: getZenLeft(),
    eeLeft: getZenLeft(),
    eoLeft: getEOLeft(),
    examLeft: calcLeft(quotas.examUsed, quotas.examTotal),
    exam4mLeft: isAdmin ? Infinity : examCompletAccess.creditsLeft,
    coachingLeft: calcLeft(quotas.coachingUsed, quotas.coachingTotal),
    
    dailyCount: dailyZenCount,
    weeklyEOCount,

    // ✅ VARIABLES RAJOUTÉES POUR NE PAS CASSER LES PAGES EXISTANTES
    eeTotal: quotas.eeTotal,
    examTotal: quotas.examTotal,
    exam4mTotal: quotas.exam4mTotal,
    eoTotal: quotas.eoTotal,
    coachingTotal: quotas.coachingTotal,
    DAILY_LIMIT: isTrial ? 3 : hasFormationAccess || !isPackStudent ? 1 : quotas.eeTotal
  };
}
