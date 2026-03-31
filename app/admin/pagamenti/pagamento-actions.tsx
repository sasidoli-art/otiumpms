'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock } from 'lucide-react'

export function PagamentoActions({ pagamentoId, statoAttuale }: { pagamentoId: string; statoAttuale: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function segnaComePagato() {
    setLoading(true)
    await fetch(`/api/admin/pagamenti/${pagamentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'PAGATO', dataPagamento: new Date().toISOString() }),
    })
    setLoading(false)
    router.refresh()
  }

  async function segnaInRitardo() {
    setLoading(true)
    await fetch(`/api/admin/pagamenti/${pagamentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'IN_RITARDO' }),
    })
    setLoading(false)
    router.refresh()
  }

  if (statoAttuale === 'PAGATO' || statoAttuale === 'ANNULLATO') return null

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={segnaComePagato}
        disabled={loading}
        title="Segna come pagato"
        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50"
      >
        <CheckCircle size={15} />
      </button>
      {statoAttuale === 'IN_ATTESA' && (
        <button
          onClick={segnaInRitardo}
          disabled={loading}
          title="Segna in ritardo"
          className="p-1.5 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600 disabled:opacity-50"
        >
          <Clock size={15} />
        </button>
      )}
    </div>
  )
}
