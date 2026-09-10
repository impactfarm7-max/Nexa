import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Toutes les routes API qui modifient l'état sont protégées contre le CSRF.
// On protège l'intégralité de /api/ : plus simple, plus sûr, aucun oubli possible.
const CSRF_PROTECTED_PREFIX = "/api/";

// Routes API publiques (pas besoin de session)
const PUBLIC_API_ROUTES = [
  "/api/centre/creer",
  "/api/creation-centre",
  "/api/center/resolve-code",
  "/api/auth/",
  "/api/sessions/validate",
  "/api/support/guest",
  "/api/pin/",
  "/api/activity",
  "/api/demo/",
];

// service_role : l'appli authentifie via un token Bearer dans l'en-tête
// Authorization (pas de session cookie côté API), voir app/utils/auth-server.ts
// getAuthUser(). On valide ce même token ici, et on lit is_demo_account en
// bypassant RLS (peu importe le profil visé, la vérification doit toujours
// aboutir — c'est la garantie de lecture seule du mode visite).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function proxy(req: NextRequest) {
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

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isPublicApi = PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r));

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const { data: { user } } = token
    ? await supabaseAdmin.auth.getUser(token)
    : { data: { user: null } };

  // Protège les routes API privées : si pas de session valide, bloquer
  if (!user && !isPublicApi) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Mode visite (bouton "Visiter" landing) : comptes démo en lecture seule.
  // Vérifié ici (et pas seulement côté client) car c'est la garantie réelle,
  // indépendante d'un flag sessionStorage contournable.
  const isMutatingMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (user && isMutatingMethod) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_demo_account")
      .eq("id", user.id)
      .maybeSingle();
    // Fail closed : si la vérification échoue, on bloque plutôt que de
    // laisser passer une écriture non vérifiée.
    if (profileError) {
      console.error("proxy: profile check failed", profileError);
      return NextResponse.json({ error: "Vérification impossible, réessayez." }, { status: 403 });
    }
    if (profile?.is_demo_account) {
      return NextResponse.json({ error: "Lecture seule (mode visite)." }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
