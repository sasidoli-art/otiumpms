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

    const { appuntamentoId, importo, tipoImporto, metodo, unitaId, ultimeQuatroCifre, noteRiscossione } = parsed.data

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

    // Crea o aggiorna il pagamento
    const pagamento = await prisma.pagamentoSpa.upsert({
      where: { appuntamentoId },
      update: {
        importo,
        tipoImporto,
        metodo,
        unitaId: metodo === 'CAMERA_CREDIT' ? unitaId : null,
        ultimeQuatroCifre: metodo === 'CARTA' ? ultimeQuatroCifre : null,
        noteRiscossione,
      },
      create: {
        appuntamentoId,
        importo,
        tipoImporto,
        metodo,
        unitaId: metodo === 'CAMERA_CREDIT' ? unitaId : null,
        ultimeQuatroCifre: metodo === 'CARTA' ? ultimeQuatroCifre : null,
        noteRiscossione,
        stato: 'PENDENTE',
      },
    })

    // GDPR Art. 30 — traccia pagamento (dati finanziari)
    await auditFromAuth(hostSession, {
      azione: 'pagamento_spa.upsert',
      entita: 'pagamentoSpa',
      entitaId: pagamento.id,
      dettagli: `Pagamento €${importo} metodo=${metodo}${ultimeQuatroCifre ? ` card****${ultimeQuatroCifre}` : ''} appuntamento=${appuntamentoId}`,
    })

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
