import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ForensicClient from './forensic-client'

export const metadata = { title: 'Report Forense Wi-Fi — SuperAdmin' }
export const dynamic = 'force-dynamic'

export default async function SuperAdminWifiForensicPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) {
    redirect('/login')
  }

  const allHosts = await prisma.host.findMany({
    select: {
      id: true,
      nomeAzienda: true,
      moduliAttivi: true,
      strutture: { select: { id: true, nome: true }, where: { attiva: true } },
    },
    orderBy: { nomeAzienda: 'asc' },
  })

  const hosts = allHosts
    .filter((h) => Array.isArray(h.moduliAttivi) && h.moduliAttivi.includes('wifi'))
    .map(({ id, nomeAzienda, strutture }) => ({ id, nomeAzienda, strutture }))

  return <ForensicClient hosts={hosts} />
}
