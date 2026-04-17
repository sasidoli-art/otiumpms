'use client'

import {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ForwardedRef,
} from 'react'
import { STATI, PROVINCE_ITALIANE, isItaliano } from '@/lib/nazionalita'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DatiPersonaliData {
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono: string
  guestSesso: string
  guestGiornoNascita: string
  guestMeseNascita: string
  guestAnnoNascita: string
  guestLuogoNascita: string
  guestComuneNascitaIstat: string
  guestProvinciaNascita: string
  guestStatoNascitaIstat: string
  guestCittadinanzaIstat: string
  guestCodiceFiscale: string
  natoEstero: boolean
}

export interface StepDatiPersonaliRef {
  validate: () => boolean
}

interface Props {
  prenotazione: {
    guestNome: string
    guestCognome: string
    guestEmail?: string
    guestTelefono?: string | null
    guestSesso?: string | null
    guestDataNascita?: string | null
    guestLuogoNascita?: string | null
    guestComuneNascitaIstat?: string | null
    guestProvinciaNascita?: string | null
    guestStatoNascitaIstat?: string | null
    guestCittadinanzaIstat?: string | null
    guestCodiceFiscale?: string | null
  }
  onChange: (data: Partial<DatiPersonaliData>) => void
  accentColor?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

const currentYear = new Date().getFullYear()
const ANNI = Array.from({ length: 100 }, (_, i) => currentYear - 16 - i) // 16-116 years old

function parseDataNascita(iso: string | null | undefined): { g: string; m: string; a: string } {
  if (!iso) return { g: '', m: '', a: '' }
  const d = new Date(iso)
  return {
    g: String(d.getDate()),
    m: String(d.getMonth() + 1),
    a: String(d.getFullYear()),
  }
}

function validateCF(cf: string): boolean {
  if (!cf) return true // optional
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf)
}

// ─── Component ──────────────────────────────────────────────────────────────

const StepDatiPersonali = forwardRef(function StepDatiPersonali(
  { prenotazione: p, onChange, accentColor }: Props,
  ref: ForwardedRef<StepDatiPersonaliRef>,
) {
  const accent = accentColor || '#4f46e5'
  const dataNascitaParsed = parseDataNascita(p.guestDataNascita)

  const [form, setForm] = useState<DatiPersonaliData>({
    guestNome: p.guestNome || '',
    guestCognome: p.guestCognome || '',
    guestEmail: p.guestEmail || '',
    guestTelefono: p.guestTelefono || '',
    guestSesso: p.guestSesso || '',
    guestGiornoNascita: dataNascitaParsed.g,
    guestMeseNascita: dataNascitaParsed.m,
    guestAnnoNascita: dataNascitaParsed.a,
    guestLuogoNascita: p.guestLuogoNascita || '',
    guestComuneNascitaIstat: p.guestComuneNascitaIstat || '',
    guestProvinciaNascita: p.guestProvinciaNascita || '',
    guestStatoNascitaIstat: p.guestStatoNascitaIstat || '100000100',
    guestCittadinanzaIstat: p.guestCittadinanzaIstat || '100000100',
    guestCodiceFiscale: p.guestCodiceFiscale || '',
    natoEstero: p.guestStatoNascitaIstat ? p.guestStatoNascitaIstat !== '100000100' : false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = useCallback((key: keyof DatiPersonaliData, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      onChange(next)
      return next
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [onChange])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}

    if (!form.guestNome.trim()) e.guestNome = 'Nome obbligatorio'
    if (!form.guestCognome.trim()) e.guestCognome = 'Cognome obbligatorio'
    if (!form.guestSesso) e.guestSesso = 'Seleziona sesso'
    if (!form.guestGiornoNascita || !form.guestMeseNascita || !form.guestAnnoNascita) {
      e.guestDataNascita = 'Data di nascita obbligatoria'
    }
    if (!form.guestLuogoNascita.trim()) e.guestLuogoNascita = 'Luogo di nascita obbligatorio'

    // CF validation (solo per italiani)
    const cittadinanzaItaliana = isItaliano(form.guestCittadinanzaIstat)
    if (cittadinanzaItaliana && form.guestCodiceFiscale && !validateCF(form.guestCodiceFiscale)) {
      e.guestCodiceFiscale = 'Formato codice fiscale non valido'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  useImperativeHandle(ref, () => ({ validate }))

  const cittadinanzaItaliana = isItaliano(form.guestCittadinanzaIstat)

  // Styling
  const inp = 'w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition-colors'
  const inpOk = 'border-gray-200 focus:ring-indigo-400'
  const inpErr = 'border-red-400 bg-red-50 focus:ring-red-400'
  const label = 'block text-xs font-semibold text-gray-700 mb-1.5'
  const errMsg = 'text-[10px] text-red-500 mt-1'
  const sectionTitle = 'text-sm font-bold text-gray-900 mb-1'
  const sectionDesc = 'text-xs text-gray-500 mb-4 leading-relaxed'

  return (
    <div className="space-y-6 pb-4">
      {/* ─── Sezione 1: Dati base (precompilati) ────────────────────── */}
      <div>
        <p className={sectionTitle}>I tuoi dati</p>
        <p className={sectionDesc}>Verifica che i dati siano corretti.</p>

        <div className="space-y-3">
          <div>
            <label className={label}>Nome</label>
            <input
              type="text" value={form.guestNome}
              onChange={e => set('guestNome', e.target.value)}
              readOnly={!!p.guestNome}
              className={`${inp} ${errors.guestNome ? inpErr : inpOk} ${p.guestNome ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
            {errors.guestNome && <p className={errMsg}>{errors.guestNome}</p>}
          </div>

          <div>
            <label className={label}>Cognome</label>
            <input
              type="text" value={form.guestCognome}
              onChange={e => set('guestCognome', e.target.value)}
              readOnly={!!p.guestCognome}
              className={`${inp} ${errors.guestCognome ? inpErr : inpOk} ${p.guestCognome ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
            {errors.guestCognome && <p className={errMsg}>{errors.guestCognome}</p>}
          </div>

          <div>
            <label className={label}>Email</label>
            <input
              type="email" value={form.guestEmail}
              readOnly
              className={`${inp} ${inpOk} bg-gray-100 text-gray-500 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className={label}>Telefono <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <input
              type="tel" value={form.guestTelefono}
              onChange={e => set('guestTelefono', e.target.value)}
              placeholder="+39 333 123 4567"
              className={`${inp} ${inpOk}`}
            />
          </div>
        </div>
      </div>

      {/* ─── Sezione 2: Dati anagrafici (Alloggiati Web) ────────────── */}
      <div>
        <p className={sectionTitle}>Dati anagrafici</p>
        <p className={sectionDesc}>
          Questi dati sono richiesti dalla normativa italiana per la registrazione degli ospiti
          (Art. 109 TULPS — Alloggiati Web).
        </p>

        {/* Sesso */}
        <div className="mb-4">
          <label className={label}>Sesso</label>
          <div className="grid grid-cols-2 gap-3">
            {(['M', 'F'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('guestSesso', s)}
                className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  form.guestSesso === s
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={form.guestSesso === s ? { backgroundColor: accent } : undefined}
              >
                {s === 'M' ? 'Maschio' : 'Femmina'}
              </button>
            ))}
          </div>
          {errors.guestSesso && <p className={errMsg}>{errors.guestSesso}</p>}
        </div>

        {/* Data di nascita — 3 select */}
        <div className="mb-4">
          <label className={label}>Data di nascita</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={form.guestGiornoNascita}
              onChange={e => set('guestGiornoNascita', e.target.value)}
              className={`${inp} ${errors.guestDataNascita ? inpErr : inpOk}`}
            >
              <option value="">Giorno</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>

            <select
              value={form.guestMeseNascita}
              onChange={e => set('guestMeseNascita', e.target.value)}
              className={`${inp} ${errors.guestDataNascita ? inpErr : inpOk}`}
            >
              <option value="">Mese</option>
              {MESI.map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>

            <select
              value={form.guestAnnoNascita}
              onChange={e => set('guestAnnoNascita', e.target.value)}
              className={`${inp} ${errors.guestDataNascita ? inpErr : inpOk}`}
            >
              <option value="">Anno</option>
              {ANNI.map(a => (
                <option key={a} value={String(a)}>{a}</option>
              ))}
            </select>
          </div>
          {errors.guestDataNascita && <p className={errMsg}>{errors.guestDataNascita}</p>}
        </div>

        {/* Nato in Italia o estero */}
        <div className="mb-4">
          <label className={label}>Nato/a in Italia?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                set('natoEstero', false)
                set('guestStatoNascitaIstat', '100000100')
              }}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                !form.natoEstero ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={!form.natoEstero ? { backgroundColor: accent } : undefined}
            >
              Sì, in Italia
            </button>
            <button
              type="button"
              onClick={() => set('natoEstero', true)}
              className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                form.natoEstero ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={form.natoEstero ? { backgroundColor: accent } : undefined}
            >
              No, all&apos;estero
            </button>
          </div>
        </div>

        {/* Luogo di nascita — condizionale Italia/Estero */}
        {!form.natoEstero ? (
          <>
            <div className="mb-4">
              <label className={label}>Comune di nascita</label>
              <input
                type="text"
                value={form.guestLuogoNascita}
                onChange={e => {
                  set('guestLuogoNascita', e.target.value)
                  // In una versione completa qui ci sarebbe un autocomplete
                  // che popola guestComuneNascitaIstat automaticamente.
                  // Per ora il codice ISTAT va inserito dall'operatore in reception.
                }}
                placeholder="Es. Roma, Milano, Napoli..."
                className={`${inp} ${errors.guestLuogoNascita ? inpErr : inpOk}`}
              />
              {errors.guestLuogoNascita && <p className={errMsg}>{errors.guestLuogoNascita}</p>}
            </div>

            <div className="mb-4">
              <label className={label}>Provincia di nascita</label>
              <select
                value={form.guestProvinciaNascita}
                onChange={e => set('guestProvinciaNascita', e.target.value)}
                className={`${inp} ${inpOk}`}
              >
                <option value="">Seleziona provincia</option>
                {PROVINCE_ITALIANE.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <label className={label}>Città di nascita</label>
              <input
                type="text"
                value={form.guestLuogoNascita}
                onChange={e => set('guestLuogoNascita', e.target.value)}
                placeholder="Es. London, Paris, Berlin..."
                className={`${inp} ${errors.guestLuogoNascita ? inpErr : inpOk}`}
              />
              {errors.guestLuogoNascita && <p className={errMsg}>{errors.guestLuogoNascita}</p>}
            </div>

            <div className="mb-4">
              <label className={label}>Stato di nascita</label>
              <select
                value={form.guestStatoNascitaIstat}
                onChange={e => set('guestStatoNascitaIstat', e.target.value)}
                className={`${inp} ${inpOk}`}
              >
                <option value="">Seleziona stato</option>
                {STATI.map(s => (
                  <option key={s.codice} value={s.codice}>{s.nome}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Cittadinanza */}
        <div className="mb-4">
          <label className={label}>Cittadinanza</label>
          <select
            value={form.guestCittadinanzaIstat}
            onChange={e => set('guestCittadinanzaIstat', e.target.value)}
            className={`${inp} ${inpOk}`}
          >
            <option value="100000100">Italiana</option>
            {STATI.filter(s => s.codice !== '100000100').map(s => (
              <option key={s.codice} value={s.codice}>{s.nome}</option>
            ))}
          </select>
        </div>

        {/* Codice Fiscale — solo per italiani */}
        {cittadinanzaItaliana && (
          <div className="mb-4">
            <label className={label}>
              Codice Fiscale <span className="text-gray-400 font-normal">(opzionale)</span>
            </label>
            <input
              type="text"
              value={form.guestCodiceFiscale}
              onChange={e => set('guestCodiceFiscale', e.target.value.toUpperCase())}
              placeholder="RSSMRA80A01H501Z"
              maxLength={16}
              className={`${inp} ${errors.guestCodiceFiscale ? inpErr : inpOk} uppercase font-mono tracking-wider`}
            />
            {errors.guestCodiceFiscale && <p className={errMsg}>{errors.guestCodiceFiscale}</p>}
          </div>
        )}
      </div>
    </div>
  )
})

export default StepDatiPersonali
