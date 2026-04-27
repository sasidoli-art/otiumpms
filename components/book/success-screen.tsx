'use client'

/**
 * SuccessScreen — schermata conferma post-prenotazione (camere/SPA/ristorante).
 *
 * Componente puro: niente fetch interna, niente router. Chi lo usa passa
 * gli oggetti gia` formattati. Espone un onAddToCalendar opzionale che
 * usa lib/ical-generate per il download del .ics.
 */
import { useState } from 'react'
import { CheckCircle2, Calendar, Copy, Check, MapPin, Phone, Mail } from 'lucide-react'
import { downloadIcs, type IcsEvent } from '@/lib/ical-generate'
import { cn } from '@/lib/utils'

export type SuccessScreenType = 'camera' | 'spa' | 'ristorante'

export interface SuccessScreenStruttura {
  nome: string
  indirizzo?: string | null
  telefono?: string | null
  email?: string | null
  mappaUrl?: string | null
}

export interface SuccessScreenProps {
  type: SuccessScreenType
  titolo?: string                       // override del titolo default
  messaggio?: string                    // sotto il titolo
  riepilogo: Array<{ label: string; valore: string }>
  pin?: string | null                   // mostrato grande in font mono se presente
  guestEmail?: string                   // per "riceverai conferma a {email}"
  struttura: SuccessScreenStruttura
  icsEvent?: IcsEvent                   // se presente: bottone "Aggiungi al calendario"
  ctaSecondaria?: { label: string; href: string }  // es. "Prenota un trattamento SPA"
  className?: string
}

const DEFAULT_TITOLI: Record<SuccessScreenType, string> = {
  camera: 'Prenotazione confermata!',
  spa: 'Appuntamento confermato!',
  ristorante: 'Tavolo confermato!',
}

const DEFAULT_MESSAGGI: Record<SuccessScreenType, string> = {
  camera: 'Qualche giorno prima dell\'arrivo ti invieremo un link per il check-in online.',
  spa: 'Ti aspettiamo 10 minuti prima dell\'orario per la preparazione.',
  ristorante: 'Vi aspettiamo. Per modifiche o cancellazioni contattaci.',
}

export function SuccessScreen({
  type,
  titolo,
  messaggio,
  riepilogo,
  pin,
  guestEmail,
  struttura,
  icsEvent,
  ctaSecondaria,
  className,
}: SuccessScreenProps) {
  const [copied, setCopied] = useState(false)

  const finalTitolo = titolo ?? DEFAULT_TITOLI[type]
  const finalMessaggio = messaggio ?? DEFAULT_MESSAGGI[type]

  function copyPin() {
    if (!pin) return
    navigator.clipboard.writeText(pin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('max-w-md mx-auto py-8 px-4 space-y-6 text-center', className)}>
      {/* Check animato */}
      <div className="flex justify-center">
        <div
          className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center"
          style={{ animation: 'successCircleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <CheckCircle2 className="w-9 h-9 text-success-600" strokeWidth={2.5} />
        </div>
      </div>

      {/* Titolo + messaggio */}
      <div className="space-y-2">
        <h1 className="text-[24px] font-serif text-neutral-900 leading-tight">{finalTitolo}</h1>
        <p className="text-[14px] text-neutral-600 leading-relaxed">{finalMessaggio}</p>
        {guestEmail && (
          <p className="text-[12px] text-neutral-400">
            Conferma inviata a <span className="font-medium text-neutral-600">{guestEmail}</span>
          </p>
        )}
      </div>

      {/* Riepilogo */}
      <div className="bg-white border border-neutral-150 rounded-xl shadow-card text-left">
        <div className="px-4 py-3 border-b border-neutral-150">
          <div className="text-[14px] font-semibold text-neutral-900">{struttura.nome}</div>
          {struttura.indirizzo && (
            <div className="text-[12px] text-neutral-500">{struttura.indirizzo}</div>
          )}
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {riepilogo.map((r, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-neutral-500">{r.label}</span>
              <span className="font-medium text-neutral-900 text-right">{r.valore}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PIN (solo camera) */}
      {pin && (
        <div className="bg-neutral-100 rounded-xl px-4 py-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wide font-semibold text-neutral-500">
            Il tuo codice soggiorno
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="font-mono text-[32px] font-bold text-neutral-900 tracking-widest tabular-nums">
              {pin}
            </div>
            <button
              type="button"
              onClick={copyPin}
              className="w-10 h-10 rounded-lg bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors flex items-center justify-center"
              aria-label="Copia PIN"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success-600" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-500" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Azioni */}
      <div className="space-y-2">
        {icsEvent && (
          <button
            type="button"
            onClick={() => downloadIcs(icsEvent, `${struttura.nome.replace(/\s+/g, '-').toLowerCase()}.ics`)}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-white border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 text-[14px] font-medium text-neutral-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Aggiungi al calendario
          </button>
        )}
        {ctaSecondaria && (
          <a
            href={ctaSecondaria.href}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[14px] font-semibold transition-colors"
          >
            {ctaSecondaria.label}
          </a>
        )}
      </div>

      {/* Info struttura */}
      <div className="space-y-1 text-[12px] text-neutral-500 pt-4 border-t border-neutral-150">
        {struttura.indirizzo && (
          <a
            href={struttura.mappaUrl ?? `https://maps.google.com/?q=${encodeURIComponent(struttura.indirizzo)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors"
          >
            <MapPin className="w-3 h-3" />
            {struttura.indirizzo}
          </a>
        )}
        {struttura.telefono && (
          <div>
            <a href={`tel:${struttura.telefono}`} className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors">
              <Phone className="w-3 h-3" />
              {struttura.telefono}
            </a>
          </div>
        )}
        {struttura.email && (
          <div>
            <a href={`mailto:${struttura.email}`} className="inline-flex items-center gap-1.5 hover:text-primary-600 transition-colors">
              <Mail className="w-3 h-3" />
              {struttura.email}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
