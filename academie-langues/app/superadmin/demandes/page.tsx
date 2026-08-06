"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  RefreshCcw,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  ShieldOff,
  Globe,
  MapPin,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { centerTrialRemainingMs } from "../../utils/center-trial";
import { findAfricaCountry } from "../../data/africa-54";
import { FicheField, FicheSection } from "../_components/fiche";
import { NEXA_OFFERS, nexaOfferLabel } from "../../data/nexaOffers";
import { centerTypeLabel } from "../../data/center-types";
import { useI18n } from "../../i18n/I18nProvider";

type PendingCenterManager = {
  role: string | null;
  role_label: string | null;
  profiles: {
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
  } | null;
};

type PendingCenter = {
  id: string;
  name: string;
  city: string;
  code: string | null;
  signup_slug?: string | null;
  address: string | null;
  country: string | null;
  region: string | null;
  center_type: string | null;
  nexa_offer?: string | null;
  status: "active" | "suspended" | "pending" | "rejected";
  email: string | null;
  phone: string | null;
  created_at: string;
  managers: PendingCenterManager[];
  creatorEmail?: string | null;
};

type CenterDetail = {
  center: PendingCenter;
  managers: PendingCenterManager[];
  creatorEmail: string | null;
};

function formatTrialRemaining(createdAt: string, expiredLabel: string, minutesLabel: string, hoursLabel: string): { label: string; expired: boolean } {
  const remainingMs = centerTrialRemainingMs(createdAt);
  if (remainingMs <= 0) return { label: expiredLabel, expired: true };
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
    return { label: minutesLabel.replace("{count}", String(minutes)), expired: false };
  }
  return { label: hoursLabel.replace("{count}", String(hours)), expired: false };
}

function formatCountry(codeOrName: string | null | undefined) {
  if (!codeOrName) return null;
  const c = findAfricaCountry(codeOrName);
  return c ? `${c.flag} ${c.name}` : codeOrName;
}

function managerFrom(center: PendingCenter, detail?: CenterDetail | null) {
  const managers = detail?.managers?.length ? detail.managers : center.managers;
  const m = managers[0];
  const prenom = m?.profiles?.prenom || null;
  const nom = m?.profiles?.nom || null;
  const fullName = [prenom, nom].filter(Boolean).join(" ") || null;
  const email =
    m?.profiles?.email ||
    detail?.creatorEmail ||
    center.creatorEmail ||
    center.email ||
    null;
  const phone = m?.profiles?.phone || center.phone || null;
  const role = m?.role_label || m?.profiles?.job_title || null;
  return { prenom, nom, fullName, email, phone, role };
}

function FormAnswer({ label, value }: { label: string; value?: string | null }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white break-words">
        {value?.trim() ? value : <span className="text-slate-600">{t("superadmin", "requestsNotProvided")}</span>}
      </p>
    </div>
  );
}

function CandidatureFicheModal({
  centerId,
  fallback,
  onClose,
}: {
  centerId: string;
  fallback: PendingCenter;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const [detail, setDetail] = useState<CenterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await superadminFetch<CenterDetail>(`/api/superadmin/centers/${centerId}`);
        if (!cancelled) setDetail(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || t("superadmin", "requestsDetailLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [centerId]);

  const center = detail?.center || fallback;
  const manager = managerFrom(fallback, detail);
  const trial = formatTrialRemaining(center.created_at, t("superadmin", "requestsTrialExpired"), t("superadmin", "requestsMinutesRemaining"), t("superadmin", "requestsHoursRemaining"));
  const offerKey = center.nexa_offer || null;
  const offer = offerKey && offerKey in NEXA_OFFERS ? NEXA_OFFERS[offerKey as keyof typeof NEXA_OFFERS] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">{t("superadmin", "requestsApplicationFile")}</p>
            <h2 className="mt-1 text-xl font-black text-white">{center.name}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("superadmin", "requestsFormAnswers")} ·{" "}
              <span className={trial.expired ? "text-red-300" : "text-amber-300"}>{trial.label}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={t("superadmin", "requestsClose")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("superadmin", "requestsDetailLoading")}
          </p>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {error} — {t("superadmin", "requestsFallbackData")}
              </div>
            )}

            <div className="mt-6 space-y-5">
              <section>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400/70">
                  1 · {t("superadmin", "requestsChosenProgram")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormAnswer label={t("superadmin", "requestsTrainingType")} value={centerTypeLabel(center.center_type)} />
                  <FormAnswer label={t("superadmin", "requestsTechnicalCode")} value={center.center_type} />
                </div>
              </section>

              <section>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400/70">
                  2 · {t("superadmin", "requestsInstitution")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormAnswer label={t("superadmin", "requestsCenterName")} value={center.name} />
                  <FormAnswer label={t("superadmin", "requestsCountry")} value={formatCountry(center.country)} />
                  <FormAnswer label={t("superadmin", "requestsRegion")} value={center.region} />
                  <FormAnswer label={t("superadmin", "requestsCity")} value={center.city} />
                  <FormAnswer label={t("superadmin", "requestsPhone")} value={center.phone} />
                  <FormAnswer label={t("superadmin", "requestsAddress")} value={center.address} />
                  <FormAnswer label={t("superadmin", "requestsOfferOptional")} value={nexaOfferLabel(center.nexa_offer)} />
                  {offer && (
                    <FormAnswer
                      label={t("superadmin", "requestsOfferDetails")}
                      value={`${offer.monthlyFee.toLocaleString("fr-FR")} FCFA/mois · max ${offer.maxStudents} étudiants · ${offer.maxLives} lives`}
                    />
                  )}
                </div>
              </section>

              <section>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400/70">
                  3 · {t("superadmin", "requestsAccountManager")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormAnswer label={t("superadmin", "requestsFirstName")} value={manager.prenom} />
                  <FormAnswer label={t("superadmin", "requestsLastName")} value={manager.nom} />
                  <FormAnswer label={t("superadmin", "requestsEmail")} value={manager.email} />
                  <FormAnswer label={t("superadmin", "requestsRole")} value={manager.role} />
                  <FormAnswer label={t("superadmin", "requestsContactPhone")} value={manager.phone} />
                  <FormAnswer label={t("superadmin", "requestsPassword")} value={t("superadmin", "requestsPasswordHidden")} />
                </div>
              </section>

              <section>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400/70">
                  {t("superadmin", "requestsPlatformMetadata")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormAnswer
                    label={t("superadmin", "requestsRequestDate")}
                    value={new Date(center.created_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                  <FormAnswer label={t("superadmin", "requestsStatus")} value={center.status} />
                  <FormAnswer label={t("superadmin", "requestsCenterCode")} value={center.code} />
                  <FormAnswer label="Slug" value={center.signup_slug || null} />
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PendingCenterCard({
  center,
  busy,
  onActivate,
  onReject,
  onOpenFiche,
}: {
  center: PendingCenter;
  busy: boolean;
  onActivate: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
  onOpenFiche: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const trial = formatTrialRemaining(center.created_at, t("superadmin", "requestsTrialExpired"), t("superadmin", "requestsMinutesRemaining"), t("superadmin", "requestsHoursRemaining"));
  const manager = managerFrom(center);
  const countryLabel = formatCountry(center.country);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-white">{center.name}</h3>
            <span
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                trial.expired ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"
              }`}
            >
              <Clock className="h-2.5 w-2.5" /> {trial.label}
            </span>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {t("superadmin", "requestsCreatedOn")}{" "}
            {new Date(center.created_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {centerTypeLabel(center.center_type)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onOpenFiche(center.id)}
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-orange-500/40 hover:text-orange-300"
          >
            <FileText className="h-3.5 w-3.5" /> {t("superadmin", "requestsApplicationFile")}
          </button>
          <button
            onClick={() => onActivate(center.id, center.name)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500 hover:text-white disabled:opacity-50"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> {t("superadmin", "requestsActivate")}
          </button>
          <button
            onClick={() => onReject(center.id, center.name)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50"
          >
            <ShieldOff className="h-3.5 w-3.5" /> {t("superadmin", "requestsReject")}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <FicheSection label={t("superadmin", "requestsCenterForm")}>
          <FicheField label={t("superadmin", "requestsType")} value={centerTypeLabel(center.center_type)} />
          <FicheField label={t("superadmin", "requestsOffer")} value={nexaOfferLabel(center.nexa_offer)} />
          <FicheField label={t("superadmin", "requestsCityShort")} value={center.city} icon={<MapPin className="h-3 w-3 text-slate-500" />} />
          <FicheField label={t("superadmin", "requestsRegion")} value={center.region} />
          <FicheField
            label={t("superadmin", "requestsCountryShort")}
            value={countryLabel}
            icon={!findAfricaCountry(center.country || "") && center.country ? <Globe className="h-3 w-3 text-slate-500" /> : undefined}
          />
          <FicheField label={t("superadmin", "requestsPhone")} value={center.phone} icon={<Phone className="h-3 w-3 text-orange-400" />} />
          <FicheField label={t("superadmin", "requestsCenterEmail")} value={center.email || center.creatorEmail} icon={<Mail className="h-3 w-3 text-orange-400" />} />
          <FicheField label={t("superadmin", "requestsAddress")} value={center.address} span />
          {center.code && <FicheField label={t("superadmin", "requestsCenterCode")} value={center.code} mono span />}
        </FicheSection>

        <FicheSection label={t("superadmin", "requestsManagerForm")}>
          <FicheField label={t("superadmin", "requestsFirstNameShort")} value={manager.prenom} />
          <FicheField label={t("superadmin", "requestsLastNameShort")} value={manager.nom} />
          <FicheField label={t("superadmin", "requestsFullName")} value={manager.fullName} />
          <FicheField label={t("superadmin", "requestsRoleShort")} value={manager.role} />
          <FicheField label="Email" value={manager.email} icon={<Mail className="h-3 w-3 text-orange-400" />} />
          <FicheField label={t("superadmin", "requestsPhone")} value={manager.phone} icon={<Phone className="h-3 w-3 text-orange-400" />} />
        </FicheSection>
      </div>
    </div>
  );
}

export default function SuperadminDemandesPage() {
  const { t } = useI18n();
  const [pendingCenters, setPendingCenters] = useState<PendingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [ficheCenterId, setFicheCenterId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const centersJson = await superadminFetch<{ centers: PendingCenter[] }>("/api/superadmin/centers");
      setPendingCenters((centersJson.centers || []).filter((c) => c.status === "pending"));
    } catch (e: any) {
      setError(e.message || t("superadmin", "requestsLoadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decideCenter = async (id: string, name: string, nextStatus: "active" | "rejected") => {
    const confirmMsg =
      nextStatus === "active"
        ? t("superadmin", "requestsConfirmActivate", { name })
        : t("superadmin", "requestsConfirmReject", { name });
    if (!window.confirm(confirmMsg)) return;

    setActionId(id);
    try {
      await superadminFetch(`/api/superadmin/centers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load(true);
    } catch (e: any) {
      alert(e.message || t("superadmin", "requestsActionImpossible"));
    } finally {
      setActionId(null);
    }
  };

  const sortedPendingCenters = useMemo(
    () => [...pendingCenters].sort((a, b) => centerTrialRemainingMs(a.created_at) - centerTrialRemainingMs(b.created_at)),
    [pendingCenters]
  );

  const ficheFallback = ficheCenterId
    ? sortedPendingCenters.find((c) => c.id === ficheCenterId) || null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "requestsTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t("superadmin", "requestsCount", { count: sortedPendingCenters.length })}
          </p>
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
        <p className="py-10 text-center text-sm text-slate-500">{t("superadmin", "requestsLoading")}</p>
      ) : sortedPendingCenters.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-slate-700" />
          <p className="font-bold text-slate-400">{t("superadmin", "requestsEmpty")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedPendingCenters.map((center) => (
            <PendingCenterCard
              key={center.id}
              center={center}
              busy={actionId === center.id}
              onActivate={(id, name) => decideCenter(id, name, "active")}
              onReject={(id, name) => decideCenter(id, name, "rejected")}
              onOpenFiche={setFicheCenterId}
            />
          ))}
        </div>
      )}

      {ficheCenterId && ficheFallback && (
        <CandidatureFicheModal
          centerId={ficheCenterId}
          fallback={ficheFallback}
          onClose={() => setFicheCenterId(null)}
        />
      )}
    </div>
  );
}
