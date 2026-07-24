"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { fetchDocumentExportConfig } from "@/app/utils/documentConfig";
import { exportReportPdf, type ReportPdfOptions } from "@/app/utils/reports-pdf-export";

export function useReportPdfExport(centerId: string | null) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const exportPdf = useCallback(
    async (opts: Omit<ReportPdfOptions, "config">) => {
      if (!centerId) return;
      setPdfLoading(true);
      try {
        const cfg = await fetchDocumentExportConfig(supabase, centerId);
        await exportReportPdf({ ...opts, config: { ...cfg, title: opts.title } });
      } finally {
        setPdfLoading(false);
      }
    },
    [centerId],
  );

  return { exportPdf, pdfLoading };
}
