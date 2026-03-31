/**
 * AI Concierge Engine
 *
 * Orchestratore centrale: riceve messaggio ospite, carica contesto,
 * chiama l'AI con tools, esegue azioni, restituisce risposta.
 *
 * Flusso:
 *   1. Identifica ospite (telefono → prenotazione)
 *   2. Carica contesto (booking, camera, hotel info)
 *   3. Recupera storia conversazione
 *   4. Chiama AI provider con tool definitions
 *   5. Se AI richiede tool → esegui → richiama AI con risultato
 *   6. Salva messaggi e azioni in DB
 *   7. Restituisci risposta testuale
 */

import { prisma } from '@/lib/db'
import { PrioritaHK, PrioritaManutenzione, TipoAzioneConcierge } from '@prisma/client'
import { createAIProvider, type AIMessage, type AIToolDefinition, type AIToolCall } from '@/lib/ai-provider'
import { logger } from '@/lib/logger'

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const CONCIERGE_TOOLS: AIToolDefinition[] = [
  {
    name: 'check_spa_availability',
    description: 'Verifica gli slot disponibili per un trattamento SPA in una data specifica. Usa questo tool quando l\'ospite chiede disponibilità SPA.',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Data in formato YYYY-MM-DD' },
        trattamentoNome: { type: 'string', description: 'Nome del trattamento richiesto (opzionale)' },
      },
      required: ['data'],
    },
  },
  {
    name: 'book_spa_appointment',
    description: 'Prenota un appuntamento SPA per l\'ospite. Usa SOLO dopo che l\'ospite ha confermato data e orario.',
    parameters: {
      type: 'object',
      properties: {
        trattamentoId: { type: 'string', description: 'ID del trattamento' },
        dataOra: { type: 'string', description: 'Data e ora in formato ISO (es. 2025-06-15T10:00:00)' },
        note: { type: 'string', description: 'Note aggiuntive (opzionale)' },
      },
      required: ['trattamentoId', 'dataOra'],
    },
  },
  {
    name: 'create_housekeeping_task',
    description: 'Crea una richiesta housekeeping: asciugamani extra, cambio biancheria, turndown service, pulizia extra, ecc.',
    parameters: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['PULIZIA', 'CAMBIO_BIANCHERIA', 'MANUTENZIONE', 'ALTRO'],
          description: 'Tipo di richiesta',
        },
        descrizione: { type: 'string', description: 'Descrizione dettagliata della richiesta' },
        priorita: {
          type: 'string',
          enum: ['BASSA', 'NORMALE', 'ALTA', 'URGENTE'],
          description: 'Priorità (default: NORMALE)',
        },
      },
      required: ['tipo', 'descrizione'],
    },
  },
  {
    name: 'report_maintenance_issue',
    description: 'Segnala un problema tecnico o guasto in camera (rubinetto, aria condizionata, serratura, ecc.)',
    parameters: {
      type: 'object',
      properties: {
        titolo: { type: 'string', description: 'Titolo breve del problema' },
        descrizione: { type: 'string', description: 'Descrizione dettagliata' },
        categoria: {
          type: 'string',
          enum: ['IDRAULICA', 'ELETTRICA', 'SERRATURA', 'ARREDO', 'PULIZIA_STRAORD', 'ALTRO'],
          description: 'Categoria del problema',
        },
        priorita: {
          type: 'string',
          enum: ['BASSA', 'NORMALE', 'ALTA', 'URGENTE'],
          description: 'Urgenza',
        },
      },
      required: ['titolo', 'descrizione', 'categoria'],
    },
  },
  {
    name: 'request_late_checkout',
    description: 'Richiede un late checkout per l\'ospite. Crea una notifica per il receptionist.',
    parameters: {
      type: 'object',
      properties: {
        oraRichiesta: { type: 'string', description: 'Ora desiderata (es. "14:00")' },
        motivo: { type: 'string', description: 'Motivo della richiesta (opzionale)' },
      },
      required: ['oraRichiesta'],
    },
  },
  {
    name: 'get_hotel_info',
    description: 'Recupera informazioni sull\'hotel: orari colazione, checkout, Wi-Fi, ristorante, trasporti, servizi. Usa quando l\'ospite chiede info generali.',
    parameters: {
      type: 'object',
      properties: {
        argomento: { type: 'string', description: 'Argomento specifico (es. "colazione", "checkout", "wifi", "ristorante", "parcheggio")' },
      },
      required: ['argomento'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Passa la conversazione a un operatore umano. Usa quando non puoi risolvere la richiesta o l\'ospite lo chiede esplicitamente.',
    parameters: {
      type: 'object',
      properties: {
        motivo: { type: 'string', description: 'Motivo dell\'escalation per l\'operatore' },
      },
      required: ['motivo'],
    },
  },
  {
    name: 'add_companion',
    description: 'Registra un accompagnatore per la prenotazione. Usa quando l\'ospite comunica i dati di chi viaggia con lui (nome, cognome, documento). Chiedi i dati uno alla volta in modo naturale.',
    parameters: {
      type: 'object',
      properties: {
        nome: { type: 'string', description: 'Nome dell\'accompagnatore' },
        cognome: { type: 'string', description: 'Cognome dell\'accompagnatore' },
        sesso: { type: 'string', enum: ['M', 'F'], description: 'Sesso (opzionale)' },
        dataNascita: { type: 'string', description: 'Data di nascita YYYY-MM-DD (opzionale)' },
        nazionalita: { type: 'string', description: 'Nazionalità (opzionale)' },
        tipoDocumento: { type: 'string', enum: ['IDENTE', 'PPORT', 'PATEN', 'ALTRO'], description: 'Tipo documento (opzionale)' },
        numeroDocumento: { type: 'string', description: 'Numero documento (opzionale)' },
        isMinore: { type: 'boolean', description: 'Se minore di 18 anni' },
      },
      required: ['nome', 'cognome'],
    },
  },
  {
    name: 'assign_room',
    description: 'Assegna una camera alla prenotazione dell\'ospite. Sceglie automaticamente la camera migliore disponibile (pulita, capacità adeguata). Usa quando l\'ospite chiede informazioni sulla camera o quando serve assegnare una camera.',
    parameters: {
      type: 'object',
      properties: {
        pianoPreferito: { type: 'number', description: 'Piano preferito dall\'ospite (opzionale)' },
      },
      required: [],
    },
  },
  {
    name: 'propose_room_upgrade',
    description: 'Propone un upgrade di camera all\'ospite con supplemento. Usa quando l\'ospite chiede di cambiare camera, vuole qualcosa di meglio, o quando il sistema ha upgrade disponibili.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]

// ─── Context builder ──────────────────────────────────────────────────────────

interface GuestContext {
  prenotazioneId: string | null
  guestNome: string
  guestCognome: string
  unitaNome: string | null
  strutturaNome: string | null
  strutturaId: string | null
  unitaId: string | null
  dataArrivo: string | null
  dataPartenza: string | null
  stato: string | null
  lingua: string
}

async function findGuestContext(hostId: string, telefono: string): Promise<GuestContext> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // 1. Cerca prenotazione attiva (confermata, in corso oggi)
  const prenotazione = await prisma.prenotazione.findFirst({
    where: {
      hostId,
      guestTelefono: telefono,
      stato: { in: ['CONFERMATA', 'RICHIESTA'] },
      dataArrivo: { lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) }, // entro 7 giorni
    },
    include: {
      unita: { select: { id: true, nome: true } },
      struttura: { select: { id: true, nome: true } },
    },
    orderBy: { dataArrivo: 'asc' },
  })

  if (prenotazione) {
    return {
      prenotazioneId: prenotazione.id,
      guestNome: prenotazione.guestNome,
      guestCognome: prenotazione.guestCognome,
      unitaNome: prenotazione.unita?.nome || null,
      strutturaNome: prenotazione.struttura?.nome || null,
      strutturaId: prenotazione.strutturaId || null,
      unitaId: prenotazione.unitaId || null,
      dataArrivo: prenotazione.dataArrivo.toISOString().split('T')[0],
      dataPartenza: prenotazione.dataPartenza?.toISOString().split('T')[0] || null,
      stato: prenotazione.stato,
      lingua: prenotazione.guestLingua || 'it',
    }
  }

  // 2. Cerca in CRM
  const ospite = await prisma.ospiteCRM.findFirst({
    where: { hostId, telefono },
  })

  if (ospite) {
    return {
      prenotazioneId: null,
      guestNome: ospite.nome,
      guestCognome: ospite.cognome,
      unitaNome: null,
      strutturaNome: null,
      strutturaId: null,
      unitaId: null,
      dataArrivo: null,
      dataPartenza: null,
      stato: null,
      lingua: ospite.lingua || 'it',
    }
  }

  // 3. Non identificato
  return {
    prenotazioneId: null,
    guestNome: 'Ospite',
    guestCognome: '',
    unitaNome: null,
    strutturaNome: null,
    strutturaId: null,
    unitaId: null,
    dataArrivo: null,
    dataPartenza: null,
    stato: null,
    lingua: 'it',
  }
}

function buildSystemPrompt(host: {
  nomeAzienda: string
  conciergeSystemPrompt: string | null
}, guest: GuestContext): string {
  const hotelInfo = host.conciergeSystemPrompt || 'Nessuna informazione specifica configurata dall\'hotel.'

  let guestBlock = `Nome: ${guest.guestNome} ${guest.guestCognome}`
  if (guest.unitaNome) guestBlock += `\nCamera/Unità: ${guest.unitaNome}`
  if (guest.strutturaNome) guestBlock += `\nStruttura: ${guest.strutturaNome}`
  if (guest.dataArrivo) guestBlock += `\nCheck-in: ${guest.dataArrivo}`
  if (guest.dataPartenza) guestBlock += `\nCheck-out: ${guest.dataPartenza}`
  if (guest.stato) guestBlock += `\nStato prenotazione: ${guest.stato}`
  if (!guest.prenotazioneId) guestBlock += `\n⚠ Ospite non identificato — chiedi gentilmente nome ed email per verificare la prenotazione`

  return `Sei il concierge AI di ${host.nomeAzienda}, un assistente disponibile 24/7 via WhatsApp.

OSPITE:
${guestBlock}

INFORMAZIONI HOTEL:
${hotelInfo}

REGOLE:
1. Rispondi nella lingua dell'ospite (attualmente: ${guest.lingua})
2. Sii cordiale ma professionale — tono da concierge di hotel
3. Risposte brevi e WhatsApp-friendly — niente markdown pesante, niente asterischi, usa emoji con moderazione
4. Per richieste HK (asciugamani, turndown, biancheria) usa create_housekeeping_task
5. Per la SPA: prima verifica disponibilità con check_spa_availability, poi proponi slot, prenota SOLO se l'ospite conferma
6. Per problemi tecnici (rubinetto, AC, serratura) usa report_maintenance_issue
7. Per late checkout usa request_late_checkout — informa che è soggetto a disponibilità
8. Se non puoi risolvere qualcosa, usa escalate_to_human
9. Non inventare informazioni — se non sai qualcosa, dì che verifichi con la reception
10. Non condividere dati di altri ospiti o informazioni interne dell'hotel`
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(
  toolCall: AIToolCall,
  hostId: string,
  guest: GuestContext,
  conversazioneId: string,
): Promise<string> {
  const args = toolCall.arguments
  let result: string
  let tipo: string = 'INFO_FORNITA'
  let successo = true

  try {
    switch (toolCall.name) {
      case 'check_spa_availability': {
        tipo = 'SPA_CHECK_DISPONIBILITA'
        if (!guest.strutturaId) {
          result = 'Nessuna struttura collegata alla prenotazione. Impossibile verificare disponibilità SPA.'
          break
        }

        // Cerca trattamenti se specificato un nome
        let trattamentoFilter = ''
        if (args.trattamentoNome) {
          const trattamenti = await prisma.trattamentoSpa.findMany({
            where: { hostId, attivo: true, nome: { contains: String(args.trattamentoNome), mode: 'insensitive' } },
            select: { id: true, nome: true, durata: true, prezzo: true },
            take: 5,
          })
          if (trattamenti.length > 0) {
            trattamentoFilter = `\nTrattamenti trovati: ${trattamenti.map(t => `${t.nome} (${t.durata}min, €${t.prezzo})`).join(', ')}`
          }
        }

        // Cerca slot disponibili
        const trattamenti = await prisma.trattamentoSpa.findMany({
          where: { hostId, attivo: true },
          select: { id: true, nome: true, durata: true, prezzo: true, categoria: true },
        })

        result = `Data richiesta: ${args.data}${trattamentoFilter}\nTrattamenti disponibili: ${trattamenti.map(t => `${t.nome} (${t.durata}min, €${t.prezzo})`).join('; ') || 'Nessun trattamento configurato'}\n\nPer verificare slot orari specifici, chiedi all'ospite quale trattamento preferisce e proponi gli orari del giorno.`
        break
      }

      case 'book_spa_appointment': {
        tipo = 'SPA_PRENOTAZIONE'
        if (!guest.strutturaId) {
          result = 'Impossibile prenotare: nessuna struttura collegata.'
          successo = false
          break
        }

        const trattamento = await prisma.trattamentoSpa.findUnique({
          where: { id: String(args.trattamentoId) },
          select: { id: true, nome: true, durata: true, prezzo: true },
        })
        if (!trattamento) {
          result = 'Trattamento non trovato.'
          successo = false
          break
        }

        const appuntamento = await prisma.appuntamentoSpa.create({
          data: {
            hostId,
            trattamentoId: trattamento.id,
            guestNome: guest.guestNome,
            guestCognome: guest.guestCognome,
            guestTelefono: '',
            prenotazioneId: guest.prenotazioneId,
            dataOra: new Date(String(args.dataOra)),
            durata: trattamento.durata,
            prezzoTotale: trattamento.prezzo,
            note: args.note ? String(args.note) : null,
            stato: 'CONFERMATO',
          },
        })

        // Crea notifica per host
        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'spa',
            titolo: `SPA: ${guest.guestNome} ${guest.guestCognome}`,
            messaggio: `Prenotazione AI Concierge: ${trattamento.nome} il ${new Date(String(args.dataOra)).toLocaleDateString('it')} — ${guest.unitaNome || 'camera N/D'}`,
            linkUrl: `/host/spa/appuntamenti`,
          },
        })

        result = `Prenotazione confermata: ${trattamento.nome}, ${new Date(String(args.dataOra)).toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long' })} ore ${new Date(String(args.dataOra)).toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' })}. Durata ${trattamento.durata} minuti. Prezzo €${trattamento.prezzo}. ID: ${appuntamento.id}`
        break
      }

      case 'create_housekeeping_task': {
        tipo = 'HK_TASK_CREATO'
        if (!guest.unitaId) {
          result = 'Nessuna camera/unità collegata. Richiesta inoltrata come nota generica.'
        }

        const task = await prisma.taskHK.create({
          data: {
            hostId,
            unitaId: guest.unitaId || '',
            tipo: String(args.tipo || 'ALTRO'),
            descrizione: `[AI Concierge] ${args.descrizione} — Ospite: ${guest.guestNome} ${guest.guestCognome}${guest.unitaNome ? ` (${guest.unitaNome})` : ''}`,
            priorita: (args.priorita as PrioritaHK) || 'NORMALE',
          },
        })

        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'sistema',
            titolo: `HK: richiesta da ${guest.guestNome}`,
            messaggio: `${args.descrizione}${guest.unitaNome ? ` — ${guest.unitaNome}` : ''}`,
            linkUrl: guest.unitaId ? `/host/housekeeping/${guest.unitaId}` : '/host/housekeeping',
          },
        })

        result = `Task housekeeping creato (ID: ${task.id}). Tipo: ${args.tipo}. Lo staff è stato notificato.`
        break
      }

      case 'report_maintenance_issue': {
        tipo = 'MANUTENZIONE_SEGNALATA'
        const segn = await prisma.segnalazioneManutenzione.create({
          data: {
            hostId,
            strutturaId: guest.strutturaId,
            unitaId: guest.unitaId,
            titolo: `[AI Concierge] ${args.titolo}`,
            descrizione: `Segnalato da: ${guest.guestNome} ${guest.guestCognome}${guest.unitaNome ? ` (${guest.unitaNome})` : ''}\n\n${args.descrizione}`,
            categoria: String(args.categoria),
            priorita: (args.priorita as PrioritaManutenzione) || 'NORMALE',
          },
        })

        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'manutenzione',
            titolo: `Guasto segnalato: ${args.titolo}`,
            messaggio: `Da ${guest.guestNome}${guest.unitaNome ? ` — ${guest.unitaNome}` : ''}`,
            linkUrl: '/host/manutenzione',
          },
        })

        result = `Segnalazione manutenzione creata (ID: ${segn.id}). Lo staff tecnico è stato avvisato.`
        break
      }

      case 'request_late_checkout': {
        tipo = 'LATE_CHECKOUT_RICHIESTO'
        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'prenotazione',
            titolo: `Late checkout: ${guest.guestNome} ${guest.guestCognome}`,
            messaggio: `Richiesta checkout alle ${args.oraRichiesta}${args.motivo ? ` — Motivo: ${args.motivo}` : ''}${guest.unitaNome ? ` — ${guest.unitaNome}` : ''}`,
            linkUrl: guest.prenotazioneId ? `/host/prenotazioni/${guest.prenotazioneId}` : '/host/oggi',
          },
        })

        result = `Richiesta late checkout (ore ${args.oraRichiesta}) inoltrata alla reception. L'ospite sarà informato sulla conferma.`
        break
      }

      case 'get_hotel_info': {
        tipo = 'INFO_FORNITA'
        result = `L'argomento richiesto è: ${args.argomento}. Rispondi basandoti sulle INFORMAZIONI HOTEL nel tuo system prompt. Se non hai l'informazione specifica, suggerisci di contattare la reception.`
        break
      }

      case 'propose_room_upgrade': {
        tipo = 'INFO_FORNITA'
        if (!guest.prenotazioneId) {
          result = 'Nessuna prenotazione collegata.'
          successo = false
          break
        }
        const { calcolaUpgradeDisponibili } = await import('@/lib/upsell')
        const upgrade = await calcolaUpgradeDisponibili(hostId, guest.prenotazioneId)
        const disponibili = upgrade.filter(u => u.disponibile)
        if (disponibili.length === 0) {
          result = 'Nessun upgrade disponibile al momento.'
          break
        }
        const lista = disponibili.map(u =>
          `${u.nome}: ${u.daCameraNome} → ${u.aCameraNome} (+€${u.supplementoNotte}/notte, totale +€${u.supplementoTotale})`
        ).join('\n')
        result = `Upgrade disponibili:\n${lista}\n\nChiedi all'ospite se è interessato a uno di questi upgrade. Se accetta, usa il nome della regola per confermare.`
        break
      }

      case 'assign_room': {
        tipo = 'INFO_FORNITA'
        if (!guest.prenotazioneId || !guest.strutturaId) {
          result = 'Nessuna prenotazione o struttura collegata. Impossibile assegnare camera.'
          successo = false
          break
        }

        const { assegnaAutomaticamente: autoAssign, assegnaCamera: doAssign } = await import('@/lib/assegnazione-camera')
        const migliore = await autoAssign({
          strutturaId: guest.strutturaId,
          dataArrivo: new Date(guest.dataArrivo!),
          dataPartenza: guest.dataPartenza ? new Date(guest.dataPartenza) : null,
          numOspiti: 1,
          pianoPreferito: args.pianoPreferito ? Number(args.pianoPreferito) : undefined,
        })

        if (!migliore) {
          result = 'Nessuna camera disponibile per il periodo richiesto.'
          successo = false
          break
        }

        await doAssign(guest.prenotazioneId, migliore.id, 'AI Concierge')

        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'prenotazione',
            titolo: `Camera assegnata via AI Concierge`,
            messaggio: `${guest.guestNome} ${guest.guestCognome} → ${migliore.nome} (${migliore.motivoScore})`,
            linkUrl: `/host/prenotazioni/${guest.prenotazioneId}`,
          },
        })

        result = `Camera assegnata: ${migliore.nome} (piano ${migliore.piano ?? 'N/D'}, capacità ${migliore.capacita}, stato: ${migliore.statoHK}). Score: ${migliore.score} — ${migliore.motivoScore}`
        break
      }

      case 'add_companion': {
        tipo = 'INFO_FORNITA'
        if (!guest.prenotazioneId) {
          result = 'Nessuna prenotazione collegata. Impossibile registrare accompagnatori.'
          successo = false
          break
        }

        const acc = await prisma.accompagnatore.create({
          data: {
            prenotazioneId: guest.prenotazioneId,
            nome: String(args.nome),
            cognome: String(args.cognome),
            sesso: args.sesso ? String(args.sesso) : null,
            dataNascita: args.dataNascita ? new Date(String(args.dataNascita)) : null,
            nazionalita: args.nazionalita ? String(args.nazionalita) : null,
            tipoDocumento: args.tipoDocumento ? String(args.tipoDocumento) : null,
            numeroDocumento: args.numeroDocumento ? String(args.numeroDocumento) : null,
            isMinore: args.isMinore === true,
          },
        })

        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'sistema',
            titolo: `Accompagnatore registrato via Concierge`,
            messaggio: `${args.nome} ${args.cognome} aggiunto alla prenotazione di ${guest.guestNome} ${guest.guestCognome}`,
            linkUrl: `/host/prenotazioni/${guest.prenotazioneId}`,
          },
        })

        result = `Accompagnatore registrato: ${args.nome} ${args.cognome} (ID: ${acc.id}). L'host è stato notificato.`
        break
      }

      case 'escalate_to_human': {
        tipo = 'ESCALATION'
        // Cambia stato conversazione
        await prisma.conversazioneWhatsApp.update({
          where: { id: conversazioneId },
          data: { stato: 'ESCALATA' },
        })

        await prisma.notifica.create({
          data: {
            hostId,
            tipo: 'sistema',
            titolo: `Concierge: escalation da ${guest.guestNome}`,
            messaggio: `Motivo: ${args.motivo}`,
            linkUrl: `/host/concierge/${conversazioneId}`,
          },
        })

        result = `Conversazione passata a un operatore umano. Motivo: ${args.motivo}`
        break
      }

      default:
        result = `Tool non riconosciuto: ${toolCall.name}`
        successo = false
    }
  } catch (err) {
    logger.error(`Tool execution error: ${toolCall.name}`, { error: String(err) })
    result = `Errore esecuzione: ${String(err)}`
    successo = false
  }

  // Log azione
  await prisma.azioneConcierge.create({
    data: {
      conversazioneId,
      tipo: tipo as TipoAzioneConcierge,
      descrizione: result,
      datiJson: toolCall.arguments as object,
      successo,
      errore: successo ? null : result,
    },
  })

  return result
}

// ─── Orchestratore principale ─────────────────────────────────────────────────

export interface ConciergeResult {
  response: string
  toolsUsed: string[]
  tokensUsed: number | null
  conversazioneId: string
}

/**
 * Processa un messaggio in arrivo da un ospite.
 * Identifica l'ospite, carica contesto, chiama AI, esegue tool, restituisce risposta.
 */
export async function processGuestMessage(params: {
  hostId: string
  telefono: string       // numero WhatsApp ospite (E.164)
  nomeWhatsApp: string   // nome profilo WhatsApp
  testo: string
  messageId?: string     // ID messaggio WhatsApp (per tracking)
}): Promise<ConciergeResult> {
  const { hostId, telefono, nomeWhatsApp, testo, messageId } = params

  // 1. Carica config host
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      nomeAzienda: true,
      conciergeProvider: true,
      conciergeApiKey: true,
      conciergeModel: true,
      conciergeSystemPrompt: true,
    },
  })
  if (!host) throw new Error(`Host ${hostId} non trovato`)

  // 2. Identifica ospite
  const guest = await findGuestContext(hostId, telefono)

  // 3. Trova o crea conversazione
  let conversazione = await prisma.conversazioneWhatsApp.findUnique({
    where: { hostId_telefonoOspite: { hostId, telefonoOspite: telefono } },
  })

  if (!conversazione) {
    conversazione = await prisma.conversazioneWhatsApp.create({
      data: {
        hostId,
        telefonoOspite: telefono,
        nomeOspite: nomeWhatsApp || `${guest.guestNome} ${guest.guestCognome}`.trim() || null,
        prenotazioneId: guest.prenotazioneId,
        lingua: guest.lingua,
      },
    })
  } else if (conversazione.stato === 'CHIUSA') {
    // Riapri conversazione chiusa
    await prisma.conversazioneWhatsApp.update({
      where: { id: conversazione.id },
      data: { stato: 'ATTIVA', prenotazioneId: guest.prenotazioneId },
    })
  }

  // Se escalata, non processare con AI
  if (conversazione.stato === 'ESCALATA') {
    // Salva messaggio ma non rispondere con AI
    await prisma.messaggioWhatsApp.create({
      data: {
        conversazioneId: conversazione.id,
        mittente: 'OSPITE',
        testo,
        whatsappMessageId: messageId,
      },
    })
    return {
      response: '',  // nessuna risposta AI — attende operatore umano
      toolsUsed: [],
      tokensUsed: null,
      conversazioneId: conversazione.id,
    }
  }

  // 4. Salva messaggio ospite
  await prisma.messaggioWhatsApp.create({
    data: {
      conversazioneId: conversazione.id,
      mittente: 'OSPITE',
      testo,
      whatsappMessageId: messageId,
    },
  })

  // 5. Carica ultimi messaggi per contesto
  const storiaDB = await prisma.messaggioWhatsApp.findMany({
    where: { conversazioneId: conversazione.id },
    orderBy: { createdAt: 'asc' },
    take: 20,  // ultimi 20 messaggi
  })

  // 6. Costruisci messaggi per l'AI
  const systemPrompt = buildSystemPrompt(host, guest)
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...storiaDB.map(m => ({
      role: (m.mittente === 'OSPITE' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.testo,
    })),
  ]

  // 7. Chiama AI provider
  const provider = createAIProvider({
    provider: (host.conciergeProvider || 'ollama') as 'ollama' | 'claude' | 'openai',
    apiKey: host.conciergeApiKey,
    model: host.conciergeModel,
  })

  let response = await provider.chat(messages, CONCIERGE_TOOLS)
  const toolsUsed: string[] = []
  let totalTokens = response.tokensUsed || 0

  // 8. Loop tool execution (max 3 iterazioni per sicurezza)
  let iterations = 0
  while (response.finishReason === 'tool_use' && response.toolCalls.length > 0 && iterations < 3) {
    iterations++

    for (const tc of response.toolCalls) {
      toolsUsed.push(tc.name)
      const toolResult = await executeTool(tc, hostId, guest, conversazione.id)

      // Aggiungi assistant message con tool call + tool result
      messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: [tc],
      })
      messages.push({
        role: 'tool',
        content: toolResult,
        tool_call_id: tc.id,
      })
    }

    // Richiama AI con risultati tool
    response = await provider.chat(messages, CONCIERGE_TOOLS)
    totalTokens += response.tokensUsed || 0
  }

  const finalText = response.content || 'Mi scuso, non sono riuscito a elaborare una risposta. La collego con la reception.'

  // 9. Salva risposta AI
  await prisma.messaggioWhatsApp.create({
    data: {
      conversazioneId: conversazione.id,
      mittente: 'AI_CONCIERGE',
      testo: finalText,
      toolsUsati: toolsUsed,
      tokensUsati: totalTokens || null,
    },
  })

  return {
    response: finalText,
    toolsUsed,
    tokensUsed: totalTokens || null,
    conversazioneId: conversazione.id,
  }
}
