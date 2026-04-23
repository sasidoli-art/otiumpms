/**
 * Loyalty Engine (ProgrammaFedelta + MembroFedelta + MovimentoPunti).
 *
 * Accumula/riscatta punti, calcola livello e moltiplicatore, crea movimento
 * (idempotente rispetto a saldoDopo), notifica l'host al level-up.
 *
 * Terminologia schema:
 *   - `MovimentoPunti.tipo: ACCUMULO | UTILIZZO | SCADENZA | BONUS | RETTIFICA`
 *     (la spec usava "RISCATTO" → reale "UTILIZZO")
 *   - saldo membro = `puntiAccumulati - puntiUtilizzati`
 *
 * Touchpoints integrati (helpers esportati):
 *   - `accumulaPuntiDaPrenotazione(prenotazioneId)`  — al checkout (COMPLETATA)
 *   - `accumulaPuntiDaAppuntamentoSpa(appuntamentoId)` — a pagamento SPA riscosso
 *   - `accumulaPuntiDaPOS(transazionePOSId)`         — a transazione POS completata
 *
 * Side-effect di riscatto premio:
 *   - SCONTO_PRENOTAZIONE  → AddebitoPrenotazione negativo (sconto su prenotazione)
 *   - TRATTAMENTO_GRATIS   → AppuntamentoSpa con `prezzoTotale: 0` (solo se prenotazioneId + data fornita)
 *   - UPGRADE_CAMERA       → AddebitoPrenotazione "Upgrade camera incluso" a 0
 *   - BONUS_PUNTI          → MovimentoPunti tipo BONUS (self-referential, per referral)
 *   - ALTRO                → solo movimento + `datiApplicazione` custom
 */

import { prisma } from '@/lib/db'
import type {
  MembroFedelta, LivelloFedelta, ProgrammaFedelta, PremioFedelta, Prisma,
} from '@prisma/client'
import { logger } from '@/lib/logger'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AccumuloOrigine = 'soggiorno' | 'spa' | 'pos' | 'referral' | 'bonus'

export interface RisultatoAccumulo {
  puntiAccumulati: number
  puntiTotali: number
  saldoAttuale: number
  livelloAttuale: string | null
  livelloId: string | null
  levelUp: boolean
}

export interface RisultatoRiscatto {
  successo: boolean
  errore?: string
  movimentoId?: string
  saldoResiduo?: number
  datiSideEffect?: Record<string, unknown>
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

export function saldoMembro(m: Pick<MembroFedelta, 'puntiAccumulati' | 'puntiUtilizzati'>): number {
  return m.puntiAccumulati - m.puntiUtilizzati
}

/**
 * Calcola il livello appropriato per un saldo punti.
 * Ritorna il livello con `puntiMinimi` più alto che il saldo soddisfa.
 */
export function calcolaLivello(
  punti: number,
  livelli: LivelloFedelta[],
): LivelloFedelta | null {
  if (livelli.length === 0) return null
  const sorted = [...livelli].sort((a, b) => b.puntiMinimi - a.puntiMinimi)
  for (const l of sorted) {
    if (punti >= l.puntiMinimi) return l
  }
  return null
}

function getMoltiplicatore(livello: LivelloFedelta | null): number {
  return livello?.moltiplicatore ?? 1.0
}

async function notificaLevelUp(
  hostId: string,
  membro: { id: string; ospiteId: string },
  vecchioLivello: LivelloFedelta | null,
  nuovoLivello: LivelloFedelta,
): Promise<void> {
  try {
    const ospite = await prisma.ospiteCRM.findUnique({
      where: { id: membro.ospiteId },
      select: { nome: true, cognome: true },
    })
    const nome = ospite ? `${ospite.nome} ${ospite.cognome}` : 'Membro fedeltà'
    const da = vecchioLivello?.nome ?? 'Nessun livello'
    await prisma.notifica.create({
      data: {
        hostId,
        tipo: 'loyalty_level_up',
        titolo: `Level-up loyalty: ${nome} → ${nuovoLivello.nome}`,
        messaggio: `${nome} è passato da ${da} a ${nuovoLivello.nome}`,
        linkUrl: `/host/spa/loyalty#membro-${membro.id}`,
      },
    })
  } catch (err) {
    logger.warn('Notifica level-up fallita', { error: String(err) })
  }
}

/**
 * Trova (o crea se prima interazione) il MembroFedelta per un'email ospite,
 * assumendo un singolo `ProgrammaFedelta` per host. Ritorna null se l'host non
 * ha un programma attivo o l'ospite non ha email.
 */
async function trovaOCreaMembro(
  hostId: string,
  guestEmail: string | null | undefined,
): Promise<{ membro: MembroFedelta; programmaId: string } | null> {
  if (!guestEmail) return null

  const programma = await prisma.programmaFedelta.findFirst({
    where: { hostId, attivo: true },
    select: { id: true },
  })
  if (!programma) return null

  // Risolvi/crea ospite CRM via email
  const ospite = await prisma.ospiteCRM.upsert({
    where: { hostId_email: { hostId, email: guestEmail } },
    update: {},
    create: { hostId, email: guestEmail, nome: '', cognome: '' },
    select: { id: true },
  })

  const membro = await prisma.membroFedelta.upsert({
    where: { programmaId_ospiteId: { programmaId: programma.id, ospiteId: ospite.id } },
    update: {},
    create: { programmaId: programma.id, ospiteId: ospite.id },
  })

  return { membro, programmaId: programma.id }
}

// ────────────────────────────────────────────────────────────────────────────
// Accumula punti
// ────────────────────────────────────────────────────────────────────────────

export async function accumulaPunti(params: {
  membroId: string
  origine: AccumuloOrigine
  importoBase: number // € spesi
  descrizione: string
  prenotazioneId?: string
  appuntamentoId?: string
  transazionePOSId?: string
  operatore?: string
}): Promise<RisultatoAccumulo> {
  const {
    membroId, origine, importoBase, descrizione,
    prenotazioneId, appuntamentoId, transazionePOSId, operatore,
  } = params

  if (importoBase <= 0) {
    throw new Error('importoBase deve essere > 0')
  }

  const membro = await prisma.membroFedelta.findUnique({
    where: { id: membroId },
    include: {
      programma: { include: { livelli: true } },
      livello: true,
    },
  })
  if (!membro) throw new Error(`MembroFedelta ${membroId} non trovato`)

  const programma = membro.programma
  const livelloCorrente = membro.livello
  const moltiplicatore = getMoltiplicatore(livelloCorrente)

  const puntiBase = Math.floor(importoBase * programma.puntiPerEuro)
  const puntiAccumulati = Math.floor(puntiBase * moltiplicatore)

  if (puntiAccumulati <= 0) {
    // Niente da accumulare — ritorna stato attuale senza creare movimento
    return {
      puntiAccumulati: 0,
      puntiTotali: membro.puntiAccumulati,
      saldoAttuale: saldoMembro(membro),
      livelloAttuale: livelloCorrente?.nome ?? null,
      livelloId: livelloCorrente?.id ?? null,
      levelUp: false,
    }
  }

  const nuoviAccumulati = membro.puntiAccumulati + puntiAccumulati
  const nuovoSaldo = nuoviAccumulati - membro.puntiUtilizzati
  const nuovoLivello = calcolaLivello(nuovoSaldo, programma.livelli)
  const levelUp = nuovoLivello?.id !== livelloCorrente?.id

  // Transaction: movimento + update membro
  await prisma.$transaction([
    prisma.movimentoPunti.create({
      data: {
        membroId,
        tipo: 'ACCUMULO',
        punti: puntiAccumulati,
        saldoDopo: nuovoSaldo,
        descrizione,
        appuntamentoId: appuntamentoId ?? null,
        prenotazioneId: prenotazioneId ?? null,
        transazionePOSId: transazionePOSId ?? null,
        programmaFedeltaId: programma.id,
        operatore: operatore ?? `origine:${origine}`,
      },
    }),
    prisma.membroFedelta.update({
      where: { id: membroId },
      data: {
        puntiAccumulati: nuoviAccumulati,
        ultimaAttivita: new Date(),
        livelloId: nuovoLivello?.id ?? null,
      },
    }),
  ])

  if (levelUp && nuovoLivello) {
    await notificaLevelUp(programma.hostId, membro, livelloCorrente, nuovoLivello)
  }

  return {
    puntiAccumulati,
    puntiTotali: nuoviAccumulati,
    saldoAttuale: nuovoSaldo,
    livelloAttuale: nuovoLivello?.nome ?? null,
    livelloId: nuovoLivello?.id ?? null,
    levelUp,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Riscatta premio
// ────────────────────────────────────────────────────────────────────────────

export async function riscattaPremio(params: {
  membroId: string
  premioId: string
  prenotazioneId?: string
  appuntamentoSpaSlot?: { dataOra: Date; durataMin: number } // per TRATTAMENTO_GRATIS
  operatore?: string
}): Promise<RisultatoRiscatto> {
  const { membroId, premioId, prenotazioneId, appuntamentoSpaSlot, operatore } = params

  const [membro, premio] = await Promise.all([
    prisma.membroFedelta.findUnique({
      where: { id: membroId },
      include: { programma: true, ospite: true },
    }),
    prisma.premioFedelta.findUnique({ where: { id: premioId } }),
  ])

  if (!membro) return { successo: false, errore: 'Membro non trovato' }
  if (!premio) return { successo: false, errore: 'Premio non trovato' }
  if (!premio.attivo) return { successo: false, errore: 'Premio disattivato' }
  if (premio.programmaId !== membro.programmaId) {
    return { successo: false, errore: 'Premio non appartiene al programma del membro' }
  }

  const saldo = saldoMembro(membro)
  if (saldo < premio.costoInPunti) {
    return { successo: false, errore: `Punti insufficienti (saldo ${saldo}, richiesti ${premio.costoInPunti})` }
  }

  // Disponibilità totale
  if (premio.disponibilitaMax != null && premio.riscattiContatore >= premio.disponibilitaMax) {
    return { successo: false, errore: 'Premio esaurito' }
  }

  // Disponibilità per membro
  if (premio.disponibilitaMembro != null) {
    const perMembro = await prisma.movimentoPunti.count({
      where: { membroId, premioId: premio.id },
    })
    if (perMembro >= premio.disponibilitaMembro) {
      return { successo: false, errore: 'Limite riscatti per membro raggiunto' }
    }
  }

  const nuoviUtilizzati = membro.puntiUtilizzati + premio.costoInPunti
  const saldoResiduo = membro.puntiAccumulati - nuoviUtilizzati

  const datiSideEffect: Record<string, unknown> = { tipoPremio: premio.tipo }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Side-effect per tipo
      switch (premio.tipo) {
        case 'SCONTO_PRENOTAZIONE': {
          if (!prenotazioneId) throw new Error('prenotazioneId obbligatorio per SCONTO_PRENOTAZIONE')
          const dati = premio.datiApplicazione as { valoreSconto?: number; scontoPercentuale?: number } | null
          const pren = await tx.prenotazione.findUnique({
            where: { id: prenotazioneId },
            select: { prezzoTotale: true, hostId: true },
          })
          if (!pren) throw new Error('Prenotazione non trovata')
          const valore = dati?.valoreSconto
            ?? (dati?.scontoPercentuale && pren.prezzoTotale
              ? (pren.prezzoTotale * dati.scontoPercentuale) / 100
              : 0)
          if (valore <= 0) throw new Error('Valore sconto non determinabile — configura `valoreSconto` o `scontoPercentuale`')
          const addebito = await tx.addebitoPrenotazione.create({
            data: {
              prenotazioneId,
              descrizione: `Loyalty · ${premio.nome}`,
              quantita: 1,
              prezzoUnitario: -valore,
              totale: -valore,
              addebitatoDa: 'Loyalty',
            },
          })
          datiSideEffect.addebitoId = addebito.id
          datiSideEffect.scontoApplicato = valore
          break
        }

        case 'TRATTAMENTO_GRATIS': {
          if (!premio.trattamentoSpaId) {
            throw new Error('trattamentoSpaId mancante sul premio')
          }
          const tratt = await tx.trattamentoSpa.findUnique({
            where: { id: premio.trattamentoSpaId },
            select: { id: true, durata: true, nome: true, hostId: true },
          })
          if (!tratt) throw new Error('Trattamento non trovato')
          if (appuntamentoSpaSlot) {
            const app = await tx.appuntamentoSpa.create({
              data: {
                hostId: tratt.hostId,
                trattamentoId: tratt.id,
                guestNome: membro.ospite.nome,
                guestCognome: membro.ospite.cognome,
                guestEmail: membro.ospite.email ?? '',
                prenotazioneId: prenotazioneId ?? null,
                dataOra: appuntamentoSpaSlot.dataOra,
                durata: appuntamentoSpaSlot.durataMin,
                prezzoTotale: 0,
                stato: 'CONFERMATO',
                note: `Premio loyalty · ${premio.nome}`,
              },
            })
            datiSideEffect.appuntamentoSpaId = app.id
          } else {
            // Slot non fornito: flag "da programmare", l'host deve finalizzare
            datiSideEffect.daProgrammare = true
            datiSideEffect.trattamentoSpaId = tratt.id
          }
          break
        }

        case 'UPGRADE_CAMERA': {
          if (!prenotazioneId) throw new Error('prenotazioneId obbligatorio per UPGRADE_CAMERA')
          const addebito = await tx.addebitoPrenotazione.create({
            data: {
              prenotazioneId,
              descrizione: `Loyalty · ${premio.nome} (upgrade incluso)`,
              quantita: 1,
              prezzoUnitario: 0,
              totale: 0,
              addebitatoDa: 'Loyalty',
              note: 'Applicare upgrade camera manualmente al check-in',
            },
          })
          datiSideEffect.addebitoId = addebito.id
          datiSideEffect.upgradeAttivato = true
          break
        }

        case 'BONUS_PUNTI': {
          // Premio particolare: usa punti per ricevere più punti (referral bonus)
          const dati = premio.datiApplicazione as { puntiBonus?: number } | null
          const bonus = dati?.puntiBonus ?? 0
          if (bonus > 0) {
            await tx.movimentoPunti.create({
              data: {
                membroId,
                tipo: 'BONUS',
                punti: bonus,
                saldoDopo: saldoResiduo + bonus,
                descrizione: `Bonus · ${premio.nome}`,
                premioId: premio.id,
                programmaFedeltaId: premio.programmaId,
              },
            })
            await tx.membroFedelta.update({
              where: { id: membroId },
              data: { puntiAccumulati: { increment: bonus } },
            })
            datiSideEffect.puntiBonus = bonus
          }
          break
        }

        case 'ALTRO':
          // Solo log
          break
      }

      // Movimento UTILIZZO (riscatto)
      const movimento = await tx.movimentoPunti.create({
        data: {
          membroId,
          tipo: 'UTILIZZO',
          punti: -premio.costoInPunti,
          saldoDopo: saldoResiduo,
          descrizione: `Riscatto · ${premio.nome}`,
          premioId: premio.id,
          prenotazioneId: prenotazioneId ?? null,
          programmaFedeltaId: premio.programmaId,
          operatore: operatore ?? null,
          note: JSON.stringify(datiSideEffect),
        },
      })

      // Update membro + contatore premio
      await tx.membroFedelta.update({
        where: { id: membroId },
        data: {
          puntiUtilizzati: nuoviUtilizzati,
          ultimaAttivita: new Date(),
        },
      })
      await tx.premioFedelta.update({
        where: { id: premio.id },
        data: { riscattiContatore: { increment: 1 } },
      })

      return movimento.id
    })

    logger.info('Premio riscattato', { membroId, premioId, costo: premio.costoInPunti })

    return {
      successo: true,
      movimentoId: result,
      saldoResiduo,
      datiSideEffect,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error('Riscatto premio fallito', { membroId, premioId, error: errMsg })
    return { successo: false, errore: errMsg }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Touchpoint helpers (integrazione con altri flussi)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Chiamato al check-out (stato prenotazione → COMPLETATA).
 * Accumula punti sul `prezzoTotale` della prenotazione.
 * Silenzioso se l'ospite non è iscritto o l'host non ha programma.
 */
export async function accumulaPuntiDaPrenotazione(
  prenotazioneId: string,
): Promise<RisultatoAccumulo | null> {
  const pren = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    select: {
      id: true, hostId: true, guestEmail: true,
      prezzoTotale: true, unita: { select: { nome: true } },
    },
  })
  if (!pren || !pren.prezzoTotale || pren.prezzoTotale <= 0) return null

  const found = await trovaOCreaMembro(pren.hostId, pren.guestEmail)
  if (!found) return null

  return accumulaPunti({
    membroId: found.membro.id,
    origine: 'soggiorno',
    importoBase: pren.prezzoTotale,
    descrizione: `Soggiorno ${pren.unita?.nome ?? ''}`.trim() || 'Soggiorno',
    prenotazioneId,
  })
}

export async function accumulaPuntiDaAppuntamentoSpa(
  appuntamentoId: string,
): Promise<RisultatoAccumulo | null> {
  const app = await prisma.appuntamentoSpa.findUnique({
    where: { id: appuntamentoId },
    select: {
      id: true, hostId: true, guestEmail: true, prezzoTotale: true,
      trattamento: { select: { nome: true } },
      pagamento: { select: { stato: true, importo: true } },
    },
  })
  if (!app) return null
  // Usa importo riscosso (se presente) altrimenti prezzoTotale
  const importo = app.pagamento?.stato === 'RISCOSSO' ? app.pagamento.importo : app.prezzoTotale
  if (!importo || importo <= 0) return null

  const found = await trovaOCreaMembro(app.hostId, app.guestEmail ?? null)
  if (!found) return null

  return accumulaPunti({
    membroId: found.membro.id,
    origine: 'spa',
    importoBase: importo,
    descrizione: `SPA · ${app.trattamento?.nome ?? 'trattamento'}`,
    appuntamentoId,
  })
}

export async function accumulaPuntiDaPOS(
  transazionePOSId: string,
): Promise<RisultatoAccumulo | null> {
  const t = await prisma.transazionePOS.findUnique({
    where: { id: transazionePOSId },
    select: {
      id: true, hostId: true, totale: true, guestEmail: true,
      prenotazione: { select: { guestEmail: true } },
    },
  })
  if (!t || t.totale <= 0) return null
  const email = t.guestEmail ?? t.prenotazione?.guestEmail ?? null

  const found = await trovaOCreaMembro(t.hostId, email)
  if (!found) return null

  return accumulaPunti({
    membroId: found.membro.id,
    origine: 'pos',
    importoBase: t.totale,
    descrizione: 'Acquisto POS',
    transazionePOSId,
  })
}

// Silenzia import usato solo per typing
void null as unknown as { p: PremioFedelta; pr: ProgrammaFedelta; json: Prisma.InputJsonValue }
