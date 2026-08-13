"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Handshake, Loader2, Search } from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { nexaOfferLabel, type NexaOfferKey } from "@/app/data/nexaOffers";
import { useI18n } from "@/app/i18n/I18nProvider";

type Usage = {
  seatsOccupied: number;
  seatsMax: number | null;
  seatsOver: boolean;
  staffOver: boolean;
  campusOver: boolean;
};

type CenterRow = {
  id: string;
  name: string;
  city: string | null;
  nexa_offer: NexaOfferKey | null;
  derived_status: string;
  billing_status?: string | null;
  subscription_amount?: number | null;
  renewal_at?: string | null;
  upgrade_requested_at?: string | null;
  commercial_intent?: string | null;
  commercial_note?: string | null;
  usage?: Usage;
};

const PIPELINE = new Set(["trial", "trial_expired", "subscription_expired"]);

export default function SuperadminCommercialPage() {
  const { t, locale } = useI18n();
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
      setCenters(json.centers || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [t]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return centers
      .filter((c) => {
        const inPipeline =
          PIPELINE.has(c.derived_status) ||
          Boolean(c.upgrade_requested_at) ||
          Boolean(c.commercial_intent) ||
          c.billing_status === "unpaid" ||
          c.billing_status === "grace" ||
          Boolean(c.usage?.seatsOver || c.usage?.staffOver || c.usage?.campusOver);
        if (!inPipeline) return false;
        if (!q) return true;
        return `${c.name} ${c.city || ""} ${c.nexa_offer || ""}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [centers, search]);

  const setIntent = async (id: string, commercial_intent: string | null) => {
    setBusyId(id);
    try {
      await superadminFetch(`/api/superadmin/centers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          commercial_intent,
          upgrade_requested_at: commercial_intent ? new Date().toISOString() : null,
        }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setBusyId(null);
    }
  };

  const markPaid = async (id: string) => {
    setBusyId(id);
    try {
      await superadminFetch(`/api/superadmin/centers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ markPaid: true, commercial_intent: null }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersLoadError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-orange-400" />
          <h1 className="text-xl font-black text-white">{t("superadmin", "commercialTitle")}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">{t("superadmin", "commercialSubtitle")}</p>
        <p className="mt-2 text-xs">
          <Link href="/superadmin/demandes" className="font-bold text-orange-400 hover:text-orange-300">
            {t("superadmin", "commercialDemandesLink")} →
          </Link>
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("superadmin", "effectifsSearch")}
          className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-orange-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">{t("superadmin", "commercialEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("superadmin", "effectifsColCenter")}</th>
                <th className="px-4 py-3">{t("superadmin", "effectifsColOffer")}</th>
                <th className="px-4 py-3">{t("superadmin", "commercialColStatus")}</th>
                <th className="px-4 py-3">{t("superadmin", "billingTitle")}</th>
                <th className="px-4 py-3">{t("superadmin", "commercialColIntent")}</th>
                <th className="px-4 py-3">{t("superadmin", "commercialColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-white/5 text-slate-300">
                  <td className="px-4 py-3">
                    <Link href={`/superadmin/centres?focus=${c.id}`} className="font-bold text-white hover:text-orange-300">
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-500">{c.city || "—"}</p>
                  </td>
                  <td className="px-4 py-3">{nexaOfferLabel(c.nexa_offer, locale === "en" ? "en" : "fr")}</td>
                  <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                    {t("superadmin", `centresDerivedStatus_${c.derived_status}`)}
                    {(c.usage?.seatsOver || c.usage?.staffOver || c.usage?.campusOver) && (
                      <span className="ml-2 text-red-300">{t("superadmin", "usageOverBadge")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.billing_status === "unpaid"
                      ? t("superadmin", "billingStatusUnpaid")
                      : c.billing_status === "grace"
                        ? t("superadmin", "billingStatusGrace")
                        : c.billing_status === "current"
                          ? t("superadmin", "billingStatusCurrent")
                          : "—"}
                    {c.subscription_amount != null && (
                      <p className="text-slate-500">{c.subscription_amount.toLocaleString()} FCFA</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.commercial_intent
                      ? t("superadmin", `commercialIntent_${c.commercial_intent}`)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => void setIntent(c.id, "trial_convert")}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-white/5 disabled:opacity-50"
                      >
                        {t("superadmin", "commercialIntent_trial_convert")}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => void setIntent(c.id, "upgrade")}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:bg-white/5 disabled:opacity-50"
                      >
                        {t("superadmin", "commercialIntent_upgrade")}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => void markPaid(c.id)}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {t("superadmin", "billingMarkPaid")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
