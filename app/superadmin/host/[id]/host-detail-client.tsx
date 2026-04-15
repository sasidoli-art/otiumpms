'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, Bot, Package, User, KeyRound, Trash2, Save, Loader2,
  Plus, X, Check, AlertTriangle,
} from 'lucide-react'
import { CATALOGO_MODULI, parseModuli, type ModuliAttivi } from '@/lib/moduli'

type Unita = {
  id: string
  nome: string
  capacita: number
  lettiExtra: number
  prezzoBase: number
  piano: number | null
  attiva: boolean
}

type Struttura = {
  id: string
  nome: string
  tipo: string
  descrizione: string | null
  citta: string | null
  regione: string | null
  indirizzo: string | null
  capacitaTotale: number
  prezzoBase: number
  attiva: boolean
  unita: Unita[]
  _count: { prenotazioni: number }
}

type HostData = {
  id: string
  nomeAzienda: string
  partitaIva: string | null
  codiceFiscale: string | null
  telefono: string | null
  sitoWeb: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  regione: string | null
  fattNomeAzienda: string | null
  fattPartitaIva: string | null
  fattPec: string | null
  fattCodiceSDI: string | null
  regimeFiscale: string | null
  piano: string
  statoAbbonamento: string
  dataFineAbb: string | null
  moduliAttivi: unknown
  conciergeAttivo: boolean
  conciergeSystemPrompt: string | null
  user: { id: string; email: string; nome: string; cognome: string; attivo: boolean }
  strutture: Struttura[]
  _count: { strutture: number; prenotazioni: number; fatture: number }
}

type TabId = 'dati' | 'strutture' | 'moduli' | 'concierge'

const inp =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function HostDetailClient({ initial }: { initial: HostData }) {
  const router = useRouter()
  const [host, setHost] = useState<HostData>(initial)
  const [tab, setTab] = useState<TabId>('dati')
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  function showToast(type: 'ok' | 'err', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  async function refresh() {
    const res = await fetch(`/api/superadmin/host/${host.id}`)
    if (res.ok) {
      const data = await res.json()
      setHost(prev => ({
        ...prev,
        ...data,
        strutture: data.strutture,
        user: data.user,
      }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/host"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{host.nomeAzienda}</h1>
            <p className="text-sm text-gray-500">
              {host.user.nome} {host.user.cognome} · {host.user.email} ·{' '}
              <span className="text-brand-600">{host.piano}</span>
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>{host._count.strutture} strutture</p>
          <p>{host._count.prenotazioni} prenotazioni</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700">
        <TabBtn active={tab === 'dati'} onClick={() => setTab('dati')} icon={User} label="Dati azienda" />
        <TabBtn active={tab === 'strutture'} onClick={() => setTab('strutture')} icon={Building2} label={`Strutture (${host.strutture.length})`} />
        <TabBtn active={tab === 'moduli'} onClick={() => setTab('moduli')} icon={Package} label="Moduli" />
        <TabBtn active={tab === 'concierge'} onClick={() => setTab('concierge')} icon={Bot} label="Concierge AI" />
      </div>

      {/* Content */}
      <div>
        {tab === 'dati' && <TabDati host={host} onSaved={refresh} showToast={showToast} />}
        {tab === 'strutture' && <TabStrutture host={host} onChange={refresh} showToast={showToast} />}
        {tab === 'moduli' && <TabModuli host={host} onChange={refresh} showToast={showToast} />}
        {tab === 'concierge' && <TabConcierge host={host} onSaved={refresh} showToast={showToast} />}
      </div>

      {/* Danger zone */}
      <div className="card border-red-200 dark:border-red-900 p-6 bg-red-50/50 dark:bg-red-900/10">
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">⚠ Danger zone</h3>
        <DeleteHostButton host={host} onDeleted={() => router.push('/superadmin/host')} />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold z-50 ${
            toast.type === 'ok'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab button
// ══════════════════════════════════════════════════════════════════════════════

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? 'border-brand-500 text-brand-600 dark:text-brand-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB DATI
// ══════════════════════════════════════════════════════════════════════════════

function TabDati({
  host,
  onSaved,
  showToast,
}: {
  host: HostData
  onSaved: () => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [form, setForm] = useState({
    nomeAzienda: host.nomeAzienda,
    partitaIva: host.partitaIva ?? '',
    codiceFiscale: host.codiceFiscale ?? '',
    telefono: host.telefono ?? '',
    sitoWeb: host.sitoWeb ?? '',
    indirizzo: host.indirizzo ?? '',
    citta: host.citta ?? '',
    provincia: host.provincia ?? '',
    cap: host.cap ?? '',
    regione: host.regione ?? '',
    fattPec: host.fattPec ?? '',
    fattCodiceSDI: host.fattCodiceSDI ?? '',
    regimeFiscale: host.regimeFiscale ?? 'RF01',
    piano: host.piano,
    statoAbbonamento: host.statoAbbonamento,
    userNome: host.user.nome,
    userCognome: host.user.cognome,
    userEmail: host.user.email,
  })

  async function salva() {
    setSaving(true)
    const res = await fetch(`/api/superadmin/host/${host.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      showToast('ok', 'Dati salvati')
      onSaved()
    } else {
      showToast('err', 'Errore salvataggio')
    }
  }

  async function resetPassword() {
    if (!confirm('Rigenerare la password? La precedente sarà invalidata.')) return
    setResetting(true)
    const res = await fetch(`/api/superadmin/host/${host.id}/reset-password`, { method: 'POST' })
    setResetting(false)
    if (res.ok) {
      const data = await res.json()
      setNewPassword(data.password)
    } else {
      showToast('err', 'Errore reset password')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Referente</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome" value={form.userNome} onChange={v => setForm(f => ({ ...f, userNome: v }))} />
          <Field label="Cognome" value={form.userCognome} onChange={v => setForm(f => ({ ...f, userCognome: v }))} />
        </div>
        <Field label="Email login" value={form.userEmail} onChange={v => setForm(f => ({ ...f, userEmail: v }))} type="email" />

        <button
          onClick={resetPassword}
          disabled={resetting}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold"
        >
          {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
          Reset password
        </button>

        {newPassword && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 rounded-lg p-3 text-xs">
            <p className="font-semibold mb-1">Nuova password generata (copia SUBITO):</p>
            <p className="font-mono text-base">{newPassword}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${form.userEmail}\nPassword: ${newPassword}`)
                showToast('ok', 'Copiato negli appunti')
              }}
              className="mt-2 px-2 py-1 bg-white dark:bg-slate-800 rounded border text-[11px]"
            >
              📋 Copia
            </button>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Azienda</h3>
        <Field label="Nome azienda" value={form.nomeAzienda} onChange={v => setForm(f => ({ ...f, nomeAzienda: v }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Partita IVA" value={form.partitaIva} onChange={v => setForm(f => ({ ...f, partitaIva: v }))} />
          <Field label="Codice Fiscale" value={form.codiceFiscale} onChange={v => setForm(f => ({ ...f, codiceFiscale: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefono" value={form.telefono} onChange={v => setForm(f => ({ ...f, telefono: v }))} />
          <Field label="Sito web" value={form.sitoWeb} onChange={v => setForm(f => ({ ...f, sitoWeb: v }))} />
        </div>
        <Field label="Indirizzo" value={form.indirizzo} onChange={v => setForm(f => ({ ...f, indirizzo: v }))} />
        <div className="grid grid-cols-4 gap-3">
          <Field label="Città" value={form.citta} onChange={v => setForm(f => ({ ...f, citta: v }))} />
          <Field label="Provincia" value={form.provincia} onChange={v => setForm(f => ({ ...f, provincia: v.toUpperCase() }))} />
          <Field label="CAP" value={form.cap} onChange={v => setForm(f => ({ ...f, cap: v }))} />
          <Field label="Regione" value={form.regione} onChange={v => setForm(f => ({ ...f, regione: v }))} />
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Fatturazione elettronica</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="PEC" type="email" value={form.fattPec} onChange={v => setForm(f => ({ ...f, fattPec: v }))} />
          <Field label="Codice SDI" value={form.fattCodiceSDI} onChange={v => setForm(f => ({ ...f, fattCodiceSDI: v.toUpperCase() }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Regime fiscale</label>
          <select
            value={form.regimeFiscale}
            onChange={e => setForm(f => ({ ...f, regimeFiscale: e.target.value }))}
            className={inp}
          >
            <option value="RF01">RF01 — Ordinario</option>
            <option value="RF19">RF19 — Forfettario</option>
            <option value="RF02">RF02 — Contribuenti minimi</option>
            <option value="RF04">RF04 — Agricoltura</option>
          </select>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Abbonamento</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Piano</label>
            <select
              value={form.piano}
              onChange={e => setForm(f => ({ ...f, piano: e.target.value }))}
              className={inp}
            >
              <option value="LIGHT">LIGHT</option>
              <option value="EVENTO_SINGOLO">EVENTO SINGOLO</option>
              <option value="VISIBILITA_MENSILE">VISIBILITÀ MENSILE</option>
              <option value="PARTNER_PREMIUM">PARTNER PREMIUM</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Stato</label>
            <select
              value={form.statoAbbonamento}
              onChange={e => setForm(f => ({ ...f, statoAbbonamento: e.target.value }))}
              className={inp}
            >
              <option value="ATTIVO">ATTIVO</option>
              <option value="IN_PROVA">IN PROVA</option>
              <option value="SOSPESO">SOSPESO</option>
              <option value="SCADUTO">SCADUTO</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={salva}
        disabled={saving}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salva modifiche
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inp} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB STRUTTURE
// ══════════════════════════════════════════════════════════════════════════════

function TabStrutture({
  host,
  onChange,
  showToast,
}: {
  host: HostData
  onChange: () => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [addingStruttura, setAddingStruttura] = useState(false)

  async function aggiungiStruttura() {
    const nome = prompt('Nome nuova struttura:')
    if (!nome) return
    setAddingStruttura(true)
    const res = await fetch('/api/superadmin/strutture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostId: host.id,
        nome,
        tipo: 'ALLOGGIO',
        citta: host.citta,
      }),
    })
    setAddingStruttura(false)
    if (res.ok) {
      showToast('ok', 'Struttura creata')
      onChange()
    } else {
      showToast('err', 'Errore creazione')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {host.strutture.length} strutture · Gestisci strutture, unità, capacità, posti letto.
        </p>
        <button
          onClick={aggiungiStruttura}
          disabled={addingStruttura}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          {addingStruttura ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Aggiungi struttura
        </button>
      </div>

      {host.strutture.length === 0 && (
        <div className="card text-center py-12 text-sm text-gray-400">
          Nessuna struttura. Click su &quot;Aggiungi struttura&quot; per crearne una.
        </div>
      )}

      {host.strutture.map(s => (
        <StrutturaCard key={s.id} struttura={s} onChange={onChange} showToast={showToast} />
      ))}
    </div>
  )
}

function StrutturaCard({
  struttura,
  onChange,
  showToast,
}: {
  struttura: Struttura
  onChange: () => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: struttura.nome,
    tipo: struttura.tipo,
    citta: struttura.citta ?? '',
    indirizzo: struttura.indirizzo ?? '',
    prezzoBase: String(struttura.prezzoBase),
    attiva: struttura.attiva,
  })

  async function salvaStruttura() {
    setSaving(true)
    const res = await fetch(`/api/superadmin/strutture/${struttura.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        tipo: form.tipo,
        citta: form.citta || null,
        indirizzo: form.indirizzo || null,
        prezzoBase: Number(form.prezzoBase) || 0,
        attiva: form.attiva,
      }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('ok', 'Struttura salvata')
      setEditing(false)
      onChange()
    } else {
      showToast('err', 'Errore')
    }
  }

  async function eliminaStruttura() {
    if (!confirm(`Eliminare "${struttura.nome}" e tutte le sue unità/prenotazioni?`)) return
    const res = await fetch(
      `/api/superadmin/strutture/${struttura.id}?confirm=${encodeURIComponent(struttura.nome)}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      showToast('ok', 'Struttura eliminata')
      onChange()
    } else {
      showToast('err', 'Errore eliminazione')
    }
  }

  async function aggiungiUnita() {
    const nome = prompt(`Nome nuova unità (struttura: ${struttura.nome}):`)
    if (!nome) return
    const res = await fetch('/api/superadmin/unita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strutturaId: struttura.id, nome }),
    })
    if (res.ok) {
      showToast('ok', 'Unità creata')
      onChange()
      setOpen(true)
    } else {
      showToast('err', 'Errore')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <Building2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">{struttura.nome}</p>
            <p className="text-xs text-gray-500">
              {struttura.tipo} · {struttura.citta ?? '—'} · {struttura.unita.length} unità ·{' '}
              {struttura._count.prenotazioni} prenotazioni
              {!struttura.attiva && ' · ❌ INATTIVA'}
            </p>
          </div>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Modifica
          </button>
          <button
            onClick={eliminaStruttura}
            className="text-xs px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-slate-700 pt-4">
          <Field label="Nome" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-slate-400 block mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className={inp}
              >
                <option value="ALLOGGIO">Alloggio</option>
                <option value="EVENTO">Evento</option>
                <option value="VENUE">Venue</option>
                <option value="ESPERIENZA">Esperienza</option>
                <option value="SERVIZIO">Servizio</option>
              </select>
            </div>
            <Field label="Città" value={form.citta} onChange={v => setForm(f => ({ ...f, citta: v }))} />
          </div>
          <Field label="Indirizzo" value={form.indirizzo} onChange={v => setForm(f => ({ ...f, indirizzo: v }))} />
          <Field label="Prezzo base (€)" type="number" value={form.prezzoBase} onChange={v => setForm(f => ({ ...f, prezzoBase: v }))} />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.attiva}
              onChange={e => setForm(f => ({ ...f, attiva: e.target.checked }))}
            />
            Struttura attiva
          </label>
          <button
            onClick={salvaStruttura}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva struttura
          </button>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Unità ({struttura.unita.length})
            </h4>
            <button
              onClick={aggiungiUnita}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600"
            >
              <Plus className="w-3 h-3" /> Aggiungi unità
            </button>
          </div>
          <div className="space-y-2">
            {struttura.unita.map(u => (
              <UnitaRow key={u.id} unita={u} onChange={onChange} showToast={showToast} />
            ))}
            {struttura.unita.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nessuna unità</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function UnitaRow({
  unita,
  onChange,
  showToast,
}: {
  unita: Unita
  onChange: () => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nome: unita.nome,
    capacita: String(unita.capacita),
    lettiExtra: String(unita.lettiExtra),
    prezzoBase: String(unita.prezzoBase),
    piano: unita.piano !== null ? String(unita.piano) : '',
    attiva: unita.attiva,
  })
  const [saving, setSaving] = useState(false)

  async function salva() {
    setSaving(true)
    const res = await fetch(`/api/superadmin/unita/${unita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        capacita: Number(form.capacita) || 1,
        lettiExtra: Number(form.lettiExtra) || 0,
        prezzoBase: Number(form.prezzoBase) || 0,
        piano: form.piano ? Number(form.piano) : null,
        attiva: form.attiva,
      }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('ok', 'Unità salvata')
      setEditing(false)
      onChange()
    } else {
      showToast('err', 'Errore')
    }
  }

  async function elimina() {
    if (!confirm(`Eliminare "${unita.nome}"?`)) return
    const res = await fetch(`/api/superadmin/unita/${unita.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('ok', 'Unità eliminata')
      onChange()
    } else {
      showToast('err', 'Errore')
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800/40 text-xs">
        <div className="flex-1">
          <span className="font-semibold text-gray-900 dark:text-slate-100">{unita.nome}</span>
          <span className="text-gray-500 ml-2">
            · {unita.capacita} posti · {unita.lettiExtra > 0 && `+${unita.lettiExtra} extra · `}
            €{unita.prezzoBase}{unita.piano !== null && ` · P${unita.piano}`}
            {!unita.attiva && ' · ❌'}
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="px-2 py-1 text-brand-600 hover:bg-white dark:hover:bg-slate-700 rounded">
            Modifica
          </button>
          <button onClick={elimina} className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-600 dark:text-slate-400 block">Nome</label>
          <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className="text-[10px] text-gray-600 dark:text-slate-400 block">Piano</label>
          <input
            type="number"
            value={form.piano}
            onChange={e => setForm(f => ({ ...f, piano: e.target.value }))}
            placeholder="Piano (0=terra)"
            className={inp}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-gray-600 dark:text-slate-400 block">Posti letto</label>
          <input
            type="number"
            min="1"
            value={form.capacita}
            onChange={e => setForm(f => ({ ...f, capacita: e.target.value }))}
            className={inp}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-600 dark:text-slate-400 block">Letti extra</label>
          <input
            type="number"
            min="0"
            value={form.lettiExtra}
            onChange={e => setForm(f => ({ ...f, lettiExtra: e.target.value }))}
            className={inp}
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-600 dark:text-slate-400 block">Prezzo €</label>
          <input
            type="number"
            min="0"
            value={form.prezzoBase}
            onChange={e => setForm(f => ({ ...f, prezzoBase: e.target.value }))}
            className={inp}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={form.attiva}
          onChange={e => setForm(f => ({ ...f, attiva: e.target.checked }))}
        />
        Attiva
      </label>
      <div className="flex gap-2">
        <button onClick={() => setEditing(false)} className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg">
          Annulla
        </button>
        <button
          onClick={salva}
          disabled={saving}
          className="flex-1 px-2 py-1.5 text-xs bg-brand-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Salva'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB MODULI
// ══════════════════════════════════════════════════════════════════════════════

function TabModuli({
  host,
  onChange,
  showToast,
}: {
  host: HostData
  onChange: () => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const moduli: ModuliAttivi = parseModuli(host.moduliAttivi)
  const [saving, setSaving] = useState<string | null>(null)

  async function toggleModulo(id: string, valore: boolean) {
    setSaving(id)
    const res = await fetch(`/api/superadmin/host/${host.id}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduliAttivi: { [id]: valore } }),
    })
    setSaving(null)
    if (res.ok) {
      showToast('ok', `${valore ? 'Attivato' : 'Disattivato'}: ${id}`)
      onChange()
    } else {
      showToast('err', 'Errore toggle modulo')
    }
  }

  const gruppi: Record<string, typeof CATALOGO_MODULI> = {
    base: [],
    operativo: [],
    avanzato: [],
    integrazioni: [],
  }
  for (const m of CATALOGO_MODULI) {
    gruppi[m.categoria]?.push(m)
  }

  const labelGruppo: Record<string, string> = {
    base: 'Base',
    operativo: 'Operativo',
    avanzato: 'Avanzato',
    integrazioni: 'Integrazioni',
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">
        Attiva/disattiva i moduli per questo host. L&apos;host al login vede solo i moduli attivi.
      </p>

      {Object.entries(gruppi).map(([cat, mods]) => (
        <div key={cat} className="card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
            {labelGruppo[cat]}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {mods.map(m => {
              const attivo = !!moduli[m.id]
              return (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    attivo
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={attivo}
                    disabled={saving === m.id}
                    onChange={e => toggleModulo(m.id, e.target.checked)}
                    className="mt-0.5"
                  />
                  <div className="text-xs flex-1">
                    <p className="font-semibold">{m.nome}</p>
                    <p className="text-gray-500">{m.descrizione}</p>
                  </div>
                  {saving === m.id && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB CONCIERGE
// ══════════════════════════════════════════════════════════════════════════════

function TabConcierge({
  host,
  onSaved,
  showToast,
}: {
  host: HostData
  onSaved: () => void
  showToast: (t: 'ok' | 'err', m: string) => void
}) {
  const [attivo, setAttivo] = useState(host.conciergeAttivo)
  const [prompt, setPrompt] = useState(host.conciergeSystemPrompt ?? '')
  const [saving, setSaving] = useState(false)

  async function salva() {
    setSaving(true)
    const res = await fetch(`/api/superadmin/host/${host.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conciergeAttivo: attivo,
        conciergeSystemPrompt: prompt || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      showToast('ok', 'Concierge salvato')
      onSaved()
    } else {
      showToast('err', 'Errore')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <Bot className="w-5 h-5 text-purple-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">AI Concierge</p>
            <p className="text-xs text-gray-500">
              Attivazione locale per questo host. Il provider/chiave AI sono gestiti globalmente da{' '}
              <Link href="/superadmin/impostazioni/ai" className="text-brand-600 hover:underline">
                Impostazioni AI
              </Link>.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={attivo} onChange={e => setAttivo(e.target.checked)} />
          <span className="text-sm font-semibold">Concierge attivo per questo host</span>
        </label>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          System Prompt
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Info specifiche della struttura (orari, Wi-Fi password, parcheggio, ecc.) iniettate nel
          prompt dell&apos;AI a ogni conversazione.
        </p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={14}
          placeholder={`Colazione 7:30-10:00 in terrazza.\nCheck-out ore 11:00.\nWi-Fi: NomeRete / password123\nParcheggio: gratuito nel cortile.`}
          className={inp + ' font-mono text-[11px]'}
        />
      </div>

      <button
        onClick={salva}
        disabled={saving}
        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salva Concierge
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Delete host
// ══════════════════════════════════════════════════════════════════════════════

function DeleteHostButton({
  host,
  onDeleted,
}: {
  host: HostData
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function elimina() {
    const conferma = prompt(
      `ATTENZIONE: stai per ELIMINARE l'host "${host.nomeAzienda}" e TUTTI i suoi dati (strutture, prenotazioni, fatture, concierge, ecc.). Questa operazione è IRREVERSIBILE.\n\nPer confermare, scrivi esattamente il nome azienda:`
    )
    if (conferma !== host.nomeAzienda) {
      alert('Nome non corrisponde, operazione annullata.')
      return
    }
    setDeleting(true)
    const res = await fetch(
      `/api/superadmin/host/${host.id}?confirm=${encodeURIComponent(host.nomeAzienda)}`,
      { method: 'DELETE' }
    )
    setDeleting(false)
    if (res.ok) {
      alert('Host eliminato')
      onDeleted()
    } else {
      alert('Errore eliminazione')
    }
  }

  return (
    <button
      onClick={elimina}
      disabled={deleting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
    >
      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      Elimina host definitivamente
    </button>
  )
}
