import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import RoomDirectoryClient from './room-directory-client'

export const metadata = { title: 'La tua camera — Otium' }

export default async function RoomDirectoryPage({
  params: paramsPromise,
}: {
  params: Promise<{ unitaId: string }>
}) {
  const { unitaId } = await paramsPromise

  const unita = await prisma.unitaPrenotabile.findUnique({
    where: { id: unitaId },
    select: {
      id: true,
      nome: true,
      descrizione: true,
      capacita: true,
      piano: true,
      struttura: {
        select: {
          id: true,
          nome: true,
          citta: true,
          indirizzo: true,
          descrizione: true,
          hostId: true,
          host: {
            select: {
              id: true,
              nomeAzienda: true,
              telefono: true,
              emailMittente: true,
              moduliAttivi: true,
              conciergeAttivo: true,
              wifiRedirectUrl: true,
            },
          },
        },
      },
    },
  })

  if (!unita || !unita.struttura) notFound()

  const guida = await prisma.guidaStruttura.findMany({
    where: { strutturaId: unita.struttura.id, attivo: true },
    orderBy: [{ categoria: 'asc' }, { ordine: 'asc' }],
  })

  return (
    <RoomDirectoryClient
      unitaId={unita.id}
      unitaNome={unita.nome}
      unitaDescrizione={unita.descrizione}
      hostId={unita.struttura.host.id}
      hostNome={unita.struttura.host.nomeAzienda}
      strutturaNome={unita.struttura.nome}
      strutturaCitta={unita.struttura.citta}
      strutturaIndirizzo={unita.struttura.indirizzo}
      telefono={unita.struttura.host.telefono}
      email={unita.struttura.host.emailMittente}
      moduliAttivi={unita.struttura.host.moduliAttivi}
      conciergeAttivo={unita.struttura.host.conciergeAttivo}
      strutturaId={unita.struttura.id}
      guida={guida.map(g => ({
        id: g.id,
        categoria: g.categoria,
        titolo: g.titolo,
        descrizione: g.descrizione,
        fotoUrl: g.fotoUrl,
        indirizzo: g.indirizzo,
        distanzaKm: g.distanzaKm,
        mapsLink: g.mapsLink,
        telefono: g.telefono,
        orari: g.orari,
        websiteUrl: g.websiteUrl,
      }))}
    />
  )
}
