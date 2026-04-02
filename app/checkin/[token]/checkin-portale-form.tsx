'use client'

import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, ChevronRight, ChevronLeft, AlertCircle, Camera, X } from 'lucide-react'
import DocumentOCR from './document-ocr'
import { SignaturePad } from '@/components/spa/signature-pad'
import { DEFAULT_REGCARD_IT, compileRegCardText } from '@/lib/regcard-defaults'

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

const STEPS = [
  { num: 1, label: 'Dati' },
  { num: 2, label: 'Accompagnatori' },
  { num: 3, label: 'Firma' },
] as const

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s.num === current
                  ? 'bg-indigo-600 text-white'
                  : s.num < current
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s.num < current ? '✓' : s.num}
            </div>
            <span
              className={`text-xs font-medium ${
                s.num === current ? 'text-indigo-600' : s.num < current ? 'text-indigo-400' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${s.num < current ? 'bg-indigo-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function PhotoCapture({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (base64: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
    }
    reader.readAsDataURL(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="flex-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt={label}
            className="w-full h-24 object-cover rounded-xl border border-gray-200"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600"
          >
            <X className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1 right-1 bg-white/80 backdrop-blur-sm text-xs px-2 py-1 rounded-lg text-gray-600 hover:bg-white"
          >
            Cambia
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      )}
    </div>
  )
}

export default function CheckInPortaleForm({
  token,
  prenotazione: p,
  modalitaCheckin = 'completo',
}: {
  token: string
  prenotazione: Prenotazione
  modalitaCheckin?: string
}) {
  const [completato, setCompletato] = useState(p.checkInCompletato)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [accompagnatori, setAccompagnatori] = useState<AccForm[]>([])

  // Document photos
  const [fotoFronte, setFotoFronte] = useState<string | null>(null)
  const [fotoRetro, setFotoRetro] = useState<string | null>(null)

  // Registration card state
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [accettaPrivacy, setAccettaPrivacy] = useState(false)
  const [consensoMarketing, setConsensoMarketing] = useState(false)
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null)

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

  function goToStep(target: 1 | 2 | 3) {
    setErrore('')
    if (target > step) {
      // Validate current step before advancing
      if (step === 1) {
        if (!form.guestTipoDocumento || !form.guestNumeroDocumento.trim()) {
          setErrore('Tipo e numero documento sono obbligatori')
          return
        }
      }
    }
    setStep(target)
  }

  // Compiled registration card text
  const regCardText = compileRegCardText(DEFAULT_REGCARD_IT, {
    nomeHotel: 'La Struttura', // TODO: pass actual hotel name from prenotazione
  })

  async function handleSubmit() {
    // Validate step 3
    if (!accettaTermini || !accettaPrivacy) {
      setErrore('Devi accettare i Termini e Condizioni e l\'Informativa Privacy per completare il check-in') // TODO: i18n
      return
    }
    if (!firmaBase64) {
      setErrore('La firma digitale è obbligatoria per completare il check-in') // TODO: i18n
      return
    }

    setLoading(true)
    setErrore('')

    try {
      // Step 1: POST personal data + accompagnatori + document photos
      const checkinRes = await fetch(`/api/checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fotoDocumentoFronte: fotoFronte,
          fotoDocumentoRetro: fotoRetro,
          accompagnatori: accompagnatori.filter(a => a.nome && a.cognome),
        }),
      })

      if (!checkinRes.ok) {
        const j = await checkinRes.json()
        setErrore(j.error ?? 'Errore invio dati')
        setLoading(false)
        return
      }

      // Step 2: POST registration card acceptance + signature
      const regcardRes = await fetch(`/api/checkin/${token}/registration-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accettaTermini,
          accettaPrivacy,
          consensoMarketing,
          firmaBase64,
        }),
      })

      if (!regcardRes.ok) {
        const j = await regcardRes.json()
        setErrore(j.error ?? 'Errore invio registration card')
        setLoading(false)
        return
      }

      setCompletato(true)
    } catch {
      setErrore('Errore di connessione. Riprova.') // TODO: i18n
    } finally {
      setLoading(false)
    }
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

      <StepIndicator current={step} />

      {errore && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errore}
        </div>
      )}

      {/* ────────────────────────── STEP 1: Dati personali + Documento ────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
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
            <p className="text-xs font-semibold text-gray-500 mb-3">Documento di identit&agrave; *</p>

            {/* OCR Scanner */}
            <div className="mb-4 p-4 bg-indigo-50 rounded-xl">
              <p className="text-xs font-medium text-indigo-700 mb-3">Estrai dati automaticamente</p>
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
              <input type="text" value={form.guestNumeroDocumento} onChange={e => set('guestNumeroDocumento', e.target.value.toUpperCase())} className={inp} placeholder="AB1234567" />
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

          {/* Document photos */}
          {modalitaCheckin === 'leggero' ? (
            <div className="pt-2 border-t border-gray-100">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                <p className="font-semibold mb-1">Foto documento</p>
                <p>Le foto del documento verranno acquisite alla reception al momento dell&apos;arrivo.</p>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">
                Foto documento <span className="font-normal text-gray-400">(facoltativo)</span>
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Scatta una foto del fronte e del retro del documento per velocizzare la verifica in reception.
              </p>
              <div className="flex gap-3">
                <PhotoCapture
                  label="Foto fronte"
                  value={fotoFronte}
                  onChange={setFotoFronte}
                />
                <PhotoCapture
                  label="Foto retro"
                  value={fotoRetro}
                  onChange={setFotoRetro}
                />
              </div>
            </div>
          )}

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
            type="button"
            onClick={() => goToStep(2)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm mt-2"
          >
            Avanti <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ────────────────────────── STEP 2: Accompagnatori ────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-700">
              Accompagnatori{accompagnatori.length > 0 ? ` (${accompagnatori.length})` : ''}
            </p>
            <button type="button" onClick={addAcc} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              + Aggiungi persona
            </button>
          </div>

          {accompagnatori.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 italic mb-2">
                Viaggi con qualcuno? Aggiungi i dati degli accompagnatori per velocizzare il check-in di tutto il gruppo.
              </p>
              <p className="text-xs text-gray-300">
                Se viaggi da solo, puoi procedere direttamente al prossimo passaggio.
              </p>
            </div>
          )}

          {accompagnatori.map((acc, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Accompagnatore {i + 1}</p>
                <button type="button" onClick={() => removeAcc(i)} className="text-xs text-red-400 hover:text-red-600">Rimuovi</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Nome *</label>
                  <input type="text" value={acc.nome} onChange={e => setAcc(i, 'nome', e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Cognome *</label>
                  <input type="text" value={acc.cognome} onChange={e => setAcc(i, 'cognome', e.target.value)} className={inp} />
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
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Nazionalit&agrave;</label>
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

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <button
              type="button"
              onClick={() => goToStep(3)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              Avanti <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────── STEP 3: Registration Card + Firma ────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* T&C text */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Termini e Condizioni della struttura</p>
            <div
              className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50 text-xs text-gray-600 leading-relaxed whitespace-pre-line"
            >
              {regCardText}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accettaTermini}
                onChange={e => setAccettaTermini(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-indigo-500 shrink-0"
              />
              <span className="text-sm text-gray-700">
                Ho letto e accetto i <strong>Termini e Condizioni</strong> *
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accettaPrivacy}
                onChange={e => setAccettaPrivacy(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-indigo-500 shrink-0"
              />
              <span className="text-sm text-gray-700">
                Ho letto e accetto l&apos;<strong>Informativa Privacy GDPR</strong> *
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consensoMarketing}
                onChange={e => setConsensoMarketing(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded accent-indigo-500 shrink-0"
              />
              <span className="text-sm text-gray-600">
                Acconsento al trattamento dei miei dati per finalit&agrave; di marketing <span className="text-gray-400">(facoltativo)</span>
              </span>
            </label>
          </div>

          {/* Signature */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Firma digitale *</p>
            {firmaBase64 ? (
              <div className="space-y-2">
                <div className="border-2 border-green-200 rounded-xl p-2 bg-green-50">
                  <img src={firmaBase64} alt="Firma" className="w-full h-auto rounded-lg" />
                </div>
                <button
                  type="button"
                  onClick={() => setFirmaBase64(null)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Firma di nuovo
                </button>
              </div>
            ) : (
              <SignaturePad
                onSave={(base64) => setFirmaBase64(base64)}
                onClear={() => setFirmaBase64(null)}
              />
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {loading ? 'Invio in corso...' : 'Conferma e firma'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
