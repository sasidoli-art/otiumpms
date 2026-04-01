'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { Plus, Filter, Clock, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatValuta } from '@/lib/utils'

interface Terapista { id: string; nome: string; cognome: string; colore: string }
interface Cabina { id: string; nome: string }
interface Trattamento { id: string; nome: string; durata: number; prezzo: number; categoria: string }
interface Percorso { id: string; nome: string; durataMinuti: number; prezzo: number }

interface DispoResult {
  terapista: { id: string; nome: string; cognome: string; colore: string; bio: string | null; specializzazioni: string[] }
  disponibile: boolean
  motivo: string | null
  cabineDisponibili: Cabina[]
}

interface Appt {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string | null
  guestTelefono: string | null
  dataOra: string
  durata: number
  prezzoTotale: number | null
  stato: string
  note: string | null
  terapista: Terapista | null
  cabina: Cabina | null
  trattamento: Trattamento | null
  percorso: Percorso | null
}

const STATO_OPTIONS = ['PRENOTATO', 'CONFERMATO', 'IN_CORSO', 'COMPLETATO', 'ANNULLATO', 'NO_SHOW']
const STATO_LABEL: Record<string, string> = {
  PRENOTATO: 'Prenotato', CONFERMATO: 'Confermato', IN_CORSO: 'In corso',
  COMPLETATO: 'Completato', ANNULLATO: 'Annullato', NO_SHOW: 'No show',
}
const STATO_COLOR: Record<string, string> = {
  PRENOTATO: 'bg-yellow-100 text-yellow-800',
  CONFERMATO: 'bg-green-100 text-green-800',
  IN_CORSO: 'bg-blue-100 text-blue-800',
  COMPLETATO: 'bg-gray-100 text-gray-600',
  ANNULLATO: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
}

export default function AppuntamentiBoard() {
  const t = useTranslations('spa.appointments')
  const tc = useTranslations('common')
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [terapisti, setTerapisti] = useState<Terapista[]>([])
  const [cabine, setCabine] = useState<Cabina[]>([])
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([])
  const [percorsi, setPercorsi] = useState<Percorso[]>([])

  // Filters
  const [filtroData, setFiltroData] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [filtroTerapista, setFiltroTerapista] = useState('')

  // Modal
  const [modal, setModal] = useState<'create' | Appt | null>(null)
  const [saving, setSaving] = useState(false)
  const [tipo, setTipo] = useState<'trattamento' | 'percorso'>('trattamento')
  const [form, setForm] = useState({
    guestNome: '', guestCognome: '', guestEmail: '', guestTelefono: '',
    cabinaId: '', terapistaId: '', trattamentoId: '', percorsoId: '',
    dataOra: '', durata: '', prezzoTotale: '', stato: 'CONFERMATO', note: '',
  })

  // Availability check
  const [dispoLoading, setDispoLoading] = useState(false)
  const [dispoRisultati, setDispoRisultati] = useState<DispoResult[] | null>(null)
  const [dispoChecked, setDispoChecked] = useState(false)

  const loadResources = useCallback(async () => {
    const [terRes, cabRes, trRes, percRes] = await Promise.all([
      fetch('/api/host/spa/terapisti'),
      fetch('/api/host/spa/cabine'),
      fetch('/api/host/spa/trattamenti'),
      fetch('/api/host/spa/percorsi'),
    ])
    const [terData, cabData, trData, percData] = await Promise.all([terRes.json(), cabRes.json(), trRes.json(), percRes.json()])
    setTerapisti(Array.isArray(terData) ? terData : [])
    setCabine(Array.isArray(cabData) ? cabData : [])
    setTrattamenti(Array.isArray(trData) ? trData : [])
    setPercorsi(Array.isArray(percData) ? percData : [])
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroData) params.set('data', filtroData)
    if (filtroStato) params.set('stato', filtroStato)
    if (filtroTerapista) params.set('terapistaId', filtroTerapista)
    const res = await fetch(`/api/host/spa/appuntamenti?${params}`)
    const data = await res.json()
    setAppts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filtroData, filtroStato, filtroTerapista])

  useEffect(() => { loadResources() }, [loadResources])
  useEffect(() => { load() }, [load])

  const openCreate = () => {
    const now = new Date()
    now.setSeconds(0, 0)
    // Round to next 30 min
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30)
    const iso = format(now, "yyyy-MM-dd'T'HH:mm")
    setForm({ guestNome: '', guestCognome: '', guestEmail: '', guestTelefono: '', cabinaId: '', terapistaId: '', trattamentoId: trattamenti[0]?.id ?? '', percorsoId: percorsi[0]?.id ?? '', dataOra: iso, durata: String(trattamenti[0]?.durata ?? 60), prezzoTotale: String(trattamenti[0]?.prezzo ?? ''), stato: 'CONFERMATO', note: '' })
    setTipo('trattamento')
    setDispoRisultati(null)
    setDispoChecked(false)
    setModal('create')
  }

  const checkDisponibilita = async () => {
    if (!form.dataOra || !form.durata) return
    setDispoLoading(true)
    setDispoChecked(false)
    const params = new URLSearchParams({ dataOra: form.dataOra, durata: form.durata })
    const res = await fetch(`/api/host/spa/check-disponibilita?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDispoRisultati(data.terapistiDisponibili ?? [])
      setDispoChecked(true)
    }
    setDispoLoading(false)
  }

  const selezionaRisorsa = (terapistaId: string, cabinaId: string) => {
    setForm(f => ({ ...f, terapistaId, cabinaId }))
  }

  // Auto-fill durata/prezzo when trattamento changes
  const onTrattamentoChange = (id: string) => {
    const t = trattamenti.find(t => t.id === id)
    setForm(f => ({ ...f, trattamentoId: id, durata: String(t?.durata ?? f.durata), prezzoTotale: String(t?.prezzo ?? f.prezzoTotale) }))
  }
  const onPercorsoChange = (id: string) => {
    const p = percorsi.find(p => p.id === id)
    setForm(f => ({ ...f, percorsoId: id, durata: String(p?.durataMinuti ?? f.durata), prezzoTotale: String(p?.prezzo ?? f.prezzoTotale) }))
  }

  const save = async () => {
    setSaving(true)
    const payload = {
      ...form,
      trattamentoId: tipo === 'trattamento' ? form.trattamentoId : null,
      percorsoId: tipo === 'percorso' ? form.percorsoId : null,
      durata: Number(form.durata),
      prezzoTotale: form.prezzoTotale ? Number(form.prezzoTotale) : null,
    }
    let res
    if (modal === 'create') {
      res = await fetch('/api/host/spa/appuntamenti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`/api/host/spa/appuntamenti/${(modal as Appt).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    if (res.ok) { setModal(null); load() }
    setSaving(false)
  }

  const changeStato = async (id: string, stato: string) => {
    await fetch(`/api/host/spa/appuntamenti/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stato }) })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Eliminare questo appuntamento?')) return
    await fetch(`/api/host/spa/appuntamenti/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nuovo appuntamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap bg-white rounded-xl border border-gray-200 p-3">
        <Filter className="w-4 h-4 text-gray-400 self-center" />
        <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tutti gli stati</option>
          {STATO_OPTIONS.map(s => <option key={s} value={s}>{STATO_LABEL[s]}</option>)}
        </select>
        <select value={filtroTerapista} onChange={e => setFiltroTerapista(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Tutti i terapisti</option>
          {terapisti.map(t => <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>)}
        </select>
        {(filtroData || filtroStato || filtroTerapista) && (
          <button onClick={() => { setFiltroData(''); setFiltroStato(''); setFiltroTerapista('') }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded-lg">
            <X className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Caricamento...</div>
      ) : appts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nessun appuntamento trovato.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Ospite</th>
                <th className="px-4 py-3 text-left">Servizio</th>
                <th className="px-4 py-3 text-left">Data & Ora</th>
                <th className="px-4 py-3 text-left">Risorsa</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-right">Prezzo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appts.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.guestNome} {a.guestCognome}</div>
                    {a.guestEmail && <div className="text-xs text-gray-400">{a.guestEmail}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{a.trattamento?.nome ?? a.percorso?.nome ?? '—'}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{a.durata} min</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {format(new Date(a.dataOra), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </td>
                  <td className="px-4 py-3">
                    {a.terapista && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.terapista.colore }} />{a.terapista.nome} {a.terapista.cognome}</div>}
                    {a.cabina && <div className="text-xs text-gray-400">{a.cabina.nome}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative group inline-block">
                      <Badge className={cn('cursor-pointer', STATO_COLOR[a.stato])}>{STATO_LABEL[a.stato]}</Badge>
                      <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 w-36">
                        {STATO_OPTIONS.map(s => (
                          <button key={s} onClick={() => changeStato(a.id, s)}
                            className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700">
                            {STATO_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {a.prezzoTotale ? formatValuta(a.prezzoTotale) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setTipo(a.trattamento ? 'trattamento' : 'percorso'); setForm({ guestNome: a.guestNome, guestCognome: a.guestCognome, guestEmail: a.guestEmail ?? '', guestTelefono: a.guestTelefono ?? '', cabinaId: a.cabina?.id ?? '', terapistaId: a.terapista?.id ?? '', trattamentoId: a.trattamento?.id ?? '', percorsoId: a.percorso?.id ?? '', dataOra: format(new Date(a.dataOra), "yyyy-MM-dd'T'HH:mm"), durata: String(a.durata), prezzoTotale: a.prezzoTotale ? String(a.prezzoTotale) : '', stato: a.stato, note: a.note ?? '' }); setModal(a) }}
                        className="text-xs text-brand-600 hover:text-brand-700 px-2 py-1 border border-brand-200 rounded-lg hover:bg-brand-50">
                        Modifica
                      </button>
                      <button onClick={() => remove(a.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-100 rounded-lg hover:bg-red-50">
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">{modal === 'create' ? 'Nuovo appuntamento' : 'Modifica appuntamento'}</h2>

            {/* Guest */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase">Ospite</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome *" value={form.guestNome} onChange={v => setForm(f => ({ ...f, guestNome: v }))} />
                <Field label="Cognome *" value={form.guestCognome} onChange={v => setForm(f => ({ ...f, guestCognome: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" value={form.guestEmail} onChange={v => setForm(f => ({ ...f, guestEmail: v }))} />
                <Field label="Telefono" value={form.guestTelefono} onChange={v => setForm(f => ({ ...f, guestTelefono: v }))} />
              </div>
            </div>

            {/* Servizio */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase">Servizio</div>
              <div className="flex gap-2">
                {(['trattamento', 'percorso'] as const).map(t => (
                  <button key={t} onClick={() => setTipo(t)}
                    className={cn('flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                      tipo === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300')}>
                    {t === 'trattamento' ? 'Trattamento' : 'Percorso'}
                  </button>
                ))}
              </div>
              {tipo === 'trattamento' ? (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Trattamento *</label>
                  <select value={form.trattamentoId} onChange={e => onTrattamentoChange(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Seleziona...</option>
                    {trattamenti.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.durata} min)</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Percorso *</label>
                  <select value={form.percorsoId} onChange={e => onPercorsoChange(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Seleziona...</option>
                    {percorsi.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.durataMinuti} min)</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Slot */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase">Slot temporale</div>
              <Field label="Data e ora *" value={form.dataOra} onChange={v => { setForm(f => ({ ...f, dataOra: v })); setDispoRisultati(null); setDispoChecked(false) }} type="datetime-local" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Durata (min) *" value={form.durata} onChange={v => { setForm(f => ({ ...f, durata: v })); setDispoRisultati(null); setDispoChecked(false) }} type="number" />
                <Field label="Prezzo (€)" value={form.prezzoTotale} onChange={v => setForm(f => ({ ...f, prezzoTotale: v }))} type="number" />
              </div>
            </div>

            {/* Verifica disponibilità */}
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Verifica disponibilità</span>
                <button
                  type="button"
                  onClick={checkDisponibilita}
                  disabled={!form.dataOra || !form.durata || dispoLoading}
                  className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                  {dispoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Controlla
                </button>
              </div>
              {dispoChecked && dispoRisultati && (
                <div className="space-y-1.5 mt-1">
                  {dispoRisultati.length === 0 && (
                    <p className="text-xs text-violet-400 text-center py-2">Nessun terapista attivo trovato.</p>
                  )}
                  {dispoRisultati.map(r => (
                    <div key={r.terapista.id} className={cn('flex items-start gap-2 p-2 rounded-lg', r.disponibile ? 'bg-white border border-green-200' : 'bg-gray-50 border border-gray-100')}>
                      <div className="w-2.5 h-2.5 mt-0.5 rounded-full shrink-0" style={{ backgroundColor: r.terapista.colore }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-700">{r.terapista.nome} {r.terapista.cognome}</span>
                        {r.disponibile ? (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {r.cabineDisponibili.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selezionaRisorsa(r.terapista.id, c.id)}
                                className={cn('px-2 py-0.5 rounded-md border text-xs transition-colors', form.terapistaId === r.terapista.id && form.cabinaId === c.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-400 hover:text-violet-600')}>
                                {c.nome}
                              </button>
                            ))}
                            {r.cabineDisponibili.length === 0 && (
                              <span className="text-xs text-amber-500">Disponibile ma nessuna cabina libera</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 ml-1">— {r.motivo}</span>
                        )}
                      </div>
                      {r.disponibile
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              )}
              {/* Fallback manual pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Terapista</label>
                  <select value={form.terapistaId} onChange={e => setForm(f => ({ ...f, terapistaId: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                    <option value="">Nessuno</option>
                    {terapisti.map(t => <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Cabina</label>
                  <select value={form.cabinaId} onChange={e => setForm(f => ({ ...f, cabinaId: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                    <option value="">Nessuna</option>
                    {cabine.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Stato + note */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Stato</label>
              <select value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {STATO_OPTIONS.map(s => <option key={s} value={s}>{STATO_LABEL[s]}</option>)}
              </select>
            </div>
            <Field label="Note" value={form.note} onChange={v => setForm(f => ({ ...f, note: v }))} />

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button onClick={save} disabled={saving || !form.guestNome || !form.guestCognome || !form.dataOra || !form.durata}
                className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  )
}
