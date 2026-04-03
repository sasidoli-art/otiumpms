import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/spa/wellness-card
 * Endpoint PUBBLICO — l'ospite compila la wellness card dal suo telefono.
 * Auth via appuntamentoId (token nell'URL della pagina).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`wellness-card:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { appuntamentoId, firmaBase64, ...rest } = body

    if (!appuntamentoId) return NextResponse.json({ error: 'appuntamentoId richiesto' }, { status: 400 })
    if (!firmaBase64) return NextResponse.json({ error: 'Firma obbligatoria' }, { status: 400 })

    // Verifica che l'appuntamento esista
    const appuntamento = await prisma.appuntamentoSpa.findUnique({
      where: { id: appuntamentoId },
      select: { id: true },
    })
    if (!appuntamento) return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })

    // Upsert waiver
    const waiver = await prisma.waiverSpa.upsert({
      where: { appuntamentoId },
      update: {
        firmaBase64,
        zoneTrattate: rest.zoneTrattate || [],
        zoneEvitare: rest.zoneEvitare || [],
        incinta: rest.incinta ?? false,
        incintaMesi: rest.incintaMesi ?? null,
        condizioni: rest.condizioni || [],
        condizioneAltro: rest.condizioneAltro ?? null,
        allergieSelezionate: rest.allergieSelezionate || [],
        allergieAltro: rest.allergieAltro ?? null,
        allergie: rest.allergie ?? null,
        patologie: rest.patologie ?? null,
        farmaci: rest.farmaci ?? null,
        pressioneMassaggio: rest.pressioneMassaggio ?? null,
        temperaturaPreferita: rest.temperaturaPreferita ?? null,
        musicaPreferita: rest.musicaPreferita ?? null,
        aromiPreferiti: rest.aromiPreferiti ?? null,
        notePreferenze: rest.notePreferenze ?? null,
        dichiarazioneNessuna: rest.dichiarazioneNessuna ?? false,
        accettazioneTermini: rest.accettazioneTermini ?? false,
        accettazionePrivacy: rest.accettazionePrivacy ?? false,
        confermato: true,
      },
      create: {
        appuntamentoId,
        firmaBase64,
        zoneTrattate: rest.zoneTrattate || [],
        zoneEvitare: rest.zoneEvitare || [],
        incinta: rest.incinta ?? false,
        incintaMesi: rest.incintaMesi ?? null,
        condizioni: rest.condizioni || [],
        condizioneAltro: rest.condizioneAltro ?? null,
        allergieSelezionate: rest.allergieSelezionate || [],
        allergieAltro: rest.allergieAltro ?? null,
        allergie: rest.allergie ?? null,
        patologie: rest.patologie ?? null,
        farmaci: rest.farmaci ?? null,
        pressioneMassaggio: rest.pressioneMassaggio ?? null,
        temperaturaPreferita: rest.temperaturaPreferita ?? null,
        musicaPreferita: rest.musicaPreferita ?? null,
        aromiPreferiti: rest.aromiPreferiti ?? null,
        notePreferenze: rest.notePreferenze ?? null,
        dichiarazioneNessuna: rest.dichiarazioneNessuna ?? false,
        accettazioneTermini: rest.accettazioneTermini ?? false,
        accettazionePrivacy: rest.accettazionePrivacy ?? false,
        confermato: true,
      },
    })

    return NextResponse.json({ ok: true, waiverId: waiver.id })
  } catch (error) {
    console.error('[wellness-card]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
