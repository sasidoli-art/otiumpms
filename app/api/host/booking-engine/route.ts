import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'

export const dynamic = 'force-dynamic'

/**
 * GET /api/host/booking-engine?strutturaId=<id>
 *
 * Ritorna lo stato dei 3 booking engine (camere/spa/ristorante) per la
 * struttura selezionata, le statistiche del mese corrente e i dati
 * branding + custom domain per la sezione personalizzazione.
 *
 * Se strutturaId non e` fornito, usa la prima struttura dell'host.
 *
 * NOTA analytics: "visite" non sono tracciate. Ritorniamo null e la UI
 * mostra un placeholder esplicito invece di inventare numeri.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { hostId } = auth.user

  const url = new URL(req.url)
  const strutturaIdParam = url.searchParams.get('strutturaId')

  const strutture = await prisma.struttura.findMany({
    where: { hostId, attiva: true },
    select: {
      id: true,
      nome: true,
      colorePrimario: true,
      coloreSecondario: true,
      coloreSfondo: true,
      coloreTesto: true,
      fontFamily: true,
      borderRadius: true,
      logo: true,
      fotoHero: true,
      customDomain: true,
      customDomainVerificatoAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  if (strutture.length === 0) {
    return NextResponse.json({ error: 'Nessuna struttura attiva' }, { status: 404 })
  }

  const struttura = (strutturaIdParam && strutture.find((s) => s.id === strutturaIdParam)) || strutture[0]

  // Modulo attivi dell'host
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { moduliAttivi: true },
  })
  const moduli = parseModuli(host?.moduliAttivi)

  // Statistiche del mese corrente per struttura selezionata
  const startMonth = new Date()
  startMonth.setDate(1)
  startMonth.setHours(0, 0, 0, 0)

  const [prenCamere, apptSpa, prenRist] = await Promise.all([
    prisma.prenotazione.count({
      where: {
        hostId,
        strutturaId: struttura.id,
        createdAt: { gte: startMonth },
        deletedAt: null,
      },
    }),
    moduli.spa
      ? prisma.appuntamentoSpa.count({
          where: {
            hostId,
            createdAt: { gte: startMonth },
            // SPA e` scoped per-host, non per-struttura
          },
        })
      : Promise.resolve(0),
    moduli.ristorazione
      ? prisma.prenotazioneRistorante.count({
          where: {
            hostId,
            strutturaId: struttura.id,
            createdAt: { gte: startMonth },
          },
        })
      : Promise.resolve(0),
  ])

  const engines = [
    {
      key: 'camere' as const,
      label: 'Prenotazione Camere',
      attivo: moduli.prenotazioni !== false,
      moduloRichiesto: 'prenotazioni',
      path: `/book/${struttura.id}/camere`,
      prenotazioniMese: prenCamere,
    },
    {
      key: 'spa' as const,
      label: 'Prenotazione SPA',
      attivo: !!moduli.spa,
      moduloRichiesto: 'spa',
      path: `/book/${struttura.id}/spa`,
      prenotazioniMese: apptSpa,
    },
    {
      key: 'ristorante' as const,
      label: 'Prenotazione Ristorante',
      attivo: !!moduli.ristorazione,
      moduloRichiesto: 'ristorazione',
      path: `/book/${struttura.id}/ristorante`,
      prenotazioniMese: prenRist,
    },
  ]

  return NextResponse.json({
    struttura: {
      id: struttura.id,
      nome: struttura.nome,
      colorePrimario: struttura.colorePrimario,
      coloreSecondario: struttura.coloreSecondario,
      coloreSfondo: struttura.coloreSfondo,
      coloreTesto: struttura.coloreTesto,
      fontFamily: struttura.fontFamily,
      borderRadius: struttura.borderRadius,
      logo: struttura.logo,
      fotoHero: struttura.fotoHero,
      customDomain: struttura.customDomain,
      customDomainVerificato: !!struttura.customDomainVerificatoAt,
      customDomainVerificatoAt: struttura.customDomainVerificatoAt,
    },
    strutture: strutture.map((s) => ({ id: s.id, nome: s.nome })),
    engines,
    // Analytics non tracciate: UI mostra placeholder esplicito
    analyticsSupportate: false,
  })
}
