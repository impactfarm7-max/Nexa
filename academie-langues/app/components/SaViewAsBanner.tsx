"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { clearViewAs } from "@/app/utils/view-as";
import { clearCenterMeCache } from "@/app/utils/center-me-cache";
import { clearStudentAccessCache } from "@/app/utils/student-access-cache";
import {
  SA_VIEW_AS_EVENT,
  clearSaViewAs,
  readSaViewAs,
  takeSaReturnSession,
  type SaViewAsState,
} from "@/app/utils/sa-view-as";

function modeLabel(mode: SaViewAsState["mode"]) {
  if (mode === "center") return "Centre";
  if (mode === "staff") return "Staff";
  return "Étudiant";
}

export default function SaViewAsBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<SaViewAsState | null>(null);
  const [exiting, setExiting] = useState(false);

  const sync = useCallback(() => setState(readSaViewAs()), []);

  useEffect(() => {
    sync();
    window.addEventListener(SA_VIEW_AS_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(SA_VIEW_AS_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  if (!state) return null;
  if (pathname?.startsWith("/superadmin") || pathname?.startsWith("/login") || pathname?.startsWith("/view-as")) {
    return null;
  }

  const exit = async () => {
    setExiting(true);
    const returnTo = state.centerId
      ? `/superadmin/centres?focus=${encodeURIComponent(state.centerId)}`
      : "/superadmin/dashboard";
    const saved = takeSaReturnSession();
    clearViewAs();
    clearSaViewAs();
    clearCenterMeCache();
    clearStudentAccessCache();

    if (saved) {
      const { error } = await supabase.auth.setSession({
        access_token: saved.access_token,
        refresh_token: saved.refresh_token,
      });
      if (!error) {
        window.location.assign(returnTo);
        return;
      }
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    window.location.assign(`/login?next=${encodeURIComponent(returnTo)}`);
  };

  return (
    <>
      <div className="h-10 shrink-0 sm:h-11" aria-hidden />
      <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500 px-3 py-2 text-black shadow-lg sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <p className="truncate text-xs font-bold sm:text-sm">
            Aperçu support · {modeLabel(state.mode)} · {state.centerName}
            {state.targetLabel ? ` · ${state.targetLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={exiting}
          onClick={() => void exit()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-black/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide hover:bg-black/25 disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
          Quitter
        </button>
      </div>
    </>
  );
}
