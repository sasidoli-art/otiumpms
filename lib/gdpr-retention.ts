/**
 * GDPR Data Retention — sistema configurabile e tipizzato.
 *
 * Definisce le policy di conservazione dati e fornisce:
 *  - eseguiRetention() : applica tutte le policy (anonimizza/cancella)
 *  - notificaRetentionImminente() : avvisa gli host dei dati in scadenza
 *  - runAllRetentionPolicies(hostId) : retrocompat (wrapper per-host)
 *
 * Riferimenti normativi:
 *  - Reg. UE 2016/679 (GDPR) — Art. 5(1)(e), Art. 9 (dati sanitari), Art. 7 (consenso)
 *  - Art. 109 TULPS (R.D. 773/1931) — Schedine alloggiati: 5 anni
 *  - Art. 2220 Codice Civile — Documenti contabili: 10 anni
 *  - D.L. 144/2005 (Decreto Pisanu) — Log accessi Wi-Fi: 12 mesi
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type RetentionBaseGiuridica = 'contratto' | 'obbligo_legale' | 'consenso' | 'legittimo_interesse'
export type RetentionAzione = 'anonimizza' | 'cancella'

export type RetentionPolicy = {
  id: string
  entita: string
  descrizione: string
  baseGiuridica: RetentionBaseGiuridica
  riferimentoNormativo?: string
  giorniRetention: number
  contatoreDataDa: string // campo (o path dot-notation) di riferimento
  azione: RetentionAzione
  notificaHostGiorniPrima?: number
}

export type RetentionAction = {
  policyId: string
  entita: string
  azione: RetentionAzione
  processed: number
  errors: number
  details: string[]
}

export type RetentionReport = {
  eseguitoAt: Date
  azioni: RetentionAction[]
}

// Retrocompatibilità API esistente
export interface RetentionResult {
  policy: string
  processed: number
  errors: number
  details: string[]
}

// ─── Policy configuration ────────────────────────────────────────────────────

export const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'ospite_prenotazione',
    entita: 'Prenotazione',
    descrizione: 'Dati personali ospite post-checkout',
    baseGiuridica: 'contratto',
    giorniRetention: 40,
    contatoreDataDa: 'dataPartenza',
    azione: 'anonimizza',
    notificaHostGiorniPrima: 10,
  },
  {
    id: 'foto_documenti',
    entita: 'Prenotazione',
    descrizione: 'Foto documenti identità (fronte/retro)',
    baseGiuridica: 'contratto',
    giorniRetention: 7,
    contatoreDataDa: 'dataPartenza',
    azione: 'cancella',
  },
  {
    id: 'waiver_spa',
    entita: 'WaiverSpa',
    descrizione: 'Dati sanitari SPA (Art. 9 GDPR)',
    baseGiuridica: 'consenso',
    riferimentoNormativo: 'Art. 9 GDPR',
    giorniRetention: 90,
    contatoreDataDa: 'dataRegistrazione',
    azione: 'cancella',
    notificaHostGiorniPrima: 15,
  },
  {
    id: 'alloggiati',
    entita: 'Prenotazione',
    descrizione: 'Dati Alloggiati Web (campi ISTAT per Questura)',
    baseGiuridica: 'obbligo_legale',
    riferimentoNormativo: 'Art. 109 TULPS',
    giorniRetention: 1825, // 5 anni
    contatoreDataDa: 'dataPartenza',
    azione: 'anonimizza',
  },
  {
    id: 'fatture',
    entita: 'Fattura',
    descrizione: 'Documenti contabili',
    baseGiuridica: 'obbligo_legale',
    riferimentoNormativo: 'Art. 2220 Codice Civile',
    giorniRetention: 3650, // 10 anni
    contatoreDataDa: 'dataEmissione',
    azione: 'anonimizza', // dati cliente anonimizzati, importi/righe mantenuti
  },
  {
    id: 'accompagnatori',
    entita: 'Accompagnatore',
    descrizione: 'Accompagnatori post-checkout',
    baseGiuridica: 'contratto',
    giorniRetention: 40,
    contatoreDataDa: 'prenotazione.dataPartenza',
    azione: 'anonimizza',
  },
  {
    id: 'crm_ospite',
    entita: 'OspiteCRM',
    descrizione: 'Profilo CRM ospite (inattivo)',
    baseGiuridica: 'legittimo_interesse',
    giorniRetention: 1095, // 3 anni dall'ultimo soggiorno
    contatoreDataDa: 'dataUltimoSoggiorno',
    azione: 'anonimizza',
  },
  {
    id: 'conversazioni_wa',
    entita: 'ConversazioneWhatsApp',
    descrizione: 'Conversazioni WhatsApp Concierge chiuse',
    baseGiuridica: 'legittimo_interesse',
    giorniRetention: 180,
    contatoreDataDa: 'updatedAt',
    azione: 'cancella',
  },
  {
    id: 'audit_log',
    entita: 'AuditLog',
    descrizione: 'Log di audit interno',
    baseGiuridica: 'legittimo_interesse',
    giorniRetention: 730, // 2 anni
    contatoreDataDa: 'createdAt',
    azione: 'cancella',
  },
  {
    id: 'wifi_sessions',
    entita: 'WifiSession',
    descrizione: 'Sessioni Wi-Fi (Decreto Pisanu)',
    baseGiuridica: 'obbligo_legale',
    riferimentoNormativo: 'D.L. 144/2005 (Decreto Pisanu)',
    giorniRetention: 365, // 12 mesi
    contatoreDataDa: 'startAt',
    azione: 'cancella',
  },
  {
    id: 'wifi_access_logs',
    entita: 'WifiAccessLog',
    descrizione: 'Log accesso Wi-Fi per-utente (Decreto Pisanu)',
    baseGiuridica: 'obbligo_legale',
    riferimentoNormativo: 'D.L. 144/2005 (Decreto Pisanu)',
    giorniRetention: 365,
    contatoreDataDa: 'timestamp',
    azione: 'cancella',
  },
]

// ─── Utility ─────────────────────────────────────────────────────────────────

function subDays(from: Date, days: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return d
}

const ANON_EMAIL_DOMAIN = '@removed.local'
const ANON_MARKER = (id: string) => `deleted-${id.slice(0, 8)}${ANON_EMAIL_DOMAIN}`

// ─── Funzioni di anonimizzazione / cancellazione ─────────────────────────────

/**
 * 40gg dopo dataPartenza: rimuove nome/email/telefono/firma/token.
 * MANTIENE: campi ISTAT (servono ancora per Alloggiati 5 anni), importi, date.
 */
async function anonimizzaPrenotazione(
  prenotazioneId: string,
  hostId: string | null,
): Promise<void> {
  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: {
      guestNome: 'Ospite',
      guestCognome: 'Anonimizzato',
      guestEmail: ANON_MARKER(prenotazioneId),
      guestTelefono: null,
      guestNote: null,
      guestCodiceFiscale: null,
      regCardFirmaBase64: null,
      checkInToken: null,
      pin: null,
      // MANTIENI: guest{Sesso,DataNascita,Luogo*,Comune*Istat,Provincia*,Stato*Istat,
      //           TipoDocumento,NumeroDocumento,Cittadinanza*} → usati per Alloggiati 5 anni
      // MANTIENI: prezzoTotale, tassaSoggiorno, dataArrivo, dataPartenza, stato → statistiche
    },
  })
  await audit({
    hostId,
    azione: 'gdpr.prenotazione.anonimizzata',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: 'Dati personali rimossi (policy ospite_prenotazione 40gg)',
  })
}

/**
 * 5 anni dopo dataPartenza: rimuove anche i campi ISTAT (fine obbligo Alloggiati).
 */
async function anonimizzaPrenotazioneAlloggiati(
  prenotazioneId: string,
  hostId: string | null,
): Promise<void> {
  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: {
      guestSesso: null,
      guestDataNascita: null,
      guestLuogoNascita: null,
      guestComuneNascitaIstat: null,
      guestProvinciaNascita: null,
      guestStatoNascitaIstat: null,
      guestCittadinanzaIstat: null,
      guestTipoDocumento: null,
      guestNumeroDocumento: null,
      guestLuogoRilascio: null,
      guestComuneRilascioIstat: null,
      guestProvinciaRilascio: null,
      guestStatoRilascioIstat: null,
    },
  })
  await audit({
    hostId,
    azione: 'gdpr.alloggiati.anonimizzato',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: 'Campi ISTAT rimossi (policy alloggiati 5 anni)',
  })
}

/**
 * 7gg dopo dataPartenza: cancella riferimento URL foto documenti (i file storage
 * vengono puliti dal job dedicato, questa funzione annulla solo il puntatore DB).
 */
async function cancellaFotoDocumenti(
  prenotazioneId: string,
  hostId: string | null,
): Promise<void> {
  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: {
      fotoDocumentoFronte: null,
      fotoDocumentoRetro: null,
    },
  })
  await audit({
    hostId,
    azione: 'gdpr.foto_documenti.cancellate',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: 'Foto documenti rimosse (policy foto_documenti 7gg)',
  })
}

/** WaiverSpa: hard delete (dati sanitari Art. 9 non anonimizzabili). */
async function cancellaWaiverSpa(waiverId: string, hostId: string | null): Promise<void> {
  await prisma.waiverSpa.delete({ where: { id: waiverId } })
  await audit({
    hostId,
    azione: 'gdpr.waiver_spa.cancellato',
    entita: 'waiverSpa',
    entitaId: waiverId,
    dettagli: 'Waiver SPA hard-deleted (policy waiver_spa 90gg)',
  })
}

/** Accompagnatore: rimuove anagrafica + contatti. Mantiene ISTAT. */
async function anonimizzaAccompagnatore(
  accompagnatoreId: string,
  hostId: string | null,
): Promise<void> {
  await prisma.accompagnatore.update({
    where: { id: accompagnatoreId },
    data: {
      nome: 'Accompagnatore',
      cognome: 'Anonimizzato',
      email: null,
      telefono: null,
      note: null,
      numeroDocumento: null,
      // MANTIENI: sesso, dataNascita, luogoNascita, codici ISTAT → Alloggiati 5 anni
    },
  })
  await audit({
    hostId,
    azione: 'gdpr.accompagnatore.anonimizzato',
    entita: 'accompagnatore',
    entitaId: accompagnatoreId,
    dettagli: 'Accompagnatore anonimizzato (policy accompagnatori 40gg)',
  })
}

/** OspiteCRM: rimuove PII, mantiene statistiche aggregate. */
async function anonimizzaOspiteCRM(ospiteId: string, hostId: string): Promise<void> {
  await prisma.ospiteCRM.update({
    where: { id: ospiteId },
    data: {
      nome: 'Cliente',
      cognome: 'Rimosso',
      email: ANON_MARKER(ospiteId),
      telefono: null,
      nazionalita: null,
      note: null,
      preferenze: null,
      blacklistMotivo: null,
      tags: [],
      spaAllergie: null,
      spaNote: null,
      spaTrattamentiPreferiti: [],
      spaPreferenzeTerapistaId: null,
      // MANTIENI: numSoggiorni, totaleSpeso (statistiche aggregate anonime)
    },
  })
  await audit({
    hostId,
    azione: 'gdpr.crm_ospite.anonimizzato',
    entita: 'ospiteCRM',
    entitaId: ospiteId,
    dettagli: 'CRM ospite anonimizzato (policy crm_ospite 3 anni)',
  })
}

/** Fattura: anonimizza cliente. Mantiene importi/righe/numero/data (Art. 2220 CC). */
async function anonimizzaFattura(fatturaId: string, hostId: string): Promise<void> {
  await prisma.fattura.update({
    where: { id: fatturaId },
    data: {
      clienteNome: 'Cliente rimosso',
      clienteEmail: null,
      clientePec: null,
      // MANTIENI: clientePIva, clienteCF, clienteSDI, clienteIndirizzo (dati fiscali per Agenzia Entrate)
      // MANTIENI: righe, imponibile, iva, totale, numero, dataEmissione
    },
  })
  await audit({
    hostId,
    azione: 'gdpr.fattura.anonimizzata',
    entita: 'fattura',
    entitaId: fatturaId,
    dettagli: 'Fattura anonimizzata (policy fatture 10 anni)',
  })
}

// ─── Core engine ─────────────────────────────────────────────────────────────

type PolicyExecutor = (
  policy: RetentionPolicy,
  soglia: Date,
  hostId: string | null,
) => Promise<RetentionAction>

const EXECUTORS: Record<string, PolicyExecutor> = {
  ospite_prenotazione: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id,
      entita: policy.entita,
      azione: policy.azione,
      processed: 0,
      errors: 0,
      details: [],
    }
    const where: Record<string, unknown> = {
      dataPartenza: { lt: soglia },
      guestEmail: { not: { endsWith: ANON_EMAIL_DOMAIN } },
    }
    if (hostId) where.hostId = hostId
    const pren = await prisma.prenotazione.findMany({ where, select: { id: true, hostId: true } })
    for (const p of pren) {
      try {
        await anonimizzaPrenotazione(p.id, p.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  foto_documenti: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = {
      dataPartenza: { lt: soglia },
      OR: [{ fotoDocumentoFronte: { not: null } }, { fotoDocumentoRetro: { not: null } }],
    }
    if (hostId) where.hostId = hostId
    const pren = await prisma.prenotazione.findMany({ where, select: { id: true, hostId: true } })
    for (const p of pren) {
      try {
        await cancellaFotoDocumenti(p.id, p.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  waiver_spa: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = { dataRegistrazione: { lt: soglia } }
    if (hostId) where.appuntamento = { hostId }
    const waivers = await prisma.waiverSpa.findMany({
      where, select: { id: true, appuntamento: { select: { hostId: true } } },
    })
    for (const w of waivers) {
      try {
        await cancellaWaiverSpa(w.id, w.appuntamento.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${w.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  alloggiati: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = {
      dataPartenza: { lt: soglia },
      guestSesso: { not: null }, // non già anonimizzate in questa fase
    }
    if (hostId) where.hostId = hostId
    const pren = await prisma.prenotazione.findMany({ where, select: { id: true, hostId: true } })
    for (const p of pren) {
      try {
        await anonimizzaPrenotazioneAlloggiati(p.id, p.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  fatture: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = {
      dataEmissione: { lt: soglia },
      clienteNome: { not: 'Cliente rimosso' },
    }
    if (hostId) where.hostId = hostId
    const fatture = await prisma.fattura.findMany({ where, select: { id: true, hostId: true } })
    for (const f of fatture) {
      try {
        await anonimizzaFattura(f.id, f.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${f.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  accompagnatori: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = {
      prenotazione: { dataPartenza: { lt: soglia } },
      cognome: { not: 'Anonimizzato' },
    }
    if (hostId) where.prenotazione = { ...(where.prenotazione as object), hostId }
    const accs = await prisma.accompagnatore.findMany({
      where, select: { id: true, prenotazione: { select: { hostId: true } } },
    })
    for (const a of accs) {
      try {
        await anonimizzaAccompagnatore(a.id, a.prenotazione.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${a.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  crm_ospite: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = {
      dataUltimoSoggiorno: { lt: soglia, not: null },
      email: { not: { endsWith: ANON_EMAIL_DOMAIN } },
    }
    if (hostId) where.hostId = hostId
    const ospiti = await prisma.ospiteCRM.findMany({ where, select: { id: true, hostId: true } })
    for (const o of ospiti) {
      try {
        await anonimizzaOspiteCRM(o.id, o.hostId)
        action.processed++
      } catch (e) {
        action.errors++
        action.details.push(`${o.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    return action
  },

  conversazioni_wa: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = {
      updatedAt: { lt: soglia },
      stato: { in: ['CHIUSA', 'ARCHIVIATA'] },
    }
    if (hostId) where.hostId = hostId
    const deleted = await prisma.conversazioneWhatsApp.deleteMany({ where })
    action.processed = deleted.count
    return action
  },

  audit_log: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = { createdAt: { lt: soglia } }
    if (hostId) where.hostId = hostId
    const deleted = await prisma.auditLog.deleteMany({ where })
    action.processed = deleted.count
    return action
  },

  wifi_sessions: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = { startAt: { lt: soglia } }
    if (hostId) where.hostId = hostId
    const deleted = await prisma.wifiSession.deleteMany({ where })
    action.processed = deleted.count
    return action
  },

  wifi_access_logs: async (policy, soglia, hostId) => {
    const action: RetentionAction = {
      policyId: policy.id, entita: policy.entita, azione: policy.azione,
      processed: 0, errors: 0, details: [],
    }
    const where: Record<string, unknown> = { timestamp: { lt: soglia } }
    if (hostId) where.hostId = hostId
    const deleted = await prisma.wifiAccessLog.deleteMany({ where })
    action.processed = deleted.count
    return action
  },
}

/**
 * Esegue tutte le policy di retention. Se `hostId` è specificato, limita ai
 * dati di quell'host (utile per trigger manuale da /host/gdpr). Se null,
 * esegue su tutti i tenant (cron globale).
 */
export async function eseguiRetention(hostId: string | null = null): Promise<RetentionReport> {
  const report: RetentionReport = { eseguitoAt: new Date(), azioni: [] }
  const now = new Date()

  for (const policy of RETENTION_POLICIES) {
    const executor = EXECUTORS[policy.id]
    if (!executor) {
      logger.warn(`Policy ${policy.id} senza executor`, 'gdpr-retention')
      continue
    }
    const soglia = subDays(now, policy.giorniRetention)
    try {
      const action = await executor(policy, soglia, hostId)
      report.azioni.push(action)
      if (action.processed > 0 || action.errors > 0) {
        logger.info(
          `GDPR retention: ${policy.id} — ${action.processed} processati, ${action.errors} errori`,
          'gdpr-retention',
          { hostId, policyId: policy.id },
        )
      }
    } catch (e) {
      logger.error(`Policy ${policy.id} fallita`, 'gdpr-retention', {
        error: e instanceof Error ? e.message : String(e),
      })
      report.azioni.push({
        policyId: policy.id, entita: policy.entita, azione: policy.azione,
        processed: 0, errors: 1,
        details: [e instanceof Error ? e.message : String(e)],
      })
    }
  }

  return report
}

// ─── Notifica imminente ──────────────────────────────────────────────────────

/**
 * Per ogni policy con `notificaHostGiorniPrima`, trova record in scadenza
 * entro N giorni e crea una Notifica host. Dedup: max 1 notifica/giorno per
 * policy+host.
 */
export async function notificaRetentionImminente(): Promise<{
  notificheCreate: number
  perPolicy: Record<string, number>
}> {
  let notificheCreate = 0
  const perPolicy: Record<string, number> = {}
  const now = new Date()
  const oggi = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (const policy of RETENTION_POLICIES) {
    if (!policy.notificaHostGiorniPrima) continue

    const sogliaScadenza = subDays(now, policy.giorniRetention)
    const sogliaAvviso = subDays(now, policy.giorniRetention - policy.notificaHostGiorniPrima)

    // Conta per host i record in finestra (sogliaScadenza < data <= sogliaAvviso)
    let groupsByHost: Record<string, number> = {}

    if (policy.id === 'ospite_prenotazione') {
      const records = await prisma.prenotazione.findMany({
        where: {
          dataPartenza: { gt: sogliaScadenza, lte: sogliaAvviso },
          guestEmail: { not: { endsWith: ANON_EMAIL_DOMAIN } },
        },
        select: { hostId: true },
      })
      groupsByHost = records.reduce((acc, r) => {
        acc[r.hostId] = (acc[r.hostId] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    } else if (policy.id === 'waiver_spa') {
      const records = await prisma.waiverSpa.findMany({
        where: { dataRegistrazione: { gt: sogliaScadenza, lte: sogliaAvviso } },
        select: { appuntamento: { select: { hostId: true } } },
      })
      groupsByHost = records.reduce((acc, r) => {
        const h = r.appuntamento.hostId
        acc[h] = (acc[h] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    for (const [hostId, count] of Object.entries(groupsByHost)) {
      if (count === 0) continue
      // Dedup: già notificato oggi?
      const existing = await prisma.notifica.findFirst({
        where: {
          hostId,
          tipo: 'sistema',
          titolo: { contains: `retention:${policy.id}` },
          createdAt: { gte: oggi },
        },
      })
      if (existing) continue

      await prisma.notifica.create({
        data: {
          hostId,
          tipo: 'sistema',
          titolo: `[retention:${policy.id}] ${count} record in scadenza`,
          messaggio: `${count} ${policy.descrizione.toLowerCase()} saranno ${
            policy.azione === 'cancella' ? 'cancellati' : 'anonimizzati'
          } tra ${policy.notificaHostGiorniPrima} giorni. Scaricali ora dalla pagina GDPR & Privacy se ti servono.`,
          linkUrl: '/host/gdpr',
        },
      })
      notificheCreate++
      perPolicy[policy.id] = (perPolicy[policy.id] || 0) + 1
    }
  }

  return { notificheCreate, perPolicy }
}

// ─── Retrocompat API pre-esistente ───────────────────────────────────────────
// Il cron /api/cron/gdpr-retention e /api/host/gdpr/retention usano queste
// firme. Le manteniamo come wrapper sulla nuova eseguiRetention().

export async function runAllRetentionPolicies(hostId: string): Promise<RetentionResult[]> {
  const report = await eseguiRetention(hostId)
  return report.azioni.map((a) => ({
    policy: a.policyId,
    processed: a.processed,
    errors: a.errors,
    details: a.details,
  }))
}
