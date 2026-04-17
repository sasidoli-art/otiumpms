'use client'

import { useState, useCallback, useImperativeHandle, forwardRef, type ForwardedRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, Shield, Heart } from 'lucide-react'
import { BodyMapSimple } from '@/components/spa/body-map-simple'
import { SignaturePad } from '@/components/spa/signature-pad'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GuestData {
  nome: string; cognome: string; email: string; telefono: string
}

export interface WaiverData {
  dichiarazioneNessuna: boolean
  condizioni: string[]
  condizioneAltro: string
  incinta: boolean
  incintaMesi: number
  allergieSelezionate: string[]
  allergieAltro: string
  zoneEvitare: string[]
  pressioneMassaggio: string
  temperaturaPreferita: string
  musicaPreferita: string
  aromiPreferiti: string
  notePreferenze: string
  accettazioneTermini: boolean
  accettazionePrivacy: boolean
  consensoFoto: boolean
  consensoArt9: boolean
  firmaBase64: string | null
}

export interface StepDatiWaiverRef {
  validate: () => boolean
}

interface Props {
  prenotazioneGuest?: { nome: string; cognome: string; email: string; telefono?: string | null } | null
  categoriaTrattamento?: string
  regCardSpaTerminiHtml?: string | null
  onChange: (data: { guest: GuestData; waiver: WaiverData }) => void
  accentColor?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CONDIZIONI = [
  'Pressione alta', 'Pressione bassa', 'Diabete', 'Epilessia',
  'Problemi cardiaci', 'Problemi circolatori', 'Interventi recenti',
  'Fratture recenti', 'Problemi alla schiena', 'Gravidanza', 'Altro',
]

const ALLERGIE = [
  'Lattice', 'Oli essenziali', 'Profumi/fragranze', 'Nichel',
  'Nessuna allergia', 'Altro',
]

const SHOW_BODY_MAP = ['MASSAGGIO', 'CORPO', 'RITUALI', 'COPPIA']
const SHOW_PREFERENCES = ['MASSAGGIO', 'CORPO', 'RITUALI', 'COPPIA']

// ─── Component ──────────────────────────────────────────────────────────────

const StepDatiWaiver = forwardRef(function StepDatiWaiver(
  { prenotazioneGuest, categoriaTrattamento, regCardSpaTerminiHtml, onChange, accentColor }: Props,
  ref: ForwardedRef<StepDatiWaiverRef>,
) {
  const accent = accentColor || '#4f46e5'
  const cat = categoriaTrattamento || 'MASSAGGIO'
  const isReadonly = !!prenotazioneGuest?.nome

  // Guest
  const [guest, setGuest] = useState<GuestData>({
    nome: prenotazioneGuest?.nome || '',
    cognome: prenotazioneGuest?.cognome || '',
    email: prenotazioneGuest?.email || '',
    telefono: prenotazioneGuest?.telefono || '',
  })

  // Waiver
  const [percorso, setPercorso] = useState<'none' | 'sano' | 'segnalazioni'>('none')
  const [condizioni, setCondizioni] = useState<string[]>([])
  const [condizioneAltro, setCondizioneAltro] = useState('')
  const [incintaMesi, setIncintaMesi] = useState(0)
  const [allergie, setAllergie] = useState<string[]>([])
  const [allergieAltro, setAllergieAltro] = useState('')
  const [zoneEvitare, setZoneEvitare] = useState<string[]>([])
  const [pressione, setPressione] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [musica, setMusica] = useState('')
  const [aromi, setAromi] = useState('')
  const [notePreferenze, setNotePreferenze] = useState('')
  const [accTermini, setAccTermini] = useState(false)
  const [accPrivacy, setAccPrivacy] = useState(false)
  const [consensoFoto, setConsensoFoto] = useState(false)
  const [consensoArt9, setConsensoArt9] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)
  const [showTermini, setShowTermini] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const emitChange = useCallback(() => {
    onChange({
      guest,
      waiver: {
        dichiarazioneNessuna: percorso === 'sano',
        condizioni, condizioneAltro,
        incinta: condizioni.includes('Gravidanza'), incintaMesi,
        allergieSelezionate: allergie, allergieAltro,
        zoneEvitare, pressioneMassaggio: pressione,
        temperaturaPreferita: temperatura, musicaPreferita: musica,
        aromiPreferiti: aromi, notePreferenze,
        accettazioneTermini: accTermini, accettazionePrivacy: accPrivacy,
        consensoFoto, consensoArt9, firmaBase64: firma,
      },
    })
  }, [guest, percorso, condizioni, condizioneAltro, incintaMesi, allergie, allergieAltro, zoneEvitare, pressione, temperatura, musica, aromi, notePreferenze, accTermini, accPrivacy, consensoFoto, consensoArt9, firma, onChange])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!guest.nome.trim()) e.nome = 'obbligatorio'
    if (!guest.cognome.trim()) e.cognome = 'obbligatorio'
    if (!guest.email.trim()) e.email = 'obbligatoria'
    if (percorso === 'none') e.percorso = 'Seleziona un\'opzione'
    if (!accTermini) e.accTermini = 'obbligatorio'
    if (!accPrivacy) e.accPrivacy = 'obbligatorio'
    if (!firma) e.firma = 'Firma obbligatoria'
    if (percorso === 'segnalazioni') {
      if (condizioni.length === 0 && allergie.length === 0) e.segnalazioni = 'Indica almeno una condizione o allergia'
      if (!consensoArt9) e.consensoArt9 = 'Consenso dati sanitari obbligatorio'
    }
    setErrors(e)
    emitChange()
    return Object.keys(e).length === 0
  }, [guest, percorso, accTermini, accPrivacy, firma, condizioni, allergie, consensoArt9, emitChange])

  useImperativeHandle(ref, () => ({ validate }))

  const toggleCondizione = (c: string) => {
    setCondizioni(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  const toggleAllergia = (a: string) => {
    if (a === 'Nessuna allergia') { setAllergie(['Nessuna allergia']); return }
    setAllergie(prev => {
      const next = prev.filter(x => x !== 'Nessuna allergia')
      return next.includes(a) ? next.filter(x => x !== a) : [...next, a]
    })
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors'
  const label = 'block text-xs font-semibold text-gray-700 mb-1.5'
  const errMsg = 'text-[10px] text-red-500 mt-0.5'
  const pill = (active: boolean) => `px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${active ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`

  return (
    <div className="space-y-6 pb-4 px-4">
      {/* ═══ PARTE A: Dati ospite ═══ */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-1">I tuoi dati</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Nome *</label>
              <input type="text" value={guest.nome} readOnly={isReadonly}
                onChange={e => setGuest(g => ({ ...g, nome: e.target.value }))}
                className={`${inp} ${isReadonly ? 'bg-gray-100 text-gray-500' : ''} ${errors.nome ? 'border-red-400' : ''}`} />
            </div>
            <div>
              <label className={label}>Cognome *</label>
              <input type="text" value={guest.cognome} readOnly={isReadonly}
                onChange={e => setGuest(g => ({ ...g, cognome: e.target.value }))}
                className={`${inp} ${isReadonly ? 'bg-gray-100 text-gray-500' : ''} ${errors.cognome ? 'border-red-400' : ''}`} />
            </div>
          </div>
          <div>
            <label className={label}>Email *</label>
            <input type="email" value={guest.email} readOnly={isReadonly}
              onChange={e => setGuest(g => ({ ...g, email: e.target.value }))}
              className={`${inp} ${isReadonly ? 'bg-gray-100 text-gray-500' : ''} ${errors.email ? 'border-red-400' : ''}`} />
          </div>
          <div>
            <label className={label}>Telefono <span className="text-gray-400 font-normal">(opzionale)</span></label>
            <input type="tel" value={guest.telefono} placeholder="+39 333 123 4567"
              onChange={e => setGuest(g => ({ ...g, telefono: e.target.value }))}
              className={inp} />
          </div>
        </div>
      </div>

      {/* ═══ PARTE B: Waiver Smart — domanda iniziale ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-900">Prima del trattamento</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">Per la tua sicurezza, abbiamo bisogno di sapere se hai condizioni mediche rilevanti.</p>

        <div className="space-y-2">
          <button type="button" onClick={() => setPercorso('sano')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
              percorso === 'sano' ? 'shadow-sm' : 'border-gray-100 hover:border-gray-200'
            }`} style={percorso === 'sano' ? { borderColor: accent } : undefined}>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Sto bene, nessuna condizione da segnalare</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Procedi direttamente alla firma</p>
            </div>
          </button>

          <button type="button" onClick={() => setPercorso('segnalazioni')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
              percorso === 'segnalazioni' ? 'shadow-sm' : 'border-gray-100 hover:border-gray-200'
            }`} style={percorso === 'segnalazioni' ? { borderColor: '#f59e0b' } : undefined}>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Ho qualcosa da segnalare</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Condizioni mediche, allergie, zone sensibili</p>
            </div>
          </button>
        </div>
        {errors.percorso && <p className={errMsg}>{errors.percorso}</p>}
      </div>

      {/* ═══ PARTE B2: Percorso segnalazioni ═══ */}
      <AnimatePresence>
        {percorso === 'segnalazioni' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="space-y-5 overflow-hidden">

            {/* 1. Condizioni di salute */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Condizioni di salute</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONDIZIONI.map(c => (
                  <button key={c} type="button" onClick={() => toggleCondizione(c)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      condizioni.includes(c) ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {condizioni.includes(c) && <Check className="w-3 h-3 text-amber-600 shrink-0" />}
                    {c}
                  </button>
                ))}
              </div>
              {condizioni.includes('Gravidanza') && (
                <div className="mt-2">
                  <label className={label}>Mese di gravidanza</label>
                  <select value={incintaMesi} onChange={e => setIncintaMesi(Number(e.target.value))} className={inp}>
                    <option value={0}>Seleziona</option>
                    {Array.from({ length: 9 }, (_, i) => <option key={i+1} value={i+1}>{i+1}° mese</option>)}
                  </select>
                </div>
              )}
              {condizioni.includes('Altro') && (
                <textarea value={condizioneAltro} onChange={e => setCondizioneAltro(e.target.value)}
                  placeholder="Descrivi..." rows={2} className={`${inp} mt-2`} />
              )}
            </div>

            {/* 2. Allergie */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Allergie</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALLERGIE.map(a => (
                  <button key={a} type="button" onClick={() => toggleAllergia(a)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      allergie.includes(a) ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {allergie.includes(a) && <Check className="w-3 h-3 text-red-600 shrink-0" />}
                    {a}
                  </button>
                ))}
              </div>
              {allergie.includes('Altro') && (
                <textarea value={allergieAltro} onChange={e => setAllergieAltro(e.target.value)}
                  placeholder="Descrivi..." rows={2} className={`${inp} mt-2`} />
              )}
            </div>

            {/* 3. Body map (solo per categorie corpo) */}
            {SHOW_BODY_MAP.includes(cat) && (
              <div>
                <p className="text-sm font-bold text-gray-900 mb-2">Zone da evitare</p>
                <p className="text-xs text-gray-500 mb-3">Tocca le zone del corpo dove preferisci non essere toccato.</p>
                <BodyMapSimple selectedZones={zoneEvitare} onZonesChange={setZoneEvitare} />
              </div>
            )}

            {/* 4. Consenso Art. 9 GDPR */}
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-800 leading-relaxed mb-3">
                I dati sanitari indicati saranno trattati nel rispetto dell&apos;Art. 9 GDPR e conservati per 90 giorni.
              </p>
              <label className={`flex items-start gap-3 cursor-pointer ${errors.consensoArt9 ? 'text-red-600' : ''}`}>
                <input type="checkbox" checked={consensoArt9} onChange={e => setConsensoArt9(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }} />
                <span className="text-sm font-medium">Acconsento al trattamento dei miei dati sanitari *</span>
              </label>
              {errors.consensoArt9 && <p className={errMsg}>{errors.consensoArt9}</p>}
            </div>

            {errors.segnalazioni && <p className={errMsg}>{errors.segnalazioni}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PARTE C: Preferenze trattamento ═══ */}
      {percorso !== 'none' && SHOW_PREFERENCES.includes(cat) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm font-bold text-gray-900 mb-3">Personalizza il tuo trattamento</p>
          <div className="space-y-3">
            <div>
              <label className={label}>Pressione massaggio</label>
              <div className="flex gap-2">
                {['Leggera', 'Media', 'Forte'].map(p => (
                  <button key={p} type="button" onClick={() => setPressione(p)}
                    className={pill(pressione === p)} style={pressione === p ? { backgroundColor: accent } : undefined}>{p}</button>
                ))}
              </div>
            </div>
            {!['VISO', 'BAGNI'].includes(cat) && (
              <div>
                <label className={label}>Temperatura</label>
                <div className="flex gap-2">
                  {['Fresco', 'Tiepido', 'Caldo'].map(t => (
                    <button key={t} type="button" onClick={() => setTemperatura(t)}
                      className={pill(temperatura === t)} style={temperatura === t ? { backgroundColor: accent } : undefined}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className={label}>Musica di sottofondo</label>
              <div className="flex gap-2">
                {['Sì', 'No', 'Indifferente'].map(m => (
                  <button key={m} type="button" onClick={() => setMusica(m)}
                    className={pill(musica === m)} style={musica === m ? { backgroundColor: accent } : undefined}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Aromi</label>
              <div className="flex gap-2">
                {['Sì', 'Senza'].map(a => (
                  <button key={a} type="button" onClick={() => setAromi(a)}
                    className={pill(aromi === a)} style={aromi === a ? { backgroundColor: accent } : undefined}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Note o preferenze</label>
              <textarea value={notePreferenze} onChange={e => setNotePreferenze(e.target.value.slice(0, 500))}
                placeholder="Altre preferenze o richieste..." rows={2} className={inp} maxLength={500} />
              <p className="text-[9px] text-gray-400 text-right mt-0.5">{notePreferenze.length}/500</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ PARTE D: Firma + consensi ═══ */}
      {percorso !== 'none' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="space-y-2">
            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${
              accTermini ? 'border-green-200 bg-green-50/50' : errors.accTermini ? 'border-red-200' : 'border-gray-200'
            }`}>
              <input type="checkbox" checked={accTermini} onChange={e => setAccTermini(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }} />
              <div>
                <p className="text-sm font-medium text-gray-800">Accetto i termini del trattamento *</p>
                {regCardSpaTerminiHtml && (
                  <button type="button" onClick={() => setShowTermini(!showTermini)}
                    className="text-[10px] font-semibold mt-0.5" style={{ color: accent }}>
                    {showTermini ? 'Chiudi termini' : 'Leggi termini'}
                  </button>
                )}
              </div>
            </label>
            {showTermini && regCardSpaTerminiHtml && (
              <div className="bg-white border rounded-xl p-4 text-xs text-gray-600 max-h-36 overflow-y-auto prose prose-xs"
                dangerouslySetInnerHTML={{ __html: regCardSpaTerminiHtml }} />
            )}

            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${
              accPrivacy ? 'border-green-200 bg-green-50/50' : errors.accPrivacy ? 'border-red-200' : 'border-gray-200'
            }`}>
              <input type="checkbox" checked={accPrivacy} onChange={e => setAccPrivacy(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }} />
              <p className="text-sm font-medium text-gray-800">Accetto l&apos;informativa privacy *</p>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200">
              <input type="checkbox" checked={consensoFoto} onChange={e => setConsensoFoto(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded shrink-0" style={{ accentColor: accent }} />
              <div>
                <p className="text-sm font-medium text-gray-800">Consenso foto</p>
                <p className="text-[10px] text-gray-500">Acconsento a foto durante il trattamento (opzionale)</p>
              </div>
            </label>
          </div>

          {/* Firma */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-bold text-gray-900">Firma</p>
            </div>
            <p className="text-xs text-gray-500 mb-2">Firma con il dito nel riquadro.</p>
            <div className={`border-2 border-dashed rounded-xl overflow-hidden ${
              errors.firma ? 'border-red-300' : firma ? 'border-green-300' : 'border-gray-300'
            }`} style={{ minHeight: 200 }}>
              <SignaturePad onSave={b64 => setFirma(b64)} onClear={() => setFirma(null)} />
            </div>
            {errors.firma && <p className={errMsg}>{errors.firma}</p>}
            {firma && <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Firma acquisita</p>}
          </div>
        </motion.div>
      )}
    </div>
  )
})

export default StepDatiWaiver
