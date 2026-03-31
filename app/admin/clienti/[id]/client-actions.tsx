'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Edit, Trash2, UserX, UserCheck } from 'lucide-react'

export function ClienteActions({ hostId }: { hostId: string }) {
  const [aperto, setAperto] = useState(false)
  const router = useRouter()

  async function cambiaStato(stato: string) {
    await fetch(`/api/admin/clienti/${hostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statoAbbonamento: stato }),
    })
    setAperto(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAperto(!aperto)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <MoreVertical size={18} />
      </button>
      {aperto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAperto(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 w-48">
            <a
              href={`/admin/clienti/${hostId}/modifica`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Edit size={14} />
              Modifica
            </a>
            <button
              onClick={() => cambiaStato('SOSPESO')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 w-full"
            >
              <UserX size={14} />
              Sospendi
            </button>
            <button
              onClick={() => cambiaStato('ATTIVO')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full"
            >
              <UserCheck size={14} />
              Attiva
            </button>
          </div>
        </>
      )}
    </div>
  )
}
