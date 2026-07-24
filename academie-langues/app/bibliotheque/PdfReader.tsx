"use client";

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configuration du moteur PDF
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfReaderProps {
  file: string;
  pageNumber: number;
  onLoadSuccess: ({ numPages }: { numPages: number }) => void;
}

export default function PdfReader({ file, pageNumber, onLoadSuccess }: PdfReaderProps) {
  const [pdfRenderWidth, setPdfRenderWidth] = useState(800);

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

  return (
    <Document
      file={file}
      onLoadSuccess={onLoadSuccess}
      loading={
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-9 h-9 border-[3px] border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-500 animate-pulse">Chargement du document…</p>
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