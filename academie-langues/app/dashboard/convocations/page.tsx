"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Download, Loader2, MapPin, BookOpen } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { downloadConvocationExamenPdf } from "@/app/utils/centerPdfExport";
import type { DocumentExportConfig } from "@/app/utils/documentConfig";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

type Row = {
  id: string;
  epreuveLabel: string;
  scheduledAt: string;
  durationMinutes: number | null;
  roomName: string;
  instructions: string | null;
};

type Sig = { id: string; label: string; signatureUrl?: string | null };

export default function StudentConvocationsPage() {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [studentName, setStudentName] = useState("");
  const [matricule, setMatricule] = useState<string | null>(null);
  const [docConfig, setDocConfig] = useState<Partial<DocumentExportConfig> | null>(null);
  const [signatures, setSignatures] = useState<Sig[]>([]);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const res = await fetch("/api/student/exam-convocations", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Chargement impossible.");
      setLoading(false);
      return;
    }
    setRows(json.convocations || []);
    setStudentName(json.studentName || "");
    setMatricule(json.matricule || null);
    const cfg = (json.docConfig || {}) as Partial<DocumentExportConfig>;
    if (locale === "en" && (!cfg.title || cfg.title === "Convocation d'examen" || cfg.title === "Document officiel")) {
      cfg.title = "Examination summons";
    }
    setDocConfig(cfg);
    setSignatures(json.signatures || []);
    setStampUrl(json.stampUrl || null);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async (row: Row) => {
    setDownloadingId(row.id);
    try {
      await downloadConvocationExamenPdf({
        locale: locale === "en" ? "en" : "fr",
        studentName,
        studentMatricule: matricule,
        requireMatricule: true,
        epreuveLabel: row.epreuveLabel,
        scheduledAt: row.scheduledAt,
        durationMinutes: row.durationMinutes,
        roomName: row.roomName,
        instructions: row.instructions,
        config: docConfig || undefined,
        signatures,
        stampUrl,
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : (locale === "en" ? "Unable to print." : "Impression impossible."));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-[#11224E] pb-[calc(8rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#FFFBF7]">
        <div className="nexa-student-shell h-[68px] flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-9 w-9 rounded-lg border border-black/[0.08] inline-flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight truncate">
              {locale === "en" ? "My exam summons" : "Mes convocations"}
            </h1>
            <p className="text-[11px] font-semibold text-neutral-400">
              {locale === "en" ? "Separate from live sessions & coaching" : "Distinct des sessions live et du coaching"}
            </p>
          </div>
        </div>
      </header>

      <main className="nexa-student-shell pt-5 space-y-3 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: BRAND.orange }} /></div>
        ) : error ? (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white px-4 py-12 text-center">
            <BookOpen className="mx-auto mb-3 opacity-30" size={28} />
            <p className="text-sm font-semibold text-neutral-500">
              {locale === "en" ? "No upcoming exams." : "Aucune convocation pour le moment."}
            </p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 space-y-2.5">
              <p className="text-[15px] font-extrabold" style={{ color: BRAND.blue }}>{row.epreuveLabel}</p>
              <p className="text-[12px] font-semibold text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} />
                  {new Date(row.scheduledAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {row.roomName}
                </span>
                {row.durationMinutes ? <span>{row.durationMinutes} min</span> : null}
              </p>
              {row.instructions && (
                <p className="text-[12px] font-medium text-neutral-500">{row.instructions}</p>
              )}
              <button
                type="button"
                disabled={downloadingId === row.id}
                onClick={() => void download(row)}
                className="w-full h-10 rounded-lg text-[13px] font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: BRAND.orange }}
              >
                {downloadingId === row.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {locale === "en" ? "Download PDF" : "Télécharger le PDF"}
              </button>
            </div>
          ))
        )}

        <p className="text-[11px] font-medium text-neutral-400 pt-2">
          {locale === "en"
            ? "Looking for live sessions or coaching? Open Sessions Live."
            : "Pour les sessions live ou le coaching, ouvrez Sessions live."}
          {" "}
          <Link href="/dashboard/coaching" className="font-bold underline" style={{ color: BRAND.blue }}>
            {locale === "en" ? "Go to coaching" : "Aller au coaching"}
          </Link>
        </p>
      </main>
    </div>
  );
}
