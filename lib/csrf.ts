/**
 * CSRF Protection Middleware per Next.js App Router
 * 
 * Implementazione double-submit cookie pattern:
 * 1. Genera token CSRF su richieste GET (se non presente)
 * 2. Invia token come cookie (httpOnly: false per accesso JS)
 * 3. Richiede token nell'header X-CSRF-Token per richieste mutanti (POST, PUT, PATCH, DELETE)
 * 4. Verifica corrispondenza cookie vs header
 * 
 * Escluso per API pubbliche (book, auth, cron, checkin)
 */

import { NextRequest, NextResponse } from 'next/server'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const CSRF_TOKEN_BYTES = 32

/**
 * Genera un token CSRF random compatibile con Edge Runtime
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_BYTES)
  crypto.getRandomValues(array)
  
  // Converti a stringa esadecimale
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Middleware CSRF che verifica token per richieste mutanti
 */
export function csrfMiddleware(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  const method = req.method
  
  // ─── Escludi API pubbliche ────────────────────────────────────────────────
  if (
    pathname.startsWith('/api/book/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/checkin/')
  ) {
    return null
  }
  
  // ─── Metodi safe (GET, HEAD, OPTIONS) ─────────────────────────────────────
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(method)) {
    // Per GET, se manca il cookie CSRF, generane uno nuovo
    const existingToken = req.cookies.get(CSRF_COOKIE_NAME)?.value
    if (!existingToken && method === 'GET') {
      const token = generateCsrfToken()
      const response = NextResponse.next()
      response.cookies.set({
        name: CSRF_COOKIE_NAME,
        value: token,
        httpOnly: false, // Accessibile da JavaScript per invio nell'header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 ore
      })
      return response
    }
    return null
  }
  
  // ─── Metodi mutanti (POST, PUT, PATCH, DELETE) ────────────────────────────
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = req.headers.get(CSRF_HEADER_NAME)
  
  if (!cookieToken || !headerToken) {
    return new NextResponse(
      JSON.stringify({ error: 'Token CSRF mancante' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  if (cookieToken !== headerToken) {
    return new NextResponse(
      JSON.stringify({ error: 'Token CSRF non valido' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  return null
}

/**
 * Utility per ottenere il token CSRF dal cookie (usato nei componenti React)
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

/**
 * Hook React per includere token CSRF nelle fetch
 */
export function useCsrfFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const csrfToken = getCsrfToken()
    const headers = new Headers(init?.headers)
    
    if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, csrfToken)
    }
    
    return fetch(input, {
      ...init,
      headers,
      credentials: 'include', // Include cookies
    })
  }
}