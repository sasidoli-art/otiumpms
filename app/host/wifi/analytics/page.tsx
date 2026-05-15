import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import AnalyticsClient from './analytics-client'

export const metadata = { title: 'Analytics Wi-Fi — Otium' }

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  if (!host) redirect('/host/dashboard')
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) redirect('/host/moduli')

  return <AnalyticsClient hostNome={host.nomeAzienda} />
}
