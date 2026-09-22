"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, Loader2, MapPin, UserX } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

type RecordRow = {
  id: string;
  status: "present" | "absent";
  sessionDate: string;
  title: string;
  roomName: string;
  startTime: string;
  endTime: string;
};

export default function StudentAssiduitePage() {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [present, setPresent] = useState(0);
  const [absent, setAbsent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const res = await fetch("/api/student/class-attendance", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || (locale === "en" ? "Unable to load attendance." : "Chargement impossible."));
      setLoading(false);
      return;
    }
    setEnabled(Boolean(json.enabled));
    setRecords(json.records || []);
    setRate(json.rate ?? null);
    setPresent(json.present || 0);
    setAbsent(json.absent || 0);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-dvh bg-[#FFFBF7] text-neutral-900 pb-24">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#FFFBF7]/95 backdrop-blur">
        <div className="nexa-student-shell flex items-center gap-3 py-3">
          <Link
            href="/dashboard"
            className="h-9 w-9 rounded-lg border border-black/[0.08] inline-flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight truncate">
              {locale === "en" ? "My attendance" : "Mon assiduité"}
            </h1>
            <p className="text-[11px] font-semibold text-neutral-400">
              {locale === "en" ? "Present / absent per class session" : "Présent / absent par séance de cours"}
            </p>
          </div>
        </div>
      </header>

      <main className="nexa-student-shell pt-5 space-y-3 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin" style={{ color: BRAND.orange }} />
          </div>
        ) : error ? (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        ) : !enabled ? (
          <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white px-4 py-12 text-center">
            <p className="text-sm font-semibold text-neutral-500">
              {locale === "en" ? "Attendance is not available for your center." : "L'assiduité n'est pas disponible pour votre centre."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-black/[0.08] bg-white px-4 py-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-extrabold" style={{ color: BRAND.blue }}>
                  {rate == null ? "—" : `${rate}%`}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 mt-0.5">
                  {locale === "en" ? "Rate" : "Taux"}
                </p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-600">{present}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 mt-0.5">
                  {locale === "en" ? "Present" : "Présents"}
                </p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-red-600">{absent}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 mt-0.5">
                  {locale === "en" ? "Absent" : "Absents"}
                </p>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white px-4 py-12 text-center">
                <p className="text-sm font-semibold text-neutral-500">
                  {locale === "en" ? "No attendance recorded yet." : "Aucune assiduité enregistrée pour le moment."}
                </p>
              </div>
            ) : (
              records.map((row) => (
                <div key={row.id} className="rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-extrabold" style={{ color: BRAND.blue }}>{row.title}</p>
                    <span
                      className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                        row.status === "present"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {row.status === "present" ? <Check size={11} /> : <UserX size={11} />}
                      {row.status === "present"
                        ? (locale === "en" ? "Present" : "Présent")
                        : (locale === "en" ? "Absent" : "Absent")}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold text-neutral-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} />
                      {row.sessionDate}
                      {row.startTime ? ` · ${row.startTime}–${row.endTime}` : ""}
                    </span>
                    {row.roomName ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} /> {row.roomName}
                      </span>
                    ) : null}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}
