'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'

export default function AprChat({ prenotazioneId }: { prenotazioneId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function apriChat() {
    setLoading(true)
    // Crea la chat tramite l'API prenotazione - la chat si crea automaticamente  
    // oppure possiamo crearla separatamente. Per ora refreshiamo.
    const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/chat`, {
      method: 'POST',
    })
    if (res.ok) router.refresh()
    setLoading(false)
  }

  return (
    <div className="text-center py-8">
      <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500 mb-4">
        Apri una chat per comunicare direttamente con l&apos;ospite
      </p>
      <button onClick={apriChat} disabled={loading} className="btn-primary">
        {loading ? 'Apertura...' : 'Apri chat'}
      </button>
    </div>
  )
}
