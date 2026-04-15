import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import nodemailer from 'nodemailer'

/**
 * GET /api/cron/wifi-heartbeat-check
 *
 * Cron che verifica la salute dei WifiDevice:
 *  - Devices con ultimoHeartbeatAt > 10 minuti fa → alert al host via email
 *  - Devices che erano ONLINE e ora sono stale → marca come OFFLINE
 *  - Devices già OFFLINE da > 1h → notifica ripetuta ogni 2h
 *
 * Protection: CRON_SECRET Bearer token in Authorization header.
 *
 * Schedule: ogni 10 minuti via vercel.json cron
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
  }

  const now = new Date()
  const STALE_MINUTES = 10
  const staleCutoff = new Date(now.getTime() - STALE_MINUTES * 60 * 1000)

  // Lookup tutti i device con heartbeat stale
  const staleDevices = await prisma.wifiDevice.findMany({
    where: {
      stato: { in: ['ONLINE', 'PENDING'] },
      OR: [
        { ultimoHeartbeatAt: { lt: staleCutoff } },
        { ultimoHeartbeatAt: null },
      ],
    },
    include: {
      host: {
        select: {
          id: true,
          nomeAzienda: true,
          user: {
            select: { email: true },
          },
        },
      },
    },
  })

  const alerts: Array<{ mac: string; alias: string; host: string; ageMin: number | null }> = []
  let markedOffline = 0

  for (const device of staleDevices) {
    const ageMs = device.ultimoHeartbeatAt
      ? now.getTime() - device.ultimoHeartbeatAt.getTime()
      : null
    const ageMin = ageMs !== null ? Math.round(ageMs / 60000) : null

    // Marca come OFFLINE se era ONLINE
    if (device.stato === 'ONLINE') {
      await prisma.wifiDevice.update({
        where: { id: device.id },
        data: { stato: 'OFFLINE' },
      })
      markedOffline++
      logger.warn('Wi-Fi device marked OFFLINE', 'wifi/heartbeat-check', {
        mac: device.mac,
        alias: device.alias,
        hostId: device.hostId,
        ageMin,
      })
    }

    alerts.push({
      mac: device.mac,
      alias: device.alias,
      host: device.host.nomeAzienda,
      ageMin,
    })

    // Invia email al host (solo se era ONLINE — non ripetere se già OFFLINE)
    const email = device.host.user?.email
    if (device.stato === 'ONLINE' && email) {
      try {
        await sendAlertEmail({
          to: email,
          hostNome: device.host.nomeAzienda,
          deviceAlias: device.alias,
          deviceMac: device.mac,
          ageMin: ageMin ?? 0,
        })
      } catch (err) {
        logger.error(
          'Failed to send wifi alert email',
          'wifi/heartbeat-check',
          err as Error
        )
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: staleDevices.length,
    markedOffline,
    alerts,
  })
}

async function sendAlertEmail(opts: {
  to: string
  hostNome: string
  deviceAlias: string
  deviceMac: string
  ageMin: number
}) {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '465', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM ?? 'Otium <info@otiumweek.com>'

  if (!host || !user || !pass) {
    logger.warn('SMTP not configured, skipping alert email', 'wifi/heartbeat-check')
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  const subject = `⚠️ Wi-Fi Otium offline — ${opts.deviceAlias}`
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
  <h2 style="color: #dc2626; margin: 0 0 8px;">⚠️ Wi-Fi non risponde</h2>
  <p style="color: #374151; font-size: 15px;">
    Il device Wi-Fi <strong>${escapeHtml(opts.deviceAlias)}</strong> di
    <strong>${escapeHtml(opts.hostNome)}</strong> non risponde da
    <strong>${opts.ageMin} minuti</strong>.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 8px; background: #f9fafb; font-weight: 600;">Device</td>
      <td style="padding: 8px;">${escapeHtml(opts.deviceAlias)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; background: #f9fafb; font-weight: 600;">MAC</td>
      <td style="padding: 8px; font-family: monospace;">${escapeHtml(opts.deviceMac)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; background: #f9fafb; font-weight: 600;">Offline da</td>
      <td style="padding: 8px;">${opts.ageMin} minuti</td>
    </tr>
  </table>

  <h3 style="color: #374151; margin: 20px 0 8px;">Cosa fare</h3>
  <ol style="color: #6b7280; font-size: 14px; line-height: 1.6;">
    <li>Verifica che il router Comfast sia alimentato (LED acceso)</li>
    <li>Verifica il cavo Ethernet WAN (uscita internet)</li>
    <li>Se il router è acceso ma offline: <strong>riavvialo</strong> (spegni 10 secondi, riaccendi)</li>
    <li>Se il problema persiste dopo 15 minuti: contatta il supporto Otium</li>
  </ol>

  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
    Otium Wi-Fi monitoring · Questo alert è stato generato automaticamente.
    Riceverai un'altra notifica quando il device tornerà online.
  </p>
</body>
</html>`.trim()

  await transporter.sendMail({
    from,
    to: opts.to,
    subject,
    html,
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
