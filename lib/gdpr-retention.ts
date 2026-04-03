/**
 * GDPR Data Retention Logic
 *
 * Definisce le policy di conservazione dati e fornisce funzioni
 * per la pulizia automatica dei dati scaduti.
 *
 * Riferimenti normativi:
 * - Reg. UE 2016/679 (GDPR) — Art. 5(1)(e): limitazione della conservazione
 * - Art. 9 GDPR — Dati sanitari: trattamento solo con consenso esplicito
 * - Art. 109 TULPS (R.D. 773/1931) — Schedine alloggiati: 5 anni
 * - Art. 2220 Codice Civile — Documenti contabili: 10 anni
 * - D.Lgs. 196/2003 (Codice Privacy) — Provvedimento Garante
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

// ─── Policy di conservazione ─────────────────────────────────────────────────

export const RETENTION_POLICIES = {
  /**
   * Dati sanitari SPA (waiver): conservati 90 GIORNI sulla piattaforma.
   *
   * Modello: la piattaforma conserva i dati per 3 mesi. Prima della
   * cancellazione, l'host (Titolare del trattamento) viene notificato
   * e può scaricare i dati per conservarli autonomamente (obbligo suo,
   * Art. 2947 c.c. — prescrizione 5 anni).
   *
   * La piattaforma (Responsabile del trattamento) minimizza i dati
   * come previsto dall'Art. 5(1)(e) GDPR.
   */
  SPA_HEALTH_DATA: {
    id: 'spa_health_data',
    label: 'Dati sanitari SPA (waiver)',
    description: 'Condizioni mediche, allergie, farmaci, zone corpo, firma waiver',
    retention: '90 giorni dal trattamento — poi cancellazione (host può scaricare prima)',
    retentionDays: 90,
    warningDays: 75, // notifica host 15 giorni prima della cancellazione
    legalBasis: 'Art. 5(1)(e) GDPR — Minimizzazione. Host responsabile conservazione legale.',
    action: 'Notifica host → download → cancellazione campi sanitari',
  },

  /**
   * Registration Card + documenti identità: 40 giorni dalla partenza.
   * L'host viene notificato 10 giorni prima. Può scaricare e conservare autonomamente.
   */
  REG_CARD_SIGNATURE: {
    id: 'reg_card_signature',
    label: 'Registration Card + documenti',
    description: 'Firma digitale, dati documento identità, foto documento, T&C firmati',
    retention: '40 giorni dalla data di partenza — poi cancellazione (host può scaricare prima)',
    retentionDays: 40,
    warningDays: 30, // notifica host 10 giorni prima
    legalBasis: 'Art. 5(1)(e) GDPR — Minimizzazione. Host responsabile conservazione legale.',
    action: 'Notifica host → download → cancellazione firma + dati documento',
  },

  /**
   * Dati personali ospite: 40 giorni dalla partenza.
   * Stessa logica: l'host scarica se gli servono per Alloggiati Web o tutela legale.
   * Nota: le schedine PS dovrebbero essere già state inviate alla Questura.
   */
  GUEST_PERSONAL_DATA: {
    id: 'guest_personal_data',
    label: 'Dati personali ospite (prenotazione)',
    description: 'Nome, cognome, email, telefono, documento, accompagnatori',
    retention: '40 giorni dalla data di partenza — poi anonimizzazione (host può scaricare prima)',
    retentionDays: 40,
    warningDays: 30, // notifica host 10 giorni prima
    legalBasis: 'Art. 5(1)(e) GDPR — Minimizzazione. Host invia schedine PS prima della scadenza.',
    action: 'Notifica host → download → anonimizzazione dati identificativi',
  },

  /** Dati fiscali (fatture, pagamenti): 10 anni */
  FISCAL_DATA: {
    id: 'fiscal_data',
    label: 'Dati contabili e fiscali',
    description: 'Fatture, pagamenti, importi, dati fatturazione',
    retention: '10 anni dalla data di emissione',
    retentionDays: 3650,
    legalBasis: 'Art. 2220 Codice Civile — Conservazione documenti contabili',
    action: 'Nessuna cancellazione anticipata possibile',
  },

  /** Chat/messaggi: 40 giorni dalla partenza (stessa policy dati personali) */
  CHAT_MESSAGES: {
    id: 'chat_messages',
    label: 'Messaggi chat ospite-host',
    description: 'Conversazioni nella chat della prenotazione',
    retention: '40 giorni dalla data di partenza',
    retentionDays: 40,
    legalBasis: 'Art. 5(1)(e) GDPR — Minimizzazione',
    action: 'Cancellazione messaggi (insieme ai dati personali)',
  },

  /** CRM ospiti: 40 giorni dall'ultimo soggiorno */
  CRM_DATA: {
    id: 'crm_data',
    label: 'Profilo CRM ospite',
    description: 'Preferenze, tag, note interne, storico',
    retention: '40 giorni dall\'ultimo soggiorno — host può scaricare prima',
    retentionDays: 40,
    legalBasis: 'Art. 5(1)(e) GDPR — Minimizzazione',
    action: 'Cancellazione profilo CRM',
  },
} as const

// ─── Funzioni di pulizia automatica ──────────────────────────────────────────

export interface RetentionResult {
  policy: string
  processed: number
  errors: number
  details: string[]
}

/**
 * Gestisce il ciclo di vita dei dati sanitari SPA:
 *
 * 1. A 75 giorni: notifica l'host che i dati verranno cancellati tra 15 giorni
 * 2. A 90 giorni: cancella i dati sanitari (mantiene il record appuntamento)
 *
 * L'host può scaricare i dati prima della cancellazione dalla pagina GDPR.
 */
export async function cleanSpaHealthData(hostId: string): Promise<RetentionResult> {
  const deleteCutoff = new Date(Date.now() - RETENTION_POLICIES.SPA_HEALTH_DATA.retentionDays * 86400000)
  const warnCutoff = new Date(Date.now() - (RETENTION_POLICIES.SPA_HEALTH_DATA.warningDays ?? 75) * 86400000)
  const result: RetentionResult = { policy: 'spa_health_data', processed: 0, errors: 0, details: [] }

  try {
    // ── Step 1: Notifica host per waiver in scadenza (75-90 giorni) ────────
    const expiringWaivers = await prisma.waiverSpa.findMany({
      where: {
        confermato: true,
        dataRegistrazione: { lt: warnCutoff, gte: deleteCutoff },
        appuntamento: { hostId, stato: 'COMPLETATO' },
        // Solo quelli che hanno ancora dati sanitari
        OR: [
          { allergie: { not: null } },
          { patologie: { not: null } },
          { farmaci: { not: null } },
          { firmaBase64: { not: null } },
        ],
      },
      select: { id: true },
    })

    if (expiringWaivers.length > 0) {
      // Crea notifica per l'host (dedup: max 1 al giorno)
      const today = new Date().toISOString().split('T')[0]
      const existing = await prisma.notifica.findFirst({
        where: {
          hostId,
          tipo: 'sistema',
          titolo: { contains: 'waiver SPA in scadenza' },
          createdAt: { gte: new Date(today) },
        },
      })

      if (!existing) {
        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'sistema',
            titolo: `${expiringWaivers.length} waiver SPA in scadenza`,
            messaggio: `I dati sanitari di ${expiringWaivers.length} waiver SPA verranno cancellati tra 15 giorni. Scaricali dalla pagina GDPR & Privacy se desideri conservarli.`,
            linkUrl: '/host/gdpr',
          },
        })
        result.details.push(`Notifica inviata: ${expiringWaivers.length} waiver in scadenza`)
      }
    }

    // ── Step 2: Cancella waiver scaduti (> 90 giorni) ─────────────────────
    const expiredWaivers = await prisma.waiverSpa.findMany({
      where: {
        confermato: true,
        dataRegistrazione: { lt: deleteCutoff },
        appuntamento: { hostId, stato: 'COMPLETATO' },
        OR: [
          { allergie: { not: null } },
          { patologie: { not: null } },
          { farmaci: { not: null } },
          { firmaBase64: { not: null } },
          { incinta: true },
          { NOT: { condizioni: { equals: [] } } },
          { NOT: { allergieSelezionate: { equals: [] } } },
        ],
      },
      select: { id: true },
    })

    for (const waiver of expiredWaivers) {
      try {
        await prisma.waiverSpa.update({
          where: { id: waiver.id },
          data: {
            allergie: null,
            patologie: null,
            farmaci: null,
            condizioni: [],
            allergieSelezionate: [],
            allergieAltro: null,
            condizioneAltro: null,
            incinta: false,
            incintaMesi: null,
            firmaBase64: null,
            zoneTrattate: [],
            zoneEvitare: [],
            pressioneMassaggio: null,
            temperaturaPreferita: null,
            notePreferenze: '[DATI SANITARI RIMOSSI — GDPR 90gg — ' + new Date().toISOString().split('T')[0] + ']',
          },
        })
        result.processed++
      } catch (err) {
        result.errors++
        result.details.push(`Errore waiver ${waiver.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (result.processed > 0) {
      result.details.push(`${result.processed} waiver SPA → dati sanitari cancellati (> 90 giorni)`)
    }
  } catch (err) {
    result.errors++
    result.details.push(`Errore query: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

/**
 * Registration Card + documenti: 40 giorni dalla partenza.
 * Notifica host a 30 giorni, cancella a 40.
 */
export async function cleanRegCardSignatures(hostId: string): Promise<RetentionResult> {
  const deleteCutoff = new Date(Date.now() - RETENTION_POLICIES.REG_CARD_SIGNATURE.retentionDays * 86400000)
  const warnCutoff = new Date(Date.now() - (RETENTION_POLICIES.REG_CARD_SIGNATURE.warningDays ?? 30) * 86400000)
  const result: RetentionResult = { policy: 'reg_card_signatures', processed: 0, errors: 0, details: [] }

  try {
    // Notifica per reg card in scadenza (30-40 giorni)
    const expiringCount = await prisma.prenotazione.count({
      where: {
        hostId,
        regCardFirmata: true,
        regCardFirmaBase64: { not: null },
        dataPartenza: { lt: warnCutoff, gte: deleteCutoff },
      },
    })

    if (expiringCount > 0) {
      const today = new Date().toISOString().split('T')[0]
      const existing = await prisma.notifica.findFirst({
        where: { hostId, tipo: 'sistema', titolo: { contains: 'Registration Card in scadenza' }, createdAt: { gte: new Date(today) } },
      })
      if (!existing) {
        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'sistema',
            titolo: `${expiringCount} Registration Card in scadenza`,
            messaggio: `Le firme e i documenti di ${expiringCount} Registration Card verranno cancellati tra 10 giorni. Scaricali dalla pagina GDPR & Privacy.`,
            linkUrl: '/host/gdpr',
          },
        })
        result.details.push(`Notifica: ${expiringCount} reg card in scadenza`)
      }
    }

    // Cancella reg card scadute (> 40 giorni)
    const updated = await prisma.prenotazione.updateMany({
      where: {
        hostId,
        regCardFirmata: true,
        regCardFirmaBase64: { not: null },
        dataPartenza: { lt: deleteCutoff },
      },
      data: {
        regCardFirmaBase64: null,
      },
    })
    result.processed = updated.count
    if (updated.count > 0) {
      result.details.push(`${updated.count} firme registration card rimosse (> 40 giorni)`)
    }

    // Cancella foto documenti — non servono dopo il check-in (dati già estratti via OCR)
    // Le foto vengono rimosse 7 giorni dopo la partenza (tempo per eventuali contestazioni)
    const fotoDeleteCutoff = new Date(Date.now() - 7 * 86400000)
    const fotoDeleted = await prisma.prenotazione.updateMany({
      where: {
        hostId,
        dataPartenza: { lt: fotoDeleteCutoff },
        OR: [
          { fotoDocumentoFronte: { not: null } },
          { fotoDocumentoRetro: { not: null } },
        ],
      },
      data: {
        fotoDocumentoFronte: null,
        fotoDocumentoRetro: null,
      },
    })
    if (fotoDeleted.count > 0) {
      result.processed += fotoDeleted.count
      result.details.push(`${fotoDeleted.count} foto documenti rimosse (> 7 giorni dalla partenza)`)
    }
  } catch (err) {
    result.errors++
    result.details.push(`Errore: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

/**
 * Dati personali ospite: 40 giorni dalla partenza.
 * Notifica host a 30 giorni, anonimizza a 40.
 */
export async function anonymizeExpiredBookings(hostId: string): Promise<RetentionResult> {
  const deleteCutoff = new Date(Date.now() - RETENTION_POLICIES.GUEST_PERSONAL_DATA.retentionDays * 86400000)
  const warnCutoff = new Date(Date.now() - (RETENTION_POLICIES.GUEST_PERSONAL_DATA.warningDays ?? 30) * 86400000)
  const result: RetentionResult = { policy: 'guest_personal_data', processed: 0, errors: 0, details: [] }

  // Notifica per dati in scadenza
  try {
    const expiringCount = await prisma.prenotazione.count({
      where: {
        hostId,
        dataPartenza: { lt: warnCutoff, gte: deleteCutoff },
        guestEmail: { not: { contains: '@anonimizzato' } },
      },
    })
    if (expiringCount > 0) {
      const today = new Date().toISOString().split('T')[0]
      const existing = await prisma.notifica.findFirst({
        where: { hostId, tipo: 'sistema', titolo: { contains: 'dati personali in scadenza' }, createdAt: { gte: new Date(today) } },
      })
      if (!existing) {
        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'sistema',
            titolo: `${expiringCount} prenotazioni con dati personali in scadenza`,
            messaggio: `I dati personali di ${expiringCount} prenotazioni verranno anonimizzati tra 10 giorni. Scaricali dalla pagina GDPR & Privacy se necessario (schedine PS, documenti).`,
            linkUrl: '/host/gdpr',
          },
        })
        result.details.push(`Notifica: ${expiringCount} prenotazioni dati in scadenza`)
      }
    }
  } catch {}

  const cutoff = deleteCutoff

  try {
    const prenotazioni = await prisma.prenotazione.findMany({
      where: {
        hostId,
        dataPartenza: { lt: cutoff },
        guestEmail: { not: { contains: '@anonimizzato' } }, // Non già anonimizzate
      },
      select: { id: true, guestEmail: true },
    })

    for (const p of prenotazioni) {
      try {
        await prisma.$transaction([
          // Anonimizza prenotazione
          prisma.prenotazione.update({
            where: { id: p.id },
            data: {
              guestNome: 'ANONIMO',
              guestCognome: 'GDPR',
              guestEmail: `${p.id}@anonimizzato.gdpr`,
              guestTelefono: null,
              guestNote: null,
              guestSesso: null,
              guestDataNascita: null,
              guestLuogoNascita: null,
              guestProvinciaNascita: null,
              guestComuneNascitaIstat: null,
              guestStatoNascitaIstat: null,
              guestCittadinanzaIstat: null,
              guestTipoDocumento: null,
              guestNumeroDocumento: null,
              guestLuogoRilascio: null,
              guestProvinciaRilascio: null,
              guestStatoRilascioIstat: null,
              regCardFirmaBase64: null,
              checkInToken: null,
            },
          }),
          // Cancella messaggi chat
          prisma.messaggio.deleteMany({
            where: { chat: { prenotazioneId: p.id } },
          }),
          // Cancella accompagnatori
          prisma.accompagnatore.deleteMany({
            where: { prenotazioneId: p.id },
          }),
        ])
        result.processed++
      } catch (err) {
        result.errors++
        result.details.push(`Errore prenotazione ${p.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (result.processed > 0) {
      result.details.push(`${result.processed} prenotazioni anonimizzate (> 5 anni)`)
    }
  } catch (err) {
    result.errors++
    result.details.push(`Errore query: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

/**
 * Cancella messaggi chat di prenotazioni con partenza > 40 giorni fa.
 */
export async function cleanExpiredChats(hostId: string): Promise<RetentionResult> {
  const cutoff = new Date(Date.now() - RETENTION_POLICIES.CHAT_MESSAGES.retentionDays * 86400000)
  const result: RetentionResult = { policy: 'chat_messages', processed: 0, errors: 0, details: [] }

  try {
    const chats = await prisma.chat.findMany({
      where: {
        hostId,
        prenotazione: { dataPartenza: { lt: cutoff } },
      },
      select: { id: true },
    })

    if (chats.length > 0) {
      const deleted = await prisma.messaggio.deleteMany({
        where: { chatId: { in: chats.map(c => c.id) } },
      })
      result.processed = deleted.count
      result.details.push(`${deleted.count} messaggi rimossi da ${chats.length} chat (> 2 anni)`)
    }
  } catch (err) {
    result.errors++
    result.details.push(`Errore: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

/**
 * Esegue tutte le policy di retention per un host.
 */
export async function runAllRetentionPolicies(hostId: string): Promise<RetentionResult[]> {
  const results: RetentionResult[] = []

  logger.info('Avvio pulizia GDPR retention', 'gdpr-retention', { hostId })

  results.push(await cleanSpaHealthData(hostId))
  results.push(await cleanRegCardSignatures(hostId))
  results.push(await anonymizeExpiredBookings(hostId))
  results.push(await cleanExpiredChats(hostId))

  const totalProcessed = results.reduce((s, r) => s + r.processed, 0)
  const totalErrors = results.reduce((s, r) => s + r.errors, 0)

  logger.info('Pulizia GDPR retention completata', 'gdpr-retention', {
    hostId,
    totalProcessed,
    totalErrors,
    policies: results.map(r => `${r.policy}: ${r.processed} processati, ${r.errors} errori`),
  })

  return results
}
