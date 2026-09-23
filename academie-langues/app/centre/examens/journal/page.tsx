"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, History, Loader2, Search } from "lucide-react";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { supabase } from "@/app/utils/supabase";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  PAGE_BG,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
  centerNotoSans,
} from "@/app/centre/center-page-ui";

type AuditEvent = {
  id: string;
  action: string;
  actor_name: string;
  student_name: string | null;
  student_matricule: string | null;
  ue_name: string | null;
  created_at: string;
  before: { score?: number | null; title?: string | null; status?: string | null } | null;
  after: { score?: number | null; title?: string | null; status?: string | null } | null;
  meta?: Record<string, unknown>;
};

const ACTIONS = [
  "",
  "create",
  "update",
  "delete",
  "validate_session",
  "reopen_session",
  "import",
] as const;

export default function GradesJournalPage() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (action) params.set("action", action);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      const res = await fetch(`/api/centre/grades/audit?${params}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error || t("centre", "notesAuditLoadError"));
        setEvents([]);
        setTotal(0);
        return;
      }
      setEvents(Array.isArray(payload.events) ? payload.events : []);
      setTotal(typeof payload.total === "number" ? payload.total : 0);
    } catch {
      setError(t("centre", "notesAuditLoadError"));
    } finally {
      setFetching(false);
    }
  }, [action, from, to, t]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.center_id) {
        const { data: center } = await supabase
          .from("centers")
          .select("center_type")
          .eq("id", profile.center_id)
          .maybeSingle();
        setCenterType(center?.center_type ?? null);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading && !isTcfCanadaCenter(centerType)) void load();
  }, [loading, centerType, load]);

  const filtered = events.filter((e) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (e.actor_name || "").toLowerCase().includes(q) ||
      (e.student_name || "").toLowerCase().includes(q) ||
      (e.student_matricule || "").toLowerCase().includes(q) ||
      (e.ue_name || "").toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    const headers = ["date", "action", "acteur", "etudiant", "matricule", "ue", "avant", "apres", "statut"];
    const lines = filtered.map((e) => {
      const cells = [
        new Date(e.created_at).toISOString(),
        e.action,
        e.actor_name,
        e.student_name || "",
        e.student_matricule || "",
        e.ue_name || "",
        e.before?.score ?? "",
        e.after?.score ?? "",
        `${e.before?.status || ""}→${e.after?.status || ""}`,
      ];
      return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";");
    });
    const blob = new Blob([[headers.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-notes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  if (isTcfCanadaCenter(centerType)) {
    return (
      <div className={`${centerNotoSans.className} min-h-[100dvh] flex items-center justify-center p-12 text-center`} style={{ backgroundColor: PAGE_BG }}>
        <p className="text-sm font-semibold text-neutral-500">{t("centre", "notesTcfUnavailable")}</p>
      </div>
    );
  }

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "notesJournalTitle")}
          backButton={
            <Link
              href="/centre/examens/examensuniversels"
              className="h-9 w-9 rounded-lg border border-black/[0.08] bg-white hover:bg-black/[0.03] text-neutral-500 inline-flex items-center justify-center"
              aria-label={t("centre", "financeBack")}
            >
              <ArrowLeft size={16} />
            </Link>
          }
          actions={
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="h-9 px-3 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white text-neutral-700 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download size={14} />
              CSV
            </button>
          }
        />
      }
    >
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium mb-4">
          {t("centre", "notesJournalIntro")}
        </p>

        <div className="flex flex-wrap items-end gap-2 mb-4">
          <div className="flex items-center gap-2 h-10 bg-white rounded-lg border border-black/[0.08] px-3 min-w-[180px] flex-1 max-w-xs">
            <Search size={14} className="text-neutral-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("centre", "notesJournalSearch")}
              className="flex-1 bg-transparent text-sm font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              {t("centre", "notesJournalAction")}
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-sm font-semibold"
            >
              {ACTIONS.map((a) => (
                <option key={a || "all"} value={a}>
                  {a
                    ? t("centre", `notesAuditAction_${a}` as "notesAuditAction_create")
                    : t("centre", "notesJournalAllActions")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              {t("centre", "notesJournalFrom")}
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              {t("centre", "notesJournalTo")}
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-sm font-semibold"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={fetching}
            className="h-10 px-4 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: BLUE }}
          >
            {fetching ? <Loader2 size={14} className="animate-spin" /> : t("centre", "notesJournalRefresh")}
          </button>
        </div>

        {error && (
          <p className="mb-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-black/[0.05] flex items-center gap-2">
            <History size={14} className="text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-500">
              {t("centre", "notesJournalCount", { count: String(filtered.length), total: String(total) })}
            </span>
          </div>
          {fetching && events.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-neutral-400" size={22} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-16">{t("centre", "notesAuditEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-black/[0.05]">
                    <th className="px-4 py-2.5 font-bold">{t("centre", "notesJournalColDate")}</th>
                    <th className="px-4 py-2.5 font-bold">{t("centre", "notesJournalAction")}</th>
                    <th className="px-4 py-2.5 font-bold">{t("centre", "notesJournalColActor")}</th>
                    <th className="px-4 py-2.5 font-bold">{t("centre", "notesJournalColStudent")}</th>
                    <th className="px-4 py-2.5 font-bold">{t("centre", "notesJournalColUe")}</th>
                    <th className="px-4 py-2.5 font-bold">{t("centre", "notesJournalColScore")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-black/[0.015]">
                      <td className="px-4 py-2.5 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#11224E]/[0.06] text-[#11224E]">
                          {t("centre", `notesAuditAction_${e.action}` as "notesAuditAction_create")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-neutral-700">{e.actor_name}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="font-semibold text-neutral-700">{e.student_name || "—"}</span>
                        {e.student_matricule && (
                          <span className="block text-[10px] text-neutral-400">{e.student_matricule}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-600">{e.ue_name || "—"}</td>
                      <td className="px-4 py-2.5 text-xs font-extrabold tabular-nums" style={{ color: BLUE }}>
                        {e.before?.score != null || e.after?.score != null
                          ? `${e.before?.score ?? "—"} → ${e.after?.score ?? "—"}`
                          : e.action === "import"
                            ? `×${e.meta?.touched ?? e.meta?.ops ?? "—"}`
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
