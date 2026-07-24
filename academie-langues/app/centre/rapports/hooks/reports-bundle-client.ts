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

export function peekReportsBundle(params: Record<string, string>): ReportsBundle | null {
  if (cached?.key === cacheKey(params)) return cached.data;
  return null;
}

export function invalidateReportsBundle() {
  cached = null;
  inflight = null;
}

export async function fetchReportsBundle(
  token: string,
  params: Record<string, string>,
  opts?: { force?: boolean },
): Promise<ReportsBundle> {
  const key = cacheKey(params);

  if (!opts?.force && cached?.key === key) return cached.data;

  if (!opts?.force && inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await fetchCenterApi<ReportsBundle>(BUNDLE_PATH, token, {
        params,
        force: true,
      });
      cached = { key, data };
      return data;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
