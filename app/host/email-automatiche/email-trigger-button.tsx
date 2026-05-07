'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'

export default function EmailTriggerButton() {
  const [loading, setLoading] = useState(false)
  const [risultato, setRisultato] = useState<{ totale: number; reminderArrivo: number; followUp: number; reminderSpa: number; errori: number } | null>(null)
  const router = useRouter()

  async function inviaOra() {
    setLoading(true)
    setRisultato(null)
    try {
      const res = await fetch('/api/host/email-automatiche/invia', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setRisultato(data)
        router.refresh()
      }
    } catch (err) { console.error(err) 
      // ignore
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      {risultato && (
        <div className="text-xs text-gray-500 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Inviate <strong>{risultato.totale}</strong> email
          {risultato.errori > 0 && <span className="text-red-500 ml-1">({risultato.errori} errori)</span>}
        </div>
      )}
      <button
        onClick={inviaOra}
        disabled={loading}
        className="btn-primary flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? 'Invio in corso...' : 'Invia ora'}
      </button>
    </div>
  )
}
