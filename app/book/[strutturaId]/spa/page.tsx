import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { isModuloAttivo } from '@/lib/moduli'
import { PublicConciergeWidget } from '@/components/book/public-concierge-widget'
import SpaBookingFlow from './spa-booking-flow'
import BookingLayout from '@/components/book/booking-layout'
import { getStrutturaPubblica } from '@/lib/book/get-struttura-pubblica'

export const metadata = { title: 'SPA & Benessere — Prenota Online' }

export default async function SpaBookingPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ strutturaId: string }>
  searchParams: Promise<{ pin?: string; prenotazione?: string }>
}) {
  const { strutturaId } = await paramsPromise
  const { pin, prenotazione: prenId } = await searchParamsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      id: true, nome: true, descrizione: true, citta: true,
      logo: true, colorePrimario: true, coloreSecondario: true,
      hostId: true,
      host: {
        select: {
          nomeAzienda: true, telefono: true, moduliAttivi: true,
          regCardSpaTerminiHtml: true,
        },
      },
    },
  })

  if (!struttura) notFound()
  if (!isModuloAttivo(struttura.host.moduliAttivi, 'spa')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <p className="text-4xl mb-4">🧖</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Servizio non disponibile</h1>
          <p className="text-sm text-gray-500">La SPA di questa struttura non accetta prenotazioni online al momento.</p>
        </div>
      </div>
    )
  }

  const [trattamenti, percorsi, terapisti] = await Promise.all([
    prisma.trattamentoSpa.findMany({
      where: { attivo: true, prenotabileOnline: true, hostId: struttura.hostId },
      select: { id: true, nome: true, categoria: true, durata: true, prezzo: true, descrizione: true, colore: true },
      orderBy: [{ categoria: 'asc' }, { prezzo: 'asc' }],
    }),
    prisma.percorsoBenessere.findMany({
      where: { attivo: true, hostId: struttura.hostId },
      select: {
        id: true, nome: true, descrizione: true, prezzo: true, durataMinuti: true, colore: true,
        passaggi: {
          select: { ordine: true, durata: true, trattamento: { select: { nome: true } } },
          orderBy: { ordine: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.terapistaSpa.findMany({
      where: { attivo: true, profiloPublico: true, hostId: struttura.hostId },
      select: { id: true, nome: true, cognome: true, bio: true, specializzazioni: true, colore: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  // Precompila guest da PIN o prenotazioneId
  let prenotazioneGuest: { nome: string; cognome: string; email: string; telefono: string | null; prenotazioneId: string; unitaNome: string | null; unitaId: string | null } | null = null

  if (pin) {
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const pren = await prisma.prenotazione.findFirst({
      where: { hostId: struttura.hostId, pin, stato: 'CONFERMATA', dataArrivo: { lte: new Date(Date.now() + 86400000) }, OR: [{ dataPartenza: null }, { dataPartenza: { gt: oggi } }] },
      select: { id: true, guestNome: true, guestCognome: true, guestEmail: true, guestTelefono: true, unita: { select: { id: true, nome: true } } },
    })
    if (pren) {
      prenotazioneGuest = { nome: pren.guestNome, cognome: pren.guestCognome, email: pren.guestEmail, telefono: pren.guestTelefono, prenotazioneId: pren.id, unitaNome: pren.unita?.nome ?? null, unitaId: pren.unita?.id ?? null }
    }
  } else if (prenId) {
    const pren = await prisma.prenotazione.findFirst({
      where: { id: prenId, hostId: struttura.hostId },
      select: { id: true, guestNome: true, guestCognome: true, guestEmail: true, guestTelefono: true, unita: { select: { id: true, nome: true } } },
    })
    if (pren) {
      prenotazioneGuest = { nome: pren.guestNome, cognome: pren.guestCognome, email: pren.guestEmail, telefono: pren.guestTelefono, prenotazioneId: pren.id, unitaNome: pren.unita?.nome ?? null, unitaId: pren.unita?.id ?? null }
    }
  }

  const strutturaPubblica = await getStrutturaPubblica(struttura.id)
  if (!strutturaPubblica) notFound()

  return (
    <BookingLayout struttura={strutturaPubblica}>
      <SpaBookingFlow
        strutturaId={struttura.id}
        struttura={{
          nome: struttura.nome,
          logo: struttura.logo,
          colorePrimario: struttura.colorePrimario,
          telefono: struttura.host.telefono,
          regCardSpaTerminiHtml: struttura.host.regCardSpaTerminiHtml,
        }}
        trattamenti={trattamenti}
        percorsi={percorsi.map(p => ({
          ...p,
          passaggi: p.passaggi.map(ps => ({ ordine: ps.ordine, durata: ps.durata, trattamentoNome: ps.trattamento.nome })),
        }))}
        terapisti={terapisti}
        prenotazioneGuest={prenotazioneGuest}
      />
      <PublicConciergeWidget strutturaId={struttura.id} strutturaNome={struttura.nome} />
    </BookingLayout>
  )
}
