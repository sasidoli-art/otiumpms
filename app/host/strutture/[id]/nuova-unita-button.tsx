'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NuovaUnitaButton({ strutturaId }: { strutturaId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    const res = await fetch(`/api/host/strutture/${strutturaId}/unita`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const j = await res.json()
      setError(j.error || 'Errore')
      setLoading(false)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-1 text-sm">
        <Plus className="w-4 h-4" /> Aggiungi unità
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Nuova unità prenotabile</h3>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
            )}

            <div>
              <label className="label">Nome *</label>
              <input name="nome" required className="input" placeholder="es. Posto standard, Camera doppia, Tavolo..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Capacità</label>
                <input name="capacita" type="number" min={1} defaultValue={1} className="input" />
              </div>
              <div>
                <label className="label">Prezzo base (€)</label>
                <input name="prezzoBase" type="number" step="0.01" min={0} defaultValue={0} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Descrizione</label>
              <textarea name="descrizione" rows={2} className="input" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Salvo...' : 'Aggiungi'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
