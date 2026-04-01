import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import UtentiManager from './utenti-manager'

export const metadata = { title: 'Utenti — SuperAdmin' }

const ROLE_COLORI: Record<string, BadgeVariant> = {
  SUPERADMIN: 'purple',
  ADMIN: 'blue',
  HOST: 'green',
}

export default async function SuperAdminUtentiPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ role?: string; attivo?: string }>
}) {
  const searchParams = await searchParamsPromise
  const filtroRole = searchParams.role || undefined
  const filtroAttivo = searchParams.attivo !== undefined ? searchParams.attivo === '1' : undefined

  const where: Record<string, unknown> = {}
  if (filtroRole) where.role = filtroRole
  if (filtroAttivo !== undefined) where.attivo = filtroAttivo

  const [utenti, totale] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        cognome: true,
        email: true,
        role: true,
        attivo: true,
        createdAt: true,
        host: { select: { nomeAzienda: true } },
      },
    }),
    prisma.user.count(),
  ])

  const serialized = utenti.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <UtentiManager
      utentiIniziali={serialized}
      totale={totale}
      filtroRole={filtroRole}
      filtroAttivo={searchParams.attivo}
    />
  )
}
