import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { autoProvisionWifiByPrenotazioneId } from '@/lib/wifi/auto-provision'
import { z } from 'zod'

/**
 * POST /api/host/wifi/access-codes/from-booking
 * Genera (o recupera idempotente) un codice Wi-Fi per una prenotazione attiva.
 *
 * Body: { prenotazioneId: string }
 *
 * Risposta:
 *   200 { code: { codice, validoFino, durataMinuti, usiMax } }   — generato/idempotente
 *   404 { error }                                                — prenotazione non trovata o non eligibile
 *   403 { error }                                                — modulo wifi non attivo
 *
 * Use case: webhook check-in, server action di "Conferma prenotazione + invia email
 * di benvenuto", chiamata manuale da UI host quando vuole ri-generare/recuperare
 * il codice di un ospite specifico.
 */

const bodySchema = z.object({
  prenotazioneId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'prenotazioneId obbligatorio' }, { status: 422 })
  }

  // Verifica ownership: la prenotazione deve appartenere all'host del caller
  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: parsed.data.prenotazioneId },
    select: { id: true, hostId: true },
  })
  if (!prenotazione) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }
  if (prenotazione.hostId !== auth.user.hostId) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const result = await autoProvisionWifiByPrenotazioneId(parsed.data.prenotazioneId)
  if (!result) {
    return NextResponse.json(
      {
        error:
          'Impossibile generare codice per questa prenotazione (modulo wifi non attivo, prenotazione non confermata, o date mancanti)',
      },
      { status: 422 },
    )
  }

  return NextResponse.json({ code: result }, { status: 201 })
}
