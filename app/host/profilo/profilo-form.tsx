'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

interface Props {
  host: {
    id: string
    nomeAzienda: string
    partitaIva: string | null
    codiceFiscale: string | null
    telefono: string | null
    sitoWeb: string | null
    indirizzo: string | null
    citta: string | null
    provincia: string | null
    cap: string | null
    regione: string | null
    fattNomeAzienda: string | null
    fattPartitaIva: string | null
    fattIndirizzo: string | null
    fattCitta: string | null
    fattCap: string | null
    fattProvincia: string | null
    fattEmail: string | null
    fattPec: string | null
    fattCodiceSDI: string | null
    regimeFiscale: string | null
    smtpHost: string | null
    smtpPort: number | null
    smtpUser: string | null
    smtpPass: string | null
    emailMittente: string | null
  }
  user: { nome: string; cognome: string; email: string }
}

export function ProfiloForm({ host, user }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [successo, setSuccesso] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore('')
    setSuccesso(false)
    setLoading(true)

    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) setErrore(json.error || 'Errore')
      else {
        setSuccesso(true)
        router.refresh()
      }
    } catch {
      setErrore('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dati personali */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Dati personali</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome</label>
            <input name="nome" className="input" defaultValue={user.nome} required />
          </div>
          <div>
            <label className="label">Cognome</label>
            <input name="cognome" className="input" defaultValue={user.cognome} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Email (non modificabile)</label>
            <input className="input bg-gray-50 text-gray-400" value={user.email} disabled />
          </div>
        </div>
      </div>

      {/* Dati azienda */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Dati azienda</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Nome azienda / organizzazione *</label>
            <input name="nomeAzienda" className="input" defaultValue={host.nomeAzienda} required />
          </div>
          <div>
            <label className="label">Partita IVA</label>
            <input name="partitaIva" className="input" defaultValue={host.partitaIva ?? ''} />
          </div>
          <div>
            <label className="label">Codice Fiscale</label>
            <input name="codiceFiscale" className="input" defaultValue={host.codiceFiscale ?? ''} />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input name="telefono" type="tel" className="input" defaultValue={host.telefono ?? ''} />
          </div>
          <div>
            <label className="label">Sito Web</label>
            <input name="sitoWeb" type="url" className="input" defaultValue={host.sitoWeb ?? ''} placeholder="https://" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Indirizzo</label>
            <input name="indirizzo" className="input" defaultValue={host.indirizzo ?? ''} />
          </div>
          <div>
            <label className="label">Città</label>
            <input name="citta" className="input" defaultValue={host.citta ?? ''} />
          </div>
          <div>
            <label className="label">Provincia</label>
            <input name="provincia" className="input" defaultValue={host.provincia ?? ''} maxLength={2} />
          </div>
          <div>
            <label className="label">CAP</label>
            <input name="cap" className="input" defaultValue={host.cap ?? ''} maxLength={5} />
          </div>
          <div>
            <label className="label">Regione</label>
            <input name="regione" className="input" defaultValue={host.regione ?? ''} />
          </div>
        </div>
      </div>

      {/* Dati fatturazione */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Dati fatturazione</h2>
        <p className="text-sm text-gray-500 mb-4">Utilizzati per l&apos;emissione delle fatture. Se vuoti, verranno usati i dati azienda.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Ragione sociale fatturazione</label>
            <input name="fattNomeAzienda" className="input" defaultValue={host.fattNomeAzienda ?? ''} />
          </div>
          <div>
            <label className="label">P.IVA fatturazione</label>
            <input name="fattPartitaIva" className="input" defaultValue={host.fattPartitaIva ?? ''} />
          </div>
          <div>
            <label className="label">Email per fatture</label>
            <input name="fattEmail" type="email" className="input" defaultValue={host.fattEmail ?? ''} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Indirizzo fatturazione</label>
            <input name="fattIndirizzo" className="input" defaultValue={host.fattIndirizzo ?? ''} />
          </div>
          <div>
            <label className="label">Città</label>
            <input name="fattCitta" className="input" defaultValue={host.fattCitta ?? ''} />
          </div>
          <div>
            <label className="label">CAP</label>
            <input name="fattCap" className="input" defaultValue={host.fattCap ?? ''} maxLength={5} />
          </div>
          <div>
            <label className="label">Provincia</label>
            <input name="fattProvincia" className="input" defaultValue={host.fattProvincia ?? ''} maxLength={2} />
          </div>
          <div>
            <label className="label">PEC</label>
            <input name="fattPec" type="email" className="input" defaultValue={host.fattPec ?? ''} />
          </div>
          <div>
            <label className="label">Codice SDI</label>
            <input name="fattCodiceSDI" className="input" defaultValue={host.fattCodiceSDI ?? ''} maxLength={7} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Regime fiscale (per FatturaPA)</label>
            <select name="regimeFiscale" className="input" defaultValue={host.regimeFiscale ?? 'RF01'}>
              <option value="RF01">RF01 – Regime ordinario</option>
              <option value="RF02">RF02 – Contribuenti minimi</option>
              <option value="RF04">RF04 – Agricoltura e pesca</option>
              <option value="RF11">RF11 – Agenzie viaggi e turismo</option>
              <option value="RF12">RF12 – Agriturismo</option>
              <option value="RF17">RF17 – IVA per cassa</option>
              <option value="RF19">RF19 – Regime forfettario</option>
              <option value="RF18">RF18 – Altro</option>
            </select>
          </div>
        </div>
      </div>

      {errore && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errore}</div>
      )}
      {successo && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          ✓ Modifiche salvate con successo
        </div>
      )}

      {/* Canali di comunicazione */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Canali di comunicazione</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configura il tuo server SMTP per inviare email direttamente dal tuo indirizzo aziendale.
          Se lasciato vuoto, le email verranno inviate dalla piattaforma Otium Week.
        </p>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Email (SMTP)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3.5 border-l-2 border-indigo-100">
            <div className="md:col-span-2">
              <label className="label">Indirizzo mittente <span className="text-gray-400 font-normal">(es. Villa Otium &lt;info@villa.it&gt;)</span></label>
              <input
                name="emailMittente"
                className="input"
                defaultValue={host.emailMittente ?? ''}
                placeholder='"Nome Azienda" <info@azienda.it>'
              />
            </div>
            <div>
              <label className="label">Server SMTP</label>
              <input
                name="smtpHost"
                className="input"
                defaultValue={host.smtpHost ?? ''}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="label">Porta SMTP</label>
              <input
                name="smtpPort"
                type="number"
                className="input"
                defaultValue={host.smtpPort ?? 587}
                placeholder="587"
                min={1}
                max={65535}
              />
            </div>
            <div>
              <label className="label">Utente SMTP</label>
              <input
                name="smtpUser"
                className="input"
                defaultValue={host.smtpUser ?? ''}
                placeholder="info@azienda.it"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="label">Password SMTP</label>
              <input
                name="smtpPass"
                type="password"
                className="input"
                defaultValue={host.smtpPass ?? ''}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              <span className="text-sm font-medium text-gray-500">WhatsApp Business</span>
            </div>
            <span className="text-xs bg-gray-100 text-gray-400 font-medium px-2.5 py-0.5 rounded-full">Prossimamente</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span className="text-sm font-medium text-gray-500">SMS</span>
            </div>
            <span className="text-xs bg-gray-100 text-gray-400 font-medium px-2.5 py-0.5 rounded-full">Prossimamente</span>
          </div>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {loading ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </form>
  )
}
