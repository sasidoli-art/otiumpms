import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiDevice } from '@/lib/wifi/auth'
import { logger } from '@/lib/logger'

type RouterEvent =
  | {
      type: 'login_codice'
      at: string
      ip?: string
      mac?: string
      data: { eventId?: string; codice: string; codiceId?: string; guestNome?: string; expiresAt?: string }
    }
  | {
      type: 'login_prenotazione'
      at: string
      ip?: string
      mac?: string
      data: { eventId?: string; prenotazioneId: string; guestNome: string; guestCognome: string; expiresAt?: string }
    }
  | {
      type: 'login_failed'
      at: string
      ip?: string
      mac?: string
      data: { mode: string; reason: string; value?: string }
    }
  | {
      type: 'session_expired'
      at: string
      ip?: string
      mac?: string
      data: { sessionId?: string }
    }

/**
 * POST /api/wifi/router/event
 * Body: { events: RouterEvent[] }
 *
 * Il router pusha periodicamente la coda di eventi locale (login + errori).
 * Backend salva eventi rilevanti (login_codice/prenotazione) come WifiSession.
 *
 * Auth: Bearer token agent + X-Device-Mac header.
 */
export async function POST(req: NextRequest) {
  const mac = req.headers.get('x-device-mac') || ''
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')
  if (macNorm.length !== 12) {
    return NextResponse.json({ error: 'X-Device-Mac header missing/invalid' }, { status: 400 })
  }

  const device = await requireWifiDevice(req, macNorm)
  if (device instanceof NextResponse) return device

  const body = (await req.json().catch(() => ({}))) as { events?: RouterEvent[] }
  const events = Array.isArray(body.events) ? body.events : []

  let processed = 0
  let sessionsCreated = 0
  const errors: string[] = []

  for (const ev of events) {
    try {
      const at = new Date(ev.at)
      const clientMac = (ev.mac || '').toUpperCase()
      const clientIp = ev.ip || null

      // Helper: dedup window ±2 minuti su (host, mac, accessCodeId|prenotazioneId, tipo)
      // Senza modificare lo schema: deduplichiamo via combinazione di campi esistenti
      const dedupWindowMs = 2 * 60 * 1000

      if (ev.type === 'login_codice') {
        const code = ev.data.codiceId
          ? await prisma.wifiAccessCode.findUnique({ where: { id: ev.data.codiceId } })
          : await prisma.wifiAccessCode.findFirst({ where: { hostId: device.hostId, codice: ev.data.codice } })

        if (!code) {
          errors.push(`code ${ev.data.codice} not found`)
          continue
        }

        // Dedup: stesso codice + mac + startAt entro 2 min
        if (clientMac) {
          const existing = await prisma.wifiSession.findFirst({
            where: {
              hostId: device.hostId,
              tipo: 'CODICE',
              accessCodeId: code.id,
              macClient: clientMac,
              startAt: { gte: new Date(at.getTime() - dedupWindowMs), lte: new Date(at.getTime() + dedupWindowMs) },
            },
            select: { id: true },
          })
          if (existing) { processed++; continue }
        }

        const expiresAt = ev.data.expiresAt
          ? new Date(ev.data.expiresAt)
          : new Date(at.getTime() + (code.durataMinuti || 1440) * 60 * 1000)

        await prisma.wifiSession.create({
          data: {
            hostId: device.hostId,
            tipo: 'CODICE',
            accessCodeId: code.id,
            guestNome: ev.data.guestNome || 'Ospite',
            macClient: clientMac || null,
            ipClient: clientIp,
            startAt: at,
            expiresAt,
          },
        })

        await prisma.wifiAccessCode.update({
          where: { id: code.id },
          data: { usiEffettuati: { increment: 1 } },
        })

        sessionsCreated++
        processed++
        continue
      }

      if (ev.type === 'login_prenotazione') {
        const pren = await prisma.prenotazione.findUnique({
          where: { id: ev.data.prenotazioneId },
        })
        if (!pren) {
          errors.push(`preno ${ev.data.prenotazioneId} not found`)
          continue
        }

        // Dedup: stessa prenotazione + mac + startAt entro 2 min
        if (clientMac) {
          const existing = await prisma.wifiSession.findFirst({
            where: {
              hostId: device.hostId,
              tipo: 'PRENOTAZIONE',
              prenotazioneId: pren.id,
              macClient: clientMac,
              startAt: { gte: new Date(at.getTime() - dedupWindowMs), lte: new Date(at.getTime() + dedupWindowMs) },
            },
            select: { id: true },
          })
          if (existing) { processed++; continue }
        }

        const expiresAt = ev.data.expiresAt
          ? new Date(ev.data.expiresAt)
          : pren.dataPartenza
            ? new Date(pren.dataPartenza.getTime())
            : new Date(at.getTime() + 24 * 60 * 60 * 1000)

        await prisma.wifiSession.create({
          data: {
            hostId: device.hostId,
            tipo: 'PRENOTAZIONE',
            prenotazioneId: pren.id,
            guestNome: ev.data.guestNome,
            guestCognome: ev.data.guestCognome,
            macClient: clientMac || null,
            ipClient: clientIp,
            startAt: at,
            expiresAt,
          },
        })

        sessionsCreated++
        processed++
        continue
      }

      if (ev.type === 'login_failed') {
        // Solo log audit, niente sessione
        logger.warn('Router login fallito', 'wifi/router/event', { ...ev.data, mac: clientMac, ip: clientIp })
        processed++
        continue
      }

      if (ev.type === 'session_expired') {
        if (ev.data.sessionId) {
          await prisma.wifiSession.updateMany({
            where: { id: ev.data.sessionId },
            data: { revokedAt: at },
          })
        }
        processed++
        continue
      }
    } catch (err) {
      errors.push(`event error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true,
    received: events.length,
    processed,
    sessionsCreated,
    errors,
  })
}
