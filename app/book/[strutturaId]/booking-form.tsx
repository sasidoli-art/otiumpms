'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2, Calendar, ArrowRight, ArrowLeft, Users, Tag, Bed,
  ChevronLeft, ChevronRight, MapPin, Package,
} from 'lucide-react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isBefore, isAfter, isSameDay, startOfDay, isWeekend, differenceInCalendarDays,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { calcolaTassaSuggerita } from '@/lib/comuni-tassa-soggiorno'

type Struttura = {
  id: string
  nome: string
  prezzoBase: number
  citta?: string | null
  unita: { id: string; nome: string; capacita: number; prezzoBase: number; descrizione?: string | null }[]
}

type DettaglioNotte = {
  data: string
  prezzoBase: number
  prezzoFinale: number
  tariffaPeriodo: { nome: string; colore: string | null } | null
  regoleApplicate: { nome: string; tipo: string; delta: number }[]
}

type StanzaDisponibile = {
  id: string
  nome: string
  descrizione?: string | null
  capacita: number
  prezzoBase: number
  prezzoNotte: number
  prezzoTotale: number
  notti: number
  disponibile: boolean
  haRegoleDinamiche?: boolean
  dettaglioNotti?: DettaglioNotte[]
  tariffe: { id: string; nome: string; prezzo: number; colore: string | null; dataInizio: string; dataFine: string }[]
}

const inp = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400'

// ─── Mini Calendar Component ──────────────────────────────────────────────────

function MiniCalendar({
  arrivo,
  partenza,
  onSelect,
}: {
  arrivo: Date | null
  partenza: Date | null
  onSelect: (date: Date) => void
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const oggi = startOfDay(new Date())

  const giorni = useMemo(() => {
    const inizio = startOfMonth(viewMonth)
    const fine = endOfMonth(viewMonth)
    const days = eachDayOfInterval({ start: inizio, end: fine })
    // Pad inizio settimana (lun=1)
    const firstDow = inizio.getDay() || 7 // 0(dom)→7
    const padBefore = firstDow - 1
    return { days, padBefore }
  }, [viewMonth])

  function isInRange(d: Date) {
    if (!arrivo || !partenza) return false
    return isAfter(d, arrivo) && isBefore(d, partenza)
  }

  function isDisabled(d: Date) {
    return isBefore(d, oggi)
  }

  const DOW = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']

  return (
    <div>
      {/* Header navigazione mesi */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          disabled={isBefore(subMonths(viewMonth, 1), startOfMonth(oggi))}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-bold text-gray-800 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: it })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Giorni settimana */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Griglia giorni */}
      <div className="grid grid-cols-7">
        {/* Padding celle vuote */}
        {Array.from({ length: giorni.padBefore }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {giorni.days.map(day => {
          const disabled = isDisabled(day)
          const isArrivo = arrivo && isSameDay(day, arrivo)
          const isPartenza = partenza && isSameDay(day, partenza)
          const inRange = isInRange(day)
          const isToday = isSameDay(day, oggi)
          const we = isWeekend(day)

          let cellClass = 'relative flex items-center justify-center h-9 text-sm transition-all cursor-pointer '
          let textClass = ''

          if (disabled) {
            cellClass += 'cursor-not-allowed opacity-30 '
            textClass = 'text-gray-400'
          } else if (isArrivo) {
            cellClass += 'bg-indigo-600 text-white rounded-l-full '
            textClass = 'text-white font-bold'
          } else if (isPartenza) {
            cellClass += 'bg-indigo-600 text-white rounded-r-full '
            textClass = 'text-white font-bold'
          } else if (inRange) {
            cellClass += 'bg-indigo-100 '
            textClass = 'text-indigo-700 font-medium'
          } else {
            cellClass += 'hover:bg-indigo-50 rounded-lg '
            textClass = we ? 'text-rose-400' : isToday ? 'text-indigo-600 font-bold' : 'text-gray-700'
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(day)}
              className={cellClass}
            >
              <span className={textClass}>{day.getDate()}</span>
              {isToday && !isArrivo && !isPartenza && !inRange && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-indigo-600" /> Check-in/out
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-100" /> Soggiorno
        </span>
      </div>
    </div>
  )
}

// ─── Main Booking Form ────────────────────────────────────────────────────────

export default function BookingForm({ struttura }: { struttura: Struttura }) {
  const searchParams = useSearchParams()

  // Pre-fill da pacchetto (opzionale)
  const pacchettoNome = searchParams.get('pacchettoNome')
  const pacchettoPrezzo = searchParams.get('pacchettoPrezzo')
  const pacchettoId = searchParams.get('pacchettoId')
  const prefillNumOspiti = searchParams.get('numOspiti') ?? '1'

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [arrivoDate, setArrivoDate] = useState<Date | null>(null)
  const [partenzaDate, setPartenzaDate] = useState<Date | null>(null)
  const [stanze, setStanze] = useState<StanzaDisponibile[]>([])
  const [loadingStanze, setLoadingStanze] = useState(false)
  const [errStanze, setErrStanze] = useState('')
  const [selectedStanza, setSelectedStanza] = useState<StanzaDisponibile | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errForm, setErrForm] = useState('')
  const [successo, setSuccesso] = useState<{ chatId: string } | null>(null)

  // Form data stato
  const [formData, setFormData] = useState({
    guestNome: '',
    guestCognome: '',
    guestEmail: '',
    guestTelefono: '',
    numOspiti: prefillNumOspiti,
    guestNote: '',
  })

  const arrivo = arrivoDate ? format(arrivoDate, 'yyyy-MM-dd') : ''
  const partenza = partenzaDate ? format(partenzaDate, 'yyyy-MM-dd') : ''
  const notti = arrivoDate && partenzaDate ? differenceInCalendarDays(partenzaDate, arrivoDate) : 0

  // Tassa di soggiorno stimata (€/notte/persona, basata sul comune della struttura)
  const tassaPerNotte = useMemo(() => {
    if (!struttura.citta || !arrivoDate || !partenzaDate) return null
    return calcolaTassaSuggerita(struttura.citta, arrivoDate, partenzaDate)
  }, [struttura.citta, arrivoDate, partenzaDate])

  function handleCalendarSelect(day: Date) {
    if (!arrivoDate || (arrivoDate && partenzaDate)) {
      // Primo click o reset: imposta arrivo
      setArrivoDate(day)
      setPartenzaDate(null)
      setErrStanze('')
    } else {
      // Secondo click: imposta partenza
      if (isBefore(day, arrivoDate) || isSameDay(day, arrivoDate)) {
        // Se clicca prima o stessa data, resetta e usa come nuovo arrivo
        setArrivoDate(day)
        setPartenzaDate(null)
      } else {
        setPartenzaDate(day)
        setErrStanze('')
      }
    }
  }

  async function cercaDisponibilita() {
    if (!arrivo || !partenza || partenza <= arrivo) {
      setErrStanze('Seleziona check-in e check-out sul calendario'); return
    }
    setLoadingStanze(true); setErrStanze(''); setStanze([])
    const r = await fetch(`/api/book/${struttura.id}/disponibili?arrivo=${arrivo}&partenza=${partenza}`)
    if (!r.ok) { setErrStanze('Errore nel caricamento. Riprova.'); setLoadingStanze(false); return }
    const d = await r.json()
    setStanze(d.stanze ?? []); setLoadingStanze(false); setStep(2)
  }

  // Step 3 → Step 4 (riepilogo)
  function goToRiepilogo() {
    if (!formData.guestNome || !formData.guestCognome || !formData.guestEmail) {
      setErrForm('Compila tutti i campi obbligatori')
      return
    }
    setErrForm('')
    setStep(4)
  }

  // Step 4: invia prenotazione
  async function handleSubmit() {
    setSubmitting(true); setErrForm('')
    const body = {
      ...formData,
      numOspiti: Number(formData.numOspiti),
      unitaId: selectedStanza?.id ?? '',
      dataArrivo: arrivo,
      dataPartenza: partenza,
      ...(pacchettoId ? { pacchettoId } : {}),
    }
    const r = await fetch(`/api/book/${struttura.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) {
      const j = await r.json()
      setErrForm(j.error || 'Errore. Riprova.'); setSubmitting(false); return
    }
    const result = await r.json()
    setSuccesso(result); setSubmitting(false)
  }

  // ── Successo ──────────────────────────────────────────────────────────────
  if (successo) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Richiesta inviata!</h3>
        <p className="text-gray-600 text-sm mb-6">
          La tua richiesta è stata ricevuta. Verrai ricontattato al più presto.
        </p>
        <a
          href={`/book/chat/${successo.chatId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
        >
          Apri chat con l&apos;organizzatore →
        </a>
      </div>
    )
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  const allSteps = [
    { n: 1, label: 'Date' },
    { n: 2, label: 'Stanza' },
    { n: 3, label: 'Dati' },
    { n: 4, label: 'Conferma' },
  ] as const

  return (
    <div>
      {/* Banner pacchetto se prenotazione da pacchetto */}
      {pacchettoNome && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <Package className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800 truncate">Pacchetto: {pacchettoNome}</p>
            {pacchettoPrezzo && (
              <p className="text-xs text-indigo-500">Prezzo pacchetto: €{Number(pacchettoPrezzo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            )}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="flex items-center justify-between mb-6">
        {allSteps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className={`flex items-center gap-1 ${step >= s.n ? 'text-indigo-600' : 'text-gray-300'}`}>
              <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center border-2 ${
                step > s.n ? 'bg-indigo-600 border-indigo-600 text-white' :
                step === s.n ? 'border-indigo-600 text-indigo-600' :
                'border-gray-200 text-gray-300'
              }`}>{step > s.n ? '✓' : s.n}</span>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.n ? 'text-gray-700' : 'text-gray-300'}`}>{s.label}</span>
            </div>
            {i < allSteps.length - 1 && <div className={`flex-1 h-px mx-1.5 ${step > s.n ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Date con calendario visuale ────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <MiniCalendar
            arrivo={arrivoDate}
            partenza={partenzaDate}
            onSelect={handleCalendarSelect}
          />

          {/* Date selezionate */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border-2 transition-colors ${arrivoDate ? 'border-indigo-200 bg-indigo-50/50' : 'border-dashed border-gray-200'}`}>
              <p className="text-xs text-gray-400 mb-0.5">Check-in</p>
              {arrivoDate ? (
                <p className="text-sm font-semibold text-gray-800">
                  {format(arrivoDate, 'EEE d MMM yyyy', { locale: it })}
                </p>
              ) : (
                <p className="text-sm text-gray-300">Seleziona sul calendario</p>
              )}
            </div>
            <div className={`p-3 rounded-xl border-2 transition-colors ${partenzaDate ? 'border-indigo-200 bg-indigo-50/50' : 'border-dashed border-gray-200'}`}>
              <p className="text-xs text-gray-400 mb-0.5">Check-out</p>
              {partenzaDate ? (
                <p className="text-sm font-semibold text-gray-800">
                  {format(partenzaDate, 'EEE d MMM yyyy', { locale: it })}
                </p>
              ) : (
                <p className="text-sm text-gray-300">{arrivoDate ? 'Clicca la data di uscita' : '—'}</p>
              )}
            </div>
          </div>

          {notti > 0 && (
            <p className="text-center text-sm text-indigo-600 font-medium">
              {notti} {notti === 1 ? 'notte' : 'notti'}
            </p>
          )}

          {errStanze && <p className="text-sm text-red-600">{errStanze}</p>}

          <button
            type="button"
            onClick={cercaDisponibilita}
            disabled={!arrivoDate || !partenzaDate || loadingStanze}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loadingStanze ? 'Ricerca...' : <><Calendar className="w-4 h-4" /> Verifica disponibilità</>}
          </button>
        </div>
      )}

      {/* ── Step 2: Scegli stanza ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Date selezionate</p>
              <p className="text-sm font-semibold text-gray-800">
                {format(new Date(arrivo), 'd MMM', { locale: it })} → {format(new Date(partenza), 'd MMM yyyy', { locale: it })}
              </p>
              <p className="text-xs text-indigo-600">{notti} {notti === 1 ? 'notte' : 'notti'}</p>
            </div>
            <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Cambia date
            </button>
          </div>

          {stanze.length === 0 ? (
            <p className="text-center py-6 text-gray-400 text-sm">
              Nessuna stanza disponibile per queste date. Prova date diverse.
            </p>
          ) : (
            <div className="space-y-3">
              {stanze.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { if (!s.disponibile) return; setSelectedStanza(s); setStep(3) }}
                  disabled={!s.disponibile}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    s.disponibile
                      ? 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-indigo-400" />
                        <span className="font-semibold text-gray-900 text-sm">{s.nome}</span>
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Users className="w-3 h-3" />{s.capacita}p
                        </span>
                      </div>
                      {s.descrizione && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{s.descrizione}</p>
                      )}
                      {s.tariffe.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.tariffe.map(t => (
                            <span
                              key={t.id}
                              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: t.colore ?? '#6366f1' }}
                            >
                              <Tag className="w-2.5 h-2.5 inline mr-0.5" />{t.nome} €{t.prezzo}/n
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {s.disponibile ? (
                        <>
                          <div className="text-lg font-bold text-indigo-700">€{s.prezzoTotale}</div>
                          {s.haRegoleDinamiche && s.prezzoNotte !== s.prezzoBase ? (
                            <div className="text-xs">
                              <span className="text-gray-400 line-through mr-1">€{s.prezzoBase}</span>
                              <span className="text-indigo-500 font-medium">€{s.prezzoNotte}/notte</span>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">€{s.prezzoNotte}/notte × {s.notti}n</div>
                          )}
                          {s.haRegoleDinamiche && (
                            <div className="text-[10px] text-amber-600 font-medium mt-0.5">Prezzo dinamico</div>
                          )}
                          <div className="text-xs text-indigo-500 mt-1 font-medium">Seleziona →</div>
                        </>
                      ) : (
                        <span className="text-xs text-red-400 font-medium">Non disponibile</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Dati ospite ───────────────────────────────────────────── */}
      {step === 3 && selectedStanza && (
        <div className="space-y-4">
          {/* Mini riepilogo */}
          <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-semibold text-indigo-800">{selectedStanza.nome}</span>
              <span className="text-indigo-500 ml-2">
                {format(new Date(arrivo), 'd MMM', { locale: it })} – {format(new Date(partenza), 'd MMM', { locale: it })}
                {' · '}€{selectedStanza.prezzoTotale}
              </span>
            </div>
            <button type="button" onClick={() => setStep(2)} className="text-xs text-indigo-500 hover:text-indigo-700">
              Cambia
            </button>
          </div>

          {errForm && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {errForm}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={formData.guestNome}
                onChange={e => setFormData(f => ({ ...f, guestNome: e.target.value }))}
                required
                className={inp}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
              <input
                value={formData.guestCognome}
                onChange={e => setFormData(f => ({ ...f, guestCognome: e.target.value }))}
                required
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              value={formData.guestEmail}
              onChange={e => setFormData(f => ({ ...f, guestEmail: e.target.value }))}
              type="email"
              required
              className={inp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input
              value={formData.guestTelefono}
              onChange={e => setFormData(f => ({ ...f, guestTelefono: e.target.value }))}
              type="tel"
              className={inp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ospiti <span className="text-gray-400">(max {selectedStanza.capacita})</span>
            </label>
            <input
              value={formData.numOspiti}
              onChange={e => setFormData(f => ({ ...f, numOspiti: e.target.value }))}
              type="number"
              min={1}
              max={selectedStanza.capacita}
              className={inp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note / richieste particolari</label>
            <textarea
              value={formData.guestNote}
              onChange={e => setFormData(f => ({ ...f, guestNote: e.target.value }))}
              rows={3}
              className={`${inp} resize-none`}
              placeholder="Esigenze specifiche, domande, informazioni aggiuntive..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Indietro
            </button>
            <button
              type="button"
              onClick={goToRiepilogo}
              className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              Riepilogo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Riepilogo e conferma ──────────────────────────────────── */}
      {step === 4 && selectedStanza && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Riepilogo prenotazione
            </h3>

            {/* Struttura */}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span className="font-medium">{struttura.nome}</span>
            </div>

            {/* Stanza */}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Bed className="w-4 h-4 text-indigo-400" />
              <span>{selectedStanza.nome}</span>
              <span className="text-gray-400">· max {selectedStanza.capacita}p</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>
                {format(new Date(arrivo), 'EEE d MMMM yyyy', { locale: it })}
                {' → '}
                {format(new Date(partenza), 'EEE d MMMM yyyy', { locale: it })}
              </span>
            </div>
            <p className="text-xs text-indigo-600 ml-6">{notti} {notti === 1 ? 'notte' : 'notti'}</p>

            {/* Ospite */}
            <div className="border-t border-indigo-100 pt-3 space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{formData.guestNome} {formData.guestCognome}</span>
              </p>
              <p className="text-xs text-gray-500">{formData.guestEmail}</p>
              {formData.guestTelefono && (
                <p className="text-xs text-gray-500">{formData.guestTelefono}</p>
              )}
              <p className="text-xs text-gray-500">{formData.numOspiti} {Number(formData.numOspiti) === 1 ? 'ospite' : 'ospiti'}</p>
              {formData.guestNote && (
                <p className="text-xs text-gray-400 italic mt-1">&quot;{formData.guestNote}&quot;</p>
              )}
            </div>

            {/* Prezzo */}
            <div className="border-t border-indigo-100 pt-3">
              {selectedStanza.haRegoleDinamiche && selectedStanza.dettaglioNotti && selectedStanza.dettaglioNotti.length <= 14 ? (
                <div className="space-y-2 mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Dettaglio notti</p>
                  <div className="space-y-1">
                    {selectedStanza.dettaglioNotti.map(n => (
                      <div key={n.data} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {format(new Date(n.data + 'T12:00'), 'EEE d MMM', { locale: it })}
                        </span>
                        <div className="flex items-center gap-2">
                          {n.regoleApplicate.length > 0 && (
                            <span className="text-amber-600 text-[10px]">
                              {n.regoleApplicate.map(r => r.nome).join(', ')}
                            </span>
                          )}
                          {n.tariffaPeriodo && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: n.tariffaPeriodo.colore ?? '#6366f1' }}>
                              {n.tariffaPeriodo.nome}
                            </span>
                          )}
                          {n.prezzoFinale !== n.prezzoBase && !n.tariffaPeriodo && (
                            <span className="text-gray-400 line-through">€{n.prezzoBase}</span>
                          )}
                          <span className="font-semibold text-gray-900">€{n.prezzoFinale}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-2">€{selectedStanza.prezzoNotte}/notte × {notti} notti</p>
              )}
              <div className="flex items-end justify-between">
                <p className="text-xs text-gray-400">Prezzo totale stimato</p>
                <p className="text-2xl font-extrabold text-indigo-700">
                  €{selectedStanza.prezzoTotale}
                </p>
              </div>
              {tassaPerNotte !== null && tassaPerNotte > 0 && notti > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Tassa di soggiorno (stimata)</span>
                    <span className="font-medium text-gray-700">
                      €{tassaPerNotte.toFixed(2)}/notte/persona
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-0.5">
                    <span className="text-gray-400">
                      {notti} {notti === 1 ? 'notte' : 'notti'} × {formData.numOspiti} {Number(formData.numOspiti) === 1 ? 'ospite' : 'ospiti'}
                    </span>
                    <span className="font-semibold text-gray-700">
                      €{(tassaPerNotte * notti * Number(formData.numOspiti)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    La tassa di soggiorno è un tributo comunale da corrispondere alla struttura.
                  </p>
                </div>
              )}
            </div>
          </div>

          {errForm && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {errForm}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Cliccando &quot;Conferma&quot; invii una richiesta di prenotazione. Non è un pagamento.
            L&apos;host ti contatterà per confermare la disponibilità.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Modifica
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? 'Invio in corso...' : <><CheckCircle2 className="w-4 h-4" /> Conferma prenotazione</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
