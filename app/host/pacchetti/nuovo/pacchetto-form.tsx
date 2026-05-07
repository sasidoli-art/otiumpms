'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

type Struttura = { id: string; nome: string; citta: string | null }

export default function PacchettoForm({
  strutture,
}: {
  strutture: Struttura[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [incluso, setIncluso] = useState<string[]>([''])

  function addIncluso() { setIncluso(prev => [...prev, '']) }
  function removeIncluso(i: number) { setIncluso(prev => prev.filter((_, idx) => idx !== i)) }
  function updateIncluso(i: number, val: string) {
    setIncluso(prev => prev.map((v, idx) => idx === i ? val : v))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      strutturaId: fd.get('strutturaId'),
      nome: fd.get('nome'),
      descrizione: fd.get('descrizione') || undefined,
      notti: Number(fd.get('notti')),
      numOspiti: Number(fd.get('numOspiti')),
      prezzo: Number(fd.get('prezzo')),
      prezzoOriginale: fd.get('prezzoOriginale') ? Number(fd.get('prezzoOriginale')) : undefined,
      incluso: incluso.filter(s => s.trim()),
      dataInizio: fd.get('dataInizio') || undefined,
      dataFine: fd.get('dataFine') || undefined,
    }

    if (fd.get('eventoEsterno')) {
      body.eventoEsterno = fd.get('eventoEsterno')
    }

    const res = await fetch('/api/host/pacchetti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => null)
      setError(j?.error ?? 'Errore durante il salvataggio')
      setSaving(false)
      return
    }

    router.push('/host/pacchetti')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Nome pacchetto */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Dettagli pacchetto</h2>
        <div>
          <label className="label">Nome pacchetto *</label>
          <input name="nome" className="input" placeholder='es. "Weekend Sagra del Tartufo"' required />
        </div>
        <div>
          <label className="label">Descrizione</label>
          <textarea name="descrizione" className="input" rows={3} placeholder="Descrivi cosa include il pacchetto..." />
        </div>
      </div>

      {/* Struttura + Evento */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Collegamento</h2>
        <div>
          <label className="label">Struttura *</label>
          <select name="strutturaId" className="input" required>
            <option value="">Seleziona struttura...</option>
            {strutture.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}{s.citta ? ` — ${s.citta}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Evento collegato (opzionale)</label>
          <input
            name="eventoEsterno"
            className="input"
            placeholder='es. "Sagra del Tartufo di Alba" o URL OtiumWeek'
          />
          <p className="text-xs text-gray-400 mt-1">
            Nome o URL di un evento del territorio per creare l&apos;offerta combinata
          </p>
        </div>
      </div>

      {/* Dettagli soggiorno */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Soggiorno</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Notti *</label>
            <input name="notti" type="number" min="1" className="input" defaultValue={1} required />
          </div>
          <div>
            <label className="label">Ospiti *</label>
            <input name="numOspiti" type="number" min="1" className="input" defaultValue={2} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prezzo pacchetto (€) *</label>
            <input name="prezzo" type="number" min="0" step="0.01" className="input" placeholder="149.00" required />
          </div>
          <div>
            <label className="label">Prezzo originale (€)</label>
            <input name="prezzoOriginale" type="number" min="0" step="0.01" className="input" placeholder="199.00" />
            <p className="text-xs text-gray-400 mt-0.5">Mostra il risparmio al cliente</p>
          </div>
        </div>
      </div>

      {/* Incluso */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Cosa include</h2>
          <button
            type="button"
            onClick={addIncluso}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3 h-3" /> Aggiungi voce
          </button>
        </div>
        {incluso.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input flex-1"
              value={val}
              onChange={e => updateIncluso(i, e.target.value)}
              placeholder={
                i === 0 ? 'es. "Pernottamento in camera doppia"'
                  : i === 1 ? 'es. "Ingresso evento"'
                  : 'es. "Colazione inclusa"'
              }
            />
            {incluso.length > 1 && (
              <button
                type="button"
                onClick={() => removeIncluso(i)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Validità */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Periodo di validità</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Dal</label>
            <input name="dataInizio" type="date" className="input" />
          </div>
          <div>
            <label className="label">Al</label>
            <input name="dataFine" type="date" className="input" />
          </div>
        </div>
        <p className="text-xs text-gray-400">Opzionale — lascia vuoto per un'offerta senza scadenza</p>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          {saving ? 'Salvataggio...' : 'Crea pacchetto'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary px-6 py-2.5 text-sm"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
