"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";

/** Chemins TCF interdits aux étudiants de centres pluri-annuels (generic). */
function isTcfSimulatorPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/tcf-canada/cours")) return false;
  if (pathname.startsWith("/tcf-canada/missions")) return false;
  if (pathname.startsWith("/tcf-canada/simulateur")) return true;
  if (pathname.startsWith("/tcf-canada/comprehension")) return true;
  if (pathname.startsWith("/tcf-canada/expression-ecrite")) return true;
  if (pathname.startsWith("/tcf-canada/expression-orale")) return true;
  if (pathname === "/bibliotheque" || pathname.startsWith("/bibliotheque/")) return true;
  return false;
}

export default function PluriannualStudentRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isPluriannual } = useStudentCenterContext();

  useEffect(() => {
    if (loading || !isPluriannual || !pathname) return;
    if (isTcfSimulatorPath(pathname)) {
      router.replace("/tcf-canada/cours?tab=centre");
    }
  }, [loading, isPluriannual, pathname, router]);

  if (!loading && isPluriannual && pathname && isTcfSimulatorPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
