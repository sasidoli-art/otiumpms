import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CATALOGO_MODULI, parseModuli } from '@/lib/moduli'
import { ModuliManager } from './moduli-manager'

export const metadata = { title: 'Moduli — SuperAdmin' }

export default async function SuperAdminModuliPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ host?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  const searchParams = await searchParamsPromise
  const preselectedHostId = searchParams.host || null

  const hosts = await prisma.host.findMany({
    select: {
      id: true,
      nomeAzienda: true,
      citta: true,
      piano: true,
      statoAbbonamento: true,
      moduliAttivi: true,
    },
    orderBy: { nomeAzienda: 'asc' },
  })

  // Se host preselezionato via query param, usa il suo nome come filtro iniziale
  const initialSearchHost =
    preselectedHostId && hosts.find(h => h.id === preselectedHostId)?.nomeAzienda || ''

  // Calcola statistiche di utilizzo per ogni modulo
  const hostsConModuli = hosts.map(h => ({
    ...h,
    moduli: parseModuli(h.moduliAttivi),
  }))

  const usageStats: Record<string, number> = {}
  for (const m of CATALOGO_MODULI) {
    usageStats[m.id] = hostsConModuli.filter(h => h.moduli[m.id]).length
  }

  // Host con tutti i base attivi
  const moduliBase = CATALOGO_MODULI.filter(m => m.categoria === 'base').map(m => m.id)
  const hostsBaseCompleti = hostsConModuli.filter(h =>
    moduliBase.every(mid => h.moduli[mid])
  ).length

  // Modulo più/meno usato
  const sorted = Object.entries(usageStats).sort((a, b) => b[1] - a[1])
  const piuUsato = sorted[0] ? { id: sorted[0][0], count: sorted[0][1] } : null
  const menoUsato = sorted[sorted.length - 1] ? { id: sorted[sorted.length - 1][0], count: sorted[sorted.length - 1][1] } : null

  return (
    <ModuliManager
      hosts={hostsConModuli.map(h => ({
        id: h.id,
        nomeAzienda: h.nomeAzienda,
        citta: h.citta,
        piano: h.piano,
        statoAbbonamento: h.statoAbbonamento,
        moduli: h.moduli,
        moduliRaw: h.moduliAttivi,
      }))}
      usageStats={usageStats}
      stats={{
        totaleModuli: CATALOGO_MODULI.length,
        piuUsato,
        menoUsato,
        hostsBaseCompleti,
        totaleHost: hosts.length,
      }}
      initialSearchHost={initialSearchHost}
    />
  )
}
