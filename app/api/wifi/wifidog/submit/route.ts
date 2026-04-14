import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isModuloAttivo } from '@/lib/moduli'
import { logger } from '@/lib/logger'

/**
 * POST /api/wifi/wifidog/submit
 *
 * Handler form-encoded per il login captive portal. Viene chiamato dal form
 * HTML servito da /api/wifi/wifidog/login/. Riceve i dati di login come
 * application/x-www-form-urlencoded (compatibile con mini-browser CNA iOS che
 * non eseguono JavaScript in modo affidabile).
 *
 * Esegue la stessa logica di /api/wifi/auth ma risponde con HTML contenente un
 * meta-refresh al router wifidog, che completa il flow.
 *
 * Campi form:
 *   mode              'codice' | 'prenotazione'
 *   hostId            ID host
 *   gw_address        IP router (da wifidog params preservati)
 *   gw_port           Porta router (da wifidog params preservati)
 *   mac               MAC client
 *   url               URL originale (non usato qui, ma preservato)
 *   codice?           Se mode=codice
 *   guestNome_codice? Nome (opzionale in codice)
 *   guestNome?        Nome (per prenotazione)
 *   guestCognome?     Cognome (per prenotazione)
 *   numeroCamera?     Numero camera (per prenotazione)
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit(`wifi-submit:${ip}`, { windowMs: 60_000, max: 10 })
  if (!limit.allowed) {
    return renderError('Troppi tentativi. Riprova tra qualche minuto.')
  }

  const form = await req.formData().catch(() => null)
  if (!form) return renderError('Body non valido')

  const mode = String(form.get('mode') ?? '')
  const hostId = String(form.get('hostId') ?? '')
  const gwAddress = String(form.get('gw_address') ?? '')
  const gwPort = String(form.get('gw_port') ?? '2060')
  const mac = String(form.get('mac') ?? '')

  if (!hostId) return renderError('Host non specificato')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  if (!host) return renderError('Struttura non trovata')
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return renderError('Wi-Fi non disponibile per questa struttura')
  }

  const userAgent = req.headers.get('user-agent') ?? null
  const macClient = mac || null

  // ─── Modalità CODICE ───────────────────────────────────────────────────────
  if (mode === 'codice') {
    const codice = String(form.get('codice') ?? '').trim().toUpperCase()
    const guestNome = String(form.get('guestNome_codice') ?? '').trim() || 'Walk-in'

    if (!codice || codice.length < 4) {
      return renderError('Codice non valido', { hostId, mode })
    }

    const code = await prisma.wifiAccessCode.findUnique({ where: { codice } })

    if (!code || code.hostId !== host.id) {
      logger.warn('Wi-Fi submit: codice non trovato', 'wifi/wifidog/submit', { hostId, codice: codice.slice(0, 4), ip })
      return renderError('Codice non valido', { hostId, mode })
    }
    if (code.revocatoAt) return renderError('Codice revocato', { hostId, mode })
    if (code.validoFino < new Date()) return renderError('Codice scaduto', { hostId, mode })
    if (code.usiMax > 0 && code.usiEffettuati >= code.usiMax) {
      return renderError('Codice esaurito', { hostId, mode })
    }

    const expiresAt = new Date(Date.now() + code.durataMinuti * 60 * 1000)

    const session = await prisma.$transaction(async (tx) => {
      await tx.wifiAccessCode.update({
        where: { id: code.id },
        data: { usiEffettuati: { increment: 1 } },
      })
      return tx.wifiSession.create({
        data: {
          hostId: host.id,
          tipo: 'CODICE',
          accessCodeId: code.id,
          guestNome,
          macClient,
          ipClient: ip,
          userAgent,
          expiresAt,
        },
      })
    })

    return renderRedirect(gwAddress, gwPort, session.id)
  }

  // ─── Modalità PRENOTAZIONE ─────────────────────────────────────────────────
  if (mode === 'prenotazione') {
    const guestNome = String(form.get('guestNome') ?? '').trim()
    const guestCognome = String(form.get('guestCognome') ?? '').trim()
    const numeroCamera = String(form.get('numeroCamera') ?? '').trim()

    if (!guestNome || !numeroCamera) {
      return renderError('Nome e numero camera obbligatori', { hostId, mode })
    }

    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const domani = new Date(oggi)
    domani.setDate(domani.getDate() + 1)

    const prenotazione = await prisma.prenotazione.findFirst({
      where: {
        hostId: host.id,
        stato: 'CONFERMATA',
        dataArrivo: { lte: domani },
        OR: [
          { dataPartenza: null },
          { dataPartenza: { gt: oggi } },
        ],
        guestNome: { equals: guestNome, mode: 'insensitive' },
        ...(guestCognome
          ? { guestCognome: { equals: guestCognome, mode: 'insensitive' } }
          : {}),
        unita: { nome: { equals: numeroCamera, mode: 'insensitive' } },
      },
    })

    if (!prenotazione) {
      logger.warn('Wi-Fi submit: prenotazione non trovata', 'wifi/wifidog/submit', {
        hostId, guestNome, numeroCamera, ip,
      })
      return renderError('Nessuna prenotazione trovata con questi dati', { hostId, mode })
    }

    const expiresAt = prenotazione.dataPartenza
      ? new Date(prenotazione.dataPartenza.getTime())
      : new Date(Date.now() + 24 * 60 * 60 * 1000)

    const session = await prisma.wifiSession.create({
      data: {
        hostId: host.id,
        tipo: 'PRENOTAZIONE',
        prenotazioneId: prenotazione.id,
        guestNome,
        guestCognome: guestCognome || null,
        numeroCamera,
        macClient,
        ipClient: ip,
        userAgent,
        expiresAt,
      },
    })

    return renderRedirect(gwAddress, gwPort, session.id)
  }

  return renderError('Modalità non valida')
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

function renderRedirect(gwAddress: string, gwPort: string, token: string) {
  const routerUrl = `http://${gwAddress}:${gwPort}/wifidog/auth?token=${encodeURIComponent(token)}`
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${escapeHtml(routerUrl)}">
<title>Connessione in corso...</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4f46e5,#7c3aed,#ec4899);color:#fff;text-align:center;padding:20px}
.c{max-width:320px}
h1{font-size:22px;margin:20px 0 10px}
p{font-size:14px;opacity:.85;line-height:1.5;margin-bottom:20px}
.s{width:40px;height:40px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;margin:0 auto;animation:r 1s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}
a{color:#fff;font-size:13px;opacity:.7}
</style>
</head>
<body>
<div class="c">
<div class="s"></div>
<h1>Connessione in corso...</h1>
<p>Ti stiamo collegando alla rete Wi-Fi</p>
<a href="${escapeHtml(routerUrl)}">Continua manualmente →</a>
</div>
</body>
</html>`
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function renderError(message: string, prefill?: { hostId: string; mode: string }) {
  const backParam = prefill ? `?h=${encodeURIComponent(prefill.hostId)}` : ''
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Errore</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4f46e5,#7c3aed,#ec4899);color:#fff;padding:20px}
.c{max-width:340px;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);padding:32px 24px;border-radius:20px;text-align:center}
.i{width:56px;height:56px;background:rgba(239,68,68,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px}
h1{font-size:20px;margin-bottom:10px}
p{font-size:14px;opacity:.9;margin-bottom:20px;line-height:1.5}
a{display:inline-block;background:#fff;color:#4f46e5;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px}
</style>
</head>
<body>
<div class="c">
<div class="i">⚠</div>
<h1>Accesso negato</h1>
<p>${escapeHtml(message)}</p>
<a href="javascript:history.back()">Riprova</a>
</div>
</body>
</html>`
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
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
