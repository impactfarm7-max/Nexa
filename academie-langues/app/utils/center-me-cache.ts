import { supabase } from "@/app/utils/supabase";
import { clearStaleAuthSession, isRefreshTokenError } from "@/app/utils/supabase-auth";

const CACHE_KEY = "nexa_center_bootstrap_v2";
const LEGACY_KEY = "nexa_center_me_v1";
const TTL_MS = 300_000;

export type CenterBootstrap = {
  at: number;
  me: Record<string, unknown>;
  staffPrenom: string;
  centerId: string;
  userId: string;
};

let inflight: Promise<CenterBootstrap | null> | null = null;

function readRaw(): CenterBootstrap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CenterBootstrap;
    if (!entry?.me || !entry.centerId || Date.now() - entry.at > TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeBootstrap(entry: CenterBootstrap) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  sessionStorage.removeItem(LEGACY_KEY);
}

export function peekCenterBootstrap(): CenterBootstrap | null {
  return readRaw();
}

export function getCenterMeCache(): Record<string, unknown> | null {
  return peekCenterBootstrap()?.me ?? null;
}

export function setCenterMeCache(
  data: Record<string, unknown>,
  extras?: Partial<Pick<CenterBootstrap, "staffPrenom" | "centerId" | "userId">>,
) {
  const existing = readRaw();
  const center = data.center as { id?: string } | null | undefined;
  writeBootstrap({
    at: Date.now(),
    me: data,
    staffPrenom: extras?.staffPrenom ?? existing?.staffPrenom ?? "Directeur",
    centerId: extras?.centerId ?? existing?.centerId ?? center?.id ?? "",
    userId: extras?.userId ?? existing?.userId ?? "",
  });
}

export function clearCenterMeCache() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CACHE_KEY);
  sessionStorage.removeItem(LEGACY_KEY);
  inflight = null;
}

export async function loadCenterBootstrap(options?: { force?: boolean }): Promise<CenterBootstrap | null> {
  if (!options?.force) {
    const cached = peekCenterBootstrap();
    if (cached) return cached;
    if (inflight) return inflight;
  }

  inflight = (async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError && isRefreshTokenError(sessionError.message)) {
      await clearStaleAuthSession();
      clearCenterMeCache();
      return null;
    }

    if (!session) {
      clearCenterMeCache();
      return null;
    }

    const [profileRes, meRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("prenom, nom, center_id")
        .eq("id", session.user.id)
        .single(),
      fetch("/api/center/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
    ]);

    if (!profileRes.data?.center_id || !meRes.ok) {
      return null;
    }

    const me = (await meRes.json()) as Record<string, unknown>;
    const bootstrap: CenterBootstrap = {
      at: Date.now(),
      me,
      staffPrenom:
        [profileRes.data.prenom, profileRes.data.nom].filter(Boolean).join(" ").trim()
        || profileRes.data.prenom
        || "Directeur",
      centerId: profileRes.data.center_id,
      userId: session.user.id,
    };
    writeBootstrap(bootstrap);
    return bootstrap;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
