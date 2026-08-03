import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUser } from "@/app/utils/auth-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEVICE_LIMIT = 2;

// Rate limiting en mémoire (par userId) — 10 créations max par heure
// Note : en serverless multi-instance ce compteur est par instance.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Bearer d'abord, sinon session cookie (login / PIN). */
async function resolveAuthenticatedUser(req: NextRequest) {
  const bearerUser = await getAuthUser(req);
  if (bearerUser) return bearerUser;

  const cookieStore = await cookies();
  const supabaseCookie = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only in this route */
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabaseCookie.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await resolveAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const device = typeof body.device === "string" ? body.device : null;
    const ip = typeof body.ip === "string" ? body.ip : null;
    // Ignorer tout userId client — seule la session auth compte
    const userId = authUser.id;

    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { ok: false, error: "Trop de tentatives. Réessayez dans une heure." },
        { status: 429 }
      );
    }

    const { data: sessions, error: selectError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("last_seen", { ascending: false });

    if (selectError) {
      console.error("sessions/check: DB error fetching sessions", selectError.code);
      return NextResponse.json(
        { ok: false, error: "Erreur interne." },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      const token = generateSecureToken();
      const { error: insertError } = await supabase.from("user_sessions").insert({
        user_id: userId,
        token,
        device,
        ip,
      });

      if (insertError) {
        console.error("sessions/check: DB error creating first session", insertError.code);
        return NextResponse.json(
          { ok: false, error: "Erreur interne." },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, token });
    }

    if (sessions.length >= DEVICE_LIMIT) {
      return NextResponse.json({
        limitReached: true,
        activeSessions: sessions.map((s) => ({
          id: s.id,
          lastSeen: s.last_seen,
          device: s.device || null,
        })),
      });
    }

    const token = generateSecureToken();
    const { error: insertError } = await supabase.from("user_sessions").insert({
      user_id: userId,
      token,
      device,
      ip,
    });

    if (insertError) {
      console.error("sessions/check: DB error creating session", insertError.code);
      return NextResponse.json(
        { ok: false, error: "Erreur interne." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, token });
  } catch (error) {
    console.error(
      "sessions/check: unexpected error",
      error instanceof Error ? error.message : "unknown"
    );
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
