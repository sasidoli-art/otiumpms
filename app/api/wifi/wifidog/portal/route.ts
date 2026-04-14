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

  if (gw_id) {
    const macNorm = gw_id.toUpperCase().replace(/[^0-9A-F]/g, '')
    const device = await prisma.wifiDevice.findFirst({
      where: macNorm.length === 12 ? { mac: macNorm } : { alias: gw_id },
      select: {
        splashConfig: true,
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
    }

    hostNome = device?.host.nomeAzienda ?? ''
  }

  // Priorità: linkRedirect > url originale > pagina default
  const redirectTarget = landingUrl ?? (isSafeUrl(originalUrl) ? originalUrl : null)

  if (redirectTarget) {
    return NextResponse.redirect(redirectTarget, { status: 302 })
  }

  // Fallback: pagina "Sei connesso"
  const safeName = hostNome ? escapeHtml(hostNome) : 'Otium Wi-Fi'
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
h1{font-size:26px;margin-bottom:10px;font-weight:700}
p{font-size:15px;opacity:.9;line-height:1.5;margin-bottom:20px}
.f{font-size:11px;opacity:.7;margin-top:24px}
</style>
</head>
<body>
<div class="c">
<div class="i">✓</div>
<h1>Sei connesso!</h1>
<p>La tua sessione Wi-Fi è attiva. Puoi chiudere questa pagina e navigare liberamente.</p>
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
