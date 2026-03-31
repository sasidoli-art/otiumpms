'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import { ArrowLeft, Bot, User, Loader2, CheckCircle2, AlertTriangle, Phone } from 'lucide-react'

type Messaggio = { id: string; mittente: string; testo: string; toolsUsati: string[]; tokensUsati: number | null; createdAt: string }
type Azione = { id: string; tipo: string; descrizione: string; successo: boolean; createdAt: string }
type Conv = {
  id: string; telefonoOspite: string; nomeOspite: string | null; stato: string; lingua: string
  messaggi: Messaggio[]; azioni: Azione[]
  prenotazione: { id: string; guestNome: string; guestCognome: string; dataArrivo: string; dataPartenza: string | null; unita: { nome: string } | null } | null
}

export default function ConciergeChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [conv, setConv] = useState<Conv | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/host/concierge/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setConv(d))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conv?.messaggi])

  async function cambiaStato(stato: string) {
    await fetch(`/api/host/concierge/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    router.refresh()
    setConv(prev => prev ? { ...prev, stato } : null)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
  if (!conv) return <div className="card py-12 text-center text-gray-400">Conversazione non trovata</div>

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/host/concierge" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{conv.nomeOspite || conv.telefonoOspite}</h1>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {conv.telefonoOspite}</span>
            {conv.prenotazione && (
              <Link href={`/host/prenotazioni/${conv.prenotazione.id}`} className="text-purple-600 hover:underline">
                {conv.prenotazione.guestNome} {conv.prenotazione.guestCognome}{conv.prenotazione.unita ? ` · ${conv.prenotazione.unita.nome}` : ''}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {conv.stato === 'ESCALATA' && <button onClick={() => cambiaStato('ATTIVA')} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200">Riattiva AI</button>}
          {conv.stato === 'ATTIVA' && <button onClick={() => cambiaStato('ESCALATA')} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200">Prendi in carico</button>}
          {conv.stato !== 'CHIUSA' && <button onClick={() => cambiaStato('CHIUSA')} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200">Chiudi</button>}
        </div>
      </div>

      {/* Chat */}
      <div className="card max-h-[60vh] overflow-y-auto p-4 space-y-3">
        {conv.messaggi.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.mittente === 'OSPITE' ? '' : 'flex-row-reverse'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.mittente === 'OSPITE' ? 'bg-gray-200 dark:bg-slate-600' : m.mittente === 'AI_CONCIERGE' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {m.mittente === 'OSPITE' ? <User className="w-3.5 h-3.5 text-gray-600" /> : <Bot className="w-3.5 h-3.5 text-purple-600" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.mittente === 'OSPITE' ? 'bg-gray-100 dark:bg-slate-700' : 'bg-purple-50 dark:bg-purple-900/20'}`}>
              <p className="text-sm whitespace-pre-wrap">{m.testo}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                <span>{format(new Date(m.createdAt), 'HH:mm')}</span>
                {m.toolsUsati.length > 0 && <span className="text-purple-500">{m.toolsUsati.join(', ')}</span>}
                {m.tokensUsati && <span>{m.tokensUsati} tok</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Azioni AI */}
      {conv.azioni.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-2">Azioni eseguite dall'AI</h3>
          <div className="space-y-1.5">
            {conv.azioni.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                {a.successo ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                <span className="font-medium text-purple-600">{a.tipo}</span>
                <span className="text-gray-500 flex-1 truncate">{a.descrizione}</span>
                <span className="text-gray-400">{format(new Date(a.createdAt), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
