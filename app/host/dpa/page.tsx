import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import DpaAcceptance from '@/components/dpa/dpa-acceptance'
import { DPA_VERSIONE } from '@/lib/dpa-template'

export const metadata = { title: 'Accordo trattamento dati — Otium' }
export const dynamic = 'force-dynamic'

export default async function DpaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      nomeAzienda: true,
      dpaAccettato: true,
      dpaAccettazioni: {
        orderBy: { accettatoAt: 'desc' },
        take: 1,
        select: { versione: true },
      },
    },
  })
  if (!host) redirect('/login')

  const ultimaVersione = host.dpaAccettazioni[0]?.versione ?? null
  const versioneOk = ultimaVersione === DPA_VERSIONE

  // Se già accettato nella versione corrente, redirect a dashboard
  if (host.dpaAccettato && versioneOk) redirect('/host/dashboard')

  return (
    <DpaAcceptance
      nomeAzienda={host.nomeAzienda}
      reAccept={!!ultimaVersione && !versioneOk}
      versioneVecchia={ultimaVersione}
    />
  )
}
