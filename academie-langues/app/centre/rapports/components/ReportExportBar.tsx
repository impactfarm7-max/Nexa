"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { ORANGE } from "@/app/centre/dashboard/dashboard-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

type Props = {
  onCsv: () => void;
  onPdf?: () => void | Promise<void>;
  pdfLoading?: boolean;
  csvLabel?: string;
};

export default function ReportExportBar({
  onCsv,
  onPdf,
  pdfLoading = false,
  csvLabel,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onCsv}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[11px] font-black uppercase tracking-wide text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-px transition-all"
        style={{ backgroundColor: ORANGE }}
      >
        <Download size={14} />
        {csvLabel || t("centre", "reportsExportCsv")}
      </button>
      {onPdf && (
        <button
          type="button"
          onClick={() => void onPdf()}
          disabled={pdfLoading}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[11px] font-black uppercase tracking-wide border border-[#11224E]/20 bg-white text-[#11224E] hover:bg-[#11224E]/5 transition-all disabled:opacity-60"
        >
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {t("centre", "reportsExportPdf")}
        </button>
      )}
    </div>
  );
}
