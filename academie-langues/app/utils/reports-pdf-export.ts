import type { DocumentExportConfig } from "@/app/utils/documentConfig";
import { hexToRgb } from "@/app/utils/documentConfig";

const BLUE_RGB: [number, number, number] = [17, 34, 78];
const ORANGE_RGB: [number, number, number] = [235, 103, 14];

type PdfLocale = "fr" | "en";

function rtl(locale: PdfLocale, fr: string, en: string) {
  return locale === "en" ? en : fr;
}

function resolveConfig(
  config: Partial<DocumentExportConfig> | undefined,
  locale: PdfLocale,
): DocumentExportConfig {
  const accentRgb = config?.accentRgb || (config?.accentColor ? hexToRgb(config.accentColor) : ORANGE_RGB);
  return {
    title: config?.title || rtl(locale, "Rapport", "Report"),
    accentColor: config?.accentColor || "#eb670e",
    accentRgb,
    blueRgb: config?.blueRgb || BLUE_RGB,
    showLogo: config?.showLogo ?? true,
    showRccm: config?.showRccm ?? true,
    showNiu: config?.showNiu ?? true,
    showAddress: config?.showAddress ?? true,
    showPhone: config?.showPhone ?? true,
    footerText: config?.footerText ?? null,
    signatureIds: config?.signatureIds || [],
    legalName: config?.legalName ?? null,
    logoUrl: config?.logoUrl ?? null,
    rccmNumber: config?.rccmNumber ?? null,
    niuNumber: config?.niuNumber ?? null,
    address: config?.address ?? null,
    phone: config?.phone ?? null,
  };
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    return await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function addPdfLogo(doc: any, logoUrl: string | null, x: number, y: number, size = 14) {
  if (!logoUrl) return;
  const dataUrl = await loadImageDataUrl(logoUrl);
  if (!dataUrl) return;
  const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
  doc.addImage(dataUrl, format, x, y, size, size);
}

async function createReportDoc(
  title: string,
  periodLabel: string | undefined,
  config: Partial<DocumentExportConfig> | undefined,
  locale: PdfLocale,
) {
  const cfg = resolveConfig({ ...config, title: config?.title || title }, locale);
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";

  let headerX = 14;
  if (cfg.showLogo && cfg.logoUrl) {
    await addPdfLogo(doc, cfg.logoUrl, 14, 12, 14);
    headerX = 32;
  }

  doc.setTextColor(...cfg.blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(cfg.legalName || rtl(locale, "Centre", "Center"), headerX, 18);

  doc.setTextColor(...cfg.accentRgb);
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), headerX, 24);

  const metaLines: string[] = [];
  if (periodLabel) {
    metaLines.push(`${rtl(locale, "Période", "Period")} : ${periodLabel}`);
  }
  if (cfg.showAddress && cfg.address) metaLines.push(cfg.address);
  if (cfg.showPhone && cfg.phone) {
    metaLines.push(`${rtl(locale, "Tél", "Phone")} : ${cfg.phone}`);
  }
  if (cfg.showRccm && cfg.rccmNumber) metaLines.push(`RCCM : ${cfg.rccmNumber}`);
  if (cfg.showNiu && cfg.niuNumber) metaLines.push(`NIU : ${cfg.niuNumber}`);
  metaLines.push(
    `${rtl(locale, "Généré le", "Generated on")} ${new Date().toLocaleString(dateLocale)}`,
  );

  let metaY = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  for (const line of metaLines) {
    doc.text(line, pageWidth - 14, metaY, { align: "right" });
    metaY += 4;
  }

  const ruleY = Math.max(30, metaY + 2);
  doc.setDrawColor(...cfg.accentRgb);
  doc.setLineWidth(0.6);
  doc.line(14, ruleY, pageWidth - 14, ruleY);

  return { doc, autoTable, startY: ruleY + 10, cfg };
}

function addPdfFooter(doc: any, cfg: DocumentExportConfig) {
  if (!cfg.footerText) return;
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(cfg.footerText, 14, pageHeight - 10, { maxWidth: 180 });
}

export type ReportPdfSection = {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
};

export type ReportPdfOptions = {
  title: string;
  periodLabel?: string;
  kpis?: { label: string; value: string }[];
  sections: ReportPdfSection[];
  filename: string;
  config?: Partial<DocumentExportConfig>;
  locale?: PdfLocale;
};

export async function exportReportPdf(opts: ReportPdfOptions) {
  const locale: PdfLocale = opts.locale === "en" ? "en" : "fr";
  const { doc, autoTable, startY, cfg } = await createReportDoc(
    opts.title,
    opts.periodLabel,
    opts.config,
    locale,
  );

  let y = startY;

  if (opts.kpis?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...cfg.blueRgb);
    doc.text(rtl(locale, "Indicateurs clés", "Key indicators"), 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    for (const kpi of opts.kpis) {
      doc.text(`${kpi.label} : ${kpi.value}`, 14, y);
      y += 4;
    }
    y += 4;
  }

  for (const section of opts.sections) {
    if (section.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...cfg.blueRgb);
      doc.text(section.title, 14, y);
      y += 4;
    }

    autoTable(doc, {
      startY: y,
      head: [section.columns],
      body: section.rows.map((r) => r.map(String)),
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  addPdfFooter(doc, cfg);
  doc.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
}
