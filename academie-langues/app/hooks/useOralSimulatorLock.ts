"use client";

import { useEffect, useState } from "react";
import {
  getOralSimulatorCountdown,
  isOralSimulatorLocked,
  type OralSimulatorCountdown,
} from "@/app/config/simulateur-oral-lock";

export function useOralSimulatorLock() {
  const [locked, setLocked] = useState(() => isOralSimulatorLocked());
  const [countdown, setCountdown] = useState<OralSimulatorCountdown | null>(() =>
    getOralSimulatorCountdown(),
  );

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setLocked(isOralSimulatorLocked(now));
      setCountdown(getOralSimulatorCountdown(now));
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return { locked, countdown };
}
