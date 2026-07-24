"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessCenterPath, isCenterStaff } from "@/app/utils/student-routes";
import {
  loadCenterBootstrap,
  peekCenterBootstrap,
} from "@/app/utils/center-me-cache";
import { prefetchCenterPagesFireAndForget } from "@/app/utils/center-prefetch";
import { isCenterOperational } from "@/app/utils/center-trial";
import CenterAppShell from "@/app/components/CenterAppShell";
import CenterRouteSkeleton from "@/app/components/CenterRouteSkeleton";

const CENTER_UNAVAILABLE_PATH = "/centre/acces-indisponible";

const ONBOARDING_FREE_PATHS = [
  "/centre/onboarding",
  "/centre/parametres/entreprise",
  "/centre/tcf/programme",
  "/centre/setup-done",
];

type AccessDecision = { ok: true } | { ok: false; redirect: string };

function evaluateCenterAccess(
  json: Record<string, unknown>,
  pathname: string | null,
): AccessDecision {
  const role = json.role as string | null;
  const permissions = (json.permissions || []) as string[];
  const onboardingStep = json.onboarding_step as string | null;
  const center = json.center as { id?: string; name?: string; status?: string; created_at?: string } | null;

  if (!role || (!isCenterStaff({ role, center_id: center?.id }) && role !== "manager")) {
    return { ok: false, redirect: "/dashboard" };
  }

  if (center && !isCenterOperational(center)) {
    return { ok: false, redirect: CENTER_UNAVAILABLE_PATH };
  }

  const isOnboardingPath = ONBOARDING_FREE_PATHS.some((p) => pathname?.startsWith(p));
  // L'onboarding centre (entreprise / setup) concerne uniquement le compte PDG.
  // Formateurs, staff et campus managers ne doivent jamais être bloqués ici.
  const mustCompleteCenterOnboarding =
    role === "center_manager" || role === "manager" || role === "admin";
  if (
    mustCompleteCenterOnboarding &&
    !isOnboardingPath &&
    onboardingStep &&
    onboardingStep !== "completed"
  ) {
    return { ok: false, redirect: "/centre/onboarding" };
  }

  const accessRole = role === "manager" ? "center_manager" : role;
  if (pathname && !canAccessCenterPath(pathname, accessRole, permissions)) {
    return { ok: false, redirect: "/centre/dashboard" };
  }

  return { ok: true };
}

type CenterAccessGateProps = {
  children: React.ReactNode;
  useShell?: boolean;
};

export default function CenterAccessGate({
  children,
  useShell = true,
}: CenterAccessGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const cached = peekCenterBootstrap();
    if (cached && evaluateCenterAccess(cached.me, pathname).ok) {
      setReady(true);
      prefetchCenterPagesFireAndForget(cached);
    }
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const bootstrap = await loadCenterBootstrap();
      if (!bootstrap) {
        router.replace("/login");
        return;
      }

      const decision = evaluateCenterAccess(bootstrap.me, pathname);
      if (!decision.ok) {
        router.replace(decision.redirect);
        return;
      }

      if (!cancelled) {
        prefetchCenterPagesFireAndForget(bootstrap);
        setReady(true);
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!useShell) {
    if (!ready) {
      return <CenterRouteSkeleton mode="center" />;
    }
    return <>{children}</>;
  }

  return (
    <CenterAppShell>
      {ready ? children : <CenterRouteSkeleton mode="center" contentOnly />}
    </CenterAppShell>
  );
}
