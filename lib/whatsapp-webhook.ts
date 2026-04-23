/**
 * Orchestratore end-to-end del webhook WhatsApp.
 *
 * Flusso (per ogni messaggio testuale nel payload Meta):
 *   1. Parse del payload (`parseWebhookMessages`)
 *   2. Identifica ospite → cerca `Prenotazione` o `OspiteCRM` per telefono
 *   3. Trova o crea `ConversazioneWhatsApp`
 *      - Su creazione: invia disclosure AI Act Art. 50 multilingua
 *   4. Salva `MessaggioWhatsApp` ospite
 *   5. Stato `ESCALATA` → notifica host, nessuna risposta AI
 *   6. Host con `conciergeAttivo=false` → auto-reply + notifica (modalità human-only)
 *   7. Rate limit: max 30 messaggi AI al giorno per conversazione
 *   8. Genera risposta via `generaRispostaConcierge` (single-turn, no tool-use)
 *   9. Escalation rilevata → stato ESCALATA + notifica host + messaggio append
 *  10. Invia messaggio via Meta Cloud API e salva come `MessaggioWhatsApp` AI
 *
 * Export pubblici:
 *   - `verificaWebhook` (handshake GET Meta)
 *   - `processaWebhookWhatsApp` (ricezione POST)
 *   - `inviaRispostaOperatore` (UI `/host/concierge/[id]` per risposta manuale)
 *
 * Nota: per flussi con tool-use (HK task, SPA booking, escalation via tool) usa
 * `processGuestMessage` in `lib/concierge.ts`. Questo modulo privilegia il
 * single-turn controllato: semplice, deterministico, facile da debuggare.
 */

import {
  parseWebhookMessages, sendWhatsAppMessage,
  type WhatsAppWebhookPayload, type WhatsAppIncomingMessage,
} from '@/lib/whatsapp'
import { generaRispostaConcierge, type ContestoOspiteConcierge } from '@/lib/ai-provider'
import {
  inviaMessaggioWhatsApp,
  WhatsAppNotConfiguredError,
  WhatsAppSendError,
} from '@/lib/whatsapp-send'
import { prisma } from '@/lib/db'
import { getHostSecret } from '@/lib/host-secrets'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'

// Rate limit: max messaggi AI per conversazione per giorno (anti-loop / budget protection)
const RATE_LIMIT_AI_PER_DAY = 30

/**
 * Verifica se l'orario attuale (timezone Europe/Rome) è all'interno della
 * finestra `[daHHMM, aHHMM]`. Supporta finestre che scavalcano la mezzanotte
 * (es. da=22:00, a=07:00). Se uno dei due è null → sempre attivo.
 */
function orarioDentroFinestra(daHHMM: string | null, aHHMM: string | null): boolean {
  if (!daHHMM || !aHHMM) return true

  const parseHm = (s: string): number | null => {
    const m = s.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    return Number(m[1]) * 60 + Number(m[2])
  }

  const da = parseHm(daHHMM)
  const a = parseHm(aHHMM)
  if (da === null || a === null) return true

  // Ora corrente in timezone Europe/Rome (fallback UTC se intl non disponibile)
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  const ora = hh * 60 + mm

  // Finestra diurna standard: da ≤ a
  if (da <= a) return ora >= da && ora < a
  // Finestra che scavalca mezzanotte: da > a (es. 22:00-07:00)
  return ora >= da || ora < a
}

// ────────────────────────────────────────────────────────────────────────────
// Verifica webhook (GET)
// ────────────────────────────────────────────────────────────────────────────

export function verificaWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  hostVerifyToken: string,
): string | null {
  if (mode === 'subscribe' && token && token === hostVerifyToken && challenge) {
    return challenge
  }
  return null
}

// ────────────────────────────────────────────────────────────────────────────
// Processing POST
// ────────────────────────────────────────────────────────────────────────────

export type WebhookProcessingResult = {
  messaggiRicevuti: number
  risposteInviate: number
  risposteFallite: number
  escalati: number
  rateLimitati: number
  errori: Array<{ from: string; error: string }>
}

export async function processaWebhookWhatsApp(
  payload: WhatsAppWebhookPayload,
  hostId: string,
): Promise<WebhookProcessingResult> {
  const result: WebhookProcessingResult = {
    messaggiRicevuti: 0, risposteInviate: 0, risposteFallite: 0,
    escalati: 0, rateLimitati: 0, errori: [],
  }

  const messaggi = parseWebhookMessages(payload)
  result.messaggiRicevuti = messaggi.length

  for (const msg of messaggi) {
    try {
      await processaSingoloMessaggio(hostId, msg, result)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('Webhook WA: errore elaborazione messaggio', { from: msg.from, error: errMsg })
      result.errori.push({ from: msg.from, error: errMsg })
    }
  }

  return result
}

async function processaSingoloMessaggio(
  hostId: string,
  msg: WhatsAppIncomingMessage,
  result: WebhookProcessingResult,
): Promise<void> {
  // ─── 1. Host + HostConciergeConfig ──────────────────────────────────────
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, conciergeAttivo: true },
  })
  if (!host) {
    throw new Error(`Host ${hostId} non trovato`)
  }

  // Nuovi campi di comportamento — vivono SOLO su HostConciergeConfig
  const cfg = await prisma.hostConciergeConfig.findUnique({
    where: { hostId },
    select: {
      conciergeAutoEscalation: true,
      conciergeOrariAttiviDa: true,
      conciergeOrariAttiviA: true,
      conciergeMessaggioFuoriOrario: true,
      conciergeLinguaDefault: true,
    },
  })

  // ─── 2. Identifica ospite (contesto per AI) ─────────────────────────────
  const contesto = await risolviContestoOspite(hostId, msg.from)
  // Se la prenotazione/CRM non ha lingua, usa il default dell'host
  if (!contesto.lingua && cfg?.conciergeLinguaDefault) {
    contesto.lingua = cfg.conciergeLinguaDefault
  }

  // ─── 3. Trova o crea conversazione ──────────────────────────────────────
  const { conversazione, appenaCreata } = await trovaOCreaConversazione(
    hostId, msg.from, msg.name, contesto,
  )

  // Disclosure AI Act Art. 50 alla prima interazione (solo se AI attivo)
  if (appenaCreata && host.conciergeAttivo !== false) {
    const disclosure = disclosureTesto(contesto.lingua ?? 'it', host.nomeAzienda)
    await prisma.messaggioWhatsApp.create({
      data: {
        conversazioneId: conversazione.id,
        mittente: 'AI_CONCIERGE',
        testo: disclosure,
      },
    })
    await provaInvia(hostId, msg.from, disclosure, result)
  }

  // ─── 4. Salva messaggio ospite ──────────────────────────────────────────
  await prisma.messaggioWhatsApp.create({
    data: {
      conversazioneId: conversazione.id,
      mittente: 'OSPITE',
      testo: msg.text,
      whatsappMessageId: msg.messageId,
    },
  })

  // ─── 5. Conversazione ESCALATA → solo notifica, niente AI ──────────────
  if (conversazione.stato === 'ESCALATA') {
    await notificaNuovoMessaggio(hostId, conversazione.id, contesto.nome, msg.text)
    result.escalati += 1
    return
  }

  // ─── 6. Concierge off → auto-reply human-only ──────────────────────────
  if (host.conciergeAttivo === false) {
    const autoReply = autoReplyUmano(contesto.lingua ?? 'it')
    await prisma.messaggioWhatsApp.create({
      data: {
        conversazioneId: conversazione.id,
        mittente: 'AI_CONCIERGE',
        testo: autoReply,
      },
    })
    await notificaNuovoMessaggio(hostId, conversazione.id, contesto.nome, msg.text)
    await provaInvia(hostId, msg.from, autoReply, result)
    return
  }

  // ─── 6b. Orario attivo? Se fuori finestra → messaggio fuori orario ─────
  if (!orarioDentroFinestra(cfg?.conciergeOrariAttiviDa ?? null, cfg?.conciergeOrariAttiviA ?? null)) {
    const fuori = cfg?.conciergeMessaggioFuoriOrario
      ?? 'La reception è chiusa. Ti risponderemo al più presto negli orari di apertura.'
    await prisma.messaggioWhatsApp.create({
      data: {
        conversazioneId: conversazione.id,
        mittente: 'AI_CONCIERGE',
        testo: fuori,
      },
    })
    await notificaNuovoMessaggio(hostId, conversazione.id, contesto.nome, msg.text)
    await provaInvia(hostId, msg.from, fuori, result)
    return
  }

  // ─── 6c. Auto-escalation dopo N messaggi AI senza risoluzione ──────────
  // Euristica: se la conversazione ha già accumulato ≥ N messaggi AI da quando
  // è in stato ATTIVA, significa che il bot "non ha risolto" e passiamo a operatore.
  // N configurabile via `conciergeAutoEscalation` (default 10, 0 = disabilitato).
  const sogliaAuto = cfg?.conciergeAutoEscalation ?? 10
  if (sogliaAuto > 0) {
    const msgAIAttivi = await prisma.messaggioWhatsApp.count({
      where: {
        conversazioneId: conversazione.id,
        mittente: 'AI_CONCIERGE',
      },
    })
    if (msgAIAttivi >= sogliaAuto) {
      await prisma.conversazioneWhatsApp.update({
        where: { id: conversazione.id },
        data: { stato: 'ESCALATA' },
      })
      const avviso = appendEscalationAvviso(contesto.lingua ?? 'it')
      await prisma.messaggioWhatsApp.create({
        data: {
          conversazioneId: conversazione.id,
          mittente: 'AI_CONCIERGE',
          testo: avviso,
        },
      })
      await prisma.notifica.create({
        data: {
          hostId,
          tipo: 'concierge_escalation',
          titolo: `Auto-escalation: ${contesto.nome}`,
          messaggio: `Soglia ${sogliaAuto} messaggi AI raggiunta. Ultimo: "${msg.text.slice(0, 100)}"`,
          linkUrl: `/host/concierge/${conversazione.id}`,
        },
      })
      await prisma.azioneConcierge.create({
        data: {
          conversazioneId: conversazione.id,
          tipo: 'ESCALATION',
          descrizione: `Auto-escalation dopo ${sogliaAuto} messaggi AI`,
          successo: true,
        },
      })
      await provaInvia(hostId, msg.from, avviso, result)
      result.escalati += 1
      return
    }
  }

  // ─── 7. Rate limit ──────────────────────────────────────────────────────
  const messaggiAIOggi = await contaMessaggiAIOggi(conversazione.id)
  if (messaggiAIOggi >= RATE_LIMIT_AI_PER_DAY) {
    const hardStop = rateLimitTesto(contesto.lingua ?? 'it')
    await prisma.messaggioWhatsApp.create({
      data: {
        conversazioneId: conversazione.id,
        mittente: 'AI_CONCIERGE',
        testo: hardStop,
      },
    })
    await provaInvia(hostId, msg.from, hardStop, result)
    result.rateLimitati += 1
    logger.warn('WA rate limit raggiunto', { hostId, conversazioneId: conversazione.id })
    return
  }

  // ─── 8. Genera risposta AI ──────────────────────────────────────────────
  const aiRes = await generaRispostaConcierge({
    hostId,
    conversazioneId: conversazione.id,
    messaggioOspite: msg.text,
    contestoOspite: contesto,
  })

  // ─── 9. Escalation? ─────────────────────────────────────────────────────
  if (aiRes.escalare) {
    await prisma.conversazioneWhatsApp.update({
      where: { id: conversazione.id },
      data: { stato: 'ESCALATA' },
    })

    const rispostaConAvviso = `${aiRes.risposta}\n\n${appendEscalationAvviso(contesto.lingua ?? 'it')}`

    await prisma.messaggioWhatsApp.create({
      data: {
        conversazioneId: conversazione.id,
        mittente: 'AI_CONCIERGE',
        testo: rispostaConAvviso,
        tokensUsati: aiRes.tokenUsati || null,
      },
    })

    await prisma.notifica.create({
      data: {
        hostId,
        tipo: 'concierge_escalation',
        titolo: `Conversazione escalata: ${contesto.nome || msg.from}`,
        messaggio: `Motivo: ${aiRes.motivoEscalation ?? 'Richiesta ospite'}. Ultimo messaggio: "${msg.text.slice(0, 100)}"`,
        linkUrl: `/host/concierge/${conversazione.id}`,
      },
    })

    await prisma.azioneConcierge.create({
      data: {
        conversazioneId: conversazione.id,
        tipo: 'ESCALATION',
        descrizione: `Conversazione escalata. ${aiRes.motivoEscalation ?? ''}`.trim(),
        successo: true,
      },
    })

    await provaInvia(hostId, msg.from, rispostaConAvviso, result)
    result.escalati += 1
    return
  }

  // ─── 10. Risposta normale ──────────────────────────────────────────────
  await prisma.messaggioWhatsApp.create({
    data: {
      conversazioneId: conversazione.id,
      mittente: 'AI_CONCIERGE',
      testo: aiRes.risposta,
      tokensUsati: aiRes.tokenUsati || null,
    },
  })

  await provaInvia(hostId, msg.from, aiRes.risposta, result)

  // TODO: `ConversazioneWhatsApp` non ha il campo `riassuntoAI` in schema.
  // L'aggiornamento riassunto ogni 10 messaggi richiede migrazione:
  //   ALTER TABLE conversazioni_whatsapp ADD COLUMN riassunto_ai TEXT;
  // Quando il campo sarà disponibile, riattivare il blocco qui sotto:
  //
  // const totale = await prisma.messaggioWhatsApp.count({
  //   where: { conversazioneId: conversazione.id },
  // })
  // if (totale % 10 === 0) await aggiornaRiassunto(conversazione.id, hostId)
}

// ────────────────────────────────────────────────────────────────────────────
// Risposta operatore (UI /host/concierge/[id])
// ────────────────────────────────────────────────────────────────────────────

/**
 * L'operatore (host umano) risponde manualmente da UI.
 * - Invia il messaggio su WhatsApp
 * - Salva in DB con `mittente: HOST_UMANO`
 * - NON modifica lo stato della conversazione (l'operatore può mantenerla ESCALATA
 *   o riattivarla via `desescalaConversazione`)
 *
 * `operatoreId` è accettato per tracking ma non persistito (campo assente in schema).
 * Viene registrato nell'audit log.
 */
export async function inviaRispostaOperatore(
  conversazioneId: string,
  hostId: string,
  operatoreId: string,
  testo: string,
): Promise<{ messageId: string | null }> {
  const conversazione = await prisma.conversazioneWhatsApp.findUnique({
    where: { id: conversazioneId },
    select: { id: true, hostId: true, telefonoOspite: true },
  })
  if (!conversazione) throw new Error(`Conversazione ${conversazioneId} non trovata`)
  if (conversazione.hostId !== hostId) {
    throw new Error('Conversazione non appartiene a questo host')
  }

  // Invia su WhatsApp (best-effort: se fallisce propaghiamo l'errore al chiamante)
  let messageId: string | null = null
  try {
    const res = await inviaMessaggioWhatsApp(hostId, conversazione.telefonoOspite, testo)
    messageId = res.messageId
  } catch (err) {
    if (err instanceof WhatsAppNotConfiguredError) {
      // Se WA non è configurato, salviamo comunque in DB — l'host vede il messaggio in UI
      logger.warn('Operatore risponde ma WhatsApp non configurato — salvo solo in DB', {
        hostId, conversazioneId,
      })
    } else {
      throw err
    }
  }

  await prisma.messaggioWhatsApp.create({
    data: {
      conversazioneId,
      mittente: 'HOST_UMANO',
      testo,
      whatsappMessageId: messageId,
    },
  })

  await audit({
    userId: operatoreId,
    userEmail: operatoreId,
    hostId,
    azione: 'concierge.risposta_operatore',
    entita: 'ConversazioneWhatsApp',
    entitaId: conversazioneId,
    dettagli: `Operatore ha risposto (${testo.length} caratteri)`,
  })

  return { messageId }
}

/**
 * Riattiva la conversazione ESCALATA → ATTIVA.
 * L'operatore decide manualmente quando rimettere il bot in pilota automatico.
 */
export async function desescalaConversazione(
  conversazioneId: string,
  hostId: string,
  operatoreId: string,
): Promise<void> {
  const conv = await prisma.conversazioneWhatsApp.findUnique({
    where: { id: conversazioneId },
    select: { hostId: true, stato: true },
  })
  if (!conv || conv.hostId !== hostId) throw new Error('Conversazione non trovata')
  if (conv.stato !== 'ESCALATA') return

  await prisma.conversazioneWhatsApp.update({
    where: { id: conversazioneId },
    data: { stato: 'ATTIVA' },
  })

  await audit({
    userId: operatoreId,
    userEmail: operatoreId,
    hostId,
    azione: 'concierge.desescalata',
    entita: 'ConversazioneWhatsApp',
    entitaId: conversazioneId,
    dettagli: 'Riattivato AI concierge dopo intervento operatore',
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers interni
// ────────────────────────────────────────────────────────────────────────────

async function risolviContestoOspite(
  hostId: string,
  telefono: string,
): Promise<ContestoOspiteConcierge> {
  // 1. Prenotazione attiva (check-in entro 7 giorni)
  const sette = new Date(Date.now() + 7 * 86400 * 1000)
  const pren = await prisma.prenotazione.findFirst({
    where: {
      hostId,
      guestTelefono: telefono,
      stato: { in: ['CONFERMATA', 'RICHIESTA'] },
      dataArrivo: { lte: sette },
      deletedAt: null,
    },
    orderBy: { dataArrivo: 'asc' },
    select: {
      guestNome: true,
      guestCognome: true,
      guestLingua: true,
      dataArrivo: true,
      dataPartenza: true,
      unita: { select: { nome: true } },
      pianoPasto: { select: { piano: true } },
    },
  })
  if (pren) {
    return {
      nome: `${pren.guestNome} ${pren.guestCognome}`.trim(),
      camera: pren.unita?.nome ?? undefined,
      dataArrivo: pren.dataArrivo,
      dataPartenza: pren.dataPartenza ?? undefined,
      pianoPasto: pren.pianoPasto?.piano ?? undefined,
      lingua: pren.guestLingua ?? 'it',
    }
  }

  // 2. Ospite CRM
  const crm = await prisma.ospiteCRM.findFirst({
    where: { hostId, telefono },
    select: { nome: true, cognome: true, lingua: true },
  })
  if (crm) {
    return {
      nome: `${crm.nome} ${crm.cognome}`.trim(),
      lingua: crm.lingua ?? 'it',
    }
  }

  return { nome: 'Ospite', lingua: 'it' }
}

async function trovaOCreaConversazione(
  hostId: string,
  telefono: string,
  nomeWA: string | null,
  contesto: ContestoOspiteConcierge,
): Promise<{ conversazione: { id: string; stato: string }; appenaCreata: boolean }> {
  // Unique (hostId, telefonoOspite)
  const esistente = await prisma.conversazioneWhatsApp.findUnique({
    where: { hostId_telefonoOspite: { hostId, telefonoOspite: telefono } },
    select: { id: true, stato: true },
  })

  if (esistente) {
    // Se era chiusa, riattiva
    if (esistente.stato === 'CHIUSA') {
      await prisma.conversazioneWhatsApp.update({
        where: { id: esistente.id },
        data: { stato: 'ATTIVA' },
      })
      return { conversazione: { id: esistente.id, stato: 'ATTIVA' }, appenaCreata: false }
    }
    return { conversazione: esistente, appenaCreata: false }
  }

  const nuova = await prisma.conversazioneWhatsApp.create({
    data: {
      hostId,
      telefonoOspite: telefono,
      nomeOspite: nomeWA ?? contesto.nome ?? null,
      lingua: contesto.lingua ?? 'it',
    },
    select: { id: true, stato: true },
  })
  return { conversazione: nuova, appenaCreata: true }
}

async function contaMessaggiAIOggi(conversazioneId: string): Promise<number> {
  const inizioOggi = new Date()
  inizioOggi.setHours(0, 0, 0, 0)
  return prisma.messaggioWhatsApp.count({
    where: {
      conversazioneId,
      mittente: 'AI_CONCIERGE',
      createdAt: { gte: inizioOggi },
    },
  })
}

async function notificaNuovoMessaggio(
  hostId: string,
  conversazioneId: string,
  nomeOspite: string,
  testo: string,
): Promise<void> {
  try {
    await prisma.notifica.create({
      data: {
        hostId,
        tipo: 'concierge_messaggio',
        titolo: `Nuovo messaggio da ${nomeOspite}`,
        messaggio: testo.slice(0, 200),
        linkUrl: `/host/concierge/${conversazioneId}`,
      },
    })
  } catch (err) {
    logger.warn('Notifica nuovo messaggio fallita', { error: String(err) })
  }
}

/**
 * Invio best-effort: se WA non configurato o fallisce, log e continua.
 * Il messaggio è già salvato in DB prima della chiamata.
 */
async function provaInvia(
  hostId: string,
  destinatario: string,
  testo: string,
  result: WebhookProcessingResult,
): Promise<void> {
  try {
    await inviaMessaggioWhatsApp(hostId, destinatario, testo)
    result.risposteInviate += 1
  } catch (err) {
    result.risposteFallite += 1
    if (err instanceof WhatsAppNotConfiguredError) {
      logger.warn(`WhatsApp non configurato per ${hostId} — messaggio salvato solo in DB`)
    } else if (err instanceof WhatsAppSendError) {
      logger.error('Invio WhatsApp fallito', { to: destinatario, error: err.message })
    } else {
      logger.error('Invio WhatsApp errore sconosciuto', { error: String(err) })
    }
  }
}

// Segnala esplicitamente che importiamo `sendWhatsAppMessage` solo per re-export
// indiretto via `inviaMessaggioWhatsApp`. Silenzia l'unused warning di tsc.
void sendWhatsAppMessage
void getHostSecret

// ────────────────────────────────────────────────────────────────────────────
// Testi localizzati
// ────────────────────────────────────────────────────────────────────────────

function disclosureTesto(lingua: string, nomeAzienda: string): string {
  const m: Record<string, string> = {
    it: `Ciao! Sono l'assistente virtuale di ${nomeAzienda}. Sono un sistema di intelligenza artificiale e posso aiutarti con informazioni, prenotazioni e servizi. Per parlare con il personale, scrivi "operatore" in qualsiasi momento.`,
    en: `Hi! I'm the virtual assistant of ${nomeAzienda}. I'm an AI system and I can help with info, bookings and services. Type "operator" anytime to speak with staff.`,
    fr: `Bonjour ! Je suis l'assistant virtuel de ${nomeAzienda}. Je suis un systeme d'intelligence artificielle et je peux vous aider. Ecrivez "operateur" pour parler avec le personnel.`,
    de: `Hallo! Ich bin der virtuelle Assistent von ${nomeAzienda}. Ich bin ein KI-System. Schreiben Sie jederzeit "Mitarbeiter", um mit dem Personal zu sprechen.`,
    es: `Hola! Soy el asistente virtual de ${nomeAzienda}. Soy un sistema de IA. Escribe "operador" en cualquier momento para hablar con el personal.`,
  }
  return m[lingua] ?? m.en
}

function autoReplyUmano(lingua: string): string {
  const m: Record<string, string> = {
    it: 'Grazie per il tuo messaggio! Ti rispondiamo appena possibile, di solito entro 15 minuti.',
    en: "Thanks for your message! We'll get back to you as soon as possible, usually within 15 minutes.",
    fr: 'Merci pour votre message ! Nous vous repondrons des que possible, generalement dans les 15 minutes.',
    de: 'Danke fur deine Nachricht! Wir melden uns so bald wie moglich, normalerweise innerhalb von 15 Minuten.',
    es: 'Gracias por tu mensaje! Te responderemos lo antes posible, generalmente en 15 minutos.',
  }
  return m[lingua] ?? m.en
}

function rateLimitTesto(lingua: string): string {
  const m: Record<string, string> = {
    it: 'Ho raggiunto il limite di messaggi per oggi. Per assistenza immediata contatta la reception.',
    en: "I've reached today's message limit. Please contact the reception for immediate assistance.",
    fr: "J'ai atteint la limite de messages pour aujourd'hui. Contactez la reception pour une assistance immediate.",
    de: 'Tageslimit fur Nachrichten erreicht. Bitte kontaktieren Sie die Rezeption fur sofortige Hilfe.',
    es: 'He alcanzado el limite de mensajes por hoy. Contacta con la recepcion para asistencia inmediata.',
  }
  return m[lingua] ?? m.en
}

function appendEscalationAvviso(lingua: string): string {
  const m: Record<string, string> = {
    it: 'Un operatore ti risponderà a breve.',
    en: 'An operator will get back to you shortly.',
    fr: 'Un operateur vous repondra sous peu.',
    de: 'Ein Mitarbeiter meldet sich in Kurze bei Ihnen.',
    es: 'Un operador te respondera en breve.',
  }
  return m[lingua] ?? m.en
}
