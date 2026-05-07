'use client'

import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'

interface SplashDefaults {
  titolo?: string
  logoUrl?: string
  slideshowUrls?: string[]
  linkRedirect?: string
  colorePrimario?: string
  coloreSecondario?: string
}

interface Props {
  deviceMac: string
  initialConfig: Record<string, unknown>
  strutturaDefaults: SplashDefaults
}

export default function WifiSplashForm({ deviceMac, initialConfig, strutturaDefaults }: Props) {
  const cfg = initialConfig as {
    titolo?: string
    messaggio?: string
    testoBottone?: string
    linkRedirect?: string
  }

  const [titolo, setTitolo] = useState(cfg.titolo || strutturaDefaults.titolo || '')
  const [messaggio, setMessaggio] = useState(cfg.messaggio || 'Benvenuto, connettiti gratuitamente al Wi-Fi')
  const [testoBottone, setTestoBottone] = useState(cfg.testoBottone || 'Connetti')
  const [linkRedirect, setLinkRedirect] = useState(cfg.linkRedirect || strutturaDefaults.linkRedirect || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    setErr(null)
    try {
      const res = await fetch(`/api/host/wifi/devices/${deviceMac}/splash`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titolo,
          messaggio,
          testoBottone,
          linkRedirect,
          logoUrl: strutturaDefaults.logoUrl,
          slideshowUrls: strutturaDefaults.slideshowUrls,
          colorePrimario: strutturaDefaults.colorePrimario,
          coloreSecondario: strutturaDefaults.coloreSecondario,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Errore salvataggio')
      }
      const data = await res.json()
      setMsg(`Salvato. ${data.queuedCommands} comandi in coda, verranno applicati al prossimo polling dell'agent (~30s).`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-gray-700 uppercase">Personalizza splash page</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Titolo</label>
          <input
            type="text"
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="es. Villa Otium"
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Messaggio di benvenuto</label>
          <textarea
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            rows={3}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Testo pulsante</label>
          <input
            type="text"
            value={testoBottone}
            onChange={(e) => setTestoBottone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            maxLength={30}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Link dopo login</label>
          <input
            type="url"
            value={linkRedirect}
            onChange={(e) => setLinkRedirect(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="https://..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Dove verrà reindirizzato l&apos;ospite dopo la connessione (di default il sito della struttura).
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
          <p className="font-medium mb-1">Branding automatico</p>
          <p>
            Logo, foto hero e colori vengono ripresi automaticamente dalle impostazioni della struttura.
            Per cambiarli, modifica il branding della struttura (non serve farlo qui).
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg font-medium"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva e invia al dispositivo
        </button>

        {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{msg}</p>}
        {err && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</p>}
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-gray-700 uppercase">Anteprima</h3>
        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
          <div
            className="h-32 flex items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: strutturaDefaults.slideshowUrls?.[0]
                ? `url(${strutturaDefaults.slideshowUrls[0]})`
                : undefined,
              backgroundColor: strutturaDefaults.colorePrimario || '#4f46e5',
            }}
          >
            {strutturaDefaults.logoUrl && (
               
              <img src={strutturaDefaults.logoUrl} alt="" className="h-16 drop-shadow" />
            )}
          </div>
          <div className="p-6 space-y-3 text-center bg-white">
            <h4 className="text-xl font-bold">{titolo || 'Titolo'}</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{messaggio}</p>
            <button
              type="button"
              className="inline-block text-white px-6 py-2 rounded-lg font-medium"
              style={{ backgroundColor: strutturaDefaults.colorePrimario || '#4f46e5' }}
            >
              {testoBottone || 'Connetti'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Anteprima approssimativa del captive portal visto dall&apos;ospite.
        </p>
      </div>
    </div>
  )
}
