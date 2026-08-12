"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { writeViewAs, clearViewAs } from "@/app/utils/view-as";
import { clearCenterMeCache } from "@/app/utils/center-me-cache";
import { clearStudentAccessCache } from "@/app/utils/student-access-cache";
import {
  SA_VIEW_AS_PENDING_KEY,
  saveSaReturnSession,
  writeSaViewAs,
  type SaViewAsPending,
} from "@/app/utils/sa-view-as";

export default function ViewAsEnterPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let pending: SaViewAsPending | null = null;
      try {
        const raw = sessionStorage.getItem(SA_VIEW_AS_PENDING_KEY);
        pending = raw ? (JSON.parse(raw) as SaViewAsPending) : null;
      } catch {
        pending = null;
      }
      sessionStorage.removeItem(SA_VIEW_AS_PENDING_KEY);

      if (!pending?.token_hash) {
        setError("Session d'aperçu introuvable ou expirée.");
        return;
      }

      // Garde la session superadmin pour « Quitter » → retour dashboard.
      const { data: current } = await supabase.auth.getSession();
      if (current.session?.access_token && current.session.refresh_token) {
        saveSaReturnSession({
          access_token: current.session.access_token,
          refresh_token: current.session.refresh_token,
        });
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: pending.token_hash,
        type: "email",
      });

      if (cancelled) return;

      if (otpError) {
        setError(otpError.message || "Impossible d'ouvrir la session d'aperçu.");
        return;
      }

      // Contourne le PIN pendant l'aperçu support.
      sessionStorage.setItem("is_unlocked", "true");
      clearCenterMeCache();
      clearStudentAccessCache();
      clearViewAs();
      if (pending.forceViewAs === "staff") {
        writeViewAs("staff");
      }

      writeSaViewAs({
        centerId: pending.centerId,
        centerName: pending.centerName,
        centerType: pending.centerType,
        mode: pending.mode,
        targetLabel: pending.targetLabel,
        targetEmail: pending.targetEmail,
        startedAt: new Date().toISOString(),
      });

      window.location.assign(pending.next || "/centre/dashboard");
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
            href="/superadmin/dashboard"
            className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90"
          >
            Retour superadmin
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
          <p className="mt-4 text-sm font-bold text-slate-300">Ouverture de l&apos;aperçu…</p>
        </>
      )}
    </div>
  );
}
