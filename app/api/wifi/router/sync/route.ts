import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiDevice } from '@/lib/wifi/auth'

/**
 * GET /api/wifi/router/sync
 *
 * Endpoint che il router CF-AC101 polla ogni 5 min per scaricare:
 * - Lista codici di accesso attivi per il suo host
 * - Lista prenotazioni attive (dataArrivo <= oggi+1 < dataPartenza)
 *
 * Il router salva il payload in /etc/otium/codes.json e /etc/otium/prenotazioni.json
 * e li usa per validare i login captive in locale (no round-trip al backend).
 *
 * Auth: Bearer token del WifiDevice (header Authorization).
 * Identificazione device: header X-Device-Mac (l'agent lo passa).
 */
export async function GET(req: NextRequest) {
  const mac = req.headers.get('x-device-mac') || ''
  const macNorm = mac.toUpperCase().replace(/[^0-9A-F]/g, '')

  if (macNorm.length !== 12) {
    return NextResponse.json({ error: 'X-Device-Mac header missing/invalid' }, { status: 400 })
  }

  const device = await requireWifiDevice(req, macNorm)
  if (device instanceof NextResponse) return device

  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1)
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0)

  // ─── Codici attivi ────────────────────────────────────────────────────────
  const codes = await prisma.wifiAccessCode.findMany({
    where: {
      hostId: device.hostId,
      revocatoAt: null,
      validoFino: { gte: now },
    },
    select: {
      id: true,
      codice: true,
      durataMinuti: true,
      usiMax: true,
      usiEffettuati: true,
      validoFino: true,
      note: true,
    },
    take: 500,
  })

  // ─── Prenotazioni attive (CONFERMATA, dataArrivo <= domani, dataPartenza > oggi) ─
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: device.hostId,
      stato: 'CONFERMATA',
      dataArrivo: { lte: tomorrow },
      OR: [
        { dataPartenza: null },
        { dataPartenza: { gt: today0 } },
      ],
    },
    select: {
      id: true,
      pin: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      dataArrivo: true,
      dataPartenza: true,
      unita: { select: { nome: true } },
    },
    take: 1000,
  })

  const prenotazioniFlat = prenotazioni.map(p => ({
    id: p.id,
    pin: p.pin,
    guestNome: p.guestNome,
    guestCognome: p.guestCognome,
    guestEmail: p.guestEmail,
    dataArrivo: p.dataArrivo.toISOString().slice(0, 10),
    dataPartenza: p.dataPartenza ? p.dataPartenza.toISOString().slice(0, 10) : null,
    numeroCamera: p.unita?.nome ?? null,
  }))

  // Aggiorna timestamp heartbeat (la sync conta come "vivo")
  await prisma.wifiDevice.update({
    where: { id: device.id },
    data: { ultimoHeartbeatAt: new Date() },
  }).catch(() => {})

  return NextResponse.json({
    syncedAt: now.toISOString(),
    hostId: device.hostId,
    codes: codes.map(c => ({
      id: c.id,
      codice: c.codice,
      durataMinuti: c.durataMinuti,
      usiMax: c.usiMax,
      usiEffettuati: c.usiEffettuati,
      validoFino: c.validoFino ? c.validoFino.toISOString() : null,
      note: c.note,
    })),
    prenotazioni: prenotazioniFlat,
  })
}
