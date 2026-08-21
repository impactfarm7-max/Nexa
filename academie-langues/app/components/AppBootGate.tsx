"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { isCenterStaff } from "@/app/utils/student-routes";
import { isPublicAppRoute } from "@/app/utils/public-routes";
import { clearStaleAuthSession, isRefreshTokenError } from "@/app/utils/supabase-auth";
import { clearViewAs, isStudentPreviewPath, isViewAsStudentPreview } from "@/app/utils/view-as";
import { readSaViewAs } from "@/app/utils/sa-view-as";

const ONE_HOUR_MS = 60 * 60 * 1000;

function now() {
  return Date.now();
}

function readNumber(key: string, fallback: number) {
  const v = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function setNumber(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

function setString(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function getString(key: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export default function AppBootGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = useMemo(() => isPublicAppRoute(pathname), [pathname]);

  useEffect(() => {
    void clearStaleAuthSession();
  }, []);

  useEffect(() => {
    if (!pathname || isPublicRoute) return;

    const checkRevokedAccess = async () => {
      const { error: authError } = await supabase.auth.getUser();
      if (authError && isRefreshTokenError(authError.message)) {
        await clearStaleAuthSession();
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tag_status, role, center_id, subscription_paused_at")
        .eq("id", session.user.id)
        .single();

      // Staff centre : autorisé sur les salles live (groupe + individuel)
      const isLiveRoomPath =
        pathname.startsWith("/tcf-canada/live/room") ||
        pathname.startsWith("/dashboard/coaching/room");

      if (isCenterStaff(profile) && !pathname.startsWith("/centre") && !isLiveRoomPath) {
        if (!(isViewAsStudentPreview() && isStudentPreviewPath(pathname))) {
          router.replace("/centre/dashboard");
          return;
        }
      }

      if (profile?.role !== "admin" && profile?.tag_status === "revoque") {
        router.replace("/revoque");
        return;
      }

      if (profile?.role !== "admin" && profile?.subscription_paused_at) {
        router.replace("/pause");
        return;
      }

      if (profile?.role !== "admin" && profile?.tag_status === "termine") {
        router.replace("/termine");
      }
    };

    checkRevokedAccess();
  }, [router, pathname, isPublicRoute]);

  // Met à jour last_seen_at dans la DB (max 1 fois par heure)
  // getSession() lit depuis localStorage sans acquérir le verrou navigator
  useEffect(() => {
    if (isPublicRoute) return;
    const LS_KEY = "iag_last_seen_sync";
    const ONE_HOUR = 60 * 60 * 1000;
    const lastSync = parseInt(localStorage.getItem(LS_KEY) || "0", 10);
    if (Date.now() - lastSync < ONE_HOUR) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", session.user.id)
        .then(() => localStorage.setItem(LS_KEY, String(Date.now())));
    });
  }, [isPublicRoute]);

  // Quand le refresh token Supabase est invalide/expiré → nettoyer et rediriger
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        localStorage.removeItem("iag_last_active");
        localStorage.removeItem("session_token");
        clearViewAs();
        if (!isPublicAppRoute(window.location.pathname)) {
          router.replace("/login");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // throttle update "last_active" pour éviter spam localStorage
  const lastWriteRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const markActive = () => {
      const t = now();
      // écrit max toutes les 20s
      if (t - lastWriteRef.current < 20000) return;
      lastWriteRef.current = t;
      setNumber("iag_last_active", t);
    };

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
      "mousemove",
    ];

    events.forEach((ev) => window.addEventListener(ev, markActive, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === "visible") markActive();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (!getString("iag_last_active")) setNumber("iag_last_active", now());

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActive as any));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;

    if (isPublicRoute) return;

    // Aperçu superadmin (« vue en tant que ») : pas de session_token/PIN pour
    // l'identité impersonnée — ce contrôle déclencherait un signOut à tort.
    if (readSaViewAs()) return;

    // si pas de PIN hash local, on ne lock pas ici (onboarding gère)
    const pinHash = getString("iag_pin_hash");
    if (!pinHash) return;

    const checkAndLock = async () => {
      const lastActive = readNumber("iag_last_active", now());
      const inactiveMs = now() - lastActive;

      // ✅ Check inactivity (1 hour)
      if (inactiveMs >= ONE_HOUR_MS) {
        setString("iag_locked", "1");
        setString("iag_pin_next", pathname);
        router.replace("/pin");
        return;
      }

      // ✅ Also validate that session token still exists (fallback if PinGuard check fails)
      const token = getString("session_token");
      if (token) {
        try {
          const res = await fetch("/api/sessions/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();

          if (!data.valid) {
            // Session was deleted → logout (but preserve offline queue)
            await supabase.auth.signOut({ scope: "local" });
            localStorage.removeItem("iag_last_active");
            localStorage.removeItem("session_token");
            sessionStorage.clear();
            router.replace("/login");
          }
        } catch (error) {
          // Network error - don't force logout, let PinGuard handle it
          console.warn("Session validation network error:", error);
        }
      }
    };

    checkAndLock();
    const interval = window.setInterval(checkAndLock, 30000); // toutes les 30s

    return () => window.clearInterval(interval);
  }, [router, pathname, isPublicRoute]);

  return <>{children}</>;
}
