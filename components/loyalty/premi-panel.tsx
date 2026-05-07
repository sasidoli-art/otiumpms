'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, X, Loader2, Trash2, Check, Edit3, Gift } from 'lucide-react'

type Premio = {
  id: string
  tipo: string
  nome: string
  descrizione: string | null
  immagine: string | null
  costoInPunti: number
  attivo: boolean
  disponibilitaMax: number | null
  disponibilitaMembro: number | null
  riscattiContatore: number
  trattamentoSpaId: string | null
  datiApplicazione: Record<string, unknown> | null
  _count: { movimenti: number }
}

const TIPI = [
  { id: 'SCONTO_PRENOTAZIONE', label: 'Sconto prenotazione', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'TRATTAMENTO_GRATIS', label: 'Trattamento SPA', color: 'bg-pink-100 text-pink-700' },
  { id: 'UPGRADE_CAMERA', label: 'Upgrade camera', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'BONUS_PUNTI', label: 'Bonus punti', color: 'bg-amber-100 text-amber-800' },
  { id: 'ALTRO', label: 'Altro', color: 'bg-gray-100 text-gray-700' },
]

function tipoBadge(tipo: string) {
  const t = TIPI.find((x) => x.id === tipo) ?? { label: tipo, color: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${t.color}`}>
      {t.label}
    </span>
  )
}

export default function PremiPanel() {
  const [premi, setPremi] = useState<Premio[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState<Premio | 'new' | null>(null)

  const carica = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/host/spa/loyalty/premi')
    if (res.ok) setPremi(await res.json())
    setLoading(false)
  }, [])
  useEffect(() => { carica() }, [carica])

  async function toggleAttivo(p: Premio) {
    await fetch(`/api/host/spa/loyalty/premi/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !p.attivo }),
    })
    await carica()
  }

  async function deletePremio(id: string) {
    if (!confirm('Eliminare questo premio? Se ci sono riscatti storici, verrà solo disattivato.')) return
    await fetch(`/api/host/spa/loyalty/premi/${id}`, { method: 'DELETE' })
    await carica()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Catalogo premi riscattabili con punti fedeltà. Se il premio è stato già riscattato,
          eliminarlo lo disattiva soltanto (lo storico resta).
        </p>
        <button
          onClick={() => setFormOpen('new')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg"
        >
          <Plus className="w-4 h-4" /> Nuovo premio
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : premi.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-10 flex flex-col items-center gap-3">
          <Gift className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500">Nessun premio configurato</p>
          <button
            onClick={() => setFormOpen('new')}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Crea il primo →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {premi.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl bg-white border shadow-sm p-4 flex items-start gap-4 ${
                p.attivo ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              {p.immagine && (
                <img src={p.immagine} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{p.nome}</span>
                  {tipoBadge(p.tipo)}
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    {p.costoInPunti} pt
                  </span>
                  {!p.attivo && (
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Disattivo</span>
                  )}
                </div>
                {p.descrizione && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.descrizione}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>Riscatti: {p.riscattiContatore}{p.disponibilitaMax ? ` / ${p.disponibilitaMax}` : ''}</span>
                  {p.disponibilitaMembro && <span>Max {p.disponibilitaMembro}/membro</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <label className="inline-flex items-center gap-1 px-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.attivo}
                    onChange={() => toggleAttivo(p)}
                    className="accent-purple-600"
                  />
                </label>
                <button
                  onClick={() => setFormOpen(p)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-purple-600 hover:border-purple-300"
                  title="Modifica"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePremio(p.id)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <FormModal
          premio={formOpen === 'new' ? null : formOpen}
          onClose={() => setFormOpen(null)}
          onSaved={async () => { setFormOpen(null); await carica() }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Form modal
// ────────────────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none'

function FormModal({ premio, onClose, onSaved }: {
  premio: Premio | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!premio
  const [form, setForm] = useState({
    tipo: premio?.tipo ?? 'SCONTO_PRENOTAZIONE',
    nome: premio?.nome ?? '',
    descrizione: premio?.descrizione ?? '',
    immagine: premio?.immagine ?? '',
    costoInPunti: premio?.costoInPunti ?? 100,
    attivo: premio?.attivo ?? true,
    disponibilitaMax: premio?.disponibilitaMax ?? null as number | null,
    disponibilitaMembro: premio?.disponibilitaMembro ?? null as number | null,
    scontoPercentuale: ((premio?.datiApplicazione ?? {}) as Record<string, unknown>).scontoPercentuale as number | undefined,
    valoreSconto: ((premio?.datiApplicazione ?? {}) as Record<string, unknown>).valoreSconto as number | undefined,
    puntiBonus: ((premio?.datiApplicazione ?? {}) as Record<string, unknown>).puntiBonus as number | undefined,
  })
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function salva() {
    setSaving(true); setErrore(null)
    try {
      const datiApplicazione: Record<string, unknown> = {}
      if (form.tipo === 'SCONTO_PRENOTAZIONE') {
        if (form.valoreSconto) datiApplicazione.valoreSconto = Number(form.valoreSconto)
        if (form.scontoPercentuale) datiApplicazione.scontoPercentuale = Number(form.scontoPercentuale)
      }
      if (form.tipo === 'BONUS_PUNTI' && form.puntiBonus) {
        datiApplicazione.puntiBonus = Number(form.puntiBonus)
      }

      const body = {
        tipo: form.tipo,
        nome: form.nome,
        descrizione: form.descrizione || null,
        immagine: form.immagine || null,
        costoInPunti: Number(form.costoInPunti),
        attivo: form.attivo,
        disponibilitaMax: form.disponibilitaMax ?? null,
        disponibilitaMembro: form.disponibilitaMembro ?? null,
        datiApplicazione: Object.keys(datiApplicazione).length > 0 ? datiApplicazione : null,
      }

      const url = isEdit ? `/api/host/spa/loyalty/premi/${premio!.id}` : '/api/host/spa/loyalty/premi'
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Modifica premio' : 'Nuovo premio'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errore && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{errore}</div>}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TIPI.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tipo: t.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${
                    form.tipo === t.id ? `${t.color} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nome</label>
            <input
              type="text" value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Es. Sconto €50 soggiorno"
              className={inp}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Descrizione</label>
            <textarea
              rows={2} value={form.descrizione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              placeholder="Visibile al membro"
              className={inp}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">URL immagine</label>
            <input
              type="url" value={form.immagine}
              onChange={(e) => setForm((f) => ({ ...f, immagine: e.target.value }))}
              placeholder="https://..."
              className={inp}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Costo (punti)</label>
              <input
                type="number" min={1}
                value={form.costoInPunti}
                onChange={(e) => setForm((f) => ({ ...f, costoInPunti: Number(e.target.value) }))}
                className={inp}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Max totali</label>
              <input
                type="number" min={1}
                value={form.disponibilitaMax ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, disponibilitaMax: e.target.value ? Number(e.target.value) : null }))}
                className={inp}
                placeholder="Illimitato"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Max per membro</label>
              <input
                type="number" min={1}
                value={form.disponibilitaMembro ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, disponibilitaMembro: e.target.value ? Number(e.target.value) : null }))}
                className={inp}
                placeholder="Illimitato"
              />
            </div>
          </div>

          {form.tipo === 'SCONTO_PRENOTAZIONE' && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
              <label className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Sconto applicato</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Valore fisso (€)</label>
                  <input
                    type="number" min={0} step={0.01}
                    value={form.valoreSconto ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, valoreSconto: e.target.value ? Number(e.target.value) : undefined }))}
                    className={inp}
                    placeholder="es. 50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">oppure % del totale</label>
                  <input
                    type="number" min={0} max={100}
                    value={form.scontoPercentuale ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, scontoPercentuale: e.target.value ? Number(e.target.value) : undefined }))}
                    className={inp}
                    placeholder="es. 10"
                  />
                </div>
              </div>
            </div>
          )}

          {form.tipo === 'BONUS_PUNTI' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
              <label className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Bonus punti</label>
              <input
                type="number" min={1}
                value={form.puntiBonus ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, puntiBonus: e.target.value ? Number(e.target.value) : undefined }))}
                className={inp}
                placeholder="es. 100"
              />
            </div>
          )}

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox" checked={form.attivo}
              onChange={(e) => setForm((f) => ({ ...f, attivo: e.target.checked }))}
              className="accent-purple-600"
            />
            <span className="text-sm">Premio attivo e riscattabile</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Annulla</button>
          <button
            onClick={salva}
            disabled={saving || !form.nome}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Salva' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  )
}
