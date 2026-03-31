/**
 * Otium Week Booking Widget
 *
 * Uso nel sito dell'hotel:
 *
 * METODO 1 — Bottone popup:
 *   <script src="https://app.otiumweek.it/widget.js" data-struttura="ID" data-mode="button"></script>
 *
 * METODO 2 — Form inline:
 *   <div id="otium-booking"></div>
 *   <script src="https://app.otiumweek.it/widget.js" data-struttura="ID" data-mode="inline"></script>
 *
 * METODO 3 — Solo link (nessun JS):
 *   <a href="https://app.otiumweek.it/book/ID">Prenota Ora</a>
 *
 * Opzioni data-*:
 *   data-struttura="ID"          (obbligatorio) ID struttura
 *   data-mode="button|inline"    (default: button) modalità
 *   data-color="#4f46e5"         colore brand
 *   data-text="Prenota Ora"     testo bottone
 *   data-lang="it"              lingua (it/en/de/fr)
 *   data-position="right"       posizione bottone fisso (left/right)
 */
(function() {
  'use strict';

  // Trova lo script corrente
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];

  var strutturaId = currentScript.getAttribute('data-struttura');
  var mode = currentScript.getAttribute('data-mode') || 'button';
  var color = currentScript.getAttribute('data-color') || '#4f46e5';
  var text = currentScript.getAttribute('data-text') || 'Prenota Ora';
  var lang = currentScript.getAttribute('data-lang') || 'it';
  var position = currentScript.getAttribute('data-position') || 'right';

  if (!strutturaId) {
    console.error('[Otium Widget] data-struttura obbligatorio');
    return;
  }

  // Base URL — detect from script src or default
  var scriptSrc = currentScript.src || '';
  var baseUrl = scriptSrc.replace(/\/widget\.js.*$/, '') || 'https://app.otiumweek.it';
  var bookUrl = baseUrl + '/book/' + strutturaId;

  // ── METODO 1: Bottone fisso con popup ──────────────────────
  if (mode === 'button') {
    // CSS
    var style = document.createElement('style');
    style.textContent = [
      '.otium-btn{position:fixed;bottom:20px;' + position + ':20px;z-index:99999;',
      'background:' + color + ';color:#fff;border:none;padding:14px 28px;',
      'border-radius:50px;font-size:15px;font-weight:700;font-family:system-ui,sans-serif;',
      'cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:all 0.3s;',
      'display:flex;align-items:center;gap:8px;}',
      '.otium-btn:hover{transform:translateY(-2px);box-shadow:0 6px 25px rgba(0,0,0,0.25);}',
      '.otium-btn svg{width:18px;height:18px;}',
      '.otium-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.5);',
      'display:flex;align-items:center;justify-content:center;padding:16px;}',
      '.otium-modal{background:#fff;border-radius:16px;width:100%;max-width:500px;',
      'max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;}',
      '.otium-modal iframe{width:100%;height:80vh;border:none;}',
      '.otium-close{position:absolute;top:12px;right:12px;width:32px;height:32px;',
      'border-radius:50%;background:rgba(0,0,0,0.1);border:none;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;z-index:1;font-size:18px;color:#666;}',
      '.otium-close:hover{background:rgba(0,0,0,0.2);}',
    ].join('\n');
    document.head.appendChild(style);

    // Bottone
    var btn = document.createElement('button');
    btn.className = 'otium-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' + text;
    document.body.appendChild(btn);

    btn.addEventListener('click', function() {
      // Overlay
      var overlay = document.createElement('div');
      overlay.className = 'otium-overlay';
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
      });

      var modal = document.createElement('div');
      modal.className = 'otium-modal';

      var close = document.createElement('button');
      close.className = 'otium-close';
      close.innerHTML = '✕';
      close.addEventListener('click', function() { overlay.remove(); });

      var iframe = document.createElement('iframe');
      iframe.src = bookUrl + '?embed=true&lang=' + lang;
      iframe.title = 'Prenotazione';

      modal.appendChild(close);
      modal.appendChild(iframe);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
  }

  // ── METODO 2: Form inline ─────────────────────────────────
  if (mode === 'inline') {
    var container = document.getElementById('otium-booking') || currentScript.parentElement;
    if (container) {
      var iframe = document.createElement('iframe');
      iframe.src = bookUrl + '?embed=true&lang=' + lang;
      iframe.title = 'Prenotazione Otium Week';
      iframe.style.cssText = 'width:100%;min-height:600px;border:none;border-radius:12px;';
      iframe.setAttribute('loading', 'lazy');
      container.appendChild(iframe);
    }
  }
})();
