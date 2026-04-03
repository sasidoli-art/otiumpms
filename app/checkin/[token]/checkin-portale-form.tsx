'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Plus, Trash2, User, FileText } from 'lucide-react'
import DocumentOCR from './document-ocr'
import { SignaturePad } from '@/components/spa/signature-pad'
import { DEFAULT_REGCARD_IT, compileRegCardText } from '@/lib/regcard-defaults'
import { STATI, PROVINCE_ITALIANE, isItaliano } from '@/lib/nazionalita'

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
  luogoNascita: string; nazionalita: string
  tipoDocumento: string; numeroDocumento: string
}

const TIPI_DOC = [
  { value: 'IDENTE', label: "Carta d'identità" },
  { value: 'PPORT', label: 'Passaporto' },
  { value: 'PATEN', label: 'Patente di guida' },
  { value: 'PERMSOS', label: 'Permesso di soggiorno' },
]

const inp = 'w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 focus:bg-white transition-colors'
const inpErr = 'border-red-400 bg-red-50 focus:ring-red-400'
const inpOk = 'border-gray-200'
const errLabel = 'text-[10px] text-red-500 mt-0.5'

export default function CheckInPortaleForm({
  token,
  prenotazione: p,
  hostNome,
  strutturaNome,
  regCardText: customRegCard,
  modalitaCheckin,
}: {
  token: string
  prenotazione: Prenotazione
  hostNome: string
  strutturaNome: string
  regCardText?: string
  modalitaCheckin?: string
}) {
  // Form state
  const [form, setForm] = useState({
    guestSesso: p.guestSesso ?? 'M',
    guestDataNascita: p.guestDataNascita ?? '',
    guestLuogoNascita: p.guestLuogoNascita ?? '',
    guestProvinciaNascita: p.guestProvinciaNascita ?? '',
    guestCittadinanzaIstat: '100000100',
    guestStatoNascitaIstat: '100000100',
    guestTipoDocumento: p.guestTipoDocumento ?? 'IDENTE',
    guestNumeroDocumento: p.guestNumeroDocumento ?? '',
    guestLuogoRilascio: p.guestLuogoRilascio ?? '',
    guestProvinciaRilascio: p.guestProvinciaRilascio ?? '',
    guestTelefono: p.guestTelefono ?? '',
    guestCodiceFiscale: '',
  })

  const [accompagnatori, setAccompagnatori] = useState<AccForm[]>([])
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [accettaPrivacy, setAccettaPrivacy] = useState(false)
  const [consensoMarketing, setConsensoMarketing] = useState(false)
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [completato, setCompletato] = useState(p.checkInCompletato)
  const [errore, setErrore] = useState('')
  const [erroriCampi, setErroriCampi] = useState<Record<string, string>>({})

  const italiano = isItaliano(form.guestCittadinanzaIstat)
  const maxAcc = Math.max(0, p.numOspiti - 1)
  const regCard = customRegCard || compileRegCardText(DEFAULT_REGCARD_IT, { nomeHotel: strutturaNome })

  function set(campo: string, valore: string) {
    setForm(f => ({ ...f, [campo]: valore }))
    // Clear field error on change
    if (erroriCampi[campo]) setErroriCampi(e => { const n = { ...e }; delete n[campo]; return n })
  }

  function fieldClass(campo: string) {
    return `${inp} ${erroriCampi[campo] ? inpErr : inpOk}`
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.guestDataNascita) errs.guestDataNascita = 'Obbligatorio'
    if (!form.guestLuogoNascita.trim()) errs.guestLuogoNascita = 'Obbligatorio'
    if (!form.guestNumeroDocumento.trim()) errs.guestNumeroDocumento = 'Obbligatorio'
    if (italiano && form.guestCodiceFiscale && form.guestCodiceFiscale.length !== 16) {
      errs.guestCodiceFiscale = 'Deve essere 16 caratteri'
    }
    if (!accettaTermini) errs.accettaTermini = 'Obbligatorio'
    if (!accettaPrivacy) errs.accettaPrivacy = 'Obbligatorio'
    if (!firmaBase64) errs.firma = 'Firma obbligatoria'

    // Validate accompagnatori
    accompagnatori.forEach((a, i) => {
      if (!a.nome.trim()) errs[`acc_${i}_nome`] = 'Obbligatorio'
      if (!a.cognome.trim()) errs[`acc_${i}_cognome`] = 'Obbligatorio'
    })

    setErroriCampi(errs)
    if (Object.keys(errs).length > 0) {
      setErrore(`Ci sono ${Object.keys(errs).length} campi da compilare`)
      // Scroll to first error
      setTimeout(() => {
        document.querySelector('.border-red-400')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (!validate()) return

    setLoading(true)
    setErrore('')

    try {
      // Request 1: dati personali + documenti + accompagnatori
      const res1 = await fetch(`/api/checkin/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fotoDocumentoFronte: null,
          fotoDocumentoRetro: null,
          accompagnatori: accompagnatori.filter(a => a.nome && a.cognome),
        }),
      })
      if (!res1.ok) {
        const j = await res1.json()
        setErrore(j.error ?? 'Errore invio dati')
        setLoading(false)
        return
      }

      // Request 2: registration card + firma → completa check-in
      const res2 = await fetch(`/api/checkin/${token}/registration-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accettaTermini,
          accettaPrivacy,
          consensoMarketing,
          firmaBase64,
        }),
      })
      if (!res2.ok) {
        const j = await res2.json()
        setErrore(j.error ?? 'Errore registration card')
        setLoading(false)
        return
      }

      setCompletato(true)
    } catch {
      setErrore('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  function addAccompagnatore() {
    if (accompagnatori.length >= maxAcc) return
    setAccompagnatori(prev => [...prev, { nome: '', cognome: '', sesso: 'M', dataNascita: '', luogoNascita: '', nazionalita: 'Italiana', tipoDocumento: 'IDENTE', numeroDocumento: '' }])
  }

  if (completato) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Check-in completato!</h2>
        <p className="text-sm text-gray-500">
          I tuoi dati sono stati inviati correttamente.<br />
          Ti aspettiamo presso <strong>{strutturaNome}</strong>!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Errore globale */}
      {errore && (
        <div className="mx-5 mt-5 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errore}
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* ─── SEZIONE 1: Dati Personali ───────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">1</div>
            <h2 className="font-bold text-gray-900">Dati personali</h2>
          </div>

          <div className="space-y-3">
            {/* Nazionalità */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Nazionalità <span className="text-red-500">*</span></label>
              <select value={form.guestCittadinanzaIstat} onChange={e => { set('guestCittadinanzaIstat', e.target.value); set('guestStatoNascitaIstat', e.target.value) }} className={fieldClass('guestCittadinanzaIstat')}>
                {STATI.map(s => <option key={s.codice} value={s.codice}>{s.nome}</option>)}
              </select>
            </div>

            {/* CF solo italiani */}
            {italiano && (
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Codice Fiscale</label>
                <input value={form.guestCodiceFiscale} onChange={e => set('guestCodiceFiscale', e.target.value.toUpperCase())} maxLength={16} placeholder="RSSMRA85M01H501Z" className={`${fieldClass('guestCodiceFiscale')} font-mono tracking-wide`} />
                {erroriCampi.guestCodiceFiscale && <p className={errLabel}>{erroriCampi.guestCodiceFiscale}</p>}
              </div>
            )}

            {/* Sesso + Data nascita */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Sesso <span className="text-red-500">*</span></label>
                <select value={form.guestSesso} onChange={e => set('guestSesso', e.target.value)} className={fieldClass('guestSesso')}>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Data di nascita <span className="text-red-500">*</span></label>
                <input type="date" value={form.guestDataNascita} onChange={e => set('guestDataNascita', e.target.value)} className={fieldClass('guestDataNascita')} />
                {erroriCampi.guestDataNascita && <p className={errLabel}>{erroriCampi.guestDataNascita}</p>}
              </div>
            </div>

            {/* Luogo nascita */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className="text-xs font-medium text-gray-500 block mb-1">Luogo di nascita <span className="text-red-500">*</span></label>
                <input value={form.guestLuogoNascita} onChange={e => set('guestLuogoNascita', e.target.value)} placeholder={italiano ? 'es. Roma' : 'es. London'} className={fieldClass('guestLuogoNascita')} />
                {erroriCampi.guestLuogoNascita && <p className={errLabel}>{erroriCampi.guestLuogoNascita}</p>}
              </div>
              {italiano && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Prov.</label>
                  <select value={form.guestProvinciaNascita} onChange={e => set('guestProvinciaNascita', e.target.value)} className={fieldClass('guestProvinciaNascita')}>
                    <option value="">—</option>
                    {PROVINCE_ITALIANE.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Telefono */}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Telefono</label>
              <input type="tel" value={form.guestTelefono} onChange={e => set('guestTelefono', e.target.value)} placeholder="+39 333 1234567" className={fieldClass('guestTelefono')} />
            </div>
          </div>
        </section>

        {/* ─── SEZIONE 2: Documento ──────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">2</div>
            <h2 className="font-bold text-gray-900">Documento d&apos;identità</h2>
          </div>

          {/* OCR Scanner */}
          <div className="mb-4">
            <DocumentOCR
              onExtract={(data) => {
                if (data.guestTipoDocumento) set('guestTipoDocumento', data.guestTipoDocumento)
                if (data.guestNumeroDocumento) set('guestNumeroDocumento', data.guestNumeroDocumento)
                if (data.guestDataNascita) set('guestDataNascita', data.guestDataNascita)
                if (data.guestLuogoNascita) set('guestLuogoNascita', data.guestLuogoNascita)
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Tipo <span className="text-red-500">*</span></label>
                <select value={form.guestTipoDocumento} onChange={e => set('guestTipoDocumento', e.target.value)} className={fieldClass('guestTipoDocumento')}>
                  {TIPI_DOC.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Numero <span className="text-red-500">*</span></label>
                <input value={form.guestNumeroDocumento} onChange={e => set('guestNumeroDocumento', e.target.value.toUpperCase())} placeholder="AX1234567" className={`${fieldClass('guestNumeroDocumento')} font-mono`} />
                {erroriCampi.guestNumeroDocumento && <p className={errLabel}>{erroriCampi.guestNumeroDocumento}</p>}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className="text-xs font-medium text-gray-500 block mb-1">Luogo di rilascio</label>
                <input value={form.guestLuogoRilascio} onChange={e => set('guestLuogoRilascio', e.target.value)} className={fieldClass('guestLuogoRilascio')} />
              </div>
              {italiano && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Prov.</label>
                  <select value={form.guestProvinciaRilascio} onChange={e => set('guestProvinciaRilascio', e.target.value)} className={fieldClass('guestProvinciaRilascio')}>
                    <option value="">—</option>
                    {PROVINCE_ITALIANE.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── SEZIONE 3: Accompagnatori ─────────────────────────── */}
        {maxAcc > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">3</div>
                <h2 className="font-bold text-gray-900">Accompagnatori</h2>
                <span className="text-xs text-gray-400">{accompagnatori.length} di {maxAcc}</span>
              </div>
              {accompagnatori.length < maxAcc && (
                <button type="button" onClick={addAccompagnatore} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50">
                  <Plus className="w-3.5 h-3.5" /> Aggiungi
                </button>
              )}
            </div>

            {accompagnatori.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nessun accompagnatore aggiunto. Clicca &quot;Aggiungi&quot; se viaggi con altre persone.</p>
            )}

            <div className="space-y-4">
              {accompagnatori.map((acc, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> Accompagnatore {i + 1}</p>
                    <button type="button" onClick={() => setAccompagnatori(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input value={acc.nome} onChange={e => setAccompagnatori(prev => prev.map((a, j) => j === i ? { ...a, nome: e.target.value } : a))} placeholder="Nome *" className={`${inp} ${erroriCampi[`acc_${i}_nome`] ? inpErr : inpOk}`} />
                      {erroriCampi[`acc_${i}_nome`] && <p className={errLabel}>Obbligatorio</p>}
                    </div>
                    <div>
                      <input value={acc.cognome} onChange={e => setAccompagnatori(prev => prev.map((a, j) => j === i ? { ...a, cognome: e.target.value } : a))} placeholder="Cognome *" className={`${inp} ${erroriCampi[`acc_${i}_cognome`] ? inpErr : inpOk}`} />
                      {erroriCampi[`acc_${i}_cognome`] && <p className={errLabel}>Obbligatorio</p>}
                    </div>
                    <div>
                      <select value={acc.sesso} onChange={e => setAccompagnatori(prev => prev.map((a, j) => j === i ? { ...a, sesso: e.target.value } : a))} className={inp}>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>
                    <div>
                      <input type="date" value={acc.dataNascita} onChange={e => setAccompagnatori(prev => prev.map((a, j) => j === i ? { ...a, dataNascita: e.target.value } : a))} className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={acc.tipoDocumento} onChange={e => setAccompagnatori(prev => prev.map((a, j) => j === i ? { ...a, tipoDocumento: e.target.value } : a))} className={inp}>
                      {TIPI_DOC.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input value={acc.numeroDocumento} onChange={e => setAccompagnatori(prev => prev.map((a, j) => j === i ? { ...a, numeroDocumento: e.target.value.toUpperCase() } : a))} placeholder="N° documento" className={`${inp} font-mono`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── SEZIONE 4: Registration Card + Firma ──────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">{maxAcc > 0 ? '4' : '3'}</div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4" /> Condizioni e firma</h2>
          </div>

          {/* T&C text */}
          <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto text-xs text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">
            {regCard}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mb-4">
            <label className={`flex items-start gap-3 cursor-pointer ${erroriCampi.accettaTermini ? 'text-red-600' : ''}`}>
              <input type="checkbox" checked={accettaTermini} onChange={e => { setAccettaTermini(e.target.checked); if (erroriCampi.accettaTermini) setErroriCampi(er => { const n = { ...er }; delete n.accettaTermini; return n }) }}
                className={`mt-0.5 w-4 h-4 rounded ${erroriCampi.accettaTermini ? 'border-red-400 text-red-500' : 'border-gray-300 text-indigo-600'}`} />
              <span className="text-sm">Accetto i <strong>Termini e Condizioni</strong> della struttura <span className="text-red-500">*</span></span>
            </label>
            {erroriCampi.accettaTermini && <p className={`${errLabel} ml-7`}>Devi accettare per proseguire</p>}

            <label className={`flex items-start gap-3 cursor-pointer ${erroriCampi.accettaPrivacy ? 'text-red-600' : ''}`}>
              <input type="checkbox" checked={accettaPrivacy} onChange={e => { setAccettaPrivacy(e.target.checked); if (erroriCampi.accettaPrivacy) setErroriCampi(er => { const n = { ...er }; delete n.accettaPrivacy; return n }) }}
                className={`mt-0.5 w-4 h-4 rounded ${erroriCampi.accettaPrivacy ? 'border-red-400 text-red-500' : 'border-gray-300 text-indigo-600'}`} />
              <span className="text-sm">Accetto l&apos;<strong>Informativa Privacy</strong> (GDPR) <span className="text-red-500">*</span></span>
            </label>
            {erroriCampi.accettaPrivacy && <p className={`${errLabel} ml-7`}>Devi accettare per proseguire</p>}

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consensoMarketing} onChange={e => setConsensoMarketing(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600" />
              <span className="text-sm text-gray-500">Acconsento a ricevere comunicazioni promozionali <span className="text-xs">(opzionale)</span></span>
            </label>
          </div>

          {/* Firma */}
          <div className={erroriCampi.firma ? 'ring-2 ring-red-400 rounded-xl' : ''}>
            <p className="text-xs font-medium text-gray-500 mb-2">Firma digitale <span className="text-red-500">*</span></p>
            <SignaturePad
              onSave={(b64) => { setFirmaBase64(b64); if (erroriCampi.firma) setErroriCampi(er => { const n = { ...er }; delete n.firma; return n }) }}
              onClear={() => setFirmaBase64(null)}
            />
          </div>
          {erroriCampi.firma && <p className={errLabel}>Firma obbligatoria — disegna la tua firma e clicca &quot;Salva Firma&quot;</p>}
        </section>
      </div>

      {/* Submit */}
      <div className="p-5 bg-gray-50 border-t">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-base transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {loading ? 'Invio in corso...' : 'Completa check-in'}
        </button>
      </div>
    </div>
  )
}
