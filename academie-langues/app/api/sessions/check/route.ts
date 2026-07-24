import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEVICE_LIMIT = 2;

// Rate limiting en mémoire (par userId) — 10 créations max par heure
// Note : en serverless multi-instance ce compteur est par instance.
// Pour une protection globale, utiliser Upstash Redis ou une table DB dédiée.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 heure

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

/** Génère un token de session cryptographiquement sûr (256 bits) */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { userId, device, ip } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // Rate limiting par userId
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

    // Première session
    if (!sessions || sessions.length === 0) {
      const token = generateSecureToken();
      const { error: insertError } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          token,
          device: device || null,
          ip: ip || null,
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

    // Limite d'appareils atteinte — on expose le device (pour identification) mais pas l'IP
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

    // Nouvelle session dans la limite
    const token = generateSecureToken();
    const { error: insertError } = await supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
        token,
        device: device || null,
        ip: ip || null,
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
    console.error("sessions/check: unexpected error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
