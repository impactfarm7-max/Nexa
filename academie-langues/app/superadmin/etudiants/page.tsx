"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Building2, Mail, Phone, KeyRound, Copy, X, Loader2 } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";

type StudentRow = {
  id: string;
  prenom: string | null;
  email: string | null;
  phone: string | null;
  ville: string | null;
  center_id: string | null;
  tag_status: string | null;
  subscription_ends_at: string | null;
  subscription_paused_at: string | null;
  pack_name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

type CenterInfo = { id: string; name: string; code: string | null };

function statusLabel(student: StudentRow): { label: string; className: string } {
  if (student.tag_status === "revoque") return { label: "Révoqué", className: "bg-red-500/10 text-red-300 border-red-500/20" };
  if (student.tag_status === "termine") return { label: "Terminé", className: "bg-slate-700/40 text-slate-300 border-slate-600/40" };
  if (student.subscription_paused_at) return { label: "En pause", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" };
  if (student.subscription_ends_at && new Date(student.subscription_ends_at).getTime() <= Date.now()) {
    return { label: "Expiré", className: "bg-slate-700/40 text-slate-300 border-slate-600/40" };
  }
  return { label: "Actif", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
}

export default function SuperadminEtudiantsPage() {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [centers, setCenters] = useState<Record<string, CenterInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const [resetTarget, setResetTarget] = useState<StudentRow | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setStudents([]);
      setCenters({});
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ students: StudentRow[]; centers: Record<string, CenterInfo> }>(
        `/api/superadmin/students?q=${encodeURIComponent(q.trim())}`
      );
      setStudents(json.students || []);
      setCenters(json.centers || {});
      setSearched(true);
    } catch (e: any) {
      setError(e.message || "Erreur de recherche.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    setResetBusy(true);
    try {
      const json = await superadminFetch<{ email: string; password: string }>(`/api/superadmin/students/${resetTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reset_password" }),
      });
      setResetResult({ email: json.email, password: json.password });
    } catch (e: any) {
      alert(e.message || "Action impossible.");
      setResetTarget(null);
    } finally {
      setResetBusy(false);
    }
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setResetResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Étudiants</h1>
        <p className="mt-1 text-sm text-slate-400">Recherche tous centres confondus (nom, email, téléphone ou code centre).</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un étudiant..."
          className="w-full rounded-2xl border border-white/10 bg-[#0a0f1c] py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-400"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {!searched && query.trim().length < 2 && (
        <p className="py-10 text-center text-sm text-slate-500">Tapez au moins 2 caractères pour lancer la recherche.</p>
      )}

      {searched && !loading && students.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <p className="font-bold text-slate-400">Aucun étudiant trouvé pour &quot;{query}&quot;</p>
        </div>
      )}

      {students.length > 0 && (
        <div className="space-y-2">
          {students.map((student) => {
            const status = statusLabel(student);
            const center = student.center_id ? centers[student.center_id] : null;
            return (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0a0f1c] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-white">{student.prenom || "—"}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {student.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {student.email}
                      </span>
                    )}
                    {student.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {student.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {center && (
                    <Link
                      href={`/superadmin/centres?open=${center.id}`}
                      className="flex min-w-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{center.name}</span>
                      {center.code && <span className="shrink-0 font-mono text-slate-500">· {center.code}</span>}
                    </Link>
                  )}
                  <button
                    onClick={() => setResetTarget(student)}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset mdp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={closeResetModal}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-black text-white">Réinitialiser le mot de passe</h2>
              <button onClick={closeResetModal} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!resetResult ? (
              <>
                <p className="mt-2 text-sm text-slate-400">
                  Un nouveau mot de passe sera généré pour <span className="font-bold text-white">{resetTarget.prenom || resetTarget.email}</span>.
                  Cette action est journalisée.
                </p>
                <button
                  onClick={confirmResetPassword}
                  disabled={resetBusy}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
                >
                  {resetBusy ? "Réinitialisation..." : "Confirmer la réinitialisation"}
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-slate-400">Transmettez ces accès à l&apos;étudiant.</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Email</p>
                    <p className="font-mono text-sm font-bold text-white">{resetResult.email}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Nouveau mot de passe</p>
                    <p className="font-mono text-lg font-black tracking-widest text-orange-400">{resetResult.password}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`Email : ${resetResult.email}\nMot de passe : ${resetResult.password}`)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:opacity-90"
                >
                  <Copy className="h-4 w-4" /> Copier
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
