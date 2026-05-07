import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcolaBiancheria, generaTestoRichiesta } from '@/lib/biancheria'
import { sendEmailGeneric } from '@/lib/email'
import { addDays } from 'date-fns'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/biancheria
 * Cron: genera e invia automaticamente le richieste biancheria per domani.
 * Per ogni host con configurazione email lavanderia, genera e invia.
 * Da chiamare ogni giorno alle ~16:00.
 */
export async function GET() {
  const domani = addDays(new Date(), 1)

  // Trova tutti gli host con email lavanderia configurata
  // (usiamo il campo note del profilo o un campo dedicato — per ora usiamo smtpUser come fallback)
  const hosts = await prisma.host.findMany({
    select: { id: true, nomeAzienda: true, emailMittente: true },
  })

  let generati = 0
  const inviati = 0
  let errori = 0

  for (const host of hosts) {
    try {
      const riepilogo = await calcolaBiancheria(host.id, domani)
      if (riepilogo.righe.length === 0) continue

      // Genera richiesta in DB
      const richiesta = await prisma.richiestaBiancheria.create({
        data: {
          hostId: host.id,
          dataConsegna: domani,
          righe: riepilogo.righe as object[],
          totaleArticoli: riepilogo.totaleArticoli,
          totaleCamere: riepilogo.totaleCamere,
          note: 'Generata automaticamente dal cron giornaliero',
        },
      })
      generati++

      // Se c'è un'email configurata, invia automaticamente
      // (in futuro: campo dedicato per email lavanderia)
      // Per ora logga solo
      logger.info(`Cron biancheria: ${host.nomeAzienda} — ${riepilogo.totaleCamere} camere, ${riepilogo.totaleArticoli} articoli`)
    } catch (err) {
      logger.error(`Cron biancheria errore per host ${host.id}`, { error: String(err) })
      errori++
    }
  }

  return NextResponse.json({ generati, inviati, errori, data: domani.toISOString().split('T')[0] })
}
