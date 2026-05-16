import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireWifiDevice } from '@/lib/wifi/auth'
import { renderSplashHtml } from '@/lib/wifi/splash-renderer'
import type { SplashConfig } from '@/lib/wifi/splash-config'

/**
 * computeUtcAt('2026-05-16', '14:00') → '2026-05-16T12:00:00.000Z' (in CEST estate)
 *
 * Combina data ISO YYYY-MM-DD + ora locale HH:MM in TZ Europe/Rome → ISO UTC.
 * Determina offset corrente Europe/Rome (+01:00 inverno o +02:00 estate) usando Intl.
 */
function computeUtcAt(dateIso: string, timeHHMM: string): string {
  const [hh, mm] = timeHHMM.split(':').map(Number)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
    return new Date(dateIso).toISOString()
  }
  // Costruisco la data come UTC con i numeri locali, poi tolgo l'offset
  const naive = new Date(`${dateIso}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00.000Z`)
  // Calcolo l'offset per quella data Europe/Rome
  const tzDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    timeZoneName: 'longOffset',
    hour12: false,
  }).formatToParts(naive)
  const offsetPart = tzDate.find(p => p.type === 'timeZoneName')?.value ?? 'GMT+01:00'
  // offsetPart è del tipo "GMT+02:00" o "GMT+01:00"
  const m = offsetPart.match(/GMT([+-])(\d{1,2}):?(\d{2})?/)
  if (!m) return naive.toISOString()
  const sign = m[1] === '+' ? 1 : -1
  const offsetH = Number(m[2])
  const offsetM = Number(m[3] ?? 0)
  const offsetMs = sign * (offsetH * 60 + offsetM) * 60_000
  // naive è "14:00 UTC" per "14:00 CEST" devo TOGLIERE 2 ore → naive - 2h = "12:00 UTC"
  return new Date(naive.getTime() - offsetMs).toISOString()
}

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

  // Carico host per nomeAzienda + splashConfig + orari check-in/out
  const host = await prisma.host.findUnique({
    where: { id: device.hostId },
    select: {
      nomeAzienda: true,
      splashConfig: true,
      wifiCheckInTime: true,
      wifiCheckOutTime: true,
    },
  })

  const checkInTime = host?.wifiCheckInTime ?? '14:00'
  const checkOutTime = host?.wifiCheckOutTime ?? '11:00'

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

  const prenotazioniFlat = prenotazioni.map(p => {
    const dataArrivoStr = p.dataArrivo.toISOString().slice(0, 10)
    const dataPartenzaStr = p.dataPartenza ? p.dataPartenza.toISOString().slice(0, 10) : null

    // validFrom = dataArrivo @ checkInTime (Italy local) → UTC ISO
    // validUntil = dataPartenza @ checkOutTime (Italy local) → UTC ISO
    // Italy: CET (winter UTC+1) o CEST (summer UTC+2). Convertiamo via Intl.
    const validFrom = computeUtcAt(dataArrivoStr, checkInTime)
    const validUntil = dataPartenzaStr ? computeUtcAt(dataPartenzaStr, checkOutTime) : null

    return {
      id: p.id,
      pin: p.pin,
      guestNome: p.guestNome,
      guestCognome: p.guestCognome,
      guestEmail: p.guestEmail,
      dataArrivo: dataArrivoStr,
      dataPartenza: dataPartenzaStr,
      numeroCamera: p.unita?.nome ?? null,
      validFrom,
      validUntil,
    }
  })

  // Aggiorna timestamp heartbeat (la sync conta come "vivo")
  await prisma.wifiDevice.update({
    where: { id: device.id },
    data: { ultimoHeartbeatAt: new Date() },
  }).catch(() => {})

  // Renderizza HTML splash dal config (cached per request — il router lo scrive su disco)
  const splashHtml = host
    ? renderSplashHtml(host.nomeAzienda, host.splashConfig as SplashConfig | null)
    : null

  return NextResponse.json({
    syncedAt: now.toISOString(),
    hostId: device.hostId,
    checkInTime,
    checkOutTime,
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
    splashHtml,
  })
}
