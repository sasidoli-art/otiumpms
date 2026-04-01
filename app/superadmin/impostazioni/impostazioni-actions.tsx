'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Trash2, RefreshCw } from 'lucide-react'

export default function ImpostazioniActions() {
  const [clearing, setClearing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [message, setMessage] = useState('')

  async function handleClearCache() {
    if (!confirm('Confermi la pulizia di tutte le cache? Questa operazione potrebbe rallentare temporaneamente la piattaforma.')) return
    setClearing(true)
    setMessage('')
    try {
      const res = await fetch('/api/superadmin/system/clear-cache', { method: 'POST' })
      if (res.ok) {
        setMessage('Cache pulita con successo') // TODO: i18n
      } else {
        setMessage('Errore durante la pulizia della cache')
      }
    } catch {
      setMessage('Errore di rete')
    }
    setClearing(false)
  }

  async function handleRegenPrisma() {
    if (!confirm('Confermi la rigenerazione del client Prisma? Potrebbe essere necessario un riavvio.')) return
    setRegenerating(true)
    setMessage('')
    try {
      const res = await fetch('/api/superadmin/system/regen-prisma', { method: 'POST' })
      if (res.ok) {
        setMessage('Prisma client rigenerato con successo') // TODO: i18n
      } else {
        setMessage('Errore durante la rigenerazione')
      }
    } catch {
      setMessage('Errore di rete')
    }
    setRegenerating(false)
  }

  return (
    <div className="card border-2 border-red-200 dark:border-red-900/40">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Zona pericolosa</h2>{/* TODO: i18n */}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Queste azioni possono impattare le prestazioni della piattaforma. Usare con cautela.{/* TODO: i18n */}
      </p>

      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm p-3 rounded-lg mb-4">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className="btn bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2"
        >
          {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Pulisci cache{/* TODO: i18n */}
        </button>

        <button
          onClick={handleRegenPrisma}
          disabled={regenerating}
          className="btn bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2"
        >
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Rigenera Prisma client{/* TODO: i18n */}
        </button>
      </div>
    </div>
  )
}
