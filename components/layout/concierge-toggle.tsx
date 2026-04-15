'use client'

import { useState, useEffect } from 'react'
import { Bot, Loader2, Shield, X } from 'lucide-react'

/**
 * ConciergeToggle — interruttore "AI ON/OFF" sempre visibile in topbar.
 *
 * Logica:
 *  - ON  = l'AI risponde autonomamente agli ospiti (concierge in pilota automatico)
 *  - OFF = l'AI tace, gli ospiti vedono solo un auto-reply "ti rispondiamo entro
 *          15 minuti" e il messaggio finisce in coda per intervento umano del host.
 *
 * Persiste su Host.conciergeAttivo via PATCH /api/host/profilo.
 *
 * GDPR: prima della prima attivazione, mostra una modale con i termini di
 * trattamento dei dati AI. L'host deve accettare per poter procedere.
 */
export function ConciergeToggle() {
  const [active, setActive] = useState<boolean | null>(null)
  const [gdprAccepted, setGdprAccepted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [showGdprModal, setShowGdprModal] = useState(false)

  useEffect(() => {
    fetch('/api/host/profilo')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) {
          setActive(d.conciergeAttivo ?? false)
          setGdprAccepted(!!d.conciergeGdprAcceptedAt)
        }
      })
      .catch(() => {
        setActive(false)
        setGdprAccepted(false)
      })
  }, [])

  async function toggle() {
    if (active === null || loading) return

    // Se sto attivando per la prima volta e non ho accettato GDPR → mostra modale
    if (!active && !gdprAccepted) {
      setShowGdprModal(true)
      return
    }

    await persistToggle(!active)
  }

  async function persistToggle(newVal: boolean, alsoAcceptGdpr = false) {
    setLoading(true)
    setActive(newVal) // optimistic
    if (alsoAcceptGdpr) setGdprAccepted(true)

    try {
      const body: Record<string, unknown> = { conciergeAttivo: newVal }
      if (alsoAcceptGdpr) {
        body.conciergeGdprAcceptedAt = new Date().toISOString()
      }
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setActive(!newVal)
        if (alsoAcceptGdpr) setGdprAccepted(false)
      }
    } catch {
      setActive(!newVal)
      if (alsoAcceptGdpr) setGdprAccepted(false)
    } finally {
      setLoading(false)
    }
  }

  function acceptGdprAndActivate() {
    setShowGdprModal(false)
    persistToggle(true, true)
  }

  // Hide while loading initial state
  if (active === null) return null

  return (
    <>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          active
            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
        } disabled:opacity-50`}
        title={
          active
            ? 'AI attiva (pilota automatico): risponde agli ospiti da sola. Click per disattivare.'
            : 'AI disattiva: gli ospiti aspettano una tua risposta manuale. Click per attivare il pilota automatico.'
        }
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Bot className={`w-3.5 h-3.5 ${active ? '' : 'opacity-50'}`} />
        )}
        <span className="hidden sm:inline">AI {active ? 'ON' : 'OFF'}</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
          }`}
        />
      </button>

      {/* Modale accettazione GDPR (solo prima attivazione) */}
      {showGdprModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowGdprModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowGdprModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Chiudi"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                  Attivazione AI Concierge
                </h2>
                <p className="text-xs text-gray-500">Trattamento dati personali</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-700 dark:text-slate-300 leading-relaxed">
              <p>
                Attivando il <strong>Concierge AI</strong>, i messaggi degli ospiti
                vengono inviati a un modello di intelligenza artificiale per generare
                risposte automatiche. Per usare questo servizio devi essere consapevole
                di:
              </p>

              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Dati trattati</strong>: messaggi degli ospiti, nome (se
                  fornito), camera, lingua. Otium minimizza i dati passati al modello
                  AI: NON vengono inviati cognome, indirizzo, email, dati di pagamento
                  o dati sanitari espliciti.
                </li>
                <li>
                  <strong>Dove finiscono</strong>: il provider AI selezionato (Claude
                  di Anthropic, oppure altro provider configurato). Anthropic è
                  certificata DPF (EU-US Data Privacy Framework) e non usa i dati
                  inviati via API per addestramento.
                </li>
                <li>
                  <strong>Disclosure obbligatoria</strong>: l&apos;ospite riceve
                  automaticamente un messaggio iniziale che lo informa di stare
                  parlando con un sistema AI (richiesto da AI Act EU Art. 50).
                </li>
                <li>
                  <strong>Tu sei Titolare del trattamento</strong>: gli ospiti sono i
                  tuoi clienti, tu decidi finalità e mezzi. Otium agisce come
                  Responsabile (processor) per tuo conto.
                </li>
                <li>
                  <strong>Disattivazione</strong>: puoi disattivare l&apos;AI in
                  qualsiasi momento dal toggle in alto. Le conversazioni precedenti
                  restano nel DB e sono cancellabili dal pannello GDPR.
                </li>
                <li>
                  <strong>Privacy policy aggiornata</strong>: aggiungi una nota nella
                  privacy policy della tua struttura informando gli ospiti che il
                  servizio Wi-Fi/chat è assistito da AI (template fornito da Otium).
                </li>
              </ul>

              <p className="text-[11px] text-gray-500 italic">
                Cliccando &quot;Accetto e attivo&quot; confermi di aver letto queste
                condizioni e di accettare il trattamento dei dati come descritto. Il
                consenso viene tracciato con timestamp nel tuo profilo host
                (auditabile).
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowGdprModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                Annulla
              </button>
              <button
                onClick={acceptGdprAndActivate}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
              >
                Accetto e attivo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
