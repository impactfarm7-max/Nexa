"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, RefreshCcw, ShieldOff, ShieldCheck, Clock, ArrowRight, X, Mail, Phone, Globe } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { centerTrialRemainingMs } from "../../utils/center-trial";
import { findAfricaCountry } from "../../data/africa-54";
import { FicheField, FicheSection } from "../_components/fiche";
import {
  NEXA_OFFER_KEYS,
  NEXA_OFFERS,
  nexaOfferLabel,
  type NexaOfferKey,
} from "../../data/nexaOffers";

const CENTER_TYPE_LABEL: Record<string, string> = {
  tcf_canada: "TCF Canada",
  generic: "Centre Libre",
};

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
  address: string | null;
  country: string | null;
  region: string | null;
  center_type: string | null;
  nexa_offer?: string | null;
  status: "active" | "suspended" | "pending" | "rejected";
  email: string | null;
  phone: string | null;
  created_at: string;
  stats: CenterStats;
};

type CenterManager = {
  role?: string;
  role_label: string | null;
  profiles: { id: string; prenom: string | null; nom: string | null; email: string | null; phone: string | null; job_title: string | null; last_sign_in_at: string | null } | null;
};

type CenterStudent = {
  id: string;
  prenom: string | null;
  email: string | null;
  tag_status: string | null;
  subscription_ends_at: string | null;
  subscription_paused_at: string | null;
  pack_name: string | null;
  created_at: string;
};

type CenterDetail = {
  center: CenterRow;
  managers: CenterManager[];
  creatorEmail: string | null;
  students: CenterStudent[];
  stats: CenterStats;
};

function StatBadge({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide ${tone}`}>
      {value} {label}
    </span>
  );
}

function formatTrialRemaining(createdAt: string): { label: string; expired: boolean } {
  const remainingMs = centerTrialRemainingMs(createdAt);
  if (remainingMs <= 0) return { label: "Essai expiré", expired: true };
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
    return { label: `${minutes} min restantes`, expired: false };
  }
  return { label: `${hours}h restantes`, expired: false };
}

const STATUS_TEXT: Record<CenterRow["status"], string> = {
  active: "Actif",
  pending: "En attente",
  suspended: "Suspendu",
  rejected: "Rejeté",
};

function StatusPill({ status }: { status: CenterRow["status"] }) {
  if (status === "active") {
    return (
      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300">
        Actif
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
        En attente
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-300">
        Rejeté
      </span>
    );
  }
  return (
    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-300">
      Suspendu
    </span>
  );
}

/** Vue liste volontairement neutre : le detail (stats, essai, actions) n'apparait qu'au clic. */
function CenterCard({ center, onOpen }: { center: CenterRow; onOpen: (id: string) => void }) {
  const trial = center.status === "pending" ? formatTrialRemaining(center.created_at) : null;
  return (
    <button
      onClick={() => onOpen(center.id)}
      className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-[#0a0f1c] p-5 text-left transition-colors hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-black text-white">{center.name}</h3>
        <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {STATUS_TEXT[center.status]}
        </span>
      </div>
      <p className="flex items-center gap-1 text-xs text-slate-500">
        <MapPin className="h-3 w-3" /> {center.city}
        {center.code && <span className="ml-1 font-mono text-slate-600">· {center.code}</span>}
      </p>

      {trial && (
        <p className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${trial.expired ? "text-red-400/80" : "text-slate-500"}`}>
          <Clock className="h-3 w-3" /> {trial.label}
        </p>
      )}
    </button>
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
  const searchParams = useSearchParams();
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CenterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [offerUpdating, setOfferUpdating] = useState(false);

  const loadCenters = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
      setCenters(json.centers || []);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCenters();
  }, [loadCenters]);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const json = await superadminFetch<CenterDetail>(`/api/superadmin/centers/${id}`);
      setDetail(json);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement du centre.");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) openDetail(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const pendingCenters = centers.filter((c) => c.status === "pending");
  const activeCenters = centers.filter((c) => c.status === "active");
  const suspendedCenters = centers.filter((c) => c.status === "suspended");
  const rejectedCenters = centers.filter((c) => c.status === "rejected");
  const decidedCentersCount = activeCenters.length + suspendedCenters.length + rejectedCenters.length;

  const setCenterStatus = async (nextStatus: "active" | "suspended" | "rejected", confirmMsg: string) => {
    if (!detail) return;
    if (!window.confirm(confirmMsg)) return;

    setStatusUpdating(true);
    try {
      await superadminFetch(`/api/superadmin/centers/${detail.center.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setDetail({ ...detail, center: { ...detail.center, status: nextStatus } });
      setCenters((prev) => prev.map((c) => (c.id === detail.center.id ? { ...c, status: nextStatus } : c)));
    } catch (e: any) {
      alert(e.message || "Action impossible.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const setCenterOffer = async (nextOffer: NexaOfferKey | null) => {
    if (!detail) return;
    const label = nextOffer ? NEXA_OFFERS[nextOffer].name : "aucune (non attribuée)";
    if (!window.confirm(`Attribuer l'offre « ${label} » au centre "${detail.center.name}" ? Les plafonds s'appliquent immédiatement.`)) {
      return;
    }
    setOfferUpdating(true);
    try {
      const json = await superadminFetch<{ center: CenterRow }>(`/api/superadmin/centers/${detail.center.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nexa_offer: nextOffer }),
      });
      const offer = json.center.nexa_offer ?? null;
      setDetail({ ...detail, center: { ...detail.center, nexa_offer: offer } });
      setCenters((prev) =>
        prev.map((c) => (c.id === detail.center.id ? { ...c, nexa_offer: offer } : c))
      );
    } catch (e: any) {
      alert(e.message || "Attribution impossible.");
    } finally {
      setOfferUpdating(false);
    }
  };

  const toggleStatus = () => {
    if (!detail) return;
    if (detail.center.status === "active") {
      setCenterStatus(
        "suspended",
        `Suspendre l'accès du centre "${detail.center.name}" ? Le personnel et les étudiants ne pourront plus se connecter.`
      );
    } else {
      setCenterStatus("active", `Réactiver l'accès du centre "${detail.center.name}" ?`);
    }
  };

  const reexamineRejectedCenter = () => {
    if (!detail) return;
    setCenterStatus(
      "active",
      `Réexaminer et activer le centre "${detail.center.name}" ? Son accès à la plateforme sera rétabli.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Centres</h1>
          <p className="mt-1 text-sm text-slate-400">
            {decidedCentersCount} centre(s) sur le réseau Nexa.
            {pendingCenters.length > 0 && (
              <Link href="/superadmin/demandes" className="ml-1 font-bold text-amber-400 hover:underline">
                {pendingCenters.length} en essai à traiter →
              </Link>
            )}
          </p>
        </div>
        <button
          onClick={() => loadCenters(true)}
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
        <p className="py-10 text-center text-sm text-slate-500">Chargement des centres...</p>
      ) : decidedCentersCount === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-slate-700" />
          <p className="font-bold text-slate-400">Aucun centre validé pour l&apos;instant</p>
          {pendingCenters.length > 0 && (
            <Link href="/superadmin/demandes" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-400 hover:underline">
              Voir les {pendingCenters.length} centre(s) en essai <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {activeCenters.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Actifs ({activeCenters.length})
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeCenters.map((center) => (
                  <CenterCard key={center.id} center={center} onOpen={openDetail} />
                ))}
              </div>
            </div>
          )}

          {suspendedCenters.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Suspendus ({suspendedCenters.length})
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suspendedCenters.map((center) => (
                  <CenterCard key={center.id} center={center} onOpen={openDetail} />
                ))}
              </div>
            </div>
          )}

          {rejectedCenters.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Rejetés ({rejectedCenters.length})
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rejectedCenters.map((center) => (
                  <CenterCard key={center.id} center={center} onOpen={openDetail} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" onClick={() => setSelectedId(null)}>
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <p className="py-10 text-center text-sm text-slate-500">Chargement...</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-white">{detail.center.name}</h2>
                    <StatusPill status={detail.center.status} />
                    {detail.center.status === "pending" && (
                      <span
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                          formatTrialRemaining(detail.center.created_at).expired
                            ? "border-red-500/20 bg-red-500/10 text-red-300"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        <Clock className="h-2.5 w-2.5" /> {formatTrialRemaining(detail.center.created_at).label}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatBadge label="actifs" value={detail.stats.actifs} tone="bg-emerald-500/10 text-emerald-300" />
                  <StatBadge label="pause" value={detail.stats.pauses} tone="bg-amber-500/10 text-amber-300" />
                  <StatBadge label="expirés" value={detail.stats.expires} tone="bg-slate-700/40 text-slate-300" />
                  <StatBadge label="révoqués" value={detail.stats.revoques} tone="bg-red-500/10 text-red-300" />
                </div>

                <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <FicheSection label="Centre">
                    <FicheField
                      label="Type"
                      value={detail.center.center_type ? CENTER_TYPE_LABEL[detail.center.center_type] || detail.center.center_type : undefined}
                    />
                    <FicheField label="Ville" value={detail.center.city} icon={<MapPin className="h-3 w-3 text-slate-500" />} />
                    <FicheField label="Région" value={detail.center.region} />
                    <FicheField
                      label="Pays"
                      value={(() => {
                        if (!detail.center.country) return undefined;
                        const c = findAfricaCountry(detail.center.country);
                        return c ? `${c.flag} ${c.name}` : detail.center.country;
                      })()}
                      icon={detail.center.country && !findAfricaCountry(detail.center.country) ? <Globe className="h-3 w-3 text-slate-500" /> : undefined}
                    />
                    <FicheField label="Téléphone" value={detail.center.phone} icon={<Phone className="h-3 w-3 text-orange-400" />} />
                    <FicheField label="Email" value={detail.center.email} icon={<Mail className="h-3 w-3 text-orange-400" />} />
                    {detail.center.code && <FicheField label="Code centre" value={detail.center.code} mono />}
                    {detail.center.address && <FicheField label="Adresse" value={detail.center.address} span />}
                    <FicheField
                      label="Offre NEXA"
                      value={nexaOfferLabel(detail.center.nexa_offer)}
                      span
                    />
                  </FicheSection>

                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-orange-400/80">
                      Attribuer / changer l&apos;offre
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {NEXA_OFFER_KEYS.map((key) => {
                        const active = detail.center.nexa_offer === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={offerUpdating}
                            onClick={() => void setCenterOffer(key)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${
                              active
                                ? "bg-orange-500 text-white"
                                : "border border-white/10 bg-black/20 text-slate-300 hover:border-orange-500/40 hover:text-orange-300"
                            }`}
                          >
                            {NEXA_OFFERS[key].name}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={offerUpdating || !detail.center.nexa_offer}
                        onClick={() => void setCenterOffer(null)}
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                      >
                        Retirer
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {detail.center.nexa_offer
                        ? `${NEXA_OFFERS[detail.center.nexa_offer as NexaOfferKey]?.maxStudents ?? "—"} étudiants max · ${NEXA_OFFERS[detail.center.nexa_offer as NexaOfferKey]?.maxLives ?? "—"} lives`
                        : "Sans offre : Ultra pendant l'essai 72h ; attribuez une offre après validation."}
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-orange-400/70">
                      Responsable{detail.managers.length > 1 ? "s" : ""}
                    </p>
                    {(detail.creatorEmail || detail.center.email) && (
                      <div className="mb-3 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                        <FicheField
                          label="Email créateur / responsable"
                          value={detail.creatorEmail || detail.center.email}
                          icon={<Mail className="h-3 w-3 text-orange-400" />}
                        />
                      </div>
                    )}
                    {detail.managers.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun responsable enregistré.</p>
                    ) : (
                      <div className="space-y-3">
                        {detail.managers.map((m, i) => {
                          const fullName = [m.profiles?.prenom, m.profiles?.nom].filter(Boolean).join(" ");
                          const roleLabel = m.role_label || m.profiles?.job_title;
                          const managerEmail =
                            m.profiles?.email ||
                            (i === 0 ? detail.creatorEmail : null) ||
                            null;
                          return (
                            <div key={m.profiles?.id || i} className="rounded-lg border border-white/10 bg-black/20 p-3">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FicheField label="Nom complet" value={fullName} />
                                <FicheField label="Fonction" value={roleLabel} />
                                <FicheField label="Email" value={managerEmail} icon={<Mail className="h-3 w-3 text-orange-400" />} />
                                <FicheField label="Téléphone" value={m.profiles?.phone} icon={<Phone className="h-3 w-3 text-orange-400" />} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Étudiants récents ({detail.students.length})
                  </p>
                  <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                    {detail.students.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucun étudiant pour l&apos;instant.</p>
                    ) : (
                      detail.students.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-1.5 text-xs">
                          <span className="font-semibold text-slate-300">{s.prenom || s.email || "—"}</span>
                          <span className="text-slate-500">{s.tag_status || "actif"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  {detail.center.status === "pending" ? (
                    <Link
                      href="/superadmin/demandes"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-black text-amber-300 transition-opacity hover:bg-amber-500/20"
                    >
                      <Clock className="h-4 w-4" /> Ce centre est en essai — le traiter dans Demandes <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : detail.center.status === "rejected" ? (
                    <button
                      onClick={reexamineRejectedCenter}
                      disabled={statusUpdating}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300 transition-opacity hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" /> Réexaminer et activer
                    </button>
                  ) : (
                    <button
                      onClick={toggleStatus}
                      disabled={statusUpdating}
                      className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-opacity disabled:opacity-50 ${
                        detail.center.status === "active"
                          ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                    >
                      {detail.center.status === "active" ? (
                        <>
                          <ShieldOff className="h-4 w-4" /> Suspendre ce centre
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" /> Réactiver ce centre
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
