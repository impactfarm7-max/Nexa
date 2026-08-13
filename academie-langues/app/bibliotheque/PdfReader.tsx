"use client";

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useI18n } from "@/app/i18n/I18nProvider";

// Configuration du moteur PDF
// Worker local (évite 404 CDN / protocol-relative //unpkg dans certains contextes).
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

interface PdfReaderProps {
  file: string;
  pageNumber: number;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
}

export default function PdfReader({ file, pageNumber, onLoadSuccess }: PdfReaderProps) {
  const { t } = useI18n();
  const [pdfRenderWidth, setPdfRenderWidth] = useState(800);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);
  }, [file]);

  // Le PDF s'adapte à la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      let max = 800;
      if (w >= 1536) max = 1100;
      else if (w >= 1280) max = 1000;
      else if (w >= 1024) max = 900;
      const ratio = w < 768 ? 0.92 : 0.85;
      setPdfRenderWidth(Math.min(w * ratio, max));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 px-4 text-center">
        <p className="text-sm font-semibold text-red-600">{loadError}</p>
        <p className="text-xs text-neutral-500">{t("dashboard", "bibliothequePublicLoadError")}</p>
      </div>
    );
  }

  return (
    <Document
      file={file}
      onLoadSuccess={(info) => {
        setLoadError(null);
        onLoadSuccess(info);
      }}
      onLoadError={(err) => {
        const msg = err?.message || "";
        setLoadError(/404|not found|not_found/i.test(msg)
          ? "Document introuvable (404)."
          : msg || "Impossible de charger le PDF.");
      }}
      loading={
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-9 h-9 border-[3px] border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-500 animate-pulse">{t("dashboard", "bibliothequePdfLoading")}</p>
        </div>
      }
      className="flex flex-col items-center"
    >
      <Page 
        pageNumber={pageNumber} 
        width={pdfRenderWidth}
        renderTextLayer={false} // ⛔ EMPÊCHE DE COPIER LE TEXTE
        renderAnnotationLayer={false}
        className="rounded-lg overflow-hidden border border-orange-200 shadow-md shadow-orange-100/50 bg-white"
      />
    </Document>
  );
}