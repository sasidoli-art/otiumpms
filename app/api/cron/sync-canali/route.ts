import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAndParseIcal } from '@/lib/ical-import'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/sync-canali
 * Cron job: sincronizza tutti i canali attivi.
 * Da chiamare periodicamente (es. ogni 4 ore via Vercel Cron o servizio esterno).
 */
export async function GET() {
  const canali = await prisma.canaleEsterno.findMany({
    where: { attivo: true },
    select: { id: true, urlIcal: true, nome: true },
  })

  let successi = 0
  let errori = 0

  for (const canale of canali) {
    try {
      const eventi = await fetchAndParseIcal(canale.urlIcal)

      for (const ev of eventi) {
        await prisma.prenotazioneCanale.upsert({
          where: { canaleId_uidEvento: { canaleId: canale.id, uidEvento: ev.uid } },
          update: { sommario: ev.summary, dataInizio: ev.dtstart, dataFine: ev.dtend, descrizione: ev.description || null },
          create: { canaleId: canale.id, uidEvento: ev.uid, sommario: ev.summary, dataInizio: ev.dtstart, dataFine: ev.dtend, descrizione: ev.description || null },
        })
      }

      const uidPresenti = eventi.map(e => e.uid)
      if (uidPresenti.length > 0) {
        await prisma.prenotazioneCanale.deleteMany({ where: { canaleId: canale.id, uidEvento: { notIn: uidPresenti } } })
      }

      await prisma.canaleEsterno.update({
        where: { id: canale.id },
        data: { ultimoSync: new Date(), ultimoSyncOk: true, ultimoSyncError: null, eventiImportati: eventi.length },
      })
      successi++
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error(`Cron sync canale ${canale.nome} fallito`, { error: errMsg })
      await prisma.canaleEsterno.update({
        where: { id: canale.id },
        data: { ultimoSync: new Date(), ultimoSyncOk: false, ultimoSyncError: errMsg },
      })
      errori++
    }
  }

  return NextResponse.json({ canaliSincronizzati: successi, errori, totale: canali.length })
}
