import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { fetchAndParseIcal } from '@/lib/ical-import'
import { logger } from '@/lib/logger'

/**
 * POST /api/host/canali/[id]/sync
 * Sincronizza un canale: fetch iCal, parse, upsert prenotazioni importate.
 */
export async function POST(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const canale = await prisma.canaleEsterno.findFirst({
    where: { id, struttura: { hostId: auth.user.hostId } },
  })
  if (!canale) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  try {
    const eventi = await fetchAndParseIcal(canale.urlIcal)

    // Upsert ogni evento
    let importati = 0
    for (const ev of eventi) {
      await prisma.prenotazioneCanale.upsert({
        where: { canaleId_uidEvento: { canaleId: id, uidEvento: ev.uid } },
        update: {
          sommario: ev.summary,
          dataInizio: ev.dtstart,
          dataFine: ev.dtend,
          descrizione: ev.description || null,
        },
        create: {
          canaleId: id,
          uidEvento: ev.uid,
          sommario: ev.summary,
          dataInizio: ev.dtstart,
          dataFine: ev.dtend,
          descrizione: ev.description || null,
        },
      })
      importati++
    }

    // Rimuovi eventi non più presenti nel feed
    const uidPresenti = eventi.map(e => e.uid)
    if (uidPresenti.length > 0) {
      await prisma.prenotazioneCanale.deleteMany({
        where: { canaleId: id, uidEvento: { notIn: uidPresenti } },
      })
    }

    // Aggiorna stato sync
    await prisma.canaleEsterno.update({
      where: { id },
      data: {
        ultimoSync: new Date(),
        ultimoSyncOk: true,
        ultimoSyncError: null,
        eventiImportati: importati,
      },
    })

    return NextResponse.json({ ok: true, importati, totaleEventi: eventi.length })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error(`Sync canale ${id} fallito`, { error: errMsg })

    await prisma.canaleEsterno.update({
      where: { id },
      data: {
        ultimoSync: new Date(),
        ultimoSyncOk: false,
        ultimoSyncError: errMsg,
      },
    })

    return NextResponse.json({ error: `Sync fallito: ${errMsg}` }, { status: 500 })
  }
}
