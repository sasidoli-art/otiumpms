'use client'

// TODO: i18n

import { useEffect, useState } from 'react'
import {
  Settings, Save, CheckCircle2, XCircle, Loader2, ExternalLink,
  Shield, Wifi, WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Provider = 'manuale' | 'aruba' | 'fattureincloud'

interface ProviderConfig {
  provider: Provider
  // Aruba
  arubaApiKey: string
  arubaUsername: string
  // FattureInCloud
  ficApiKey: string
  ficCompanyId: string
}

interface DatiFiscali {
  ragioneSociale: string
  partitaIva: string
  codiceFiscale: string
  indirizzo: string
  citta: string
  cap: string
  provincia: string
  regimeFiscale: string
  codiceSDI: string
  pec: string
}

const REGIMI_FISCALI = [
  { value: 'RF01', label: 'RF01 - Ordinario' },
  { value: 'RF02', label: 'RF02 - Contribuenti minimi' },
  { value: 'RF04', label: 'RF04 - Agricoltura' },
  { value: 'RF05', label: 'RF05 - Pesca' },
  { value: 'RF06', label: 'RF06 - Vendita sali e tabacchi' },
  { value: 'RF07', label: 'RF07 - Commercio fiammiferi' },
  { value: 'RF08', label: 'RF08 - Editoria' },
  { value: 'RF09', label: 'RF09 - Gestione servizi telefonia' },
  { value: 'RF10', label: 'RF10 - Rivendita documenti trasporto' },
  { value: 'RF11', label: 'RF11 - Intrattenimenti, giochi e altre attivita' },
  { value: 'RF12', label: 'RF12 - Vendite a domicilio' },
  { value: 'RF13', label: 'RF13 - Rivendita beni usati' },
  { value: 'RF14', label: 'RF14 - Agenzie di viaggi e turismo' },
  { value: 'RF15', label: 'RF15 - Agenzie di vendita all\'asta' },
  { value: 'RF16', label: 'RF16 - IVA per cassa' },
  { value: 'RF17', label: 'RF17 - IVA per cassa P.A.' },
  { value: 'RF18', label: 'RF18 - Altro' },
  { value: 'RF19', label: 'RF19 - Forfettario' },
]

const PROVIDER_INFO: Record<Provider, { name: string; desc: string }> = {
  manuale: {
    name: 'Manuale (XML)',
    desc: 'Scarica il file XML FatturaPA e caricalo manualmente sul portale SDI o sul tuo software di fatturazione.',
  },
  aruba: {
    name: 'Aruba',
    desc: 'Invio automatico tramite API Aruba Fatturazione Elettronica. Richiede un account Aruba con il servizio di fatturazione attivo.',
  },
  fattureincloud: {
    name: 'Fatture in Cloud',
    desc: 'Invio automatico tramite API FattureInCloud by TeamSystem. Richiede un account con piano API attivo.',
  },
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ImpostazioniFatturazione() {
  const [config, setConfig] = useState<ProviderConfig>({
    provider: 'manuale',
    arubaApiKey: '',
    arubaUsername: '',
    ficApiKey: '',
    ficCompanyId: '',
  })
  const [datiFiscali, setDatiFiscali] = useState<DatiFiscali>({
    ragioneSociale: '',
    partitaIva: '',
    codiceFiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    regimeFiscale: 'RF01',
    codiceSDI: '',
    pec: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saved, setSaved] = useState(false)

  // Load existing settings
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/host/fatture/impostazioni')
        if (res.ok) {
          const data = await res.json()
          if (data.provider) {
            setConfig({
              provider: data.provider || 'manuale',
              arubaApiKey: data.arubaApiKey || '',
              arubaUsername: data.arubaUsername || '',
              ficApiKey: data.ficApiKey || '',
              ficCompanyId: data.ficCompanyId || '',
            })
          }
          if (data.datiFiscali) {
            setDatiFiscali(prev => ({ ...prev, ...data.datiFiscali }))
          }
        }
      } catch (err) { console.error(err) 
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/host/fatture/impostazioni', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, datiFiscali }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        alert(data.error || 'Errore nel salvataggio')
      }
    } catch (err) { console.error(err) 
      alert('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/host/fatture/impostazioni/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      setTestResult({
        ok: res.ok,
        message: data.message || (res.ok ? 'Connessione riuscita' : 'Connessione fallita'),
      })
    } catch (err) { console.error(err) 
      setTestResult({ ok: false, message: 'Errore di rete' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <Loader2 size={24} className="animate-spin mx-auto text-gray-400" />
        <p className="text-sm text-gray-500 mt-2">Caricamento impostazioni...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Dati fiscali emittente */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={16} />
          Dati fiscali emittente
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Questi dati verranno utilizzati come cedente/prestatore in tutte le fatture emesse.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Ragione sociale / Nome</label>
            <input
              type="text"
              value={datiFiscali.ragioneSociale}
              onChange={e => setDatiFiscali(prev => ({ ...prev, ragioneSociale: e.target.value }))}
              className="input w-full"
              placeholder="Hotel Bella Vista S.r.l."
            />
          </div>
          <div>
            <label className="label">Partita IVA</label>
            <input
              type="text"
              value={datiFiscali.partitaIva}
              onChange={e => setDatiFiscali(prev => ({ ...prev, partitaIva: e.target.value }))}
              className="input w-full"
              placeholder="IT12345678901"
              maxLength={16}
            />
          </div>
          <div>
            <label className="label">Codice Fiscale</label>
            <input
              type="text"
              value={datiFiscali.codiceFiscale}
              onChange={e => setDatiFiscali(prev => ({ ...prev, codiceFiscale: e.target.value.toUpperCase() }))}
              className="input w-full"
              placeholder="12345678901"
              maxLength={16}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Indirizzo (sede legale)</label>
            <input
              type="text"
              value={datiFiscali.indirizzo}
              onChange={e => setDatiFiscali(prev => ({ ...prev, indirizzo: e.target.value }))}
              className="input w-full"
              placeholder="Via Roma 1"
            />
          </div>
          <div>
            <label className="label">Citta</label>
            <input
              type="text"
              value={datiFiscali.citta}
              onChange={e => setDatiFiscali(prev => ({ ...prev, citta: e.target.value }))}
              className="input w-full"
              placeholder="Roma"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CAP</label>
              <input
                type="text"
                value={datiFiscali.cap}
                onChange={e => setDatiFiscali(prev => ({ ...prev, cap: e.target.value }))}
                className="input w-full"
                placeholder="00100"
                maxLength={5}
              />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input
                type="text"
                value={datiFiscali.provincia}
                onChange={e => setDatiFiscali(prev => ({ ...prev, provincia: e.target.value.toUpperCase() }))}
                className="input w-full"
                placeholder="RM"
                maxLength={2}
              />
            </div>
          </div>
          <div>
            <label className="label">Regime fiscale</label>
            <select
              value={datiFiscali.regimeFiscale}
              onChange={e => setDatiFiscali(prev => ({ ...prev, regimeFiscale: e.target.value }))}
              className="input w-full"
            >
              {REGIMI_FISCALI.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">PEC</label>
            <input
              type="email"
              value={datiFiscali.pec}
              onChange={e => setDatiFiscali(prev => ({ ...prev, pec: e.target.value }))}
              className="input w-full"
              placeholder="azienda@pec.it"
            />
          </div>
        </div>
      </div>

      {/* Provider selection */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings size={16} />
          Provider invio SDI
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Scegli come inviare le fatture al Sistema di Interscambio (SDI).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(Object.keys(PROVIDER_INFO) as Provider[]).map(p => (
            <button
              key={p}
              onClick={() => setConfig(prev => ({ ...prev, provider: p }))}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all',
                config.provider === p
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <p className={cn(
                'font-semibold text-sm',
                config.provider === p ? 'text-brand-700' : 'text-gray-900'
              )}>
                {PROVIDER_INFO[p].name}
              </p>
              <p className="text-xs text-gray-500 mt-1">{PROVIDER_INFO[p].desc}</p>
            </button>
          ))}
        </div>

        {/* Provider-specific fields */}
        {config.provider === 'aruba' && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700">Credenziali Aruba</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Username</label>
                <input
                  type="text"
                  value={config.arubaUsername}
                  onChange={e => setConfig(prev => ({ ...prev, arubaUsername: e.target.value }))}
                  className="input w-full"
                  placeholder="username@aruba.it"
                />
              </div>
              <div>
                <label className="label">API Key</label>
                <input
                  type="password"
                  value={config.arubaApiKey}
                  onChange={e => setConfig(prev => ({ ...prev, arubaApiKey: e.target.value }))}
                  className="input w-full"
                  placeholder="Inserisci API key"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Puoi ottenere le credenziali API dal pannello{' '}
              <a
                href="https://fatturazione.aruba.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline inline-flex items-center gap-0.5"
              >
                Aruba Fatturazione <ExternalLink size={10} />
              </a>
            </p>
          </div>
        )}

        {config.provider === 'fattureincloud' && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700">Credenziali Fatture in Cloud</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">API Key (OAuth2 Access Token)</label>
                <input
                  type="password"
                  value={config.ficApiKey}
                  onChange={e => setConfig(prev => ({ ...prev, ficApiKey: e.target.value }))}
                  className="input w-full"
                  placeholder="Inserisci API key"
                />
              </div>
              <div>
                <label className="label">Company ID</label>
                <input
                  type="text"
                  value={config.ficCompanyId}
                  onChange={e => setConfig(prev => ({ ...prev, ficCompanyId: e.target.value }))}
                  className="input w-full"
                  placeholder="123456"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Puoi ottenere le credenziali API dalla sezione Sviluppatori di{' '}
              <a
                href="https://developers.fattureincloud.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline inline-flex items-center gap-0.5"
              >
                FattureInCloud <ExternalLink size={10} />
              </a>
            </p>
          </div>
        )}

        {/* Test connection */}
        {config.provider !== 'manuale' && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              onClick={handleTest}
              disabled={testing}
              className="btn-secondary text-sm"
            >
              {testing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Test in corso...
                </>
              ) : (
                <>
                  <Wifi size={14} />
                  Testa connessione
                </>
              )}
            </button>

            {testResult && (
              <div className={cn(
                'mt-3 p-3 rounded-lg text-sm flex items-center gap-2',
                testResult.ok
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              )}>
                {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {testResult.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 size={16} />
            Impostazioni salvate
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save size={16} />
              Salva impostazioni
            </>
          )}
        </button>
      </div>
    </div>
  )
}
