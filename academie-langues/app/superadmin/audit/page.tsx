"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, RefreshCcw, ChevronDown } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";

type AuditLogEntry = {
  id: string;
  superadmin_id: string;
  superadmin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: "Connexion superadmin",
  mfa_enrolled: "Activation du MFA",
  application_approved: "Demande de centre approuvée",
  application_rejected: "Demande de centre rejetée",
  application_contacted: "Demande de centre marquée « contactée »",
  center_suspended: "Centre suspendu",
  center_reactivated: "Centre réactivé",
  center_rejected: "Centre rejeté (essai)",
  center_pending_approved: "Centre validé (fin d'essai)",
  student_password_reset: "Réinitialisation mot de passe étudiant",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action;
}

function actionTone(action: string) {
  if (action.includes("rejected") || action === "center_suspended") return "text-red-300 border-red-500/20 bg-red-500/10";
  if (action.includes("approved") || action.includes("reactivated") || action.includes("login")) return "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";
  if (action.includes("password_reset")) return "text-amber-300 border-amber-500/20 bg-amber-500/10";
  return "text-slate-300 border-white/10 bg-white/5";
}

function formatMetadata(entry: AuditLogEntry): string | null {
  const meta = entry.metadata || {};
  const parts: string[] = [];
  if (meta.centerName) parts.push(`Centre : ${meta.centerName}`);
  if (meta.email) parts.push(`Email : ${meta.email}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export default function SuperadminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ logs: AuditLogEntry[] }>("/api/superadmin/audit?limit=50");
      setLogs(json.logs || []);
      setHasMore((json.logs || []).length === 50);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (logs.length === 0) return;
    setLoadingMore(true);
    try {
      const before = logs[logs.length - 1].created_at;
      const json = await superadminFetch<{ logs: AuditLogEntry[] }>(
        `/api/superadmin/audit?limit=50&before=${encodeURIComponent(before)}`
      );
      setLogs((prev) => [...prev, ...(json.logs || [])]);
      setHasMore((json.logs || []).length === 50);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Journal d&apos;activité</h1>
          <p className="mt-1 text-sm text-slate-400">Historique des actions sensibles effectuées par les comptes superadmin.</p>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">Chargement du journal...</p>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <ScrollText className="mx-auto mb-4 h-10 w-10 text-slate-700" />
          <p className="font-bold text-slate-400">Aucune action enregistrée pour l&apos;instant</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((entry) => {
              const detail = formatMetadata(entry);
              return (
                <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${actionTone(entry.action)}`}>
                      {actionLabel(entry.action)}
                    </span>
                    <div>
                      {detail && <p className="text-sm font-semibold text-slate-300">{detail}</p>}
                      {entry.reason && <p className="mt-0.5 text-xs text-slate-500">Motif : {entry.reason}</p>}
                      <p className="mt-0.5 text-xs text-slate-500">
                        Par {entry.superadmin_email || "compte supprimé"}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-nowrap text-xs font-semibold text-slate-500">
                    {new Date(entry.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400 disabled:opacity-50"
              >
                <ChevronDown className={`h-4 w-4 ${loadingMore ? "animate-bounce" : ""}`} />
                Charger plus
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
