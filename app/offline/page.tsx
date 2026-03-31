'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sei offline</h1>
        <p className="text-sm text-gray-500 mb-6">
          Controlla la connessione internet e riprova.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Riprova
        </button>
      </div>
    </div>
  )
}
