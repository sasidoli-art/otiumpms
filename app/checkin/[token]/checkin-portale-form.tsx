'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, ChevronRight, AlertCircle } from 'lucide-react'
import DocumentOCR from './document-ocr'

type Prenotazione = {
  id: string
  checkInCompletato: boolean
  numOspiti: number
  guestSesso: string | null
  guestDataNascita: string | null
  guestLuogoNascita: string | null
  guestProvinciaNascita: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  guestLuogoRilascio: string | null
  guestProvinciaRilascio: string | null
  guestTelefono: string | null
}

type AccForm = {
  nome: string; cognome: string; sesso: string; dataNascita: string
  luogoNascita: string; provinciaNascita: string; nazionalita: string
  tipoDocumento: string; numeroDocumento: string; isMinore: boolean
}

const TIPI_DOC = [
  { value: 'IDENTE', label: "Carta d'identità" },
  { value: 'PPORT', label: 'Passaporto' },
  { value: 'PATEN', label: 'Patente di guida' },
  { value: 'PERMSOS', label: 'Permesso di soggiorno' },
]

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white transition-colors'

export default function CheckInPortaleForm({
  token,
  prenotazione: p,
}: {
  token: string
  prenotazione: Prenotazione
}) {
  const [completato, setCompletato] = useState(p.checkInCompletato)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [accompagnatori, setAccompagnatori] = useState<AccForm[]>([])

  const emptyAcc = (): AccForm => ({
    nome: '', cognome: '', sesso: 'M', dataNascita: '', luogoNascita: '',
    provinciaNascita: '', nazionalita: 'Italiana', tipoDocumento: 'IDENTE',
    numeroDocumento: '', isMinore: false,
  })

  function addAcc() { setAccompagnatori(a => [...a, emptyAcc()]) }
  function removeAcc(i: number) { setAccompagnatori(a => a.filter((_, idx) => idx !== i)) }
  function setAcc(i: number, field: string, value: string | boolean) {
    setAccompagnatori(a => a.map((acc, idx) => idx === i ? { ...acc, [field]: value } : acc))
  }

  const [form, setForm] = useState({
    guestSesso: p.guestSesso ?? 'M',
    guestDataNascita: p.guestDataNascita ? p.guestDataNascita.split('T')[0] : '',
    guestLuogoNascita: p.guestLuogoNascita ?? '',
    guestProvinciaNascita: p.guestProvinciaNascita ?? '',
    guestStatoNascitaIstat: '100000100',
    guestCittadinanzaIstat: '100000100',
    guestTipoDocumento: p.guestTipoDocumento ?? 'IDENTE',
    guestNumeroDocumento: p.guestNumeroDocumento ?? '',
    guestLuogoRilascio: p.guestLuogoRilascio ?? '',
    guestProvinciaRilascio: p.guestProvinciaRilascio ?? '',
    guestStatoRilascioIstat: '100000100',
    guestTelefono: p.guestTelefono ?? '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleOCRExtract(data: { guestTipoDocumento?: string; guestNumeroDocumento?: string; guestDataNascita?: string; guestLuogoNascita?: string }) {
    if (data.guestTipoDocumento) set('guestTipoDocumento', data.guestTipoDocumento)
    if (data.guestNumeroDocumento) set('guestNumeroDocumento', data.guestNumeroDocumento)
    if (data.guestDataNascita) set('guestDataNascita', data.guestDataNascita)
    if (data.guestLuogoNascita) set('guestLuogoNascita', data.guestLuogoNascita)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.guestTipoDocumento || !form.guestNumeroDocumento.trim()) {
      setErrore('Tipo e numero documento sono obbligatori')
      return
    }
    setLoading(true); setErrore('')
    const res = await fetch(`/api/checkin/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        accompagnatori: accompagnatori.filter(a => a.nome && a.cognome),
      }),
    })
    if (!res.ok) {
      const j = await res.json()
      setErrore(j.error ?? 'Errore invio dati')
      setLoading(false)
      return
    }
    setCompletato(true)
    setLoading(false)
  }

  if (completato) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Check-in completato!</h2>
        <p className="text-sm text-gray-500">
          I tuoi dati sono stati inviati correttamente alla struttura.<br />
          Ci vediamo al tuo arrivo. Buon soggiorno!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Completa il tuo check-in</h2>
      <p className="text-sm text-gray-400 mb-5">
        Inserisci i tuoi dati prima dell&apos;arrivo per velocizzare l&apos;ingresso.
      </p>

      {errore && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errore}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Telefono */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telefono</label>
          <input type="tel" value={form.guestTelefono} onChange={e => set('guestTelefono', e.target.value)} className={inp} placeholder="+39 333 1234567" />
        </div>

        {/* Sesso */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sesso</label>
          <div className="flex gap-3">
            {[{ v: 'M', l: 'Maschio' }, { v: 'F', l: 'Femmina' }].map(({ v, l }) => (
              <button
                key={v} type="button"
                onClick={() => set('guestSesso', v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.guestSesso === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-indigo-50'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Data nascita + luogo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Data di nascita</label>
            <input type="date" value={form.guestDataNascita} onChange={e => set('guestDataNascita', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Provincia nascita</label>
            <input type="text" value={form.guestProvinciaNascita} onChange={e => set('guestProvinciaNascita', e.target.value.toUpperCase())} maxLength={2} className={inp} placeholder="RM" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Comune di nascita</label>
          <input type="text" value={form.guestLuogoNascita} onChange={e => set('guestLuogoNascita', e.target.value)} className={inp} placeholder="Roma" />
        </div>

        {/* Documento */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">Documento di identità *</p>

          {/* OCR Scanner */}
          <div className="mb-4 p-4 bg-indigo-50 rounded-xl">
            <p className="text-xs font-medium text-indigo-700 mb-3">📷 Estrai dati automaticamente</p>
            <DocumentOCR onExtract={handleOCRExtract} />
          </div>

          {/* Tipo documento */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {TIPI_DOC.map(({ value, label }) => (
              <button
                key={value} type="button"
                onClick={() => set('guestTipoDocumento', value)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors text-left ${form.guestTipoDocumento === value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-indigo-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Numero documento *</label>
            <input type="text" value={form.guestNumeroDocumento} onChange={e => set('guestNumeroDocumento', e.target.value.toUpperCase())} required className={inp} placeholder="AB1234567" />
          </div>
        </div>

        {/* Luogo rilascio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Rilasciato a</label>
            <input type="text" value={form.guestLuogoRilascio} onChange={e => set('guestLuogoRilascio', e.target.value)} className={inp} placeholder="Roma" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Provincia rilascio</label>
            <input type="text" value={form.guestProvinciaRilascio} onChange={e => set('guestProvinciaRilascio', e.target.value.toUpperCase())} maxLength={2} className={inp} placeholder="RM" />
          </div>
        </div>

        {/* Accompagnatori */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500">
              Accompagnatori {accompagnatori.length > 0 && `(${accompagnatori.length})`}
            </p>
            <button type="button" onClick={addAcc} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              + Aggiungi persona
            </button>
          </div>

          {accompagnatori.length === 0 && (
            <p className="text-xs text-gray-400 italic mb-2">Viaggi con qualcuno? Aggiungi i dati degli accompagnatori per velocizzare il check-in di tutto il gruppo.</p>
          )}

            {accompagnatori.map((acc, i) => (
              <div key={i} className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Accompagnatore {i + 1}</p>
                  <button type="button" onClick={() => removeAcc(i)} className="text-xs text-red-400 hover:text-red-600">Rimuovi</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Nome *</label>
                    <input type="text" value={acc.nome} onChange={e => setAcc(i, 'nome', e.target.value)} className={inp} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Cognome *</label>
                    <input type="text" value={acc.cognome} onChange={e => setAcc(i, 'cognome', e.target.value)} className={inp} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Sesso</label>
                    <select value={acc.sesso} onChange={e => setAcc(i, 'sesso', e.target.value)} className={inp}>
                      <option value="M">M</option><option value="F">F</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Data nascita</label>
                    <input type="date" value={acc.dataNascita} onChange={e => setAcc(i, 'dataNascita', e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Nazionalità</label>
                    <input type="text" value={acc.nazionalita} onChange={e => setAcc(i, 'nazionalita', e.target.value)} className={inp} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Documento</label>
                    <select value={acc.tipoDocumento} onChange={e => setAcc(i, 'tipoDocumento', e.target.value)} className={inp}>
                      {TIPI_DOC.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Numero doc.</label>
                    <input type="text" value={acc.numeroDocumento} onChange={e => setAcc(i, 'numeroDocumento', e.target.value.toUpperCase())} className={inp} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={acc.isMinore} onChange={e => setAcc(i, 'isMinore', e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                  <span className="text-xs text-gray-600">Minore di 18 anni</span>
                </label>
              </div>
            ))}
        </div>

        {/* Avviso obbligo legale */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">Obbligo di identificazione</p>
          <p>
            Ai sensi dell&apos;art. 109 del T.U.L.P.S. (R.D. 773/1931), tutti gli ospiti sono tenuti
            a presentare un documento di identit&agrave; valido al momento dell&apos;arrivo in struttura.
            Il check-in online non sostituisce l&apos;identificazione in reception.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm mt-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {loading ? 'Invio in corso…' : 'Conferma check-in'}
        </button>
      </form>
    </div>
  )
}
