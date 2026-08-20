"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Loader2, Search, Users } from "lucide-react";
import { nexaOfferLabel, type NexaOfferKey } from "@/app/data/nexaOffers";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useSuperadminCenters } from "../SuperadminCentersContext";

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
  city: string | null;
  center_type: string | null;
  nexa_offer: NexaOfferKey | null;
  derived_status: string;
  stats: CenterStats;
  usage?: {
    seatsOccupied: number;
    seatsMax: number | null;
    seatsOver: boolean;
    staffCount: number;
    staffMax: number | null;
    campusCount: number;
    campusMax: number | null;
  };
};

type SortKey = "name" | "actifs" | "total" | "pauses" | "expires" | "revoques";

export default function SuperadminEffectifsPage() {
  const { t, locale } = useI18n();
  const { centers, loading, error } = useSuperadminCenters<CenterRow>();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("actifs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = centers.filter((c) => {
      if (!q) return true;
      return `${c.name} ${c.city || ""} ${c.nexa_offer || ""}`.toLowerCase().includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      const av = a.stats?.[sortKey] ?? 0;
      const bv = b.stats?.[sortKey] ?? 0;
      return (av - bv) * dir;
    });
  }, [centers, search, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      centers.reduce(
        (acc, c) => {
          acc.actifs += c.stats?.actifs ?? 0;
          acc.pauses += c.stats?.pauses ?? 0;
          acc.expires += c.stats?.expires ?? 0;
          acc.revoques += c.stats?.revoques ?? 0;
          acc.total += c.stats?.total ?? 0;
          return acc;
        },
        { actifs: 0, pauses: 0, expires: 0, revoques: 0, total: 0 },
      ),
    [centers],
  );

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-orange-400" /> : <ArrowDown className="h-3 w-3 text-orange-400" />;
  };

  const exportCsv = () => {
    const header = [
      t("superadmin", "effectifsColCenter"),
      t("superadmin", "effectifsColCity"),
      t("superadmin", "effectifsColOffer"),
      t("superadmin", "effectifsColActive"),
      t("superadmin", "effectifsColPaused"),
      t("superadmin", "effectifsColExpired"),
      t("superadmin", "effectifsColRevoked"),
      t("superadmin", "effectifsColTotal"),
    ];
    const lines = rows.map((c) =>
      [
        c.name,
        c.city || "",
        nexaOfferLabel(c.nexa_offer, locale === "en" ? "en" : "fr"),
        c.stats.actifs,
        c.stats.pauses,
        c.stats.expires,
        c.stats.revoques,
        c.stats.total,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexa-effectifs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "effectifsTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "effectifsSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading || rows.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-white disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          {t("superadmin", "effectifsExport")}
        </button>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Users className="h-3.5 w-3.5" />
          {t("superadmin", "effectifsStatsTitle")}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: t("superadmin", "effectifsCardActive"), value: totals.actifs, tone: "text-emerald-300" },
            { label: t("superadmin", "effectifsCardPaused"), value: totals.pauses, tone: "text-slate-300" },
            { label: t("superadmin", "effectifsCardExpired"), value: totals.expires, tone: "text-amber-300" },
            { label: t("superadmin", "effectifsCardRevoked"), value: totals.revoques, tone: "text-rose-300" },
            { label: t("superadmin", "effectifsCardTotal"), value: totals.total, tone: "text-white" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-[#0a0f1c] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
              <p className={`mt-1 text-xl font-black ${card.tone}`}>
                {loading ? "—" : card.value}
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {t("superadmin", "effectifsCardUnit")}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("superadmin", "effectifsSearch")}
          className="w-full rounded-xl border border-white/10 bg-[#0a0f1c] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-400"
        />
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1c]">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("superadmin", "centersLoading")}
          </p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm font-black text-white">{t("superadmin", "effectifsEmpty")}</p>
          </div>
        ) : (
          <div className="custom-scrollbar overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  {(
                    [
                      ["name", "effectifsColCenter"],
                      ["actifs", "effectifsColActive"],
                      ["pauses", "effectifsColPaused"],
                      ["expires", "effectifsColExpired"],
                      ["revoques", "effectifsColRevoked"],
                      ["total", "effectifsColTotal"],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <th key={key} className="px-4 py-3">
                      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1.5 hover:text-slate-300">
                        {t("superadmin", labelKey)}
                        <SortIcon column={key} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3">{t("superadmin", "effectifsColOffer")}</th>
                  <th className="px-4 py-3">{t("superadmin", "usageSeats")}</th>
                  <th className="px-4 py-3">{t("superadmin", "usageStaff")}</th>
                  <th className="px-4 py-3">{t("superadmin", "usageCampus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((center) => (
                  <tr key={center.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/superadmin/centres?focus=${center.id}`} className="font-bold text-white hover:text-orange-300">
                        {center.name}
                      </Link>
                      <p className="text-[11px] text-slate-500">{center.city || "—"}</p>
                    </td>
                    <td className="px-4 py-3 font-black text-emerald-300">{center.stats.actifs}</td>
                    <td className="px-4 py-3 font-bold text-slate-300">{center.stats.pauses}</td>
                    <td className="px-4 py-3 font-bold text-amber-300">{center.stats.expires}</td>
                    <td className="px-4 py-3 font-bold text-rose-300">{center.stats.revoques}</td>
                    <td className="px-4 py-3 font-black text-white">{center.stats.total}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {nexaOfferLabel(center.nexa_offer, locale === "en" ? "en" : "fr")}
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold ${center.usage?.seatsOver ? "text-red-300" : "text-slate-300"}`}>
                      {center.usage ? `${center.usage.seatsOccupied}/${center.usage.seatsMax ?? "∞"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {center.usage ? `${center.usage.staffCount}/${center.usage.staffMax ?? "∞"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {center.usage ? `${center.usage.campusCount}/${center.usage.campusMax ?? "∞"}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
