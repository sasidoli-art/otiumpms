'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, DoorOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Cabina {
  id: string
  nome: string
  descrizione: string | null
  colore: string
  capacita: number
  attiva: boolean
}

const COLORS = ['#8b5cf6', '#6366f1', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']

export default function CabineManager() {
  const [cabine, setCabine] = useState<Cabina[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | Cabina | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', descrizione: '', colore: '#8b5cf6', capacita: '1', attiva: true })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/host/spa/cabine')
    const data = await res.json()
    setCabine(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm({ nome: '', descrizione: '', colore: '#8b5cf6', capacita: '1', attiva: true })
    setModal('create')
  }
  const openEdit = (c: Cabina) => {
    setForm({ nome: c.nome, descrizione: c.descrizione ?? '', colore: c.colore, capacita: String(c.capacita), attiva: c.attiva })
    setModal(c)
  }

  const save = async () => {
    setSaving(true)
    const payload = { ...form, capacita: Number(form.capacita) }
    let res
    if (modal === 'create') {
      res = await fetch('/api/host/spa/cabine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      res = await fetch(`/api/host/spa/cabine/${(modal as Cabina).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    if (res.ok) { setModal(null); load() }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Eliminare questa cabina?')) return
    await fetch(`/api/host/spa/cabine/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
            <DoorOpen className="w-5 h-5 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Cabine & Sale</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Aggiungi
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Caricamento...</div>
      ) : cabine.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nessuna cabina ancora.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cabine.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-2" style={{ backgroundColor: c.colore }} />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{c.nome}</div>
                    {c.descrizione && <div className="text-xs text-gray-400 mt-0.5">{c.descrizione}</div>}
                  </div>
                  <Badge className={c.attiva ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {c.attiva ? 'Attiva' : 'Inattiva'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">Capacità: {c.capacita} {c.capacita === 1 ? 'persona' : 'persone'}</div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors">
                    <Edit2 className="w-3 h-3" /> Modifica
                  </button>
                  <button onClick={() => remove(c.id)} className="flex-1 flex items-center justify-center gap-1 text-xs text-red-600 border border-red-100 rounded-lg py-1.5 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3" /> Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{modal === 'create' ? 'Nuova cabina' : 'Modifica cabina'}</h2>
            <Field label="Nome *" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
            <Field label="Descrizione" value={form.descrizione} onChange={v => setForm(f => ({ ...f, descrizione: v }))} />
            <Field label="Capacità (persone)" value={form.capacita} onChange={v => setForm(f => ({ ...f, capacita: v }))} type="number" />
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Colore</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, colore: c }))}
                    className={cn('w-7 h-7 rounded-full border-2', form.colore === c ? 'border-gray-800 scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="attiva" checked={form.attiva} onChange={e => setForm(f => ({ ...f, attiva: e.target.checked }))} className="rounded" />
              <label htmlFor="attiva" className="text-sm text-gray-700">Cabina attiva</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button onClick={save} disabled={saving || !form.nome}
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
