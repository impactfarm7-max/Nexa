"use client";

import { jsPDF } from "jspdf";
import { supabase } from "@/app/utils/supabase";

export type LessonDownloadErrorCode =
  | "EXTERNAL_LINK"
  | "LOGIN_REQUIRED"
  | "DOWNLOAD_FAILED"
  | "IMPOSSIBLE";

export type LessonPdfLabels = {
  eyebrow: string;
  titleFallback: string;
  emptyBody: string;
  orgFallback: string;
};

function stripHtmlToText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  div.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  div.querySelectorAll("p, div, li, h1, h2, h3, h4, blockquote").forEach((el) => {
    el.appendChild(document.createTextNode("\n\n"));
  });
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function safeFilename(name: string) {
  return name.replace(/[^\w.\-À-ÿ ]+/g, "_").trim() || "fichier";
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** PDF du contenu texte de la leçon uniquement (sans pièces jointes). */
export async function downloadLessonContentPdf(opts: {
  title: string;
  subtitle?: string | null;
  htmlContent: string;
  /** Nom du centre / entreprise affiché en bas de page */
  orgName?: string | null;
  labels?: LessonPdfLabels;
}): Promise<{ ok: boolean; errorCode?: LessonDownloadErrorCode; error?: string }> {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginX = 56;
    const marginTop = 56;
    const marginBottom = 56;
    const contentWidth = pageWidth - marginX * 2;

    const accent = { r: 235, g: 103, b: 14 };
    const ink = { r: 28, g: 28, b: 30 };
    const muted = { r: 120, g: 120, b: 128 };
    const rule = { r: 228, g: 228, b: 232 };

    const labels = opts.labels || {
      eyebrow: "LEÇON",
      titleFallback: "Leçon",
      emptyBody: "Aucun contenu texte pour cette leçon.",
      orgFallback: "Académie",
    };
    const orgName = (opts.orgName || "").trim() || labels.orgFallback;

    let y = marginTop;
    let pageIndex = 1;

    const drawPageChrome = () => {
      doc.setFillColor(accent.r, accent.g, accent.b);
      doc.rect(0, 0, pageWidth, 2, "F");

      const footerY = pageHeight - 28;
      doc.setDrawColor(rule.r, rule.g, rule.b);
      doc.setLineWidth(0.5);
      doc.line(marginX, footerY - 12, pageWidth - marginX, footerY - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(muted.r, muted.g, muted.b);
      const footerBrand = orgName.length > 40 ? orgName.slice(0, 40) + "…" : orgName;
      doc.text(footerBrand, marginX, footerY);
      doc.text(String(pageIndex), pageWidth - marginX, footerY, { align: "right" });
    };

    const newPage = () => {
      doc.addPage();
      pageIndex += 1;
      drawPageChrome();
      y = marginTop;
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - marginBottom) newPage();
    };

    drawPageChrome();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(labels.eyebrow, marginX, y);
    y += 26;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(ink.r, ink.g, ink.b);
    const titleLines = doc.splitTextToSize(opts.title || labels.titleFallback, contentWidth);
    ensureSpace(titleLines.length * 26 + 8);
    doc.text(titleLines, marginX, y);
    y += titleLines.length * 24 + 10;

    if (opts.subtitle?.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(muted.r, muted.g, muted.b);
      const subLines = doc.splitTextToSize(opts.subtitle.trim(), contentWidth);
      ensureSpace(subLines.length * 15 + 8);
      doc.text(subLines, marginX, y);
      y += subLines.length * 14 + 16;
    }

    ensureSpace(20);
    doc.setDrawColor(rule.r, rule.g, rule.b);
    doc.setLineWidth(0.8);
    doc.line(marginX, y, marginX + 36, y);
    y += 26;

    const body = stripHtmlToText(opts.htmlContent);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(ink.r, ink.g, ink.b);

    if (body) {
      const paragraphs = body.split(/\n+/).filter((p) => p.trim());
      for (let i = 0; i < paragraphs.length; i++) {
        const lines = doc.splitTextToSize(paragraphs[i].trim(), contentWidth);
        for (const line of lines) {
          ensureSpace(18);
          doc.text(line, marginX, y);
          y += 16;
        }
        if (i < paragraphs.length - 1) y += 10;
      }
    } else {
      ensureSpace(18);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(muted.r, muted.g, muted.b);
      doc.text(labels.emptyBody, marginX, y);
    }

    const ab = doc.output("arraybuffer");
    triggerBlobDownload(new Blob([ab], { type: "application/pdf" }), `${safeFilename(opts.title)}.pdf`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errorCode: "DOWNLOAD_FAILED",
      error: e instanceof Error ? e.message : undefined,
    };
  }
}

/** Télécharge une seule pièce jointe (PDF / vidéo uploadée). */
export async function downloadLessonAttachment(opts: {
  mediaId: string;
  label?: string | null;
  type: string;
}): Promise<{ ok: boolean; errorCode?: LessonDownloadErrorCode; error?: string }> {
  if (opts.type === "video_link") {
    return { ok: false, errorCode: "EXTERNAL_LINK" };
  }

  const headers = await authHeaders();
  if (!headers) return { ok: false, errorCode: "LOGIN_REQUIRED" };

  try {
    const res = await fetch(`/api/lesson-media/${opts.mediaId}?download=1`, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        errorCode: "IMPOSSIBLE",
        error: (body as { error?: string }).error,
      };
    }

    const blob = await res.blob();
    const contentType = res.headers.get("content-type") || blob.type;
    let filename = safeFilename(opts.label || "piece-jointe");
    if (opts.type === "pdf" && !filename.toLowerCase().endsWith(".pdf")) filename += ".pdf";
    if (opts.type === "video_upload" && !/\.(mp4|webm|mov|mkv)$/i.test(filename)) {
      if (contentType.includes("webm")) filename += ".webm";
      else filename += ".mp4";
    }

    triggerBlobDownload(blob, filename);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errorCode: "DOWNLOAD_FAILED",
      error: e instanceof Error ? e.message : undefined,
    };
  }
}

export function lessonDownloadErrorMessage(
  result: { errorCode?: LessonDownloadErrorCode; error?: string },
  t: (ns: "dashboard", key: string) => string,
): string {
  switch (result.errorCode) {
    case "EXTERNAL_LINK":
      return t("dashboard", "lessonDownloadExternalLink");
    case "LOGIN_REQUIRED":
      return t("dashboard", "lessonDownloadLoginRequired");
    case "IMPOSSIBLE":
      return t("dashboard", "lessonDownloadImpossible");
    case "DOWNLOAD_FAILED":
    default:
      return t("dashboard", "lessonDownloadError");
  }
}
