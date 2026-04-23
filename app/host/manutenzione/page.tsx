import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { isHostAuthorized } from '@/lib/permissions'
import { getStrutturaAttivaId } from '@/lib/struttura-attiva'
import ManutenzionePage from '@/components/manutenzione/manutenzione-page'

export const metadata = { title: 'Manutenzione — Otium' }

export default async function ManutenzioneHostPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  const strutturaId = await getStrutturaAttivaId(hostId)

  const [strutture, segnalazioni] = await Promise.all([
    prisma.struttura.findMany({
      where: { hostId, ...(strutturaId && { id: strutturaId }) },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.segnalazioneManutenzione.findMany({
      where: { hostId, ...(strutturaId && { strutturaId }) },
      include: {
        struttura: { select: { id: true, nome: true } },
        unita: { select: { id: true, nome: true } },
      },
      orderBy: [{ priorita: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Manutenzione</h1>
        <p className="text-sm text-gray-500">
          Segnalazioni tecniche con vista Lista o Kanban drag-and-drop.
        </p>
      </div>
      <ManutenzionePage
        strutture={strutture}
        segnalazioniIniziali={segnalazioni.map((s) => ({
          ...s,
          dataScadenza: s.dataScadenza?.toISOString() ?? null,
          dataRisoluzione: s.dataRisoluzione?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          immagini: s.immagini ?? [],
        }))}
      />
    </div>
  )
}
