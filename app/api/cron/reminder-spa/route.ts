import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailReminderAppuntamentoSpa } from '@/lib/email'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/reminder-spa
 *
 * Invia email di reminder agli ospiti con appuntamento SPA domani.
 * Da chiamare ogni giorno (es. ore 18:00) da un cron esterno o Vercel Cron.
 *
 * Protezione: header Authorization: Bearer <CRON_SECRET>
 * Configurare CRON_SECRET nelle variabili d'ambiente.
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
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)
  const dopodomani = new Date(domani)
  dopodomani.setDate(dopodomani.getDate() + 1)

  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where: {
      dataOra: { gte: domani, lt: dopodomani },
      stato: { in: ['PRENOTATO', 'CONFERMATO'] },
      guestEmail: { not: null },
    },
    include: {
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      host: { select: { nomeAzienda: true } },
    },
  })

  let inviati = 0
  let errori = 0

  await Promise.allSettled(
    appuntamenti.map(async (a) => {
      const servizioNome = a.trattamento?.nome ?? a.percorso?.nome ?? 'Trattamento SPA'
      try {
        await sendEmailReminderAppuntamentoSpa({
          guestEmail: a.guestEmail!,
          guestNome: a.guestNome,
          hostNome: a.host.nomeAzienda,
          servizioNome,
          dataOra: new Date(a.dataOra),
          durata: a.durata,
        })
        inviati++
      } catch (err) {
        errori++
        logger.error('Reminder SPA fallito', 'cron/reminder-spa', {
          appuntamentoId: a.id,
          error: String(err),
        })
      }
    }),
  )

  logger.info('Cron reminder SPA completato', 'cron/reminder-spa', { inviati, errori, totale: appuntamenti.length })
  return NextResponse.json({ ok: true, inviati, errori, totale: appuntamenti.length })
}
