import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { csrfMiddleware } from '@/lib/csrf'

export default withAuth(
  function middleware(req) {
    // Applica CSRF protection prima di qualsiasi altra logica
    const csrfResponse = csrfMiddleware(req)
    if (csrfResponse) {
      return csrfResponse
    }

    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // SUPERADMIN: accesso a /superadmin/* e a tutto il resto
    if (pathname.startsWith('/superadmin') && token?.role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // HOST + ADMIN + SUPERADMIN possono accedere a /host/*
    if (pathname.startsWith('/host') && token?.role !== 'HOST' && token?.role !== 'ADMIN' && token?.role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // ADMIN + SUPERADMIN possono accedere a /admin/*
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN' && token?.role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Permette l'esecuzione della funzione middleware solo se c'è un token valido
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  // Protegge tutte le rotte /host/*, /admin/* e API autenticate
  matcher: [
    '/host/:path*',
    '/admin/:path*',
    '/superadmin/:path*',
    '/api/(host|admin|spa|superadmin)/:path*',
  ],
}
