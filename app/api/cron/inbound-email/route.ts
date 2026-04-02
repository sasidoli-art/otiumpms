import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { pollInboundEmails } from '@/lib/inbound-email'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/inbound-email
 *
 * Polling IMAP: legge le email non lette dalla casella configurata,
 * cerca risposte con tag [OTM-chatId] nel subject e le inserisce
 * come messaggi GUEST nella chat corretta.
 *
 * Supporta due modalità:
 * 1. IMAP globale piattaforma (env vars IMAP_HOST, IMAP_USER, IMAP_PASS)
 * 2. IMAP per-host (campi smtpHost, smtpUser, smtpPass del modello Host)
 *
 * Chiamare ogni 1-2 minuti da Vercel Cron o cron esterno.
 * Protezione: header Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let totalProcessed = 0

  try {
    // 1. Polling casella globale piattaforma
    if (process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASS) {
      const count = await pollInboundEmails({
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT) || 993,
        user: process.env.IMAP_USER,
        pass: process.env.IMAP_PASS,
        tls: true,
      })
      totalProcessed += count
      if (count > 0) {
        logger.info(`Inbound globale: ${count} email processate`, 'cron/inbound-email')
      }
    }

    // 2. Polling caselle per-host (solo host con SMTP configurato)
    const hosts = await prisma.host.findMany({
      where: {
        smtpHost: { not: null },
        smtpUser: { not: null },
        smtpPass: { not: null },
      },
      select: { id: true, smtpHost: true, smtpUser: true, smtpPass: true, nomeAzienda: true },
    })

    for (const host of hosts) {
      try {
        // Deriva host IMAP da host SMTP (smtps.aruba.it → imaps.aruba.it)
        const imapHost = host.smtpHost!.replace(/^smtps?\./, 'imaps.')

        const count = await pollInboundEmails({
          host: imapHost,
          port: 993,
          user: host.smtpUser!,
          pass: host.smtpPass!,
          tls: true,
        })
        totalProcessed += count
        if (count > 0) {
          logger.info(`Inbound ${host.nomeAzienda}: ${count} email processate`, 'cron/inbound-email', { hostId: host.id })
        }
      } catch (err) {
        logger.error(`Errore IMAP host ${host.nomeAzienda}`, 'cron/inbound-email', {
          hostId: host.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({
      ok: true,
      processed: totalProcessed,
      hostsChecked: hosts.length + (process.env.IMAP_HOST ? 1 : 0),
    })
  } catch (err) {
    logger.error('Errore cron inbound-email', 'cron/inbound-email', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
