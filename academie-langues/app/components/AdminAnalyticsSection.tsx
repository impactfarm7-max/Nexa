"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Eye, RefreshCw, TrendingDown, TrendingUp, UserPlus, Users } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

type DailyPoint = { date: string; visitors: number; newVisitors: number; pageViews: number };
type PagePoint = { path: string; views: number; visitors: number };
type Analytics = {
  series: DailyPoint[];
  topPages: PagePoint[];
  totalVisitors: number;
  periodVisitors: number;
  periodPageViews: number;
  previousPeriodVisitors: number;
  previousPeriodPageViews: number;
};

const EMPTY: Analytics = { series: [], topPages: [], totalVisitors: 0, periodVisitors: 0, periodPageViews: 0, previousPeriodVisitors: 0, previousPeriodPageViews: 0 };

export default function AdminAnalyticsSection() {
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState("30");
  const [data, setData] = useState<Analytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
      const response = await fetch(`/api/admin/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Impossible de charger les statistiques.");
      setData({ ...EMPTY, ...json });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const today = data.series.at(-1) ?? { visitors: 0, newVisitors: 0, pageViews: 0, date: "" };
  const maxVisitors = Math.max(1, ...data.series.map((point) => point.visitors));
  const visibleSeries = useMemo(() => days === 90 ? data.series.filter((_, index) => index % 3 === 0 || index === data.series.length - 1) : data.series, [data.series, days]);
  const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
  const variation = (current: number, previous: number) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  const visitorsVariation = variation(data.periodVisitors, data.previousPeriodVisitors);
  const viewsVariation = variation(data.periodPageViews, data.previousPeriodPageViews);

  const exportCsv = () => {
    const rows = [["Date", "Visiteurs uniques", "Nouveaux visiteurs", "Pages vues"], ...data.series.map((point) => [point.date, point.visitors, point.newVisitors, point.pageViews])];
    const blob = new Blob([rows.map((row) => row.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-nexa-${days}-jours.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: "Visiteurs aujourd'hui", value: today.visitors, icon: Users, color: "text-orange-400" },
    { label: "Nouveaux aujourd'hui", value: today.newVisitors, icon: UserPlus, color: "text-emerald-400" },
    { label: `Visiteurs sur ${days} jours`, value: data.periodVisitors, icon: TrendingUp, color: "text-blue-400" },
    { label: `Pages vues sur ${days} jours`, value: data.periodPageViews, icon: Eye, color: "text-violet-400" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><BarChart3 className="h-7 w-7 text-orange-500" /><h2 className="text-2xl font-black text-white">Analytics du site</h2></div>
          <p className="mt-2 text-sm text-slate-400">Visiteurs anonymes, nouvelles visites et pages consultées.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((period) => (
            <button key={period} onClick={() => setDays(period)} className={`rounded-lg px-3 py-2 text-xs font-black ${days === period ? "bg-orange-500 text-white" : "bg-slate-900 text-slate-400 hover:text-white"}`}>{period} j</button>
          ))}
          <form onSubmit={(event) => { event.preventDefault(); setDays(Math.max(7, Math.min(Number(customDays) || 30, 90))); }} className="hidden items-center gap-1 sm:flex"><input type="number" min="7" max="90" value={customDays} onChange={(event) => setCustomDays(event.target.value)} aria-label="Période personnalisée en jours" className="w-16 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs font-bold text-white outline-none focus:border-orange-500" /><button className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold text-slate-300">jours</button></form>
          <button onClick={exportCsv} disabled={loading || data.series.length === 0} aria-label="Exporter les analytics en CSV" className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white disabled:opacity-50"><Download className="h-4 w-4" /></button>
          <button onClick={() => void load()} disabled={loading} aria-label="Actualiser" className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300"><p>{error}</p><button onClick={() => void load()} className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/25">Réessayer</button></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><Icon className={`h-5 w-5 ${color}`} /><p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 min-h-9 text-3xl font-black text-white">{loading ? <span className="mt-2 block h-7 w-20 animate-pulse rounded-lg bg-slate-800" /> : value.toLocaleString("fr-FR")}</p></div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[{ label: "Évolution des visiteurs", value: visitorsVariation }, { label: "Évolution des pages vues", value: viewsVariation }].map((item) => <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4"><div><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-1 text-[10px] text-slate-600">Comparée aux {days} jours précédents</p></div><span className={`flex items-center gap-1 text-lg font-black ${item.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>{item.value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}{item.value > 0 ? "+" : ""}{item.value}%</span></div>)}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><h3 className="font-black text-white">Visiteurs par jour</h3><p className="text-xs text-slate-500">Orange : uniques · Vert : nouveaux</p></div><p className="text-xs font-bold text-slate-500">{data.totalVisitors.toLocaleString("fr-FR")} visiteurs au total</p></div>
            <div className="mt-6 flex h-64 items-end gap-1 overflow-x-auto border-b border-slate-800 pb-1">
              {visibleSeries.map((point) => (
                <div key={point.date} className="group flex h-full min-w-[18px] flex-1 flex-col justify-end" title={`${formatDate(point.date)} : ${point.visitors} visiteurs, ${point.newVisitors} nouveaux`}>
                  <div className="relative flex w-full items-end justify-center gap-px" style={{ height: `${Math.max(3, (point.visitors / maxVisitors) * 88)}%` }}>
                    <div className="h-full w-2/3 rounded-t bg-orange-500/80 transition-colors group-hover:bg-orange-400" />
                    <div className="w-1/3 rounded-t bg-emerald-400/80" style={{ height: `${point.visitors ? Math.max(4, (point.newVisitors / point.visitors) * 100) : 4}%` }} />
                  </div>
                  {(days === 7 || (days === 30 && visibleSeries.indexOf(point) % 5 === 0)) && <span className="mt-2 whitespace-nowrap text-center text-[9px] text-slate-600">{formatDate(point.date)}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
            <h3 className="font-black text-white">Pages les plus consultées</h3>
            <div className="mt-4 divide-y divide-slate-800">
              {data.topPages.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Les premières données apparaîtront après une visite.</p>}
              {data.topPages.map((page, index) => (
                <div key={page.path} className="flex items-center gap-3 py-3"><span className="w-6 text-xs font-black text-slate-600">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-200">{page.path}</span><span className="text-xs text-slate-500">{page.visitors} visiteur{page.visitors > 1 ? "s" : ""}</span><span className="w-20 text-right text-sm font-black text-white">{page.views} vues</span></div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
