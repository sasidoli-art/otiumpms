'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Loader2, Save, Building2, CreditCard, Package, ShieldCheck, Activity,
  LogIn, UserX, Pause, CheckCircle2, AlertCircle, Pencil, X,
  Users, Calendar, Globe,
} from 'lucide-react'
import { CATALOGO_MODULI } from '@/lib/moduli'

type HostDetail = {
  host: {
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
    note: string | null
    piano: string
    statoAbbonamento: string
    dataInizioAbb: string | null
    dataFineAbb: string | null
    moduliAttivi: Record<string, boolean>
    mrr: number
    revenueTotale: number
    onboardingCompletato: boolean
    onboardingStep: number
    dpaAccettato: boolean
    createdAt: string
    user: { email: string; nome: string; cognome: string; twoFactorEnabled: boolean }
    strutture: { id: string; nome: string; citta: string | null; attiva: boolean; _count: { unita: number; prenotazioni: number } }[]
    abbonamenti: { id: string; piano: string; stato: string; dataInizio: string; dataFine: string | null; prezzoMensile: number; note: string | null }[]
    dpaAccettazioni: { versione: string; accettatoAt: string }[]
    richiesteCancellazione: { id: string; tipo: string; stato: string; scadenzaAt: string | null }[]
    _count: { prenotazioni: number; strutture: number; fatture: number; tickets: number }
  }
  audit: {
    id: string; azione: string; entita: string; entitaId: string | null
    userEmail: string | null; dettagli: string | null; createdAt: string
  }[]
}

const PIANO_LABEL: Record<string, string> = {
  LIGHT: 'Light · €29/mese',
  EVENTO_SINGOLO: 'Evento · €49 una tantum',
  VISIBILITA_MENSILE: 'Visibilità · €149/mese',
  PARTNER_PREMIUM: 'Partner Premium · €349/mese',
}

const STATO_CLS: Record<string, string> = {
  ATTIVO: 'bg-green-50 text-green-700',
  IN_PROVA: 'bg-blue-50 text-blue-700',
  SCADUTO: 'bg-orange-50 text-orange-700',
  SOSPESO: 'bg-gray-100 text-gray-600',
}

export default function HostDettaglio({ id }: { id: string }) {
  const router = useRouter()
  const [data, setData] = useState<HostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editAnagrafica, setEditAnagrafica] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [moduli, setModuli] = useState<Record<string, boolean>>({})
  const [moduliDirty, setModuliDirty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/host/${id}`)
    if (res.ok) {
      const d: HostDetail = await res.json()
      setData(d)
      setModuli({ ...d.host.moduliAttivi })
      setForm({
        nomeAzienda: d.host.nomeAzienda,
        partitaIva: d.host.partitaIva ?? '',
        codiceFiscale: d.host.codiceFiscale ?? '',
        telefono: d.host.telefono ?? '',
        sitoWeb: d.host.sitoWeb ?? '',
        indirizzo: d.host.indirizzo ?? '',
        citta: d.host.citta ?? '',
        provincia: d.host.provincia ?? '',
        cap: d.host.cap ?? '',
        regione: d.host.regione ?? '',
        note: d.host.note ?? '',
      })
    } else setError('Errore caricamento')
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function salvaAnagrafica() {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/host/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        partitaIva: form.partitaIva || null,
        codiceFiscale: form.codiceFiscale || null,
        telefono: form.telefono || null,
        sitoWeb: form.sitoWeb || null,
        indirizzo: form.indirizzo || null,
        citta: form.citta || null,
        provincia: form.provincia || null,
        cap: form.cap || null,
        regione: form.regione || null,
        note: form.note || null,
      }),
    })
    if (res.ok) {
      setEditAnagrafica(false)
      load()
    } else setError('Errore salvataggio anagrafica')
    setSaving(false)
  }

  async function salvaModuli() {
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/host/${id}/moduli`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduliAttivi: moduli }),
    })
    if (res.ok) {
      setModuliDirty(false)
      load()
    } else setError('Errore salvataggio moduli')
    setSaving(false)
  }

  function toggleModulo(modId: string) {
    setModuli((prev) => ({ ...prev, [modId]: !prev[modId] }))
    setModuliDirty(true)
  }

  async function cambiaPiano() {
    const nuovo = window.prompt('Nuovo piano (LIGHT | EVENTO_SINGOLO | VISIBILITA_MENSILE | PARTNER_PREMIUM):')
    if (!nuovo) return
    const res = await fetch(`/api/admin/host/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piano: nuovo }),
    })
    if (res.ok) load()
    else setError('Errore cambio piano')
  }

  async function estendiAbbonamento() {
    const giorni = window.prompt('Estendi di quanti giorni?', '30')
    if (!giorni) return
    const giorniNum = parseInt(giorni)
    if (isNaN(giorniNum) || giorniNum <= 0) return

    const currentEnd = data?.host.dataFineAbb ? new Date(data.host.dataFineAbb) : new Date()
    const newEnd = new Date(currentEnd.getTime() + giorniNum * 86400000)

    const res = await fetch(`/api/admin/host/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataFineAbb: newEnd.toISOString() }),
    })
    if (res.ok) load()
  }

  async function impersona() {
    if (!data || !window.confirm(`Accedere come ${data.host.nomeAzienda}?`)) return
    const res = await fetch(`/api/admin/host/${id}/impersona`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      router.push(d.redirectTo ?? '/host/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!data) {
    return <div className="card text-red-600">{error || 'Non trovato'}</div>
  }

  const { host, audit } = data
  const moduliByCat = CATALOGO_MODULI.reduce<Record<string, typeof CATALOGO_MODULI>>((acc, m) => {
    if (!acc[m.categoria]) acc[m.categoria] = []
    acc[m.categoria].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-500/5 flex items-center justify-center text-brand-600 font-bold">
              {host.nomeAzienda.charAt(0).toUpperCase()}
            </span>
            {host.nomeAzienda}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {host.user.email} · {PIANO_LABEL[host.piano] ?? host.piano} ·{' '}
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATO_CLS[host.statoAbbonamento]}`}>
              {host.statoAbbonamento}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={impersona} className="btn-secondary flex items-center gap-2">
            <LogIn className="w-4 h-4" /> Impersona
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Layout 2 col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonna sinistra 2/3 ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Anagrafica */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" /> Anagrafica
              </h2>
              {!editAnagrafica ? (
                <button onClick={() => setEditAnagrafica(true)} className="text-gray-400 hover:text-brand-500">
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button onClick={salvaAnagrafica} disabled={saving} className="p-1.5 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditAnagrafica(false)} className="p-1.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {!editAnagrafica ? (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <InfoRow label="Nome azienda" value={host.nomeAzienda} />
                <InfoRow label="P.IVA" value={host.partitaIva ?? '—'} mono />
                <InfoRow label="Codice fiscale" value={host.codiceFiscale ?? '—'} mono />
                <InfoRow label="Telefono" value={host.telefono ?? '—'} />
                <InfoRow label="Email" value={host.user.email} />
                <InfoRow label="Sito web" value={host.sitoWeb ?? '—'} />
                <InfoRow label="Indirizzo" value={host.indirizzo ?? '—'} />
                <InfoRow label="CAP / Città / Prov." value={[host.cap, host.citta, host.provincia].filter(Boolean).join(' ') || '—'} />
                {host.note && <div className="md:col-span-2"><InfoRow label="Note" value={host.note} /></div>}
              </dl>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['nomeAzienda', 'Nome azienda'],
                  ['partitaIva', 'P.IVA'],
                  ['codiceFiscale', 'Codice fiscale'],
                  ['telefono', 'Telefono'],
                  ['sitoWeb', 'Sito web'],
                  ['indirizzo', 'Indirizzo'],
                  ['citta', 'Città'],
                  ['provincia', 'Provincia'],
                  ['cap', 'CAP'],
                  ['regione', 'Regione'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="label">{label}</label>
                    <input
                      type="text"
                      value={form[k] ?? ''}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="input"
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="label">Note interne</label>
                  <textarea
                    rows={2}
                    value={form.note ?? ''}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Abbonamento */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-500" /> Abbonamento
              </h2>
              <div className="flex gap-2">
                <button onClick={cambiaPiano} className="btn-secondary text-sm">Cambia piano</button>
                <button onClick={estendiAbbonamento} className="btn-secondary text-sm">Estendi</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoRow label="Piano" value={PIANO_LABEL[host.piano] ?? host.piano} />
              <InfoRow label="MRR" value={`€${host.mrr}`} />
              <InfoRow label="Inizio" value={host.dataInizioAbb ? format(new Date(host.dataInizioAbb), 'd MMM yyyy', { locale: it }) : '—'} />
              <InfoRow label="Scadenza" value={host.dataFineAbb ? format(new Date(host.dataFineAbb), 'd MMM yyyy', { locale: it }) : '—'} />
            </div>
            {host.abbonamenti.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Storico</p>
                <div className="space-y-1.5">
                  {host.abbonamenti.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${STATO_CLS[a.stato] ?? 'bg-gray-100 text-gray-500'}`}>{a.stato}</span>
                      <span className="text-gray-600">{PIANO_LABEL[a.piano]?.split(' · ')[0] ?? a.piano}</span>
                      <span className="text-gray-400 ml-auto">
                        {format(new Date(a.dataInizio), 'd MMM yy', { locale: it })}
                        {a.dataFine ? ` → ${format(new Date(a.dataFine), 'd MMM yy', { locale: it })}` : ' → in corso'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Moduli */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-500" /> Moduli ({Object.values(moduli).filter(Boolean).length} attivi)
              </h2>
              {moduliDirty && (
                <button onClick={salvaModuli} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salva override
                </button>
              )}
            </div>
            <div className="space-y-4">
              {Object.entries(moduliByCat).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {cat === 'base' ? 'Base' : cat === 'operativo' ? 'Operativo' : cat === 'avanzato' ? 'Avanzato' : 'Integrazioni'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((m) => {
                      const on = moduli[m.id] === true
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleModulo(m.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                            on
                              ? 'border-brand-300 bg-brand-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            on ? 'bg-brand-500 border-brand-500' : 'border-gray-300'
                          }`}>
                            {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{m.nome}</p>
                            <p className="text-[10px] text-gray-500 truncate">{m.descrizione}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Colonna destra 1/3 ────────────────────────────── */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Statistiche</h3>
            <div className="space-y-2 text-sm">
              <StatRow label="Prenotazioni totali" value={host._count.prenotazioni} />
              <StatRow label="Strutture" value={host._count.strutture} />
              <StatRow label="Fatture emesse" value={host._count.fatture} />
              <StatRow label="Ticket aperti" value={host._count.tickets} />
              <StatRow label="Revenue totale" value={`€${host.revenueTotale.toFixed(0)}`} />
            </div>
          </div>

          {/* Strutture */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Strutture
            </h3>
            {host.strutture.length === 0 ? (
              <p className="text-sm text-gray-400">Nessuna struttura</p>
            ) : (
              <div className="space-y-1.5">
                {host.strutture.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${s.attiva ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <p className="flex-1 text-gray-800 truncate">{s.nome}</p>
                    <span className="text-xs text-gray-400">{s._count.unita}u · {s._count.prenotazioni}p</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DPA */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" /> DPA (Art. 28)
            </h3>
            {host.dpaAccettato && host.dpaAccettazioni[0] ? (
              <div className="text-sm">
                <p className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-4 h-4" /> Firmato v{host.dpaAccettazioni[0].versione}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(host.dpaAccettazioni[0].accettatoAt), 'd MMM yyyy HH:mm', { locale: it })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Non ancora firmato
              </p>
            )}
          </div>

          {/* GDPR */}
          {host.richiesteCancellazione.length > 0 && (
            <div className="card border-red-200 bg-red-50/30">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">GDPR pendenti</h3>
              {host.richiesteCancellazione.map((r) => (
                <div key={r.id} className="text-sm">
                  <p className="text-gray-800">{r.tipo} · <span className="text-red-600">{r.stato}</span></p>
                  {r.scadenzaAt && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Scad: {format(new Date(r.scadenzaAt), 'd MMM', { locale: it })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Activity */}
          <div className="card">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Attività recente
            </h3>
            {audit.length === 0 ? (
              <p className="text-sm text-gray-400">Nessuna attività</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {audit.map((a) => (
                  <div key={a.id} className="border-l-2 border-brand-500/30 pl-2.5 py-0.5">
                    <p className="text-xs font-semibold text-gray-700">{a.azione}</p>
                    {a.dettagli && <p className="text-[11px] text-gray-500 line-clamp-2">{a.dettagli}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {format(new Date(a.createdAt), 'd MMM HH:mm', { locale: it })}
                      {a.userEmail && ` · ${a.userEmail}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`text-sm text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}
