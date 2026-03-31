/**
 * Middleware di autorizzazione centralizzato.
 *
 * Sostituisce il pattern ripetuto in ogni route:
 *   const session = await getServerSession(authOptions)
 *   if (!session || session.user.role !== 'HOST') return 401
 *
 * Uso in un route handler:
 *
 *   const auth = await requireHost()
 *   if (auth instanceof NextResponse) return auth  // 401 automatico
 *   const hostId = auth.user.hostId               // garantito non-null
 */

import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// ─── Tipi sessione ristretti ──────────────────────────────────────────────────

export interface AdminSession {
  user: {
    id: string
    email: string
    name: string
    role: 'ADMIN'
    hostId: string | null
  }
}

export interface HostSession {
  user: {
    id: string
    email: string
    name: string
    role: 'HOST'
    /** Garantito non-null per gli HOST */
    hostId: string
  }
}

// ─── Guard helpers ────────────────────────────────────────────────────────────

/**
 * Verifica che la sessione sia di un ADMIN.
 * Restituisce la sessione tipata o una NextResponse 401 da ritornare direttamente.
 */
export async function requireAdmin(): Promise<AdminSession | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  return session as AdminSession
}

/**
 * Verifica che la sessione sia di un HOST con hostId valido.
 * Permette anche ad ADMIN di accedere impersonando il primo host.
 * Restituisce la sessione tipata o una NextResponse 401 da ritornare direttamente.
 */
export async function requireHost(): Promise<HostSession | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // HOST normale
  if (session.user.role === 'HOST') {
    if (session.user.hostId) {
      return session as HostSession
    }
    // HOST senza hostId nella sessione: cerca il record host nel database
    const { prisma } = await import('@/lib/db')
    const host = await prisma.host.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })
    if (host) {
      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: 'HOST' as const,
          hostId: host.id,
        },
      }
    }
    // Se non trova host, restituisce errore
    return NextResponse.json({ error: 'Host non trovato' }, { status: 401 })
  }

  // ADMIN — impersona il primo host
  if (session.user.role === 'ADMIN') {
    const { prisma } = await import('@/lib/db')
    const host = await prisma.host.findFirst({ select: { id: true } })
    if (host) {
      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: 'HOST' as const,
          hostId: host.id,
        },
      }
    }
  }

  return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
}

/**
 * Helper per pagine server-side (non API route).
 * Restituisce un hostId valido sia per HOST che per ADMIN (che impersona il primo host).
 * Restituisce null se non autorizzato — la pagina deve fare redirect.
 */
export async function getHostId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session) return null

  if (session.user.role === 'HOST') {
    if (session.user.hostId) {
      return session.user.hostId
    }
    // HOST senza hostId nella sessione: cerca il record host nel database
    const { prisma } = await import('@/lib/db')
    const host = await prisma.host.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    })
    return host?.id ?? null
  }

  if (session.user.role === 'ADMIN') {
    const { prisma } = await import('@/lib/db')
    const host = await prisma.host.findFirst({ select: { id: true } })
    return host?.id ?? null
  }

  return null
}

/**
 * Come requireHost(), ma permette anche ad ADMIN di accedere
 * "impersonando" un host. Per le API, l'admin può passare ?hostId=xxx,
 * altrimenti usa il primo host presente nel DB.
 */
export async function requireHostOrAdmin(searchParams?: URLSearchParams): Promise<HostSession | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // HOST normale — flusso standard
  if (session.user.role === 'HOST' && session.user.hostId) {
    return session as HostSession
  }

  // ADMIN — impersona un host
  if (session.user.role === 'ADMIN') {
    const { prisma } = await import('@/lib/db')
    const targetHostId = searchParams?.get('hostId') ?? undefined
    const host = targetHostId
      ? await prisma.host.findUnique({ where: { id: targetHostId }, select: { id: true } })
      : await prisma.host.findFirst({ select: { id: true } })

    if (host) {
      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: 'HOST' as const,
          hostId: host.id,
        },
      }
    }
  }

  return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
}

/**
 * Type-guard per discriminare tra sessione valida e risposta di errore.
 *
 *   const auth = await requireHost()
 *   if (isUnauthorized(auth)) return auth
 */
export function isUnauthorized(val: unknown): val is NextResponse {
  return val instanceof NextResponse
}
