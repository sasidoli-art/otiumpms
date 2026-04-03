'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export function EventoActions({ eventoId, statoAttuale }: { eventoId: string; statoAttuale: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const tc = useTranslations('common')

  async function aggiornaStato(stato: string) {
    setLoading(true)
    await fetch(`/api/admin/eventi/${eventoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/eventi/${eventoId}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title={tc('open')}>
        <Eye size={15} />
      </Link>
      {statoAttuale !== 'APPROVATO' && (
        <button
          onClick={() => aggiornaStato('APPROVATO')}
          disabled={loading}
          className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 disabled:opacity-50"
          title="Approva"
        >
          <CheckCircle size={15} />
        </button>
      )}
      {statoAttuale !== 'RIFIUTATO' && (
        <button
          onClick={() => aggiornaStato('RIFIUTATO')}
          disabled={loading}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-50"
          title="Rifiuta"
        >
          <XCircle size={15} />
        </button>
      )}
    </div>
  )
}
