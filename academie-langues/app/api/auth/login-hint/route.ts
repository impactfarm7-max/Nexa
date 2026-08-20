import { NextResponse } from "next/server";
import { consumeFixedWindow, requestIp } from "@/app/utils/fixed-window-rate-limit";

const GENERIC_RESPONSE = {
  hasProfile: false,
  hasAuth: false,
  isCenterStudent: false,
  revoked: false,
  reason: null,
};

/**
 * Réponse volontairement générique après un échec de connexion.
 * Ne jamais révéler publiquement l'existence, le rôle ou l'état d'un compte.
 */
export async function POST(req: Request) {
  const rate = consumeFixedWindow(`login-hint:${requestIp(req)}`, 20, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(GENERIC_RESPONSE, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  await req.json().catch(() => ({}));
  return NextResponse.json(GENERIC_RESPONSE);
}
