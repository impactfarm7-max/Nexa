"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { defaultReportPeriodRange } from "@/app/utils/reports-period";
import { fetchReportsBundle, peekReportsBundle } from "./hooks/reports-bundle-client";

function ReportsPrefetcher() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const defaults = defaultReportPeriodRange();
    const from = searchParams.get("from") || defaults.from;
    const to = searchParams.get("to") || defaults.to;
    const campusId = searchParams.get("campusId") || "";
    const filiereId = searchParams.get("filiereId") || "";

    const params: Record<string, string> = { preset: "custom", from, to };
    if (campusId) params.campusId = campusId;
    if (filiereId) params.filiereId = filiereId;

    if (peekReportsBundle(params)) return;

    void (async () => {
      const bootstrap = peekCenterBootstrap() || (await loadCenterBootstrap());
      if (!bootstrap) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      void fetchReportsBundle(session.access_token, params).catch(() => {
        /* page hook gère l'erreur */
      });
    })();
  }, [searchParams]);

  return null;
}

export default function RapportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <ReportsPrefetcher />
      </Suspense>
      {children}
    </>
  );
}
