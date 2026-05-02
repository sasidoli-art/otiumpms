import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import OnboardClient from './onboard-client'

export const metadata = { title: 'Onboarding nuovo router Wi-Fi — SuperAdmin' }
export const dynamic = 'force-dynamic'

export default async function SuperAdminWifiOnboardPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) {
    redirect('/login')
  }

  // Lista hosts + strutture per popolare i dropdown.
  // Filtriamo solo strutture di host con modulo wifi attivo nel piano.
  const hosts = await prisma.host.findMany({
    select: {
      id: true,
      nomeAzienda: true,
      moduliAttivi: true,
      strutture: {
        where: { attiva: true },
        select: { id: true, nome: true, citta: true },
        orderBy: { nome: 'asc' },
      },
    },
    orderBy: { nomeAzienda: 'asc' },
  })

  const hostsConWifi = hosts
    .filter(h => Array.isArray(h.moduliAttivi) && h.moduliAttivi.includes('wifi'))
    .map(h => ({
      id: h.id,
      nomeAzienda: h.nomeAzienda,
      strutture: h.strutture,
    }))

  return <OnboardClient hosts={hostsConWifi} />
}
