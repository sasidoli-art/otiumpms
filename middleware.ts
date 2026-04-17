import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { csrfMiddleware } from '@/lib/csrf'

// ─── In-memory rate limiter per login (Edge-compatible) ──────────────────────
// Non possiamo importare lib/rate-limit.ts perché il middleware gira in Edge Runtime
// e il modulo potrebbe non essere compatibile. Reimplementiamo inline.

interface RateLimitEntry { count: number; resetAt: number }
const loginStore = new Map<string, RateLimitEntry>()
let lastLoginCleanup = Date.now()

const LOGIN_MAX = 5           // max tentativi
const LOGIN_WINDOW_MS = 5 * 60 * 1000  // 5 minuti

function loginRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  // Pulizia ogni 5 minuti
  if (now - lastLoginCleanup > 5 * 60 * 1000) {
    lastLoginCleanup = now
    Array.from(loginStore.entries()).forEach(([key, entry]) => {
      if (entry.resetAt < now) loginStore.delete(key)
    })
  }

  const entry = loginStore.get(ip)
  if (!entry || entry.resetAt < now) {
    loginStore.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }
  if (entry.count >= LOGIN_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true, retryAfter: 0 }
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'
}

// ─── Middleware principale ────────────────────────────────────────────────────

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl

    // ── Rate limit login (POST /api/auth/callback/credentials) ──────────
    if (pathname === '/api/auth/callback/credentials' && req.method === 'POST') {
      const ip = getIp(req)
      const { allowed, retryAfter } = loginRateLimit(ip)
      if (!allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Troppi tentativi di accesso. Riprova tra qualche minuto.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          },
        )
      }
      // Login endpoint: lascia passare senza ulteriori controlli
      return NextResponse.next()
    }

    // Applica CSRF protection prima di qualsiasi altra logica
    const csrfResponse = csrfMiddleware(req)
    if (csrfResponse) {
      return csrfResponse
    }

    const token = req.nextauth.token

    // SUPERADMIN: accesso a /superadmin/* — role check + IP whitelist + audit log
    if (pathname.startsWith('/superadmin')) {
      if (token?.role !== 'SUPERADMIN') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      // IP whitelist check (if SUPERADMIN_ALLOWED_IPS is configured)
      const allowedRaw = process.env.SUPERADMIN_ALLOWED_IPS
      if (allowedRaw && allowedRaw.trim() !== '') {
        const clientIp = getIp(req)
        const allowedIps = allowedRaw.split(',').map(s => s.trim()).filter(Boolean)
        if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
          console.warn(`[SUPERADMIN] Blocked IP ${clientIp} for ${token.email ?? token.id} on ${pathname}`)
          return NextResponse.redirect(new URL('/login', req.url))
        }
      }
      // Audit log: trace all SuperAdmin access
      const ip = getIp(req)
      console.log(`[SUPERADMIN AUDIT] ${token.email ?? token.id} | ${req.method} ${pathname} | IP: ${ip}`)
    }
    // HOST + ADMIN + SUPERADMIN possono accedere a /host/*
    if (pathname.startsWith('/host') && token?.role !== 'HOST' && token?.role !== 'ADMIN' && token?.role !== 'SUPERADMIN' && token?.role !== 'DIREZIONE' && token?.role !== 'STAFF') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Onboarding redirect for HOST users
    if (pathname.startsWith('/host') && token?.role === 'HOST') {
      const step = (token.onboardingStep as number | undefined) ?? 0
      const isOnboarding = pathname.startsWith('/host/onboarding')
      const isApi = pathname.startsWith('/api/')

      // Not completed → force onboarding (skip if already there or if API call)
      if (step < 5 && !isOnboarding && !isApi) {
        return NextResponse.redirect(new URL('/host/onboarding', req.url))
      }
      // Completed → redirect away from onboarding
      if (step >= 5 && isOnboarding) {
        return NextResponse.redirect(new URL('/host/dashboard', req.url))
      }
    }
    // ADMIN + SUPERADMIN possono accedere a /admin/*
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN' && token?.role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Forward pathname to server components via header
    const response = NextResponse.next()
    response.headers.set('x-pathname', pathname)
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Login endpoint: consenti accesso senza token (è il punto di autenticazione)
        if (req.nextUrl.pathname === '/api/auth/callback/credentials') {
          return true
        }
        // Tutte le altre rotte protette richiedono un token valido
        return !!token
      },
    },
  },
)

export const config = {
  // Protegge tutte le rotte /host/*, /admin/* e API autenticate
  // Include anche il callback credentials per rate limiting login
  matcher: [
    '/host/:path*',
    '/admin/:path*',
    '/superadmin/:path*',
    '/api/(host|admin|spa|superadmin)/:path*',
    '/api/auth/callback/credentials',
  ],
}
