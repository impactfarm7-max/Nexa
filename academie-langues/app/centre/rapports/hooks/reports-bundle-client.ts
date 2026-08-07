import { fetchCenterApi } from "@/app/utils/center-api-client";
import type { ReportSlug } from "../config/p0-reports";
import type { CampusOption, FiliereOption } from "./useReportPage";

export type ReportsBundle = {
  reports: Partial<Record<ReportSlug, unknown>>;
  campuses: CampusOption[];
  filieres: FiliereOption[];
};

const BUNDLE_PATH = "/api/center/reports/bundle";

let cached: { key: string; data: ReportsBundle } | null = null;
let inflight: Promise<ReportsBundle> | null = null;

function cacheKey(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

export function peekReportsBundle(
  params: Record<string, string>,
  locale: "fr" | "en" = "fr",
): ReportsBundle | null {
  const key = cacheKey({ ...params, locale: locale === "en" ? "en" : "fr" });
  if (cached?.key === key) return cached.data;
  return null;
}

export function invalidateReportsBundle() {
  cached = null;
  inflight = null;
}

export async function fetchReportsBundle(
  token: string,
  params: Record<string, string>,
  opts?: { force?: boolean; locale?: "fr" | "en" },
): Promise<ReportsBundle> {
  const locale = opts?.locale === "en" ? "en" : "fr";
  const keyedParams = { ...params, locale };
  const key = cacheKey(keyedParams);

  if (!opts?.force && cached?.key === key) return cached.data;

  if (!opts?.force && inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await fetchCenterApi<ReportsBundle>(BUNDLE_PATH, token, {
        params: keyedParams,
        force: true,
        headers: { "X-Nexa-Locale": locale },
      });
      cached = { key, data };
      return data;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
