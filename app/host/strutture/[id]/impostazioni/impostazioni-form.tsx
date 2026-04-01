'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Save, Loader2, FileText, Users, Info } from 'lucide-react'

interface StrutturaProp {
  id: string
  nome: string
  alloggiatiAbilitato: boolean
  alloggiatiCodiceStruttura: string | null
  alloggiatiComuneIstat: string | null
  alloggiatiDenominazioneComune: string | null
}

interface HostProp {
  regimeFiscale: string | null
  nomeAzienda: string
  partitaIva: string | null
  codiceFiscale: string | null
  fattNomeAzienda: string | null
  fattPartitaIva: string | null
  fattIndirizzo: string | null
  fattCitta: string | null
  fattCap: string | null
  fattProvincia: string | null
  fattPec: string | null
  fattCodiceSDI: string | null
}

const REGIMI_FISCALI = [
  { value: 'RF01', label: 'RF01 – Regime ordinario' },
  { value: 'RF02', label: 'RF02 – Contribuenti minimi (art.1 c.96-117 L. 244/2007)' },
  { value: 'RF04', label: 'RF04 – Agricoltura e attività connesse e pesca' },
  { value: 'RF05', label: 'RF05 – Vendita sali e tabacchi' },
  { value: 'RF06', label: 'RF06 – Commercio fiammiferi' },
  { value: 'RF07', label: 'RF07 – INTRATTENIMENTI, GIOCHI E ALTRE ATT. L. 398/91' },
  { value: 'RF08', label: 'RF08 – Gestione servizi telefonia pubblica' },
  { value: 'RF09', label: 'RF09 – Rivendita documenti di trasporto pubblico' },
  { value: 'RF10', label: 'RF10 – Intrattenimento e spettacolo' },
  { value: 'RF11', label: 'RF11 – Agenzie viaggi e turismo ' },
  { value: 'RF12', label: 'RF12 – Agriturismo (art.5 c.2 L. 413/1991)' },
  { value: 'RF13', label: 'RF13 – Vendite a domicilio' },
  { value: 'RF14', label: 'RF14 – Rivendita beni usati e oggetti d\'arte' },
  { value: 'RF15', label: 'RF15 – Agenzie di vendite all\'incanto' },
  { value: 'RF16', label: 'RF16 – IVA per cassa P.A. (art.6 c.5 DPR 633/1972)' },
  { value: 'RF17', label: 'RF17 – IVA per cassa (art.32-bis DL 83/2012)' },
  { value: 'RF19', label: 'RF19 – Regime forfettario (art.1 c.54-89 L. 190/2014)' },
  { value: 'RF18', label: 'RF18 – Altro' },
]

export default function ImpostazioniForm({
  struttura,
  host,
  strutturaId,
}: {
  struttura: StrutturaProp
  host: HostProp
  strutturaId: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'alloggiati' | 'fiscale'>('alloggiati')
  const [loading, setLoading] = useState(false)
  const [successo, setSuccesso] = useState('')
  const [errore, setErrore] = useState('')

  async function handleAlloggiati(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    setSuccesso('')
    const fd = new FormData(e.currentTarget)
    const data = {
      alloggiatiAbilitato: fd.get('alloggiatiAbilitato') === 'on',
      alloggiatiCodiceStruttura: (fd.get('alloggiatiCodiceStruttura') as string).trim() || null,
      alloggiatiComuneIstat: (fd.get('alloggiatiComuneIstat') as string).trim() || null,
      alloggiatiDenominazioneComune: (fd.get('alloggiatiDenominazioneComune') as string).trim() || null,
    }
    try {
      const res = await fetch(`/api/host/strutture/${strutturaId}/impostazioni`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) setErrore(json.error || 'Errore')
      else { setSuccesso('Impostazioni Alloggiati salvate'); router.refresh() }
    } catch { setErrore('Errore di connessione') }
    finally { setLoading(false) }
  }

  async function handleFiscale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    setSuccesso('')
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) setErrore(json.error || 'Errore')
      else { setSuccesso('Dati fiscali salvati'); router.refresh() }
    } catch { setErrore('Errore di connessione') }
    finally { setLoading(false) }
  }

  return (
    <div>
      {/* Tab navigator */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('alloggiati')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'alloggiati'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Alloggiati Web
        </button>
        <button
          onClick={() => setTab('fiscale')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === 'fiscale'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Dati Fiscali / FatturaPA
        </button>
      </div>

      {/* Feedback */}
      {successo && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded text-sm">{successo}</div>
      )}
      {errore && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded text-sm">{errore}</div>
      )}

      {/* ─── TAB ALLOGGIATI ─── */}
      {tab === 'alloggiati' && (
        <form onSubmit={handleAlloggiati} className="space-y-6">
          <div className="card">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded border border-blue-100 mb-6">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                Il <strong>file Alloggiati Web</strong> è obbligatorio per chi ospita persone (strutture ricettive) e va caricato sul portale
                della Polizia di Stato entro le 24h dall&apos;arrivo. I dati qui configurati servono per generare
                automaticamente il file <code>.txt</code> a 179 colonne richiesto dal sistema.
              </p>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Codici questura
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="alloggiatiAbilitato"
                  name="alloggiatiAbilitato"
                  defaultChecked={struttura.alloggiatiAbilitato}
                  className="w-4 h-4 text-brand-500 rounded border-gray-300"
                />
                <label htmlFor="alloggiatiAbilitato" className="text-sm font-medium text-gray-700">
                  Abilita generazione file Alloggiati Web per questa struttura
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Codice struttura (assegnato dalla Questura)
                  </label>
                  <input
                    name="alloggiatiCodiceStruttura"
                    className="input font-mono"
                    defaultValue={struttura.alloggiatiCodiceStruttura ?? ''}
                    placeholder="es. IT099001"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Lo trovi nel portale Alloggiati Web della Polizia di Stato
                  </p>
                </div>

                <div>
                  <label className="label">
                    Codice ISTAT comune della struttura
                  </label>
                  <input
                    name="alloggiatiComuneIstat"
                    className="input font-mono"
                    defaultValue={struttura.alloggiatiComuneIstat ?? ''}
                    placeholder="es. H501"
                    maxLength={10}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Codice ISTAT a 4 cifre (o alfanumerico) del comune dove si trova la struttura
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="label">
                    Denominazione comune (per riferimento)
                  </label>
                  <input
                    name="alloggiatiDenominazioneComune"
                    className="input"
                    defaultValue={struttura.alloggiatiDenominazioneComune ?? ''}
                    placeholder="es. ROMA"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded border border-amber-100 mt-6">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                Per ogni prenotazione confermata dovrai inserire i <strong>dati documento</strong> dell&apos;ospite principale
                nella scheda prenotazione. Il sistema genererà automaticamente il file da caricare sul portale PS.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva impostazioni Alloggiati
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB FISCALE ─── */}
      {tab === 'fiscale' && (
        <form onSubmit={handleFiscale} className="space-y-6">
          <div className="card">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded border border-blue-100 mb-6">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                Questi dati vengono usati per generare il file <strong>XML FatturaPA</strong> da trasmettere al Sistema
                di Interscambio (SDI) dell&apos;Agenzia delle Entrate. Devono corrispondere esattamente ai dati presenti
                nel registro imprese / Agenzia Entrate.
              </p>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Dati emittente (il tuo profilo fiscale)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Partita IVA emittente</label>
                <input
                  name="partitaIva"
                  className="input font-mono"
                  defaultValue={host.partitaIva ?? ''}
                  placeholder="IT12345678901"
                  maxLength={16}
                />
              </div>
              <div>
                <label className="label">Codice Fiscale emittente</label>
                <input
                  name="codiceFiscale"
                  className="input font-mono"
                  defaultValue={host.codiceFiscale ?? ''}
                  placeholder="RSSMRA85M01H501Z"
                  maxLength={16}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Regime fiscale</label>
                <select name="regimeFiscale" className="input" defaultValue={host.regimeFiscale ?? 'RF01'}>
                  {REGIMI_FISCALI.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-8 mb-4">
              Dati fatturazione (per intestazione fattura)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Ragione sociale per fatturazione</label>
                <input
                  name="fattNomeAzienda"
                  className="input"
                  defaultValue={host.fattNomeAzienda ?? host.nomeAzienda}
                  placeholder="Ragione sociale come da registro imprese"
                />
              </div>
              <div>
                <label className="label">P.IVA intestatario fatturazione</label>
                <input
                  name="fattPartitaIva"
                  className="input font-mono"
                  defaultValue={host.fattPartitaIva ?? ''}
                  maxLength={16}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Indirizzo sede legale</label>
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
                <label className="label">Provincia (sigla)</label>
                <input name="fattProvincia" className="input uppercase" defaultValue={host.fattProvincia ?? ''} maxLength={2} placeholder="RM" />
              </div>
            </div>

            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-8 mb-4">
              Canale di ricezione SDI
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Codice destinatario SDI (7 caratteri)</label>
                <input
                  name="fattCodiceSDI"
                  className="input font-mono uppercase"
                  defaultValue={host.fattCodiceSDI ?? ''}
                  maxLength={7}
                  placeholder="0000000"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Usa <code>0000000</code> se ricevi via PEC
                </p>
              </div>
              <div>
                <label className="label">PEC per ricezione fatture SDI</label>
                <input
                  name="fattPec"
                  type="email"
                  className="input"
                  defaultValue={host.fattPec ?? ''}
                  placeholder="fatture@pec.tuazienda.it"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva dati fiscali
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
