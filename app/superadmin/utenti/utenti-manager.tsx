'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, X, Loader2, UserCheck, UserX } from 'lucide-react'

type Utente = {
  id: string
  nome: string
  cognome: string
  email: string
  role: string
  attivo: boolean
  createdAt: string
  host: { nomeAzienda: string } | null
}

const ROLE_COLORI: Record<string, BadgeVariant> = {
  SUPERADMIN: 'purple',
  ADMIN: 'blue',
  HOST: 'green',
}

const ROLES = ['SUPERADMIN', 'ADMIN', 'HOST'] as const

export default function UtentiManager({
  utentiIniziali,
  totale,
  filtroRole,
  filtroAttivo,
}: {
  utentiIniziali: Utente[]
  totale: number
  filtroRole?: string
  filtroAttivo?: string
}) {
  const router = useRouter()
  const [utenti, setUtenti] = useState(utentiIniziali)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('HOST')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/superadmin/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, cognome, email, password, role }),
    })

    if (res.ok) {
      setShowModal(false)
      setNome(''); setCognome(''); setEmail(''); setPassword(''); setRole('HOST')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Errore nella creazione')
    }
    setSaving(false)
  }

  async function toggleAttivo(userId: string, attivo: boolean) {
    setToggling(userId)
    const res = await fetch(`/api/superadmin/utenti/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !attivo }),
    })
    if (res.ok) {
      setUtenti(prev => prev.map(u => u.id === userId ? { ...u, attivo: !attivo } : u))
    }
    setToggling(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Utenti</h1>{/* TODO: i18n */}
          <p className="text-sm text-gray-500">{totale} utenti registrati sulla piattaforma</p>{/* TODO: i18n */}
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuovo utente{/* TODO: i18n */}
        </button>
      </div>

      {/* Filtri */}
      <div className="card">
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ruolo</label>{/* TODO: i18n */}
            <select name="role" defaultValue={filtroRole || ''} className="input text-sm">
              <option value="">Tutti</option>{/* TODO: i18n */}
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stato</label>{/* TODO: i18n */}
            <select name="attivo" defaultValue={filtroAttivo ?? ''} className="input text-sm">
              <option value="">Tutti</option>{/* TODO: i18n */}
              <option value="1">Attivo</option>{/* TODO: i18n */}
              <option value="0">Disattivato</option>{/* TODO: i18n */}
            </select>
          </div>
          <button type="submit" className="btn btn-primary text-sm">Filtra</button>{/* TODO: i18n */}
          <Link href="/superadmin/utenti" className="btn btn-ghost text-sm">Reset</Link>{/* TODO: i18n */}
        </form>
      </div>

      {/* Tabella */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Nome</th>{/* TODO: i18n */}
                <th className="table-th">Email</th>
                <th className="table-th">Ruolo</th>{/* TODO: i18n */}
                <th className="table-th">Stato</th>{/* TODO: i18n */}
                <th className="table-th">Host</th>
                <th className="table-th">Registrato</th>{/* TODO: i18n */}
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {utenti.map(u => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td font-medium text-gray-900 dark:text-slate-100">
                    {u.nome} {u.cognome}
                  </td>
                  <td className="table-td text-gray-500">{u.email}</td>
                  <td className="table-td">
                    <Badge variant={ROLE_COLORI[u.role] || 'gray'}>{u.role}</Badge>
                  </td>
                  <td className="table-td">
                    <Badge variant={u.attivo ? 'green' : 'red'}>
                      {u.attivo ? 'Attivo' : 'Disattivato'}{/* TODO: i18n */}
                    </Badge>
                  </td>
                  <td className="table-td text-gray-500">{u.host?.nomeAzienda || '—'}</td>
                  <td className="table-td text-xs text-gray-400">
                    {format(new Date(u.createdAt), 'd MMM yyyy', { locale: it })}
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => toggleAttivo(u.id, u.attivo)}
                      disabled={toggling === u.id}
                      className={`text-xs flex items-center gap-1 ${u.attivo ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                      title={u.attivo ? 'Disattiva utente' : 'Riattiva utente'}
                    >
                      {toggling === u.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : u.attivo ? (
                        <><UserX className="w-3.5 h-3.5" /> Disattiva</>
                      ) : (
                        <><UserCheck className="w-3.5 h-3.5" /> Riattiva</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {utenti.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center text-gray-400 py-8">
                    Nessun utente trovato{/* TODO: i18n */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal creazione utente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Nuovo utente</h2>{/* TODO: i18n */}
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cognome</label>
                  <input
                    type="text"
                    value={cognome}
                    onChange={e => setCognome(e.target.value)}
                    required
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ruolo</label>{/* TODO: i18n */}
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="input w-full"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost">
                  Annulla{/* TODO: i18n */}
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crea utente{/* TODO: i18n */}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
