'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Loader2, Send, AlertCircle, Building2, User, MessageCircle, Clock,
  Shield, Save,
} from 'lucide-react'

type Risposta = {
  id: string
  autoreId: string
  autoreEmail: string
  autoreRuolo: string
  testo: string
  createdAt: string
}

type Ticket = {
  id: string
  oggetto: string
  descrizione: string
  categoria: string
  priorita: string
  stato: string
  createdAt: string
  updatedAt: string
  user: { id: string; nome: string; cognome: string; email: string; role: string }
  host: { id: string; nomeAzienda: string; user?: { email: string } } | null
  risposte: Risposta[]
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

export default function TicketDettaglio({
  id, ruolo,
}: {
  id: string
  ruolo: 'admin' | 'host'
}) {
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [stato, setStato] = useState('')
  const [priorita, setPriorita] = useState('')
  const [saving, setSaving] = useState(false)

  const baseApi = ruolo === 'admin' ? '/api/admin/ticket' : '/api/host/supporto'

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const res = await fetch(`${baseApi}/${id}`)
    if (res.ok) {
      const t: Ticket = await res.json()
      setTicket(t)
      setStato(t.stato)
      setPriorita(t.priorita)
    } else setError('Errore caricamento')
    setLoading(false)
  }, [baseApi, id])

  useEffect(() => { load() }, [load])

  async function rispondi() {
    if (!reply.trim()) return
    setSending(true); setError('')
    const res = await fetch(`${baseApi}/${id}/risposte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testo: reply,
        segnaAttesaRisposta: ruolo === 'admin',
      }),
    })
    if (res.ok) {
      setReply('')
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Errore invio risposta')
    }
    setSending(false)
  }

  async function salvaStato() {
    if (ruolo !== 'admin') return
    setSaving(true); setError('')
    const res = await fetch(`${baseApi}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato, priorita }),
    })
    if (res.ok) load()
    else setError('Errore aggiornamento')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    )
  }
  if (!ticket) {
    return <div className="card text-red-600">{error || 'Non trovato'}</div>
  }

  const autoreOriginaleNome = `${ticket.user.nome} ${ticket.user.cognome}`.trim() || ticket.user.email

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-gray-900 break-words">{ticket.oggetto}</h1>
            <p className="text-xs text-gray-400 mt-1">
              #{ticket.id.slice(0, 8)} · creato {format(new Date(ticket.createdAt), 'd MMM yyyy HH:mm', { locale: it })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${PRIORITA_CLS[ticket.priorita]}`}>
              {ticket.priorita}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATO_CLS[ticket.stato]}`}>
              {ticket.stato.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span><strong>{autoreOriginaleNome}</strong> · {ticket.user.role}</span>
          </div>
          {ticket.host && (
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span>{ticket.host.nomeAzienda}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-xs">Categoria:</span>
            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{ticket.categoria}</span>
          </div>
        </div>

        {/* Azioni admin */}
        {ruolo === 'admin' && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Stato</label>
              <select value={stato} onChange={(e) => setStato(e.target.value)}
                className="text-sm px-2 py-1 rounded border border-gray-200">
                <option value="APERTO">Aperto</option>
                <option value="IN_LAVORAZIONE">In lavorazione</option>
                <option value="IN_ATTESA_RISPOSTA">In attesa risposta</option>
                <option value="RISOLTO">Risolto</option>
                <option value="CHIUSO">Chiuso</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Priorità</label>
              <select value={priorita} onChange={(e) => setPriorita(e.target.value)}
                className="text-sm px-2 py-1 rounded border border-gray-200">
                <option value="BASSA">Bassa</option>
                <option value="NORMALE">Normale</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            {(stato !== ticket.stato || priorita !== ticket.priorita) && (
              <button
                onClick={salvaStato} disabled={saving}
                className="text-xs px-3 py-1.5 rounded bg-amber-500 text-white font-semibold flex items-center gap-1.5 hover:bg-amber-600"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salva
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Thread (descrizione originale + risposte) */}
      <div className="space-y-3">
        {/* Messaggio originale */}
        <MessageBubble
          autore={autoreOriginaleNome}
          email={ticket.user.email}
          ruolo="host"
          createdAt={ticket.createdAt}
          testo={ticket.descrizione}
          isFirstMessage
        />

        {/* Risposte */}
        {ticket.risposte.map((r) => (
          <MessageBubble
            key={r.id}
            autore={r.autoreEmail}
            email={r.autoreEmail}
            ruolo={r.autoreRuolo}
            createdAt={r.createdAt}
            testo={r.testo}
          />
        ))}
      </div>

      {/* Form risposta */}
      <div className="card">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> La tua risposta
        </h3>
        <textarea
          rows={5}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={ruolo === 'admin'
            ? 'Scrivi una risposta all\'host (riceverà email di notifica)...'
            : 'Scrivi una risposta all\'admin...'}
          className="input"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            {ruolo === 'admin'
              ? 'Inviando, il ticket passerà in "attesa risposta"'
              : 'L\'admin verrà notificato via email'}
          </p>
          <button
            onClick={rispondi}
            disabled={sending || !reply.trim()}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm flex items-center gap-2 hover:bg-amber-600 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Invia risposta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Messaggio bubble ────────────────────────────────────────────────────────

function MessageBubble({
  autore, email, ruolo, createdAt, testo, isFirstMessage = false,
}: {
  autore: string; email: string; ruolo: string
  createdAt: string; testo: string; isFirstMessage?: boolean
}) {
  const isAdmin = ruolo === 'admin'
  return (
    <div className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
        isAdmin
          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
          : 'bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-600'
      }`}>
        {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={`flex-1 max-w-3xl ${isAdmin ? 'items-end' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isAdmin ? 'justify-end' : ''}`}>
          <span className="text-sm font-semibold text-gray-900">{autore}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
            isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-700'
          }`}>
            {isAdmin ? 'Admin' : 'Host'}
          </span>
          {isFirstMessage && (
            <span className="text-[10px] text-gray-400">· ticket originale</span>
          )}
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {format(new Date(createdAt), 'd MMM HH:mm', { locale: it })}
          </span>
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
          isAdmin
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800 border border-amber-100'
            : 'bg-white text-gray-800 border border-gray-200'
        }`}>
          {testo}
        </div>
      </div>
    </div>
  )
}
