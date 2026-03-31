'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const TIPI = [
  { value: 'EVENTO', label: 'Evento' },
  { value: 'VENUE', label: 'Venue / Spazio' },
  { value: 'ESPERIENZA', label: 'Esperienza' },
  { value: 'ALLOGGIO', label: 'Alloggio' },
  { value: 'SERVIZIO', label: 'Servizio' },
]

export default function NuovaStrutturaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    const res = await fetch('/api/host/strutture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const j = await res.json()
      setError(j.error || 'Errore durante la creazione')
      setLoading(false)
      return
    }

    const struttura = await res.json()
    router.push(`/host/strutture/${struttura.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/host/strutture" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuova struttura</h1>
          <p className="text-sm text-gray-500">Aggiungi un evento, venue o servizio prenotabile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome struttura *</label>
            <input name="nome" required className="input" placeholder="es. Cinema all'aperto Estate 2025" />
          </div>

          <div>
            <label className="label">Tipo</label>
            <select name="tipo" className="input">
              {TIPI.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Capacità totale</label>
            <input name="capacitaTotale" type="number" min={1} className="input" defaultValue={1} />
          </div>

          <div>
            <label className="label">Prezzo base (€)</label>
            <input name="prezzoBase" type="number" step="0.01" min={0} className="input" defaultValue={0} />
          </div>

          <div>
            <label className="label">Città</label>
            <input name="citta" className="input" />
          </div>

          <div>
            <label className="label">Regione</label>
            <input name="regione" className="input" />
          </div>

          <div className="col-span-2">
            <label className="label">Indirizzo</label>
            <input name="indirizzo" className="input" />
          </div>

          <div className="col-span-2">
            <label className="label">Descrizione</label>
            <textarea name="descrizione" rows={3} className="input" placeholder="Descrivi la struttura..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creazione...' : 'Crea struttura'}
          </button>
          <Link href="/host/strutture" className="btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
