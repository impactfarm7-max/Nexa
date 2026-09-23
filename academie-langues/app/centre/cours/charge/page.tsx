"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  ORANGE,
  PAGE_BG,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
  centerNotoSans,
} from "@/app/centre/center-page-ui";

type TrainerLoad = {
  id: string;
  name: string;
  role: string;
  service_annuel_heures: number | null;
  load_hours: number;
  load_pct: number | null;
  over_service: boolean;
  ues: {
    id: string;
    name: string;
    filiere: string;
    heures_cm: number | null;
    heures_td: number | null;
    heures_tp: number | null;
    total: number;
    hours_label: string;
    course_format: string | null;
  }[];
};

export default function TeachingLoadPage() {
  const { t, locale } = useI18n();
  const en = locale === "en";
  const [loading, setLoading] = useState(true);
  const [isUniversite, setIsUniversite] = useState(false);
  const [trainers, setTrainers] = useState<TrainerLoad[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draftService, setDraftService] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [canEditService, setCanEditService] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/centre/teaching-load");
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error || t("centre", "chargeLoadError"));
        setTrainers([]);
        return;
      }
      const list: TrainerLoad[] = Array.isArray(payload.trainers) ? payload.trainers : [];
      setTrainers(list);
      const drafts: Record<string, string> = {};
      for (const tr of list) {
        drafts[tr.id] = tr.service_annuel_heures != null ? String(tr.service_annuel_heures) : "";
      }
      setDraftService(drafts);
    } catch {
      setError(t("centre", "chargeLoadError"));
    }
  }, [t]);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.center_id) {
        const [{ data: center }, { data: membership }] = await Promise.all([
          supabase.from("centers").select("center_type").eq("id", profile.center_id).maybeSingle(),
          supabase.from("center_users").select("permissions").eq("user_id", user.id).eq("center_id", profile.center_id).maybeSingle(),
        ]);
        const univ = center?.center_type === "universite";
        setIsUniversite(univ);
        const role = profile.role || "";
        const perms = Array.isArray(membership?.permissions) ? membership.permissions.map(String) : [];
        const isManager = ["center_manager", "campus_manager", "manager"].includes(role);
        setCanEditService(isManager || perms.includes("staff"));
        if (univ) await load();
      }
      setLoading(false);
    })();
  }, [load]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveService = async (formateurId: string) => {
    setSavingId(formateurId);
    setError("");
    try {
      const raw = draftService[formateurId];
      const res = await fetch("/api/centre/teaching-load", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formateur_id: formateurId,
          service_annuel_heures: raw.trim() === "" ? null : Number(raw),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || t("centre", "chargeSaveError"));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "chargeSaveError"));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  if (!isUniversite) {
    return (
      <div className={`${centerNotoSans.className} min-h-[100dvh] flex items-center justify-center p-12 text-center`} style={{ backgroundColor: PAGE_BG }}>
        <p className="text-sm font-semibold text-neutral-500">{t("centre", "chargeUnivOnly")}</p>
      </div>
    );
  }

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "chargeTitle")}
          backButton={
            <Link
              href="/centre/cours"
              className="h-9 w-9 rounded-lg border border-black/[0.08] bg-white hover:bg-black/[0.03] text-neutral-500 inline-flex items-center justify-center"
              aria-label={t("centre", "financeBack")}
            >
              <ArrowLeft size={16} />
            </Link>
          }
        />
      }
    >
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium mb-1">{t("centre", "chargeIntro")}</p>
        <p className="text-xs text-neutral-400 font-medium mb-5">{t("centre", "chargeVsPlanning")}</p>

        {error && (
          <p className="mb-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          {trainers.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-16">{t("centre", "chargeEmpty")}</p>
          ) : (
            <ul className="divide-y divide-black/[0.04]">
              {trainers.map((tr) => {
                const open = expanded.has(tr.id);
                return (
                  <li key={tr.id}>
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(tr.id)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                      >
                        {open ? <ChevronDown size={16} className="text-neutral-400 shrink-0" /> : <ChevronRight size={16} className="text-neutral-400 shrink-0" />}
                        <span className="text-sm font-extrabold truncate" style={{ color: BLUE }}>
                          {tr.name}
                        </span>
                        {tr.over_service && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle size={10} />
                            {t("centre", "chargeOverService")}
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
                        <span style={{ color: BLUE }}>
                          {tr.load_hours} h
                        </span>
                        <span className="text-neutral-300">/</span>
                        {canEditService ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={draftService[tr.id] ?? ""}
                              onChange={(e) =>
                                setDraftService((prev) => ({ ...prev, [tr.id]: e.target.value }))
                              }
                              placeholder={en ? "Service" : "Service"}
                              className="w-16 h-8 px-2 rounded-lg border border-black/[0.08] text-xs font-bold text-center outline-none"
                            />
                            <span className="text-neutral-400">h</span>
                            <button
                              type="button"
                              onClick={() => void saveService(tr.id)}
                              disabled={savingId === tr.id}
                              className="h-8 w-8 rounded-lg border border-black/[0.08] flex items-center justify-center text-neutral-600 hover:bg-black/[0.03] disabled:opacity-40"
                              title={t("centre", "identitySave")}
                            >
                              {savingId === tr.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-neutral-500">
                            {tr.service_annuel_heures != null ? `${tr.service_annuel_heures} h` : "—"}
                          </span>
                        )}
                        {tr.load_pct != null && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              tr.over_service ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {tr.load_pct} %
                          </span>
                        )}
                      </div>
                    </div>
                    {open && (
                      <div className="px-4 pb-3 pl-10 space-y-1.5">
                        {tr.ues.length === 0 ? (
                          <p className="text-xs text-neutral-400">{t("centre", "chargeNoUe")}</p>
                        ) : (
                          tr.ues.map((u) => (
                            <div
                              key={u.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[0.05] bg-[#FFFBF7] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate" style={{ color: BLUE }}>
                                  {u.name}
                                  {u.course_format ? ` · ${u.course_format.toUpperCase()}` : ""}
                                </p>
                                <p className="text-[10px] text-neutral-400 font-medium">{u.filiere}</p>
                              </div>
                              <p className="text-xs font-semibold text-neutral-600 tabular-nums">
                                {u.hours_label}
                                <span className="text-neutral-400 font-medium"> · {u.total} h</span>
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-[11px] text-neutral-400 font-medium">
          {t("centre", "chargeHintProgram")}{" "}
          <Link href="/centre/filieres" className="font-semibold hover:underline" style={{ color: ORANGE }}>
            {t("centre", "chargeHintProgramLink")}
          </Link>
        </p>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
