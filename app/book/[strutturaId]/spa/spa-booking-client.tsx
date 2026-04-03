'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sparkles, Clock, Euro, ChevronRight, ChevronLeft, ArrowLeft,
  User, Loader2, CheckCircle2, Calendar, MapPin, Star,
} from 'lucide-react'
import {
  format, addDays, subDays, isBefore, startOfDay, isSameDay,
  eachDayOfInterval, startOfWeek, endOfWeek,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { WaiverSpaForm, PagamentoSpaForm } from '@/components/spa'

// ─── Types ────────────────────────────────────────────────────────────────────

type Trattamento = {
  id: string; nome: string; categoria: string; durata: number
  prezzo: number; descrizione: string | null; colore: string
}

type Percorso = {
  id: string; nome: string; descrizione: string | null; prezzo: number
  durataMinuti: number; colore: string
  passaggi: { ordine: number; durata: number; trattamentoNome: string }[]
}

type Terapista = {
  id: string; nome: string; cognome: string; bio: string | null
  specializzazioni: string[]; colore: string
}

type Slot = { ora: string; disponibile: boolean; terapisti: number }

type BookingResult = {
  id: string; servizio: string; dataOra: string; durata: number; prezzo: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpaBookingClient({
  strutturaId,
  strutturaNome,
  nomeAzienda,
  citta,
  trattamenti,
  percorsi,
  terapisti,
}: {
  strutturaId: string
  strutturaNome: string
  nomeAzienda: string
  citta: string | null
  trattamenti: Trattamento[]
  percorsi: Percorso[]
  terapisti: Terapista[]
}) {
  const t = useTranslations('booking')
  const tc = useTranslations('common')
  const tcat = useTranslations('spa.categories')

  const CAT_LABELS: Record<string, string> = {
    MASSAGGIO: tcat('massage'), VISO: tcat('facial'), CORPO: tcat('body'),
    RITUALI: tcat('rituals'), BAGNI: tcat('baths'), COPPIA: tcat('couples'), ALTRO: tcat('other'),
  }
  const CAT_ORDER = ['MASSAGGIO', 'VISO', 'CORPO', 'RITUALI', 'BAGNI', 'COPPIA', 'ALTRO']

  const [step, setStep] = useState(1)

  // Step 1: service selection
  const [tab, setTab] = useState<'trattamenti' | 'percorsi'>('trattamenti')
  const [servizio, setServizio] = useState<{ tipo: 'trattamento' | 'percorso'; id: string; nome: string; durata: number; prezzo: number } | null>(null)

  // Step 2: date + time
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [preferTerapista, setPreferTerapista] = useState('')

  // Step 3: guest info
  const [guest, setGuest] = useState({ nome: '', cognome: '', email: '', telefono: '', note: '' })

  // Step 4 & 5: waiver + pagamento + result
  const [appuntamentoId, setAppuntamentoId] = useState<string | null>(null)
  const [waiverCompletato, setWaiverCompletato] = useState(false)
  const [pagamentoCompletato, setPagamentoCompletato] = useState(false)
  const [booking, setBooking] = useState<BookingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  // ── Helpers ──────────────────────────────────────────────────────

  function selectServizio(tipo: 'trattamento' | 'percorso', item: Trattamento | Percorso) {
    const durata = tipo === 'trattamento' ? (item as Trattamento).durata : (item as Percorso).durataMinuti
    setServizio({ tipo, id: item.id, nome: item.nome, durata, prezzo: item.prezzo })
    setStep(2)
    setSelectedDate(null)
    setSelectedSlot(null)
    setSlots([])
  }

  async function loadSlots(date: Date) {
    if (!servizio) return
    setSelectedDate(date)
    setSelectedSlot(null)
    setSlotsLoading(true)
    const params = new URLSearchParams({ data: format(date, 'yyyy-MM-dd') })
    if (servizio.tipo === 'trattamento') params.set('trattamentoId', servizio.id)
    else params.set('percorsoId', servizio.id)
    if (preferTerapista) params.set('terapistaId', preferTerapista)

    const res = await fetch(`/api/book/${strutturaId}/spa/disponibilita?${params}`)
    if (res.ok) {
      const data = await res.json()
      setSlots(data.slots)
    }
    setSlotsLoading(false)
  }

  function selectSlot(ora: string) {
    setSelectedSlot(ora)
    setStep(3)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!servizio || !selectedDate || !selectedSlot) return
    setLoading(true)
    setErrore('')

    const dataOra = `${format(selectedDate, 'yyyy-MM-dd')}T${selectedSlot}:00`
    const body: Record<string, unknown> = {
      guestNome: guest.nome,
      guestCognome: guest.cognome,
      guestEmail: guest.email,
      guestTelefono: guest.telefono || undefined,
      dataOra,
      note: guest.note || undefined,
      durata: servizio.durata,
      prezzoTotale: servizio.prezzo,
    }
    if (servizio.tipo === 'trattamento') body.trattamentoId = servizio.id
    else body.percorsoId = servizio.id
    if (preferTerapista) body.terapistaId = preferTerapista

    const res = await fetch(`/api/book/${strutturaId}/spa/prenota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const j = await res.json()
      setErrore(j.error || tc('unexpectedError'))
      setLoading(false)
      return
    }

    const data = await res.json()
    setAppuntamentoId(data.id)
    setStep(4)
    setLoading(false)
  }

  async function finalizeBooking() {
    if (!appuntamentoId) return
    setLoading(true)
    const res = await fetch(`/api/book/${strutturaId}/spa/${appuntamentoId}`)
    if (res.ok) {
      const data = await res.json()
      setBooking(data)
    }
    setStep(5)
    setLoading(false)
  }

  // ── Week calendar ───────────────────────────────────────────────

  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const today = startOfDay(new Date())

  // ── Grouped treatments ──────────────────────────────────────────

  const grouped = CAT_ORDER
    .map(cat => ({ cat, items: trattamenti.filter(t => t.categoria === cat) }))
    .filter(g => g.items.length > 0)

  // ── Step labels ─────────────────────────────────────────────────

  const stepLabels = ['Servizio', 'Data e ora', 'I tuoi dati', 'Dichiarazione', 'Fine']

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('spaWellness')}</h1>
              <p className="text-sm text-gray-500">{nomeAzienda} {citta ? `· ${citta}` : ''}</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > i + 1 ? 'bg-green-500 text-white' :
                  step === i + 1 ? 'bg-purple-600 text-white' :
                  'bg-gray-200 text-gray-400'
                }`}>
                  {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < 4 && <ChevronRight className="w-3 h-3 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {errore && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errore}</div>
        )}

        {/* ── STEP 1: CATALOG ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab('trattamenti')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === 'trattamenti' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {/* TODO: i18n */}
                Trattamenti ({trattamenti.length})
              </button>
              {percorsi.length > 0 && (
                <button
                  onClick={() => setTab('percorsi')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tab === 'percorsi' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {/* TODO: i18n */}
                  Percorsi benessere ({percorsi.length})
                </button>
              )}
            </div>

            {/* Treatments */}
            {tab === 'trattamenti' && (
              <div className="space-y-6">
                {grouped.map(({ cat, items }) => (
                  <div key={cat}>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                      {CAT_LABELS[cat] ?? cat}
                    </h3>
                    <div className="grid gap-3">
                      {items.map(tr => (
                        <button
                          key={tr.id}
                          onClick={() => selectServizio('trattamento', tr)}
                          className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tr.colore }} />
                                <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                                  {tr.nome}
                                </p>
                              </div>
                              {tr.descrizione && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{tr.descrizione}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tr.durata} min</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-purple-600">{tr.prezzo.toFixed(0)}€</p>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 ml-auto mt-1 transition-colors" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pathways */}
            {tab === 'percorsi' && (
              <div className="grid gap-3">
                {percorsi.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectServizio('percorso', p)}
                    className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-purple-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400 shrink-0" />
                          <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                            {p.nome}
                          </p>
                        </div>
                        {p.descrizione && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.descrizione}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.durataMinuti} min</span>
                          {/* TODO: i18n */}
                          <span>{p.passaggi.length} trattamenti</span>
                        </div>
                        {p.passaggi.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.passaggi.map((ps, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                                {ps.trattamentoNome}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-purple-600">{p.prezzo.toFixed(0)}€</p>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 ml-auto mt-1 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Therapists */}
            {terapisti.length > 0 && (
              <div>
                {/* TODO: i18n */}
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">I nostri terapisti</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {terapisti.map(tr => (
                    <div key={tr.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <div
                        className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: tr.colore }}
                      >
                        {tr.nome[0]}{tr.cognome[0]}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{tr.nome} {tr.cognome}</p>
                      {tr.specializzazioni.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{tr.specializzazioni.slice(0, 2).join(', ')}</p>
                      )}
                      {tr.bio && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{tr.bio}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: DATE + TIME ─────────────────────────────── */}
        {step === 2 && servizio && (
          <div className="space-y-5">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              {/* TODO: i18n */}
              <ArrowLeft className="w-4 h-4" /> Cambia servizio
            </button>

            {/* Selected service summary */}
            <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-purple-900">{servizio.nome}</p>
                <p className="text-xs text-purple-600">{servizio.durata} min · {servizio.prezzo.toFixed(0)}€</p>
              </div>
            </div>

            {/* Therapist preference (optional) */}
            {terapisti.length > 0 && (
              <div>
                {/* TODO: i18n */}
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Preferenza terapista (opzionale)</label>
                <select
                  value={preferTerapista}
                  onChange={e => { setPreferTerapista(e.target.value); setSelectedDate(null); setSlots([]) }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                >
                  {/* TODO: i18n */}
                  <option value="">Nessuna preferenza</option>
                  {terapisti.map(tr => (
                    <option key={tr.id} value={tr.id}>{tr.nome} {tr.cognome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Week picker */}
            <div>
              {/* TODO: i18n */}
              <label className="text-sm font-medium text-gray-700 block mb-2">Scegli una data</label>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <button
                    onClick={() => setWeekStart(d => subDays(d, 7))}
                    disabled={isBefore(weekStart, today)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900">
                    {format(weekStart, 'd', { locale: it })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMMM yyyy', { locale: it })}
                  </span>
                  <button
                    onClick={() => setWeekStart(d => addDays(d, 7))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 divide-x divide-gray-100">
                  {weekDays.map(day => {
                    const past = isBefore(day, today)
                    const selected = selectedDate && isSameDay(day, selectedDate)
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => !past && loadSlots(day)}
                        disabled={past}
                        className={`py-3 text-center transition-colors ${
                          past ? 'opacity-30 cursor-not-allowed' :
                          selected ? 'bg-purple-600 text-white' :
                          'hover:bg-purple-50'
                        }`}
                      >
                        <p className={`text-xs font-medium ${selected ? 'text-purple-200' : 'text-gray-400'}`}>
                          {format(day, 'EEE', { locale: it })}
                        </p>
                        <p className={`text-lg font-bold mt-0.5 ${selected ? 'text-white' : 'text-gray-900'}`}>
                          {format(day, 'd')}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  {/* TODO: i18n */}
                  Orari disponibili — {format(selectedDate, 'EEEE d MMMM', { locale: it })}
                </label>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : slots.filter(s => s.disponibile).length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                    {/* TODO: i18n */}
                    Nessun orario disponibile per questa data. Prova un altro giorno.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slots.map(s => (
                      <button
                        key={s.ora}
                        onClick={() => s.disponibile && selectSlot(s.ora)}
                        disabled={!s.disponibile}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          !s.disponibile ? 'bg-gray-100 text-gray-300 cursor-not-allowed' :
                          selectedSlot === s.ora ? 'bg-purple-600 text-white ring-2 ring-purple-300' :
                          'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-700'
                        }`}
                      >
                        {s.ora}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: GUEST INFO ──────────────────────────────── */}
        {step === 3 && servizio && selectedDate && selectedSlot && (
          <div className="space-y-5">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              {/* TODO: i18n */}
              <ArrowLeft className="w-4 h-4" /> Cambia data/ora
            </button>

            {/* Riepilogo */}
            <div className="bg-purple-50 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-purple-900">{servizio.nome}</p>
              <p className="text-sm text-purple-700">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })} alle {selectedSlot}
              </p>
              <p className="text-sm text-purple-600">{servizio.durata} min · {servizio.prezzo.toFixed(0)}€</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{tc('name')} *</label>
                  <input
                    type="text" required value={guest.nome}
                    onChange={e => setGuest(g => ({ ...g, nome: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{tc('surname')} *</label>
                  <input
                    type="text" required value={guest.cognome}
                    onChange={e => setGuest(g => ({ ...g, cognome: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">{tc('email')} *</label>
                <input
                  type="email" required value={guest.email}
                  onChange={e => setGuest(g => ({ ...g, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">{tc('phone')}</label>
                <input
                  type="tel" value={guest.telefono}
                  onChange={e => setGuest(g => ({ ...g, telefono: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
                />
              </div>
              <div>
                {/* TODO: i18n */}
                <label className="text-sm font-medium text-gray-700 block mb-1">Note o richieste particolari</label>
                <textarea
                  rows={3} value={guest.note}
                  onChange={e => setGuest(g => ({ ...g, note: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none resize-none"
                  placeholder="Allergie, preferenze, esigenze particolari..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm hover:from-purple-700 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {/* TODO: i18n */}
                {loading ? 'Prenotazione in corso...' : tc('confirm') + ' ' + tc('bookings').charAt(0).toLowerCase() + tc('bookings').slice(1)}
              </button>

              <p className="text-xs text-gray-400 text-center">
                {/* TODO: i18n */}
                Il pagamento avverra direttamente in struttura. Questa non e una transazione.
              </p>
            </form>
          </div>
        )}

        {/* ── STEP 4: WAIVER & PAGAMENTO ──────────────────────── */}
        {step === 4 && appuntamentoId && (
          <div className="space-y-8 py-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Waiver */}
              <div className="space-y-4">
                {/* TODO: i18n */}
                <h3 className="text-lg font-bold text-gray-900">1. Dichiarazione di Salute</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                  {/* TODO: i18n */}
                  Prima di usufruire del servizio, compila la dichiarazione di salute e firma digitalmente.
                </div>
                <WaiverSpaForm
                  appuntamentoId={appuntamentoId}
                  guestName={`${guest.nome} ${guest.cognome}`}
                  trattamento={servizio?.nome || ''}
                  onSuccess={() => {
                    setWaiverCompletato(true)
                  }}
                  onError={err => setErrore(err)}
                />
              </div>

              {/* Pagamento */}
              <div className="space-y-4">
                {/* TODO: i18n */}
                <h3 className="text-lg font-bold text-gray-900">2. Metodo di Pagamento</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                  {/* TODO: i18n */}
                  Seleziona come preferisci pagare il servizio SPA.
                </div>
                {servizio && (
                  <PagamentoSpaForm
                    appuntamentoId={appuntamentoId}
                    importo={servizio.prezzo}
                    onSuccess={() => {
                      setPagamentoCompletato(true)
                    }}
                    onError={err => setErrore(err)}
                  />
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-between pt-6 border-t border-gray-200 mt-8">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 rounded-lg bg-gray-200 text-gray-900 font-medium hover:bg-gray-300 transition"
              >
                ← {tc('back')}
              </button>
              <button
                onClick={finalizeBooking}
                disabled={!waiverCompletato || !pagamentoCompletato || loading}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {/* TODO: i18n */}
                Conferma Prenotazione →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: CONFIRMATION ────────────────────────────── */}
        {step === 5 && booking && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>

            <div>
              {/* TODO: i18n */}
              <h2 className="text-2xl font-bold text-gray-900">Prenotazione confermata!</h2>
              <p className="text-gray-500 mt-1">Riceverai una conferma via email</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 text-left max-w-sm mx-auto space-y-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-900">{booking.servizio}</p>
                  <p className="text-xs text-gray-500">{booking.durata} minuti</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {format(new Date(booking.dataOra), 'EEEE d MMMM yyyy', { locale: it })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ore {format(new Date(booking.dataOra), 'HH:mm')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Euro className="w-5 h-5 text-purple-500 shrink-0" />
                <p className="text-sm font-semibold text-gray-900">{booking.prezzo.toFixed(0)}€</p>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-purple-500 shrink-0" />
                <p className="text-sm text-gray-700">{nomeAzienda} {citta ? `· ${citta}` : ''}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {/* TODO: i18n */}
              Codice prenotazione: <span className="font-mono">{booking.id.slice(0, 8)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
