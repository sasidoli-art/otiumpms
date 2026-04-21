'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Save, Loader2, Trash2, User, Building2, Calendar,
  MessageCircle, AlertCircle, Globe, Monitor,
} from 'lucide-react'

type Ticket = {
  id: string
  oggetto: string
  descrizione: string
  categoria: string
  priorita: string
  stato: string
  paginaUrl: string | null
  userAgent: string | null
  screenshot: string | null
  rispostaAdmin: string | null
  rispostoAt: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; nome: string; cognome: string; email: string; role: string }
  host: { id: string; nomeAzienda: string; telefono: string | null } | null
}

const PRIORITA_CLS: Record<string, string> = {
  BASSA: 'bg-gray-100 text-gray-600',
  NORMALE: 'bg-blue-50 text-blue-700',
  ALTA: 'bg-orange-50 text-orange-700',
  URGENTE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}

export default function TicketDetail({ ticket }: { ticket: Ticket }) {
  const router = useRouter()
  const [stato, setStato] = useState(ticket.stato)
  const [priorita, setPriorita] = useState(ticket.priorita)
  const [rispostaAdmin, setRispostaAdmin] = useState(ticket.rispostaAdmin ?? '')
  const [notaInterna, setNotaInterna] = useState('')
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  const autoreNome = `${ticket.user.nome} ${ticket.user.cognome}`.trim() || ticket.user.email

  async function salva() {
    setSaving(true); setErrore('')
    const res = await fetch(`/api/superadmin/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stato,
        priorita,
        rispostaAdmin: rispostaAdmin !== (ticket.rispostaAdmin ?? '') ? rispostaAdmin : undefined,
        notaInterna: notaInterna || undefined,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore salvataggio')
    } else {
      setNotaInterna('')
      router.refresh()
    }
    setSaving(false)
  }

  async function elimina() {
    if (!window.confirm('Eliminare definitivamente il ticket?')) return
    const res = await fetch(`/api/superadmin/tickets/${ticket.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/superadmin/tickets')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonna sinistra — ticket + risposta */}
      <div className="lg:col-span-2 space-y-5">
        <div className="card">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">{ticket.oggetto}</h1>
              <p className="text-xs text-gray-400 mt-1">
                #{ticket.id.slice(0, 8)} · {format(new Date(ticket.createdAt), 'd MMM yyyy HH:mm', { locale: it })}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${PRIORITA_CLS[ticket.priorita]}`}>
              {ticket.priorita}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.descrizione}</p>
          </div>

          {(ticket.paginaUrl || ticket.userAgent) && (
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              {ticket.paginaUrl && <p className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> {ticket.paginaUrl}</p>}
              {ticket.userAgent && <p className="flex items-center gap-1.5"><Monitor className="w-3 h-3" /> <span className="truncate">{ticket.userAgent}</span></p>}
            </div>
          )}

          {ticket.screenshot && (
            <details className="mt-3">
              <summary className="text-xs text-brand-600 cursor-pointer">📷 Screenshot allegato</summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ticket.screenshot} alt="Screenshot" className="mt-2 max-w-full rounded border border-gray-200" />
            </details>
          )}
        </div>

        {/* Risposta */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-brand-500" />
            <h2 className="text-base font-bold text-gray-900">Risposta al ticket</h2>
          </div>
          <textarea
            rows={5}
            value={rispostaAdmin}
            onChange={(e) => setRispostaAdmin(e.target.value)}
            placeholder="Scrivi una risposta visibile all'autore del ticket..."
            className="input"
          />
          {ticket.rispostoAt && (
            <p className="text-xs text-gray-400 mt-1">
              Ultima risposta: {format(new Date(ticket.rispostoAt), 'd MMM HH:mm', { locale: it })}
            </p>
          )}
        </div>

        {/* Nota interna */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Nota interna (audit only)</h3>
          <textarea
            rows={2}
            value={notaInterna}
            onChange={(e) => setNotaInterna(e.target.value)}
            placeholder="Nota visibile solo in audit log (non inviata all'autore)"
            className="input text-sm"
          />
        </div>

        {errore && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errore}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={salva} disabled={saving} className="btn-primary flex items-center gap-2 flex-1 justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva modifiche
          </button>
          <button onClick={elimina} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Elimina
          </button>
        </div>
      </div>

      {/* Colonna destra — meta + azioni rapide */}
      <div className="space-y-4">
        <div className="card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Stato</h3>
          <select value={stato} onChange={(e) => setStato(e.target.value)} className="input mb-3">
            <option value="APERTO">Aperto</option>
            <option value="IN_LAVORAZIONE">In lavorazione</option>
            <option value="IN_ATTESA_RISPOSTA">In attesa risposta</option>
            <option value="RISOLTO">Risolto</option>
            <option value="CHIUSO">Chiuso</option>
          </select>

          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Priorità</h3>
          <select value={priorita} onChange={(e) => setPriorita(e.target.value)} className="input">
            <option value="BASSA">Bassa</option>
            <option value="NORMALE">Normale</option>
            <option value="ALTA">🟠 Alta</option>
            <option value="URGENTE">🔴 Urgente</option>
          </select>
        </div>

        <div className="card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Autore</h3>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{autoreNome}</p>
              <p className="text-xs text-gray-400 truncate">{ticket.user.email}</p>
              <p className="text-[10px] text-gray-400">{ticket.user.role}</p>
            </div>
          </div>

          {ticket.host && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4 mb-2">Host</h3>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ticket.host.nomeAzienda}</p>
                  {ticket.host.telefono && <p className="text-xs text-gray-400">{ticket.host.telefono}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card text-xs text-gray-500">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Categoria: <strong>{ticket.categoria}</strong></span>
          </div>
          <p>Creato: {format(new Date(ticket.createdAt), 'd MMM yyyy HH:mm', { locale: it })}</p>
          <p>Aggiornato: {format(new Date(ticket.updatedAt), 'd MMM yyyy HH:mm', { locale: it })}</p>
        </div>
      </div>
    </div>
  )
}
