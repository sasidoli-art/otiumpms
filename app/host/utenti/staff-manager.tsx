'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  UserPlus,
  Mail,
  MailX,
  RefreshCw,
  Trash2,
  MoreVertical,
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  X,
  ChevronDown,
  UserCheck,
  UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'
import { Badge, BadgeVariant } from '@/components/ui/badge'

// TODO: i18n — tutte le stringhe sono hardcoded in italiano

// ── Tipi ──────────────────────────────────────────────────────────────

type RuoloStaff =
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'SPA_OPERATOR'
  | 'RESTAURANT'
  | 'CONCIERGE'
  | 'READONLY'

interface StaffMember {
  id: string
  nome: string
  cognome: string
  email: string
  ruolo: RuoloStaff
  attivo: boolean
  createdAt: string
}

interface Invito {
  id: string
  nome: string
  cognome: string
  email: string
  ruolo: RuoloStaff
  createdAt: string
  scadenza: string
}

// ── Costanti ruolo ────────────────────────────────────────────────────

const RUOLI: { value: RuoloStaff; label: string; descrizione: string }[] = [
  { value: 'MANAGER', label: 'Manager', descrizione: 'Accesso completo' },
  { value: 'RECEPTIONIST', label: 'Receptionist', descrizione: 'Prenotazioni, check-in, CRM' },
  { value: 'HOUSEKEEPING', label: 'Housekeeping', descrizione: 'Pulizie, manutenzione' },
  { value: 'SPA_OPERATOR', label: 'Operatore SPA', descrizione: 'Appuntamenti SPA' },
  { value: 'RESTAURANT', label: 'Ristorazione', descrizione: 'Ristorazione, pasti' },
  { value: 'CONCIERGE', label: 'Concierge', descrizione: 'Chat ospiti, AI' },
  { value: 'READONLY', label: 'Solo lettura', descrizione: 'Solo visualizzazione' },
]

const RUOLO_BADGE_VARIANT: Record<RuoloStaff, BadgeVariant> = {
  MANAGER: 'purple',
  RECEPTIONIST: 'blue',
  HOUSEKEEPING: 'green',
  SPA_OPERATOR: 'orange',
  RESTAURANT: 'yellow',
  CONCIERGE: 'gray',
  READONLY: 'gray',
}

function ruoloLabel(ruolo: RuoloStaff): string {
  return RUOLI.find((r) => r.value === ruolo)?.label ?? ruolo
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Componente principale ─────────────────────────────────────────────

export function StaffManager() {
  const router = useRouter()
  const [members, setMembers] = useState<StaffMember[]>([])
  const [inviti, setInviti] = useState<Invito[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'team' | 'inviti'>('team')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ── Carica dati ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/host/utenti')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
        setInviti(data.inviti ?? [])
      }
    } catch {
      // silenzioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Azioni membro ─────────────────────────────────────
  async function cambiaRuolo(id: string, ruolo: RuoloStaff) {
    setActionLoading(id)
    setOpenDropdown(null)
    try {
      const res = await fetch(`/api/host/utenti/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruolo }),
      })
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ruolo } : m)))
      }
    } catch {
      // silenzioso
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleAttivo(id: string, attivo: boolean) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/host/utenti/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attivo }),
      })
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, attivo } : m)))
      }
    } catch {
      // silenzioso
    } finally {
      setActionLoading(null)
    }
  }

  async function eliminaMembro(id: string) {
    if (!confirm('Sei sicuro di voler rimuovere questo utente?')) return // TODO: i18n
    setActionLoading(id)
    try {
      const res = await fetch(`/api/host/utenti/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id))
      }
    } catch {
      // silenzioso
    } finally {
      setActionLoading(null)
    }
  }

  // ── Azioni invito ─────────────────────────────────────
  async function reinviaInvito(id: string) {
    setActionLoading(`inv-${id}`)
    try {
      const res = await fetch(`/api/host/utenti/inviti/${id}`, { method: 'POST' })
      if (res.ok) {
        setSuccessMsg('Invito reinviato con successo') // TODO: i18n
        setTimeout(() => setSuccessMsg(null), 3000)
        loadData()
      }
    } catch {
      // silenzioso
    } finally {
      setActionLoading(null)
    }
  }

  async function revocaInvito(id: string) {
    if (!confirm('Sei sicuro di voler revocare questo invito?')) return // TODO: i18n
    setActionLoading(`inv-${id}`)
    try {
      const res = await fetch(`/api/host/utenti/inviti/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInviti((prev) => prev.filter((i) => i.id !== id))
      }
    } catch {
      // silenzioso
    } finally {
      setActionLoading(null)
    }
  }

  // ── Stats ──────────────────────────────────────────────
  const totale = members.length
  const attivi = members.filter((m) => m.attivo).length
  const pendenti = inviti.length

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>{/* TODO: i18n */}
          <p className="text-gray-500 text-sm mt-1">
            Gestisci il team e i permessi di accesso alla piattaforma{/* TODO: i18n */}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <UserPlus size={16} />
          Invita utente{/* TODO: i18n */}
        </button>
      </div>

      {/* ── Messaggio successo ──────────────────────────── */}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          titolo="Totale utenti" // TODO: i18n
          valore={totale}
          icona={<Users size={28} />}
          colorIcona="text-blue-500"
        />
        <StatCard
          titolo="Attivi" // TODO: i18n
          valore={attivi}
          icona={<UserCheck size={28} />}
          colorIcona="text-green-500"
        />
        <StatCard
          titolo="Inviti pendenti" // TODO: i18n
          valore={pendenti}
          icona={<Mail size={28} />}
          colorIcona="text-orange-500"
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('team')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'team'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="flex items-center gap-2">
            <Users size={15} />
            Team{/* TODO: i18n */}
          </span>
        </button>
        <button
          onClick={() => setTab('inviti')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'inviti'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="flex items-center gap-2">
            <Clock size={15} />
            Inviti pendenti{/* TODO: i18n */}
            {pendenti > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {pendenti}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ── Contenuto tab ───────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : tab === 'team' ? (
        <TeamTable
          members={members}
          actionLoading={actionLoading}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          onCambiaRuolo={cambiaRuolo}
          onToggleAttivo={toggleAttivo}
          onElimina={eliminaMembro}
        />
      ) : (
        <InvitiList
          inviti={inviti}
          actionLoading={actionLoading}
          onReinvia={reinviaInvito}
          onRevoca={revocaInvito}
        />
      )}

      {/* ── Modal invito ────────────────────────────────── */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={(email) => {
            setShowInviteModal(false)
            setSuccessMsg(`Link invito inviato a ${email}`) // TODO: i18n
            setTimeout(() => setSuccessMsg(null), 5000)
            loadData()
          }}
        />
      )}
    </div>
  )
}

// ── Tabella team ──────────────────────────────────────────────────────

function TeamTable({
  members,
  actionLoading,
  openDropdown,
  setOpenDropdown,
  onCambiaRuolo,
  onToggleAttivo,
  onElimina,
}: {
  members: StaffMember[]
  actionLoading: string | null
  openDropdown: string | null
  setOpenDropdown: (id: string | null) => void
  onCambiaRuolo: (id: string, ruolo: RuoloStaff) => void
  onToggleAttivo: (id: string, attivo: boolean) => void
  onElimina: (id: string) => void
}) {
  if (members.length === 0) {
    return (
      <div className="text-center py-16">
        <Users size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Nessun membro del team</p>{/* TODO: i18n */}
        <p className="text-gray-400 text-sm mt-1">
          Invita il tuo primo collaboratore per iniziare{/* TODO: i18n */}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>{/* TODO: i18n */}
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ruolo</th>{/* TODO: i18n */}
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stato</th>{/* TODO: i18n */}
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Creato il</th>{/* TODO: i18n */}
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Azioni</th>{/* TODO: i18n */}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {m.nome} {m.cognome}
                </td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3">
                  {/* Dropdown cambio ruolo */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === m.id ? null : m.id)}
                      className="flex items-center gap-1 group"
                      disabled={actionLoading === m.id}
                    >
                      <Badge variant={RUOLO_BADGE_VARIANT[m.ruolo]}>{ruoloLabel(m.ruolo)}</Badge>
                      <ChevronDown size={12} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                    {openDropdown === m.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                        <div className="absolute z-20 mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]">
                          {RUOLI.map((r) => (
                            <button
                              key={r.value}
                              onClick={() => onCambiaRuolo(m.id, r.value)}
                              className={cn(
                                'w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors',
                                m.ruolo === r.value && 'bg-blue-50'
                              )}
                            >
                              <span className="text-sm font-medium text-gray-800">{r.label}</span>
                              <span className="block text-xs text-gray-400">{r.descrizione}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleAttivo(m.id, !m.attivo)}
                    disabled={actionLoading === m.id}
                    className="flex items-center gap-1.5 group"
                  >
                    {m.attivo ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-green-700 text-xs font-medium group-hover:underline">Attivo</span>{/* TODO: i18n */}
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-gray-500 text-xs font-medium group-hover:underline">Disattivo</span>{/* TODO: i18n */}
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatData(m.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onElimina(m.id)}
                    disabled={actionLoading === m.id}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                    title="Rimuovi utente" // TODO: i18n
                  >
                    {actionLoading === m.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Lista inviti ──────────────────────────────────────────────────────

function InvitiList({
  inviti,
  actionLoading,
  onReinvia,
  onRevoca,
}: {
  inviti: Invito[]
  actionLoading: string | null
  onReinvia: (id: string) => void
  onRevoca: (id: string) => void
}) {
  if (inviti.length === 0) {
    return (
      <div className="text-center py-16">
        <Mail size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Nessun invito pendente</p>{/* TODO: i18n */}
        <p className="text-gray-400 text-sm mt-1">
          Gli inviti inviati appariranno qui{/* TODO: i18n */}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {inviti.map((inv) => {
        const isLoading = actionLoading === `inv-${inv.id}`
        const scaduto = new Date(inv.scadenza) < new Date()

        return (
          <div
            key={inv.id}
            className={cn(
              'bg-white rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3',
              scaduto ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900">
                  {inv.nome} {inv.cognome}
                </span>
                <Badge variant={RUOLO_BADGE_VARIANT[inv.ruolo]}>{ruoloLabel(inv.ruolo)}</Badge>
                {scaduto && <Badge variant="red">Scaduto</Badge>}{/* TODO: i18n */}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{inv.email}</p>
              <p className="text-gray-400 text-xs mt-1">
                Inviato il {formatData(inv.createdAt)} &middot; Scade il {formatData(inv.scadenza)}{/* TODO: i18n */}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onReinvia(inv.id)}
                disabled={isLoading}
                className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Reinvia{/* TODO: i18n */}
              </button>
              <button
                onClick={() => onRevoca(inv.id)}
                disabled={isLoading}
                className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded"
                title="Revoca invito" // TODO: i18n
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Modal invito ──────────────────────────────────────────────────────

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (email: string) => void
}) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState<RuoloStaff>('RECEPTIONIST')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore(null)
    setLoading(true)

    try {
      const res = await fetch('/api/host/utenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          cognome: cognome.trim(),
          email: email.trim().toLowerCase(),
          ruolo,
        }),
      })

      if (res.ok) {
        onSuccess(email.trim().toLowerCase())
      } else {
        const data = await res.json().catch(() => ({}))
        setErrore(data.error ?? 'Errore durante l\'invio dell\'invito') // TODO: i18n
      }
    } catch {
      setErrore('Errore di rete. Riprova.') // TODO: i18n
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invita utente</h2>{/* TODO: i18n */}
            <p className="text-gray-500 text-sm mt-0.5">
              Invia un invito per email al nuovo membro del team{/* TODO: i18n */}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome *</label>{/* TODO: i18n */}
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input"
                placeholder="Mario" // TODO: i18n
                required
              />
            </div>
            <div>
              <label className="label">Cognome *</label>{/* TODO: i18n */}
              <input
                type="text"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                className="input"
                placeholder="Rossi" // TODO: i18n
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Email *</label>{/* TODO: i18n */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="mario.rossi@esempio.it" // TODO: i18n
              required
            />
          </div>

          <div>
            <label className="label">Ruolo *</label>{/* TODO: i18n */}
            <div className="space-y-1.5 mt-1">
              {RUOLI.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    ruolo === r.value
                      ? 'border-blue-300 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  )}
                >
                  <input
                    type="radio"
                    name="ruolo"
                    value={r.value}
                    checked={ruolo === r.value}
                    onChange={() => setRuolo(r.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{r.label}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{r.descrizione}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {errore && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
              {errore}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2"
            >
              Annulla{/* TODO: i18n */}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2 px-4 py-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {loading ? 'Invio...' : 'Invia invito'}{/* TODO: i18n */}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
