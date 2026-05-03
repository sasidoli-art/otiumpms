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

  // === MAC PERSISTENCE ============================================================
  // Se questo MAC ha una sessione recente ancora valida sullo stesso host, salta il
  // form di login e riautentica automaticamente. Risolve il bug "micro-disconnect →
  // l'ospite deve rifare login ogni volta che il telefono perde 1ms di Wi-Fi".
  // Match: stesso hostId + stesso macClient (case-insensitive) + non revocata +
  // expiresAt > now. Ordinata per startAt desc per prendere la più recente.
  if (mac && mac.length >= 11) {
    const macUpper = mac.toUpperCase()
    const recentSession = await prisma.wifiSession.findFirst({
      where: {
        hostId: device.hostId,
        macClient: { equals: macUpper, mode: 'insensitive' },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { startAt: 'desc' },
      select: { id: true },
    })

    if (recentSession) {
      logger.info('Wifidog login: MAC reauth (persistence)', 'wifi/wifidog/login', {
        sessionId: recentSession.id.slice(0, 8),
        mac: macUpper,
        hostId: device.hostId,
      })
      const routerUrl = `http://${gw_address}:${gw_port}/wifidog/auth?token=${encodeURIComponent(recentSession.id)}`
      const reauthHtml = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${escapeHtml(routerUrl)}">
<title>Riconnessione automatica</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#f3f4f6;color:#111827;margin:0;padding:32px;text-align:center}.s{width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#4f46e5;border-radius:50%;margin:24px auto;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}a{color:#4f46e5;font-size:13px}</style>
</head>
<body><div class="s"></div><p>Riconnessione in corso...</p><a href="${escapeHtml(routerUrl)}">Continua manualmente</a></body>
</html>`
      return new NextResponse(reauthHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      })
    }
  }
  // ================================================================================

  const hostNome = escapeHtml(device.host.nomeAzienda)
  const hostId = device.hostId

  // === MULTILINGUA ===============================================================
  // Detection del language: ?lang=xx > Accept-Language > default 'it'
  // Supportate: it (default), en, de, fr — tutte le label hanno fallback IT.
  const queryLang = sp.get('lang') || ''
  const acceptLang = req.headers.get('accept-language') || ''
  const lang = pickLanguage(queryLang, acceptLang)
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.it

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${hostNome} - Wi-Fi</title>
<style>
body { margin: 0; padding: 16px; font-family: -apple-system, Helvetica, Arial, sans-serif; background: #f3f4f6; color: #111827; }
.wrap { max-width: 420px; margin: 0 auto; }
.hero { text-align: center; padding: 20px 0 24px; }
.hero h1 { font-size: 22px; margin: 8px 0 4px; color: #111827; }
.hero p { font-size: 14px; color: #6b7280; margin: 0; }
.card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
.tabs { display: flex; margin: -20px -20px 16px; border-bottom: 1px solid #e5e7eb; }
.tab { flex: 1; padding: 14px 8px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280; background: #ffffff; border: 0; cursor: pointer; }
.tab.active { color: #4f46e5; border-bottom: 3px solid #4f46e5; }
.pane { display: none; }
.pane.active { display: block; }
label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin: 14px 0 6px; }
input[type=text] { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; color: #111827; background: #ffffff; -webkit-appearance: none; box-sizing: border-box; }
input[type=text]:focus { outline: none; border-color: #4f46e5; }
input.code { text-align: center; letter-spacing: 0.15em; font-size: 18px; text-transform: uppercase; font-weight: 700; }
button.submit { width: 100%; margin-top: 20px; background: #4f46e5; color: #ffffff; padding: 14px; border: 0; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.foot { text-align: center; font-size: 11px; color: #9ca3af; padding: 16px 0 8px; }
.langbar { text-align: center; padding: 8px 0; font-size: 11px; color: #9ca3af; }
.langbar a { color: #6b7280; text-decoration: none; margin: 0 6px; }
.langbar a.active { color: #4f46e5; font-weight: 600; }
noscript { display: block; font-size: 12px; color: #6b7280; padding: 8px 0; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
<div class="hero">
<h1>${hostNome}</h1>
<p>${t.subtitle}</p>
</div>
<div class="card">
<div class="tabs">
<button type="button" class="tab active" data-tab="codice">${t.tabCode}</button>
<button type="button" class="tab" data-tab="prenotazione">${t.tabBooking}</button>
</div>
<form id="f" method="post" action="/api/wifi/wifidog/submit">
<input type="hidden" name="hostId" value="${escapeHtml(hostId)}">
<input type="hidden" name="gw_address" value="${escapeHtml(gw_address)}">
<input type="hidden" name="gw_port" value="${escapeHtml(gw_port)}">
<input type="hidden" name="mac" value="${escapeHtml(mac)}">
<input type="hidden" name="url" value="${escapeHtml(url)}">
<input type="hidden" name="mode" id="mode" value="codice">

<div class="pane active" data-pane="codice">
<label>${t.labelCode}</label>
<input type="text" name="codice" class="code" placeholder="XXXXXXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="12">
<label>${t.labelNameOptional}</label>
<input type="text" name="guestNome_codice" placeholder="${t.placeholderName}" autocomplete="given-name">
</div>

<div class="pane" data-pane="prenotazione">
<label>${t.labelFirstName}</label>
<input type="text" name="guestNome" autocomplete="given-name">
<label>${t.labelLastName}</label>
<input type="text" name="guestCognome" autocomplete="family-name">
<label>${t.labelRoom}</label>
<input type="text" name="numeroCamera" placeholder="${t.placeholderRoom}">
</div>

<button type="submit" class="submit">${t.btnConnect}</button>
</form>
</div>
<div class="langbar">
${LANGUAGES.map((lc) => `<a href="?${new URLSearchParams({ ...Object.fromEntries(sp.entries()), lang: lc }).toString()}" class="${lc === lang ? 'active' : ''}">${lc.toUpperCase()}</a>`).join('')}
</div>
<div class="foot">${t.footerGdpr}</div>
</div>
<script>
(function(){
var tabs=document.getElementsByClassName('tab');
var panes=document.getElementsByClassName('pane');
var modeInput=document.getElementById('mode');
function onClick(btn){return function(){var t=btn.getAttribute('data-tab');modeInput.value=t;for(var j=0;j<tabs.length;j++){tabs[j].className='tab'+(tabs[j].getAttribute('data-tab')===t?' active':'');}for(var k=0;k<panes.length;k++){panes[k].className='pane'+(panes[k].getAttribute('data-pane')===t?' active':'');}};}
for(var i=0;i<tabs.length;i++){tabs[i].onclick=onClick(tabs[i]);}
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

// ─── i18n ────────────────────────────────────────────────────────────────────

const LANGUAGES = ['it', 'en', 'de', 'fr'] as const
type Lang = (typeof LANGUAGES)[number]

interface Translation {
  subtitle: string
  tabCode: string
  tabBooking: string
  labelCode: string
  labelNameOptional: string
  placeholderName: string
  labelFirstName: string
  labelLastName: string
  labelRoom: string
  placeholderRoom: string
  btnConnect: string
  footerGdpr: string
}

const TRANSLATIONS: Record<Lang, Translation> = {
  it: {
    subtitle: 'Wi-Fi gratuito per ospiti',
    tabCode: 'Ho un codice',
    tabBooking: 'Sono ospite',
    labelCode: 'Codice di accesso',
    labelNameOptional: 'Nome (opzionale)',
    placeholderName: 'Il tuo nome',
    labelFirstName: 'Nome',
    labelLastName: 'Cognome',
    labelRoom: 'Numero camera',
    placeholderRoom: 'es. 101',
    btnConnect: 'Connetti',
    footerGdpr: 'Log accessi conservati 6 mesi - GDPR',
  },
  en: {
    subtitle: 'Free Wi-Fi for guests',
    tabCode: 'I have a code',
    tabBooking: "I'm a guest",
    labelCode: 'Access code',
    labelNameOptional: 'Name (optional)',
    placeholderName: 'Your name',
    labelFirstName: 'First name',
    labelLastName: 'Last name',
    labelRoom: 'Room number',
    placeholderRoom: 'e.g. 101',
    btnConnect: 'Connect',
    footerGdpr: 'Access logs kept 6 months — GDPR',
  },
  de: {
    subtitle: 'Kostenloses WLAN für Gäste',
    tabCode: 'Ich habe einen Code',
    tabBooking: 'Ich bin Gast',
    labelCode: 'Zugangscode',
    labelNameOptional: 'Name (optional)',
    placeholderName: 'Ihr Name',
    labelFirstName: 'Vorname',
    labelLastName: 'Nachname',
    labelRoom: 'Zimmernummer',
    placeholderRoom: 'z.B. 101',
    btnConnect: 'Verbinden',
    footerGdpr: 'Zugriffsprotokolle 6 Monate aufbewahrt — DSGVO',
  },
  fr: {
    subtitle: 'Wi-Fi gratuit pour invités',
    tabCode: "J'ai un code",
    tabBooking: 'Je suis client',
    labelCode: "Code d'accès",
    labelNameOptional: 'Nom (facultatif)',
    placeholderName: 'Votre nom',
    labelFirstName: 'Prénom',
    labelLastName: 'Nom',
    labelRoom: 'Numéro de chambre',
    placeholderRoom: 'ex. 101',
    btnConnect: 'Se connecter',
    footerGdpr: "Journaux d'accès conservés 6 mois — RGPD",
  },
}

/**
 * Sceglie la lingua più appropriata. Priorità:
 *   1. Override esplicito (?lang=xx)
 *   2. Accept-Language header (negotiation)
 *   3. Default 'it'
 */
function pickLanguage(queryLang: string, acceptHeader: string): Lang {
  const supported: readonly Lang[] = LANGUAGES
  const isSupported = (s: string): s is Lang => (supported as readonly string[]).includes(s)

  if (queryLang && isSupported(queryLang.toLowerCase())) {
    return queryLang.toLowerCase() as Lang
  }
  if (acceptHeader) {
    const candidates = acceptHeader
      .split(',')
      .map((part) => part.trim().split(';')[0].split('-')[0].toLowerCase())
    for (const c of candidates) {
      if (isSupported(c)) return c
    }
  }
  return 'it'
}
