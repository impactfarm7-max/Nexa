"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import LiveKitMeeting from "@/app/components/LiveKitMeeting";
import { ArrowLeft, Lock, Video } from "lucide-react";
import CoachingTimer from "@/app/components/CoachingTimer";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { peekStudentAccess } from "@/app/utils/student-access-cache";
import { resolveMeetingExitPath } from "@/app/utils/student-routes";
import { useI18n } from "@/app/i18n/I18nProvider";

type State = "loading" | "ready" | "error";

export default function CoachingRoomPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const sessionId = String(params?.id || "");

  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [room, setRoom] = useState<{ url: string; token: string; endsAt: number } | null>(null);
  const [exitHref, setExitHref] = useState(() =>
    resolveMeetingExitPath("individual", peekStudentAccess()?.profile)
  );

  const leave = useCallback(() => {
    router.replace(exitHref);
  }, [router, exitHref]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, center_id")
        .eq("id", session.user.id)
        .maybeSingle();
      setExitHref(resolveMeetingExitPath("individual", profile));

      const res = await fetch("/api/coaching/room-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: sessionId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(json.error || t("dashboard", "coachingRoomJoinError"));
        setState("error");
        return;
      }

      setRoom({ url: json.url, token: json.token, endsAt: json.endsAt });
      setState("ready");
    };

    init();
  }, [router, sessionId]);

  // Coupure automatique à la fin de la séance (+30 min)
  useEffect(() => {
    if (state !== "ready" || !room) return;
    const remaining = room.endsAt - Date.now();
    if (remaining <= 0) {
      leave();
      return;
    }
    const timer = setTimeout(leave, remaining);
    return () => clearTimeout(timer);
  }, [state, room, leave]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (state === "ready" && room) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="flex items-center gap-2">
              <Video size={16} className="text-orange-500" />
              <span className="text-sm font-bold">Coaching Live</span>
            </div>
            <CoachingTimer endsAt={room.endsAt} />
          </div>
          <button
            onClick={leave}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            {t("dashboard", "coachingRoomLeaveButton")}
          </button>
        </div>
        <div className="flex-1 min-h-0 relative">
          <LiveKitMeeting
            url={room.url}
            token={room.token}
            onClose={leave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl max-w-md w-full flex flex-col items-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6 border border-orange-100">
          <Lock className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className={`${STUDENT_TEXT.sectionTitle} mb-3`} style={{ color: BRAND.blue }}>{t("dashboard", "coachingRoomUnavailableTitle")}</h1>
        <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed">{errorMsg}</p>
        <button
          onClick={leave}
          className="w-full bg-slate-950 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={14} /> {t("dashboard", "coachingRoomBackButton")}
        </button>
      </div>
    </div>
  );
}
