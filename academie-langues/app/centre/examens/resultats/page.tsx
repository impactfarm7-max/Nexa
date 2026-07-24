"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Loader2, Trophy, Mail, FileText, UserX, CheckSquare, Square
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import CenterPageLoading from "@/app/components/CenterPageLoading";
const BLUE = "#11224E";
const ORANGE = "#eb670e";

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
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState("generic");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [notSubmitted, setNotSubmitted] = useState<NotSubmitted[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

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

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    const withCert = results.filter(r => r.certificate_id);
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

  if (loading) return <CenterPageLoading />;

  if (!isTcfCanadaCenter(centerType)) {
    return (
      <div className="min-h-[100dvh] bg-white p-12 text-center">
          <p className="text-sm font-bold text-neutral-500">Résultats examens réservés aux centres TCF Canada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white text-[#11224E] flex flex-col h-screen overflow-hidden">
        <header className="shrink-0 border-b bg-white/80 px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/centre/examens/examensuniversels" className="p-1 rounded-lg hover:bg-neutral-100"><ArrowLeft size={14} /></a>
              <Trophy size={16} style={{ color: ORANGE }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Examens TCF</span>
            </div>
            <h1 className="text-2xl font-black">Résultats & certificats</h1>
          </div>
          <button onClick={sendCertificates} disabled={sending || selected.size === 0}
            className="h-9 px-4 rounded-xl text-white text-xs font-black uppercase flex items-center gap-1.5 disabled:opacity-40"
            style={{ backgroundColor: ORANGE }}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Envoyer ({selected.size})
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {message && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">{message}</p>}

          {leaderboard.length > 0 && (
            <div className="bg-white border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Classement du mois</p>
              <div className="flex flex-wrap gap-2">
                {leaderboard.slice(0, 10).map(l => (
                  <div key={l.user_id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-neutral-50">
                    <span className="text-xs font-black" style={{ color: ORANGE }}>#{l.rank}</span>
                    <span className="text-[10px] font-bold">{l.name}</span>
                    <span className="text-[9px] text-neutral-400">{l.composite_score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notSubmitted.length > 0 && (
            <div className="bg-white border rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Non passés</p>
              <div className="space-y-2">
                {notSubmitted.map(n => (
                  <div key={n.assignment_id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                    <div>
                      <p className="text-xs font-black">{n.name}</p>
                      <p className="text-[10px] text-neutral-400">{n.session_title} · {new Date(n.scheduled_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <button onClick={() => markNoShow(n.assignment_id)} className="text-[10px] font-black uppercase flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg">
                      <UserX size={12} /> Absent
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center gap-2">
              <button onClick={toggleAll} className="p-1"><CheckSquare size={14} className="text-neutral-400" /></button>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{results.length} résultat(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-black uppercase text-neutral-400 border-b">
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
                  {results.map(r => (
                    <tr key={r.exam_session_id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                      <td className="p-3">
                        {r.certificate_id && (
                          <button onClick={() => toggleSelect(r.exam_session_id)}>
                            {selected.has(r.exam_session_id) ? <CheckSquare size={14} style={{ color: ORANGE }} /> : <Square size={14} className="text-neutral-300" />}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-xs font-bold">{r.student_name}</td>
                      <td className="p-3 text-[10px] font-bold">Officiel {String(r.examen_id).padStart(2, "0")}</td>
                      <td className="p-3 text-[10px] text-neutral-500">{r.finished_at ? new Date(r.finished_at).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="p-3 text-[10px]">{extractScore(r.ce)}</td>
                      <td className="p-3 text-[10px]">{extractScore(r.co)}</td>
                      <td className="p-3 text-[10px]">{extractScore(r.ee)}</td>
                      <td className="p-3 text-[10px]">{extractScore(r.eo)}</td>
                      <td className="p-3 text-[10px] font-black" style={{ color: BLUE }}>{r.composite_score}</td>
                      <td className="p-3">
                        {r.pdf_url ? (
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600">
                            <FileText size={12} /> PDF{r.emailed_at ? " ✓" : ""}
                          </a>
                        ) : (
                          <span className="text-[10px] text-neutral-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr><td colSpan={10} className="p-8 text-center text-xs text-neutral-400 italic">Aucun résultat pour le moment.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
}
