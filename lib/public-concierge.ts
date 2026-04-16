/**
 * Public Concierge — assistente AI per il booking front-end (pre-prenotazione).
 *
 * A differenza del concierge WhatsApp (lib/concierge.ts), qui:
 *  - l'ospite NON è identificato (no prenotazione, no telefono, no PIN)
 *  - la sessione è stateless: il client tiene la history in memoria/localStorage
 *    e la manda ad ogni request
 *  - niente tools — risposte basate solo sul system prompt arricchito
 *  - niente scrittura DB (solo lettura per costruire il contesto)
 *  - usa SEMPRE Platform AI (Claude Haiku o il provider configurato dal superadmin)
 *
 * Scope: domande generali su struttura, camere, servizi, disponibilità generica,
 * orari. Per info personali (prenotazioni esistenti) l'ospite viene rimandato
 * a WhatsApp/contatto host.
 */

import { prisma } from '@/lib/db'
import { createAIProvider, type AIMessage } from '@/lib/ai-provider'
import { getPlatformSettings } from '@/lib/platform-settings'
import { logger } from '@/lib/logger'

export type PublicChatMessage = { role: 'user' | 'assistant'; content: string }

export type PublicChatResult = {
  response: string
  tokensUsed: number | null
}

/**
 * Carica info struttura + host + camere + servizi attivi per costruire
 * un contesto ricco da iniettare nel system prompt.
 */
async function loadStrutturaContext(strutturaId: string) {
  return prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      id: true,
      nome: true,
      tipo: true,
      descrizione: true,
      citta: true,
      indirizzo: true,
      prezzoBase: true,
      host: {
        select: {
          nomeAzienda: true,
          conciergeSystemPrompt: true,
          telefono: true,
          emailMittente: true,
          moduliAttivi: true,
        },
      },
      unita: {
        where: { attiva: true },
        select: {
          nome: true,
          capacita: true,
          lettiExtra: true,
          prezzoBase: true,
          descrizione: true,
        },
        orderBy: { prezzoBase: 'asc' },
        take: 30,
      },
    },
  })
}

function buildPublicSystemPrompt(
  struttura: NonNullable<Awaited<ReturnType<typeof loadStrutturaContext>>>,
  lingua: string,
): string {
  const hotelInfo = struttura.host.conciergeSystemPrompt || 'Nessuna nota specifica configurata dal gestore.'

  const camereBlock = struttura.unita.length > 0
    ? struttura.unita.map(u => {
        const extra = u.lettiExtra > 0 ? ` (+${u.lettiExtra} letti extra)` : ''
        const desc = u.descrizione ? ` — ${u.descrizione.slice(0, 120)}` : ''
        return `- ${u.nome}: fino a ${u.capacita} persone${extra}, da ${u.prezzoBase}€/notte${desc}`
      }).join('\n')
    : 'Nessuna camera pubblicata.'

  return `Sei l'assistente virtuale AI di ${struttura.host.nomeAzienda}${struttura.nome !== struttura.host.nomeAzienda ? ` — struttura "${struttura.nome}"` : ''}, disponibile sul sito di prenotazione.

INFORMAZIONI STRUTTURA:
Nome: ${struttura.nome}
Tipo: ${struttura.tipo}
${struttura.citta ? `Città: ${struttura.citta}` : ''}
${struttura.indirizzo ? `Indirizzo: ${struttura.indirizzo}` : ''}
${struttura.descrizione ? `Descrizione: ${struttura.descrizione.slice(0, 500)}` : ''}

CAMERE DISPONIBILI:
${camereBlock}

NOTE DEL GESTORE (knowledge base):
${hotelInfo}

CONTATTI:
${struttura.host.telefono ? `Telefono: ${struttura.host.telefono}` : ''}
${struttura.host.emailMittente ? `Email: ${struttura.host.emailMittente}` : ''}

REGOLE OBBLIGATORIE:
1. Rispondi nella lingua dell'ospite (attualmente: ${lingua}).
2. Sei un assistente VIRTUALE (AI). Se te lo chiedono, rispondi onestamente che sei un'intelligenza artificiale al servizio di ${struttura.host.nomeAzienda}. Obbligo AI Act EU Art. 50.
3. Tono cordiale, professionale, risposte brevi (2-4 frasi max) stile chat web.
4. Non inventare mai info non presenti qui sopra. Se non sai rispondere, suggerisci di contattare la struttura ai recapiti indicati o dire "Ti invito a completare la prenotazione per ricevere info dettagliate".
5. NON puoi creare prenotazioni né chiedere dati personali (email, telefono, carta). Se l'ospite vuole prenotare, invitalo a usare il modulo di prenotazione sulla stessa pagina.
6. Se chiede info su una prenotazione esistente (es. "la mia prenotazione del 12"), rispondi che le informazioni personali sono disponibili solo su WhatsApp o contattando direttamente la struttura, non in chat pubblica.
7. Niente markdown, niente asterischi, usa emoji solo se davvero utili (max 1 per risposta).`
}

export async function processPublicMessage(params: {
  strutturaId: string
  history: PublicChatMessage[]
  newMessage: string
  lingua?: string
}): Promise<PublicChatResult> {
  const { strutturaId, history, newMessage } = params
  const lingua = params.lingua || 'it'

  const struttura = await loadStrutturaContext(strutturaId)
  if (!struttura) {
    return {
      response: 'Struttura non trovata o non più attiva.',
      tokensUsed: null,
    }
  }

  const platformSettings = await getPlatformSettings()
  if (!platformSettings.aiApiKey && platformSettings.aiProvider !== 'ollama') {
    logger.warn('[public-concierge] Platform AI not configured')
    return {
      response: 'Il servizio di assistenza AI è temporaneamente non disponibile. Puoi contattare direttamente la struttura per info.',
      tokensUsed: null,
    }
  }

  const provider = createAIProvider({
    provider: (platformSettings.aiProvider || 'claude') as 'ollama' | 'claude' | 'openai',
    apiKey: platformSettings.aiApiKey,
    model: platformSettings.aiModel,
    baseUrl: platformSettings.aiBaseUrl,
  })

  const systemPrompt = buildPublicSystemPrompt(struttura, lingua)

  // Trim history a max 20 messaggi per costi
  const trimmedHistory = history.slice(-20)

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: newMessage },
  ]

  try {
    const response = await provider.chat(messages, [])
    const text = response.content || 'Mi scuso, non sono riuscito a elaborare una risposta. Contatta la struttura per info.'
    return {
      response: text,
      tokensUsed: response.tokensUsed || null,
    }
  } catch (err) {
    logger.error('[public-concierge] AI call failed', { err: String(err) })
    return {
      response: 'Servizio AI temporaneamente non disponibile. Contatta la struttura direttamente.',
      tokensUsed: null,
    }
  }
}
