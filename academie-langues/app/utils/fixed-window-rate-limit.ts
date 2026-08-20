type Entry = { count: number; resetAt: number };

const windows = new Map<string, Entry>();

/** Protection locale par instance. À compléter par Redis/KV pour un déploiement distribué. */
export function consumeFixedWindow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function requestIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 80);
}
