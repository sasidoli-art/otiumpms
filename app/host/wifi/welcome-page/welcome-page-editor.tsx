'use client'

import { useState, useEffect, useRef } from 'react'
import type { SplashConfig } from '@/lib/wifi/splash-config'

interface Props {
  hostNomeAzienda: string
  initialConfig: SplashConfig
  initialHtml: string
}

export default function WelcomePageEditor({ hostNomeAzienda, initialConfig, initialHtml }: Props) {
  const [config, setConfig] = useState<SplashConfig>(initialConfig)
  const [html, setHtml] = useState(initialHtml)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const renderPreview = async (cfg: SplashConfig) => {
    try {
      const res = await fetch('/api/host/wifi/splash-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'errore' }))
        setErrorMsg(data.error || `HTTP ${res.status}`)
        return
      }
      const data = await res.json()
      setHtml(data.html)
      setSavedAt(new Date())
      setErrorMsg(null)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'errore di rete')
    }
  }

  function patch<K extends keyof SplashConfig>(k: K, v: SplashConfig[K]) {
    const next = { ...config, [k]: v }
    setConfig(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaving(true)
    debounceRef.current = setTimeout(async () => {
      await renderPreview(next)
      setSaving(false)
    }, 800)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Welcome page Wi-Fi</h1>
            <p className="text-xs text-gray-500">{hostNomeAzienda} · modifiche salvate automaticamente</p>
          </div>
          <div className="text-xs text-gray-500">
            {saving ? 'Salvando…' : savedAt ? `✓ salvato ${savedAt.toLocaleTimeString('it-IT')}` : ''}
            {errorMsg && <span className="text-red-600 ml-2">⚠ {errorMsg}</span>}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Section title="Brand & identità">
            <Field label="Titolo principale" value={config.titolo ?? ''} onChange={v => patch('titolo', v)} placeholder={hostNomeAzienda} />
            <Field label="Sottotitolo" value={config.sottotitolo ?? ''} onChange={v => patch('sottotitolo', v)} placeholder="Wi-Fi gratuito per ospiti" />
            <Field label="URL logo (PNG/SVG)" value={config.logoUrl ?? ''} onChange={v => patch('logoUrl', v)} placeholder="https://cdn.tuosito.it/logo.png" />
            <FieldNumber label="Altezza logo (px)" value={config.logoHeight ?? 60} onChange={v => patch('logoHeight', v)} min={20} max={200} />
            <Field label="Messaggio di benvenuto" value={config.messaggioWelcome ?? ''} onChange={v => patch('messaggioWelcome', v)} placeholder="es. Benvenuto. Inserisci il codice ricevuto al check-in." textarea />
          </Section>

          <Section title="Colori & sfondo">
            <FieldColor label="Colore primario" value={config.colorePrimario ?? '#4f46e5'} onChange={v => patch('colorePrimario', v)} />
            <FieldColor label="Colore sfondo" value={config.coloreSfondo ?? '#f3f4f6'} onChange={v => patch('coloreSfondo', v)} />
            <FieldColor label="Colore testo" value={config.coloreTesto ?? '#111827'} onChange={v => patch('coloreTesto', v)} />
            <Field label="URL immagine sfondo (opzionale)" value={config.sfondoImmagineUrl ?? ''} onChange={v => patch('sfondoImmagineUrl', v)} placeholder="https://cdn.tuosito.it/sfondo.jpg" />
          </Section>

          <Section title="Form di login">
            <Field label="Testo bottone" value={config.testoBottone ?? ''} onChange={v => patch('testoBottone', v)} placeholder="Connetti al Wi-Fi" />
            <Field label="Etichetta tab «codice»" value={config.labelTabCodice ?? ''} onChange={v => patch('labelTabCodice', v)} placeholder="Ho un codice" />
            <Field label="Etichetta tab «prenotazione»" value={config.labelTabPrenotazione ?? ''} onChange={v => patch('labelTabPrenotazione', v)} placeholder="Sono ospite" />
            <FieldToggle label="Mostra tab «codice»" value={config.mostraTabCodice !== false} onChange={v => patch('mostraTabCodice', v)} />
            <FieldToggle label="Mostra tab «prenotazione»" value={config.mostraTabPrenotazione !== false} onChange={v => patch('mostraTabPrenotazione', v)} />
          </Section>

          <Section title="Dopo il login">
            <Field label="Titolo pagina connesso" value={config.successTitolo ?? ''} onChange={v => patch('successTitolo', v)} placeholder="Connesso!" />
            <Field label="Messaggio pagina connesso" value={config.successMessaggio ?? ''} onChange={v => patch('successMessaggio', v)} placeholder="Sei connesso al Wi-Fi. Buona navigazione." />
            <Field label="URL redirect post-login (opzionale)" value={config.urlRedirectPostLogin ?? ''} onChange={v => patch('urlRedirectPostLogin', v)} placeholder="https://www.tuosito.it" />
          </Section>

          <Section title="Footer & legale">
            <Field label="Testo footer" value={config.testoFooter ?? ''} onChange={v => patch('testoFooter', v)} placeholder="Log accessi conservati 6 mesi - GDPR" />
            <Field label="URL Termini e Condizioni" value={config.urlTermsConditions ?? ''} onChange={v => patch('urlTermsConditions', v)} placeholder="https://www.tuosito.it/termini" />
            <Field label="URL Privacy Policy" value={config.urlPrivacyPolicy ?? ''} onChange={v => patch('urlPrivacyPolicy', v)} placeholder="https://www.tuosito.it/privacy" />
          </Section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <strong>Propagazione al router:</strong> le modifiche vengono applicate alla pagina captive entro <strong>5 minuti</strong> (prossimo sync).
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="bg-gray-200 rounded-2xl p-4 shadow-inner">
            <div className="text-xs text-center text-gray-500 mb-2">📱 Anteprima telefono</div>
            <div className="bg-black rounded-[28px] p-2 mx-auto" style={{ maxWidth: 380 }}>
              <iframe
                srcDoc={html}
                title="Captive portal preview"
                className="w-full bg-white rounded-[20px] block"
                style={{ height: 640, border: 0 }}
              />
            </div>
            <p className="text-center text-xs text-gray-500 mt-3">
              L&apos;anteprima si aggiorna automaticamente mentre modifichi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-sm" />
      }
    </div>
  )
}

function FieldColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded cursor-pointer border" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono" />
      </div>
    </div>
  )
}

function FieldNumber({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} className="w-full px-3 py-2 border rounded-lg text-sm" />
    </div>
  )
}

function FieldToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 cursor-pointer" />
      <span className="text-sm">{label}</span>
    </label>
  )
}
