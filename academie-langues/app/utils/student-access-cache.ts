import { supabase } from "@/app/utils/supabase";
import { isCenterStaff, isCenterStudent } from "@/app/utils/student-routes";
import { clearStaleAuthSession, isRefreshTokenError } from "@/app/utils/supabase-auth";
import { isCenterOperational } from "@/app/utils/center-trial";

export type StudentAccessProfile = {
  created_at: string | null;
  subscription_ends_at: string | null;
  role: string | null;
  tag_status: string | null;
  center_id: string | null;
  center_status: string | null;
  access_pause_reason: string | null;
  prenom: string | null;
  pin_hash: string | null;
};

export type StudentAccessSnapshot = {
  at: number;
  session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>;
  profile: StudentAccessProfile;
  centerName: string | null;
  centerType: string | null;
  centerInfo: { status: string | null; created_at: string | null } | null;
};

export type PaywallDecision =
  | { allowed: true }
  | { allowed: false; redirect: string; signOut?: boolean };

export type CenterGuardStatus =
  | "none"
  | "active"
  | "pending_center_approval"
  | "paused"
  | "revoked"
  | "expired"
  | "center_unavailable";

const TTL_MS = 45_000;
const PROFILE_SELECT =
  "created_at, subscription_ends_at, role, tag_status, center_id, center_status, access_pause_reason, prenom, pin_hash";

let snapshot: StudentAccessSnapshot | null = null;
let inflight: Promise<StudentAccessSnapshot | null> | null = null;

export function peekStudentAccess(): StudentAccessSnapshot | null {
  if (!snapshot || Date.now() - snapshot.at > TTL_MS) return null;
  return snapshot;
}

export function clearStudentAccessCache() {
  snapshot = null;
  inflight = null;
}

export async function loadStudentAccess(options?: { force?: boolean }): Promise<StudentAccessSnapshot | null> {
  if (!options?.force) {
    const cached = peekStudentAccess();
    if (cached) return cached;
    if (inflight) return inflight;
  }

  inflight = (async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error && isRefreshTokenError(error.message)) {
      await clearStaleAuthSession();
      snapshot = null;
      return null;
    }

    if (error || !session) {
      snapshot = null;
      return null;
    }

    const { data: profileWithReason, error: profileErr } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", session.user.id)
      .single();

    let profile = profileWithReason;
    if (profileErr || !profile) {
      const fallbackSelect =
        "created_at, subscription_ends_at, role, tag_status, center_id, center_status, prenom, pin_hash";
      const { data: fallbackProfile } = await supabase
        .from("profiles")
        .select(fallbackSelect)
        .eq("id", session.user.id)
        .single();
      profile = fallbackProfile
        ? ({ ...fallbackProfile, access_pause_reason: null } as typeof profileWithReason)
        : null;
    }

    if (!profile) {
      snapshot = null;
      return null;
    }

    let centerName: string | null = null;
    let centerType: string | null = null;
    let centerInfo: { status: string | null; created_at: string | null } | null = null;
    if (profile.center_id) {
      const { data: center } = await supabase
        .from("centers")
        .select("name, status, created_at, center_type")
        .eq("id", profile.center_id)
        .single();
      centerName = center?.name || null;
      centerType = center?.center_type ?? null;
      centerInfo = center ? { status: center.status ?? null, created_at: center.created_at ?? null } : null;
    }

    snapshot = {
      at: Date.now(),
      session,
      profile: profile as StudentAccessProfile,
      centerName,
      centerType,
      centerInfo,
    };
    return snapshot;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function isPasswordRecoveryBypass(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hash.includes("type=recovery") ||
    window.location.href.includes("reset-password")
  );
}

export function evaluatePaywallAccess(profile: StudentAccessProfile): PaywallDecision {
  if (isCenterStaff(profile)) {
    return { allowed: false, redirect: "/centre/dashboard" };
  }

  if (isCenterStudent(profile) && profile.tag_status === "pending_center_approval") {
    return { allowed: false, redirect: "/login", signOut: true };
  }

  if (isCenterStudent(profile)) {
    return { allowed: true };
  }

  if (profile.role !== "admin" && profile.tag_status === "revoque") {
    return { allowed: false, redirect: "/revoque" };
  }

  if (profile.role !== "admin" && profile.tag_status === "termine") {
    return { allowed: false, redirect: "/termine" };
  }

  if (profile.role === "admin") {
    return { allowed: true };
  }

  const now = Date.now();
  const isPremium =
    !!profile.subscription_ends_at && new Date(profile.subscription_ends_at).getTime() > now;
  const accountCreated = profile.created_at ? new Date(profile.created_at).getTime() : now;
  const trialEnds = accountCreated + 24 * 60 * 60 * 1000;

  if (!isPremium && now > trialEnds) {
    return { allowed: false, redirect: "/paywall" };
  }

  return { allowed: true };
}

export function resolveCenterGuardStatus(
  profile: StudentAccessProfile,
  centerInfo?: { status: string | null; created_at: string | null } | null,
): {
  status: CenterGuardStatus;
  daysLeft: number | null;
} {
  if (!profile.center_id) {
    return { status: "none", daysLeft: null };
  }

  if (centerInfo && !isCenterOperational(centerInfo)) {
    return { status: "center_unavailable", daysLeft: null };
  }

  let effectiveStatus: CenterGuardStatus = "none";

  // Mapping explicite — ne jamais traiter "normal"/"actif" comme un statut centre invalide,
  // ni laisser un tag_status "revoque" issu du trigger auth passer inaperçu.
  if (profile.center_status === "revoked" || profile.tag_status === "revoque") {
    effectiveStatus = "revoked";
  } else if (profile.center_status === "paused" || profile.tag_status === "paused") {
    effectiveStatus = "paused";
  } else if (
    profile.center_status === "pending_center_approval"
    || profile.tag_status === "pending_center_approval"
  ) {
    effectiveStatus = "pending_center_approval";
  } else if (
    profile.center_status === "active"
    || profile.tag_status === "normal"
    || profile.tag_status === "actif"
    || !profile.tag_status
  ) {
    effectiveStatus = "active";
  } else if (profile.center_status) {
    effectiveStatus = profile.center_status as CenterGuardStatus;
  }

  let daysLeft: number | null = null;

  if (effectiveStatus === "active" && profile.subscription_ends_at) {
    const remaining = Math.ceil(
      (new Date(profile.subscription_ends_at).getTime() - Date.now()) / 86400000
    );
    if (remaining <= 0) {
      effectiveStatus = "expired";
    } else {
      daysLeft = remaining;
    }
  }

  return { status: effectiveStatus, daysLeft };
}
