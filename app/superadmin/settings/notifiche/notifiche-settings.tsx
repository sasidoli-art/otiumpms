'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Trash2, Plus, AlertCircle, CheckCircle2, Info } from 'lucide-react'

type Destinatario = {
  id: string
  userId: string | null
  emailEsterna: string | null
  nome: string | null
  tipiEvento: string[]
  prioritaMinima: 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE'
  canali: string[]
  attivo: boolean
  createdAt: string
  user: { id: string; email: string; nome: string; cognome: string; role: string } | null
}

const TIPI_EVENTO = [
  { value: 'ticket.nuovo', label: 'Ticket nuovi' },
  { value: 'ticket.urgente', label: 'Ticket URGENTI' },
  { value: 'host.signup', label: 'Nuovo host' },
  { value: 'email.fallita', label: 'Email fallite' },
  { value: 'sistema.avviso', label: 'Avvisi sistema' },
]

const CANALI = ['email', 'inapp', 'slack'] as const

export default function NotificheSettings() {
  const [destinatari, setDestinatari] = useState<Destinatario[]>([])
  const [fallback, setFallback] = useState({ attivo: false, count: 0 })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [errore, setErrore] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/superadmin/settings/notifiche')
    if (res.ok) {
      const d = await res.json()
      setDestinatari(d.destinatari)
      setFallback({ attivo: d.fallbackAttivo, count: d.fallbackCount })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(id: string, attivo: boolean) {
    await fetch('/api/superadmin/settings/notifiche', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, attivo }),
    })
    load()
  }

  async function rimuovi(id: string) {
    if (!window.confirm('Rimuovere destinatario?')) return
    await fetch(`/api/superadmin/settings/notifiche?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-5">
      {fallback.attivo && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-sm flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Modalità fallback attiva</strong>: la lista è vuota, quindi vengono notificati tutti
            i {fallback.count} utenti SUPERADMIN. Aggiungi destinatari sotto per personalizzare.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">
          Destinatari ({destinatari.length})
        </h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Aggiungi destinatario
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : destinatari.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          Nessun destinatario configurato.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-th">Destinatario</th>
                <th className="table-th hidden md:table-cell">Eventi</th>
                <th className="table-th hidden md:table-cell">Priorità min</th>
                <th className="table-th">Canali</th>
                <th className="table-th">Attivo</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {destinatari.map((d) => {
                const label = d.user
                  ? `${d.user.nome} ${d.user.cognome}`.trim() || d.user.email
                  : d.nome ?? d.emailEsterna ?? '—'
                const email = d.user?.email ?? d.emailEsterna
                return (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                    <td className="table-td">
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{email}</p>
                      {d.user && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {d.user.role}
                        </span>
                      )}
                    </td>
                    <td className="table-td hidden md:table-cell">
                      {d.tipiEvento.length === 0 ? (
                        <span className="text-xs text-gray-400">Tutti</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {d.tipiEvento.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="table-td hidden md:table-cell">
                      <span className="text-xs font-semibold text-gray-700">{d.prioritaMinima}</span>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        {d.canali.map((c) => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => toggle(d.id, !d.attivo)}
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          d.attivo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {d.attivo ? '● Attivo' : '○ Disattivo'}
                      </button>
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => rimuovi(d.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddDestinatarioModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

// ─── Modal aggiungi destinatario ─────────────────────────────────────────────

function AddDestinatarioModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [modo, setModo] = useState<'email' | 'user'>('email')
  const [emailEsterna, setEmailEsterna] = useState('')
  const [nome, setNome] = useState('')
  const [tipiEvento, setTipiEvento] = useState<string[]>([])
  const [prioritaMinima, setPrioritaMinima] = useState<'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE'>('BASSA')
  const [canali, setCanali] = useState<string[]>(['email', 'inapp'])
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  async function salva() {
    setSaving(true); setErrore('')
    const res = await fetch('/api/superadmin/settings/notifiche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailEsterna: modo === 'email' ? emailEsterna : null,
        nome: nome || null,
        tipiEvento,
        prioritaMinima,
        canali,
      }),
    })
    if (res.ok) onAdded()
    else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore')
    }
    setSaving(false)
  }

  function toggleEvento(t: string) {
    setTipiEvento((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
  }
  function toggleCanale(c: string) {
    setCanali((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Aggiungi destinatario</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Email destinatario *</label>
            <input
              type="email"
              value={emailEsterna}
              onChange={(e) => setEmailEsterna(e.target.value)}
              placeholder="es. alert@azienda.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">Nome / Label</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="es. Team DevOps"
              className="input"
            />
          </div>
          <div>
            <label className="label">Eventi (vuoto = tutti)</label>
            <div className="flex flex-wrap gap-1.5">
              {TIPI_EVENTO.map((t) => (
                <button
                  key={t.value}
                  onClick={() => toggleEvento(t.value)}
                  className={`text-xs px-2.5 py-1 rounded font-medium ${
                    tipiEvento.includes(t.value)
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Priorità minima</label>
            <select
              value={prioritaMinima}
              onChange={(e) => setPrioritaMinima(e.target.value as typeof prioritaMinima)}
              className="input"
            >
              <option value="BASSA">Bassa (riceve tutto)</option>
              <option value="NORMALE">Normale</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Solo URGENTE</option>
            </select>
          </div>
          <div>
            <label className="label">Canali</label>
            <div className="flex gap-2">
              {CANALI.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCanale(c)}
                  className={`text-sm px-3 py-1.5 rounded font-medium ${
                    canali.includes(c)
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {errore && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errore}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={salva}
              disabled={saving || !emailEsterna}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Aggiungi
            </button>
            <button onClick={onClose} className="btn-secondary">Annulla</button>
          </div>
        </div>
      </div>
    </div>
  )
}
