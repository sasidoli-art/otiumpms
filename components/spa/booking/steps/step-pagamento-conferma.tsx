'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Check, Loader2, AlertCircle, RotateCcw, Phone,
  Calendar, Clock, User, CreditCard, Banknote, Building, BedDouble,
  Download, ArrowRight, Pencil,
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'error'

interface BookingResult {
  id: string
  servizio: string
  dataOra: string
  durata: number
  prezzo: number
  terapista?: string
}

interface Props {
  strutturaId: string
  strutturaNome: string
  trattamento: { id: string; nome: string; durata: number; prezzo: number } | null
  percorso: { id: string; nome: string; durata: number; prezzo: number } | null
  slot: { data: string; oraInizio: string; terapistaId?: string; terapistaNome?: string } | null
  guest: { nome: string; cognome: string; email: string; telefono: string } | null
  waiver: Record<string, unknown> | null
  prenotazioneId?: string | null
  unitaNome?: string | null
  unitaId?: string | null
  onGoToStep: (step: number) => void
  onReset: () => void
  accentColor?: string
  hostTelefono?: string | null
}

const METODI = [
  { id: 'CAMERA_CREDIT', label: 'Addebita in camera', desc: 'Sul conto della stanza', icon: BedDouble, inHouseOnly: true },
  { id: 'CONTANTI', label: 'Contanti in SPA', desc: 'Paghi all\'arrivo', icon: Banknote, inHouseOnly: false },
  { id: 'CARTA', label: 'Carta di credito', desc: 'Paghi all\'arrivo in SPA', icon: CreditCard, inHouseOnly: false },
  { id: 'TRANSFERWISE', label: 'Bonifico bancario', desc: 'Coordinate via email', icon: Building, inHouseOnly: false },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function StepPagamentoConferma({
  strutturaId, strutturaNome,
  trattamento, percorso, slot, guest, waiver,
  prenotazioneId, unitaNome, unitaId,
  onGoToStep, onReset, accentColor, hostTelefono,
}: Props) {
  const accent = accentColor || 'var(--brand-primary, #4f46e5)'
  const onAccent = 'var(--brand-on-primary, #ffffff)'
  const servizio = trattamento || percorso
  const isInHouse = !!prenotazioneId

  const [metodo, setMetodo] = useState<string>(isInHouse ? 'CAMERA_CREDIT' : 'CONTANTI')
  const [ultime4, setUltime4] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<BookingResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorSlot, setErrorSlot] = useState(false)

  const metodiVisibili = METODI.filter(m => !m.inHouseOnly || isInHouse)

  const prezzo = servizio?.prezzo ?? 0
  const durata = servizio?.durata ?? 0

  const fmtData = slot?.data
    ? format(new Date(slot.data + 'T00:00'), 'EEEE d MMMM', { locale: it })
    : ''

  const submit = useCallback(async () => {
    if (!servizio || !slot || !guest) return
    setStatus('loading')
    setErrorMsg(null)
    setErrorSlot(false)

    const dataOra = `${slot.data}T${slot.oraInizio}:00`

    try {
      // 1. Crea appuntamento
      const res = await fetch(`/api/book/${strutturaId}/spa/prenota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trattamentoId: trattamento?.id || undefined,
          percorsoId: percorso?.id || undefined,
          terapistaId: slot.terapistaId || undefined,
          dataOra,
          durata,
          prezzoTotale: prezzo,
          guestNome: guest.nome,
          guestCognome: guest.cognome,
          guestEmail: guest.email,
          guestTelefono: guest.telefono || undefined,
          prenotazioneId: prenotazioneId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('disponibil') || data.error?.includes('slot') || res.status === 409) {
          setErrorSlot(true)
          setErrorMsg('L\'orario scelto non è più disponibile. Scegli un altro orario.')
        } else {
          setErrorMsg(data.error || 'Errore nella prenotazione')
        }
        setStatus('error')
        return
      }

      // 2. Registra pagamento (best-effort)
      try {
        await fetch('/api/spa/pagamento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appuntamentoId: data.id,
            importo: prezzo,
            tipoImporto: 'TOTALE',
            metodo,
            unitaId: metodo === 'CAMERA_CREDIT' ? unitaId : undefined,
            ultime4Cifre: metodo === 'CARTA' ? ultime4 : undefined,
          }),
        })
      } catch { /* pagamento best-effort */ }

      // 3. Registra waiver (best-effort)
      if (waiver) {
        try {
          await fetch('/api/spa/waiver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appuntamentoId: data.id, ...waiver }),
          })
        } catch { /* waiver best-effort */ }
      }

      setResult({
        id: data.id,
        servizio: servizio.nome,
        dataOra,
        durata,
        prezzo,
        terapista: slot.terapistaNome,
      })
      setStatus('success')
    } catch {
      setErrorMsg('Errore di connessione. Verifica la tua rete e riprova.')
      setStatus('error')
    }
  }, [servizio, slot, guest, strutturaId, trattamento, percorso, durata, prezzo, prenotazioneId, metodo, unitaId, ultime4, waiver])

  // ─── Genera ICS ─────────────────────────────────────────────────────
  const downloadIcs = useCallback(() => {
    if (!result) return
    const start = new Date(result.dataOra)
    const end = new Date(start.getTime() + result.durata * 60_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const toIcs = (d: Date) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//OtiumPMS//SPA//IT',
      'BEGIN:VEVENT',
      `DTSTART:${toIcs(start)}`, `DTEND:${toIcs(end)}`,
      `SUMMARY:SPA — ${result.servizio}`,
      `DESCRIPTION:Appuntamento SPA presso ${strutturaNome}${result.terapista ? `. Terapista: ${result.terapista}` : ''}`,
      `LOCATION:${strutturaNome}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `spa-${result.servizio.replace(/\s+/g, '-')}.ics`; a.click()
    URL.revokeObjectURL(url)
  }, [result, strutturaNome])

  // ═══ SUCCESS ═══
  if (status === 'success' && result) {
    const fmtOra = result.dataOra ? format(new Date(result.dataOra), 'HH:mm') : ''
    const fmtGiorno = result.dataOra ? format(new Date(result.dataOra), 'EEEE d MMMM', { locale: it }) : ''

    return (
      <div className="space-y-5 pb-4 px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="text-center py-6">
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${accent}15` }}>
            <Check className="w-10 h-10" style={{ color: accent }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Appuntamento confermato!</h2>
          <p className="text-sm text-gray-500 mt-1">Ti aspettiamo in SPA 10 minuti prima.</p>
        </motion.div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="p-4"><p className="text-sm font-semibold text-gray-900">{result.servizio}</p><p className="text-xs text-gray-500">{result.durata} min · €{result.prezzo}</p></div>
          <div className="p-4 flex items-center gap-2 text-sm text-gray-800"><Calendar className="w-4 h-4 text-gray-400" /> {fmtGiorno}, ore {fmtOra}</div>
          {result.terapista && <div className="p-4 flex items-center gap-2 text-sm text-gray-800"><User className="w-4 h-4 text-gray-400" /> {result.terapista}</div>}
        </div>

        {metodo === 'CONTANTI' || metodo === 'CARTA' ? (
          <p className="text-xs text-gray-500 text-center">Ricorda di portare il metodo di pagamento scelto.</p>
        ) : null}

        <div className="flex gap-3">
          <button type="button" onClick={downloadIcs}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Aggiungi al calendario
          </button>
          <button type="button" onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: accent, color: onAccent }}>
            <ArrowRight className="w-4 h-4" /> Prenota altro
          </button>
        </div>

        {isInHouse && (
          <a href={`/book/${strutturaId}`} className="block text-center text-xs font-semibold hover:underline" style={{ color: accent }}>
            ← Torna al tuo soggiorno
          </a>
        )}
      </div>
    )
  }

  // ═══ ERROR ═══
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </motion.div>
        <h2 className="text-lg font-bold text-gray-900">Non siamo riusciti a confermare</h2>
        <p className="text-sm text-gray-500 text-center max-w-xs">{errorMsg}</p>
        <div className="flex gap-3">
          {errorSlot ? (
            <button type="button" onClick={() => onGoToStep(1)}
              className="px-6 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: accent, color: onAccent }}>
              Scegli altro orario
            </button>
          ) : (
            <button type="button" onClick={submit}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: accent, color: onAccent }}>
              <RotateCcw className="w-4 h-4" /> Riprova
            </button>
          )}
          {hostTelefono && (
            <a href={`tel:${hostTelefono}`} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm">
              <Phone className="w-4 h-4" /> Chiama SPA
            </a>
          )}
        </div>
      </div>
    )
  }

  // ═══ IDLE: Riepilogo + Pagamento + Conferma ═══
  return (
    <div className="space-y-5 pb-4 px-4">
      {/* Riepilogo */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-gray-900">{servizio?.nome}</p>
            <p className="text-xs text-gray-500">{durata} min</p>
          </div>
          <button type="button" onClick={() => onGoToStep(0)} className="text-xs font-medium flex items-center gap-1" style={{ color: accent }}>
            <Pencil className="w-3 h-3" /> Modifica
          </button>
        </div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Calendar className="w-4 h-4 text-gray-400" />
            {fmtData}, ore {slot?.oraInizio}
          </div>
          <button type="button" onClick={() => onGoToStep(1)} className="text-xs font-medium flex items-center gap-1" style={{ color: accent }}>
            <Pencil className="w-3 h-3" /> Modifica
          </button>
        </div>
        {slot?.terapistaNome && (
          <div className="p-4 flex items-center gap-2 text-sm text-gray-800">
            <User className="w-4 h-4 text-gray-400" /> {slot.terapistaNome}
          </div>
        )}
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">Totale</span>
          <span className="text-xl font-bold" style={{ color: accent }}>€{prezzo.toFixed(2)}</span>
        </div>
      </div>

      {/* Metodo pagamento */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-3">Come vuoi pagare?</p>
        <div className="space-y-2">
          {metodiVisibili.map(m => {
            const Icon = m.icon
            const isSelected = metodo === m.id
            return (
              <button key={m.id} type="button" onClick={() => setMetodo(m.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  isSelected ? 'shadow-sm' : 'border-gray-100 hover:border-gray-200'
                }`}
                style={isSelected ? { borderColor: accent } : undefined}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? '' : 'bg-gray-100 text-gray-500'}`}
                  style={isSelected ? { backgroundColor: accent, color: onAccent } : undefined}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                  <p className="text-[10px] text-gray-500">
                    {m.id === 'CAMERA_CREDIT' && unitaNome ? `Camera ${unitaNome}` : m.desc}
                  </p>
                </div>
                {isSelected && <Check className="w-5 h-5 ml-auto shrink-0" style={{ color: accent }} />}
              </button>
            )
          })}
        </div>

        {metodo === 'CARTA' && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ultime 4 cifre carta (opzionale)</label>
            <input type="text" maxLength={4} value={ultime4}
              onChange={e => setUltime4(e.target.value.replace(/\D/g, ''))}
              placeholder="1234" className="w-32 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}
      </div>

      {/* CTA Conferma */}
      <button type="button" onClick={submit} disabled={status === 'loading'}
        className="w-full py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: accent, color: onAccent }}>
        {status === 'loading' ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Prenotazione in corso...</>
        ) : (
          <>Conferma prenotazione · €{prezzo.toFixed(2)}</>
        )}
      </button>
    </div>
  )
}
