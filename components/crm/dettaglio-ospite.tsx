'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Crown, Ban, Mail, Phone, Globe, Tag, Pencil, Save, X, Loader2,
  Trash2, AlertTriangle, User, Calendar, Euro, StickyNote, Heart,
  Sparkles, GitMerge, MessageSquare, TrendingUp, Award, BedDouble,
  ChevronRight, Languages,
} from 'lucide-react'
import MergeDialog from './merge-dialog'

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
  spaAllergie?: string | null
  spaNote?: string | null
  spaTrattamentiPreferiti?: string[]
  createdAt: string
  updatedAt: string
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
  unita: { nome: string } | null
  struttura: { nome: string } | null
}

type Messaggio = {
  id: string
  mittente: string
  testo: string
  canale: string | null
  createdAt: string
  chat: { prenotazioneId: string } | null
}

type SpaData = {
  terapistaPreferito: { nome: string; cognome: string } | null
  trattamentiPreferiti: string[]
  appuntamenti: Array<{ id: string; dataOra: string; trattamentoNome: string | null }>
}

type Statistiche = {
  spesaMedia: number
  primaVisita: string | null
  segmenti: string[]
}

type Payload = {
  ospite: Ospite
  prenotazioni: Prenotazione[]
  statistiche: Statistiche
  messaggi: Messaggio[]
  spa: SpaData
}

const STATI_PREN: Record<string, { label: string; cls: string }> = {
  RICHIESTA:  { label: 'Richiesta',  cls: 'text-yellow-700 bg-yellow-50' },
  CONFERMATA: { label: 'Confermata', cls: 'text-green-700 bg-green-50' },
  COMPLETATA: { label: 'Completata', cls: 'text-gray-500 bg-gray-100' },
  CANCELLATA: { label: 'Cancellata', cls: 'text-red-600 bg-red-50' },
  NO_SHOW:    { label: 'No show',    cls: 'text-orange-600 bg-orange-50' },
}

const SEGMENTO_STYLE: Record<string, string> = {
  Nuovo: 'bg-green-100 text-green-700',
  Ricorrente: 'bg-blue-100 text-blue-700',
  Fedele: 'bg-purple-100 text-purple-700',
  'Alto spendente': 'bg-yellow-100 text-yellow-700',
  Dormiente: 'bg-gray-100 text-gray-600',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DettaglioOspite({ ospiteId }: { ospiteId: string }) {
  const router = useRouter()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')
  const [mergeOpen, setMergeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErrore('')
    const res = await fetch(`/api/host/crm/${ospiteId}`)
    if (res.ok) setData(await res.json())
    else setErrore('Errore caricamento scheda')
    setLoading(false)
  }, [ospiteId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (errore || !data) {
    return <div className="card text-red-600">{errore || 'Non trovato'}</div>
  }

  const { ospite, prenotazioni, statistiche, messaggi, spa } = data
  const hasSpa = spa.appuntamenti.length > 0 || spa.trattamentiPreferiti.length > 0 || spa.terapistaPreferito !== null

  async function handleDelete() {
    const res = await fetch(`/api/host/crm/${ospiteId}`, { method: 'DELETE' })
    if (res.ok) router.push('/host/crm')
  }

  return (
    <div className="space-y-6">
      {/* Header azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            {ospite.cognome} {ospite.nome}
            {ospite.vip && <Crown className="w-5 h-5 text-yellow-500" />}
            {ospite.blacklist && <Ban className="w-5 h-5 text-red-500" />}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{ospite.email}{ospite.telefono ? ` · ${ospite.telefono}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMergeOpen(true)}
            className="btn-secondary flex items-center gap-2"
            title="Cerca duplicati e unisci"
          >
            <GitMerge className="w-4 h-4" /> Trova duplicati
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium flex items-center gap-2"
            title="Anonimizza scheda (GDPR)"
          >
            <Trash2 className="w-4 h-4" /> Anonimizza
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonna sinistra (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          <AnagraficaCard ospite={ospite} onSaved={load} />
          <NotePreferenzeCard ospite={ospite} onSaved={load} />
          <StoricoSoggiorniCard prenotazioni={prenotazioni} />
          <ComunicazioniCard messaggi={messaggi} />
        </div>

        {/* ── Colonna destra (1/3) ── */}
        <div className="space-y-6">
          <StatisticheCard ospite={ospite} statistiche={statistiche} />
          <SegmentiCard segmenti={statistiche.segmenti} />
          {hasSpa && <SpaCard spa={spa} />}
        </div>
      </div>

      {mergeOpen && (
        <MergeDialog
          ospiteCorrenteId={ospiteId}
          onClose={() => setMergeOpen(false)}
          onMerged={(keepId) => {
            if (keepId === ospiteId) load()
            else router.push(`/host/crm/${keepId}`)
          }}
        />
      )}

      {deleteOpen && (
        <ConfirmDeleteDialog
          ospite={ospite}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

// ─── Anagrafica (editable) ───────────────────────────────────────────────────

function AnagraficaCard({ ospite, onSaved }: { ospite: Ospite; onSaved: () => void }) {
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({
    nome: ospite.nome,
    cognome: ospite.cognome,
    email: ospite.email,
    telefono: ospite.telefono ?? '',
    nazionalita: ospite.nazionalita ?? '',
    lingua: ospite.lingua ?? 'it',
    vip: ospite.vip,
    blacklist: ospite.blacklist,
    blacklistMotivo: ospite.blacklistMotivo ?? '',
    tags: ospite.tags.join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  async function save() {
    setSaving(true); setErrore('')
    const res = await fetch(`/api/host/crm/${ospite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        cognome: form.cognome,
        telefono: form.telefono || null,
        nazionalita: form.nazionalita || null,
        lingua: form.lingua || null,
        vip: form.vip,
        blacklist: form.blacklist,
        blacklistMotivo: form.blacklistMotivo || null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      setEdit(false)
      onSaved()
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore salvataggio')
    }
    setSaving(false)
  }

  return (
    <div className="card">
      <CardHeader icon={<User className="w-5 h-5 text-brand-500" />} title="Anagrafica"
        action={
          !edit ? (
            <button onClick={() => setEdit(true)} className="text-gray-400 hover:text-brand-500 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button onClick={() => setEdit(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        }
      />

      {errore && <p className="text-sm text-red-600 mb-3">{errore}</p>}

      {!edit ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={ospite.email} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefono" value={ospite.telefono ?? '—'} />
          <InfoRow icon={<Globe className="w-4 h-4" />} label="Nazionalità" value={ospite.nazionalita ?? '—'} />
          <InfoRow icon={<Languages className="w-4 h-4" />} label="Lingua" value={ospite.lingua?.toUpperCase() ?? 'IT'} />
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Tag className="w-3.5 h-3.5" /> Tag
            </div>
            {ospite.tags.length === 0 ? (
              <p className="text-gray-400 text-sm">Nessun tag</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {ospite.tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-700 font-medium">{t}</span>
                ))}
              </div>
            )}
          </div>
          {ospite.blacklist && ospite.blacklistMotivo && (
            <div className="md:col-span-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
              <span className="font-semibold">Blacklist:</span> {ospite.blacklistMotivo}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cognome</label>
              <input className="input" value={form.cognome} onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono</label>
              <input className="input" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nazionalità</label>
              <input className="input" value={form.nazionalita} onChange={(e) => setForm((f) => ({ ...f, nazionalita: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Lingua (it/en/fr/de)</label>
            <input className="input" value={form.lingua} onChange={(e) => setForm((f) => ({ ...f, lingua: e.target.value }))} />
          </div>
          <div>
            <label className="label">Tag (separati da virgola)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.vip} onChange={(e) => setForm((f) => ({ ...f, vip: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" /> VIP
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.blacklist} onChange={(e) => setForm((f) => ({ ...f, blacklist: e.target.checked }))} className="w-4 h-4 accent-red-500" />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Ban className="w-4 h-4 text-red-500" /> Blacklist
              </span>
            </label>
          </div>
          {form.blacklist && (
            <div>
              <label className="label">Motivo blacklist</label>
              <input className="input" value={form.blacklistMotivo} onChange={(e) => setForm((f) => ({ ...f, blacklistMotivo: e.target.value }))} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Note + preferenze (editable) ────────────────────────────────────────────

function NotePreferenzeCard({ ospite, onSaved }: { ospite: Ospite; onSaved: () => void }) {
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({
    note: ospite.note ?? '',
    preferenze: ospite.preferenze ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/host/crm/${ospite.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note: form.note || null,
        preferenze: form.preferenze || null,
      }),
    })
    if (res.ok) {
      setEdit(false)
      onSaved()
    }
    setSaving(false)
  }

  return (
    <div className="card">
      <CardHeader icon={<StickyNote className="w-5 h-5 text-amber-500" />} title="Note e preferenze"
        action={
          !edit ? (
            <button onClick={() => setEdit(true)} className="text-gray-400 hover:text-brand-500 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={save} disabled={saving} className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
              <button onClick={() => setEdit(false)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        }
      />
      {!edit ? (
        <div className="space-y-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Heart className="w-3.5 h-3.5" /> Preferenze</p>
            <p className="text-gray-700 whitespace-pre-wrap">{ospite.preferenze || <span className="text-gray-400 italic">Nessuna preferenza</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><StickyNote className="w-3.5 h-3.5" /> Note interne</p>
            <p className="text-gray-700 whitespace-pre-wrap">{ospite.note || <span className="text-gray-400 italic">Nessuna nota</span>}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          <div>
            <label className="label">Preferenze (visibili allo staff)</label>
            <textarea rows={3} className="input" value={form.preferenze} onChange={(e) => setForm((f) => ({ ...f, preferenze: e.target.value }))} />
          </div>
          <div>
            <label className="label">Note interne</label>
            <textarea rows={3} className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Storico soggiorni (timeline) ────────────────────────────────────────────

function StoricoSoggiorniCard({ prenotazioni }: { prenotazioni: Prenotazione[] }) {
  return (
    <div className="card">
      <CardHeader icon={<BedDouble className="w-5 h-5 text-blue-500" />} title={`Storico soggiorni (${prenotazioni.length})`} />
      {prenotazioni.length === 0 ? (
        <p className="text-sm text-gray-400 mt-4">Nessun soggiorno registrato</p>
      ) : (
        <div className="mt-4 divide-y divide-gray-50">
          {prenotazioni.map((p) => {
            const stato = STATI_PREN[p.stato] ?? { label: p.stato, cls: 'text-gray-600 bg-gray-100' }
            return (
              <Link
                key={p.id}
                href={`/host/prenotazioni/${p.id}`}
                className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-center shrink-0">
                    <p className="text-xs text-gray-400 uppercase">{format(new Date(p.dataArrivo), 'MMM', { locale: it })}</p>
                    <p className="text-base font-bold text-gray-900 leading-none">{format(new Date(p.dataArrivo), 'd')}</p>
                    <p className="text-[10px] text-gray-400">{format(new Date(p.dataArrivo), 'yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {p.struttura?.nome ?? 'Struttura'}{p.unita?.nome ? ` · ${p.unita.nome}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.numOspiti} ospit{p.numOspiti === 1 ? 'e' : 'i'}
                      {p.dataPartenza ? ` · ${Math.max(1, Math.ceil((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))} notti` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {p.prezzoTotale !== null && (
                    <span className="text-sm font-semibold text-gray-700">€{p.prezzoTotale.toFixed(2)}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${stato.cls}`}>{stato.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Comunicazioni (chat messaggi) ───────────────────────────────────────────

function ComunicazioniCard({ messaggi }: { messaggi: Messaggio[] }) {
  if (messaggi.length === 0) return null
  return (
    <div className="card">
      <CardHeader icon={<MessageSquare className="w-5 h-5 text-green-500" />} title={`Ultime comunicazioni (${messaggi.length})`} />
      <div className="mt-4 space-y-3">
        {messaggi.map((m) => (
          <div key={m.id} className="border-l-2 border-gray-200 pl-3 py-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span className={`font-semibold ${m.mittente === 'OSPITE' ? 'text-blue-600' : 'text-brand-600'}`}>
                {m.mittente === 'OSPITE' ? 'Ospite' : 'Struttura'}
              </span>
              {m.canale && <span className="text-gray-400">· {m.canale}</span>}
              <span className="text-gray-400">· {format(new Date(m.createdAt), 'd MMM HH:mm', { locale: it })}</span>
              {m.chat?.prenotazioneId && (
                <Link href={`/host/prenotazioni/${m.chat.prenotazioneId}`} className="ml-auto text-brand-500 hover:underline">
                  Vai alla chat
                </Link>
              )}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{m.testo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Statistiche (big numbers) ───────────────────────────────────────────────

function StatisticheCard({ ospite, statistiche }: { ospite: Ospite; statistiche: Statistiche }) {
  return (
    <div className="card">
      <CardHeader icon={<TrendingUp className="w-5 h-5 text-violet-500" />} title="Statistiche" />
      <div className="mt-4 space-y-3">
        <StatBox label="Soggiorni totali" value={String(ospite.numSoggiorni)} icon={<BedDouble className="w-4 h-4" />} />
        <StatBox label="Totale speso" value={`€${ospite.totaleSpeso.toFixed(2)}`} icon={<Euro className="w-4 h-4" />} />
        <StatBox label="Spesa media" value={`€${statistiche.spesaMedia.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4" />} />
        {ospite.dataUltimoSoggiorno && (
          <StatBox
            label="Ultimo soggiorno"
            value={format(new Date(ospite.dataUltimoSoggiorno), 'd MMM yyyy', { locale: it })}
            icon={<Calendar className="w-4 h-4" />}
          />
        )}
        {statistiche.primaVisita && (
          <StatBox
            label="Prima visita"
            value={format(new Date(statistiche.primaVisita), 'd MMM yyyy', { locale: it })}
            icon={<Award className="w-4 h-4" />}
            subtle
          />
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, icon, subtle = false }: { label: string; value: string; icon: React.ReactNode; subtle?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg ${subtle ? 'bg-gray-50' : 'bg-brand-500/5'}`}>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className={subtle ? 'text-gray-400' : 'text-brand-500'}>{icon}</span>
        {label}
      </div>
      <span className={`text-sm font-bold ${subtle ? 'text-gray-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

// ─── Segmenti (auto-calcolati) ───────────────────────────────────────────────

function SegmentiCard({ segmenti }: { segmenti: string[] }) {
  if (segmenti.length === 0) return null
  return (
    <div className="card">
      <CardHeader icon={<Award className="w-5 h-5 text-amber-500" />} title="Segmenti" />
      <div className="mt-4 flex flex-wrap gap-1.5">
        {segmenti.map((s) => (
          <span key={s} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SEGMENTO_STYLE[s] ?? 'bg-gray-100 text-gray-600'}`}>
            {s}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">I segmenti vengono calcolati automaticamente in base allo storico.</p>
    </div>
  )
}

// ─── SPA ─────────────────────────────────────────────────────────────────────

function SpaCard({ spa }: { spa: SpaData }) {
  return (
    <div className="card">
      <CardHeader icon={<Sparkles className="w-5 h-5 text-violet-500" />} title="Profilo SPA" />
      <div className="mt-4 space-y-3 text-sm">
        {spa.terapistaPreferito && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Terapista preferito</p>
            <p className="font-semibold text-gray-800">{spa.terapistaPreferito.nome} {spa.terapistaPreferito.cognome}</p>
          </div>
        )}
        {spa.trattamentiPreferiti.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Trattamenti preferiti</p>
            <div className="flex flex-wrap gap-1">
              {spa.trattamentiPreferiti.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-medium">{t}</span>
              ))}
            </div>
          </div>
        )}
        {spa.appuntamenti.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Appuntamenti recenti</p>
            <div className="space-y-1.5">
              {spa.appuntamenti.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0 text-xs">
                  <span className="text-gray-700">{a.trattamentoNome ?? 'Trattamento'}</span>
                  <span className="text-gray-400">{format(new Date(a.dataOra), 'd MMM yyyy', { locale: it })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CardHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        {icon} {title}
      </h2>
      {action}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
        <span className="text-gray-400">{icon}</span> {label}
      </p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  )
}

// ─── Delete confirm ─────────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  ospite, onClose, onConfirm,
}: {
  ospite: Ospite; onClose: () => void; onConfirm: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [conferma, setConferma] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-red-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Anonimizza scheda CRM</h3>
            <p className="text-sm text-gray-500 mt-1">
              La scheda <strong>{ospite.email}</strong> sarà anonimizzata (GDPR Art. 17).
              Prenotazioni e fatture <strong>non</strong> vengono toccate — sono soggette a
              obblighi fiscali e Alloggiati Web.
            </p>
          </div>
        </div>

        <div>
          <label className="label">Scrivi ANONIMIZZA per confermare</label>
          <input
            type="text"
            value={conferma}
            onChange={(e) => setConferma(e.target.value)}
            className="input"
            placeholder="ANONIMIZZA"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={async () => { setBusy(true); await onConfirm() }}
            disabled={conferma !== 'ANONIMIZZA' || busy}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Anonimizza
          </button>
          <button onClick={onClose} disabled={busy} className="btn-secondary">Annulla</button>
        </div>
      </div>
    </div>
  )
}
