'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PianoTipo } from '@prisma/client'

interface Props {
  targetPlan: PianoTipo
  targetLabel: string
  targetPrice: number
  isUpgrade: boolean
}

export default function PlanUpgradeButton({ targetPlan, targetLabel, targetPrice, isUpgrade }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/host/abbonamento/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuovoPiano: targetPlan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Errore nel cambio piano')
        setLoading(false)
        return
      }

      // Success — refresh the page to show updated data
      router.refresh()
      setShowConfirm(false)
    } catch (err) { console.error(err) 
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  const priceFormatted = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(targetPrice)

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          {isUpgrade ? 'Upgrade' : 'Downgrade'} a <strong>{targetLabel}</strong> ({priceFormatted}/mese)?
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isUpgrade
                ? 'bg-brand-600 hover:bg-brand-700'
                : 'bg-gray-600 hover:bg-gray-700'
            } disabled:opacity-50`}
          >
            {loading ? 'Attendere...' : 'Conferma'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null) }}
            disabled={loading}
            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
        isUpgrade
          ? 'bg-brand-600 text-white hover:bg-brand-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {isUpgrade ? 'Upgrade' : 'Downgrade'}
    </button>
  )
}
