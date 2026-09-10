import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Vérifie si l'utilisateur a une session active
  const { data: { user } } = await supabase.auth.getUser()

  // Routes API publiques (pas besoin de session)
  const PUBLIC_API_ROUTES = [
    '/api/centre/creer',
    '/api/creation-centre',
    '/api/center/resolve-code',
    '/api/auth/',
    '/api/sessions/validate',
    '/api/support/guest',
    '/api/pin/',
    '/api/activity',
    '/api/demo/',
  ];
  const isPublicApi = PUBLIC_API_ROUTES.some(r => request.nextUrl.pathname.startsWith(r));

  // Protège les routes API privées : si pas de session, bloquer
  if (request.nextUrl.pathname.startsWith('/api') && !user && !isPublicApi) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Mode visite (bouton "Visiter" landing) : comptes démo en lecture seule.
  // Vérifié ici (et pas seulement côté client) car c'est la garantie réelle,
  // indépendante d'un flag sessionStorage contournable.
  const isMutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  if (request.nextUrl.pathname.startsWith('/api') && user && isMutatingMethod) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_demo_account')
      .eq('id', user.id)
      .maybeSingle()
    // Fail closed : si la vérification échoue (réseau, RLS, etc.), on bloque
    // plutôt que de laisser passer une écriture non vérifiée.
    if (profileError || profile?.is_demo_account) {
      return NextResponse.json({ error: 'Lecture seule (mode visite).' }, { status: 403 })
    }
  }

  return response
}

// On indique à Next.js de n'exécuter ce code que pour les routes API et les pages de l'application
export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
}