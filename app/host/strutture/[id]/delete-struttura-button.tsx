'use client'

import { useState } from 'react'
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeleteStrutturaButton({ strutturaId, strutturaNome }: { strutturaId: string; strutturaNome: string }) {
  const [open, setOpen] = useState(false)
  const [conferma, setConferma] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const router = useRouter()

  const nomeMatch = conferma.trim().toLowerCase() === strutturaNome.trim().toLowerCase()

  async function elimina() {
    if (!nomeMatch) return
    setLoading(true)
    setErrore('')
    const res = await fetch(`/api/host/strutture/${strutturaId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/host/strutture')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErrore(d.error || 'Errore durante l\'eliminazione')
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Elimina struttura
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Elimina struttura</h3>
                  <p className="text-xs text-gray-500">Questa azione non può essere annullata</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Stai per eliminare <strong>{strutturaNome}</strong> con tutte le sue camere, tariffe e disponibilità.
                Le prenotazioni associate non verranno eliminate.
              </p>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Digita <strong className="text-red-600">{strutturaNome}</strong> per confermare
                </label>
                <input
                  type="text"
                  value={conferma}
                  onChange={e => setConferma(e.target.value)}
                  placeholder={strutturaNome}
                  className="input border-red-200 focus:border-red-400 focus:ring-red-200"
                  autoFocus
                />
              </div>

              {errore && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errore}</p>
              )}
            </div>

            <div className="p-5 border-t flex gap-3">
              <button
                onClick={elimina}
                disabled={!nomeMatch || loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {loading ? 'Eliminazione...' : 'Elimina definitivamente'}
              </button>
              <button
                onClick={() => { setOpen(false); setConferma(''); setErrore('') }}
                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
