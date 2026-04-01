'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Puzzle } from 'lucide-react'

type Modulo = {
  id: string
  nome: string
  descrizione: string
  icona: string
  categoria: string
  defaultAttivo: boolean
  attivo: boolean
}

const CAT_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  base: { label: 'Moduli Base', desc: 'Funzionalità essenziali — sempre consigliati', color: 'border-blue-200 bg-blue-50' },
  operativo: { label: 'Operatività', desc: 'Strumenti per la gestione quotidiana', color: 'border-green-200 bg-green-50' },
  avanzato: { label: 'Avanzati', desc: 'Feature specializzate per strutture complete', color: 'border-purple-200 bg-purple-50' },
  integrazioni: { label: 'Integrazioni', desc: 'Connessioni con servizi esterni', color: 'border-amber-200 bg-amber-50' },
}

export default function ModuliManager() {
  const [moduli, setModuli] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/host/moduli')
      .then(r => r.json())
      .then(d => setModuli(d.moduli))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(moduloId: string, attivo: boolean) {
    setSaving(moduloId)
    const res = await fetch('/api/host/moduli', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [moduloId]: attivo }),
    })
    if (res.ok) {
      const d = await res.json()
      setModuli(d.moduli)
      router.refresh() // refresh sidebar
    }
    setSaving(null)
  }

  const categorie = ['base', 'operativo', 'avanzato', 'integrazioni']
  const attiviCount = moduli.filter(m => m.attivo).length

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Caricamento moduli...
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Puzzle className="w-6 h-6 text-brand-500" /> Moduli
          </h1>
          <p className="text-sm text-gray-500">
            Attiva solo i moduli di cui hai bisogno — {attiviCount} di {moduli.length} attivi
          </p>
        </div>
      </div>

      {categorie.map(cat => {
        const catModuli = moduli.filter(m => m.categoria === cat)
        if (catModuli.length === 0) return null
        const info = CAT_LABELS[cat]

        return (
          <div key={cat}>
            <div className="mb-3">
              <h2 className="text-sm font-bold text-gray-800">{info.label}</h2>
              <p className="text-xs text-gray-400">{info.desc}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catModuli.map(m => (
                <div
                  key={m.id}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    m.attivo ? `${info.color} shadow-sm` : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${m.attivo ? 'text-gray-900' : 'text-gray-500'}`}>
                        {m.nome}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{m.descrizione}</p>
                    </div>
                    <button
                      onClick={() => toggle(m.id, !m.attivo)}
                      disabled={saving === m.id}
                      className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${
                        m.attivo ? 'bg-brand-500' : 'bg-gray-300'
                      }`}
                    >
                      {saving === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin absolute top-1.5 left-4 text-white" />
                      ) : (
                        <span
                          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform flex items-center justify-center ${
                            m.attivo ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        >
                          {m.attivo ? <Check className="w-3 h-3 text-brand-500" /> : <X className="w-3 h-3 text-gray-400" />}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
