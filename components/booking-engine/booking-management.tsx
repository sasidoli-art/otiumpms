'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  BedDouble, Sparkles, UtensilsCrossed, Copy, ExternalLink, QrCode, Download,
  Loader2, Check, CheckCircle2, AlertCircle, Globe, Palette, Upload, Image as ImageIcon,
  Code, Link as LinkIcon, Info,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

// ─── Types ──────────────────────────────────────────────────────────────────

type EngineKey = 'camere' | 'spa' | 'ristorante'

type Engine = {
  key: EngineKey
  label: string
  attivo: boolean
  moduloRichiesto: string
  path: string
  prenotazioniMese: number
}

type Struttura = {
  id: string
  nome: string
  colorePrimario: string | null
  coloreSecondario: string | null
  coloreSfondo: string | null
  coloreTesto: string | null
  fontFamily: string | null
  borderRadius: string | null
  logo: string | null
  fotoHero: string | null
  customDomain: string | null
  customDomainVerificato: boolean
  customDomainVerificatoAt: string | null
}

type State = {
  struttura: Struttura
  strutture: { id: string; nome: string }[]
  engines: Engine[]
  analyticsSupportate: boolean
}

const ICON_BY_KEY: Record<EngineKey, React.ComponentType<{ className?: string }>> = {
  camere: BedDouble,
  spa: Sparkles,
  ristorante: UtensilsCrossed,
}

const FONT_OPTIONS = [
  { label: 'Inter (moderno)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Montserrat (elegante)', value: 'Montserrat, system-ui, sans-serif' },
  { label: 'Playfair Display (lusso)', value: '"Playfair Display", Georgia, serif' },
  { label: 'System default', value: 'system-ui, sans-serif' },
] as const

const RADIUS_OPTIONS = [
  { label: 'Squadrato', value: '4px' },
  { label: 'Arrotondato', value: '8px' },
  { label: 'Molto arrotondato', value: '16px' },
] as const

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

export default function BookingManagement() {
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [strutturaId, setStrutturaId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErrore(null)
    try {
      const url = strutturaId
        ? `/api/host/booking-engine?strutturaId=${strutturaId}`
        : '/api/host/booking-engine'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setErrore(data.error ?? 'Errore caricamento')
      } else {
        setState(data)
        if (!strutturaId) setStrutturaId(data.struttura.id)
      }
    } catch {
      setErrore('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [strutturaId])

  useEffect(() => { load() }, [load])

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'https://otiumweek.com'
    // Il PMS gira su otium-pms.vercel.app; la public facade del brand e`
    // otiumweek.com. L'utente finale del booking engine associa il brand al
    // dominio piu` amichevole, quindi lo usiamo per gli URL condivisibili.
    return 'https://otiumweek.com'
  }, [])

  if (loading && !state) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (errore && !state) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {errore}
        </div>
      </div>
    )
  }

  if (!state) return null

  const publicBase = state.struttura.customDomain && state.struttura.customDomainVerificato
    ? `https://${state.struttura.customDomain}`
    : `${baseUrl}/book/${state.struttura.id}`

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Booking Engine"
        description="Gestisci le tue pagine di prenotazione"
        actions={
          state.strutture.length > 1 ? (
            <select
              value={state.struttura.id}
              onChange={(e) => setStrutturaId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {state.strutture.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          ) : undefined
        }
      />

      {errore && state && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {errore}
        </div>
      )}

      {/* ═══ Engine cards ════════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {state.engines.map((engine) => (
          <EngineCard
            key={engine.key}
            engine={engine}
            struttura={state.struttura}
            publicBase={publicBase}
            analyticsSupportate={state.analyticsSupportate}
          />
        ))}
      </section>

      {/* ═══ Personalizzazione ═════════════════════════════════════ */}
      <BrandingSection
        struttura={state.struttura}
        onSaved={(updated) => setState((s) => (s ? { ...s, struttura: { ...s.struttura, ...updated } } : s))}
        baseUrl={baseUrl}
      />

      {/* ═══ Custom domain ══════════════════════════════════════ */}
      <CustomDomainSection
        struttura={state.struttura}
        onVerified={() => load()}
      />

      {/* ═══ Widget embed ═══════════════════════════════════════ */}
      <EmbedSection
        strutturaId={state.struttura.id}
        engines={state.engines}
        baseUrl={baseUrl}
        colorePrimario={state.struttura.colorePrimario ?? '#6366f1'}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Engine card
// ────────────────────────────────────────────────────────────────────────────

function EngineCard({
  engine, struttura, publicBase, analyticsSupportate,
}: {
  engine: Engine
  struttura: Struttura
  publicBase: string
  analyticsSupportate: boolean
}) {
  const Icon = ICON_BY_KEY[engine.key]
  const [qrOpen, setQrOpen] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const url = `${publicBase}/${engine.key}`

  async function showQr() {
    setQrOpen(true)
    if (!qr) {
      const img = await QRCode.toDataURL(url, { width: 400, margin: 2, errorCorrectionLevel: 'M' })
      setQr(img)
    }
  }

  async function downloadQr() {
    const img = qr ?? await QRCode.toDataURL(url, { width: 600, margin: 2 })
    const a = document.createElement('a')
    a.href = img
    a.download = `qr-${engine.key}-${struttura.id}.png`
    a.click()
  }

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 ${engine.attivo ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900">{engine.label}</h3>
            <p className="text-[11px] text-gray-500">
              {engine.attivo ? 'Attivo' : `Modulo ${engine.moduloRichiesto} disattivato`}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            engine.attivo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-500'
          }`}
        >
          {engine.attivo ? 'ON' : 'OFF'}
        </span>
      </div>

      {engine.attivo && (
        <>
          {/* URL */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-700 truncate" title={url}>
            {url}
          </div>

          {/* Actions */}
          <div className="flex gap-1 flex-wrap">
            <IconButton icon={<Copy className="w-3.5 h-3.5" />} label="Copia" onClick={() => copy(url)} />
            <IconButton icon={<ExternalLink className="w-3.5 h-3.5" />} label="Apri" as="a" href={url} target="_blank" />
            <IconButton icon={<QrCode className="w-3.5 h-3.5" />} label="QR" onClick={showQr} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
            <Stat
              label="Visite"
              value={analyticsSupportate ? '0' : '—'}
              hint={!analyticsSupportate ? 'Richiede Analytics' : undefined}
            />
            <Stat label="Prenotaz." value={String(engine.prenotazioniMese)} hint="Questo mese" />
            <Stat
              label="Conv."
              value="—"
              hint="Con Analytics"
            />
          </div>
        </>
      )}

      {!engine.attivo && (
        <a
          href="/host/moduli"
          className="mt-auto text-center text-xs font-semibold text-indigo-600 hover:underline"
        >
          Attiva modulo →
        </a>
      )}

      {/* QR modal */}
      {qrOpen && (
        <div
          role="dialog"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setQrOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <h4 className="font-semibold text-gray-900 mb-3">QR Code — {engine.label}</h4>
            {qr ? <img src={qr} alt="QR" className="mx-auto w-64 h-64" /> : <Loader2 className="w-5 h-5 mx-auto animate-spin text-gray-400" />}
            <p className="text-xs text-gray-500 mt-3 break-all">{url}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setQrOpen(false)} className="flex-1 px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg">
                Chiudi
              </button>
              <button onClick={downloadQr} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg">
                <Download className="w-3.5 h-3.5" /> PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      {hint && <p className="text-[9px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Branding section (+ live preview)
// ────────────────────────────────────────────────────────────────────────────

function BrandingSection({
  struttura, onSaved, baseUrl,
}: {
  struttura: Struttura
  onSaved: (s: Partial<Struttura>) => void
  baseUrl: string
}) {
  const [form, setForm] = useState({
    colorePrimario: struttura.colorePrimario ?? '#6366f1',
    coloreSecondario: struttura.coloreSecondario ?? '#818cf8',
    fontFamily: struttura.fontFamily ?? 'Inter, system-ui, sans-serif',
    borderRadius: struttura.borderRadius ?? '8px',
    logo: struttura.logo ?? '',
    fotoHero: struttura.fotoHero ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [uploading, setUploading] = useState<'logo' | 'fotoHero' | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function uploadImage(file: File, target: 'logo' | 'fotoHero') {
    if (!file.type.startsWith('image/')) {
      setFeedback({ ok: false, msg: 'Formato immagine non valido' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ ok: false, msg: 'Immagine troppo grande (max 2MB)' })
      return
    }
    setUploading(target)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read fail'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/host/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, context: `booking-engine/${target}` }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Upload fallito')
      set(target, j.url)
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : 'Upload fallito' })
    } finally {
      setUploading(null)
    }
  }

  async function salva() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/host/booking-engine/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strutturaId: struttura.id,
          colorePrimario: form.colorePrimario,
          coloreSecondario: form.coloreSecondario,
          fontFamily: form.fontFamily,
          borderRadius: form.borderRadius,
          logo: form.logo || null,
          fotoHero: form.fotoHero || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setFeedback({ ok: false, msg: j.error ?? 'Salvataggio fallito' })
      } else {
        setFeedback({ ok: true, msg: 'Personalizzazione salvata' })
        onSaved(j.struttura)
      }
    } catch {
      setFeedback({ ok: false, msg: 'Errore di rete' })
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = `${baseUrl}/book/${struttura.id}/camere?embed=preview`

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Personalizzazione</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Form ───────────────────────────── */}
        <div className="space-y-4">
          <ColorField label="Colore primario" value={form.colorePrimario} onChange={(v) => set('colorePrimario', v)} />
          <ColorField label="Colore secondario" value={form.coloreSecondario} onChange={(v) => set('coloreSecondario', v)} />

          <Field label="Border radius">
            <select
              value={form.borderRadius}
              onChange={(e) => set('borderRadius', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {RADIUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label} ({o.value})</option>
              ))}
            </select>
          </Field>

          <Field label="Font">
            <select
              value={form.fontFamily}
              onChange={(e) => set('fontFamily', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <UploadField
            label="Logo"
            value={form.logo}
            uploading={uploading === 'logo'}
            onFile={(f) => uploadImage(f, 'logo')}
            onClear={() => set('logo', '')}
          />
          <UploadField
            label="Foto hero (landing + email)"
            value={form.fotoHero}
            uploading={uploading === 'fotoHero'}
            onFile={(f) => uploadImage(f, 'fotoHero')}
            onClear={() => set('fotoHero', '')}
          />

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={salva}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg disabled:opacity-60 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salva personalizzazione
            </button>
            {feedback && (
              <span className={`text-xs ${feedback.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                {feedback.msg}
              </span>
            )}
          </div>
        </div>

        {/* ── Preview live ─────────────────────── */}
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
          <div className="bg-gray-100 px-3 py-2 text-[11px] font-mono text-gray-500 truncate border-b border-gray-200">
            {previewUrl}
          </div>
          <iframe
            key={`${form.colorePrimario}-${form.fontFamily}-${form.borderRadius}-${form.logo}`}
            src={previewUrl}
            className="w-full h-[460px] bg-white"
            title="Anteprima booking engine"
          />
          <p className="text-[11px] text-gray-500 px-3 py-2 border-t border-gray-200 bg-white">
            L&apos;anteprima si aggiorna quando salvi. I colori mostrati sono quelli attualmente salvati.
          </p>
        </div>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-gray-200 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
          placeholder="#6366f1"
        />
      </div>
    </Field>
  )
}

function UploadField({
  label, value, uploading, onFile, onClear,
}: {
  label: string
  value: string
  uploading: boolean
  onFile: (f: File) => void
  onClear: () => void
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="flex items-center gap-2 flex-1">            <img src={value} alt="" className="w-10 h-10 rounded border border-gray-200 object-cover bg-gray-50" />
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Rimuovi
            </button>
          </div>
        ) : (
          <div className="w-10 h-10 rounded border border-dashed border-gray-200 flex items-center justify-center text-gray-300">
            <ImageIcon className="w-4 h-4" />
          </div>
        )}
        <label className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Caricamento…' : 'Carica'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = '' }}
          />
        </label>
      </div>
    </Field>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Custom domain
// ────────────────────────────────────────────────────────────────────────────

function CustomDomainSection({
  struttura, onVerified,
}: {
  struttura: Struttura
  onVerified: () => void
}) {
  const [domain, setDomain] = useState(struttura.customDomain ?? '')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string; details?: string } | null>(null)

  async function verify() {
    setVerifying(true)
    setResult(null)
    try {
      const res = await fetch('/api/host/booking-engine/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strutturaId: struttura.id, domain: domain.trim().toLowerCase() }),
      })
      const j = await res.json()
      if (!res.ok) {
        setResult({ ok: false, msg: j.error ?? 'Errore' })
      } else if (j.verified) {
        setResult({
          ok: true,
          msg: 'DNS configurato correttamente',
          details: j.prossimiPassi ?? undefined,
        })
        onVerified()
      } else {
        setResult({
          ok: false,
          msg: j.error ?? 'DNS non verificato',
          details: j.foundRecords?.length
            ? `CNAME trovati: ${j.foundRecords.join(', ')}`
            : undefined,
        })
      }
    } catch {
      setResult({ ok: false, msg: 'Errore di rete' })
    } finally {
      setVerifying(false)
    }
  }

  const cnameTarget = 'cname.otiumweek.com'

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Custom domain</h2>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Avanzato</span>
      </div>

      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Collega un tuo sottodominio (es. <code className="px-1 py-0.5 bg-gray-100 rounded text-[12px]">prenota.villamargherita.it</code>) alle tue pagine di prenotazione.
      </p>

      {/* Istruzioni DNS */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2 mb-4">
        <p className="font-semibold text-gray-900">Configurazione DNS</p>
        <p className="text-gray-600">Dal pannello del tuo provider, aggiungi un record CNAME:</p>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[12px] mt-2">
          <span className="text-gray-500">Tipo:</span>
          <span className="text-gray-900">CNAME</span>
          <span className="text-gray-500">Host:</span>
          <span className="text-gray-900">il tuo sottodominio (es. <code>prenota</code>)</span>
          <span className="text-gray-500">Valore:</span>
          <span className="text-gray-900">{cnameTarget}</span>
        </div>
      </div>

      {/* Input + verify */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="prenota.villamargherita.it"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <button
          type="button"
          onClick={verify}
          disabled={verifying || !domain.trim()}
          className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Verifica DNS
        </button>
      </div>

      {/* Stato attuale */}
      {struttura.customDomain && (
        <div className="mt-4 flex items-start gap-2 text-sm">
          {struttura.customDomainVerificato ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-700 font-semibold">{struttura.customDomain} — Verificato</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Il DNS è pronto. Il dominio deve anche essere aggiunto su Vercel per rispondere. Contatta il supporto se il booking non è ancora raggiungibile su quel dominio.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-700">{struttura.customDomain} — DNS non ancora verificato</p>
            </>
          )}
        </div>
      )}

      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <p className="font-semibold">{result.msg}</p>
          {result.details && <p className="text-xs mt-1 opacity-80">{result.details}</p>}
        </div>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Embed widget
// ────────────────────────────────────────────────────────────────────────────

function EmbedSection({
  strutturaId, engines, baseUrl, colorePrimario,
}: {
  strutturaId: string
  engines: Engine[]
  baseUrl: string
  colorePrimario: string
}) {
  const [selectedKey, setSelectedKey] = useState<EngineKey>(
    (engines.find((e) => e.attivo)?.key as EngineKey | undefined) ?? 'camere',
  )
  const url = `${baseUrl}/book/${strutturaId}/${selectedKey}`

  const iframeCode = `<iframe
  src="${url}"
  width="100%"
  height="700"
  frameborder="0"
  style="border:0; border-radius: 8px;"
  title="Prenota"
></iframe>`

  const popupCode = `<script
  src="${baseUrl}/embed.js"
  data-struttura="${strutturaId}"
  data-type="${selectedKey}"
  data-color="${colorePrimario}"
></script>`

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Code className="w-4 h-4 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">Integra sul tuo sito</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {engines.map((e) => (
          <button
            key={e.key}
            type="button"
            disabled={!e.attivo}
            onClick={() => setSelectedKey(e.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
              selectedKey === e.key && e.attivo
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <EmbedBlock
          title="1. Iframe classico"
          description="Integra il booking in una pagina del tuo sito."
          icon={<Code className="w-3.5 h-3.5" />}
          code={iframeCode}
        />
        <EmbedBlock
          title="2. Bottone popup"
          description="Aggiungi un bottone &ldquo;Prenota ora&rdquo; fisso in basso a destra che apre il booking in overlay."
          icon={<Code className="w-3.5 h-3.5" />}
          code={popupCode}
        />
        <EmbedBlock
          title="3. Link diretto"
          description="Da condividere via email, social o WhatsApp."
          icon={<LinkIcon className="w-3.5 h-3.5" />}
          code={url}
          single
        />
      </div>

      <div className="mt-5 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500" />
        <p>
          I codici embed puntano sempre al dominio principale. Se configuri un custom domain verificato, sostituiscilo nelle integrazioni esistenti per un&apos;esperienza fully-branded.
        </p>
      </div>
    </section>
  )
}

function EmbedBlock({
  title, description, icon, code, single,
}: {
  title: string
  description: string
  icon: React.ReactNode
  code: string
  single?: boolean
}) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        <button
          type="button"
          onClick={() => copy(code)}
          className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
        >
          <Copy className="w-3 h-3" /> Copia
        </button>
      </div>
      <p className="px-3 pt-2 text-xs text-gray-500">{description}</p>
      <pre className={`px-3 pb-3 pt-2 text-[11px] font-mono text-gray-700 overflow-x-auto ${single ? 'whitespace-nowrap' : 'whitespace-pre-wrap'}`}>
        {code}
      </pre>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Small UI helpers
// ────────────────────────────────────────────────────────────────────────────

function IconButton(props: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  as?: 'a'
  href?: string
  target?: string
}) {
  const className = 'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50'
  if (props.as === 'a') {
    return (
      <a href={props.href} target={props.target} rel="noopener noreferrer" className={className}>
        {props.icon} {props.label}
      </a>
    )
  }
  return (
    <button type="button" onClick={props.onClick} className={className}>
      {props.icon} {props.label}
    </button>
  )
}

function copy(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => { /* noop */ })
  }
}
