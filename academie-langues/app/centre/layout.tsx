"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import CenterAccessGate from "@/app/components/CenterAccessGate";

const PUBLIC_CENTER_PATHS = [
  "/centre/login",
  "/centre/onboarding",
  "/centre/setup-done",
  "/centre/acces-indisponible",
];
/** Pages plein écran sans sidebar centre */
const NO_SHELL_PATHS = ["/centre/mon-compte"];

function CentreLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublic =
    PUBLIC_CENTER_PATHS.some((p) => pathname === p || pathname?.startsWith(p)) ||
    pathname?.startsWith("/centre/student");
  // L'assistant de configuration initiale (?setup=1) est plein écran, sans
  // sidebar — même hors-liste NO_SHELL_PATHS, car cette route sert aussi
  // aux réglages normaux (sidebar visible) en dehors de ce paramètre.
  const isSetupWizard = searchParams.get("setup") === "1";
  const useShell =
    !isSetupWizard &&
    !NO_SHELL_PATHS.some((p) => pathname === p || pathname?.startsWith(p));

  if (isPublic) return <>{children}</>;

  return <CenterAccessGate useShell={useShell}>{children}</CenterAccessGate>;
}

export default function CentreLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <CentreLayoutInner>{children}</CentreLayoutInner>
    </Suspense>
  );
}
