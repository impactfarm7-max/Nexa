"use client";

import { useEffect, useState } from "react";
import {
  getGlobalTutorLockState,
  getTutorUnlockState,
  type TutorLockState,
} from "@/app/utils/tutor-unlock";

function pickLock(globalLock: TutorLockState, personalLock: TutorLockState): TutorLockState {
  if (!globalLock.locked && !personalLock.locked) return globalLock;
  if (globalLock.locked && !personalLock.locked) return globalLock;
  if (!globalLock.locked && personalLock.locked) return personalLock;
  const g = globalLock.unlockAt ? new Date(globalLock.unlockAt).getTime() : 0;
  const p = personalLock.unlockAt ? new Date(personalLock.unlockAt).getTime() : 0;
  return g >= p ? globalLock : personalLock;
}

/** Verrou tuteur : date globale (env) et/ou tutor_unlock_at profil. */
export function useTutorGlobalLock(bypass = false, personalUnlockAt?: string | null): TutorLockState {
  const [state, setState] = useState<TutorLockState>(() => {
    if (bypass) return getGlobalTutorLockState(true);
    return pickLock(getGlobalTutorLockState(false), getTutorUnlockState(personalUnlockAt));
  });

  useEffect(() => {
    const compute = () => {
      if (bypass) {
        setState(getGlobalTutorLockState(true));
        return;
      }
      setState(pickLock(getGlobalTutorLockState(false), getTutorUnlockState(personalUnlockAt)));
    };

    compute();
    if (bypass) return;

    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [bypass, personalUnlockAt]);

  return state;
}
