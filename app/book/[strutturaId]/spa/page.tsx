import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import SpaBookingClient from './spa-booking-client'

export default async function SpaBookingPage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: {
      id: true, nome: true, descrizione: true, citta: true,
      host: { select: { nomeAzienda: true, sitoWeb: true } },
    },
  })

  if (!struttura) notFound()

  const [trattamenti, percorsi, terapisti] = await Promise.all([
    prisma.trattamentoSpa.findMany({
      where: { attivo: true, prenotabileOnline: true, host: { strutture: { some: { id: params.strutturaId } } } },
      select: {
        id: true, nome: true, categoria: true, durata: true,
        prezzo: true, descrizione: true, colore: true,
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    }),
    prisma.percorsoBenessere.findMany({
      where: { attivo: true, host: { strutture: { some: { id: params.strutturaId } } } },
      select: {
        id: true, nome: true, descrizione: true, prezzo: true,
        durataMinuti: true, colore: true,
        passaggi: {
          select: { ordine: true, durata: true, trattamento: { select: { nome: true } } },
          orderBy: { ordine: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.terapistaSpa.findMany({
      where: { attivo: true, profiloPublico: true, host: { strutture: { some: { id: params.strutturaId } } } },
      select: {
        id: true, nome: true, cognome: true, bio: true,
        specializzazioni: true, colore: true,
      },
      orderBy: [{ nome: 'asc' }],
    }),
  ])

  return (
    <SpaBookingClient
      strutturaId={params.strutturaId}
      strutturaNome={struttura.nome}
      nomeAzienda={struttura.host.nomeAzienda}
      citta={struttura.citta}
      trattamenti={trattamenti}
      percorsi={percorsi.map(p => ({
        ...p,
        passaggi: p.passaggi.map(ps => ({ ordine: ps.ordine, durata: ps.durata, trattamentoNome: ps.trattamento.nome })),
      }))}
      terapisti={terapisti}
    />
  )
}
