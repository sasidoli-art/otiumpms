'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { formatValuta } from '@/lib/formatters'

type Struttura = { id: string; nome: string; unita: UnitaPrenotabile[] }
type UnitaPrenotabile = { id: string; nome: string }

export default function NuovaPrenotazionePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [strutture, setStrutture] = useState<Struttura[]>([])
  const [strutturaId, setStrutturaId] = useState(searchParams.get('strutturaId') ?? '')
  const [unitaId, setUnitaId] = useState(searchParams.get('unitaId') ?? '')
  const [dataArrivo, setDataArrivo] = useState(searchParams.get('dataArrivo') ?? '')
  const [dataPartenza, setDataPartenza] = useState(searchParams.get('dataPartenza') ?? '')
  const [prezzoSuggerito, setPrezzoSuggerito] = useState<number | null>(null)
  const [calcolando, setCalcolando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-fill from URL params (used by calendario click-to-book)
  const prefillUnitaId = searchParams.get('unitaId') ?? ''
  const prefillArrivo = searchParams.get('dataArrivo') ?? ''
  const prefillPartenza = searchParams.get('dataPartenza') ?? ''

  useEffect(() => {
    fetch('/api/host/strutture')
      .then((r) => r.json())
      .then((data) => {
        setStrutture(Array.isArray(data) ? data : [])
        // Auto-select struttura from URL param
        const paramStruttura = searchParams.get('strutturaId')
        if (paramStruttura && data.some((s: Struttura) => s.id === paramStruttura)) {
          setStrutturaId(paramStruttura)
        }
      })
  }, [searchParams])

  const unitaStruttura = strutture.find((s) => s.id === strutturaId)?.unita ?? []

  // Calcolo prezzo automatico quando cambiano unità + date
  useEffect(() => {
    if (!strutturaId || !unitaId || !dataArrivo || !dataPartenza) {
      setPrezzoSuggerito(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCalcolando(true)
      try {
        const url = `/api/host/strutture/${strutturaId}/calcola-prezzo?unitaId=${unitaId}&dataArrivo=${dataArrivo}&dataPartenza=${dataPartenza}`
        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          setPrezzoSuggerito(json.prezzoTotale)
        } else {
          setPrezzoSuggerito(null)
        }
      } catch {
        setPrezzoSuggerito(null)
      } finally {
        setCalcolando(false)
      }
    }, 400)
  }, [strutturaId, unitaId, dataArrivo, dataPartenza])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())

    const res = await fetch('/api/host/prenotazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const j = await res.json()
      setError(j.error || 'Errore durante la creazione')
      setLoading(false)
      return
    }

    const p = await res.json()
    router.push(`/host/prenotazioni/${p.id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/host/prenotazioni" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuova prenotazione</h1>
          <p className="text-sm text-gray-500">Inserimento manuale</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Struttura</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Struttura</label>
            <select
              name="strutturaId"
              className="input"
              value={strutturaId}
              onChange={(e) => setStrutturaId(e.target.value)}
            >
              <option value="">Senza struttura</option>
              {strutture.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Unità</label>
            <select name="unitaId" className="input" disabled={!strutturaId} defaultValue={prefillUnitaId}>
              <option value="">Tutte le unità</option>
              {unitaStruttura.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-t border-gray-100 pt-4">
          Dati ospite
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nome *</label>
            <input name="guestNome" required className="input" />
          </div>
          <div>
            <label className="label">Cognome *</label>
            <input name="guestCognome" required className="input" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input name="guestEmail" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Telefono</label>
            <input name="guestTelefono" type="tel" className="input" />
          </div>
          <div>
            <label className="label">Lingua preferita</label>
            <select name="guestLingua" className="input" defaultValue="it">
              <option value="it">🇮🇹 Italiano</option>
              <option value="en">🇬🇧 English</option>
              <option value="de">🇩🇪 Deutsch</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="es">🇪🇸 Español</option>
            </select>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-t border-gray-100 pt-4">
          Dettagli soggiorno
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data arrivo *</label>
            <input
              name="dataArrivo" type="date" required className="input"
              value={dataArrivo} onChange={e => setDataArrivo(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data partenza</label>
            <input
              name="dataPartenza" type="date" className="input"
              value={dataPartenza} onChange={e => setDataPartenza(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Num. ospiti</label>
            <input name="numOspiti" type="number" min={1} defaultValue={1} className="input" />
          </div>
          <div>
            <label className="label">Fonte</label>
            <select name="fonte" className="input">
              <option value="Diretto">Diretto</option>
              <option value="Web">Web</option>
              <option value="Telefono">Telefono</option>
              <option value="Email">Email</option>
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-2">
              Prezzo totale (€)
              {calcolando && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              {prezzoSuggerito !== null && !calcolando && (
                <span className="text-[11px] font-normal text-brand-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> suggerito: {formatValuta(prezzoSuggerito)}
                </span>
              )}
            </label>
            <input
              name="prezzoTotale" type="number" step="0.01" min={0} className="input"
              defaultValue={prezzoSuggerito ?? undefined}
              key={prezzoSuggerito ?? 'prezzo'}
            />
            {prezzoSuggerito !== null && !calcolando && (
              <p className="text-xs text-gray-400 mt-1">
                Calcolato da tariffe e regole dinamiche. Puoi modificarlo manualmente.
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className="label">Note ospite</label>
            <textarea name="guestNote" rows={2} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Note interne</label>
            <textarea name="noteInterne" rows={2} className="input" />
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvataggio...' : 'Crea prenotazione'}
          </button>
          <Link href="/host/prenotazioni" className="btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
