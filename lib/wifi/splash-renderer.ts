/**
 * Splash page renderer — config JSON → HTML completo.
 *
 * Genera l'HTML statico che il router serve da `/www/otium/index.html`.
 * Tutto inline (CSS+JS) per evitare richieste esterne durante captive.
 */

import type { SplashConfig, Lang, TranslatableFields } from './splash-config'
import { mergeSplashConfig, LANG_LABELS, TRANSLATABLE_FIELDS } from './splash-config'

/** Escape HTML entities per evitare XSS via campi utente */
function esc(s: string | undefined | null): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Costruisce dataset i18n per tutti i campi traducibili e tutte le lingue abilitate */
function buildI18nData(c: SplashConfig): Record<Lang, TranslatableFields> | null {
  const langs = c.lingue ?? []
  if (langs.length <= 1) return null

  const data: Partial<Record<Lang, TranslatableFields>> = {}
  for (const lang of langs) {
    const overrides = c.traduzioni?.[lang] ?? {}
    const fields: TranslatableFields = {}
    for (const k of TRANSLATABLE_FIELDS) {
      fields[k] = overrides[k] ?? (c[k] as string | undefined) ?? ''
    }
    data[lang] = fields
  }
  return data as Record<Lang, TranslatableFields>
}

/** Applica overrides della lingua default al config per il rendering iniziale */
function applyDefaultLang(c: SplashConfig): SplashConfig {
  const defaultLang = c.linguaDefault ?? c.lingue?.[0]
  if (!defaultLang || defaultLang === 'it') return c
  const overrides = c.traduzioni?.[defaultLang]
  if (!overrides) return c
  return { ...c, ...overrides }
}

/** Renderizza l'HTML splash completo */
export function renderSplashHtml(
  hostNomeAzienda: string,
  config: SplashConfig | null | undefined,
): string {
  let c = mergeSplashConfig(hostNomeAzienda, config)
  c = applyDefaultLang(c)
  const i18n = buildI18nData(c)

  const bgStyle = c.sfondoImmagineUrl
    ? `background: url('${esc(c.sfondoImmagineUrl)}') center/cover no-repeat fixed, ${esc(c.coloreSfondo)};`
    : `background: ${esc(c.coloreSfondo)};`

  const showCodice = c.mostraTabCodice !== false
  const showPreno = c.mostraTabPrenotazione !== false
  const hasMultiTabs = showCodice && showPreno
  const initialMode = showCodice ? 'codice' : 'prenotazione'

  const logoHtml = c.logoUrl
    ? `<img src="${esc(c.logoUrl)}" alt="logo" style="height: ${c.logoHeight ?? 60}px; width: auto; margin: 0 auto 12px; display: block;">`
    : ''

  const welcomeHtml = c.messaggioWelcome
    ? `<p style="font-size: 14px; color: ${esc(c.coloreTesto)}; opacity: 0.75; margin: 12px 0 0; line-height: 1.5;">${esc(c.messaggioWelcome)}</p>`
    : ''

  const tabCodiceHtml = showCodice ? `
    <div class="pane${initialMode === 'codice' ? ' active' : ''}" data-pane="codice">
      <label>Codice di accesso</label>
      <input type="text" name="codice" class="code" placeholder="XXXXXXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="20">
      <label>Nome <span class="opt">(opzionale)</span></label>
      <input type="text" name="guestNome" placeholder="Il tuo nome" autocomplete="given-name">
    </div>` : ''

  const tabPrenoHtml = showPreno ? `
    <div class="pane${initialMode === 'prenotazione' ? ' active' : ''}" data-pane="prenotazione">
      <label>Nome</label>
      <input type="text" name="prenoNome" autocomplete="given-name">
      <label>Cognome</label>
      <input type="text" name="prenoCognome" autocomplete="family-name">
    </div>` : ''

  const tabsBarHtml = hasMultiTabs ? `
    <div class="tabs">
      ${showCodice ? `<button type="button" class="tab active" data-tab="codice"><span data-t="labelTabCodice">${esc(c.labelTabCodice)}</span></button>` : ''}
      ${showPreno  ? `<button type="button" class="tab" data-tab="prenotazione"><span data-t="labelTabPrenotazione">${esc(c.labelTabPrenotazione)}</span></button>` : ''}
    </div>` : ''

  const legalLinks: string[] = []
  if (c.urlTermsConditions) legalLinks.push(`<a href="${esc(c.urlTermsConditions)}" target="_blank">Termini</a>`)
  if (c.urlPrivacyPolicy) legalLinks.push(`<a href="${esc(c.urlPrivacyPolicy)}" target="_blank">Privacy</a>`)
  const legalHtml = legalLinks.length
    ? `<div class="legal">${legalLinks.join(' · ')}</div>`
    : ''

  const redirectAttr = c.urlRedirectPostLogin
    ? ` data-redirect="${esc(c.urlRedirectPostLogin)}"`
    : ''

  // ─── Lang switcher ─────────────────────────────────────────────────────
  const langSwitcherHtml = i18n ? `
    <div class="lang-switcher">
      ${(c.lingue ?? []).map(lang => {
        const isActive = (c.linguaDefault ?? c.lingue?.[0]) === lang
        return `<button type="button" class="lang-btn${isActive ? ' active' : ''}" data-lang="${lang}" title="${esc(LANG_LABELS[lang].label)}">${LANG_LABELS[lang].flag}</button>`
      }).join('')}
    </div>` : ''

  const i18nDataScript = i18n ? `
<script id="i18n-data" type="application/json">${JSON.stringify(i18n).replace(/</g, '\\u003c')}</script>
<script>
(function(){
  var data=JSON.parse(document.getElementById('i18n-data').textContent);
  var btns=document.getElementsByClassName('lang-btn');
  function apply(lang){
    var t=data[lang]; if(!t) return;
    document.title=(t.titolo||'')+' - Wi-Fi';
    var elT=document.querySelector('[data-t="titolo"]');     if(elT)elT.textContent=t.titolo||'';
    var elS=document.querySelector('[data-t="sottotitolo"]'); if(elS)elS.textContent=t.sottotitolo||'';
    var elW=document.querySelector('[data-t="messaggioWelcome"]'); if(elW){ elW.textContent=t.messaggioWelcome||''; elW.style.display=t.messaggioWelcome?'':'none'; }
    var elB=document.querySelector('[data-t="testoBottone"]'); if(elB)elB.textContent=t.testoBottone||'';
    var elTc=document.querySelector('[data-t="labelTabCodice"]'); if(elTc)elTc.textContent=t.labelTabCodice||'';
    var elTp=document.querySelector('[data-t="labelTabPrenotazione"]'); if(elTp)elTp.textContent=t.labelTabPrenotazione||'';
    var elF=document.querySelector('[data-t="testoFooter"]'); if(elF)elF.textContent=t.testoFooter||'';
    for(var i=0;i<btns.length;i++) btns[i].className='lang-btn'+(btns[i].getAttribute('data-lang')===lang?' active':'');
    try{ localStorage.setItem('otium_lang', lang); }catch(e){}
  }
  for(var i=0;i<btns.length;i++){
    (function(b){ b.onclick=function(){ apply(b.getAttribute('data-lang')); }; })(btns[i]);
  }
  // Auto-restore preferenza utente
  try{ var saved=localStorage.getItem('otium_lang'); if(saved && data[saved]) apply(saved); }catch(e){}
})();
</script>` : ''

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.titolo)} - Wi-Fi</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; font-family: -apple-system, Helvetica, Arial, sans-serif; ${bgStyle} color: ${esc(c.coloreTesto)}; min-height: 100vh; }
.wrap { max-width: 440px; margin: 0 auto; }
.hero { text-align: center; padding: 24px 0 28px; }
.hero h1 { font-size: 24px; margin: 8px 0 4px; color: ${esc(c.coloreTesto)}; font-weight: 700; }
.hero .sub { font-size: 14px; color: ${esc(c.coloreTesto)}; opacity: 0.65; margin: 0; }
.card { background: rgba(255,255,255,0.96); border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; padding: 22px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.tabs { display: flex; margin: -22px -22px 18px; border-bottom: 1px solid #e5e7eb; }
.tab { flex: 1; padding: 14px 8px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280; background: transparent; border: 0; cursor: pointer; transition: all .15s; }
.tab.active { color: ${esc(c.colorePrimario)}; border-bottom: 2px solid ${esc(c.colorePrimario)}; background: ${esc(c.colorePrimario)}10; }
.pane { display: none; }
.pane.active { display: block; }
label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin: 14px 0 4px; }
label .opt { color: #9ca3af; font-weight: 400; }
input { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 9px; font-size: 16px; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
input:focus { outline: 0; border-color: ${esc(c.colorePrimario)}; box-shadow: 0 0 0 3px ${esc(c.colorePrimario)}25; }
input.code { text-align: center; letter-spacing: 0.2em; font-size: 22px; text-transform: uppercase; font-weight: 700; }
.submit { width: 100%; margin-top: 20px; padding: 14px; background: ${esc(c.colorePrimario)}; color: #fff; border: 0; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: filter .15s; }
.submit:active { filter: brightness(0.92); }
.foot { text-align: center; font-size: 11px; color: ${esc(c.coloreTesto)}; opacity: 0.55; margin-top: 18px; line-height: 1.6; }
.legal { margin-top: 6px; }
.legal a { color: ${esc(c.colorePrimario)}; text-decoration: none; opacity: 0.85; }
.legal a:hover { text-decoration: underline; }
.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 9px; padding: 10px 12px; margin-top: 10px; font-size: 13px; }
.lang-switcher { position: absolute; top: 12px; right: 12px; display: flex; gap: 4px; background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); border-radius: 100px; padding: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.lang-btn { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 100px; cursor: pointer; font-size: 16px; transition: background .15s; padding: 0; line-height: 1; }
.lang-btn:hover { background: rgba(0,0,0,0.05); }
.lang-btn.active { background: ${esc(c.colorePrimario)}20; }
@media (max-width: 380px) { body { padding: 12px; } .card { padding: 18px; } .hero h1 { font-size: 20px; } }
</style>
</head>
<body>
${langSwitcherHtml}
<div class="wrap">
  <div class="hero">
    ${logoHtml}
    <h1 data-t="titolo">${esc(c.titolo)}</h1>
    <p class="sub" data-t="sottotitolo">${esc(c.sottotitolo)}</p>
    ${c.messaggioWelcome ? `<p style="font-size: 14px; color: ${esc(c.coloreTesto)}; opacity: 0.75; margin: 12px 0 0; line-height: 1.5;" data-t="messaggioWelcome">${esc(c.messaggioWelcome)}</p>` : welcomeHtml}
  </div>
  <div class="card">
    ${tabsBarHtml}
    <form id="f" method="post" action="/cgi-bin/otium-login"${redirectAttr}>
      <input type="hidden" name="mode" id="mode" value="${initialMode}">
      ${tabCodiceHtml}
      ${tabPrenoHtml}
      <button type="submit" class="submit" data-t="testoBottone">${esc(c.testoBottone)}</button>
    </form>
  </div>
  <div class="foot">
    <div data-t="testoFooter">${esc(c.testoFooter)}</div>
    ${legalHtml}
  </div>
</div>
${i18nDataScript}
<script>
(function(){
  var tabs=document.getElementsByClassName('tab');
  var panes=document.getElementsByClassName('pane');
  var modeInput=document.getElementById('mode');
  function onClick(btn){
    return function(){
      var t=btn.getAttribute('data-tab');
      modeInput.value=t;
      for(var j=0;j<tabs.length;j++) tabs[j].className='tab'+(tabs[j].getAttribute('data-tab')===t?' active':'');
      for(var k=0;k<panes.length;k++) panes[k].className='pane'+(panes[k].getAttribute('data-pane')===t?' active':'');
    };
  }
  for(var i=0;i<tabs.length;i++) tabs[i].onclick=onClick(tabs[i]);
})();
</script>
</body>
</html>`
}
