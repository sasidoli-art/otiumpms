import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { parseBody, abbonamentoUpgradeSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import {
  canUpgrade,
  isUpgrade,
  calculateProRata,
  daysRemaining,
  nextBillingPeriod,
  getPlanDefinition,
} from '@/lib/billing'

/**
 * POST /api/host/abbonamento/upgrade
 *
 * Change the host's subscription plan (upgrade or downgrade).
 * Creates a new Abbonamento record, updates Host fields, and
 * calculates pro-rata if upgrading mid-cycle.
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(abbonamentoUpgradeSchema, raw)
  if (parsed.error) return parsed.error
  const { nuovoPiano } = parsed.data

  // Load current host
  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: {
      id: true,
      piano: true,
      statoAbbonamento: true,
      dataInizioAbb: true,
      dataFineAbb: true,
      nomeAzienda: true,
    },
  })

  if (!host) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  // Validate the plan change
  const validation = canUpgrade(host.piano, nuovoPiano)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 422 })
  }

  // Calculate pro-rata if mid-cycle
  const giorniRimanenti = daysRemaining(host.dataFineAbb)
  const proRata = giorniRimanenti > 0
    ? calculateProRata(host.piano, nuovoPiano, giorniRimanenti)
    : null

  // Determine new billing period
  const upgrading = isUpgrade(host.piano, nuovoPiano)
  const newPlan = getPlanDefinition(nuovoPiano)
  const { dataInizio, dataFine } = nextBillingPeriod(nuovoPiano)

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create new Abbonamento record
    const abbonamento = await tx.abbonamento.create({
      data: {
        hostId: host.id,
        piano: nuovoPiano,
        stato: 'ATTIVO',
        dataInizio,
        dataFine,
        prezzoMensile: newPlan.prezzoMensile,
        note: upgrading
          ? `Upgrade da ${host.piano} a ${nuovoPiano}`
          : `Downgrade da ${host.piano} a ${nuovoPiano}`,
      },
    })

    // 2. Create payment record for the new cycle
    const pagamento = await tx.pagamento.create({
      data: {
        hostId: host.id,
        abbonamentoId: abbonamento.id,
        importo: newPlan.prezzoMensile,
        stato: 'IN_ATTESA',
        descrizione: `Abbonamento ${newPlan.label} — ciclo ${dataInizio.toISOString().slice(0, 10)} / ${dataFine.toISOString().slice(0, 10)}`,
        dataScadenza: dataFine,
        metodo: null,
      },
    })

    // 3. If pro-rata applies and it's an upgrade, create an additional payment
    let proRataPagamento = null
    if (proRata && proRata.importo > 0 && !proRata.isCredito) {
      proRataPagamento = await tx.pagamento.create({
        data: {
          hostId: host.id,
          abbonamentoId: abbonamento.id,
          importo: proRata.importo,
          stato: 'IN_ATTESA',
          descrizione: proRata.dettaglio,
          dataScadenza: new Date(), // due immediately
          metodo: null,
        },
      })
    }

    // 4. Update Host subscription fields
    await tx.host.update({
      where: { id: host.id },
      data: {
        piano: nuovoPiano,
        statoAbbonamento: 'ATTIVO',
        dataInizioAbb: dataInizio,
        dataFineAbb: dataFine,
      },
    })

    return { abbonamento, pagamento, proRataPagamento }
  })

  logger.info(
    `Piano cambiato: ${host.piano} -> ${nuovoPiano} per host ${host.nomeAzienda}`,
    'billing/upgrade',
    {
      hostId: host.id,
      oldPlan: host.piano,
      newPlan: nuovoPiano,
      proRata: proRata ?? null,
    },
  )

  return NextResponse.json({
    ok: true,
    abbonamento: result.abbonamento,
    pagamento: result.pagamento,
    proRata: proRata ?? null,
    proRataPagamento: result.proRataPagamento,
    message: upgrading
      ? `Piano aggiornato a ${newPlan.label}`
      : `Piano cambiato a ${newPlan.label}`,
  })
}
