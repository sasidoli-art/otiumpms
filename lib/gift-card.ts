/**
 * Gift card helpers — creazione, utilizzo, ricarica, verifica.
 *
 * Wrapper centrale della logica gift card, utilizzabile da:
 *   - API host (/api/host/spa/gift-card, /redeem)
 *   - POS (/api/host/pos) come metodo di pagamento
 *   - SPA payment (/api/spa/pagamento) come metodo di pagamento
 *   - Checkout prenotazione (PagamentoCheckout.metodo='GIFT_CARD')
 *
 * Terminologia schema (≠ spec):
 *   - `valoreOriginale` (no `importo`)
 *   - `saldoResiduo` (no `saldo`)
 *   - `GiftCardMovimento` tipo `EMISSIONE/UTILIZZO/RICARICA/RIMBORSO` (no `ACQUISTO`)
 *   - stato `ATTIVA/UTILIZZATA/SCADUTA/ANNULLATA` (no `ESAURITA` — dopo saldo=0 → UTILIZZATA)
 */

import { prisma } from '@/lib/db'
import type { GiftCard } from '@prisma/client'
import { sendEmailGeneric } from '@/lib/email'
import { logger } from '@/lib/logger'

// ────────────────────────────────────────────────────────────────────────────
// Codice univoco
// ────────────────────────────────────────────────────────────────────────────

/**
 * Formato: `OW-XXXX-XXXX-XXXX` (14 char alfanum, no char ambigui 0/O, 1/I/L).
 * 4 gruppi: 14^{12} spazio → collision probability trascurabile.
 */
function generaCodice(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // rimossi 0, O, 1, I, L
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `OW-${part()}-${part()}-${part()}`
}

async function generaCodiceUnivoco(maxTentativi = 5): Promise<string> {
  for (let i = 0; i < maxTentativi; i++) {
    const candidate = generaCodice()
    const existing = await prisma.giftCard.findUnique({ where: { codice: candidate } })
    if (!existing) return candidate
  }
  throw new Error('Impossibile generare codice univoco dopo 5 tentativi')
}

// ────────────────────────────────────────────────────────────────────────────
// Creazione
// ────────────────────────────────────────────────────────────────────────────

export type CreaGiftCardParams = {
  hostId: string
  importo: number
  acquirenteNome: string
  acquirenteEmail: string
  destinatarioNome?: string | null
  destinatarioEmail?: string | null
  messaggio?: string | null
  dataScadenza?: Date | null
  tipo?: 'IMPORTO' | 'TRATTAMENTO' | 'PACCHETTO'
  trattamentoId?: string | null
  acquirenteTelefono?: string | null
}

export async function creaGiftCard(params: CreaGiftCardParams): Promise<GiftCard> {
  if (params.importo <= 0) throw new Error('Importo deve essere > 0')

  const codice = await generaCodiceUnivoco()
  const scadenza = params.dataScadenza ?? addMonths(new Date(), 12)

  const [giftCard] = await prisma.$transaction([
    prisma.giftCard.create({
      data: {
        hostId: params.hostId,
        codice,
        tipo: params.tipo ?? 'IMPORTO',
        trattamentoId: params.trattamentoId ?? null,
        valoreOriginale: params.importo,
        saldoResiduo: params.importo,
        acquirenteNome: params.acquirenteNome,
        acquirenteEmail: params.acquirenteEmail,
        acquirenteTelefono: params.acquirenteTelefono ?? null,
        destinatarioNome: params.destinatarioNome ?? null,
        destinatarioEmail: params.destinatarioEmail ?? null,
        messaggio: params.messaggio ?? null,
        dataScadenza: scadenza,
        stato: 'ATTIVA',
      },
    }),
  ])

  // Movimento EMISSIONE (separato per poter includere saldoDopo della card creata)
  await prisma.giftCardMovimento.create({
    data: {
      giftCardId: giftCard.id,
      tipo: 'EMISSIONE',
      importo: params.importo,
      saldoDopo: params.importo,
      descrizione: `Emissione gift card €${params.importo.toFixed(2)} · Acquirente: ${params.acquirenteNome}`,
    },
  })

  // Email al destinatario (best-effort)
  if (params.destinatarioEmail) {
    try {
      await sendEmailGeneric({
        to: params.destinatarioEmail,
        subject: 'Hai ricevuto una Gift Card Otium!',
        text: buildEmailDestinatario({
          destinatarioNome: params.destinatarioNome,
          acquirenteNome: params.acquirenteNome,
          codice,
          valore: params.importo,
          scadenza,
          messaggio: params.messaggio,
        }),
        hostId: params.hostId,
      })
    } catch (err) {
      logger.warn('Email gift card al destinatario fallita', { error: String(err), giftCardId: giftCard.id })
    }
  }

  // Email conferma all'acquirente (best-effort)
  try {
    await sendEmailGeneric({
      to: params.acquirenteEmail,
      subject: `Conferma acquisto gift card €${params.importo.toFixed(2)}`,
      text: buildEmailAcquirente({
        acquirenteNome: params.acquirenteNome,
        codice,
        valore: params.importo,
        scadenza,
        destinatarioNome: params.destinatarioNome,
      }),
      hostId: params.hostId,
    })
  } catch (err) {
    logger.warn('Email conferma acquirente fallita', { error: String(err), giftCardId: giftCard.id })
  }

  return giftCard
}

// ────────────────────────────────────────────────────────────────────────────
// Utilizzo
// ────────────────────────────────────────────────────────────────────────────

export type UtilizzaGiftCardParams = {
  codice: string
  importo: number
  hostId: string
  descrizione?: string
  appuntamentoId?: string | null
  operatore?: string
}

export type UtilizzaGiftCardResult =
  | { successo: true; giftCardId: string; saldoResiduo: number; movimentoId: string }
  | { successo: false; errore: string; saldoDisponibile?: number }

export async function utilizzaGiftCard(
  params: UtilizzaGiftCardParams,
): Promise<UtilizzaGiftCardResult> {
  const { codice, importo, hostId, descrizione, appuntamentoId, operatore } = params

  if (importo <= 0) return { successo: false, errore: 'Importo deve essere > 0' }

  const gc = await prisma.giftCard.findFirst({
    where: { codice: codice.trim().toUpperCase(), hostId },
  })

  if (!gc) return { successo: false, errore: 'Codice non valido' }

  if (gc.stato === 'ANNULLATA') return { successo: false, errore: 'Gift card annullata' }
  if (gc.stato === 'UTILIZZATA') return { successo: false, errore: 'Gift card già utilizzata' }
  if (gc.stato === 'SCADUTA') return { successo: false, errore: 'Gift card scaduta' }

  if (gc.dataScadenza && new Date(gc.dataScadenza) < new Date()) {
    // Auto-marca SCADUTA e rifiuta
    await prisma.giftCard.update({
      where: { id: gc.id },
      data: { stato: 'SCADUTA' },
    })
    return { successo: false, errore: 'Gift card scaduta' }
  }

  if (gc.saldoResiduo < importo) {
    return {
      successo: false,
      errore: `Saldo insufficiente (disponibile €${gc.saldoResiduo.toFixed(2)})`,
      saldoDisponibile: gc.saldoResiduo,
    }
  }

  const nuovoSaldo = gc.saldoResiduo - importo
  const nuovoStato = nuovoSaldo <= 0 ? 'UTILIZZATA' : 'ATTIVA'

  const [, movimento] = await prisma.$transaction([
    prisma.giftCard.update({
      where: { id: gc.id },
      data: {
        saldoResiduo: nuovoSaldo,
        stato: nuovoStato,
        dataUtilizzo: nuovoStato === 'UTILIZZATA' ? new Date() : gc.dataUtilizzo,
      },
    }),
    prisma.giftCardMovimento.create({
      data: {
        giftCardId: gc.id,
        tipo: 'UTILIZZO',
        importo: -importo,
        saldoDopo: nuovoSaldo,
        descrizione: descrizione ?? `Utilizzo €${importo.toFixed(2)}`,
        appuntamentoId: appuntamentoId ?? null,
        operatore: operatore ?? null,
      },
    }),
  ])

  return {
    successo: true,
    giftCardId: gc.id,
    saldoResiduo: nuovoSaldo,
    movimentoId: movimento.id,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Ricarica / Rimborso
// ────────────────────────────────────────────────────────────────────────────

export async function ricaricaGiftCard(params: {
  codice: string
  importoRicarica: number
  hostId: string
  operatore?: string
}): Promise<UtilizzaGiftCardResult> {
  const gc = await prisma.giftCard.findFirst({
    where: { codice: params.codice.trim().toUpperCase(), hostId: params.hostId },
  })
  if (!gc) return { successo: false, errore: 'Codice non valido' }
  if (gc.stato === 'ANNULLATA') return { successo: false, errore: 'Gift card annullata' }

  const nuovoSaldo = gc.saldoResiduo + params.importoRicarica
  const [, movimento] = await prisma.$transaction([
    prisma.giftCard.update({
      where: { id: gc.id },
      data: { saldoResiduo: nuovoSaldo, stato: 'ATTIVA' },
    }),
    prisma.giftCardMovimento.create({
      data: {
        giftCardId: gc.id,
        tipo: 'RICARICA',
        importo: params.importoRicarica,
        saldoDopo: nuovoSaldo,
        descrizione: `Ricarica €${params.importoRicarica.toFixed(2)}`,
        operatore: params.operatore ?? null,
      },
    }),
  ])

  return {
    successo: true,
    giftCardId: gc.id,
    saldoResiduo: nuovoSaldo,
    movimentoId: movimento.id,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Verifica (read-only, per UI lookup)
// ────────────────────────────────────────────────────────────────────────────

export async function verificaGiftCard(codice: string, hostId: string): Promise<{
  valida: boolean
  errore?: string
  giftCard?: GiftCard
}> {
  const gc = await prisma.giftCard.findFirst({
    where: { codice: codice.trim().toUpperCase(), hostId },
  })
  if (!gc) return { valida: false, errore: 'Codice non valido' }
  if (gc.stato === 'ANNULLATA') return { valida: false, errore: 'Gift card annullata', giftCard: gc }
  if (gc.stato === 'UTILIZZATA') return { valida: false, errore: 'Gift card già utilizzata', giftCard: gc }
  if (gc.stato === 'SCADUTA' || (gc.dataScadenza && new Date(gc.dataScadenza) < new Date())) {
    return { valida: false, errore: 'Gift card scaduta', giftCard: gc }
  }
  return { valida: true, giftCard: gc }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function addMonths(d: Date, months: number): Date {
  const next = new Date(d)
  next.setMonth(next.getMonth() + months)
  return next
}

function buildEmailDestinatario(opts: {
  destinatarioNome: string | null | undefined
  acquirenteNome: string
  codice: string
  valore: number
  scadenza: Date
  messaggio: string | null | undefined
}): string {
  const greet = opts.destinatarioNome ? ` ${opts.destinatarioNome}` : ''
  const msgBlock = opts.messaggio ? `\n\nMessaggio da ${opts.acquirenteNome}:\n"${opts.messaggio}"` : ''
  return `Ciao${greet},

${opts.acquirenteNome} ti ha regalato una Gift Card Otium!

Codice: ${opts.codice}
Valore: €${opts.valore.toFixed(2)}
Valida fino al: ${opts.scadenza.toLocaleDateString('it-IT')}${msgBlock}

Presenta il codice al momento della prenotazione o al check-in per utilizzare la gift card.

Ti aspettiamo!`
}

function buildEmailAcquirente(opts: {
  acquirenteNome: string
  codice: string
  valore: number
  scadenza: Date
  destinatarioNome: string | null | undefined
}): string {
  const recipient = opts.destinatarioNome ? ` per ${opts.destinatarioNome}` : ''
  return `Ciao ${opts.acquirenteNome},

Grazie per aver acquistato una Gift Card Otium${recipient}.

Riepilogo:
- Codice: ${opts.codice}
- Valore: €${opts.valore.toFixed(2)}
- Scadenza: ${opts.scadenza.toLocaleDateString('it-IT')}

${opts.destinatarioNome ? `Abbiamo inviato il codice direttamente al destinatario.` : `Conserva il codice e utilizzalo al momento giusto.`}

Grazie,
Otium`
}
