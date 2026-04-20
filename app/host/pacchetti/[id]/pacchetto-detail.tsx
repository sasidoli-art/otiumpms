'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Trash2, Save, Plus, Eye, EyeOff } from 'lucide-react'

type Pacchetto = {
  id: string
  nome: string
  descrizione: string | null
  strutturaId: string
  eventoEsterno: string | null
  notti: number
  numOspiti: number
  prezzo: number
  prezzoOriginale: number | null
  incluso: string[]
  attivo: boolean
  dataInizio: string | null
  dataFine: string | null
}
type Struttura = { id: string; nome: string; citta: string | null }

export default function PacchettoDetail({
  pacchetto,
  strutture,
}: {
  pacchetto: Pacchetto
  strutture: Struttura[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [incluso, setIncluso] = useState<string[]>(
    pacchetto.incluso.length > 0 ? pacchetto.incluso : ['']
  )

  function addIncluso() { setIncluso(prev => [...prev, '']) }
  function removeIncluso(i: number) { setIncluso(prev => prev.filter((_, idx) => idx !== i)) }
  function updateIncluso(i: number, val: string) {
    setIncluso(prev => prev.map((v, idx) => idx === i ? val : v))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      nome: fd.get('nome'),
      descrizione: fd.get('descrizione') || null,
      strutturaId: fd.get('strutturaId'),
      notti: Number(fd.get('notti')),
      numOspiti: Number(fd.get('numOspiti')),
      prezzo: Number(fd.get('prezzo')),
      prezzoOriginale: fd.get('prezzoOriginale') ? Number(fd.get('prezzoOriginale')) : null,
      incluso: incluso.filter(s => s.trim()),
      attivo: fd.get('attivo') === 'on',
      dataInizio: fd.get('dataInizio') || null,
      dataFine: fd.get('dataFine') || null,
    }

    body.eventoEsterno = fd.get('eventoEsterno') || null

    const res = await fetch(`/api/host/pacchetti/${pacchetto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => null)
      setError(j?.error ?? 'Errore durante il salvataggio')
      setSaving(false)
      return
    }

    setSuccess('Pacchetto aggiornato')
    setTimeout(() => setSuccess(''), 2500)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Eliminare questo pacchetto? L\'azione non è reversibile.')) return
    setDeleting(true)
    const res = await fetch(`/api/host/pacchetti/${pacchetto.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Errore durante l\'eliminazione')
      setDeleting(false)
      return
    }
    router.push('/host/pacchetti')
    router.refresh()
  }

  async function toggleAttivo() {
    const res = await fetch(`/api/host/pacchetti/${pacchetto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !pacchetto.attivo }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleAttivo}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            pacchetto.attivo
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {pacchetto.attivo ? <><EyeOff className="w-3.5 h-3.5" /> Disattiva</> : <><Eye className="w-3.5 h-3.5" /> Attiva</>}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? 'Eliminazione...' : 'Elimina'}
        </button>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
          pacchetto.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {pacchetto.attivo ? 'Attivo' : 'Bozza'}
        </span>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dettagli */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Dettagli pacchetto</h2>
          <div>
            <label className="label">Nome pacchetto *</label>
            <input name="nome" className="input" defaultValue={pacchetto.nome} required />
          </div>
          <div>
            <label className="label">Descrizione</label>
            <textarea name="descrizione" className="input" rows={3} defaultValue={pacchetto.descrizione ?? ''} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" name="attivo" id="attivo" defaultChecked={pacchetto.attivo} className="rounded" />
            <label htmlFor="attivo" className="text-sm text-gray-700">Pacchetto attivo e visibile</label>
          </div>
        </div>

        {/* Collegamento */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Collegamento</h2>
          <div>
            <label className="label">Struttura *</label>
            <select name="strutturaId" className="input" defaultValue={pacchetto.strutturaId} required>
              {strutture.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome}{s.citta ? ` — ${s.citta}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Evento collegato (opzionale)</label>
            <input name="eventoEsterno" className="input" defaultValue={pacchetto.eventoEsterno ?? ''}
              placeholder='es. "Sagra del Tartufo di Alba" o URL OtiumWeek' />
          </div>
        </div>

        {/* Soggiorno */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Soggiorno</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Notti *</label>
              <input name="notti" type="number" min="1" className="input" defaultValue={pacchetto.notti} required />
            </div>
            <div>
              <label className="label">Ospiti *</label>
              <input name="numOspiti" type="number" min="1" className="input" defaultValue={pacchetto.numOspiti} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prezzo pacchetto (€) *</label>
              <input name="prezzo" type="number" min="0" step="0.01" className="input" defaultValue={pacchetto.prezzo} required />
            </div>
            <div>
              <label className="label">Prezzo originale (€)</label>
              <input name="prezzoOriginale" type="number" min="0" step="0.01" className="input"
                defaultValue={pacchetto.prezzoOriginale ?? ''} />
            </div>
          </div>
        </div>

        {/* Incluso */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Cosa include</h2>
            <button type="button" onClick={addIncluso}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
              <Plus className="w-3 h-3" /> Aggiungi
            </button>
          </div>
          {incluso.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input flex-1" value={val}
                onChange={e => updateIncluso(i, e.target.value)} placeholder="es. Colazione inclusa" />
              {incluso.length > 1 && (
                <button type="button" onClick={() => removeIncluso(i)} className="p-2 text-gray-400 hover:text-red-500">
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
              <input name="dataInizio" type="date" className="input" defaultValue={pacchetto.dataInizio ?? ''} />
            </div>
            <div>
              <label className="label">Al</label>
              <input name="dataFine" type="date" className="input" defaultValue={pacchetto.dataFine ?? ''} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </form>
    </div>
  )
}
