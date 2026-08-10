"use client";

import { usePathname } from "next/navigation";
import CenterAccessGate from "@/app/components/CenterAccessGate";

const PUBLIC_CENTER_PATHS = [
  "/centre/login",
  "/centre/onboarding",
  "/centre/setup-done",
  "/centre/acces-indisponible",
];
/** Pages plein écran sans sidebar centre */
const NO_SHELL_PATHS = ["/centre/mon-compte"];

export default function CentreLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic =
    PUBLIC_CENTER_PATHS.some((p) => pathname === p || pathname?.startsWith(p)) ||
    pathname?.startsWith("/centre/student");
  const useShell = !NO_SHELL_PATHS.some((p) => pathname === p || pathname?.startsWith(p));

  if (isPublic) return <>{children}</>;

  return <CenterAccessGate useShell={useShell}>{children}</CenterAccessGate>;
}
