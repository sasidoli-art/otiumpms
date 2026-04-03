'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Monitor, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'

const MODALITA = [
  {
    value: 'completo',
    label: 'Check-in completo',
    icon: <Smartphone className="w-6 h-6" />,
    description:
      "L'ospite completa tutto online: dati personali, foto del documento fronte/retro, accompagnatori e firma della registration card. Ideale per strutture che vogliono minimizzare le operazioni alla reception.",
  },
  {
    value: 'leggero',
    label: 'Check-in leggero',
    icon: <Monitor className="w-6 h-6" />,
    description:
      "L'ospite compila online solo i dati personali, accompagnatori e firma la registration card. Le foto del documento vengono acquisite alla reception tramite il tablet kiosk. Ideale per strutture che preferiscono verificare i documenti di persona.",
  },
] as const

export function CheckinSettingsForm({ modalitaCheckin }: { modalitaCheckin: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState(modalitaCheckin)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    setSaved(false)

    try {
      const res = await fetch('/api/host/profilo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modalitaCheckin: selected }),
      })

      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Errore nel salvataggio')
        return
      }

      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) { console.error(err) 
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = selected !== modalitaCheckin

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modalit&agrave; check-in</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scegli quante informazioni l&apos;ospite deve inserire durante il check-in online.
        </p>
      </div>

      <div className="space-y-3">
        {MODALITA.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => setSelected(m.value)}
            className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
              selected === m.value
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  selected === m.value
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold ${
                      selected === m.value ? 'text-indigo-900' : 'text-gray-900'
                    }`}
                  >
                    {m.label}
                  </p>
                  {selected === m.value && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Impostazioni salvate con successo
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          La modifica si applica a tutti i nuovi link di check-in inviati.
        </p>
        <button
          onClick={handleSave}
          disabled={loading || !hasChanges}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvataggio...</>
          ) : (
            'Salva impostazioni'
          )}
        </button>
      </div>
    </div>
  )
}
