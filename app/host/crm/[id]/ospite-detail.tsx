'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Crown, Ban, Mail, Phone, Globe, Tag, Star, Pencil,
  Save, X, Loader2, Trash2, AlertTriangle, ChevronRight,
  User, Calendar, Euro, StickyNote, Heart, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Ospite = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  nazionalita: string | null
  lingua: string | null
  note: string | null
  preferenze: string | null
  vip: boolean
  blacklist: boolean
  blacklistMotivo: string | null
  tags: string[]
  numSoggiorni: number
  totaleSpeso: number
  dataUltimoSoggiorno: string | null
  createdAt: string
}

type Prenotazione = {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  dataArrivo: string
  dataPartenza: string | null
  stato: string
  numOspiti: number
  prezzoTotale: number | null
  unitaNome: string | null
  strutturaNome: string | null
}

const STATI_PREN: Record<string, { label: string; cls: string }> = {
  RICHIESTA:   { label: 'Richiesta',  cls: 'text-yellow-700 bg-yellow-50' },
  CONFERMATA:  { label: 'Confermata', cls: 'text-green-700 bg-green-50' },
  COMPLETATA:  { label: 'Completata', cls: 'text-gray-500 bg-gray-100' },
  CANCELLATA:  { label: 'Cancellata', cls: 'text-red-600 bg-red-50' },
  NO_SHOW:     { label: 'No show',    cls: 'text-orange-600 bg-orange-50' },
}

// ─── SPA Card ──────────────────────────────────────────────────────────────────

type SpaProfile = {
  ospite: {
    id: string
    spaAllergie: string | null
    spaNote: string | null
    spaPreferenzeTerapistaId: string | null
    spaPreferenzeTerapista: { id: string; nome: string; cognome: string; colore: string } | null
    spaTrattamentiPreferiti: string[]
  }
  appuntamenti: {
    id: string
    dataOra: string
    durata: number
    stato: string
    prezzoTotale: number | null
    trattamento: { nome: string } | null
    percorso: { nome: string } | null
    terapista: { nome: string; cognome: string } | null
  }[]
  stats: { totaleAppuntamenti: number; totaleSpeso: number }
  trattamentiFrequenti: { trattamento: { id: string; nome: string } | null; _count: { id: number } }[]
}

const STATO_SPA_LABEL: Record<string, string> = {
  PRENOTATO: 'Prenotato', CONFERMATO: 'Confermato', IN_CORSO: 'In corso',
  COMPLETATO: 'Completato', ANNULLATO: 'Annullato', NO_SHOW: 'No show',
}
const STATO_SPA_CLS: Record<string, string> = {
  PRENOTATO: 'bg-yellow-50 text-yellow-700',
  CONFERMATO: 'bg-green-50 text-green-700',
  IN_CORSO: 'bg-blue-50 text-blue-700',
  COMPLETATO: 'bg-gray-100 text-gray-500',
  ANNULLATO: 'bg-red-50 text-red-600',
  NO_SHOW: 'bg-orange-50 text-orange-600',
}

function OspiteSpaCard({ ospiteId }: { ospiteId: string }) {
  const [profile, setProfile] = useState<SpaProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ spaAllergie: '', spaNote: '', spaPreferenzeTerapistaId: '', spaTrattamentiPreferiti: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/host/spa/ospite-preferenze/${ospiteId}`)
    if (res.ok) {
      const data: SpaProfile = await res.json()
      setProfile(data)
      setForm({
        spaAllergie: data.ospite.spaAllergie ?? '',
        spaNote: data.ospite.spaNote ?? '',
        spaPreferenzeTerapistaId: data.ospite.spaPreferenzeTerapistaId ?? '',
        spaTrattamentiPreferiti: data.ospite.spaTrattamentiPreferiti.join(', '),
      })
    }
    setLoading(false)
  }, [ospiteId])

  const toggle = () => {
    if (!open && !profile) load()
    setOpen(o => !o)
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/host/spa/ospite-preferenze/${ospiteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spaAllergie: form.spaAllergie || null,
        spaNote: form.spaNote || null,
        spaPreferenzeTerapistaId: form.spaPreferenzeTerapistaId || null,
        spaTrattamentiPreferiti: form.spaTrattamentiPreferiti.split(',').map(s => s.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      await load()
      setEditMode(false)
    }
    setSaving(false)
  }

  return (
    <div className="card">
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between group">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          Profilo SPA
        </h2>
        <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {loading && <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>}

          {!loading && profile && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-violet-50 p-3 text-center">
                  <p className="text-2xl font-extrabold text-violet-700">{profile.stats.totaleAppuntamenti}</p>
                  <p className="text-xs text-violet-500 mt-0.5">Trattamenti SPA</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-2xl font-extrabold text-green-700">€{profile.stats.totaleSpeso.toFixed(0)}</p>
                  <p className="text-xs text-green-600 mt-0.5">Spesa SPA tot.</p>
                </div>
              </div>

              {/* Trattamenti frequenti */}
              {profile.trattamentiFrequenti.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Trattamenti più richiesti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.trattamentiFrequenti.map(tf => tf.trattamento && (
                      <span key={tf.trattamento.id} className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
                        {tf.trattamento.nome} ×{tf._count.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Terapista preferito */}
              {profile.ospite.spaPreferenzeTerapista && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: profile.ospite.spaPreferenzeTerapista.colore }} />
                  <span className="text-xs text-gray-600">Terapista preferito:</span>
                  <span className="text-xs font-semibold text-gray-800">{profile.ospite.spaPreferenzeTerapista.nome} {profile.ospite.spaPreferenzeTerapista.cognome}</span>
                </div>
              )}

              {/* Preferenze / Note / Allergie — view or edit */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500">Preferenze SPA</p>
                {!editMode ? (
                  <button type="button" onClick={() => setEditMode(true)} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800">
                    <Pencil className="w-3 h-3" /> Modifica
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1 text-xs text-white bg-violet-600 hover:bg-violet-700 px-2 py-1 rounded-lg">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salva
                    </button>
                    <button type="button" onClick={() => setEditMode(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Allergie / controindicazioni</label>
                    <textarea rows={2} value={form.spaAllergie} onChange={e => setForm(f => ({ ...f, spaAllergie: e.target.value }))}
                      placeholder="es. allergia al lattice, dolori lombari…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Note SPA</label>
                    <textarea rows={2} value={form.spaNote} onChange={e => setForm(f => ({ ...f, spaNote: e.target.value }))}
                      placeholder="es. preferisce musica rilassante, temperatura alta…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Trattamenti preferiti (separati da virgola)</label>
                    <input type="text" value={form.spaTrattamentiPreferiti} onChange={e => setForm(f => ({ ...f, spaTrattamentiPreferiti: e.target.value }))}
                      placeholder="es. massaggio hot stone, bagno di vapore…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  {profile.ospite.spaAllergie ? (
                    <div className="flex gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-red-700 text-xs">{profile.ospite.spaAllergie}</span>
                    </div>
                  ) : null}
                  {profile.ospite.spaNote ? (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{profile.ospite.spaNote}</p>
                  ) : null}
                  {profile.ospite.spaTrattamentiPreferiti.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {profile.ospite.spaTrattamentiPreferiti.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">{t}</span>
                      ))}
                    </div>
                  )}
                  {!profile.ospite.spaAllergie && !profile.ospite.spaNote && profile.ospite.spaTrattamentiPreferiti.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Nessuna preferenza SPA registrata</p>
                  )}
                </div>
              )}

              {/* Ultimi appuntamenti SPA */}
              {profile.appuntamenti.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Ultimi appuntamenti SPA</p>
                  <div className="space-y-1.5">
                    {profile.appuntamenti.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-gray-50 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-700">{a.trattamento?.nome ?? a.percorso?.nome ?? '—'}</div>
                          <div className="text-gray-400">
                            {format(new Date(a.dataOra), 'd MMM yyyy HH:mm', { locale: it })}
                            {a.terapista && ` · ${a.terapista.nome} ${a.terapista.cognome}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.prezzoTotale != null && <span className="font-semibold text-green-600">€{a.prezzoTotale.toFixed(0)}</span>}
                          <span className={cn('px-1.5 py-0.5 rounded-full font-medium', STATO_SPA_CLS[a.stato])}>{STATO_SPA_LABEL[a.stato] ?? a.stato}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principale ─────────────────────────────────────────────────────

export default function OspiteDetail({
  ospite: ospiteIniziale,
  prenotazioni,
}: {
  ospite: Ospite
  prenotazioni: Prenotazione[]
}) {
  const [ospite, setOspite] = useState<Ospite>(ospiteIniziale)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ ...ospiteIniziale, tagsStr: ospiteIniziale.tags.join(', ') })
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')
  const [confirmBlacklist, setConfirmBlacklist] = useState(false)
  const [blacklistMotivo, setBlacklistMotivo] = useState(ospiteIniziale.blacklistMotivo ?? '')
  const [deletingConfirm, setDeletingConfirm] = useState(false)
  const router = useRouter()

  // Statistiche prenotazioni
  const prenCompletate = prenotazioni.filter(p => p.stato === 'COMPLETATA')
  const totaleCalcolato = prenCompletate.reduce((acc, p) => acc + (p.prezzoTotale ?? 0), 0)

  async function handleSave() {
    setSaving(true); setErrore('')
    const res = await fetch(`/api/host/crm/${ospite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        cognome: form.cognome,
        telefono: form.telefono,
        nazionalita: form.nazionalita,
        lingua: form.lingua,
        note: form.note,
        preferenze: form.preferenze,
        vip: form.vip,
        tags: form.tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      const ag = await res.json()
      setOspite(o => ({ ...o, ...ag, dataUltimoSoggiorno: ag.dataUltimoSoggiorno ?? null }))
      setEditMode(false)
    } else {
      const j = await res.json(); setErrore(j.error || 'Errore')
    }
    setSaving(false)
  }

  async function toggleVip() {
    const res = await fetch(`/api/host/crm/${ospite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vip: !ospite.vip }),
    })
    if (res.ok) setOspite(o => ({ ...o, vip: !o.vip }))
  }

  async function handleBlacklist() {
    const res = await fetch(`/api/host/crm/${ospite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blacklist: !ospite.blacklist,
        blacklistMotivo: !ospite.blacklist ? blacklistMotivo : null,
      }),
    })
    if (res.ok) {
      setOspite(o => ({ ...o, blacklist: !o.blacklist, blacklistMotivo: !o.blacklist ? blacklistMotivo : null }))
      setConfirmBlacklist(false)
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/host/crm/${ospite.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/host/crm')
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* ── Colonna sinistra ──────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Card profilo */}
        <div className={`card border-2 ${ospite.blacklist ? 'border-red-200' : ospite.vip ? 'border-yellow-200' : 'border-transparent'}`}>
          {/* Avatar grande */}
          <div className="flex flex-col items-center py-4 border-b border-gray-100 mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-extrabold mb-2 ${
              ospite.blacklist ? 'bg-red-100 text-red-600' : ospite.vip ? 'bg-yellow-100 text-yellow-700' : 'bg-brand-500/10 text-brand-600'
            }`}>
              {ospite.nome[0]}{ospite.cognome[0]}
            </div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
              {ospite.cognome} {ospite.nome}
              {ospite.vip && <Crown className="w-4 h-4 text-yellow-500" />}
              {ospite.blacklist && <Ban className="w-4 h-4 text-red-500" />}
            </h2>
            <p className="text-sm text-gray-500">{ospite.email}</p>
            {ospite.telefono && <p className="text-sm text-gray-500">{ospite.telefono}</p>}
            {ospite.nazionalita && <p className="text-xs text-gray-400 mt-0.5">{ospite.nazionalita}</p>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-xl font-extrabold text-brand-600">{ospite.numSoggiorni || prenCompletate.length}</p>
              <p className="text-xs text-gray-500">Soggiorni</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-xl font-extrabold text-green-600">
                €{(ospite.totaleSpeso || totaleCalcolato).toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">Spesa totale</p>
            </div>
          </div>
          {ospite.dataUltimoSoggiorno && (
            <p className="text-xs text-center text-gray-400 mb-4">
              Ultimo soggiorno: {format(new Date(ospite.dataUltimoSoggiorno), 'd MMMM yyyy', { locale: it })}
            </p>
          )}

          {/* Azioni rapide */}
          <div className="flex gap-2">
            <button onClick={toggleVip} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              ospite.vip ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
              <Crown className="w-4 h-4" /> {ospite.vip ? 'VIP' : 'Segnala VIP'}
            </button>
            <button
              onClick={() => setConfirmBlacklist(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                ospite.blacklist ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Ban className="w-4 h-4" /> {ospite.blacklist ? 'In blacklist' : 'Blacklist'}
            </button>
          </div>
        </div>

        {/* Tag */}
        {ospite.tags.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" /> Tag
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ospite.tags.map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-brand-500/10 text-brand-700 font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferenze */}
        {ospite.preferenze && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" /> Preferenze
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ospite.preferenze}</p>
          </div>
        )}

        {/* Note */}
        {ospite.note && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-yellow-400" /> Note interne
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ospite.note}</p>
          </div>
        )}

        {/* Blacklist motivo */}
        {ospite.blacklist && ospite.blacklistMotivo && (
          <div className="card border border-red-200 bg-red-50">
            <h3 className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Motivo blacklist
            </h3>
            <p className="text-sm text-red-600">{ospite.blacklistMotivo}</p>
          </div>
        )}

        {/* Elimina */}
        <div className="card">
          {!deletingConfirm ? (
            <button onClick={() => setDeletingConfirm(true)} className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 py-1">
              <Trash2 className="w-4 h-4" /> Elimina ospite
            </button>
          ) : (
            <div className="text-sm">
              <p className="text-gray-700 mb-3">Confermi l'eliminazione? I dati non saranno recuperabili.</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600">Elimina</button>
                <button onClick={() => setDeletingConfirm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Annulla</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Colonna destra ────────────────────────────────────────────────── */}
      <div className="xl:col-span-2 space-y-5">
        {/* Modifica profilo */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Dati anagrafici</h2>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-300">
                <Pencil className="w-4 h-4" /> Modifica
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 btn-primary text-sm py-1.5 px-3">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salva
                </button>
                <button onClick={() => { setEditMode(false); setForm({ ...ospite, tagsStr: ospite.tags.join(', ') }) }} className="btn-secondary text-sm py-1.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {errore && <p className="text-sm text-red-600 mb-3">{errore}</p>}

          {editMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome *</label>
                  <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Cognome *</label>
                  <input type="text" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefono</label>
                  <input type="tel" value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="label">Nazionalità</label>
                  <input type="text" value={form.nazionalita ?? ''} onChange={e => setForm(f => ({ ...f, nazionalita: e.target.value }))} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Preferenze</label>
                <textarea rows={2} value={form.preferenze ?? ''} onChange={e => setForm(f => ({ ...f, preferenze: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Note interne</label>
                <textarea rows={2} value={form.note ?? ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Tag (separati da virgola)</label>
                <input type="text" value={form.tagsStr} onChange={e => setForm(f => ({ ...f, tagsStr: e.target.value }))} className="input" placeholder="fedele, business, famiglia" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vip-edit" checked={form.vip} onChange={e => setForm(f => ({ ...f, vip: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
                <label htmlFor="vip-edit" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Crown className="w-4 h-4 text-yellow-500" /> Ospite VIP
                </label>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { label: 'Email', val: ospite.email, icon: <Mail className="w-3.5 h-3.5" /> },
                { label: 'Telefono', val: ospite.telefono, icon: <Phone className="w-3.5 h-3.5" /> },
                { label: 'Nazionalità', val: ospite.nazionalita, icon: <Globe className="w-3.5 h-3.5" /> },
                { label: 'Lingua', val: ospite.lingua?.toUpperCase(), icon: <Globe className="w-3.5 h-3.5" /> },
                { label: 'Cliente dal', val: format(new Date(ospite.createdAt), 'd MMMM yyyy', { locale: it }), icon: <Calendar className="w-3.5 h-3.5" /> },
              ].map(item => (
                item.val ? (
                  <div key={item.label}>
                    <dt className="text-gray-400 flex items-center gap-1">{item.icon} {item.label}</dt>
                    <dd className="font-medium text-gray-800 mt-0.5">{item.val}</dd>
                  </div>
                ) : null
              ))}
            </dl>
          )}
        </div>

        {/* Storico prenotazioni */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-500" />
            Storico soggiorni ({prenotazioni.length})
          </h2>
          {prenotazioni.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">Nessuna prenotazione registrata</p>
          ) : (
            <div className="space-y-2">
              {prenotazioni.map(p => {
                const s = STATI_PREN[p.stato] ?? STATI_PREN.RICHIESTA
                return (
                  <Link
                    key={p.id}
                    href={`/host/prenotazioni/${p.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-brand-500/8 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-600">
                          {format(new Date(p.dataArrivo), 'd MMM yyyy', { locale: it })}
                          {p.dataPartenza && ` → ${format(new Date(p.dataPartenza), 'd MMM yyyy', { locale: it })}`}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[p.strutturaNome, p.unitaNome].filter(Boolean).join(' › ')}
                        {' · '}{p.numOspiti} osp.
                      </p>
                    </div>
                    {p.prezzoTotale != null && (
                      <span className="text-sm font-bold text-green-600 shrink-0">€{p.prezzoTotale.toFixed(2)}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
        {/* SPA Profile */}
        <OspiteSpaCard ospiteId={ospite.id} />
      </div>

      {/* Modal blacklist */}
      {confirmBlacklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {ospite.blacklist ? 'Rimuovi dalla blacklist' : 'Aggiungi alla blacklist'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {ospite.blacklist
                ? 'L\'ospite potrà prenotare nuovamente.'
                : 'L\'ospite sarà segnalato come indesiderato.'}
            </p>
            {!ospite.blacklist && (
              <div className="mb-4">
                <label className="label">Motivo (opzionale)</label>
                <textarea
                  rows={2}
                  value={blacklistMotivo}
                  onChange={e => setBlacklistMotivo(e.target.value)}
                  className="input"
                  placeholder="es. danni alla struttura, comportamento scorretto…"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleBlacklist} className={`flex-1 py-2 rounded-lg font-medium text-white ${ospite.blacklist ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                Conferma
              </button>
              <button onClick={() => setConfirmBlacklist(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
