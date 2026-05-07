'use client'

import { useEffect } from 'react'

export default function SuperAdminHostDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[superadmin/host/[id]] error:', error)
  }, [error])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-red-600 mb-4">Errore caricamento Host</h2>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 space-y-2 text-sm font-mono break-all">
        <p><span className="font-semibold">Messaggio:</span> {error.message || '(nessun messaggio)'}</p>
        {error.digest && (
          <p><span className="font-semibold">Digest:</span> {error.digest}</p>
        )}
        {error.stack && (
          <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">{error.stack}</pre>
        )}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
      >
        Riprova
      </button>
    </div>
  )
}
