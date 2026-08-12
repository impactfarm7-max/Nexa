"use client";

import { useEffect, useState } from "react";
import { Building2, Eye, GraduationCap, Loader2, Users, X } from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import { SA_VIEW_AS_PENDING_KEY, type SaViewAsPending } from "@/app/utils/sa-view-as";
import type { ViewAsMode } from "@/app/utils/view-as";

type Target = {
  id: string;
  label: string;
  email: string;
  role?: string | null;
  roleLabel?: string | null;
  tag_status?: string | null;
};

type ViewAsCatalog = {
  center: { id: string; name: string; center_type: string | null };
  managers: Target[];
  staff: Target[];
  students: Target[];
};

export function ViewAsModal({
  centerId,
  centerName,
  onClose,
}: {
  centerId: string;
  centerName: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const feedback = useActionFeedback();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<ViewAsCatalog | null>(null);
  const [mode, setMode] = useState<ViewAsMode>("center");
  const [userId, setUserId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await superadminFetch<ViewAsCatalog>(
          `/api/superadmin/centers/${centerId}/view-as`,
        );
        if (cancelled) return;
        setCatalog(json);
        setMode("center");
        setUserId(json.managers[0]?.id || "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t("superadmin", "viewAsLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId, t]);

  const targetsForMode =
    mode === "center"
      ? catalog?.managers || []
      : mode === "staff"
        ? (catalog?.staff.length ? catalog.staff : catalog?.managers) || []
        : catalog?.students || [];

  useEffect(() => {
    if (!catalog) return;
    const list =
      mode === "center"
        ? catalog.managers
        : mode === "staff"
          ? catalog.staff.length
            ? catalog.staff
            : catalog.managers
          : catalog.students;
    setUserId(list[0]?.id || "");
  }, [mode, catalog]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await feedback.run(
        async () => {
          const json = await superadminFetch<{
            token_hash: string;
            next: string;
            mode: ViewAsMode;
            forceViewAs?: "staff" | null;
            target: { id: string; label: string; email: string };
            center: { id: string; name: string; center_type: string | null };
          }>(`/api/superadmin/centers/${centerId}/view-as`, {
            method: "POST",
            body: JSON.stringify({ mode, userId: userId || null }),
          });

          const pending: SaViewAsPending = {
            token_hash: json.token_hash,
            next: json.next,
            mode: json.mode,
            forceViewAs: json.forceViewAs ?? null,
            centerId: json.center.id,
            centerName: json.center.name,
            centerType: json.center.center_type,
            targetLabel: json.target.label,
            targetEmail: json.target.email,
          };
          sessionStorage.setItem(SA_VIEW_AS_PENDING_KEY, JSON.stringify(pending));
          window.location.assign("/view-as/enter");
        },
        {
          successTitle: t("superadmin", "viewAsStarting"),
          successMessage: t("superadmin", "viewAsStartingMsg"),
          errorTitle: t("superadmin", "viewAsImpossible"),
        },
      );
      if (!result.ok) setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("superadmin", "viewAsImpossible"));
      setBusy(false);
    }
  };

  const modes: { key: ViewAsMode; icon: typeof Building2; hintKey: string }[] = [
    { key: "center", icon: Building2, hintKey: "viewAsHintCenter" },
    { key: "staff", icon: Users, hintKey: "viewAsHintStaff" },
    { key: "student", icon: GraduationCap, hintKey: "viewAsHintStudent" },
  ];

  const modeLabel = (m: ViewAsMode) =>
    m === "center"
      ? t("superadmin", "viewAsModeCenter")
      : m === "staff"
        ? t("superadmin", "viewAsModeStaff")
        : t("superadmin", "viewAsModeStudent");

  const staffFallback = mode === "staff" && (catalog?.staff.length || 0) === 0 && (catalog?.managers.length || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <div
        className="custom-scrollbar w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">
              {t("superadmin", "viewAsTitle")}
            </p>
            <h2 className="mt-1 text-lg font-black text-white">{centerName}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("superadmin", "viewAsSubtitle")}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("superadmin", "viewAsLoading")}
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {modes.map(({ key, icon: Icon }) => {
                const selected = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-orange-500/60 bg-orange-500/15 ring-1 ring-orange-500/40"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${selected ? "text-orange-300" : "text-slate-500"}`} />
                    <p className={`mt-2 text-[11px] font-black uppercase tracking-wide ${selected ? "text-orange-300" : "text-white"}`}>
                      {modeLabel(key)}
                    </p>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              {t("superadmin", modes.find((m) => m.key === mode)!.hintKey)}
            </p>

            {staffFallback && (
              <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                {t("superadmin", "viewAsStaffFallback")}
              </p>
            )}

            {targetsForMode.length > 0 && (
              <div className="mt-4">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {t("superadmin", "viewAsPickUser")}
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
                >
                  {targetsForMode.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                      {u.roleLabel ? ` · ${u.roleLabel}` : ""} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === "staff" && targetsForMode.length === 0 && !staffFallback && (
              <p className="mt-4 text-sm text-red-300">{t("superadmin", "viewAsNoStaff")}</p>
            )}
            {mode === "center" && targetsForMode.length === 0 && (
              <p className="mt-4 text-sm text-red-300">{t("superadmin", "viewAsNoManager")}</p>
            )}
            {mode === "student" && targetsForMode.length === 0 && (
              <p className="mt-4 text-sm text-red-300">{t("superadmin", "viewAsNoStudent")}</p>
            )}

            {(error || catalog) && error && (
              <p className="mt-3 text-sm text-red-300">{error}</p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
              >
                {t("superadmin", "centresConfirmCancel")}
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  (mode === "student" && targetsForMode.length === 0) ||
                  (mode === "center" && targetsForMode.length === 0) ||
                  (mode === "staff" && targetsForMode.length === 0)
                }
                onClick={() => void start()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {t("superadmin", "viewAsOpen")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
