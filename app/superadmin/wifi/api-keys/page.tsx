import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import ApiKeysClient from './api-keys-client'

export const metadata = { title: 'API Keys Wi-Fi — Otium SuperAdmin' }

export default async function ApiKeysPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  const hosts = await prisma.host.findMany({
    select: {
      id: true,
      nomeAzienda: true,
      moduliAttivi: true,
    },
    orderBy: { nomeAzienda: 'asc' },
  })

  const wifiHosts = hosts.filter(h => {
    const m = h.moduliAttivi as { wifi?: boolean } | null
    return m?.wifi === true
  })

  return <ApiKeysClient hosts={wifiHosts} />
}
