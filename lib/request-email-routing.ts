/**
 * Email routing per richieste ospiti via AI Concierge.
 *
 * Quando il concierge esegue un tool (HK, manutenzione, room service),
 * invia una email al reparto corrispondente configurato dall'host.
 */

import { prisma } from '@/lib/db'
import { sendEmailGeneric } from '@/lib/email'
import { logger } from '@/lib/logger'

type RequestCategory = 'housekeeping' | 'manutenzione' | 'ristorazione' | 'reception'

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  housekeeping: 'Housekeeping',
  manutenzione: 'Manutenzione',
  ristorazione: 'Ristorazione',
  reception: 'Reception',
}

const CATEGORY_EMOJI: Record<RequestCategory, string> = {
  housekeeping: '🛏️',
  manutenzione: '🔧',
  ristorazione: '🍽️',
  reception: '📞',
}

/**
 * Invia email al reparto appropriato per una richiesta ospite.
 * Best-effort: se l'email non è configurata o l'invio fallisce, logga e non blocca.
 */
export async function routeRequestEmail(params: {
  hostId: string
  category: RequestCategory
  guestNome: string
  cameraNome?: string | null
  richiesta: string
  dettagli?: string | null
}): Promise<void> {
  const { hostId, category, guestNome, cameraNome, richiesta, dettagli } = params

  try {
    const host = await prisma.host.findUnique({
      where: { id: hostId },
      select: {
        nomeAzienda: true,
        emailHousekeeping: true,
        emailManutenzione: true,
        emailRistorazione: true,
        emailReception: true,
      },
    })
    if (!host) return

    const emailMap: Record<RequestCategory, string | null> = {
      housekeeping: host.emailHousekeeping,
      manutenzione: host.emailManutenzione,
      ristorazione: host.emailRistorazione,
      reception: host.emailReception,
    }

    const targetEmail = emailMap[category] || host.emailReception
    if (!targetEmail) {
      logger.info(`[request-routing] No email configured for ${category} on host ${hostId}`)
      return
    }

    const emoji = CATEGORY_EMOJI[category]
    const label = CATEGORY_LABELS[category]
    const cameraInfo = cameraNome ? ` — Camera: ${cameraNome}` : ''
    const subject = `${emoji} ${label}: richiesta da ${guestNome}${cameraInfo}`

    await sendEmailGeneric({
      to: targetEmail,
      subject,
      text: `${emoji} ${label}\n\nOspite: ${guestNome}${cameraNome ? `\nCamera: ${cameraNome}` : ''}\nRichiesta: ${richiesta}${dettagli ? `\nDettagli: ${dettagli}` : ''}\nOrario: ${new Date().toLocaleString('it-IT')}\n\n—\n${host.nomeAzienda} · AI Concierge`,
      hostId,
    })

    logger.info(`[request-routing] Email sent to ${targetEmail} for ${category}`, { hostId, guestNome })
  } catch (err) {
    logger.error(`[request-routing] Failed to send email for ${category}`, { err: String(err), hostId })
  }
}
