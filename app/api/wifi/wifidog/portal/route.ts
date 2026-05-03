import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/wifi/wifidog/portal/
 *
 * Chiamato dal router wifidog dopo un Auth: 1 success. Redirige il client
 * al landing URL configurato dall'host (splashConfig.linkRedirect) — per es.
 * il sito del B&B, ristorante, o una pagina di benvenuto custom.
 *
 * Se linkRedirect non è configurato, fa fallback:
 *   1) url originale richiesta dal client (query param url) se presente
 *   2) pagina "Sei connesso!" standard
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const gw_id = sp.get('gw_id') ?? ''
  const originalUrl = sp.get('url') ?? ''

  // Lookup del device e lettura splashConfig.linkRedirect
  let landingUrl: string | null = null
  let hostNome = ''
  let hostId: string | null = null
  let vipMessageOverride: string | null = null

  if (gw_id) {
    const macNorm = gw_id.toUpperCase().replace(/[^0-9A-F]/g, '')
    const device = await prisma.wifiDevice.findFirst({
      where: macNorm.length === 12 ? { mac: macNorm } : { alias: gw_id },
      select: {
        splashConfig: true,
        hostId: true,
        host: { select: { nomeAzienda: true } },
      },
    })

    if (device?.splashConfig && typeof device.splashConfig === 'object') {
      const cfg = device.splashConfig as Record<string, unknown>
      const raw = typeof cfg.linkRedirect === 'string' ? cfg.linkRedirect.trim() : ''
      if (raw) {
        try {
          const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            landingUrl = parsed.toString()
          }
        } catch {
          // URL malformato → ignora
        }
      }
      // Override messaggio VIP dal splashConfig (host può personalizzare)
      if (typeof cfg.vipMessage === 'string') {
        vipMessageOverride = cfg.vipMessage.trim() || null
      }
    }

    hostNome = device?.host.nomeAzienda ?? ''
    hostId = device?.hostId ?? null
  }

  // === VIP RECOGNITION ============================================================
  // Cerca una WifiSession recentissima (ultimi 2 min) di tipo PRENOTAZIONE.
  // Se la prenotazione collegata ha vip=true, mostra welcome personalizzato.
  //
  // NOTA: WifiSession ha solo prenotazioneId (FK string), non relation diretta,
  // quindi facciamo 2 query separate (no Prisma include).
  //
  // Race condition: se DUE VIP si autenticano nello stesso minuto, il secondo
  // vedrebbe il nome del primo. Acceptable per MVP — VIP simultanei sono rari.
  let vipGuestName: string | null = null
  if (hostId) {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000)
    const vipSession = await prisma.wifiSession.findFirst({
      where: {
        hostId,
        tipo: 'PRENOTAZIONE',
        startAt: { gt: twoMinAgo },
        prenotazioneId: { not: null },
      },
      orderBy: { startAt: 'desc' },
      select: {
        prenotazioneId: true,
        guestNome: true,
        guestCognome: true,
      },
    })
    if (vipSession?.prenotazioneId) {
      const prenotazione = await prisma.prenotazione.findUnique({
        where: { id: vipSession.prenotazioneId },
        select: { guestEmail: true, guestNome: true, guestCognome: true },
      })
      // Il flag VIP vive sull'OspiteCRM (anagrafica condivisa cross-prenotazione),
      // matchato per email su questo host.
      if (prenotazione?.guestEmail) {
        const ospite = await prisma.ospiteCRM.findUnique({
          where: { hostId_email: { hostId, email: prenotazione.guestEmail.toLowerCase() } },
          select: { vip: true, nome: true, cognome: true },
        }).catch(() => null)
        if (ospite?.vip) {
          const fname = (ospite.nome || prenotazione.guestNome || vipSession.guestNome || '').trim()
          const lname = (ospite.cognome || prenotazione.guestCognome || vipSession.guestCognome || '').trim()
          vipGuestName = [fname, lname].filter(Boolean).join(' ').trim() || null
        }
      }
    }
  }
  // ================================================================================

  // Priorità: linkRedirect > url originale > pagina default
  // Se VIP, NON facciamo redirect immediato — mostriamo prima il welcome personalizzato
  const redirectTarget = landingUrl ?? (isSafeUrl(originalUrl) ? originalUrl : null)

  if (redirectTarget && !vipGuestName) {
    return NextResponse.redirect(redirectTarget, { status: 302 })
  }

  // Fallback: pagina "Sei connesso" (con eventuale overlay VIP)
  const safeName = hostNome ? escapeHtml(hostNome) : 'Otium Wi-Fi'

  let title: string
  let body: string
  let badge: string | null = null
  if (vipGuestName) {
    const safeGuestName = escapeHtml(vipGuestName)
    badge = '⭐'
    title = vipMessageOverride
      ? escapeHtml(vipMessageOverride.replace(/{name}|{nome}/gi, vipGuestName))
      : `Bentornato, ${safeGuestName}`
    const continueUrl = redirectTarget ?? null
    body = continueUrl
      ? `<p>Ti stiamo preparando un Wi-Fi prioritario.</p><p style="font-size:13px;opacity:.8">Sarai rediretto al sito della struttura tra 4 secondi.</p><meta http-equiv="refresh" content="4;url=${escapeHtml(continueUrl)}">`
      : `<p>Ti stiamo preparando un Wi-Fi prioritario. Buon soggiorno.</p>`
  } else {
    title = 'Sei connesso!'
    body = `<p>La tua sessione Wi-Fi è attiva. Puoi chiudere questa pagina e navigare liberamente.</p>`
  }

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connesso — ${safeName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#ec4899 100%);color:#fff;padding:24px}
.c{background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border-radius:24px;padding:40px 32px;text-align:center;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.i{width:80px;height:80px;background:rgba(34,197,94,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:40px}
.i.vip{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#78350f;box-shadow:0 8px 24px rgba(251,191,36,.5)}
h1{font-size:26px;margin-bottom:10px;font-weight:700}
p{font-size:15px;opacity:.9;line-height:1.5;margin-bottom:14px}
.f{font-size:11px;opacity:.7;margin-top:24px}
</style>
</head>
<body>
<div class="c">
<div class="i${badge ? ' vip' : ''}">${badge ?? '✓'}</div>
<h1>${title}</h1>
${body}
<div class="f">${safeName} · Log conservati 6 mesi · GDPR</div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function isSafeUrl(u: string): boolean {
  if (!u) return false
  try {
    const p = new URL(u)
    return p.protocol === 'http:' || p.protocol === 'https:'
  } catch {
    return false
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
