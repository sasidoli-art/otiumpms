'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus, X, Loader2, Trash2, Check, AlertTriangle, Edit3, Eye, EyeOff,
  TrendingUp, BarChart3, Image as ImageIcon,
} from 'lucide-react'
import { format, subDays } from 'date-fns'

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type Suggerimento = {
  id: string
  tipo: string
  titolo: string
  descrizione: string | null
  immagine: string | null
  prezzo: number | null
  prezzoPercentuale: number | null
  trattamentoSpaId: string | null
  servizioId: string | null
  pacchettoId: string | null
  unitaTargetId: string | null
  posizione: string[]
  condizioni: Record<string, unknown> | null
  priorita: number
  attivo: boolean
  _count: { conversioni: number }
  createdAt: string
}

type ReportRiga = {
  suggerimentoId: string
  titolo: string
  tipo: string
  visualizzazioni: number
  conversioni: number
  tassoConversione: number
  revenue: number
}

type ReportData = {
  periodo: { da: string; a: string }
  righe: ReportRiga[]
  totali: { visualizzazioni: number; conversioni: number; tassoConversione: number; revenue: number }
}

const TIPI: Array<{ id: string; label: string; color: string }> = [
  { id: 'UPGRADE_CAMERA', label: 'Upgrade camera', color: 'indigo' },
  { id: 'TRATTAMENTO_SPA', label: 'Trattamento SPA', color: 'pink' },
  { id: 'PIANO_PASTO', label: 'Piano pasto', color: 'amber' },
  { id: 'LATE_CHECKOUT', label: 'Late checkout', color: 'sky' },
  { id: 'EARLY_CHECKIN', label: 'Early check-in', color: 'sky' },
  { id: 'SERVIZIO_EXTRA', label: 'Servizio extra', color: 'emerald' },
  { id: 'PACCHETTO', label: 'Pacchetto', color: 'violet' },
  { id: 'RISTORANTE', label: 'Ristorante', color: 'orange' },
  { id: 'ALTRO', label: 'Altro', color: 'gray' },
]

const TOUCHPOINTS: Array<{ id: string; label: string }> = [
  { id: 'POST_PRENOTAZIONE', label: 'Dopo la prenotazione' },
  { id: 'EMAIL_PRE_ARRIVO', label: 'Email pre-arrivo' },
  { id: 'CHECKIN_ONLINE', label: 'Check-in online' },
  { id: 'BENVENUTO_WHATSAPP', label: 'Benvenuto WhatsApp' },
  { id: 'IN_HOUSE', label: 'In struttura' },
]

const TONE: Record<string, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-800' },
  sky:    { bg: 'bg-sky-100',    text: 'text-sky-700' },
  emerald:{ bg: 'bg-emerald-100',text: 'text-emerald-700' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-700' },
}

function tipoBadge(tipo: string) {
  const t = TIPI.find((x) => x.id === tipo) ?? { label: tipo, color: 'gray' }
  const tone = TONE[t.color]
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${tone.bg} ${tone.text}`}>
      {t.label}
    </span>
  )
}

const fmtEuro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

export default function UpsellingCatalogo() {
  const [tab, setTab] = useState<'lista' | 'report'>('lista')
  const [suggerimenti, setSuggerimenti] = useState<Suggerimento[]>([])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState<Suggerimento | 'new' | null>(null)

  const carica = useCallback(async () => {
    setLoading(true); setErrore(null)
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('/api/host/upselling/suggerimenti'),
        fetch(`/api/host/upselling/conversioni?da=${format(subDays(new Date(), 90), 'yyyy-MM-dd')}`),
      ])
      if (sRes.ok) setSuggerimenti(await sRes.json())
      if (rRes.ok) setReport(await rRes.json())
    } catch {
      setErrore('Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { carica() }, [carica])

  async function toggleAttivo(s: Suggerimento) {
    await fetch(`/api/host/upselling/suggerimenti/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !s.attivo }),
    })
    await carica()
  }

  async function deleteSuggerimento(id: string) {
    if (!confirm('Eliminare questo suggerimento? Tutte le conversioni verranno cancellate.')) return
    await fetch(`/api/host/upselling/suggerimenti/${id}`, { method: 'DELETE' })
    await carica()
  }

  return (
    <div className="space-y-5">
      {errore && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {errore}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="border-b border-gray-200 flex items-center gap-1">
        <TabBtn active={tab === 'lista'} onClick={() => setTab('lista')} icon={ImageIcon} label="Catalogo suggerimenti" />
        <TabBtn active={tab === 'report'} onClick={() => setTab('report')} icon={BarChart3} label="Report conversioni" />
        <div className="ml-auto pb-2">
          <button
            onClick={() => setFormOpen('new')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuovo suggerimento
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {/* ─── Lista ─────────────────────────────────────────────────────── */}
      {!loading && tab === 'lista' && (
        <div className="space-y-3">
          {suggerimenti.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-12 flex flex-col items-center gap-3">
              <TrendingUp className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">Nessun suggerimento configurato</p>
              <button
                onClick={() => setFormOpen('new')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Crea il primo →
              </button>
            </div>
          ) : (
            suggerimenti.map((s) => (
              <div key={s.id} className={`rounded-xl bg-white border shadow-sm p-4 ${s.attivo ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start gap-4">
                  {s.immagine && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.immagine} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{s.titolo}</span>
                      {tipoBadge(s.tipo)}
                      {s.attivo ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">Attivo</span>
                      ) : (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Disattivato</span>
                      )}
                      <span className="text-xs text-gray-500">priorità {s.priorita}</span>
                    </div>
                    {s.descrizione && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.descrizione}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="font-semibold text-gray-900">
                        {s.prezzo != null
                          ? fmtEuro(s.prezzo)
                          : s.prezzoPercentuale != null
                            ? `${s.prezzoPercentuale}% del soggiorno`
                            : '—'}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">
                        {s.posizione.length > 0
                          ? s.posizione.map((p) => TOUCHPOINTS.find((t) => t.id === p)?.label ?? p).join(', ')
                          : 'Nessun touchpoint selezionato'}
                      </span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{s._count.conversioni} eventi</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleAttivo(s)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300"
                      title={s.attivo ? 'Disattiva' : 'Attiva'}
                    >
                      {s.attivo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setFormOpen(s)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300"
                      title="Modifica"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSuggerimento(s.id)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Report ────────────────────────────────────────────────────── */}
      {!loading && tab === 'report' && report && (
        <ReportView data={report} />
      )}

      {/* Form modal */}
      {formOpen && (
        <FormModal
          suggerimento={formOpen === 'new' ? null : formOpen}
          onClose={() => setFormOpen(null)}
          onSaved={async () => {
            setFormOpen(null)
            await carica()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Report view
// ────────────────────────────────────────────────────────────────────────────

function ReportView({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Periodo: <strong>{data.periodo.da}</strong> → <strong>{data.periodo.a}</strong>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Visualizzazioni" value={String(data.totali.visualizzazioni)} />
        <Kpi label="Conversioni" value={String(data.totali.conversioni)} />
        <Kpi label="Tasso conversione" value={`${data.totali.tassoConversione}%`} />
        <Kpi label="Revenue generata" value={fmtEuro(data.totali.revenue)} highlight />
      </div>

      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Suggerimento</th>
                <th className="text-left px-4 py-2.5 font-semibold">Tipo</th>
                <th className="text-right px-4 py-2.5 font-semibold">Viste</th>
                <th className="text-right px-4 py-2.5 font-semibold">Conversioni</th>
                <th className="text-right px-4 py-2.5 font-semibold">Tasso</th>
                <th className="text-right px-4 py-2.5 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.righe.map((r) => (
                <tr key={r.suggerimentoId} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.titolo}</td>
                  <td className="px-4 py-2.5">{tipoBadge(r.tipo)}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{r.visualizzazioni}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{r.conversioni}</td>
                  <td className="text-right px-4 py-2.5 tabular-nums text-gray-700">{r.tassoConversione}%</td>
                  <td className="text-right px-4 py-2.5 tabular-nums font-semibold text-gray-900">{fmtEuro(r.revenue)}</td>
                </tr>
              ))}
              {data.righe.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nessun dato nel periodo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold mt-0.5 tabular-nums ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Form modal (create / edit)
// ────────────────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none'

function FormModal({ suggerimento, onClose, onSaved }: {
  suggerimento: Suggerimento | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!suggerimento
  const [form, setForm] = useState({
    tipo: suggerimento?.tipo ?? 'SERVIZIO_EXTRA',
    titolo: suggerimento?.titolo ?? '',
    descrizione: suggerimento?.descrizione ?? '',
    immagine: suggerimento?.immagine ?? '',
    prezzo: suggerimento?.prezzo ?? 0,
    posizione: suggerimento?.posizione ?? [],
    priorita: suggerimento?.priorita ?? 0,
    attivo: suggerimento?.attivo ?? true,
    minNotti: (suggerimento?.condizioni as Record<string, unknown>)?.minNotti as number | undefined,
    giorniPrimaArrivoMin: (suggerimento?.condizioni as Record<string, unknown>)?.giorniPrimaArrivo as { min?: number; max?: number } | undefined,
  })
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const condizioni = useMemo(() => {
    const c: Record<string, unknown> = {}
    if (form.minNotti) c.minNotti = Number(form.minNotti)
    if (form.giorniPrimaArrivoMin) c.giorniPrimaArrivo = form.giorniPrimaArrivoMin
    return c
  }, [form.minNotti, form.giorniPrimaArrivoMin])

  async function salva() {
    setSaving(true); setErrore(null)
    try {
      const body = {
        tipo: form.tipo,
        titolo: form.titolo,
        descrizione: form.descrizione || null,
        immagine: form.immagine || null,
        prezzo: Number(form.prezzo),
        prezzoPercentuale: null,
        posizione: form.posizione,
        condizioni: Object.keys(condizioni).length > 0 ? condizioni : null,
        priorita: Number(form.priorita),
        attivo: form.attivo,
      }
      const url = isEdit
        ? `/api/host/upselling/suggerimenti/${suggerimento!.id}`
        : '/api/host/upselling/suggerimenti'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Errore salvataggio')
      }
      onSaved()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  function togglePosizione(p: string) {
    setForm((f) => ({
      ...f,
      posizione: f.posizione.includes(p) ? f.posizione.filter((x) => x !== p) : [...f.posizione, p],
    }))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Modifica suggerimento' : 'Nuovo suggerimento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errore && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{errore}</div>
          )}

          <Field label="Tipo">
            <div className="flex flex-wrap gap-2">
              {TIPI.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tipo: t.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${
                    form.tipo === t.id
                      ? `${TONE[t.color].bg} ${TONE[t.color].text} border-current`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Titolo">
            <input
              type="text" value={form.titolo}
              onChange={(e) => setForm((f) => ({ ...f, titolo: e.target.value }))}
              placeholder="Es. Upgrade a Camera Superior"
              className={inp}
            />
          </Field>

          <Field label="Descrizione">
            <textarea
              rows={3}
              value={form.descrizione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              placeholder="Descrizione visibile all'ospite"
              className={inp}
            />
          </Field>

          <Field label="URL immagine">
            <input
              type="url" value={form.immagine}
              onChange={(e) => setForm((f) => ({ ...f, immagine: e.target.value }))}
              placeholder="https://..."
              className={inp}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prezzo (€)">
              <input
                type="number" min={0} step={0.01}
                value={form.prezzo}
                onChange={(e) => setForm((f) => ({ ...f, prezzo: Number(e.target.value) }))}
                className={inp}
              />
            </Field>
            <Field label="Priorità" hint="Più alta = mostrato prima">
              <input
                type="number" min={0} max={100}
                value={form.priorita}
                onChange={(e) => setForm((f) => ({ ...f, priorita: Number(e.target.value) }))}
                className={inp}
              />
            </Field>
          </div>

          <Field label="Touchpoint (dove mostrare)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TOUCHPOINTS.map((t) => (
                <label key={t.id} className="inline-flex items-center gap-2 p-2 rounded border border-gray-200 hover:border-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.posizione.includes(t.id)}
                    onChange={() => togglePosizione(t.id)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Condizioni (opzionali)">
            <div className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-40">Notti minime soggiorno:</span>
                <input
                  type="number" min={1}
                  value={form.minNotti ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, minNotti: e.target.value ? Number(e.target.value) : undefined }))}
                  className={inp}
                />
              </div>
              <div className="text-xs text-gray-500 italic">
                Altre condizioni (tipo camera, piano pasto, giorni prima arrivo, ospite ricorrente) supportate via API.
              </div>
            </div>
          </Field>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.attivo}
              onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
              className="accent-indigo-600"
            />
            <span className="text-sm">Suggerimento attivo</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annulla</button>
          <button
            onClick={salva}
            disabled={saving || !form.titolo}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Salva modifiche' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
