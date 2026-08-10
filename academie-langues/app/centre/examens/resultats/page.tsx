"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft, Loader2, Trophy, Mail, FileText, UserX, CheckSquare, Square, Calendar,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/utils/supabase";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, PAGE_BG, ToolbarSearch, ToolbarFilterMenu } from "@/app/centre/center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

type ResultRow = {
  exam_session_id: string;
  user_id: string;
  student_name: string;
  email: string | null;
  examen_id: number;
  finished_at: string;
  ce: unknown;
  co: unknown;
  ee: unknown;
  eo: unknown;
  composite_score: number;
  certificate_id: string | null;
  pdf_url: string | null;
  emailed_at: string | null;
  session_title?: string | null;
};

type LeaderRow = { user_id: string; name: string; composite_score: number; rank: number | null };
type NotSubmitted = { assignment_id: string; user_id: string; name: string; session_title: string; scheduled_at: string };

function extractScore(val: unknown): string {
  if (!val || typeof val !== "object") return "—";
  const o = val as Record<string, unknown>;
  if (typeof o.score === "number") return String(o.score);
  if (typeof o.niveau === "string") return o.niveau;
  if (typeof o.points === "number") return String(o.points);
  return "—";
}

export default function TcfExamResultsPage() {
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState("generic");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [notSubmitted, setNotSubmitted] = useState<NotSubmitted[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/centre/tcf-exams/results", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setResults(json.results || []);
      setLeaderboard(json.leaderboard || []);
      setNotSubmitted(json.not_submitted || []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
      if (!profile?.center_id) { setLoading(false); return; }
      const { data: center } = await supabase.from("centers").select("center_type").eq("id", profile.center_id).single();
      setCenterType(center?.center_type || "generic");
      await load();
      setLoading(false);
    })();
  }, [load]);

  const sessionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of results) {
      const key = `ex-${r.examen_id}`;
      if (!map.has(key)) map.set(key, `Officiel ${String(r.examen_id).padStart(2, "0")}`);
    }
    for (const n of notSubmitted) {
      const key = `title:${n.session_title}`;
      if (!map.has(key)) map.set(key, n.session_title);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [results, notSubmitted]);

  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      if (sessionFilter.startsWith("ex-") && sessionFilter !== `ex-${r.examen_id}`) return false;
      if (!q) return true;
      return `${r.student_name} ${r.email || ""}`.toLowerCase().includes(q);
    });
  }, [results, sessionFilter, search]);

  const filteredNotSubmitted = useMemo(() => {
    if (sessionFilter === "all") return notSubmitted;
    if (sessionFilter.startsWith("title:")) {
      const title = sessionFilter.slice("title:".length);
      return notSubmitted.filter((n) => n.session_title === title);
    }
    return notSubmitted;
  }, [notSubmitted, sessionFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const withCert = filteredResults.filter(r => r.certificate_id);
    if (selected.size === withCert.length) setSelected(new Set());
    else setSelected(new Set(withCert.map(r => r.exam_session_id)));
  };

  const sendCertificates = async () => {
    if (selected.size === 0) return;
    setSending(true); setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/centre/tcf-exams/send-certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ exam_session_ids: [...selected] }),
    });
    const json = await res.json();
    setMessage(res.ok ? `${json.sent ?? 0} certificat(s) envoyé(s).` : json.error || "Erreur");
    if (res.ok) { setSelected(new Set()); await load(); }
    setSending(false);
  };

  const markNoShow = async (assignmentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/centre/tcf-exams/results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ assignment_id: assignmentId, status: "no_show" }),
    });
    if (res.ok) await load();
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  if (!isTcfCanadaCenter(centerType)) {
    return (
      <div className="min-h-[100dvh] p-12 text-center" style={{ backgroundColor: PAGE_BG }}>
        <p className="text-sm font-semibold text-neutral-500">{t("centre", "examensResultsTcfOnly")}</p>
        <Link href="/centre/examens/examensuniversels" className="mt-4 inline-block text-xs font-bold uppercase tracking-wider hover:underline" style={{ color: BLUE }}>
          {t("centre", "financeBack")}
        </Link>
      </div>
    );
  }

  const empty = filteredResults.length === 0 && filteredNotSubmitted.length === 0;

  return (
    <div className="min-h-[100dvh] flex flex-col h-screen overflow-hidden text-[#11224E]" style={{ backgroundColor: PAGE_BG }}>
      <header className="shrink-0 border-b border-black/[0.06] px-6 py-5 flex items-center justify-between gap-3" style={{ backgroundColor: PAGE_BG }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/centre/examens/examensuniversels" className="p-1 rounded-lg hover:bg-black/[0.03]"><ArrowLeft size={14} /></Link>
            <Trophy size={16} className="text-neutral-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Examens TCF</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: BLUE }}>Résultats & certificats</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/centre/examens/planning"
            className="h-9 px-3 rounded-xl border border-black/[0.08] bg-white text-xs font-semibold flex items-center gap-1.5 hover:bg-black/[0.03]"
          >
            <Calendar size={14} /> Planning
          </Link>
          <button onClick={sendCertificates} disabled={sending || selected.size === 0}
            className="h-9 px-4 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            style={{ backgroundColor: BLUE }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Envoyer ({selected.size})
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {message && (
          <p className="text-xs font-semibold text-neutral-700 bg-white border border-black/[0.06] rounded-xl px-4 py-2">
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarSearch
            value={search}
            onChange={setSearch}
            placeholder={locale === "en" ? "Search a learner…" : "Rechercher un élève…"}
          />
          <ToolbarFilterMenu
            onReset={() => setSessionFilter("all")}
            sections={[
              {
                id: "session",
                label: locale === "en" ? "Session" : "Séance",
                value: sessionFilter,
                options: [
                  { value: "all", label: locale === "en" ? "All sessions" : "Toutes les séances" },
                  ...sessionOptions.map((o) => ({ value: o.id, label: o.label })),
                ],
                onChange: setSessionFilter,
              },
            ]}
          />
        </div>

        {empty ? (
          <div className="rounded-2xl border border-dashed border-black/[0.08] bg-white px-6 py-16 text-center">
            <p className="text-sm font-semibold text-neutral-500">Aucun résultat pour le moment.</p>
            <p className="text-xs text-neutral-400 mt-2">Créez une séance et assignez plusieurs élèves pour commencer.</p>
            <Link
              href="/centre/examens/planning"
              className="mt-5 inline-flex h-9 px-4 rounded-xl text-xs font-semibold text-white items-center gap-1.5"
              style={{ backgroundColor: BLUE }}
            >
              <Calendar size={14} /> Créer une séance
            </Link>
          </div>
        ) : (
          <>
            {leaderboard.length > 0 && (
              <div className="bg-white border border-black/[0.06] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Classement du mois</p>
                <div className="flex flex-wrap gap-2">
                  {leaderboard.slice(0, 10).map(l => (
                    <div key={l.user_id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-black/[0.06] bg-neutral-50">
                      <span className="text-xs font-bold text-neutral-500">#{l.rank}</span>
                      <span className="text-[10px] font-semibold">{l.name}</span>
                      <span className="text-[9px] text-neutral-400">{l.composite_score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredNotSubmitted.length > 0 && (
              <div className="bg-white border border-black/[0.06] rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Non passés</p>
                <div className="space-y-2">
                  {filteredNotSubmitted.map(n => (
                    <div key={n.assignment_id} className="flex items-center justify-between border border-black/[0.06] rounded-xl px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold">{n.name}</p>
                        <p className="text-[10px] text-neutral-400">{n.session_title} · {new Date(n.scheduled_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <button onClick={() => markNoShow(n.assignment_id)} className="text-[10px] font-bold uppercase flex items-center gap-1 text-neutral-600 hover:bg-neutral-50 px-2 py-1 rounded-lg">
                        <UserX size={12} /> Absent
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-black/[0.06] flex items-center gap-2">
                <button type="button" onClick={toggleAll} className="p-1"><CheckSquare size={14} className="text-neutral-400" /></button>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{filteredResults.length} résultat(s)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-bold uppercase text-neutral-400 border-b border-black/[0.06]">
                      <th className="p-3 w-8" />
                      <th className="p-3">Élève</th>
                      <th className="p-3">Examen</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">CE</th>
                      <th className="p-3">CO</th>
                      <th className="p-3">EE</th>
                      <th className="p-3">EO</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Cert.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map(r => (
                      <tr key={r.exam_session_id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                        <td className="p-3">
                          {r.certificate_id && (
                            <button type="button" onClick={() => toggleSelect(r.exam_session_id)}>
                              {selected.has(r.exam_session_id) ? <CheckSquare size={14} style={{ color: BLUE }} /> : <Square size={14} className="text-neutral-300" />}
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-xs font-semibold uppercase">{r.student_name}</td>
                        <td className="p-3 text-[10px] font-semibold">Officiel {String(r.examen_id).padStart(2, "0")}</td>
                        <td className="p-3 text-[10px] text-neutral-500">{r.finished_at ? new Date(r.finished_at).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="p-3 text-[10px]">{extractScore(r.ce)}</td>
                        <td className="p-3 text-[10px]">{extractScore(r.co)}</td>
                        <td className="p-3 text-[10px]">{extractScore(r.ee)}</td>
                        <td className="p-3 text-[10px]">{extractScore(r.eo)}</td>
                        <td className="p-3 text-[10px] font-bold" style={{ color: BLUE }}>{r.composite_score}</td>
                        <td className="p-3">
                          {r.pdf_url ? (
                            <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-600">
                              <FileText size={12} /> PDF{r.emailed_at ? " ✓" : ""}
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
