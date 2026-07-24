"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function CoachingTimer({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  // 3 paliers : normal > 15 min, orange <= 15 min, rouge <= 5 min (urgent).
  const urgent = remainingMs <= 5 * 60 * 1000;
  const warning = !urgent && remainingMs <= 15 * 60 * 1000;

  const boxClass = urgent
    ? "bg-red-500/20 text-red-300"
    : warning
    ? "bg-orange-500/20 text-orange-300"
    : "bg-slate-800 text-slate-200";
  const iconClass = urgent ? "text-red-300" : warning ? "text-orange-300" : "text-orange-500";

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums ${boxClass} ${
        urgent ? "animate-pulse" : ""
      }`}
      aria-label="Temps restant"
    >
      <Clock size={14} className={iconClass} />
      {mm}:{ss}
    </div>
  );
}
