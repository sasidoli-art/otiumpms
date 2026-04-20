import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NuovaFatturaForm from './nuova-form'
import { isHostAuthorized } from '@/lib/permissions'

export default async function NuovaFatturaPage({
  searchParams: sp,
}: {
  searchParams: Promise<{ prenotazione?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const { prenotazione: prenotazioneId } = await sp

  // Pre-carica prenotazioni non-ancora-fatturate per selezione opzionale
  const prenotazioniFattureabili = await prisma.prenotazione.findMany({
    where: {
      hostId,
      deletedAt: null,
      fatturaId: null,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      prezzoTotale: true,
      tassaSoggiorno: true,
      unita: { select: { nome: true } },
      struttura: { select: { nome: true } },
      addebiti: { select: { descrizione: true, quantita: true, prezzoUnitario: true, aliquotaIva: true } },
    },
    orderBy: { dataArrivo: 'desc' },
    take: 50,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/host/fatture" className="flex items-center gap-1 hover:text-brand-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Fatture
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Nuova fattura</span>
      </div>

      <NuovaFatturaForm
        prenotazioneIdIniziale={prenotazioneId ?? null}
        prenotazioni={prenotazioniFattureabili.map((p) => ({
          id: p.id,
          descrizione: `${p.guestCognome} ${p.guestNome} · ${p.struttura?.nome ?? ''}${p.unita?.nome ? ` (${p.unita.nome})` : ''} · ${p.dataArrivo.toISOString().slice(0, 10)}`,
          guestNome: p.guestNome,
          guestCognome: p.guestCognome,
          guestEmail: p.guestEmail,
          dataArrivo: p.dataArrivo.toISOString(),
          dataPartenza: p.dataPartenza?.toISOString() ?? null,
          numOspiti: p.numOspiti,
          prezzoTotale: p.prezzoTotale,
          tassaSoggiorno: p.tassaSoggiorno,
          unitaNome: p.unita?.nome ?? null,
          addebiti: p.addebiti,
        }))}
      />
    </div>
  )
}
