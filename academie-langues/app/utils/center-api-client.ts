const CACHE_TTL_MS = 120_000;
const cache = new Map<string, { at: number; data: unknown }>();

function cacheKey(path: string, params?: Record<string, string>) {
  if (!params || !Object.keys(params).length) return path;
  const qs = new URLSearchParams(params).toString();
  return `${path}?${qs}`;
}

export function clearCenterApiCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export async function fetchCenterApi<T>(
  path: string,
  token: string,
  options?: {
    force?: boolean;
    params?: Record<string, string>;
    headers?: Record<string, string>;
  },
): Promise<T> {
  const key = cacheKey(path, options?.params);
  if (!options?.force) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;
  }

  const url = new URL(path, window.location.origin);
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const headerLocale = options?.headers?.["X-Nexa-Locale"] ?? options?.headers?.["x-nexa-locale"];
    const isEn = headerLocale === "en";
    throw new Error(
      (body as { error?: string }).error ||
        (isEn ? `Error ${res.status}` : `Erreur ${res.status}`),
    );
  }

  const data = (await res.json()) as T;
  cache.set(key, { at: Date.now(), data });
  return data;
}
