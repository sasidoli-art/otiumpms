import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/check-abbonamenti
 *
 * Cron endpoint to check expiring and expired subscriptions.
 *
 * Actions:
 *  1. Find hosts where dataFineAbb < today and statoAbbonamento = ATTIVO => mark as SCADUTO
 *  2. Find hosts where dataFineAbb is within the next 7 days => create expiring notification
 *
 * Protection: CRON_SECRET Bearer token in Authorization header.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
  }

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  const tra7giorni = new Date(oggi)
  tra7giorni.setDate(tra7giorni.getDate() + 7)

  // ─── 1. Expire subscriptions past their end date ──────────────────────────

  const scaduti = await prisma.host.findMany({
    where: {
      statoAbbonamento: 'ATTIVO',
      dataFineAbb: { lt: oggi },
    },
    select: { id: true, nomeAzienda: true, piano: true, dataFineAbb: true },
  })

  let aggiornatiScaduti = 0
  for (const host of scaduti) {
    await prisma.host.update({
      where: { id: host.id },
      data: { statoAbbonamento: 'SCADUTO' },
    })

    // Create a notification for the host
    await prisma.notifica.create({
      data: {
        hostId: host.id,
        tipo: 'sistema',
        titolo: 'Abbonamento scaduto',
        messaggio: `Il tuo abbonamento e scaduto il ${host.dataFineAbb?.toISOString().slice(0, 10) ?? '—'}. Rinnova per continuare a utilizzare la piattaforma.`,
      },
    })

    aggiornatiScaduti++
    logger.warn(
      `Abbonamento scaduto: ${host.nomeAzienda} (${host.piano})`,
      'cron/check-abbonamenti',
      { hostId: host.id },
    )
  }

  // ─── 2. Warn hosts expiring in the next 7 days ───────────────────────────

  const inScadenza = await prisma.host.findMany({
    where: {
      statoAbbonamento: 'ATTIVO',
      dataFineAbb: {
        gte: oggi,
        lte: tra7giorni,
      },
    },
    select: { id: true, nomeAzienda: true, piano: true, dataFineAbb: true },
  })

  let notificheInviate = 0
  for (const host of inScadenza) {
    // Avoid duplicate notifications: check if one was already sent today
    const giaTodayNotifica = await prisma.notifica.findFirst({
      where: {
        hostId: host.id,
        tipo: 'sistema',
        titolo: 'Abbonamento in scadenza',
        createdAt: { gte: oggi },
      },
    })

    if (!giaTodayNotifica) {
      const giorniRimasti = Math.ceil(
        ((host.dataFineAbb?.getTime() ?? 0) - oggi.getTime()) / (1000 * 60 * 60 * 24),
      )

      await prisma.notifica.create({
        data: {
          hostId: host.id,
          tipo: 'sistema',
          titolo: 'Abbonamento in scadenza',
          messaggio: `Il tuo abbonamento scade tra ${giorniRimasti} giorni (${host.dataFineAbb?.toISOString().slice(0, 10) ?? '—'}). Rinnova per evitare interruzioni del servizio.`,
        },
      })

      notificheInviate++
    }
  }

  logger.info(
    'Cron check-abbonamenti completato',
    'cron/check-abbonamenti',
    {
      scadutiTrovati: scaduti.length,
      aggiornatiScaduti,
      inScadenzaTrovati: inScadenza.length,
      notificheInviate,
    },
  )

  return NextResponse.json({
    ok: true,
    scaduti: aggiornatiScaduti,
    inScadenza: inScadenza.length,
    notificheInviate,
  })
}
