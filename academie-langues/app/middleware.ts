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
    '/api/sessions/',
    '/api/pin/',
    '/api/activity',
  ];
  const isPublicApi = PUBLIC_API_ROUTES.some(r => request.nextUrl.pathname.startsWith(r));

  // Protège les routes API privées : si pas de session, bloquer
  if (request.nextUrl.pathname.startsWith('/api') && !user && !isPublicApi) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  return response
}

// On indique à Next.js de n'exécuter ce code que pour les routes API et les pages de l'application
export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
}