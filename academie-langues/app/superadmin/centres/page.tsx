"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  RefreshCcw,
  Mail,
  MapPin,
  Search,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";
import {
  NEXA_OFFER_KEYS,
  NEXA_OFFERS,
  getOfferQuota,
  nexaOfferLabel,
  normalizeNexaOffer,
  type NexaOfferKey,
} from "../../data/nexaOffers";

type DerivedStatus =
  | "active"
  | "trial"
  | "trial_expired"
  | "subscription_expired"
  | "paused"
  | "revoked";

type CenterStats = {
  actifs: number;
  pauses: number;
  expires: number;
  termines: number;
  revoques: number;
  total: number;
};

type ManagerProfile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
};

type CenterManager = {
  role: string | null;
  role_label: string | null;
  profiles: ManagerProfile | null;
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
  creatorEmail?: string | null;
  managers?: CenterManager[];
  stats: CenterStats;
};

type StatusFilter = "all" | DerivedStatus;
type TypeFilter = "all" | "tcf" | "native";

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "active",
  "paused",
  "trial",
  "trial_expired",
  "subscription_expired",
  "revoked",
];

const OFFER_BADGE: Record<string, string> = {
  decouverte: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  croissance: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pro: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  entreprise: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  custom: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  none: "bg-slate-700/40 text-slate-400 border-slate-600/40",
};

const DERIVED_STATUS_BADGE: Record<DerivedStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  trial: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  trial_expired: "bg-red-500/10 text-red-300 border-red-500/20",
  subscription_expired: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  paused: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  revoked: "bg-red-500/10 text-red-400 border-red-500/20",
};

function managerEmail(center: CenterRow): string | null {
  const fromManager = center.managers?.find((m) => m.profiles?.email)?.profiles?.email;
  return fromManager || center.creatorEmail || center.email || null;
}

function formatQuotaValue(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "∞";
  return `${value}${suffix}`;
}

function OfferFormModal({
  center,
  mode,
  onClose,
  onSuccess,
}: {
  center: CenterRow;
  mode: "activate" | "change";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const initialOffer = normalizeNexaOffer(center.nexa_offer) ?? "decouverte";
  const [offer, setOffer] = useState<NexaOfferKey>(initialOffer);
  const [amount, setAmount] = useState("");
  const [periodMonths, setPeriodMonths] = useState(String(center.subscription_period_months ?? 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cfg = offer !== "custom" ? NEXA_OFFERS[offer as Exclude<NexaOfferKey, "custom">] : null;
    if (center.subscription_amount != null && mode === "change") {
      setAmount(String(center.subscription_amount));
    } else if (cfg) {
      setAmount(String(cfg.monthlyFeeMin));
    } else {
      setAmount("");
    }
  }, [offer, center.subscription_amount, mode]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      nexa_offer: offer,
      subscription_period_months: Math.max(1, parseInt(periodMonths, 10) || 1),
    };
    const parsedAmount = parseInt(amount.replace(/\s/g, ""), 10);
    if (Number.isFinite(parsedAmount)) body.subscription_amount = parsedAmount;

    try {
      if (mode === "activate") {
        await superadminFetch(`/api/superadmin/centers/${center.id}/activate`, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else {
        await superadminFetch(`/api/superadmin/centers/${center.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "requestsActionImpossible"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">
              {mode === "activate" ? t("superadmin", "centresModalActivateTitle") : t("superadmin", "centresModalChangeOfferTitle")}
            </p>
            <h2 className="mt-1 text-lg font-black text-white">{center.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "centresModalOfferLabel")}
            </label>
            <select
              value={offer}
              onChange={(e) => setOffer(e.target.value as NexaOfferKey)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            >
              {NEXA_OFFER_KEYS.map((key) => (
                <option key={key} value={key}>
                  {NEXA_OFFERS[key].name}
                </option>
              ))}
              <option value="custom">{t("superadmin", "centresModalOfferCustom")}</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "centresModalAmountLabel")}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              placeholder="FCFA"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "centresModalPeriodLabel")}
            </label>
            <input
              type="number"
              min={1}
              value={periodMonths}
              onChange={(e) => setPeriodMonths(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
          )}

          <button
            onClick={() => void submit()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "activate" ? t("superadmin", "centresActionActivate") : t("superadmin", "centresModalConfirmChange")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PauseModal({
  center,
  onClose,
  onSuccess,
}: {
  center: CenterRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await superadminFetch(`/api/superadmin/centers/${center.id}/pause`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "requestsActionImpossible"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-white">{t("superadmin", "centresModalPauseTitle")}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-400">{center.name}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("superadmin", "centresModalPauseReasonPlaceholder")}
          rows={3}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400 placeholder:text-slate-600"
        />
        {error && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>
        )}
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/90 px-4 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("superadmin", "centresActionPause")}
        </button>
      </div>
    </div>
  );
}

function CenterRowItem({
  center,
  busy,
  onActivate,
  onChangeOffer,
  onPause,
  onResume,
  onRevoke,
  onReject,
}: {
  center: CenterRow;
  busy: boolean;
  onActivate: (c: CenterRow) => void;
  onChangeOffer: (c: CenterRow) => void;
  onPause: (c: CenterRow) => void;
  onResume: (c: CenterRow) => void;
  onRevoke: (c: CenterRow) => void;
  onReject: (c: CenterRow) => void;
}) {
  const { t } = useI18n();
  const email = managerEmail(center);
  const isTcf = center.center_type === "tcf_canada";
  const offerKey = normalizeNexaOffer(center.nexa_offer);
  const offerBadgeKey = offerKey ?? "none";
  const offerCfg = offerKey && offerKey !== "custom" ? NEXA_OFFERS[offerKey] : null;
  const overrides = center.quota_overrides;
  const campus = offerKey ? getOfferQuota(offerKey, "maxCampus", overrides) : null;
  const tutor = offerKey ? getOfferQuota(offerKey, "tutorInteractionsPerStudent", overrides) : null;
  const live = offerKey ? getOfferQuota(offerKey, "liveHoursPerStudent", overrides) : null;

  const btnClass =
    "flex shrink-0 items-center gap-1 rounded-xl border border-white/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-50";

  const actions: React.ReactNode[] = [];
  switch (center.derived_status) {
    case "trial":
    case "trial_expired":
      actions.push(
        <button key="activate" disabled={busy} onClick={() => onActivate(center)} className={`${btnClass} text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10`}>
          {t("superadmin", "centresActionActivate")}
        </button>,
        <button key="reject" disabled={busy} onClick={() => onReject(center)} className={`${btnClass} text-red-300 hover:border-red-500/40 hover:bg-red-500/10`}>
          {t("superadmin", "centresActionReject")}
        </button>,
      );
      break;
    case "active":
      actions.push(
        <button key="offer" disabled={busy} onClick={() => onChangeOffer(center)} className={`${btnClass} text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/10`}>
          {t("superadmin", "centresActionChangeOffer")}
        </button>,
        <button key="pause" disabled={busy} onClick={() => onPause(center)} className={`${btnClass} text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10`}>
          {t("superadmin", "centresActionPause")}
        </button>,
        <button key="revoke" disabled={busy} onClick={() => onRevoke(center)} className={`${btnClass} text-red-300 hover:border-red-500/40 hover:bg-red-500/10`}>
          {t("superadmin", "centresActionRevoke")}
        </button>,
      );
      break;
    case "paused":
      actions.push(
        <button key="resume" disabled={busy} onClick={() => onResume(center)} className={`${btnClass} text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10`}>
          {t("superadmin", "centresActionResume")}
        </button>,
        <button key="offer" disabled={busy} onClick={() => onChangeOffer(center)} className={`${btnClass} text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/10`}>
          {t("superadmin", "centresActionChangeOffer")}
        </button>,
      );
      break;
    case "subscription_expired":
      actions.push(
        <button key="resume" disabled={busy} onClick={() => onResume(center)} className={`${btnClass} text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10`}>
          {t("superadmin", "centresActionResume")}
        </button>,
        <button key="revoke" disabled={busy} onClick={() => onRevoke(center)} className={`${btnClass} text-red-300 hover:border-red-500/40 hover:bg-red-500/10`}>
          {t("superadmin", "centresActionRevoke")}
        </button>,
      );
      break;
    case "revoked":
      actions.push(
        <button key="reactivate" disabled={busy} onClick={() => onActivate(center)} className={`${btnClass} text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10`}>
          {t("superadmin", "centresActionReactivate")}
        </button>,
      );
      break;
  }

  const derivedStatusKey: Record<DerivedStatus, keyof typeof import("../../i18n/messages/superadmin").superadmin.fr> = {
    active: "centresDerivedStatus_active",
    trial: "centresDerivedStatus_trial",
    trial_expired: "centresDerivedStatus_trial_expired",
    subscription_expired: "centresDerivedStatus_subscription_expired",
    paused: "centresDerivedStatus_paused",
    revoked: "centresDerivedStatus_revoked",
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0a0f1c] p-4 lg:flex-row lg:items-center">
      {/* Left: center info */}
      <div className="min-w-0 flex-1 lg:max-w-[28%]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black text-white">{center.name}</h3>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${isTcf ? "border-blue-500/25 bg-blue-500/10 text-blue-300" : "border-violet-500/25 bg-violet-500/10 text-violet-300"}`}>
            {isTcf ? t("superadmin", "centresTypeTcf") : t("superadmin", "centresTypeNative")}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {center.city}
          {center.code && <span className="font-mono text-slate-600">· {center.code}</span>}
        </p>
        {email && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Mail className="h-3 w-3 shrink-0 text-orange-400/70" />
            <span className="truncate">{email}</span>
          </p>
        )}
      </div>

      {/* Middle: offer & quotas */}
      <div className="min-w-0 flex-1 lg:max-w-[32%]">
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${OFFER_BADGE[offerBadgeKey] ?? OFFER_BADGE.none}`}>
          {offerKey ? nexaOfferLabel(offerKey) : t("superadmin", "centresNoOffer")}
        </span>
        {(offerCfg || offerKey === "custom") && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {t("superadmin", "centresQuotaCampus")}: {formatQuotaValue(campus as number | null)}
            </span>
            <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {t("superadmin", "centresQuotaTutor")}: {formatQuotaValue(tutor as number | null)}
            </span>
            <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">
              {t("superadmin", "centresQuotaLive")}: {live == null ? "∞" : `${live}h`}
            </span>
          </div>
        )}
      </div>

      {/* Right: students, status, actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:min-w-[36%]">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Users className="h-3.5 w-3.5" />
          <span className="font-black text-white">{center.stats.total}</span>
          <span className="text-slate-600">{t("superadmin", "centresStudentsLabel")}</span>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${DERIVED_STATUS_BADGE[center.derived_status]}`}>
          {t("superadmin", derivedStatusKey[center.derived_status])}
        </span>
        <div className="flex flex-wrap gap-1.5">{actions}</div>
      </div>
    </div>
  );
}

export default function SuperadminCentresPage() {
  return (
    <Suspense fallback={null}>
      <SuperadminCentresPageContent />
    </Suspense>
  );
}

function SuperadminCentresPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<{ center: CenterRow; mode: "activate" | "change" } | null>(null);
  const [pauseModal, setPauseModal] = useState<CenterRow | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status && STATUS_FILTERS.includes(status as StatusFilter)) {
      setStatusFilter(status as StatusFilter);
    }
  }, [searchParams]);

  const loadCenters = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
      setCenters(json.centers || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

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
      counts[c.derived_status]++;
    }
    return counts;
  }, [centers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centers.filter((c) => {
      if (statusFilter !== "all" && c.derived_status !== statusFilter) return false;
      if (typeFilter === "tcf" && c.center_type !== "tcf_canada") return false;
      if (typeFilter === "native" && c.center_type === "tcf_canada") return false;
      if (q) {
        const hay = `${c.name} ${c.code ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [centers, statusFilter, typeFilter, search]);

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setActionId(id);
    try {
      await fn();
      await loadCenters(true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("superadmin", "requestsActionImpossible"));
    } finally {
      setActionId(null);
    }
  };

  const handleResume = (center: CenterRow) => {
    if (!window.confirm(t("superadmin", "centresConfirmResume", { name: center.name }))) return;
    void runAction(center.id, () =>
      superadminFetch(`/api/superadmin/centers/${center.id}/resume`, { method: "POST", body: "{}" }),
    );
  };

  const handleRevoke = (center: CenterRow) => {
    if (!window.confirm(t("superadmin", "centresConfirmRevoke", { name: center.name }))) return;
    void runAction(center.id, () =>
      superadminFetch(`/api/superadmin/centers/${center.id}/revoke`, { method: "POST", body: "{}" }),
    );
  };

  const handleReject = (center: CenterRow) => {
    if (!window.confirm(t("superadmin", "centresConfirmReject", { name: center.name }))) return;
    void runAction(center.id, () =>
      superadminFetch(`/api/superadmin/centers/${center.id}/revoke`, { method: "POST", body: "{}" }),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "centresTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "centresSubtitle")}</p>
        </div>
        <button
          onClick={() => void loadCenters(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("superadmin", "analyticsRefresh")}
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((key) => {
          const active = statusFilter === key;
          const count = key === "all" ? statusCounts.all : statusCounts[key];
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                active
                  ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                  : "border-white/10 bg-[#0a0f1c] text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              {filterLabel(key)}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-orange-500/30 text-orange-200" : "bg-white/5 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
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

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("superadmin", "centersLoading")}
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-slate-700" />
          <p className="font-bold text-slate-400">{t("superadmin", "centresEmptyFiltered")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((center) => (
            <CenterRowItem
              key={center.id}
              center={center}
              busy={actionId === center.id}
              onActivate={(c) => setOfferModal({ center: c, mode: "activate" })}
              onChangeOffer={(c) => setOfferModal({ center: c, mode: "change" })}
              onPause={setPauseModal}
              onResume={handleResume}
              onRevoke={handleRevoke}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}
