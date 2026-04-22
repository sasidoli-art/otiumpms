'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  LifeBuoy, Plus, Loader2, ChevronRight, X, AlertCircle, CheckCircle2,
  Clock, MessageSquare,
} from 'lucide-react'

type Ticket = {
  id: string
  oggetto: string
  categoria: string
  priorita: string
  stato: string
  createdAt: string
  updatedAt: string
  _count: { risposte: number }
}

const PRIORITA_CLS: Record<string, string> = {
  BASSA: 'bg-gray-100 text-gray-600',
  NORMALE: 'bg-blue-50 text-blue-700',
  ALTA: 'bg-orange-50 text-orange-700',
  URGENTE: 'bg-red-50 text-red-700',
}

const STATO_CLS: Record<string, string> = {
  APERTO: 'bg-amber-50 text-amber-700',
  IN_LAVORAZIONE: 'bg-blue-50 text-blue-700',
  IN_ATTESA_RISPOSTA: 'bg-indigo-50 text-indigo-700',
  RISOLTO: 'bg-green-50 text-green-700',
  CHIUSO: 'bg-gray-100 text-gray-500',
}

const CATEGORIA_LABEL: Record<string, string> = {
  BUG: 'Bug / Tecnico',
  FEATURE_REQUEST: 'Nuova funzionalità',
  DOMANDA: 'Domanda',
  PROBLEMA_ACCOUNT: 'Billing / Account',
  ALTRO: 'Altro',
}

export default function SupportoLista() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/host/supporto')
    if (res.ok) {
      const d = await res.json()
      setTickets(d.tickets)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            <strong>{tickets.length}</strong> ticket totali
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo ticket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card text-center py-16">
          <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nessun ticket aperto</p>
          <p className="text-sm text-gray-400 mt-1">Clicca "Nuovo ticket" per richiedere assistenza</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/host/supporto/${t.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{t.oggetto}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${PRIORITA_CLS[t.priorita]}`}>
                      {t.priorita}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {t._count.risposte} rispost{t._count.risposte === 1 ? 'a' : 'e'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(t.updatedAt), 'd MMM HH:mm', { locale: it })}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATO_CLS[t.stato]}`}>
                  {t.stato.replace(/_/g, ' ')}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <NuovoTicketModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Modal nuovo ticket ──────────────────────────────────────────────────────

function NuovoTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter()
  const [oggetto, setOggetto] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [categoria, setCategoria] = useState('DOMANDA')
  const [priorita, setPriorita] = useState('NORMALE')
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  async function salva() {
    if (!oggetto.trim() || descrizione.trim().length < 10) {
      setErrore('Oggetto e descrizione (min 10 char) obbligatori')
      return
    }
    setSaving(true); setErrore('')
    const res = await fetch('/api/host/supporto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oggetto, descrizione, categoria, priorita }),
    })
    if (res.ok) {
      const t = await res.json()
      onCreated()
      router.push(`/host/supporto/${t.id}`)
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-brand-500" /> Nuovo ticket supporto
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Oggetto *</label>
            <input type="text" value={oggetto} onChange={(e) => setOggetto(e.target.value)} className="input" placeholder="Es. Email non inviate agli ospiti" maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input">
                <option value="DOMANDA">Domanda</option>
                <option value="BUG">Bug / Problema tecnico</option>
                <option value="FEATURE_REQUEST">Nuova funzionalità</option>
                <option value="PROBLEMA_ACCOUNT">Billing / Account</option>
                <option value="ALTRO">Altro</option>
              </select>
            </div>
            <div>
              <label className="label">Priorità</label>
              <select value={priorita} onChange={(e) => setPriorita(e.target.value)} className="input">
                <option value="BASSA">Bassa</option>
                <option value="NORMALE">Normale</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descrizione *</label>
            <textarea rows={6} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className="input" placeholder="Descrivi il problema o la richiesta..." maxLength={5000} />
            <p className="text-[11px] text-gray-400 mt-1">{descrizione.length}/5000</p>
          </div>
          {errore && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errore}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={salva} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Invia
            </button>
            <button onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </div>
      </div>
    </div>
  )
}
