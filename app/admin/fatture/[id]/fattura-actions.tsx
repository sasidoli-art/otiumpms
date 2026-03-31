'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Check, X, Loader2, MoreVertical, FileText, FileCode } from 'lucide-react'

export function FatturaActions({
  fatturaId,
  statoAttuale,
  emailCliente,
}: {
  fatturaId: string
  statoAttuale: string
  emailCliente: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [menu, setMenu] = useState(false)

  async function aggiornaStato(stato: string) {
    setLoading(true)
    setMenu(false)
    await fetch(`/api/admin/fatture/${fatturaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    setLoading(false)
    router.refresh()
  }

  async function inviaFattura() {
    setLoading(true)
    setMenu(false)
    await fetch(`/api/admin/fatture/${fatturaId}/invia`, {
      method: 'POST',
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative flex items-center gap-2">
      {(statoAttuale === 'BOZZA' || statoAttuale === 'INVIATA') && (
        <button
          onClick={inviaFattura}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {statoAttuale === 'BOZZA' ? 'Invia al cliente' : 'Reinvia'}
        </button>
      )}

      <button
        onClick={() => setMenu(!menu)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
      >
        <MoreVertical size={18} />
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 w-44">
            {statoAttuale !== 'PAGATA' && (
              <button
                onClick={() => aggiornaStato('PAGATA')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full"
              >
                <Check size={14} />
                Segna come pagata
              </button>
            )}
            {statoAttuale !== 'INVIATA' && statoAttuale !== 'PAGATA' && (
              <button
                onClick={() => aggiornaStato('INVIATA')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 w-full"
              >
                <Send size={14} />
                Segna come inviata
              </button>
            )}
            {statoAttuale !== 'ANNULLATA' && (
              <button
                onClick={() => aggiornaStato('ANNULLATA')}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full"
              >
                <X size={14} />
                Annulla fattura
              </button>
            )}
            <div className="border-t border-gray-100 my-1" />
            <a
              href={`/api/admin/fatture/${fatturaId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
            >
              <FileText size={14} />
              Scarica PDF
            </a>
            <a
              href={`/api/admin/fatture/${fatturaId}/xml`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50 w-full"
            >
              <FileCode size={14} />
              FatturaPA XML (SDI)
            </a>
          </div>
        </>
      )}
    </div>
  )
}
