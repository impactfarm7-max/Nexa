"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import {
  normalizeCenterType,
  resolveStudentExperienceMode,
  type CenterTypeCode,
  type StudentExperienceMode,
} from "@/app/data/center-types";
import { peekStudentAccess, loadStudentAccess } from "@/app/utils/student-access-cache";

export type StudentCenterContext = {
  loading: boolean;
  centerId: string | null;
  centerType: CenterTypeCode | null;
  mode: StudentExperienceMode;
  isPluriannual: boolean;
  showTcfPacks: boolean;
};

/**
 * Charge le type de centre de l'étudiant connecté pour adapter nav / dashboard.
 */
export function useStudentCenterContext(): StudentCenterContext {
  const cached = peekStudentAccess();
  const [loading, setLoading] = useState(() => {
    if (!cached?.profile.center_id) return true;
    return !cached.centerType;
  });
  const [centerId, setCenterId] = useState<string | null>(
    () => cached?.profile.center_id ?? null,
  );
  const [centerType, setCenterType] = useState<CenterTypeCode | null>(() =>
    cached?.centerType ? normalizeCenterType(cached.centerType) : null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = peekStudentAccess();
      if (cached?.profile.center_id && cached.centerType) {
        if (!cancelled) {
          setCenterId(cached.profile.center_id);
          setCenterType(normalizeCenterType(cached.centerType));
          setLoading(false);
        }
        return;
      }

      const snap = await loadStudentAccess();
      if (cancelled) return;

      const cId = snap?.profile.center_id ?? null;
      setCenterId(cId);

      if (!cId) {
        setCenterType(null);
        setLoading(false);
        return;
      }

      if (snap?.centerType) {
        setCenterType(normalizeCenterType(snap.centerType));
        setLoading(false);
        return;
      }

      const { data: center } = await supabase
        .from("centers")
        .select("center_type")
        .eq("id", cId)
        .maybeSingle();

      if (!cancelled) {
        setCenterType(center?.center_type ? normalizeCenterType(center.center_type) : "generic");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const mode = resolveStudentExperienceMode(centerId, centerType);
  const isPluriannual = mode === "pluriannual";
  return {
    loading,
    centerId,
    centerType,
    mode,
    isPluriannual,
    showTcfPacks: loading ? !centerId : !isPluriannual,
  };
}
