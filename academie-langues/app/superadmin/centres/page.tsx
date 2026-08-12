"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, ChevronRight, Inbox, Loader2, RefreshCcw, Search } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";
import { useActionFeedback } from "../../components/ActionFeedback";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { CenterDetailPanel, type DerivedStatus } from "../_components/CenterDetailPanel";
import { OfferFormModal } from "../_components/OfferFormModal";
import { PauseModal } from "../_components/PauseModal";

type CenterStats = {
  actifs: number;
  pauses: number;
  expires: number;
  termines: number;
  revoques: number;
  total: number;
};

type CenterRow = {
  id: string;
  name: string;
  city: string;
  code: string | null;
  center_type: string | null;
  nexa_offer?: string | null;
  status: string;
  email: string | null;
  created_at: string;
  subscription_amount?: number | null;
  subscription_period_months?: number | null;
  quota_overrides?: Record<string, unknown> | null;
  derived_status: DerivedStatus;
  stats: CenterStats;
};

type StatusFilter = "all" | DerivedStatus;
type TypeFilter = "all" | "tcf" | "native";

type ConfirmState = {
  type: "resume" | "revoke" | "reject";
  center: CenterRow;
};

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "active",
  "paused",
  "trial",
  "trial_expired",
  "subscription_expired",
  "revoked",
];

const DERIVED_STATUS_BADGE: Record<DerivedStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-300",
  trial: "bg-amber-500/10 text-amber-300",
  trial_expired: "bg-red-500/10 text-red-300",
  subscription_expired: "bg-orange-500/10 text-orange-300",
  paused: "bg-slate-700/40 text-slate-300",
  revoked: "bg-red-500/10 text-red-400",
};

export default function SuperadminCentresPage() {
  return (
    <Suspense fallback={null}>
      <SuperadminCentresPageContent />
    </Suspense>
  );
}

function SuperadminCentresPageContent() {
  const { t } = useI18n();
  const feedback = useActionFeedback();
  const searchParams = useSearchParams();
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<{ center: CenterRow; mode: "activate" | "change" } | null>(null);
  const [pauseModal, setPauseModal] = useState<CenterRow | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && STATUS_FILTERS.includes(status as StatusFilter)) {
      setStatusFilter(status as StatusFilter);
    }
    const focus = searchParams.get("focus");
    if (focus) setSelectedId(focus);
  }, [searchParams]);

  const loadCenters = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const json = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
        const list = json.centers || [];
        setCenters(list);
        if (silent) setDetailRefreshKey((key) => key + 1);
        if (selectedId && !list.some((c) => c.id === selectedId)) {
          setSelectedId(null);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedId, t],
  );

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: centers.length,
      active: 0,
      paused: 0,
      trial: 0,
      trial_expired: 0,
      subscription_expired: 0,
      revoked: 0,
    };
    for (const c of centers) {
      // Sécurité : un pending ne doit jamais gonfler « Actifs »
      if (c.status === "pending") {
        if (c.derived_status === "trial_expired") counts.trial_expired++;
        else counts.trial++;
        continue;
      }
      if (c.derived_status in counts) counts[c.derived_status as Exclude<StatusFilter, "all">]++;
    }
    return counts;
  }, [centers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centers.filter((c) => {
      if (statusFilter === "trial") {
        const enDemande =
          c.status === "pending"
            ? c.derived_status !== "trial_expired"
            : c.derived_status === "trial";
        if (!enDemande) return false;
      } else if (statusFilter === "trial_expired") {
        if (c.derived_status !== "trial_expired") return false;
      } else if (statusFilter === "active") {
        // Ne jamais lister un pending dans Actifs
        if (c.status === "pending" || c.derived_status !== "active") return false;
      } else if (statusFilter !== "all" && c.derived_status !== statusFilter) {
        return false;
      }
      if (typeFilter === "tcf" && c.center_type !== "tcf_canada") return false;
      if (typeFilter === "native" && c.center_type === "tcf_canada") return false;
      if (q) {
        const hay = `${c.name} ${c.code ?? ""} ${c.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [centers, statusFilter, typeFilter, search]);

  const selectedRow = centers.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const runAction = async (
    id: string,
    fn: () => Promise<void>,
    successTitle: string,
    successMessage: string,
  ) => {
    setActionId(id);
    const result = await feedback.run(fn, {
      successTitle,
      successMessage,
      errorTitle: t("superadmin", "requestsActionImpossible"),
    });
    if (result.ok) await loadCenters(true);
    setActionId(null);
    return result.ok;
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { type, center } = confirm;
    setConfirm(null);
    const path =
      type === "resume"
        ? `/api/superadmin/centers/${center.id}/resume`
        : `/api/superadmin/centers/${center.id}/revoke`;
    const successTitle =
      type === "resume"
        ? t("superadmin", "centresResumeSuccess")
        : type === "revoke"
          ? t("superadmin", "centresRevokeSuccess")
          : t("superadmin", "centresRejectSuccess");
    const successMessage =
      type === "resume"
        ? t("superadmin", "centresResumeSuccessMsg", { name: center.name })
        : type === "revoke"
          ? t("superadmin", "centresRevokeSuccessMsg", { name: center.name })
          : t("superadmin", "centresRejectSuccessMsg", { name: center.name });
    await runAction(
      center.id,
      () => superadminFetch(path, { method: "POST", body: "{}" }),
      successTitle,
      successMessage,
    );
  };

  const filterLabel = (key: StatusFilter) => {
    const map: Record<StatusFilter, string> = {
      all: t("superadmin", "centresFilterAll"),
      active: t("superadmin", "centresFilterActive"),
      paused: t("superadmin", "centresFilterPaused"),
      trial: t("superadmin", "centresFilterTrial"),
      trial_expired: t("superadmin", "centresFilterTrialExpired"),
      subscription_expired: t("superadmin", "centresFilterSubscriptionExpired"),
      revoked: t("superadmin", "centresFilterRevoked"),
    };
    return map[key];
  };

  const derivedKey = (status: DerivedStatus) =>
    `centresDerivedStatus_${status}` as keyof typeof import("../../i18n/messages/superadmin").superadmin.fr;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "centresTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "centresSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadCenters(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("superadmin", "analyticsRefresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((key) => {
          const active = statusFilter === key;
          const count = key === "all" ? statusCounts.all : statusCounts[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                active
                  ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                  : "border-white/10 bg-[#0a0f1c] text-slate-400 hover:border-white/20"
              }`}
            >
              {filterLabel(key)}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-orange-500/30" : "bg-white/5"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-xl border border-white/10 bg-[#0a0f1c] px-3 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-orange-400"
        >
          <option value="all">{t("superadmin", "centresFilterTypeAll")}</option>
          <option value="tcf">{t("superadmin", "centresFilterTypeTcf")}</option>
          <option value="native">{t("superadmin", "centresFilterTypeNative")}</option>
        </select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("superadmin", "centresSearchPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-[#0a0f1c] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-2 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("superadmin", "centersLoading")}
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-8 text-center">
              <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm font-black text-white">{t("superadmin", "centresEmptyTitle")}</p>
              <p className="mt-1 text-xs text-slate-500">{t("superadmin", "centresEmptyHint")}</p>
            </div>
          ) : (
            filtered.map((center) => {
              const selected = center.id === selectedId;
              const isTcf = center.center_type === "tcf_canada";
              return (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => setSelectedId(center.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-orange-500/40 bg-orange-500/10"
                      : "border-white/10 bg-[#0a0f1c] hover:border-white/20"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-black text-white">{center.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                          isTcf ? "bg-blue-500/15 text-blue-300" : "bg-violet-500/15 text-violet-300"
                        }`}
                      >
                        {isTcf ? t("superadmin", "centresTypeTcf") : t("superadmin", "centresTypeNative")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {center.city}
                      {" · "}
                      <span className="font-bold text-emerald-400/90">{center.stats.actifs}</span>
                      {" "}
                      {t("superadmin", "centersStatActive")}
                      {" / "}
                      <span className="font-bold text-slate-300">{center.stats.total}</span>
                      {" "}
                      {t("superadmin", "centresStudentsLabel")}
                    </p>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                        DERIVED_STATUS_BADGE[
                          center.status === "pending" && center.derived_status === "active"
                            ? "trial"
                            : center.derived_status
                        ] ?? DERIVED_STATUS_BADGE.trial
                      }`}
                    >
                      {t(
                        "superadmin",
                        derivedKey(
                          center.status === "pending" && center.derived_status === "active"
                            ? "trial"
                            : center.derived_status,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-300">
                      {center.stats.actifs}
                    </span>
                    <ChevronRight className={`h-4 w-4 ${selected ? "text-orange-400" : "text-slate-600"}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="min-w-0 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
          <CenterDetailPanel
            centerId={selectedId}
            listRow={selectedRow}
            refreshKey={detailRefreshKey}
            actionBusy={actionId === selectedId}
            onActivate={() => {
              if (selectedRow) setOfferModal({ center: selectedRow, mode: "activate" });
            }}
            onChangeOffer={() => {
              if (selectedRow) setOfferModal({ center: selectedRow, mode: "change" });
            }}
            onPause={() => {
              if (selectedRow) setPauseModal(selectedRow);
            }}
            onResume={() => {
              if (selectedRow) setConfirm({ type: "resume", center: selectedRow });
            }}
            onRevoke={() => {
              if (selectedRow) setConfirm({ type: "revoke", center: selectedRow });
            }}
            onReject={() => {
              if (selectedRow) setConfirm({ type: "reject", center: selectedRow });
            }}
          />
        </div>
      </div>

      {offerModal && (
        <OfferFormModal
          center={offerModal.center}
          mode={offerModal.mode}
          onClose={() => setOfferModal(null)}
          onSuccess={() => void loadCenters(true)}
        />
      )}

      {pauseModal && (
        <PauseModal
          center={pauseModal}
          onClose={() => setPauseModal(null)}
          onSuccess={() => void loadCenters(true)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.type === "resume"
              ? t("superadmin", "centresConfirmResumeTitle")
              : confirm.type === "revoke"
                ? t("superadmin", "centresConfirmRevokeTitle")
                : t("superadmin", "centresConfirmRejectTitle")
          }
          message={
            confirm.type === "resume"
              ? t("superadmin", "centresConfirmResume", { name: confirm.center.name })
              : confirm.type === "revoke"
                ? t("superadmin", "centresConfirmRevoke", { name: confirm.center.name })
                : t("superadmin", "centresConfirmReject", { name: confirm.center.name })
          }
          confirmLabel={
            confirm.type === "resume"
              ? t("superadmin", "centresActionResume")
              : confirm.type === "reject"
                ? t("superadmin", "centresActionReject")
                : t("superadmin", "centresActionRevoke")
          }
          cancelLabel={t("superadmin", "centresConfirmCancel")}
          variant={confirm.type === "resume" ? "primary" : "danger"}
          busy={actionId === confirm.center.id}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
