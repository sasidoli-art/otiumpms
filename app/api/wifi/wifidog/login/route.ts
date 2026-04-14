import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import { logger } from '@/lib/logger'

/**
 * GET /api/wifi/wifidog/login/
 *
 * Endpoint wifidog "login URL" — il router redirige qui gli ospiti non
 * autenticati. Serve direttamente una pagina HTML statica (no React) con form
 * di login. È ottimizzata per funzionare nei mini-browser captive portal
 * (iOS CNA, Android CaptivePortalLogin) che hanno WebView limitati.
 *
 * Query params wifidog (standard protocol v1):
 *   gw_address, gw_port, gw_id, mac, url
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const gw_id = sp.get('gw_id')
  const gw_address = sp.get('gw_address') ?? ''
  const gw_port = sp.get('gw_port') ?? '2060'
  const mac = sp.get('mac') ?? ''
  const url = sp.get('url') ?? ''

  if (!gw_id) {
    return new NextResponse('gw_id query param required', { status: 400 })
  }

  const macNorm = String(gw_id).toUpperCase().replace(/[^0-9A-F]/g, '')

  const device = await prisma.wifiDevice.findFirst({
    where: macNorm.length === 12 ? { mac: macNorm } : { alias: gw_id },
    select: {
      hostId: true,
      host: {
        select: { moduliAttivi: true, nomeAzienda: true },
      },
    },
  })

  if (!device) {
    logger.warn('Wifidog login: gateway non registrato', 'wifi/wifidog/login', { gw_id })
    return new NextResponse(
      `Gateway "${gw_id}" non registrato. Contattare l'amministratore.`,
      { status: 404 }
    )
  }

  if (!isModuloAttivo(device.host.moduliAttivi, 'wifi')) {
    return new NextResponse('Wi-Fi module non attivo', { status: 403 })
  }

  const hostNome = escapeHtml(device.host.nomeAzienda)
  const hostId = device.hostId
  const origin = req.nextUrl.origin

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="format-detection" content="telephone=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>${hostNome} — Wi-Fi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;min-height:100vh;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#ec4899 100%);color:#fff;padding:20px;display:flex;align-items:center;justify-content:center}
.wrap{width:100%;max-width:400px}
.hero{text-align:center;margin-bottom:24px}
.logo{width:72px;height:72px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:36px}
h1{font-size:26px;font-weight:700;margin-bottom:6px;line-height:1.2}
.sub{font-size:14px;opacity:.85}
.card{background:#fff;color:#1f2937;border-radius:20px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.tabs{display:flex;border-bottom:1px solid #e5e7eb;margin:-24px -24px 20px;padding:0 24px}
.tab{flex:1;padding:14px 0;text-align:center;font-size:13px;font-weight:600;color:#9ca3af;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none}
.tab.active{color:#4f46e5;border-bottom-color:#4f46e5}
.pane{display:none}
.pane.active{display:block}
label{display:block;font-size:12px;font-weight:500;color:#374151;margin-bottom:6px;margin-top:14px}
input[type=text]{width:100%;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;color:#1f2937;background:#f9fafb;-webkit-appearance:none}
input[type=text]:focus{outline:none;border-color:#4f46e5;background:#fff}
input.code{text-align:center;letter-spacing:.2em;font-family:"SF Mono",Consolas,monospace;font-size:18px;text-transform:uppercase;font-weight:600}
button.submit{width:100%;margin-top:20px;background:#4f46e5;color:#fff;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer}
button.submit:active{background:#4338ca}
.err{background:#fef2f2;color:#b91c1c;padding:12px;border-radius:10px;font-size:13px;margin-top:12px;display:none}
.err.show{display:block}
.foot{text-align:center;font-size:11px;opacity:.7;margin-top:20px}
.spinner{display:none;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle}
.loading .spinner{display:inline-block}
.loading button.submit{opacity:.7}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="wrap">
<div class="hero">
<div class="logo">📶</div>
<h1>${hostNome}</h1>
<div class="sub">Wi-Fi gratuito per ospiti</div>
</div>
<div class="card">
<div class="tabs">
<button type="button" class="tab active" data-tab="codice">Ho un codice</button>
<button type="button" class="tab" data-tab="prenotazione">Sono ospite</button>
</div>
<form id="f" method="post" action="/api/wifi/wifidog/submit">
<input type="hidden" name="hostId" value="${escapeHtml(hostId)}">
<input type="hidden" name="gw_address" value="${escapeHtml(gw_address)}">
<input type="hidden" name="gw_port" value="${escapeHtml(gw_port)}">
<input type="hidden" name="mac" value="${escapeHtml(mac)}">
<input type="hidden" name="url" value="${escapeHtml(url)}">
<input type="hidden" name="mode" id="mode" value="codice">

<div class="pane active" data-pane="codice">
<label>Codice di accesso</label>
<input type="text" name="codice" class="code" placeholder="XXXXXXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="12">
<label>Nome (opzionale)</label>
<input type="text" name="guestNome_codice" placeholder="Il tuo nome" autocomplete="given-name">
</div>

<div class="pane" data-pane="prenotazione">
<label>Nome</label>
<input type="text" name="guestNome" autocomplete="given-name">
<label>Cognome</label>
<input type="text" name="guestCognome" autocomplete="family-name">
<label>Numero camera</label>
<input type="text" name="numeroCamera" placeholder="es. 101">
</div>

<div class="err" id="e"></div>
<button type="submit" class="submit"><span class="spinner"></span><span id="btnText">Connetti</span></button>
</form>
</div>
<div class="foot">Log accessi conservati 6 mesi · GDPR</div>
</div>
<script>
(function(){
var tabs=document.querySelectorAll('.tab'),panes=document.querySelectorAll('.pane'),modeInput=document.getElementById('mode');
for(var i=0;i<tabs.length;i++){(function(btn){btn.onclick=function(){var t=btn.getAttribute('data-tab');modeInput.value=t;for(var j=0;j<tabs.length;j++){tabs[j].className='tab'+(tabs[j].getAttribute('data-tab')===t?' active':'')}for(var k=0;k<panes.length;k++){panes[k].className='pane'+(panes[k].getAttribute('data-pane')===t?' active':'')}}})(tabs[i])}
document.getElementById('f').addEventListener('submit',function(){document.body.className='loading';document.getElementById('btnText').textContent='Connessione...'});
})();
</script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
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
