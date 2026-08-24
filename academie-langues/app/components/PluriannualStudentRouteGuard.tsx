"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";

/** Chemins TCF interdits aux étudiants de centres pluri-annuels (generic). */
function isTcfSimulatorPath(pathname: string): boolean {
  if (!pathname) return false;
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
    if (pathname.startsWith("/tcf-canada/cours")) {
      router.replace("/cours");
      return;
    }
    if (pathname.startsWith("/tcf-canada/missions")) {
      router.replace("/missions");
      return;
    }
    if (isTcfSimulatorPath(pathname)) {
      router.replace("/cours");
    }
  }, [loading, isPluriannual, pathname, router]);

  if (
    !loading &&
    isPluriannual &&
    pathname &&
    (pathname.startsWith("/tcf-canada/cours") ||
      pathname.startsWith("/tcf-canada/missions") ||
      isTcfSimulatorPath(pathname))
  ) {
    return null;
  }

  return <>{children}</>;
}
