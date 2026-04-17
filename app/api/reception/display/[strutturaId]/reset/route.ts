import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/reception/display/[strutturaId]/reset
 * Salva firma checkout + resetta display a idle.
 * Body opzionale: { prenotazioneId, firmaBase64 }
 * Se body con firma: salva firma sulla prenotazione e segna regCard firmata.
 * Pubblico (usato dal tablet kiosk).
 */
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const { strutturaId } = await paramsPromise

  let body: { prenotazioneId?: string; firmaBase64?: string } = {}
  try { body = await req.json() } catch { /* no body = simple reset */ }

  // Se c'è una firma, salvala sulla prenotazione
  if (body.prenotazioneId && body.firmaBase64) {
    await prisma.prenotazione.update({
      where: { id: body.prenotazioneId },
      data: {
        regCardFirmata: true,
        regCardFirmaBase64: body.firmaBase64,
        regCardDataFirma: new Date(),
      },
    })

    // Notifica host
    const pren = await prisma.prenotazione.findUnique({
      where: { id: body.prenotazioneId },
      select: { guestNome: true, guestCognome: true, hostId: true },
    })
    if (pren) {
      await prisma.notifica.create({
        data: {
          hostId: pren.hostId,
          tipo: 'checkin',
          titolo: `Firma checkout: ${pren.guestNome} ${pren.guestCognome}`,
          messaggio: 'L\'ospite ha firmato la registration card al kiosk.',
          linkUrl: `/host/prenotazioni/${body.prenotazioneId}`,
          letta: false,
        },
      })
    }
  }

  // Reset display
  await prisma.struttura.update({
    where: { id: strutturaId },
    data: { firmaDisplayPrenotazioneId: null, firmaDisplayAttivaAt: null },
  })

  return NextResponse.json({ ok: true })
}
