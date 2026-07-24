"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import LiveKitMeeting from "@/app/components/LiveKitMeeting";
import CoachingTimer from "@/app/components/CoachingTimer";
import { ArrowLeft, Lock, Video } from "lucide-react";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { peekStudentAccess } from "@/app/utils/student-access-cache";
import { resolveMeetingExitPath } from "@/app/utils/student-routes";

type State = "loading" | "ready" | "error";
type MeetingKind = "live" | "group";

export default function TcfCollectiveRoomPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slotId = String(params?.slotId || "");
  const sessionDate = searchParams.get("date") || "";

  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [title, setTitle] = useState("Séance");
  const [room, setRoom] = useState<{ url: string; token: string; endsAt: number } | null>(null);
  const [exitHref, setExitHref] = useState(() =>
    resolveMeetingExitPath("group", peekStudentAccess()?.profile)
  );

  const leave = useCallback(() => {
    router.replace(exitHref);
  }, [router, exitHref]);

  useEffect(() => {
    const init = async () => {
      if (!slotId || !sessionDate) {
        setErrorMsg("Lien de séance invalide.");
        setState("error");
        return;
      }

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

      const res = await fetch("/api/coaching/collective-room-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slot_id: slotId, session_date: sessionDate }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(json.error || "Impossible de rejoindre la séance.");
        setState("error");
        // Best-effort exit destination from scope if known
        const kind: MeetingKind = json.meeting_kind === "live" ? "live" : "group";
        setExitHref(resolveMeetingExitPath(kind, profile));
        return;
      }

      const kind: MeetingKind = json.meeting_kind === "live" ? "live" : "group";
      setExitHref(resolveMeetingExitPath(kind, profile));
      setTitle(json.title || (kind === "live" ? "Session Live" : "Coaching de groupe"));
      setRoom({ url: json.url, token: json.token, endsAt: json.endsAt });
      setState("ready");
    };

    init();
  }, [router, slotId, sessionDate]);

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
              <span className="text-sm font-bold">{title}</span>
            </div>
            <CoachingTimer endsAt={room.endsAt} />
          </div>
          <button
            onClick={leave}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Quitter
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
      <div className="bg-white p-10 rounded-[2rem] border border-orange-200 shadow-xl max-w-md w-full flex flex-col items-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6 border border-orange-100">
          <Lock className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className={`${STUDENT_TEXT.sectionTitle} mb-3`} style={{ color: BRAND.blue }}>Séance indisponible</h1>
        <p className={`${STUDENT_TEXT.subtitle} mb-8 leading-relaxed`}>{errorMsg}</p>
        <button
          onClick={leave}
          className="w-full text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          style={{ backgroundColor: BRAND.blue }}
        >
          <ArrowLeft size={14} /> Retour
        </button>
      </div>
    </div>
  );
}
