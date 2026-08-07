"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { fetchDocumentExportConfig } from "@/app/utils/documentConfig";
import { exportReportPdf, type ReportPdfOptions } from "@/app/utils/reports-pdf-export";
import { useI18n } from "@/app/i18n/I18nProvider";

export function useReportPdfExport(centerId: string | null) {
  const { locale } = useI18n();
  const [pdfLoading, setPdfLoading] = useState(false);

  const exportPdf = useCallback(
    async (opts: Omit<ReportPdfOptions, "config" | "locale">) => {
      if (!centerId) return;
      setPdfLoading(true);
      try {
        const cfg = await fetchDocumentExportConfig(supabase, centerId);
        await exportReportPdf({
          ...opts,
          locale: locale === "en" ? "en" : "fr",
          config: { ...cfg, title: opts.title },
        });
      } finally {
        setPdfLoading(false);
      }
    },
    [centerId, locale],
  );

  return { exportPdf, pdfLoading };
}
