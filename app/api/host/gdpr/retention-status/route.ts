import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { RETENTION_POLICIES } from '@/lib/gdpr-retention'

/**
 * GET /api/host/gdpr/retention-status
 *
 * Ritorna per ogni policy:
 *  - metadati (label, base giuridica, riferimento normativo, giorni)
 *  - quanti record scadranno nei prossimi 30 giorni per questo host
 *  - data ultima esecuzione del cron retention (globale)
 */
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const hostId = auth.user.hostId
  const now = new Date()
  const in30 = new Date(now)
  in30.setDate(in30.getDate() + 30)

  // data soglia: i record la cui data di riferimento è PRIMA di (now - retention + 30)
  // stanno per scadere nei prossimi 30 giorni.
  async function countScadenzaProssimi(policyId: string, giorni: number): Promise<number> {
    // finestra scadenza: (now - giorni) < data <= (now - giorni + 30)
    // = equivalente a: data > (now - giorni) AND data <= (now - giorni + 30)
    const limiteInferiore = new Date(now)
    limiteInferiore.setDate(limiteInferiore.getDate() - giorni)
    const limiteSuperiore = new Date(limiteInferiore)
    limiteSuperiore.setDate(limiteSuperiore.getDate() + 30)

    switch (policyId) {
      case 'ospite_prenotazione':
      case 'foto_documenti':
      case 'alloggiati':
        return prisma.prenotazione.count({
          where: { hostId, dataPartenza: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      case 'waiver_spa':
        return prisma.waiverSpa.count({
          where: {
            appuntamento: { hostId },
            dataRegistrazione: { gt: limiteInferiore, lte: limiteSuperiore },
          },
        })
      case 'fatture':
        return prisma.fattura.count({
          where: { hostId, dataEmissione: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      case 'accompagnatori':
        return prisma.accompagnatore.count({
          where: {
            prenotazione: {
              hostId, dataPartenza: { gt: limiteInferiore, lte: limiteSuperiore },
            },
          },
        })
      case 'crm_ospite':
        return prisma.ospiteCRM.count({
          where: { hostId, dataUltimoSoggiorno: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      case 'conversazioni_wa':
        return prisma.conversazioneWhatsApp.count({
          where: { hostId, updatedAt: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      case 'audit_log':
        return prisma.auditLog.count({
          where: { hostId, createdAt: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      case 'wifi_sessions':
        return prisma.wifiSession.count({
          where: { hostId, startAt: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      case 'wifi_access_logs':
        return prisma.wifiAccessLog.count({
          where: { hostId, timestamp: { gt: limiteInferiore, lte: limiteSuperiore } },
        })
      default:
        return 0
    }
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      ultimaEsecuzioneRetentionAt: true,
      ultimaEsecuzioneRetentionCompletata: true,
      ultimaEsecuzioneRetentionReport: true,
    },
  })

  const policies = await Promise.all(
    RETENTION_POLICIES.map(async (p) => ({
      id: p.id,
      entita: p.entita,
      descrizione: p.descrizione,
      baseGiuridica: p.baseGiuridica,
      riferimentoNormativo: p.riferimentoNormativo,
      giorniRetention: p.giorniRetention,
      azione: p.azione,
      recordInScadenza30gg: await countScadenzaProssimi(p.id, p.giorniRetention),
    })),
  )

  return NextResponse.json({
    policies,
    cron: {
      ultimaEsecuzioneAt: settings?.ultimaEsecuzioneRetentionAt ?? null,
      ultimaEsecuzioneCompletata: settings?.ultimaEsecuzioneRetentionCompletata ?? null,
      ultimoReport: settings?.ultimaEsecuzioneRetentionReport ?? null,
    },
  })
}
