"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Mail,
  Phone,
  KeyRound,
  Copy,
  X,
  Loader2,
  Inbox,
  Pause,
  Play,
  Ban,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";
import { useActionFeedback } from "../../components/ActionFeedback";
import { ConfirmDialog } from "../_components/ConfirmDialog";

type StudentRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  phone: string | null;
  ville: string | null;
  center_id: string | null;
  tag_status: string | null;
  center_status: string | null;
  subscription_ends_at: string | null;
  subscription_paused_at: string | null;
  pack_name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

type CenterInfo = { id: string; name: string; code: string | null };
type StatusFilter = "all" | "active" | "paused" | "expired" | "revoked";
type ConfirmKind = "pause" | "resume" | "revoke" | "reactivate";

function derivedStatus(student: StudentRow): Exclude<StatusFilter, "all"> {
  if (student.tag_status === "revoque" || student.center_status === "revoked") return "revoked";
  if (student.subscription_paused_at || student.center_status === "paused") return "paused";
  if (student.subscription_ends_at && new Date(student.subscription_ends_at).getTime() <= Date.now()) {
    return "expired";
  }
  return "active";
}

function statusStyle(status: Exclude<StatusFilter, "all">): { key: string; className: string } {
  if (status === "revoked") return { key: "studentsStatusRevoked", className: "bg-red-500/10 text-red-300 border-red-500/20" };
  if (status === "paused") return { key: "studentsStatusPaused", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" };
  if (status === "expired") return { key: "studentsStatusExpired", className: "bg-slate-700/40 text-slate-300 border-slate-600/40" };
  return { key: "studentsStatusActive", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
}

function displayName(student: StudentRow) {
  return [student.prenom, student.nom].filter(Boolean).join(" ") || student.email || "—";
}

export default function SuperadminEtudiantsPage() {
  const { t, locale } = useI18n();
  const feedback = useActionFeedback();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [centers, setCenters] = useState<Record<string, CenterInfo>>({});
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<StudentRow | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; student: StudentRow } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const loadStudents = useCallback(
    async (offset = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ offset: String(offset) });
        if (debouncedQuery.length >= 2) params.set("q", debouncedQuery);
        const json = await superadminFetch<{
          students: StudentRow[];
          centers: Record<string, CenterInfo>;
          total: number;
          hasMore: boolean;
        }>(`/api/superadmin/students?${params.toString()}`);
        setStudents((prev) => (append ? [...prev, ...(json.students || [])] : json.students || []));
        setCenters((prev) => (append ? { ...prev, ...(json.centers || {}) } : json.centers || {}));
        setTotal(json.total || 0);
        setHasMore(Boolean(json.hasMore));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("superadmin", "studentsSearchError"));
        if (!append) {
          setStudents([]);
          setCenters({});
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedQuery, t],
  );

  useEffect(() => {
    void loadStudents(0, false);
  }, [loadStudents]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return students;
    return students.filter((s) => derivedStatus(s) === statusFilter);
  }, [students, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: students.length, active: 0, paused: 0, expired: 0, revoked: 0 };
    for (const s of students) counts[derivedStatus(s)]++;
    return counts;
  }, [students]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const runStudentAction = async (student: StudentRow, action: ConfirmKind) => {
    const titles: Record<ConfirmKind, string> = {
      pause: t("superadmin", "studentsPauseOk"),
      resume: t("superadmin", "studentsResumeOk"),
      revoke: t("superadmin", "studentsRevokeOk"),
      reactivate: t("superadmin", "studentsReactivateOk"),
    };
    const messages: Record<ConfirmKind, string> = {
      pause: t("superadmin", "studentsPauseOkMsg", { name: displayName(student) }),
      resume: t("superadmin", "studentsResumeOkMsg", { name: displayName(student) }),
      revoke: t("superadmin", "studentsRevokeOkMsg", { name: displayName(student) }),
      reactivate: t("superadmin", "studentsReactivateOkMsg", { name: displayName(student) }),
    };
    const result = await feedback.run(
      async () => {
        await superadminFetch(`/api/superadmin/students/${student.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        });
      },
      {
        successTitle: titles[action],
        successMessage: messages[action],
        errorTitle: t("superadmin", "requestsActionImpossible"),
      },
    );
    if (result.ok) await loadStudents(0, false);
  };

  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    const target = resetTarget;
    const result = await feedback.run(
      async () => {
        const json = await superadminFetch<{ email: string; password: string }>(
          `/api/superadmin/students/${target.id}`,
          { method: "PATCH", body: JSON.stringify({ action: "reset_password" }) },
        );
        return json;
      },
      {
        silentSuccess: true,
        errorTitle: t("superadmin", "requestsActionImpossible"),
      },
    );
    if (result.ok) {
      setResetResult({ email: result.data.email, password: result.data.password });
    } else {
      setResetTarget(null);
    }
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setResetResult(null);
  };

  const btnClass =
    "flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors";

  const filters: StatusFilter[] = ["all", "active", "paused", "expired", "revoked"];
  const filterLabel = (key: StatusFilter) => {
    if (key === "all") return t("superadmin", "studentsFilterAll");
    return t("superadmin", statusStyle(key).key);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">{t("superadmin", "studentsTitle")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("superadmin", "studentsSubtitle")}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-600">
          {t("superadmin", "studentsCount", { count: String(total) })}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("superadmin", "studentsSearchPlaceholder")}
          className="w-full rounded-2xl border border-white/10 bg-[#0a0f1c] py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-400"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((key) => {
          const active = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                active
                  ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                  : "border-white/10 bg-[#0a0f1c] text-slate-400 hover:border-white/20"
              }`}
            >
              {filterLabel(key)}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-orange-500/30" : "bg-white/5"}`}>
                {statusCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading && students.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("superadmin", "centersLoading")}
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-700" />
          <p className="font-black text-white">
            {debouncedQuery.length >= 2
              ? t("superadmin", "studentsNoResult", { query: debouncedQuery })
              : t("superadmin", "studentsEmptyTitle")}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t("superadmin", "studentsEmptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => {
            const status = derivedStatus(student);
            const badge = statusStyle(status);
            const center = student.center_id ? centers[student.center_id] : null;
            return (
              <div
                key={student.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0a0f1c] p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-white">{displayName(student)}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${badge.className}`}>
                      {t("superadmin", badge.key)}
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
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("superadmin", "studentsCreatedOn")} {formatDate(student.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {center ? (
                    <Link
                      href={`/superadmin/centres?open=${center.id}`}
                      className={`${btnClass} text-slate-300 hover:border-orange-500/40 hover:text-orange-400`}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{center.name}</span>
                    </Link>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {t("superadmin", "studentsB2c")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setResetTarget(student)}
                    className={`${btnClass} text-slate-300 hover:border-orange-500/40 hover:text-orange-400`}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {t("superadmin", "studentsResetShort")}
                  </button>
                  {status === "paused" ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "resume", student })}
                      className={`${btnClass} text-emerald-300 hover:border-emerald-500/40`}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {t("superadmin", "studentsActionResume")}
                    </button>
                  ) : status !== "revoked" ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "pause", student })}
                      className={`${btnClass} text-amber-300 hover:border-amber-500/40`}
                    >
                      <Pause className="h-3.5 w-3.5" />
                      {t("superadmin", "studentsActionPause")}
                    </button>
                  ) : null}
                  {status === "revoked" ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "reactivate", student })}
                      className={`${btnClass} text-emerald-300 hover:border-emerald-500/40`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t("superadmin", "studentsActionReactivate")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "revoke", student })}
                      className={`${btnClass} text-red-300 hover:border-red-500/40`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {t("superadmin", "studentsActionRevoke")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {hasMore && statusFilter === "all" && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadStudents(students.length, true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0a0f1c] py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("superadmin", "studentsLoadMore")}
            </button>
          )}
        </div>
      )}

      {resetTarget && !resetResult && (
        <ConfirmDialog
          title={t("superadmin", "studentsResetTitle")}
          message={`${t("superadmin", "studentsResetPrefix")} ${displayName(resetTarget)}. ${t("superadmin", "studentsResetAudit")}`}
          confirmLabel={t("superadmin", "studentsResetConfirm")}
          cancelLabel={t("superadmin", "centresConfirmCancel")}
          variant="primary"
          onConfirm={() => void confirmResetPassword()}
          onCancel={closeResetModal}
        />
      )}

      {resetTarget && resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={closeResetModal}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-black text-white">{t("superadmin", "studentsResetOk")}</h2>
              <button type="button" onClick={closeResetModal} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-400">{t("superadmin", "studentsShareCredentials")}</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t("superadmin", "studentsEmailLabel")}</p>
                <p className="font-mono text-sm font-bold text-white">{resetResult.email}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t("superadmin", "studentsNewPassword")}</p>
                <p className="font-mono text-lg font-black tracking-widest text-orange-400">{resetResult.password}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(
                  `${t("superadmin", "studentsEmailLabel")} : ${resetResult.email}\n${t("superadmin", "studentsPasswordLabel")} : ${resetResult.password}`,
                )
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:opacity-90"
            >
              <Copy className="h-4 w-4" /> {t("superadmin", "studentsCopy")}
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={t(
            "superadmin",
            confirm.kind === "pause"
              ? "studentsConfirmPauseTitle"
              : confirm.kind === "resume"
                ? "studentsConfirmResumeTitle"
                : confirm.kind === "revoke"
                  ? "studentsConfirmRevokeTitle"
                  : "studentsConfirmReactivateTitle",
          )}
          message={t(
            "superadmin",
            confirm.kind === "pause"
              ? "studentsConfirmPause"
              : confirm.kind === "resume"
                ? "studentsConfirmResume"
                : confirm.kind === "revoke"
                  ? "studentsConfirmRevoke"
                  : "studentsConfirmReactivate",
            { name: displayName(confirm.student) },
          )}
          confirmLabel={t(
            "superadmin",
            confirm.kind === "pause"
              ? "studentsActionPause"
              : confirm.kind === "resume"
                ? "studentsActionResume"
                : confirm.kind === "revoke"
                  ? "studentsActionRevoke"
                  : "studentsActionReactivate",
          )}
          cancelLabel={t("superadmin", "centresConfirmCancel")}
          variant={confirm.kind === "revoke" || confirm.kind === "pause" ? "danger" : "primary"}
          onConfirm={() => {
            const pending = confirm;
            setConfirm(null);
            void runStudentAction(pending.student, pending.kind);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
