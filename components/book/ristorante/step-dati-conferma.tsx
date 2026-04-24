'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Check, Loader2, UtensilsCrossed, Calendar, Clock, Users, StickyNote } from 'lucide-react'
import type { RistoranteSel } from './step-prenotazione'

type Props = {
  strutturaId: string
  sel: RistoranteSel
  // Precompilazione in-house (se disponibile via PIN/token)
  prefill?: {
    nome?: string | null
    cognome?: string | null
    email?: string | null
    telefono?: string | null
    pin?: string | null
  } | null
}

type Esito = {
  id: string
  stato: string
  inHouse: boolean
} | null

export default function StepDatiConferma({ strutturaId, sel, prefill }: Props) {
  const [nome, setNome] = useState(prefill?.nome ?? '')
  const [cognome, setCognome] = useState(prefill?.cognome ?? '')
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [telefono, setTelefono] = useState(prefill?.telefono ?? '')

  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [esito, setEsito] = useState<Esito>(null)

  const isReadonly = !!prefill?.nome // se precompilato da PIN, bloccato

  async function submit() {
    setErrore(null)
    if (!nome.trim() || !cognome.trim() || !email.trim()) {
      setErrore('Nome, cognome e email sono obbligatori')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/book/${strutturaId}/ristorante/prenota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: sel.data,
          ora: sel.ora,
          numPersone: sel.numPersone,
          note: sel.note || null,
          guestNome: nome.trim(),
          guestCognome: cognome.trim(),
          guestEmail: email.trim(),
          guestTelefono: telefono.trim() || null,
          pin: prefill?.pin ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrore(data.error ?? 'Errore conferma prenotazione')
      } else {
        setEsito({
          id: data.prenotazione.id,
          stato: data.prenotazione.stato,
          inHouse: data.prenotazione.inHouse ?? false,
        })
      }
    } catch {
      setErrore('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  // ─── Schermata post-conferma ────────────────────────────────────────────
  if (esito) {
    const dataUi = format(parseYMD(sel.data), "EEEE d MMMM", { locale: it })
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
        >
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Il tavolo è prenotato!</h2>
        <p className="text-sm text-gray-500 mb-5">
          Riceverai conferma via email a <strong className="text-gray-900">{email}</strong>.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm mb-5">
          <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Data" value={dataUi} />
          <Row icon={<Clock className="w-4 h-4 text-gray-400" />} label="Ora" value={sel.ora} />
          <Row icon={<Users className="w-4 h-4 text-gray-400" />} label="Persone" value={String(sel.numPersone)} />
          {sel.note && <Row icon={<StickyNote className="w-4 h-4 text-gray-400" />} label="Note" value={sel.note} />}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Se ti accorgi di non poter venire, scrivici almeno 2 ore prima per liberare il tavolo.
        </p>
      </div>
    )
  }

  // ─── Form dati + riepilogo ──────────────────────────────────────────────
  const dataUi = format(parseYMD(sel.data), "EEEE d MMMM", { locale: it })

  return (
    <div className="space-y-5">
      {/* Riepilogo sticky in alto */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="flex items-center gap-3 p-4">
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--brand-primary)',
              color: 'var(--brand-on-primary)',
              borderRadius: 'var(--brand-radius)',
            }}
          >
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{dataUi} · ore {sel.ora}</p>
            <p className="text-xs text-gray-500">{sel.numPersone} {sel.numPersone === 1 ? 'persona' : 'persone'}</p>
          </div>
        </div>
        {sel.note && (
          <div className="p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Note</p>
            <p className="text-sm text-gray-700 mt-0.5">{sel.note}</p>
          </div>
        )}
      </div>

      {/* Form dati */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900">I tuoi dati</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome"
            readOnly={isReadonly}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 read-only:bg-gray-100"
          />
          <input
            type="text"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            placeholder="Cognome"
            readOnly={isReadonly}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 read-only:bg-gray-100"
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          readOnly={isReadonly}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 read-only:bg-gray-100"
        />
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Telefono (opzionale)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {errore && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {errore}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition-all"
        style={{
          backgroundColor: 'var(--brand-primary)',
          color: 'var(--brand-on-primary)',
          borderRadius: 'var(--brand-radius)',
        }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Prenotazione in corso…</>
        ) : (
          <>Conferma prenotazione</>
        )}
      </button>

      <p className="text-center text-[11px] text-gray-400">
        Cliccando confermi di aver preso visione dell&apos;informativa privacy.
      </p>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-gray-500">{icon} {label}</span>
      <span className="font-semibold text-gray-900 text-right">{value}</span>
    </div>
  )
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
