'use client'

import { useState } from 'react'
import { format, differenceInCalendarDays } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Check, MapPin, CalendarDays, Users, User, Loader2, AlertCircle,
  Edit2, Phone, Sparkles, Download,
} from 'lucide-react'
import type { UnitaDisponibile } from './step-date-camere'
import type { GuestData, ConsensiData } from './step-dati-ospite'

export type EsitoPrenotazione = {
  id: string
  stato: 'RICHIESTA' | 'CONFERMATA'
  pin: string | null
  checkInToken: string | null
}

type Props = {
  strutturaId: string
  strutturaNome: string
  strutturaIndirizzo: string | null
  strutturaTelefono: string | null
  moduloSpaAttivo: boolean
  cancellazionePolicy?: string | null
  sel: {
    arrivo: Date
    partenza: Date
    adulti: number
    bambini: number
    etaBambini: number[]
    unita: UnitaDisponibile
    lettoExtra: boolean
  }
  guest: GuestData
  consensi: ConsensiData
  onModifica: (step: 0 | 1) => void
}

export default function StepConferma(props: Props) {
  const {
    strutturaId, strutturaNome, strutturaIndirizzo, strutturaTelefono,
    moduloSpaAttivo, cancellazionePolicy,
    sel, guest, consensi, onModifica,
  } = props

  const [loading, setLoading] = useState(false)
  const [esito, setEsito] = useState<EsitoPrenotazione | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [erroreConflict, setErroreConflict] = useState(false)

  const notti = differenceInCalendarDays(sel.partenza, sel.arrivo)
  const totOspiti = sel.adulti + sel.bambini
  const subtotaleNotti = sel.unita.prezzoTotaleScontato ?? sel.unita.prezzoTotale
  const costoExtra = sel.lettoExtra && sel.unita.prezzoLettoExtra ? sel.unita.prezzoLettoExtra * notti : 0
  const scontoImporto = sel.unita.prezzoTotaleScontato !== null
    ? sel.unita.prezzoTotale - sel.unita.prezzoTotaleScontato
    : 0
  const tassaTotale = sel.unita.tassaSoggiornoNotte
    ? Math.round(sel.unita.tassaSoggiornoNotte * notti * totOspiti * 100) / 100
    : 0
  const totaleFinale = subtotaleNotti + costoExtra + tassaTotale

  const cancellazioneText = cancellazionePolicy
    || 'Cancellazione gratuita fino a 48 ore prima dell\'arrivo. Dopo tale termine l\'acconto non sarà rimborsato.'

  async function confermaPrenotazione() {
    setLoading(true)
    setErrore(null)
    setErroreConflict(false)
    try {
      const res = await fetch(`/api/book/${strutturaId}/camere/prenota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitaId: sel.unita.unitaId,
          dataArrivo: format(sel.arrivo, 'yyyy-MM-dd'),
          dataPartenza: format(sel.partenza, 'yyyy-MM-dd'),
          adulti: sel.adulti,
          bambini: sel.bambini,
          etaBambini: sel.etaBambini,
          lettoExtra: sel.lettoExtra,
          guestNome: guest.nome,
          guestCognome: guest.cognome,
          guestEmail: guest.email,
          guestTelefono: guest.telefono,
          guestNote: guest.note,
          guestLingua: guest.lingua,
          consensi,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          setErroreConflict(true)
          setErrore(data.error ?? 'Camera non più disponibile')
        } else {
          setErrore(data.error ?? 'Errore durante la prenotazione')
        }
        return
      }
      setEsito(data.prenotazione)
    } catch {
      setErrore('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  function scaricaIcs() {
    if (!esito) return
    const dtStart = format(sel.arrivo, "yyyyMMdd")
    const dtEnd = format(sel.partenza, "yyyyMMdd")
    const uid = `${esito.id}@otium.pms`
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Otium PMS//IT',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:Soggiorno presso ${strutturaNome}`,
      `LOCATION:${strutturaIndirizzo ?? strutturaNome}`,
      `DESCRIPTION:${sel.unita.nome} · ${totOspiti} ospiti · Prenotazione ${esito.id}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soggiorno-${strutturaNome.replace(/[^a-z0-9]/gi, '_')}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── SCHERMATA CONFERMA POST-SUBMIT ─────────────────────────────────────

  if (esito) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Check className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {esito.stato === 'CONFERMATA' ? 'Prenotazione confermata!' : 'Richiesta ricevuta!'}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {esito.stato === 'CONFERMATA'
              ? `La tua camera è stata prenotata.`
              : `La struttura confermerà la prenotazione a breve.`}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm mb-5">
            <div className="flex justify-between">
              <span className="text-gray-500">Camera</span>
              <span className="font-semibold text-gray-900">{sel.unita.nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold text-gray-900">
                {format(sel.arrivo, 'd MMM', { locale: it })} →{' '}
                {format(sel.partenza, 'd MMM yyyy', { locale: it })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Totale</span>
              <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>
                €{totaleFinale.toFixed(0)}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Riceverai un&apos;email di conferma a{' '}
            <strong className="text-gray-900">{guest.email}</strong>
          </p>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Qualche giorno prima dell&apos;arrivo ti invieremo un link per il <strong>check-in
            online</strong>: potrai compilare i dati di tutti gli ospiti comodamente dal telefono.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={scaricaIcs}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5 text-gray-700"
            >
              <Download className="w-3.5 h-3.5" /> Aggiungi al calendario
            </button>
            {moduloSpaAttivo && (
              <a
                href={`/book/${strutturaId}/spa${esito.pin ? `?pin=${esito.pin}` : ''}`}
                className="px-4 py-2.5 text-sm font-semibold rounded-lg text-white flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Prenota un trattamento SPA
              </a>
            )}
          </div>
        </div>

        {/* Info utili struttura */}
        <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Info utili</h3>
          <div className="space-y-2 text-sm">
            {strutturaIndirizzo && (
              <p className="flex items-start gap-2 text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                {strutturaIndirizzo}
              </p>
            )}
            {strutturaTelefono && (
              <p className="flex items-start gap-2 text-gray-600">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                <a href={`tel:${strutturaTelefono}`} className="hover:text-gray-900">
                  {strutturaTelefono}
                </a>
              </p>
            )}
            <p className="flex items-start gap-2 text-gray-600">
              <CalendarDays className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
              Check-in dalle ore 15:00 · Check-out entro le ore 11:00
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── VIEW PRE-SUBMIT: RIEPILOGO ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {errore && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${
          erroreConflict ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'
        }`}>
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${erroreConflict ? 'text-amber-600' : 'text-red-600'}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${erroreConflict ? 'text-amber-900' : 'text-red-900'}`}>
              {erroreConflict ? 'Camera non più disponibile' : 'Errore'}
            </p>
            <p className={`text-xs mt-1 ${erroreConflict ? 'text-amber-800' : 'text-red-700'}`}>
              {errore}
            </p>
            {erroreConflict && (
              <button
                onClick={() => onModifica(0)}
                className="mt-2 text-xs font-semibold underline text-amber-900"
              >
                Torna alla ricerca camere →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Struttura */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start gap-2 mb-1">
          <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{strutturaNome}</h3>
            {strutturaIndirizzo && (
              <p className="text-xs text-gray-500 mt-0.5">{strutturaIndirizzo}</p>
            )}
          </div>
        </div>
      </div>

      {/* Soggiorno */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Soggiorno
          </h3>
          <button onClick={() => onModifica(0)} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <Edit2 className="w-3 h-3" /> Modifica
          </button>
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Camera</dt>
            <dd className="font-semibold text-gray-900">{sel.unita.nome}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Check-in</dt>
            <dd className="text-gray-900">{format(sel.arrivo, 'EEEE d MMMM yyyy', { locale: it })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Check-out</dt>
            <dd className="text-gray-900">{format(sel.partenza, 'EEEE d MMMM yyyy', { locale: it })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Durata</dt>
            <dd className="text-gray-900">{notti} {notti === 1 ? 'notte' : 'notti'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Ospiti</dt>
            <dd className="text-gray-900">
              {sel.adulti} {sel.adulti === 1 ? 'adulto' : 'adulti'}
              {sel.bambini > 0 && `, ${sel.bambini} bambin${sel.bambini === 1 ? 'o' : 'i'}`}
              {sel.lettoExtra && ' · letto extra'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Ospite */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4" /> Ospite
          </h3>
          <button onClick={() => onModifica(1)} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <Edit2 className="w-3 h-3" /> Modifica
          </button>
        </div>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Nome</dt>
            <dd className="text-gray-900">{guest.nome} {guest.cognome}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-900">{guest.email}</dd>
          </div>
          {guest.telefono && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Telefono</dt>
              <dd className="text-gray-900">{guest.telefono}</dd>
            </div>
          )}
          {guest.note && (
            <div className="pt-2 border-t border-gray-100 mt-2">
              <dt className="text-gray-500 text-xs mb-1">Richieste speciali</dt>
              <dd className="text-gray-700 text-xs italic">{guest.note}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Costi */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Costi</h3>
        <dl className="space-y-1.5 text-sm font-mono">
          <div className="flex justify-between">
            <dt className="text-gray-600">
              {notti} {notti === 1 ? 'notte' : 'notti'} × €{sel.unita.prezzoNotte.toFixed(0)}
            </dt>
            <dd className="text-gray-900">€{sel.unita.prezzoTotale.toFixed(2)}</dd>
          </div>
          {costoExtra > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-600">Letto extra × {notti}</dt>
              <dd className="text-gray-900">€{costoExtra.toFixed(2)}</dd>
            </div>
          )}
          {scontoImporto > 0 && sel.unita.scontoApplicato && (
            <div className="flex justify-between text-emerald-700">
              <dt>Sconto {sel.unita.scontoApplicato.nottiMinime}+ notti</dt>
              <dd>-€{scontoImporto.toFixed(2)}</dd>
            </div>
          )}
          {tassaTotale > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-600">
                Tassa soggiorno
                <span className="block text-[10px] text-gray-400 font-sans">
                  €{sel.unita.tassaSoggiornoNotte?.toFixed(2)} × {notti} notti × {totOspiti} ospiti
                </span>
              </dt>
              <dd className="text-gray-900">€{tassaTotale.toFixed(2)}</dd>
            </div>
          )}
        </dl>
        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
          <span className="text-sm font-bold text-gray-900">TOTALE</span>
          <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            €{totaleFinale.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Cancellazione */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-900">
        <strong>Politica cancellazione:</strong> {cancellazioneText}
      </div>

      {/* Conferma */}
      <button
        onClick={confermaPrenotazione}
        disabled={loading}
        className="w-full py-4 rounded-lg text-base font-bold text-white flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition-all"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Prenotazione in corso…</>
        ) : (
          <>Conferma prenotazione · €{totaleFinale.toFixed(0)}</>
        )}
      </button>

      <p className="text-center text-[11px] text-gray-400">
        Cliccando confermi di aver letto e accettato i termini.
      </p>
    </div>
  )
}
