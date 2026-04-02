'use client'

import { useState } from 'react'
import { Pencil, Trash2, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Unita = {
  id: string
  nome: string
  capacita: number
  prezzoBase: number
  descrizione: string | null
  piano: number | null
  attiva: boolean
}

export default function UnitaRowActions({ unita, strutturaId }: { unita: Unita; strutturaId: string }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const router = useRouter()

  async function salvaModifica(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore('')
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    const res = await fetch(`/api/host/strutture/${strutturaId}/unita/${unita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: data.nome,
        capacita: Number(data.capacita),
        prezzoBase: Number(data.prezzoBase),
        descrizione: data.descrizione || null,
        piano: data.piano ? Number(data.piano) : null,
      }),
    })
    if (res.ok) {
      setEditOpen(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErrore(d.error || 'Errore')
    }
    setLoading(false)
  }

  async function toggleAttiva() {
    setLoading(true)
    await fetch(`/api/host/strutture/${strutturaId}/unita/${unita.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attiva: !unita.attiva }),
    })
    router.refresh()
    setLoading(false)
  }

  async function elimina() {
    setLoading(true)
    const res = await fetch(`/api/host/strutture/${strutturaId}/unita/${unita.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteConfirm(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErrore(d.error || 'Errore')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button onClick={toggleAttiva} disabled={loading} title={unita.attiva ? 'Disattiva' : 'Attiva'}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          {unita.attiva ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={() => setEditOpen(true)} title="Modifica"
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setDeleteConfirm(true)} title="Elimina"
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal modifica */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={salvaModifica} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Modifica {unita.nome}</h3>
              <button type="button" onClick={() => setEditOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {errore && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errore}</p>}

            <div>
              <label className="label">Nome *</label>
              <input name="nome" required className="input" defaultValue={unita.nome} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Capacità</label>
                <input name="capacita" type="number" min={1} className="input" defaultValue={unita.capacita} />
              </div>
              <div>
                <label className="label">Prezzo (€)</label>
                <input name="prezzoBase" type="number" step="0.01" min={0} className="input" defaultValue={unita.prezzoBase} />
              </div>
              <div>
                <label className="label">Piano</label>
                <input name="piano" type="number" className="input" defaultValue={unita.piano ?? ''} />
              </div>
            </div>
            <div>
              <label className="label">Descrizione</label>
              <textarea name="descrizione" rows={2} className="input" defaultValue={unita.descrizione ?? ''} />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Salvo...' : 'Salva'}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">Annulla</button>
            </div>
          </form>
        </div>
      )}

      {/* Conferma elimina */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Eliminare {unita.nome}?</h3>
            <p className="text-sm text-gray-600">
              La camera verrà rimossa dalla struttura. Le prenotazioni esistenti non verranno cancellate.
            </p>
            {errore && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errore}</p>}
            <div className="flex gap-2">
              <button onClick={elimina} disabled={loading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {loading ? 'Elimino...' : 'Elimina'}
              </button>
              <button onClick={() => { setDeleteConfirm(false); setErrore('') }} className="btn-secondary">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
