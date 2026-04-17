'use client'

import { CheckCircle2, Calendar, Home, Users, FileText, Shield, MapPin, Phone } from 'lucide-react'

interface Props {
  prenotazione: {
    guestNome: string
    guestCognome: string
    dataArrivo: string
    dataPartenza?: string | null
    numOspiti: number
    unitaNome?: string | null
    strutturaNome?: string
    pin?: string | null
  }
  accompagnatori?: { nome: string; cognome: string }[]
  hasFirma: boolean
  strutturaNome: string
  strutturaIndirizzo?: string | null
  strutturaCitta?: string | null
  hostTelefono?: string | null
  accentColor?: string
}

/**
 * Step 5 — Conferma check-in.
 * Riepilogo finale read-only. L'ospite vede tutto e clicca "Conferma check-in"
 * (gestito dallo stepper parent, non da questo componente).
 */
export default function StepConferma({
  prenotazione: p,
  accompagnatori,
  hasFirma,
  strutturaNome,
  strutturaIndirizzo,
  strutturaCitta,
  hostTelefono,
  accentColor,
}: Props) {
  const accent = accentColor || '#4f46e5'

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return iso }
  }

  return (
    <div className="space-y-5 pb-4">
      {/* ─── Success header ────────────────────────────────────── */}
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: `${accent}15` }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: accent }} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Tutto pronto!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Verifica i dati e conferma il check-in.
        </p>
      </div>

      {/* ─── Riepilogo prenotazione ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{p.guestNome} {p.guestCognome}</p>
            <p className="text-xs text-gray-500">{p.numOspiti} ospite{p.numOspiti > 1 ? 'i' : ''}</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p className="text-sm text-gray-800">{fmtDate(p.dataArrivo)}</p>
            {p.dataPartenza && <p className="text-xs text-gray-500">→ {fmtDate(p.dataPartenza)}</p>}
          </div>
        </div>

        {p.unitaNome && (
          <div className="p-4 flex items-center gap-3">
            <Home className="w-5 h-5 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-800">{p.unitaNome}</p>
          </div>
        )}

        {accompagnatori && accompagnatori.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Accompagnatori</p>
            {accompagnatori.map((a, i) => (
              <p key={i} className="text-sm text-gray-800">· {a.nome} {a.cognome}</p>
            ))}
          </div>
        )}

        <div className="p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-800">Termini e privacy accettati</p>
          <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
        </div>

        <div className="p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-800">Firma digitale</p>
          {hasFirma ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
          ) : (
            <span className="text-xs text-amber-600 ml-auto">Mancante</span>
          )}
        </div>

        {p.pin && (
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Il tuo PIN</p>
            <p className="text-2xl font-mono font-bold tracking-[0.5em]" style={{ color: accent }}>{p.pin}</p>
            <p className="text-[10px] text-gray-400 mt-1">Usa il PIN per WiFi, servizi in camera e concierge AI</p>
          </div>
        )}
      </div>

      {/* ─── Info struttura ────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{strutturaNome}</p>
        {(strutturaIndirizzo || strutturaCitta) && (
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span>{[strutturaIndirizzo, strutturaCitta].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {hostTelefono && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Phone className="w-3 h-3 text-gray-400" />
            <a href={`tel:${hostTelefono}`} className="hover:underline" style={{ color: accent }}>{hostTelefono}</a>
          </div>
        )}
      </div>

      {/* ─── Note ──────────────────────────────────────────────── */}
      <p className="text-[10px] text-gray-400 text-center leading-relaxed">
        Cliccando &quot;Conferma check-in&quot; i tuoi dati verranno inviati alla struttura.
        Al tuo arrivo, la reception verificherà il documento di identità originale.
      </p>
    </div>
  )
}
