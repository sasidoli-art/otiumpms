import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { Metadata } from 'next'
import RicevutaClient from './ricevuta-client'

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await paramsPromise
  const p = await prisma.prenotazione.findFirst({
    where: { id: params.id },
    select: { guestNome: true, guestCognome: true },
  })
  return {
    title: `Ricevuta — ${p?.guestNome ?? ''} ${p?.guestCognome ?? ''}`,
  }
}

export default async function RicevutaPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN'))
    redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const p = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: hostId },
    include: {
      struttura: { select: { nome: true, indirizzo: true, citta: true, regione: true } },
      unita: { select: { nome: true } },
      host: {
        select: {
          nomeAzienda: true,
          partitaIva: true,
          indirizzo: true,
          citta: true,
          cap: true,
          provincia: true,
          telefono: true,
        },
      },
    },
  })
  if (!p) notFound()

  const notti = p.dataPartenza
    ? Math.round(
        (new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000
      )
    : null


  return (
    <RicevutaClient
      prenotazione={p}
      notti={notti}
    />
  )
}
