import { NextRequest, NextResponse } from "next/server";

// Toutes les routes API qui modifient l'état sont protégées contre le CSRF.
// On protège l'intégralité de /api/ : plus simple, plus sûr, aucun oubli possible.
const CSRF_PROTECTED_PREFIX = "/api/";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protection CSRF : vérifier l'Origin sur toutes les routes API
  if (pathname.startsWith(CSRF_PROTECTED_PREFIX)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: "Requête cross-origin non autorisée." },
            { status: 403 }
          );
        }
      } catch {
        // Origin malformé
        return NextResponse.json(
          { error: "Origin invalide." },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
