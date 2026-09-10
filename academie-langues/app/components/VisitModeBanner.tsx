"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { clearViewAs } from "@/app/utils/view-as";
import { clearCenterMeCache } from "@/app/utils/center-me-cache";
import { clearStudentAccessCache } from "@/app/utils/student-access-cache";
import {
  VISIT_MODE_EVENT,
  clearVisitMode,
  readVisitMode,
  type VisitModeState,
} from "@/app/utils/visit-mode";

function roleLabel(viewAs: VisitModeState["viewAs"]) {
  return viewAs === "center" ? "Centre" : "Étudiant";
}

export default function VisitModeBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<VisitModeState | null>(null);
  const [exiting, setExiting] = useState(false);

  const sync = useCallback(() => setState(readVisitMode()), []);

  useEffect(() => {
    sync();
    window.addEventListener(VISIT_MODE_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(VISIT_MODE_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  if (!state) return null;
  if (pathname?.startsWith("/login") || pathname?.startsWith("/visite")) return null;

  const exit = async () => {
    setExiting(true);
    clearVisitMode();
    clearCenterMeCache();
    clearStudentAccessCache();
    clearViewAs();
    try {
      sessionStorage.removeItem("is_unlocked");
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    window.location.assign("/");
  };

  return (
    <>
      <div className="h-10 shrink-0 sm:h-11" aria-hidden />
      <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500 px-3 py-2 text-black shadow-lg sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <p className="truncate text-xs font-bold sm:text-sm">
            Visite {state.centerName} · {roleLabel(state.viewAs)} · lecture seule
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
