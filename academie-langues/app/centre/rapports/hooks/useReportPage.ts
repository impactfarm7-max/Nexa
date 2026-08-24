"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { resolveDashboardModules } from "@/app/centre/dashboard/utils";
import { defaultReportPeriodRange, formatReportPeriodLabel } from "@/app/utils/reports-period";
import { isReportHiddenForTcf, REPORT_API_PATH, type ReportSlug } from "../config/p0-reports";
import { fetchReportsBundle, peekReportsBundle } from "./reports-bundle-client";
import { useI18n } from "@/app/i18n/I18nProvider";

export type CampusOption = { id: string; name: string };
export type FiliereOption = { id: string; name: string; status: string };

export function useReportPage<T>(slug: ReportSlug) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<T | null>(null);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [filieres, setFilieres] = useState<FiliereOption[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [centerType, setCenterType] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);

  const defaults = defaultReportPeriodRange();
  const from = searchParams.get("from") || defaults.from;
  const to = searchParams.get("to") || defaults.to;
  const campusId = searchParams.get("campusId") || "";
  const filiereId = searchParams.get("filiereId") || "";

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { preset: "custom", from, to };
    if (campusId) p.campusId = campusId;
    if (filiereId) p.filiereId = filiereId;
    return p;
  }, [from, to, campusId, filiereId]);

  const querySuffix = useMemo(() => {
    const qs = new URLSearchParams(queryParams).toString();
    return qs ? `?${qs}` : "";
  }, [queryParams]);

  const reportHref = useCallback(
    (path: string) => `${path}${querySuffix}`,
    [querySuffix],
  );

  const applyBundle = useCallback(
    (bundle: { reports: Partial<Record<ReportSlug, unknown>>; campuses: CampusOption[]; filieres: FiliereOption[] }) => {
      const slice = bundle.reports[slug];
      if (slice) setReport(slice as T);
      setCampuses(bundle.campuses || []);
      setFilieres(bundle.filieres || []);
    },
    [slug],
  );

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (!params.get("from")) params.set("from", from);
      if (!params.get("to")) params.set("to", to);
      params.set("preset", "custom");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, from, to],
  );

  const setPeriodRange = useCallback(
    (fromDate: string, toDate: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("preset", "custom");
      params.set("from", fromDate);
      params.set("to", toDate);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setError(null);

    const cached = peekReportsBundle(queryParams, locale);
    const hasCachedSlice = Boolean(cached?.reports[slug]);

    if (hasCachedSlice && cached) {
      applyBundle(cached);
      setLoading(false);
      setRefreshing(false);
      const bootstrap = peekCenterBootstrap();
      if (bootstrap) {
        const ct = (bootstrap.me.center as { center_type?: string } | null)?.center_type ?? null;
        setCenterType(ct);
        setCenterId(bootstrap.centerId || null);
      }
      return;
    }

    if (cached) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const bootstrap = peekCenterBootstrap() || (await loadCenterBootstrap());
      if (!bootstrap) {
        setAccessDenied(true);
        return;
      }

      const ct = (bootstrap.me.center as { center_type?: string } | null)?.center_type ?? null;
      setCenterType(ct);
      setCenterId(bootstrap.centerId || null);

      const { canAccess } = resolveDashboardModules(
        bootstrap.me.role as string,
        (bootstrap.me.permissions as string[]) || [],
        ct,
      );
      if (!canAccess("rapports")) {
        setAccessDenied(true);
        router.replace("/centre/acces-indisponible");
        return;
      }

      if (isReportHiddenForTcf(slug, ct)) {
        router.replace(`/centre/rapports${querySuffix}`);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAccessDenied(true);
        return;
      }

      const bundle = await fetchReportsBundle(session.access_token, queryParams, {
        force: !hasCachedSlice,
        locale,
      });

      applyBundle(bundle);

      if (!bundle.reports[slug]) {
        const response = await fetch(`${REPORT_API_PATH[slug]}${querySuffix}`, {
          headers: { Authorization: `Bearer ${session.access_token}`, "x-nexa-locale": locale },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || t("centre", "reportsDataUnavailable"));
        setReport(payload.report as T);
        setCampuses(payload.campuses || []);
        setFilieres(payload.filieres || []);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("centre", "reportsLoadingError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, queryParams, querySuffix, router, applyBundle, t, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = useMemo(
    () => formatReportPeriodLabel(from, to, locale === "en" ? "en" : "fr"),
    [from, to, locale],
  );

  return {
    loading,
    refreshing,
    error,
    report,
    campuses,
    filieres,
    accessDenied,
    from,
    to,
    campusId,
    filiereId,
    centerType,
    centerId,
    periodLabel,
    querySuffix,
    reportHref,
    setFilter,
    setPeriodRange,
    reload: load,
  };
}
