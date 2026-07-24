import { supabase } from "@/app/utils/supabase";
import { fetchCenterApi } from "@/app/utils/center-api-client";
import type { CenterBootstrap } from "@/app/utils/center-me-cache";

function mayLoad(role: string | null, permissions: string[], module: string): boolean {
  if (!role) return false;
  if (role === "admin" || role === "center_manager" || role === "campus_manager" || role === "manager") {
    return true;
  }
  if (module === "dashboard") {
    return role === "staff" || role === "trainer";
  }
  return permissions.includes(module);
}

let inflight: Promise<void> | null = null;
let inflightKey = "";

/** Précharge dashboard, apprenants, finance (cache 45s) dès l'accès centre. */
export async function prefetchCenterPages(bootstrap: CenterBootstrap): Promise<void> {
  const role = bootstrap.me.role as string | null;
  const permissions = (bootstrap.me.permissions as string[] | undefined) || [];
  const key = `${bootstrap.centerId}:${role}:${permissions.join(",")}`;
  if (inflight && inflightKey === key) return inflight;

  inflightKey = key;
  inflight = (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const token = session.access_token;
    const tasks: Promise<unknown>[] = [];

    if (mayLoad(role, permissions, "dashboard")) {
      tasks.push(
        fetchCenterApi("/api/center/dashboard-stats", token).catch(() => null),
      );
    }
    if (mayLoad(role, permissions, "etudiants")) {
      tasks.push(
        fetchCenterApi("/api/center/enrollments-list", token).catch(() => null),
      );
    }
    if (mayLoad(role, permissions, "finance")) {
      tasks.push(
        fetchCenterApi("/api/center/finance-ledger", token).catch(() => null),
      );
    }
    if (mayLoad(role, permissions, "staff")) {
      tasks.push(
        fetch("/api/staff", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }).catch(() => null),
      );
    }

    await Promise.all(tasks);
  })();

  try {
    await inflight;
  } finally {
    inflight = null;
  }
}

export function prefetchCenterPagesFireAndForget(bootstrap: CenterBootstrap): void {
  void prefetchCenterPages(bootstrap).catch(() => {
    /* les pages rechargent en cas d'échec */
  });
}
