'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wifi, KeyRound, Users, Trash2, Copy, Check, Loader2,
  Clock, UserCheck, Ticket, AlertCircle, Settings, Save, Globe, Mail,
} from 'lucide-react'

type AccessCode = {
  id: string
  codice: string
  durataMinuti: number
  usiMax: number
  usiEffettuati: number
  validoFino: string
  note: string | null
  revocatoAt: string | null
  createdAt: string
}

type Session = {
  id: string
  tipo: 'PRENOTAZIONE' | 'CODICE' | 'COMPLIMENTARY' | 'USER_FORM'
  guestNome: string
  guestCognome: string | null
  numeroCamera: string | null
  ipClient: string | null
  macClient: string | null
  startAt: string
  expiresAt: string
  revokedAt: string | null
  accessCode: { codice: string } | null
}

const PRESETS = [
  { label: '1 ora',    durataMinuti: 60,    usiMax: 1,  validGiorni: 1 },
  { label: '24 ore',   durataMinuti: 1440,  usiMax: 1,  validGiorni: 1 },
  { label: '1 giorno (5 usi)', durataMinuti: 1440, usiMax: 5, validGiorni: 1 },
  { label: '1 settimana', durataMinuti: 10080, usiMax: 1, validGiorni: 7 },
  { label: '30 giorni', durataMinuti: 43200, usiMax: 1, validGiorni: 30 },
]

type WifiConfig = {
  authPms: boolean
  authCode: boolean
  authComplimentary: boolean
  complimentaryMins: number
  authUserForm: boolean
  authEmailOnly: boolean
  authSocial: boolean
  redirectUrl: string | null
  welcomeMessage: string | null
}

export default function WifiClient({
  hostNome, loginUrl, wifiConfig,
}: {
  hostId: string
  hostNome: string
  loginUrl: string
  wifiConfig?: WifiConfig
}) {
  const [tab, setTab] = useState<'codes' | 'sessions' | 'config'>('codes')
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const loadCodes = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/host/wifi/access-codes')
      if (!res.ok) throw new Error('Errore caricamento codici')
      const data = await res.json()
      setCodes(data.codes ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally { setLoading(false) }
  }, [])

  const loadSessions = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/host/wifi/sessions?days=30')
      if (!res.ok) throw new Error('Errore caricamento sessioni')
      const data = await res.json()
      setSessions(data.sessions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'codes') loadCodes()
    else loadSessions()
  }, [tab, loadCodes, loadSessions])

  async function generaCodice(preset: typeof PRESETS[number]) {
    setGenerating(true); setError(null)
    try {
      const res = await fetch('/api/host/wifi/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durataMinuti: preset.durataMinuti,
          usiMax: preset.usiMax,
          validGiorni: preset.validGiorni,
          note: preset.label,
        }),
      })
      if (!res.ok) throw new Error('Errore generazione codice')
      await loadCodes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally { setGenerating(false) }
  }

  async function revocaCodice(id: string) {
    if (!confirm('Revocare questo codice? L\'azione non e\' reversibile.')) return
    try {
      const res = await fetch(`/api/host/wifi/access-codes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore revoca')
      await loadCodes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    }
  }

  function copyCode(codice: string) {
    navigator.clipboard.writeText(codice)
    setCopiedCode(codice)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  function copyUrl() {
    navigator.clipboard.writeText(loginUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wi-Fi Ospiti</h1>
            <p className="text-sm text-gray-500">{hostNome}</p>
          </div>
        </div>
      </div>

      {/* URL pagina pubblica login */}
      <div className="card border-l-4 border-l-indigo-400">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Pagina login ospiti</p>
            <p className="text-sm font-mono text-gray-700 truncate">{loginUrl}</p>
            <p className="text-xs text-gray-400 mt-1">
              Gli ospiti apriranno questa pagina per autenticarsi (tramite codice walk-in o nome+camera).
            </p>
          </div>
          <button
            onClick={copyUrl}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
          >
            {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedUrl ? 'Copiato' : 'Copia URL'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('codes')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'codes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Ticket className="w-4 h-4" /> Codici walk-in
        </button>
        <button
          onClick={() => setTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'sessions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" /> Log accessi
        </button>
        <button
          onClick={() => setTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'config'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" /> Autenticazione
        </button>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {tab === 'codes' && (
        <div className="space-y-4">
          {/* Preset buttons */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-500" /> Genera nuovo codice
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => generaCodice(p)}
                  disabled={generating}
                  className="px-3 py-2 text-xs font-medium bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            {generating && (
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Genero codice...
              </div>
            )}
          </div>

          {/* Codes list */}
          {loading ? (
            <div className="card py-12 flex items-center justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : codes.length === 0 ? (
            <div className="card py-12 flex flex-col items-center gap-2 text-gray-400">
              <Ticket className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nessun codice attivo</p>
            </div>
          ) : (
            <div className="card divide-y divide-gray-100">
              {codes.map(c => {
                const esaurito = c.usiMax > 0 && c.usiEffettuati >= c.usiMax
                const scaduto = new Date(c.validoFino) < new Date()
                const revocato = !!c.revocatoAt
                const attivo = !esaurito && !scaduto && !revocato
                return (
                  <div key={c.id} className="py-3 flex items-center gap-4 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyCode(c.codice)}
                          className="font-mono text-lg font-bold text-gray-900 hover:text-indigo-600 transition-colors"
                          title="Clicca per copiare"
                        >
                          {c.codice}
                        </button>
                        {copiedCode === c.codice && (
                          <span className="text-xs text-green-600 font-medium">Copiato!</span>
                        )}
                        {attivo && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">ATTIVO</span>
                        )}
                        {revocato && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">REVOCATO</span>
                        )}
                        {!revocato && scaduto && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">SCADUTO</span>
                        )}
                        {!revocato && !scaduto && esaurito && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">ESAURITO</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{c.note || 'Codice'}</span>
                        <span>·</span>
                        <span>{formatDuration(c.durataMinuti)}</span>
                        <span>·</span>
                        <span>{c.usiEffettuati}/{c.usiMax > 0 ? c.usiMax : '∞'} usi</span>
                        <span>·</span>
                        <span>valido fino {new Date(c.validoFino).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                    {attivo && (
                      <button
                        onClick={() => revocaCodice(c.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Revoca"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="card bg-blue-50 border-blue-200 text-blue-800 text-xs flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Compliance Pisanu/GDPR</strong>: i log accessi Wi-Fi sono conservati 6 mesi come richiesto
              dalla normativa italiana. Mostriamo qui gli ultimi 30 giorni.
            </div>
          </div>

          {loading ? (
            <div className="card py-12 flex items-center justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="card py-12 flex flex-col items-center gap-2 text-gray-400">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nessuna sessione registrata</p>
            </div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Ospite</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Dettagli</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">IP</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Inizio</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Scadenza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5">
                          {s.tipo === 'PRENOTAZIONE' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              <UserCheck className="w-3 h-3" /> Prenotazione
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                              <Ticket className="w-3 h-3" /> Codice
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 font-medium text-gray-900">
                          {s.guestNome} {s.guestCognome || ''}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs">
                          {s.numeroCamera ? `Camera ${s.numeroCamera}` : s.accessCode?.codice || '—'}
                        </td>
                        <td className="py-2.5 font-mono text-xs text-gray-400">
                          {s.ipClient || '—'}
                        </td>
                        <td className="py-2.5 text-right text-xs text-gray-500">
                          {new Date(s.startAt).toLocaleString('it-IT')}
                        </td>
                        <td className="py-2.5 text-right text-xs text-gray-500">
                          {new Date(s.expiresAt).toLocaleString('it-IT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'config' && <WifiAuthConfig initial={wifiConfig} />}
    </div>
  )
}

// ─── Componente config autenticazione ────────────────────────────────────────

function WifiAuthConfig({ initial }: { initial?: WifiConfig }) {
  const [cfg, setCfg] = useState<WifiConfig>(initial ?? {
    authPms: true, authCode: true, authComplimentary: false,
    complimentaryMins: 120, authUserForm: false, authEmailOnly: false, authSocial: false,
    redirectUrl: null, welcomeMessage: null,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function salva() {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wifiAuthPms: cfg.authPms,
          wifiAuthCode: cfg.authCode,
          wifiAuthComplimentary: cfg.authComplimentary,
          wifiComplimentaryMins: cfg.complimentaryMins,
          wifiAuthUserForm: cfg.authUserForm,
          wifiAuthEmailOnly: cfg.authEmailOnly,
          wifiAuthSocial: cfg.authSocial,
          wifiRedirectUrl: cfg.redirectUrl || null,
          wifiWelcomeMessage: cfg.welcomeMessage || null,
        }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } catch {}
    setSaving(false)
  }

  const toggle = 'relative inline-flex items-center h-6 w-11 rounded-full transition-colors cursor-pointer'
  const toggleDot = 'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform'
  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

  function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
        <button type="button" onClick={() => onChange(!on)}
          className={`${toggle} ${on ? 'bg-indigo-600' : 'bg-gray-300'} shrink-0 mt-0.5`}>
          <span className={`${toggleDot} ${on ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Metodi di autenticazione</h3>
        <p className="text-xs text-gray-500 mt-1">
          Attiva/disattiva i metodi di login nella pagina Wi-Fi ospiti. Almeno un metodo deve essere attivo.
        </p>
      </div>

      <div className="space-y-2">
        <Toggle on={cfg.authPms} label="Camera + Cognome (PMS)"
          desc="L'ospite inserisce numero camera e cognome. Validato contro le prenotazioni attive."
          onChange={v => setCfg(c => ({ ...c, authPms: v }))} />

        <Toggle on={cfg.authCode} label="Codice di accesso"
          desc="Codice alfanumerico fornito dalla reception o stampato sullo scontrino."
          onChange={v => setCfg(c => ({ ...c, authCode: v }))} />

        <Toggle on={cfg.authComplimentary} label="Accesso gratuito a tempo"
          desc={`Accesso libero per ${cfg.complimentaryMins} minuti, nessuna registrazione. Ideale per bar, negozi, sale d'attesa.`}
          onChange={v => setCfg(c => ({ ...c, authComplimentary: v }))} />

        {cfg.authComplimentary && (
          <div className="ml-14 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <label className="text-xs font-medium text-gray-700 dark:text-slate-300">Durata accesso gratuito (minuti)</label>
            <input type="number" min={5} max={1440} value={cfg.complimentaryMins}
              onChange={e => setCfg(c => ({ ...c, complimentaryMins: parseInt(e.target.value) || 120 }))}
              className={`${inp} mt-1 w-32`} />
            <p className="text-[11px] text-gray-400 mt-1">Dopo la scadenza, l&apos;ospite deve riconnettersi.</p>
          </div>
        )}

        <Toggle on={cfg.authUserForm} label="Registrazione (nome + email)"
          desc="L'ospite compila un form con nome e email. Utile per lead generation e marketing."
          onChange={v => setCfg(c => ({ ...c, authUserForm: v }))} />

        <Toggle on={cfg.authEmailOnly} label="Login con email prenotazione"
          desc="L'ospite inserisce solo l'email della prenotazione — il sistema cerca un soggiorno attivo corrispondente."
          onChange={v => setCfg(c => ({ ...c, authEmailOnly: v }))} />

        <Toggle on={cfg.authSocial} label="Social Login (Google, Facebook)"
          desc="Login con account social. Richiede configurazione OAuth (disponibile a breve)."
          onChange={v => setCfg(c => ({ ...c, authSocial: v }))} />
        {cfg.authSocial && (
          <div className="ml-14 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            Social login sarà disponibile in un prossimo aggiornamento. Il toggle viene salvato per quando sarà attivo.
          </div>
        )}
      </div>

      <hr className="border-gray-200 dark:border-slate-700" />

      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Personalizzazione</h3>

        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-slate-300">Messaggio di benvenuto</label>
          <input type="text" value={cfg.welcomeMessage ?? ''} placeholder="Benvenuto. Connettiti alla nostra rete Wi-Fi gratuita."
            onChange={e => setCfg(c => ({ ...c, welcomeMessage: e.target.value || null }))}
            className={`${inp} mt-1`} />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-slate-300">Redirect dopo il login (URL)</label>
          <input type="url" value={cfg.redirectUrl ?? ''} placeholder="https://www.miohotel.it"
            onChange={e => setCfg(c => ({ ...c, redirectUrl: e.target.value || null }))}
            className={`${inp} mt-1`} />
          <p className="text-[11px] text-gray-400 mt-1">Dopo il login, l&apos;ospite viene mandato a questo URL. Lascia vuoto per mostrare la pagina &quot;Connesso!&quot;.</p>
        </div>
      </div>

      <button onClick={salva} disabled={saving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          saved ? 'bg-green-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        } disabled:opacity-50`}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Salvo...' : saved ? 'Salvato!' : 'Salva configurazione'}
      </button>
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`
  return `${Math.round(minutes / 1440)} g`
}
