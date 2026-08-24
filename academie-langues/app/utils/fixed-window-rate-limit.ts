import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

type Result = { allowed: boolean; retryAfterSeconds: number };
type LocalEntry = { count: number; resetAt: number };

const localFallback = new Map<string, LocalEntry>();
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function consumeLocally(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const entry = localFallback.get(key);
  if (!entry || entry.resetAt <= now) {
    localFallback.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

/** Limite distribuée via Supabase. Le repli mémoire évite une panne pendant le déploiement de la migration. */
export async function consumeFixedWindow(key: string, limit: number, windowMs: number): Promise<Result> {
  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data, error } = await supabaseAdmin.rpc("consume_api_rate_limit", {
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  const result = Array.isArray(data) ? data[0] : data;
  if (!error && result && typeof result.allowed === "boolean") {
    return {
      allowed: result.allowed,
      retryAfterSeconds: Number(result.retry_after_seconds || 0),
    };
  }

  console.warn("[rate-limit] distributed limiter unavailable; using local fallback", error?.message);
  return consumeLocally(keyHash, limit, windowMs);
}

export function requestIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 80);
}
