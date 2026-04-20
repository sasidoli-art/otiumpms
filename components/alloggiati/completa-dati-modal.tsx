'use client'

import { useState } from 'react'
import { X, Loader2, Save, UserPlus, Trash2, AlertCircle } from 'lucide-react'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

export type OspitePayload = {
  id: string
  nome: string
  cognome: string
  sesso: string | null
  dataNascita: string | null
  luogoNascita: string | null
  comuneNascitaIstat: string | null
  provinciaNascita: string | null
  statoNascitaIstat: string | null
  cittadinanzaIstat: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  luogoRilascio: string | null
  comuneRilascioIstat: string | null
  provinciaRilascio: string | null
  campiMancanti: string[]
}

export type AccompagnatorePayload = {
  id?: string
  nome: string
  cognome: string
  sesso: string | null
  dataNascita: string | null
  luogoNascita: string | null
  comuneNascitaIstat: string | null
  provinciaNascita: string | null
  statoNascitaIstat: string | null
  cittadinanzaIstat: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  comuneRilascioIstat: string | null
  provinciaRilascio: string | null
  isMinore: boolean
  campiMancanti: string[]
}

const TIPI_DOC = [
  { value: 'IDENTE', label: "Carta d'identita'" },
  { value: 'PPORT', label: 'Passaporto' },
  { value: 'PATEN', label: 'Patente' },
  { value: 'PATEN_INT', label: 'Patente internazionale' },
  { value: 'ALTRO', label: 'Altro documento' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CompletaDatiModal({
  ospite, accompagnatori: accIniziali, onClose, onSaved,
}: {
  ospite: OspitePayload
  accompagnatori: AccompagnatorePayload[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<OspitePayload>({ ...ospite })
  const [accompagnatori, setAccompagnatori] = useState<AccompagnatorePayload[]>(
    accIniziali.map((a) => ({ ...a })),
  )
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  function updateField<K extends keyof OspitePayload>(key: K, value: OspitePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateAcc(idx: number, patch: Partial<AccompagnatorePayload>) {
    setAccompagnatori((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }

  function addAcc() {
    setAccompagnatori((prev) => [
      ...prev,
      {
        nome: '', cognome: '', sesso: null, dataNascita: null,
        luogoNascita: null, comuneNascitaIstat: null, provinciaNascita: null,
        statoNascitaIstat: '100000100', cittadinanzaIstat: '100000100',
        tipoDocumento: null, numeroDocumento: null,
        comuneRilascioIstat: null, provinciaRilascio: null,
        isMinore: false, campiMancanti: [],
      },
    ])
  }

  function removeAcc(idx: number) {
    setAccompagnatori((prev) => prev.filter((_, i) => i !== idx))
  }

  async function salva() {
    setSaving(true); setErrore('')
    const payload = {
      guestNome: form.nome,
      guestCognome: form.cognome,
      guestSesso: form.sesso as 'M' | 'F' | null,
      guestDataNascita: form.dataNascita,
      guestLuogoNascita: form.luogoNascita,
      guestComuneNascitaIstat: form.comuneNascitaIstat,
      guestProvinciaNascita: form.provinciaNascita,
      guestStatoNascitaIstat: form.statoNascitaIstat,
      guestCittadinanzaIstat: form.cittadinanzaIstat,
      guestTipoDocumento: form.tipoDocumento,
      guestNumeroDocumento: form.numeroDocumento,
      guestLuogoRilascio: form.luogoRilascio,
      guestComuneRilascioIstat: form.comuneRilascioIstat,
      guestProvinciaRilascio: form.provinciaRilascio,
      accompagnatori: accompagnatori
        .filter((a) => a.cognome.trim() && a.nome.trim())
        .map((a) => ({
          id: a.id,
          nome: a.nome, cognome: a.cognome, sesso: a.sesso as 'M' | 'F' | null,
          dataNascita: a.dataNascita, luogoNascita: a.luogoNascita,
          provinciaNascita: a.provinciaNascita,
          comuneNascitaIstat: a.comuneNascitaIstat,
          statoNascitaIstat: a.statoNascitaIstat,
          cittadinanzaIstat: a.cittadinanzaIstat,
          tipoDocumento: a.tipoDocumento, numeroDocumento: a.numeroDocumento,
          comuneRilascioIstat: a.comuneRilascioIstat,
          provinciaRilascio: a.provinciaRilascio,
          isMinore: a.isMinore,
        })),
    }

    const res = await fetch(`/api/host/alloggiati/completa/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) onSaved()
    else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore salvataggio')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Completa dati Alloggiati</h3>
            <p className="text-xs text-gray-500">{ospite.cognome} {ospite.nome}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {ospite.campiMancanti.length > 0 && (
            <div className="p-2.5 rounded-lg bg-yellow-50 text-yellow-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Campi mancanti: <strong>{ospite.campiMancanti.join(', ')}</strong></span>
            </div>
          )}

          {/* Ospite principale */}
          <section>
            <h4 className="text-sm font-bold text-gray-900 mb-3">Ospite titolare</h4>
            <FormPersona
              value={form}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </section>

          {/* Accompagnatori */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900">Accompagnatori ({accompagnatori.length})</h4>
              <button
                onClick={addAcc}
                className="text-sm px-2.5 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center gap-1 font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" /> Aggiungi
              </button>
            </div>
            <div className="space-y-4">
              {accompagnatori.map((a, idx) => (
                <div key={a.id ?? idx} className="p-3 rounded-lg border border-gray-200 space-y-3 relative">
                  <button
                    onClick={() => removeAcc(idx)}
                    className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                    title="Rimuovi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {a.campiMancanti && a.campiMancanti.length > 0 && (
                    <div className="text-[11px] text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                      Mancanti: {a.campiMancanti.join(', ')}
                    </div>
                  )}
                  <FormPersona
                    value={{
                      nome: a.nome, cognome: a.cognome, sesso: a.sesso,
                      dataNascita: a.dataNascita,
                      luogoNascita: a.luogoNascita,
                      comuneNascitaIstat: a.comuneNascitaIstat,
                      provinciaNascita: a.provinciaNascita,
                      statoNascitaIstat: a.statoNascitaIstat,
                      cittadinanzaIstat: a.cittadinanzaIstat,
                      tipoDocumento: a.tipoDocumento,
                      numeroDocumento: a.numeroDocumento,
                      luogoRilascio: null,
                      comuneRilascioIstat: a.comuneRilascioIstat,
                      provinciaRilascio: a.provinciaRilascio,
                    }}
                    onChange={(patch) => updateAcc(idx, patch)}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={a.isMinore}
                      onChange={(e) => updateAcc(idx, { isMinore: e.target.checked })}
                    />
                    Minore di 18 anni
                  </label>
                </div>
              ))}
              {accompagnatori.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Nessun accompagnatore</p>
              )}
            </div>
          </section>

          {errore && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errore}</div>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-100">
          <button onClick={salva} disabled={saving} className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva dati
          </button>
          <button onClick={onClose} disabled={saving} className="btn-secondary">Annulla</button>
        </div>
      </div>
    </div>
  )
}

// ─── Form persona ─────────────────────────────────────────────────────────────

type PersonaFields = {
  nome: string
  cognome: string
  sesso: string | null
  dataNascita: string | null
  luogoNascita: string | null
  comuneNascitaIstat: string | null
  provinciaNascita: string | null
  statoNascitaIstat: string | null
  cittadinanzaIstat: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  luogoRilascio: string | null
  comuneRilascioIstat: string | null
  provinciaRilascio: string | null
}

function FormPersona({
  value, onChange,
}: {
  value: PersonaFields
  onChange: (patch: Partial<PersonaFields>) => void
}) {
  const dn = value.dataNascita?.slice(0, 10) ?? ''

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div>
        <label className="label">Cognome *</label>
        <input type="text" value={value.cognome} onChange={(e) => onChange({ cognome: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Nome *</label>
        <input type="text" value={value.nome} onChange={(e) => onChange({ nome: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Sesso</label>
        <select
          value={value.sesso ?? ''}
          onChange={(e) => onChange({ sesso: e.target.value || null })}
          className="input"
        >
          <option value="">—</option>
          <option value="M">Maschio</option>
          <option value="F">Femmina</option>
        </select>
      </div>
      <div>
        <label className="label">Data di nascita</label>
        <input
          type="date"
          value={dn}
          onChange={(e) => onChange({ dataNascita: e.target.value || null })}
          className="input"
        />
      </div>
      <div>
        <label className="label">Luogo di nascita</label>
        <input type="text" value={value.luogoNascita ?? ''} onChange={(e) => onChange({ luogoNascita: e.target.value })} className="input" placeholder="Es. Milano" />
      </div>
      <div>
        <label className="label">Provincia nascita (sigla)</label>
        <input
          type="text"
          value={value.provinciaNascita ?? ''}
          onChange={(e) => onChange({ provinciaNascita: e.target.value.toUpperCase().slice(0, 2) })}
          className="input font-mono uppercase"
          maxLength={2}
          placeholder="MI"
        />
      </div>
      <div>
        <label className="label">Codice ISTAT comune nascita</label>
        <input type="text" value={value.comuneNascitaIstat ?? ''} onChange={(e) => onChange({ comuneNascitaIstat: e.target.value })} className="input font-mono" placeholder="9 cifre" maxLength={9} />
      </div>
      <div>
        <label className="label">Codice ISTAT stato nascita</label>
        <input type="text" value={value.statoNascitaIstat ?? ''} onChange={(e) => onChange({ statoNascitaIstat: e.target.value })} className="input font-mono" placeholder="100000100 = Italia" maxLength={9} />
      </div>
      <div>
        <label className="label">Codice ISTAT cittadinanza *</label>
        <input type="text" value={value.cittadinanzaIstat ?? ''} onChange={(e) => onChange({ cittadinanzaIstat: e.target.value })} className="input font-mono" placeholder="100000100" maxLength={9} />
      </div>
      <div>
        <label className="label">Tipo documento *</label>
        <select
          value={value.tipoDocumento ?? ''}
          onChange={(e) => onChange({ tipoDocumento: e.target.value || null })}
          className="input"
        >
          <option value="">— seleziona —</option>
          {TIPI_DOC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Numero documento *</label>
        <input type="text" value={value.numeroDocumento ?? ''} onChange={(e) => onChange({ numeroDocumento: e.target.value })} className="input uppercase" />
      </div>
      <div>
        <label className="label">ISTAT luogo rilascio</label>
        <input type="text" value={value.comuneRilascioIstat ?? ''} onChange={(e) => onChange({ comuneRilascioIstat: e.target.value })} className="input font-mono" maxLength={9} />
      </div>
    </div>
  )
}
