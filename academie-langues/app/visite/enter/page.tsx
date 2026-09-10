"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { writeVisitMode, type VisitModeState } from "@/app/utils/visit-mode";
import { clearCenterMeCache } from "@/app/utils/center-me-cache";
import { clearStudentAccessCache } from "@/app/utils/student-access-cache";

type VisitPending = {
  token_hash: string;
  centerKind: "libre" | "tcf";
  viewAs: "center" | "student";
  centerName: string;
  next: string;
};

const VISIT_PENDING_KEY = "nexa_visit_pending";

// StrictMode (dev) monte l'effet deux fois : sans ce garde-fou au niveau module,
// le premier passage consomme le token sessionStorage avant le second passage réel.
let visitEnterConsumed = false;

export default function VisitEnterPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visitEnterConsumed) return;
    visitEnterConsumed = true;
    let cancelled = false;

    const run = async () => {
      let pending: VisitPending | null = null;
      try {
        const raw = sessionStorage.getItem(VISIT_PENDING_KEY);
        pending = raw ? (JSON.parse(raw) as VisitPending) : null;
      } catch {
        pending = null;
      }
      sessionStorage.removeItem(VISIT_PENDING_KEY);

      if (!pending?.token_hash) {
        setError("Session de visite introuvable ou expirée.");
        return;
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: pending.token_hash,
        type: "email",
      });

      if (cancelled) return;

      if (otpError) {
        setError(otpError.message || "Impossible d'ouvrir la visite.");
        return;
      }

      // Contourne le PIN pendant la visite (comme le view-as superadmin).
      sessionStorage.setItem("is_unlocked", "true");
      clearCenterMeCache();
      clearStudentAccessCache();

      const state: VisitModeState = {
        centerKind: pending.centerKind,
        viewAs: pending.viewAs,
        centerName: pending.centerName,
        startedAt: new Date().toISOString(),
      };
      writeVisitMode(state);

      window.location.assign(pending.next || "/");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070b14] px-4 text-center">
      {error ? (
        <>
          <p className="text-sm font-bold text-red-300">{error}</p>
          <a
            href="/"
            className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90"
          >
            Retour à l'accueil
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          <p className="mt-4 text-sm font-bold text-slate-300">Ouverture de la visite…</p>
        </>
      )}
    </div>
  );
}
