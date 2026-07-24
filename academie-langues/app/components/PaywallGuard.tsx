"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import {
  evaluatePaywallAccess,
  isPasswordRecoveryBypass,
  loadStudentAccess,
  peekStudentAccess,
} from "@/app/utils/student-access-cache";
import { isCenterStaff } from "@/app/utils/student-routes";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";

function isStaffLiveRoomPath(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/tcf-canada/live/room") ||
    pathname.startsWith("/dashboard/coaching/room")
  );
}

export default function PaywallGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useLayoutEffect(() => {
    if (isPasswordRecoveryBypass()) {
      setIsAuthorized(true);
      setChecking(false);
      return;
    }

    // Formateur / staff : accès direct aux salles coaching/live
    if (isStaffLiveRoomPath(pathname)) {
      const cached = peekStudentAccess();
      if (cached && isCenterStaff(cached.profile)) {
        setIsAuthorized(true);
        setChecking(false);
        return;
      }
    }

    const cached = peekStudentAccess();
    if (cached && evaluatePaywallAccess(cached.profile).allowed) {
      setIsAuthorized(true);
      setChecking(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (isPasswordRecoveryBypass()) {
      return;
    }

    let cancelled = false;

    (async () => {
      // Staff sur salle live : autoriser sans paywall étudiant
      if (isStaffLiveRoomPath(pathname)) {
        const access = await loadStudentAccess();
        if (cancelled) return;
        if (access && isCenterStaff(access.profile)) {
          setIsAuthorized(true);
          setChecking(false);
          return;
        }
      }

      const cached = peekStudentAccess();
      if (cached && evaluatePaywallAccess(cached.profile).allowed) {
        setIsAuthorized(true);
        setChecking(false);
        return;
      }

      const access = await loadStudentAccess();
      if (cancelled) return;

      if (!access) {
        router.replace("/login");
        return;
      }

      if (isStaffLiveRoomPath(pathname) && isCenterStaff(access.profile)) {
        setIsAuthorized(true);
        setChecking(false);
        return;
      }

      const decision = evaluatePaywallAccess(access.profile);
      if (!decision.allowed) {
        if (decision.signOut) {
          await supabase.auth.signOut();
        }
        router.replace(decision.redirect);
        return;
      }

      setIsAuthorized(true);
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (checking && !isAuthorized) {
    return <StudentRouteSkeleton contentOnly variant="dashboard" />;
  }

  if (!isAuthorized) {
    return <StudentRouteSkeleton contentOnly variant="dashboard" />;
  }

  return <>{children}</>;
}
