'use client'

import { useState } from 'react'
import { Shield, Loader2, Check, AlertTriangle, Copy, Download, X } from 'lucide-react'

type SetupData = {
  secret: string
  qrCodeDataUrl: string
  uri: string
}

export function TwoFactorClient({
  email,
  enabled,
  backupCodesRemaining,
}: {
  email: string
  enabled: boolean
  backupCodesRemaining: number
}) {
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'done'>('idle')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disablePwd, setDisablePwd] = useState('')
  const [showDisable, setShowDisable] = useState(false)

  async function startSetup() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore setup')
      setSetupData(data)
      setStep('setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndEnable() {
    if (!/^\d{6}$/.test(code)) {
      setError('Inserisci 6 cifre')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Codice errato')
      setBackupCodes(data.backupCodes)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(false)
    }
  }

  async function disable() {
    if (!disablePwd) {
      setError('Inserisci la tua password per conferma')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
      setLoading(false)
    }
  }

  function downloadBackupCodes() {
    const content = `Otium PMS — Codici di backup 2FA
Account: ${email}
Generati: ${new Date().toLocaleString('it-IT')}

IMPORTANTE: conserva questi codici in un posto sicuro.
Ogni codice funziona UNA SOLA VOLTA e può essere usato al posto del codice TOTP
quando non hai accesso al telefono.

${backupCodes.map((c, i) => `${(i + 1).toString().padStart(2, '0')}. ${c}`).join('\n')}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `otium-backup-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-500" /> Autenticazione a 2 fattori
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Protezione aggiuntiva per l&apos;account <strong>{email}</strong>. Oltre alla
          password, al login verrà richiesto un codice a 6 cifre dall&apos;app Authenticator.
        </p>
      </div>

      {/* STATO ATTUALE */}
      {enabled && step === 'idle' && (
        <div className="card bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                2FA attivo
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Backup code disponibili: <strong>{backupCodesRemaining} / 10</strong>.
                {backupCodesRemaining < 3 && ' Ti consigliamo di rigenerarli.'}
              </p>
            </div>
            <button
              onClick={() => setShowDisable(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100"
            >
              Disattiva
            </button>
          </div>
        </div>
      )}

      {!enabled && step === 'idle' && (
        <div className="card bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                2FA non attivo
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                L&apos;account SUPERADMIN controlla tutta la piattaforma (host, ospiti,
                pagamenti, moduli AI). Attivare 2FA è fortemente raccomandato prima
                del primo cliente pagante.
              </p>
              <button
                onClick={startSetup}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Attiva 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP SETUP: mostra QR */}
      {step === 'setup' && setupData && (
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Passo 1 — Scansiona con l&apos;app Authenticator</h3>
            <p className="text-xs text-gray-500 mt-1">
              Apri Google Authenticator, Authy, 1Password o Microsoft Authenticator sul telefono
              e scansiona questo QR code.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setupData.qrCodeDataUrl} alt="QR 2FA" className="w-56 h-56" />
            <details className="text-xs text-gray-500 w-full">
              <summary className="cursor-pointer hover:text-gray-700">
                Non riesci a scansionare? Mostra secret manuale
              </summary>
              <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg flex items-center gap-2">
                <code className="flex-1 text-[11px] break-all">{setupData.secret}</code>
                <button
                  onClick={() => copyToClipboard(setupData.secret)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                  aria-label="Copia"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </details>
          </div>

          <div>
            <h3 className="font-semibold text-sm">Passo 2 — Inserisci il codice a 6 cifre</h3>
            <p className="text-xs text-gray-500 mt-1">
              L&apos;app ti mostra un codice che cambia ogni 30 secondi. Digitalo qui per
              confermare il setup.
            </p>
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-purple-500 dark:bg-slate-800 dark:text-slate-200"
          />

          {error && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep('idle')}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Annulla
            </button>
            <button
              onClick={verifyAndEnable}
              disabled={loading || code.length !== 6}
              className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Conferma e attiva
            </button>
          </div>
        </div>
      )}

      {/* STEP DONE: backup codes */}
      {step === 'done' && backupCodes.length > 0 && (
        <div className="card space-y-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">2FA attivato!</h3>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              IMPORTANTE — salva i codici di backup
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
              Se perdi il telefono, questi codici sono l&apos;unico modo per entrare.
              Ogni codice funziona <strong>una sola volta</strong>. Stampa questa lista o
              salvala in un password manager SUBITO. Non potrai più rivederla.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg font-mono text-sm">
            {backupCodes.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">{(i + 1).toString().padStart(2, '0')}.</span>
                <span className="tracking-wider">{c}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadBackupCodes}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-100 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Scarica .txt
            </button>
            <button
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-100 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copia
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              Ho salvato, fine
            </button>
          </div>
        </div>
      )}

      {/* MODALE DISATTIVAZIONE */}
      {showDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => { setShowDisable(false); setDisablePwd(''); setError(null) }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg mb-2">Disattiva 2FA</h3>
            <p className="text-xs text-gray-500 mb-4">
              Stai per rimuovere la protezione a 2 fattori. L&apos;account tornerà a solo password.
              Conferma con la tua password.
            </p>
            <input
              type="password"
              value={disablePwd}
              onChange={e => setDisablePwd(e.target.value)}
              placeholder="La tua password"
              className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm dark:bg-slate-800 dark:text-slate-200 mb-3"
            />
            {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDisable(false); setDisablePwd(''); setError(null) }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-semibold"
              >
                Annulla
              </button>
              <button
                onClick={disable}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Disattiva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
