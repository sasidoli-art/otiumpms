'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RotateCcw, Loader2 } from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'

// ─── Types ──────────────────────────────────────────────────────────────────

type Screen = 'idle' | 'welcome' | 'firma' | 'done'

interface Prenotazione {
  id: string
  guestNome: string
  camera: string | null
  notti: number
  numOspiti: number
  totale: number
  saldo: number
  regCardFirmata: boolean
}

interface Props {
  strutturaId: string
  struttura: {
    nome: string
    logo: string | null
    colorePrimario: string | null
    coloreSecondario: string | null
    fotoHero: string | null
    messaggioChiusura: string | null
  }
}

const LANGS = [
  { code: 'it', flag: '🇮🇹', welcome: 'Benvenuti', sign: 'Firma per completare il checkout', thanks: 'Grazie e buon viaggio!', start: 'Inizia', confirm: 'Conferma firma', clear: 'Cancella' },
  { code: 'en', flag: '🇬🇧', welcome: 'Welcome', sign: 'Sign to complete your checkout', thanks: 'Thank you and have a great trip!', start: 'Start', confirm: 'Confirm signature', clear: 'Clear' },
  { code: 'de', flag: '🇩🇪', welcome: 'Willkommen', sign: 'Unterschreiben Sie für den Checkout', thanks: 'Vielen Dank und gute Reise!', start: 'Start', confirm: 'Unterschrift bestätigen', clear: 'Löschen' },
  { code: 'fr', flag: '🇫🇷', welcome: 'Bienvenue', sign: 'Signez pour terminer le checkout', thanks: 'Merci et bon voyage !', start: 'Commencer', confirm: 'Confirmer la signature', clear: 'Effacer' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function KioskDisplay({ strutturaId, struttura }: Props) {
  const accent = struttura.colorePrimario || '#4f46e5'
  const [screen, setScreen] = useState<Screen>('idle')
  const [prenotazione, setPrenotazione] = useState<Prenotazione | null>(null)
  const [lang, setLang] = useState(0) // index into LANGS
  const [signing, setSigning] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const t = LANGS[lang]

  // ─── Polling per prenotazione attiva ──────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/reception/display/${strutturaId}`)
      if (!res.ok) return
      const data = await res.json()

      if (data.stato === 'attivo' && data.prenotazione && !data.prenotazione.regCardFirmata) {
        setPrenotazione(data.prenotazione)
        if (screen === 'idle') setScreen('welcome')
      } else if (data.stato === 'idle' && screen !== 'done') {
        setPrenotazione(null)
        setScreen('idle')
      }
    } catch { /* rete down, retry */ }
  }, [strutturaId, screen])

  useEffect(() => {
    poll() // prima chiamata
    pollingRef.current = setInterval(poll, 5000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [poll])

  // ─── Submit firma ─────────────────────────────────────────────────────
  const submitFirma = useCallback(async () => {
    if (!firma || !prenotazione) return
    setSigning(true)
    try {
      await fetch(`/api/reception/display/${strutturaId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenotazioneId: prenotazione.id,
          firmaBase64: firma,
        }),
      })
      setScreen('done')

      // Auto-reset dopo 8 secondi
      timerRef.current = setTimeout(() => {
        setScreen('idle')
        setPrenotazione(null)
        setFirma(null)
        setSigning(false)
      }, 8000)
    } catch {
      setSigning(false)
    }
  }, [firma, prenotazione, strutturaId])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // ─── SCHERMATA IDLE (attesa) ──────────────────────────────────────────
  if (screen === 'idle') {
    return (
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: accent }}>
        {/* Foto hero sfondo */}
        {struttura.fotoHero && (
          <>            <img src={struttura.fotoHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        <div className="relative text-center text-white z-10">
          {struttura.logo ? (
            <img src={struttura.logo} alt={struttura.nome} className="h-20 w-auto mx-auto mb-8 drop-shadow-lg" />
          ) : (
            <h1 className="text-5xl font-extrabold mb-8 drop-shadow-lg">{struttura.nome}</h1>
          )}
          <p className="text-3xl font-light opacity-80">{t.welcome}</p>
        </div>

        {/* Lang switcher in basso */}
        <div className="absolute bottom-8 flex gap-3">
          {LANGS.map((l, i) => (
            <button key={l.code} onClick={() => setLang(i)}
              className={`text-2xl transition-transform ${i === lang ? 'scale-125' : 'opacity-50 hover:opacity-80'}`}>
              {l.flag}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── SCHERMATA BENVENUTO ──────────────────────────────────────────────
  if (screen === 'welcome' && prenotazione) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="welcome"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex flex-col items-center justify-center p-8"
          style={{ backgroundColor: '#fafafa' }}
        >
          {/* Lang switcher */}
          <div className="absolute top-6 right-6 flex gap-2">
            {LANGS.map((l, i) => (
              <button key={l.code} onClick={() => setLang(i)}
                className={`text-xl transition-transform ${i === lang ? 'scale-125' : 'opacity-40'}`}>
                {l.flag}
              </button>
            ))}
          </div>

          {/* Logo */}
          {struttura.logo && (
            <img src={struttura.logo} alt={struttura.nome} className="h-16 w-auto mb-10" />
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center">
            {t.welcome.split(' ')[0]} {prenotazione.guestNome.split(' ')[0]}!
          </h1>

          <p className="text-xl text-gray-500 mb-12 text-center max-w-lg">{t.sign}</p>

          {/* Info prenotazione */}
          {prenotazione.camera && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-10 text-center">
              <p className="text-lg text-gray-700">
                {prenotazione.camera} · {prenotazione.notti} {prenotazione.notti === 1 ? 'notte' : 'notti'}
              </p>
              {prenotazione.saldo > 0 && (
                <p className="text-2xl font-bold mt-2" style={{ color: accent }}>
                  Saldo: €{prenotazione.saldo.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* CTA gigante */}
          <button
            onClick={() => setScreen('firma')}
            className="px-16 py-6 rounded-2xl text-white text-2xl font-bold shadow-xl active:scale-[0.97] transition-transform"
            style={{ backgroundColor: accent, minHeight: 56 }}
          >
            {t.start} →
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ─── SCHERMATA FIRMA ──────────────────────────────────────────────────
  if (screen === 'firma' && prenotazione) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="firma"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="fixed inset-0 flex flex-col bg-white"
        >
          {/* Header compatto */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="text-lg font-bold text-gray-900">{prenotazione.guestNome}</p>
              <p className="text-sm text-gray-500">
                {prenotazione.camera}{prenotazione.saldo > 0 ? ` · Saldo €${prenotazione.saldo.toFixed(2)}` : ''}
              </p>
            </div>
            {struttura.logo && (
              <img src={struttura.logo} alt="" className="h-8 w-auto opacity-50" />
            )}
          </div>

          {/* Pad firma — 60% dello schermo */}
          <div className="flex-1 p-4 flex flex-col">
            <p className="text-base text-gray-500 text-center mb-3">{t.sign}</p>
            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden">
              <SignaturePad
                onSave={base64 => setFirma(base64)}
                onClear={() => setFirma(null)}
              />
            </div>
          </div>

          {/* Bottoni in basso */}
          <div className="flex gap-4 p-6 border-t border-gray-100">
            <button
              onClick={() => { setFirma(null); setScreen('welcome') }}
              className="flex-1 py-5 rounded-2xl border-2 border-gray-200 text-gray-600 text-lg font-semibold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
              style={{ minHeight: 56 }}
            >
              <RotateCcw className="w-5 h-5" /> {t.clear}
            </button>
            <button
              onClick={submitFirma}
              disabled={!firma || signing}
              className="flex-[2] py-5 rounded-2xl text-white text-lg font-bold shadow-lg active:scale-[0.97] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: accent, minHeight: 56 }}
            >
              {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {t.confirm}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ─── SCHERMATA COMPLETATO ─────────────────────────────────────────────
  if (screen === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex flex-col items-center justify-center p-8"
        style={{ backgroundColor: '#fafafa' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <div className="w-28 h-28 rounded-full flex items-center justify-center mb-8"
            style={{ backgroundColor: `${accent}20` }}>
            <Check className="w-14 h-14" style={{ color: accent }} />
          </div>
        </motion.div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">{t.thanks}</h1>

        {struttura.messaggioChiusura && (
          <p className="text-xl text-gray-500 italic text-center max-w-lg mb-6">
            &ldquo;{struttura.messaggioChiusura}&rdquo;
          </p>
        )}

        {/* Countdown bar */}
        <div className="w-48 h-1 bg-gray-200 rounded-full mt-8 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: accent }}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 8, ease: 'linear' }}
          />
        </div>
      </motion.div>
    )
  }

  return null
}
