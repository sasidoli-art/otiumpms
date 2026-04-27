/*
 * Otium booking engine — script embed leggero.
 *
 * Utilizzo sul sito dell'hotel:
 *   <script
 *     src="https://otiumweek.com/embed.js"
 *     data-struttura="<strutturaId>"
 *     data-type="camere|spa|ristorante"
 *     data-color="#6366f1"
 *     data-label="Prenota ora"
 *   ></script>
 *
 * Il bottone flottante in basso a destra apre il booking in un iframe modal.
 */
(function () {
  'use strict'

  // `document.currentScript` non e` disponibile nei moduli/async defer —
  // fallback: cerca l'ultimo <script src="*/embed.js">.
  var script = document.currentScript
  if (!script) {
    var all = document.getElementsByTagName('script')
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf('/embed.js') !== -1) {
        script = all[i]
        break
      }
    }
  }
  if (!script) return

  var strutturaId = script.getAttribute('data-struttura')
  if (!strutturaId) {
    if (window && window.console) console.warn('[otium-embed] data-struttura mancante')
    return
  }
  var type = script.getAttribute('data-type') || 'camere'
  var color = script.getAttribute('data-color') || '#6366f1'
  var label = script.getAttribute('data-label') || 'Prenota ora'

  // Base URL: stesso origin da cui proviene lo script
  var origin = (function () {
    try {
      return new URL(script.src).origin
    } catch (e) {
      return 'https://otiumweek.com'
    }
  })()

  // Guard: non duplicare se lo script e` caricato piu` volte
  if (document.querySelector('[data-otium-embed-btn="1"]')) return

  // ── Bottone flottante ──────────────────────────────────────────────
  var btn = document.createElement('button')
  btn.type = 'button'
  btn.setAttribute('data-otium-embed-btn', '1')
  btn.setAttribute('aria-label', label)
  btn.textContent = label
  btn.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'background:' + color,
    'color:#ffffff',
    'border:none',
    'padding:14px 28px',
    'border-radius:50px',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    'font-size:15px',
    'font-weight:600',
    'cursor:pointer',
    'z-index:2147483000', // max-ish
    'box-shadow:0 4px 14px rgba(0,0,0,0.18)',
    'transition:transform 0.15s ease, box-shadow 0.15s ease',
  ].join(';')
  btn.addEventListener('mouseenter', function () {
    btn.style.transform = 'translateY(-2px)'
    btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.22)'
  })
  btn.addEventListener('mouseleave', function () {
    btn.style.transform = ''
    btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)'
  })

  btn.addEventListener('click', openModal)

  function openModal() {
    // Overlay
    var overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.55)',
      'z-index:2147483001',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
      'animation:otium-fade-in 0.18s ease',
    ].join(';')

    // Container (iframe + close)
    var box = document.createElement('div')
    box.style.cssText = [
      'position:relative',
      'width:100%',
      'max-width:640px',
      'height:88vh',
      'max-height:900px',
      'background:#ffffff',
      'border-radius:14px',
      'overflow:hidden',
      'box-shadow:0 20px 60px rgba(0,0,0,0.3)',
    ].join(';')

    var close = document.createElement('button')
    close.type = 'button'
    close.setAttribute('aria-label', 'Chiudi')
    close.innerHTML = '&times;'
    close.style.cssText = [
      'position:absolute',
      'top:8px',
      'right:8px',
      'width:36px',
      'height:36px',
      'border:none',
      'background:rgba(255,255,255,0.9)',
      'backdrop-filter:blur(6px)',
      'color:#18181b',
      'font-size:22px',
      'font-weight:700',
      'line-height:1',
      'border-radius:50%',
      'cursor:pointer',
      'z-index:2',
      'box-shadow:0 2px 6px rgba(0,0,0,0.1)',
    ].join(';')

    var iframe = document.createElement('iframe')
    iframe.src = origin + '/book/' + encodeURIComponent(strutturaId) + '/' + encodeURIComponent(type) + '?embed=popup'
    iframe.title = label
    iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;'
    iframe.setAttribute('loading', 'lazy')

    box.appendChild(iframe)
    box.appendChild(close)
    overlay.appendChild(box)

    // Lock body scroll
    var prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function dismiss() {
      overlay.remove()
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
    function onKey(e) { if (e.key === 'Escape') dismiss() }

    close.addEventListener('click', dismiss)
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss() })
    document.addEventListener('keydown', onKey)

    document.body.appendChild(overlay)
  }

  // Aspetta che il body esista (defer/async safe)
  function mount() {
    if (document.body) {
      document.body.appendChild(btn)
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.appendChild(btn)
      })
    }
  }
  mount()
})()
