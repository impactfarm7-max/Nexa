import { SupabaseClient } from "@supabase/supabase-js";
import { computeExamCompositeScore, computeMonthlyRankings } from "@/app/utils/tcfExamScoring";
import {
  computeExamCompletAccess,
  type ExamCompletAccess,
} from "@/app/utils/examCompletUnlock";

export type ExamEligibilityResult = {
  mode: "b2c" | "center";
  canStart: boolean;
  /** Accès convocation / déblocage centre (n'impacte pas les crédits mensuels). */
  isExceptional: boolean;
  examenId: number | null;
  assignmentId: string | null;
  sessionId: string | null;
  reason: string;
  scheduledAt?: string | null;
  sessionTitle?: string | null;
  rank?: number | null;
  rankTotal?: number | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  normalAccess?: ExamCompletAccess;
};

const PACK_EXAM4M = ["ebene", "cauris", "ivoire", "acceleree", "complete"];

function inWindow(now: Date, start: string | null, end: string | null, scheduledAt: string): boolean {
  const s = start ? new Date(start) : new Date(scheduledAt);
  const e = end ? new Date(end) : new Date(new Date(scheduledAt).getTime() + 4 * 3600 * 1000);
  return now >= s && now <= e;
}

type ExceptionalCenterAccess = {
  canStart: boolean;
  examenId: number | null;
  assignmentId: string | null;
  sessionId: string | null;
  reason: string;
  scheduledAt?: string | null;
  sessionTitle?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
};

async function getCenterExceptionalAccess(
  supabase: SupabaseClient,
  userId: string,
  profile: Record<string, unknown>,
): Promise<ExceptionalCenterAccess> {
  const now = new Date();

  const { data: unlock } = await supabase
    .from("tcf_exam_unlocks")
    .select("id, examen_id, expires_at")
    .eq("user_id", userId)
    .eq("center_id", profile.center_id)
    .gt("expires_at", now.toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (unlock) {
    return {
      canStart: true,
      examenId: unlock.examen_id ?? null,
      assignmentId: null,
      sessionId: null,
      reason: "Déblocage exceptionnel par votre centre.",
    };
  }

  const { data: assignments } = await supabase
    .from("tcf_exam_assignments")
    .select(`
      id, status, session_id,
      tcf_exam_sessions:session_id (
        id, title, examen_id, scheduled_at, window_start, window_end, status, session_type
      )
    `)
    .eq("user_id", userId)
    .in("status", ["assigned", "started"])
    .order("created_at", { ascending: false });

  const active = (assignments ?? []).find((a: { tcf_exam_sessions?: unknown }) => {
    const s = a.tcf_exam_sessions as {
      status?: string;
      window_start?: string | null;
      window_end?: string | null;
      scheduled_at?: string;
    } | null;
    if (!s || s.status === "cancelled" || s.status === "closed") return false;
    return inWindow(now, s.window_start ?? null, s.window_end ?? null, s.scheduled_at!);
  }) as {
    id: string;
    tcf_exam_sessions: {
      id: string;
      title: string;
      examen_id: number;
      scheduled_at: string;
      window_start: string | null;
      window_end: string | null;
    };
  } | undefined;

  if (active?.tcf_exam_sessions) {
    const s = active.tcf_exam_sessions;
    return {
      canStart: true,
      examenId: s.examen_id,
      assignmentId: active.id,
      sessionId: s.id,
      sessionTitle: s.title,
      scheduledAt: s.scheduled_at,
      windowStart: s.window_start,
      windowEnd: s.window_end,
      reason: `Convocation exceptionnelle : ${s.title}`,
    };
  }

  const { data: upcoming } = await supabase
    .from("tcf_exam_assignments")
    .select(`
      id, status,
      tcf_exam_sessions:session_id (title, examen_id, scheduled_at, window_start, window_end, status)
    `)
    .eq("user_id", userId)
    .eq("status", "assigned")
    .order("created_at", { ascending: false })
    .limit(5);

  const next = (upcoming ?? []).find((a: { tcf_exam_sessions?: unknown }) => {
    const s = a.tcf_exam_sessions as { status?: string; scheduled_at?: string } | null;
    return s && s.status !== "cancelled" && new Date(s.scheduled_at!) > now;
  }) as {
    id: string;
    tcf_exam_sessions: {
      title: string;
      examen_id: number;
      scheduled_at: string;
    };
  } | undefined;

  if (next?.tcf_exam_sessions) {
    const s = next.tcf_exam_sessions;
    return {
      canStart: false,
      examenId: s.examen_id,
      assignmentId: next.id,
      sessionId: null,
      sessionTitle: s.title,
      scheduledAt: s.scheduled_at,
      reason: `Convocation programmée le ${new Date(s.scheduled_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.`,
    };
  }

  return {
    canStart: false,
    examenId: null,
    assignmentId: null,
    sessionId: null,
    reason: "",
  };
}

function getB2cEligibility(profile: Record<string, unknown>): ExamEligibilityResult {
  const role = profile.role;
  if (role === "admin") {
    return {
      mode: "b2c",
      canStart: true,
      isExceptional: false,
      examenId: null,
      assignmentId: null,
      sessionId: null,
      reason: "Accès administrateur.",
    };
  }

  const pack = String(profile.pack_name || "aucun").toLowerCase();
  const isSubValid = profile.subscription_ends_at
    ? new Date(String(profile.subscription_ends_at)).getTime() > Date.now()
    : false;

  if (!isSubValid) {
    return {
      mode: "b2c",
      canStart: false,
      isExceptional: false,
      examenId: null,
      assignmentId: null,
      sessionId: null,
      reason: "Abonnement expiré.",
    };
  }

  if (!PACK_EXAM4M.includes(pack) && pack !== "admin") {
    return {
      mode: "b2c",
      canStart: false,
      isExceptional: false,
      examenId: null,
      assignmentId: null,
      sessionId: null,
      reason: "Pack incompatible avec l'examen complet.",
    };
  }

  const normalAccess = computeExamCompletAccess({
    activated_at: profile.activated_at as string | null,
    created_at: profile.created_at as string | null,
    subscription_ends_at: profile.subscription_ends_at as string | null,
    exam_4m_total: profile.exam_4m_total as number | null,
    exam_4m_used: profile.exam_4m_used as number | null,
  });

  return {
    mode: "b2c",
    canStart: normalAccess.canUse,
    isExceptional: false,
    examenId: null,
    assignmentId: null,
    sessionId: null,
    reason: normalAccess.reason,
    normalAccess,
  };
}

async function getCenterEligibility(
  supabase: SupabaseClient,
  userId: string,
  profile: Record<string, unknown>,
): Promise<ExamEligibilityResult> {
  const exceptional = await getCenterExceptionalAccess(supabase, userId, profile);

  const isSubValid = profile.subscription_ends_at
    ? new Date(String(profile.subscription_ends_at)).getTime() > Date.now()
    : false;

  const normalAccess = isSubValid
    ? computeExamCompletAccess({
        activated_at: profile.activated_at as string | null,
        created_at: profile.created_at as string | null,
        subscription_ends_at: profile.subscription_ends_at as string | null,
        exam_4m_total: profile.exam_4m_total as number | null,
        exam_4m_used: profile.exam_4m_used as number | null,
      })
    : computeExamCompletAccess({
        activated_at: profile.activated_at as string | null,
        created_at: profile.created_at as string | null,
        subscription_ends_at: profile.subscription_ends_at as string | null,
        exam_4m_total: 0,
        exam_4m_used: profile.exam_4m_used as number | null,
      });

  if (!isSubValid && !exceptional.canStart) {
    return {
      mode: "center",
      canStart: false,
      isExceptional: false,
      examenId: exceptional.examenId,
      assignmentId: exceptional.assignmentId,
      sessionId: exceptional.sessionId,
      sessionTitle: exceptional.sessionTitle,
      scheduledAt: exceptional.scheduledAt,
      reason: "Abonnement expiré.",
      normalAccess,
    };
  }

  const canStart = exceptional.canStart || normalAccess.canUse;
  const reason = exceptional.canStart
    ? exceptional.reason
    : normalAccess.canUse
      ? normalAccess.reason
      : exceptional.reason || normalAccess.reason;

  return {
    mode: "center",
    canStart,
    isExceptional: exceptional.canStart,
    examenId: exceptional.canStart ? exceptional.examenId : null,
    assignmentId: exceptional.assignmentId,
    sessionId: exceptional.sessionId,
    sessionTitle: exceptional.sessionTitle,
    scheduledAt: exceptional.scheduledAt,
    windowStart: exceptional.windowStart,
    windowEnd: exceptional.windowEnd,
    reason,
    normalAccess,
  };
}

export async function getMonthlyRankForUser(
  supabase: SupabaseClient,
  userId: string,
  centerId: string,
): Promise<{ rank: number | null; total: number | null }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("user_id, ce_result, co_result, ee_result, eo_result")
    .eq("center_id", centerId)
    .eq("status", "completed")
    .gte("finished_at", monthStart)
    .lte("finished_at", monthEnd);

  const rows = (sessions ?? []).map((s) => ({
    user_id: s.user_id,
    composite_score: computeExamCompositeScore(s),
  }));

  const rankMap = computeMonthlyRankings(rows);
  const r = rankMap.get(userId);
  return { rank: r?.rank ?? null, total: r?.total ?? null };
}

export async function resolveExamEligibility(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExamEligibilityResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, center_id, pack_name, subscription_ends_at, created_at, activated_at, exam_4m_total, exam_4m_used",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return {
      mode: "b2c",
      canStart: false,
      isExceptional: false,
      examenId: null,
      assignmentId: null,
      sessionId: null,
      reason: "Profil introuvable.",
    };
  }

  if (profile.center_id && profile.role === "student") {
    const result = await getCenterEligibility(supabase, userId, profile);
    const rankInfo = await getMonthlyRankForUser(supabase, userId, profile.center_id);
    return { ...result, rank: rankInfo.rank, rankTotal: rankInfo.total };
  }

  return getB2cEligibility(profile);
}

export async function assertCanStartExam(
  supabase: SupabaseClient,
  userId: string,
  examenId: number,
): Promise<{
  ok: boolean;
  error?: string;
  assignmentId?: string | null;
  centerId?: string | null;
  countsTowardQuota?: boolean;
}> {
  const elig = await resolveExamEligibility(supabase, userId);

  if (!elig.canStart) {
    return { ok: false, error: elig.reason };
  }

  if (elig.isExceptional) {
    if (elig.examenId != null && elig.examenId !== examenId) {
      return { ok: false, error: `Examen imposé : Officiel ${String(elig.examenId).padStart(2, "0")}.` };
    }
    const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", userId).maybeSingle();
    return {
      ok: true,
      assignmentId: elig.assignmentId,
      centerId: profile?.center_id ?? null,
      countsTowardQuota: false,
    };
  }

  if (!elig.normalAccess?.canUse) {
    return { ok: false, error: elig.normalAccess?.reason || elig.reason };
  }

  return { ok: true, assignmentId: null, centerId: null, countsTowardQuota: true };
}
