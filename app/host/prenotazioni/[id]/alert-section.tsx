'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, X, Loader2, Bell, Info, ShieldAlert } from 'lucide-react'

type Alert = {
  id: string
  messaggio: string
  tipo: string
  triggerEvento: string
  attivo: boolean
  vistoAt: string | null
  createdAt: string
}

const TIPI = {
  INFO: { label: 'Info', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info },
  WARNING: { label: 'Attenzione', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  DANGER: { label: 'Critico', color: 'bg-red-100 text-red-700 border-red-200', icon: ShieldAlert },
}

const TRIGGER_LABELS: Record<string, string> = {
  CHECKIN: 'Al check-in',
  CHECKOUT: 'Al check-out',
  ACCESSO: 'Sempre visibile',
}

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'

export default function AlertSection({ prenotazioneId }: { prenotazioneId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ messaggio: '', tipo: 'INFO', triggerEvento: 'CHECKIN' })

  useEffect(() => {
    fetch(`/api/host/alert-ospite?prenotazioneId=${prenotazioneId}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [prenotazioneId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.messaggio.trim()) return
    setSaving(true)
    const res = await fetch('/api/host/alert-ospite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenotazioneId, ...form }),
    })
    if (res.ok) {
      const alert = await res.json()
      setAlerts(prev => [alert, ...prev])
      setForm({ messaggio: '', tipo: 'INFO', triggerEvento: 'CHECKIN' })
      setShowForm(false)
    }
    setSaving(false)
  }

  if (loading) return null
  const attivi = alerts.filter(a => a.attivo)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold text-gray-900">Alert</h2>
          {attivi.length > 0 && (
            <span className="text-xs font-bold text-white bg-amber-500 rounded-full w-5 h-5 flex items-center justify-center">{attivi.length}</span>
          )}
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs font-medium text-amber-600 border border-amber-200 rounded-lg px-2.5 py-1.5 hover:bg-amber-50">
            <Plus className="w-3.5 h-3.5" /> Nuovo
          </button>
        )}
      </div>

      {/* Alert attivi */}
      {attivi.map(a => {
        const t = TIPI[a.tipo as keyof typeof TIPI] || TIPI.INFO
        const TIcon = t.icon
        return (
          <div key={a.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg border mb-2 ${t.color}`}>
            <TIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.messaggio}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{TRIGGER_LABELS[a.triggerEvento] || a.triggerEvento}</p>
            </div>
          </div>
        )
      })}

      {attivi.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 italic">Nessun alert per questa prenotazione.</p>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mt-2 p-3 border border-amber-200 rounded-lg bg-amber-50/30 space-y-2">
          <input type="text" value={form.messaggio} onChange={e => setForm(f => ({ ...f, messaggio: e.target.value }))}
            placeholder="Es: Ospite VIP, Allergia noci, Late checkout confermato..."
            className={inp} required autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inp}>
              <option value="INFO">Info</option>
              <option value="WARNING">Attenzione</option>
              <option value="DANGER">Critico</option>
            </select>
            <select value={form.triggerEvento} onChange={e => setForm(f => ({ ...f, triggerEvento: e.target.value }))} className={inp}>
              <option value="CHECKIN">Al check-in</option>
              <option value="CHECKOUT">Al check-out</option>
              <option value="ACCESSO">Sempre visibile</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Aggiungi
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Annulla</button>
          </div>
        </form>
      )}
    </div>
  )
}
