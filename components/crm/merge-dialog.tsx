'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, GitMerge, AlertTriangle, Crown, Ban, Check } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

type OspiteRec = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  nazionalita: string | null
  tags: string[]
  vip: boolean
  blacklist: boolean
  numSoggiorni: number
  totaleSpeso: number
  dataUltimoSoggiorno: string | null
  createdAt: string
}

type Duplicato = {
  ospite: OspiteRec
  motivi: string[]
  score: number
}

const MOTIVO_LABEL: Record<string, string> = {
  email: 'Stessa email',
  telefono: 'Stesso telefono',
  nome_cognome: 'Stesso nome+cognome',
}

export default function MergeDialog({
  ospiteCorrenteId,
  onClose,
  onMerged,
}: {
  ospiteCorrenteId: string
  onClose: () => void
  onMerged?: (keepId: string) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [ospite, setOspite] = useState<OspiteRec | null>(null)
  const [duplicati, setDuplicati] = useState<Duplicato[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [keepId, setKeepId] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [errore, setErrore] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/host/crm/${ospiteCorrenteId}/duplicati`)
    if (res.ok) {
      const data = await res.json()
      setOspite(data.ospite)
      setDuplicati(data.duplicati)
      if (data.duplicati.length > 0) setSelectedId(data.duplicati[0].ospite.id)
      setKeepId(ospiteCorrenteId)
    } else {
      setErrore('Errore nel caricamento dei duplicati')
    }
    setLoading(false)
  }, [ospiteCorrenteId])

  useEffect(() => { load() }, [load])

  const duplicatoSel = duplicati.find((d) => d.ospite.id === selectedId)

  async function handleMerge() {
    if (!ospite || !duplicatoSel || !keepId) return
    const mergeId = keepId === ospite.id ? duplicatoSel.ospite.id : ospite.id
    setMerging(true); setErrore('')
    const res = await fetch('/api/host/crm/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepId, mergeId }),
    })
    if (!res.ok) {
      const j = await res.json()
      setErrore(j.error || 'Errore unione')
      setMerging(false); return
    }
    setMerging(false)
    if (onMerged) onMerged(keepId)
    else router.push(`/host/crm/${keepId}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-brand-500" /> Unisci schede duplicate
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          )}

          {!loading && duplicati.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-sm">Nessun duplicato trovato per questa scheda.</p>
            </div>
          )}

          {!loading && duplicati.length > 0 && ospite && (
            <>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-yellow-800">
                  <p className="font-semibold">Attenzione: operazione non reversibile</p>
                  <p className="text-xs mt-0.5">La scheda selezionata come &quot;da unire&quot; verrà anonimizzata.
                  Appuntamenti SPA, chat WhatsApp e punti fedeltà saranno trasferiti alla scheda conservata.</p>
                </div>
              </div>

              {/* Duplicati list */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Potenziali duplicati:</p>
                {duplicati.map((d) => (
                  <button
                    key={d.ospite.id}
                    onClick={() => setSelectedId(d.ospite.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === d.ospite.id ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm flex items-center gap-1">
                          {d.ospite.cognome} {d.ospite.nome}
                          {d.ospite.vip && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                          {d.ospite.blacklist && <Ban className="w-3.5 h-3.5 text-red-500" />}
                        </p>
                        <p className="text-xs text-gray-500">{d.ospite.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {d.motivi.map((m) => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 font-medium">
                            {MOTIVO_LABEL[m] ?? m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Side-by-side comparison */}
              {duplicatoSel && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-semibold text-gray-700">Scegli quale scheda conservare:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <CompareCard
                      rec={ospite}
                      selected={keepId === ospite.id}
                      label="Scheda corrente"
                      onSelect={() => setKeepId(ospite.id)}
                    />
                    <CompareCard
                      rec={duplicatoSel.ospite}
                      selected={keepId === duplicatoSel.ospite.id}
                      label="Duplicato"
                      onSelect={() => setKeepId(duplicatoSel.ospite.id)}
                    />
                  </div>
                </div>
              )}

              {errore && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errore}</div>
              )}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={handleMerge}
                  disabled={merging || !keepId || !duplicatoSel}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                  {merging ? 'Unione in corso…' : 'Unisci schede'}
                </button>
                <button onClick={onClose} className="btn-secondary" disabled={merging}>Annulla</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CompareCard({
  rec, selected, label, onSelect,
}: {
  rec: OspiteRec; selected: boolean; label: string; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-3 rounded-lg border-2 transition-colors ${
        selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
        {selected && <Check className="w-4 h-4 text-brand-500" />}
      </div>
      <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
        {rec.cognome} {rec.nome}
        {rec.vip && <Crown className="w-3 h-3 text-yellow-500" />}
        {rec.blacklist && <Ban className="w-3 h-3 text-red-500" />}
      </p>
      <p className="text-xs text-gray-600 truncate">{rec.email}</p>
      {rec.telefono && <p className="text-xs text-gray-500">{rec.telefono}</p>}
      <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1 text-[11px]">
        <div>
          <span className="text-gray-400">Soggiorni:</span>
          <span className="ml-1 font-semibold text-gray-700">{rec.numSoggiorni}</span>
        </div>
        <div>
          <span className="text-gray-400">Speso:</span>
          <span className="ml-1 font-semibold text-gray-700">€{rec.totaleSpeso.toFixed(0)}</span>
        </div>
      </div>
      {rec.dataUltimoSoggiorno && (
        <p className="text-[10px] text-gray-400 mt-1">
          Ultimo: {format(new Date(rec.dataUltimoSoggiorno), 'd MMM yyyy', { locale: it })}
        </p>
      )}
      {rec.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {rec.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
          ))}
        </div>
      )}
    </button>
  )
}
