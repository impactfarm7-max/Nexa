"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check, Loader2, MapPin, UserX, Users } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  BLUE,
  ORANGE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
} from "@/app/centre/center-page-ui";

type SessionRow = {
  slot_id: string;
  session_date: string;
  title: string;
  room_name: string;
  start_time: string;
  end_time: string;
};

type StudentMark = {
  id: string;
  name: string;
  groupe_id: string | null;
  status: "present" | "absent" | null;
};

export default function CentreAssiduitePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  }, []);

  const loadSessions = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    const res = await fetch("/api/centre/class-attendance", { headers });
    const json = await res.json();
    if (!res.ok) setError(json.error || "Chargement impossible.");
    else setSessions(json.sessions || []);
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const openSession = async (session: SessionRow) => {
    setSelected(session);
    setDetailLoading(true);
    setError("");
    const headers = await authHeaders();
    if (!headers) {
      setDetailLoading(false);
      return;
    }
    const qs = new URLSearchParams({
      slot_id: session.slot_id,
      session_date: session.session_date,
    });
    const res = await fetch(`/api/centre/class-attendance?${qs}`, { headers });
    const json = await res.json();
    setDetailLoading(false);
    if (!res.ok) {
      setError(json.error || "Impossible d'ouvrir la séance.");
      return;
    }
    setStudents(json.students || []);
  };

  const setStatus = (userId: string, status: "present" | "absent" | null) => {
    setStudents((prev) => prev.map((s) => (s.id === userId ? { ...s, status } : s)));
  };

  const markAll = (status: "present" | "absent") => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const save = async () => {
    if (!selected) return;
    const headers = await authHeaders();
    if (!headers) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/centre/class-attendance", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        slot_id: selected.slot_id,
        session_date: selected.session_date,
        marks: students.map((s) => ({ user_id: s.id, status: s.status })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Enregistrement impossible.");
      return;
    }
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title="Assiduité"
          backButton={
            <Link href="/centre/cours" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08]">
              <ArrowLeft size={16} />
            </Link>
          }
        />
      }
    >
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium -mt-1 mb-4">
          Marquez présent / absent sur une séance datée du planning. Pas de suivi amphithéâtre.
        </p>

        {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}

        {!selected ? (
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/[0.1] bg-white px-4 py-10 text-center text-sm text-neutral-500">
                Aucune séance datée récente. Matérialisez des créneaux dans le planning.
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={`${s.slot_id}-${s.session_date}`}
                  type="button"
                  onClick={() => void openSession(s)}
                  className="w-full text-left rounded-xl border border-black/[0.08] bg-white px-4 py-3 hover:border-[#11224E]/25 transition-colors"
                >
                  <p className="text-[14px] font-extrabold" style={{ color: BLUE }}>{s.title}</p>
                  <p className="mt-1 text-[12px] font-semibold text-neutral-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} /> {s.session_date} · {s.start_time}–{s.end_time}
                    </span>
                    {s.room_name ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> {s.room_name}
                      </span>
                    ) : null}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <button
                  type="button"
                  onClick={() => { setSelected(null); setStudents([]); }}
                  className="text-[12px] font-bold text-neutral-400 hover:text-neutral-700 mb-1"
                >
                  ← Séances
                </button>
                <h2 className="text-[16px] font-extrabold" style={{ color: BLUE }}>{selected.title}</h2>
                <p className="text-[12px] font-semibold text-neutral-500 mt-0.5">
                  {selected.session_date} · {selected.start_time}–{selected.end_time}
                  {selected.room_name ? ` · ${selected.room_name}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markAll("present")}
                  className="h-8 px-3 rounded-lg text-[11px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50"
                >
                  Tous présents
                </button>
                <button
                  type="button"
                  onClick={() => markAll("absent")}
                  className="h-8 px-3 rounded-lg text-[11px] font-bold border border-red-200 text-red-600 bg-red-50"
                >
                  Tous absents
                </button>
                <button
                  type="button"
                  disabled={saving || detailLoading}
                  onClick={() => void save()}
                  className="h-8 px-3 rounded-lg text-[11px] font-bold text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                  style={{ backgroundColor: ORANGE }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Enregistrer
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin" style={{ color: ORANGE }} />
              </div>
            ) : students.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/[0.1] bg-white px-4 py-10 text-center text-sm text-neutral-500">
                <Users className="mx-auto mb-2 opacity-30" size={22} />
                Aucun étudiant rattaché à cette classe.
              </div>
            ) : (
              <ul className="space-y-2">
                {students.map((st) => (
                  <li
                    key={st.id}
                    className="rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 flex flex-wrap items-center justify-between gap-2"
                  >
                    <p className="text-[13px] font-bold text-neutral-800">{st.name}</p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStatus(st.id, "present")}
                        className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${
                          st.status === "present"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "border-black/[0.1] text-neutral-600"
                        }`}
                      >
                        <Check size={12} /> Présent
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(st.id, "absent")}
                        className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${
                          st.status === "absent"
                            ? "bg-red-600 text-white border-red-600"
                            : "border-black/[0.1] text-neutral-600"
                        }`}
                      >
                        <UserX size={12} /> Absent
                      </button>
                      {st.status && (
                        <button
                          type="button"
                          onClick={() => setStatus(st.id, null)}
                          className="h-8 px-2 rounded-lg text-[11px] font-bold text-neutral-400 hover:text-neutral-700"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CenterPageBody>
    </CenterPageLayout>
  );
}
