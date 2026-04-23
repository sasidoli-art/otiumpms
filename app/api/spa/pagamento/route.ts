import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'
import { pagamentoSpaSchema } from '@/lib/validations'

/**
 * POST /api/spa/pagamento
 * Registra un pagamento per un appuntamento SPA.
 * Calcola il prezzo dal trattamento/percorso e registra il metodo di pagamento.
 */
export async function POST(req: NextRequest) {
  try {
    const hostSession = await requireHost()
    if (isUnauthorized(hostSession)) return hostSession

    const body = await req.json()
    const parsed = parseBody(pagamentoSpaSchema, body)
    if (parsed.error) return parsed.error

    const { appuntamentoId, importo, tipoImporto, metodo, unitaId, ultimeQuatroCifre, noteRiscossione, giftCardCodice } = parsed.data

    // Verifica che l'appuntamento appartenga a questo host
    const appuntamento = await prisma.appuntamentoSpa.findUnique({
      where: { id: appuntamentoId },
      select: { hostId: true, prezzoTotale: true },
    })

    if (!appuntamento) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })
    }

    if (appuntamento.hostId !== hostSession.user.hostId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Se metodo è CAMERA_CREDIT, verifica che la camera appartenga a una struttura del host
    if (metodo === 'CAMERA_CREDIT' && unitaId) {
      const unita = await prisma.unitaPrenotabile.findUnique({
        where: { id: unitaId },
        include: { struttura: true },
      })

      if (!unita || unita.struttura.hostId !== hostSession.user.hostId) {
        return NextResponse.json({ error: 'Camera non valida' }, { status: 400 })
      }
    }

    // Se metodo è GIFT_CARD, scala il saldo PRIMA di creare il pagamento.
    // Se la gift card non è valida o saldo insufficiente, fallisce subito (no rollback).
    let noteGiftCard: string | null = null
    if (metodo === 'GIFT_CARD') {
      if (!giftCardCodice) {
        return NextResponse.json({ error: 'Codice gift card mancante' }, { status: 400 })
      }
      const { utilizzaGiftCard } = await import('@/lib/gift-card')
      const r = await utilizzaGiftCard({
        codice: giftCardCodice,
        importo,
        hostId: hostSession.user.hostId,
        appuntamentoId,
        descrizione: `SPA · appuntamento ${appuntamentoId}`,
        operatore: hostSession.user.email ?? hostSession.user.id,
      })
      if (!r.successo) {
        return NextResponse.json({ error: r.errore, saldoDisponibile: r.saldoDisponibile }, { status: 400 })
      }
      noteGiftCard = `Gift card ${giftCardCodice.toUpperCase()} · saldo residuo €${r.saldoResiduo.toFixed(2)}`
    }

    // Crea o aggiorna il pagamento. Per GIFT_CARD → subito RISCOSSO (transazione già avvenuta).
    const stato = metodo === 'GIFT_CARD' ? 'RISCOSSO' : 'PENDENTE'
    const dataRiscossione = metodo === 'GIFT_CARD' ? new Date() : null
    const pagamento = await prisma.pagamentoSpa.upsert({
      where: { appuntamentoId },
      update: {
        importo,
        tipoImporto,
        metodo,
        unitaId: metodo === 'CAMERA_CREDIT' ? unitaId : null,
        ultimeQuatroCifre: metodo === 'CARTA' ? ultimeQuatroCifre : null,
        noteRiscossione: noteGiftCard ?? noteRiscossione,
        ...(metodo === 'GIFT_CARD' ? { stato: 'RISCOSSO' as const, dataRiscossione: new Date() } : {}),
      },
      create: {
        appuntamentoId,
        importo,
        tipoImporto,
        metodo,
        unitaId: metodo === 'CAMERA_CREDIT' ? unitaId : null,
        ultimeQuatroCifre: metodo === 'CARTA' ? ultimeQuatroCifre : null,
        noteRiscossione: noteGiftCard ?? noteRiscossione,
        stato,
        dataRiscossione,
      },
    })

    // GDPR Art. 30 — traccia pagamento (dati finanziari)
    await auditFromAuth(hostSession, {
      azione: 'pagamento_spa.upsert',
      entita: 'pagamentoSpa',
      entitaId: pagamento.id,
      dettagli: `Pagamento €${importo} metodo=${metodo}${ultimeQuatroCifre ? ` card****${ultimeQuatroCifre}` : ''} appuntamento=${appuntamentoId}`,
    })

    // Loyalty — se il pagamento è stato RISCOSSO (ora o in update precedente),
    // accumula punti. Silenzioso se programma/membership assenti.
    if (pagamento.stato === 'RISCOSSO') {
      import('@/lib/fedelta').then(({ accumulaPuntiDaAppuntamentoSpa }) =>
        accumulaPuntiDaAppuntamentoSpa(pagamento.appuntamentoId).catch(() => {}),
      )
    }

    return NextResponse.json(pagamento, { status: 200 })
  } catch (error) {
    console.error('[API] POST /api/spa/pagamento:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * GET /api/spa/pagamento?appuntamentoId=xxx
 * Recupera i dettagli del pagamento di un appuntamento SPA.
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
      select: { hostId: true, pagamento: true },
    })

    if (!appuntamento) {
      return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })
    }

    if (appuntamento.hostId !== hostSession.user.hostId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    return NextResponse.json(appuntamento.pagamento || null, { status: 200 })
  } catch (error) {
    console.error('[API] GET /api/spa/pagamento:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
