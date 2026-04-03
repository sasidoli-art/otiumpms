'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, AlertTriangle, Heart, Droplets, Music, Thermometer } from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'

const CONDIZIONI = [
  { id: 'pressione_alta', label: 'Pressione alta' },
  { id: 'pressione_bassa', label: 'Pressione bassa' },
  { id: 'diabete', label: 'Diabete' },
  { id: 'epilessia', label: 'Epilessia' },
  { id: 'problemi_cardiaci', label: 'Problemi cardiaci' },
  { id: 'problemi_circolatori', label: 'Problemi circolatori' },
  { id: 'problemi_respiratori', label: 'Problemi respiratori' },
  { id: 'problemi_schiena', label: 'Problemi alla schiena' },
  { id: 'interventi_recenti', label: 'Interventi chirurgici recenti' },
  { id: 'infiammazioni', label: 'Infiammazioni in corso' },
]

const ALLERGIE = [
  { id: 'lattice', label: 'Lattice' },
  { id: 'oli_essenziali', label: 'Oli essenziali' },
  { id: 'profumi', label: 'Profumi' },
  { id: 'nichel', label: 'Nichel' },
  { id: 'parabeni', label: 'Parabeni' },
]

const ZONE_CORPO = [
  'testa', 'viso', 'collo', 'spalle', 'braccia', 'mani',
  'petto', 'addome', 'schienaAlta', 'schienaBassa',
  'glutei', 'gambe', 'ginocchia', 'piedi',
]

const ZONE_LABELS: Record<string, string> = {
  testa: 'Testa', viso: 'Viso', collo: 'Collo', spalle: 'Spalle', braccia: 'Braccia', mani: 'Mani',
  petto: 'Petto', addome: 'Addome', schienaAlta: 'Schiena alta', schienaBassa: 'Schiena bassa',
  glutei: 'Glutei', gambe: 'Gambe', ginocchia: 'Ginocchia', piedi: 'Piedi',
}

export default function WellnessCardForm({ appuntamentoId, guestNome, guestCognome }: { appuntamentoId: string; guestNome: string; guestCognome: string }) {
  const [loading, setLoading] = useState(false)
  const [completato, setCompletato] = useState(false)
  const [errore, setErrore] = useState('')

  const [incinta, setIncinta] = useState(false)
  const [incintaMesi, setIncintaMesi] = useState('')
  const [condizioni, setCondizioni] = useState<string[]>([])
  const [condizioneAltro, setCondizioneAltro] = useState('')
  const [allergie, setAllergie] = useState<string[]>([])
  const [allergieAltro, setAllergieAltro] = useState('')
  const [patologie, setPatologie] = useState('')
  const [farmaci, setFarmaci] = useState('')
  const [zoneTrattate, setZoneTrattate] = useState<string[]>([])
  const [zoneEvitare, setZoneEvitare] = useState<string[]>([])
  const [pressione, setPressione] = useState('')
  const [temperatura, setTemperatura] = useState('')
  const [musica, setMusica] = useState('')
  const [aromi, setAromi] = useState('')
  const [notePreferenze, setNotePreferenze] = useState('')
  const [nessunaCond, setNessunaCond] = useState(false)
  const [accettaTermini, setAccettaTermini] = useState(false)
  const [accettaPrivacy, setAccettaPrivacy] = useState(false)
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null)

  function toggleArr(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  async function invia() {
    if (!accettaTermini || !accettaPrivacy) { setErrore('Accetta termini e privacy'); return }
    if (!firmaBase64) { setErrore('Firma obbligatoria'); return }

    setLoading(true); setErrore('')
    try {
      const res = await fetch('/api/spa/waiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appuntamentoId,
          incinta, incintaMesi: incintaMesi ? Number(incintaMesi) : null,
          condizioni, condizioneAltro: condizioneAltro || null,
          allergieSelezionate: allergie, allergieAltro: allergieAltro || null,
          allergie: patologie || null,
          patologie: patologie || null,
          farmaci: farmaci || null,
          zoneTrattate, zoneEvitare,
          pressioneMassaggio: pressione || null,
          temperaturaPreferita: temperatura || null,
          musicaPreferita: musica || null,
          aromiPreferiti: aromi || null,
          notePreferenze: notePreferenze || null,
          dichiarazioneNessuna: nessunaCond,
          accettazioneTermini: accettaTermini,
          accettazionePrivacy: accettaPrivacy,
          firmaBase64,
        }),
      })
      if (res.ok) setCompletato(true)
      else {
        const d = await res.json().catch(() => ({}))
        setErrore(d.error || 'Errore invio')
      }
    } catch { setErrore('Errore di connessione') }
    setLoading(false)
  }

  if (completato) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center animate-fadeIn">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Wellness Card completata!</h2>
        <p className="text-sm text-gray-500 mt-2">Il terapista è pronto ad accoglierti.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {errore && (
        <div className="mx-5 mt-5 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {errore}
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Dichiarazione salute */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" /> Condizioni di salute
          </h2>

          <label className="flex items-center gap-3 mb-3 p-3 bg-pink-50 rounded-xl cursor-pointer">
            <input type="checkbox" checked={incinta} onChange={e => setIncinta(e.target.checked)} className="w-4 h-4 rounded text-pink-500" />
            <span className="text-sm font-medium text-pink-700">Sono in gravidanza</span>
            {incinta && (
              <input type="number" value={incintaMesi} onChange={e => setIncintaMesi(e.target.value)} placeholder="Mese" className="w-16 px-2 py-1 border rounded-lg text-xs ml-auto" min={1} max={9} />
            )}
          </label>

          <div className="space-y-2 mb-3">
            {CONDIZIONI.map(c => (
              <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={condizioni.includes(c.id)} onChange={() => toggleArr(condizioni, setCondizioni, c.id)} className="w-4 h-4 rounded text-purple-500" />
                <span className="text-sm text-gray-700">{c.label}</span>
              </label>
            ))}
            <input value={condizioneAltro} onChange={e => setCondizioneAltro(e.target.value)} placeholder="Altro (specificare)" className="input text-sm" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-green-50 rounded-xl">
            <input type="checkbox" checked={nessunaCond} onChange={e => setNessunaCond(e.target.checked)} className="w-4 h-4 rounded text-green-500" />
            <span className="text-sm font-medium text-green-700">Dichiaro di non avere condizioni mediche rilevanti</span>
          </label>
        </section>

        {/* Allergie */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3">Allergie</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {ALLERGIE.map(a => (
              <button key={a.id} type="button" onClick={() => toggleArr(allergie, setAllergie, a.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${allergie.includes(a.id) ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-500 border-2 border-transparent'}`}>
                {a.label}
              </button>
            ))}
          </div>
          <input value={allergieAltro} onChange={e => setAllergieAltro(e.target.value)} placeholder="Altre allergie" className="input text-sm" />
          <div className="grid grid-cols-1 gap-3 mt-3">
            <input value={patologie} onChange={e => setPatologie(e.target.value)} placeholder="Patologie note" className="input text-sm" />
            <input value={farmaci} onChange={e => setFarmaci(e.target.value)} placeholder="Farmaci in uso" className="input text-sm" />
          </div>
        </section>

        {/* Zone corpo */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3">Zone del corpo</h2>
          <p className="text-xs text-gray-400 mb-3">Seleziona le zone da trattare (verde) e quelle da evitare (rosso)</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {ZONE_CORPO.map(z => {
              const trattata = zoneTrattate.includes(z)
              const evitata = zoneEvitare.includes(z)
              return (
                <button key={z} type="button" onClick={() => {
                  if (!trattata && !evitata) { setZoneTrattate(p => [...p, z]) }
                  else if (trattata) { setZoneTrattate(p => p.filter(v => v !== z)); setZoneEvitare(p => [...p, z]) }
                  else { setZoneEvitare(p => p.filter(v => v !== z)) }
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  trattata ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                  evitata ? 'bg-red-100 text-red-700 border-2 border-red-300' :
                  'bg-gray-50 text-gray-500 border-2 border-transparent'
                }`}>
                  {ZONE_LABELS[z]}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Tocca: 1x = trattare (verde), 2x = evitare (rosso), 3x = rimuovi</p>
        </section>

        {/* Preferenze */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3">Preferenze trattamento</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Heart className="w-3 h-3 text-pink-400" /> Pressione</label>
              <select value={pressione} onChange={e => setPressione(e.target.value)} className="input text-sm">
                <option value="">—</option>
                <option value="leggera">Leggera</option>
                <option value="media">Media</option>
                <option value="forte">Forte</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Thermometer className="w-3 h-3 text-orange-400" /> Temperatura</label>
              <select value={temperatura} onChange={e => setTemperatura(e.target.value)} className="input text-sm">
                <option value="">—</option>
                <option value="freddo">Freddo</option>
                <option value="tiepido">Tiepido</option>
                <option value="caldo">Caldo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Music className="w-3 h-3 text-indigo-400" /> Musica</label>
              <select value={musica} onChange={e => setMusica(e.target.value)} className="input text-sm">
                <option value="">—</option>
                <option value="si">Sì</option>
                <option value="no">No</option>
                <option value="indifferente">Indifferente</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Droplets className="w-3 h-3 text-teal-400" /> Aromi</label>
              <select value={aromi} onChange={e => setAromi(e.target.value)} className="input text-sm">
                <option value="">—</option>
                <option value="si">Sì</option>
                <option value="senza">Senza</option>
              </select>
            </div>
          </div>
          <textarea value={notePreferenze} onChange={e => setNotePreferenze(e.target.value)} placeholder="Altre preferenze o richieste..." className="input text-sm mt-3" rows={2} />
        </section>

        {/* Termini + Firma */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3">Firma</h2>
          <div className="space-y-2 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={accettaTermini} onChange={e => setAccettaTermini(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-purple-600" />
              <span className="text-sm">Accetto le <strong>condizioni del servizio</strong> <span className="text-red-500">*</span></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={accettaPrivacy} onChange={e => setAccettaPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-purple-600" />
              <span className="text-sm">Accetto l&apos;<strong>informativa privacy</strong> (GDPR Art. 9) <span className="text-red-500">*</span></span>
            </label>
          </div>
          <SignaturePad onSave={setFirmaBase64} onClear={() => setFirmaBase64(null)} />
        </section>
      </div>

      {/* Submit */}
      <div className="p-5 bg-purple-50 border-t">
        <button onClick={invia} disabled={loading} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-base transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {loading ? 'Invio in corso...' : 'Conferma Wellness Card'}
        </button>
      </div>
    </div>
  )
}
