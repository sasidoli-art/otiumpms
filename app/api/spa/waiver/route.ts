import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'
import { waiverSpaSchema } from '@/lib/validations'

/**
 * POST /api/spa/waiver
 * Crea o aggiorna un waiver per un appuntamento SPA.
 * Salva firma, dichiarazioni cliniche, zone corpo e T&C.
 */
export async function POST(req: NextRequest) {
  try {
    const hostSession = await requireHost()
    if (isUnauthorized(hostSession)) return hostSession

    const body = await req.json()
    const parsed = parseBody(waiverSpaSchema, body)
    if (parsed.error) return parsed.error

    const { appuntamentoId, firmaBase64, zoneTrattate, zoneEvitare, ...dichiarazioni } = parsed.data

    // Verifica che l'appuntamento appartenga a questo host
    const appuntamento = await prisma.appuntamentoSpa.findUnique({
      where: { id: appuntamentoId },
      select: { hostId: true },
    })

    if (!appuntamento) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })
    }

    if (appuntamento.hostId !== hostSession.user.hostId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Upsert waiver
    const waiver = await prisma.waiverSpa.upsert({
      where: { appuntamentoId },
      update: {
        firmaBase64,
        zoneTrattate: zoneTrattate || [],
        zoneEvitare: zoneEvitare || [],
        ...dichiarazioni,
        confermato: true,
      },
      create: {
        appuntamentoId,
        firmaBase64,
        zoneTrattate: zoneTrattate || [],
        zoneEvitare: zoneEvitare || [],
        ...dichiarazioni,
        confermato: true,
      },
    })

    // GDPR Art. 30 — traccia upsert waiver (dati Art. 9 sanitari)
    await auditFromAuth(hostSession, {
      azione: 'waiver_spa.upsert',
      entita: 'waiverSpa',
      entitaId: waiver.id,
      dettagli: `Waiver appuntamento ${appuntamentoId} firmato: ${firmaBase64 ? 'si' : 'no'}, zone=${(zoneTrattate ?? []).length}/${(zoneEvitare ?? []).length}`,
    })

    return NextResponse.json(waiver, { status: 200 })
  } catch (error) {
    console.error('[API] POST /api/spa/waiver:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * GET /api/spa/waiver?appuntamentoId=xxx
 * Recupera il waiver di un appuntamento SPA.
 */
export async function GET(req: NextRequest) {
  try {
    const hostSession = await requireHost()
    if (isUnauthorized(hostSession)) return hostSession

    const { searchParams } = new URL(req.url)
    const appuntamentoId = searchParams.get('appuntamentoId')

    if (!appuntamentoId) {
      return NextResponse.json({ error: 'appuntamentoId richiesto' }, { status: 400 })
    }

    // Verifica che l'appuntamento appartenga a questo host
    const appuntamento = await prisma.appuntamentoSpa.findUnique({
      where: { id: appuntamentoId },
      select: { hostId: true, waiver: true },
    })

    if (!appuntamento) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })
    }

    if (appuntamento.hostId !== hostSession.user.hostId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    return NextResponse.json(appuntamento.waiver || null, { status: 200 })
  } catch (error) {
    console.error('[API] GET /api/spa/waiver:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
