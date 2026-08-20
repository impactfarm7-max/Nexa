"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, RefreshCcw, ChevronDown } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";

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

const ACTION_KEYS: Record<string, string> = {
  login: "auditActionLogin", mfa_enrolled: "auditActionMfa",
  application_approved: "auditActionApplicationApproved", application_rejected: "auditActionApplicationRejected",
  application_contacted: "auditActionApplicationContacted", center_suspended: "auditActionCenterSuspended",
  center_reactivated: "auditActionCenterReactivated", center_rejected: "auditActionCenterRejected",
  center_pending_approved: "auditActionCenterApproved", student_password_reset: "auditActionPasswordReset",
  student_paused: "auditActionStudentPaused", student_resumed: "auditActionStudentResumed",
  student_revoked: "auditActionStudentRevoked", student_reactivated: "auditActionStudentReactivated",
  "application.approve": "auditActionApplicationApproved",
  center_activated: "auditActionCenterActivated", center_paused: "auditActionCenterPaused",
  center_resumed: "auditActionCenterResumed", center_revoked: "auditActionCenterRevoked",
  center_subscription_updated: "auditActionCenterSubscriptionUpdated", center_view_as: "auditActionCenterViewAs",
  center_ai_credits_purchased: "auditActionCreditsPurchased", superadmin_created: "auditActionSuperadminCreated",
  superadmin_updated: "auditActionSuperadminUpdated", finance_payment_recorded: "auditActionFinancePaymentRecorded",
  library_document_approved: "auditActionLibraryApproved", library_document_rejected: "auditActionLibraryRejected",
};

const STATUS_UPDATE_KEYS: Record<string, string> = {
  contacted: "auditActionApplicationContacted",
  rejected: "auditActionApplicationRejected",
};

function actionLabel(entry: AuditLogEntry, t: (ns: "superadmin", key: string) => string): string {
  if (entry.action === "application.status_update") {
    const status = typeof entry.metadata?.status === "string" ? entry.metadata.status : "";
    const key = STATUS_UPDATE_KEYS[status];
    return key ? t("superadmin", key) : entry.action;
  }
  return ACTION_KEYS[entry.action] ? t("superadmin", ACTION_KEYS[entry.action]) : entry.action;
}

function actionTone(action: string) {
  if (action.includes("rejected") || action === "center_suspended") return "text-red-300 border-red-500/20 bg-red-500/10";
  if (action.includes("approved") || action.includes("reactivated") || action.includes("login")) return "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";
  if (action.includes("password_reset")) return "text-amber-300 border-amber-500/20 bg-amber-500/10";
  return "text-slate-300 border-white/10 bg-white/5";
}

function formatMetadata(entry: AuditLogEntry, centerLabel: string, emailLabel: string): string | null {
  const meta = entry.metadata || {};
  const parts: string[] = [];
  if (meta.centerName) parts.push(`${centerLabel} : ${meta.centerName}`);
  if (meta.email) parts.push(`${emailLabel} : ${meta.email}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export default function SuperadminAuditPage() {
  const { locale, t } = useI18n();
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
      setError(e.message || t("superadmin", "auditLoadError"));
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
      setError(e.message || t("superadmin", "auditLoadError"));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "auditTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "auditSubtitle")}</p>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("superadmin", "analyticsRefresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">{t("superadmin", "auditLoading")}</p>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <ScrollText className="mx-auto mb-4 h-10 w-10 text-slate-700" />
          <p className="font-bold text-slate-400">{t("superadmin", "auditEmpty")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((entry) => {
              const detail = formatMetadata(entry, t("superadmin", "auditCenterLabel"), t("superadmin", "auditEmailLabel"));
              return (
                <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${actionTone(entry.action)}`}>
                      {actionLabel(entry, t)}
                    </span>
                    <div>
                      {detail && <p className="text-sm font-semibold text-slate-300">{detail}</p>}
                      {entry.reason && <p className="mt-0.5 text-xs text-slate-500">{t("superadmin", "auditReason")} : {entry.reason}</p>}
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t("superadmin", "auditBy")} {entry.superadmin_email || t("superadmin", "auditDeletedAccount")}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-nowrap text-xs font-semibold text-slate-500">
                    {new Date(entry.created_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
                {t("superadmin", "auditLoadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
