'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria','Valle d\'Aosta','Veneto'
]

export default function NuovoEventoHostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore('')
    setLoading(true)
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      const res = await fetch('/api/host/eventi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) setErrore(json.error || 'Errore durante la creazione')
      else router.push('/host/eventi')
    } catch {
      setErrore('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/host/eventi" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuovo evento</h1>
          <p className="text-gray-500 text-sm">Inserisci i dettagli del tuo evento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informazioni base */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Informazioni evento</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Titolo evento *</label>
              <input name="titolo" className="input" required placeholder="es. Jazz Festival al Parco" />
            </div>
            <div>
              <label className="label">Categoria *</label>
              <select name="categoria" className="input" required>
                <option value="">— Seleziona —</option>
                <option value="MUSICA">🎵 Musica</option>
                <option value="ARTE">🎨 Arte & Mostre</option>
                <option value="TEATRO">🎭 Teatro & Spettacolo</option>
                <option value="FOOD">🍷 Food & Enogastronomia</option>
                <option value="SPORT">⚽ Sport & Benessere</option>
                <option value="FESTIVAL">🎪 Festival</option>
                <option value="FIERA">🏪 Fiere & Mercati</option>
                <option value="CONFERENZA">🎤 Conferenze & Workshop</option>
                <option value="CINEMA">🎬 Cinema</option>
                <option value="NATURA">🌿 Natura & Outdoor</option>
                <option value="FAMIGLIA">👨‍👩‍👧 Famiglia</option>
                <option value="ALTRO">📌 Altro</option>
              </select>
            </div>
            <div>
              <label className="label">Descrizione</label>
              <textarea name="descrizione" className="input" rows={4} placeholder="Descrivi il tuo evento..." />
            </div>
          </div>
        </div>

        {/* Date e luogo */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Data e luogo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Data inizio *</label>
              <input name="dataInizio" type="date" className="input" required />
            </div>
            <div>
              <label className="label">Data fine (se multi-giorno)</label>
              <input name="dataFine" type="date" className="input" />
            </div>
            <div>
              <label className="label">Orario</label>
              <input name="orario" className="input" placeholder="es. 21:00 - 01:00" />
            </div>
            <div>
              <label className="label">Prezzo / Ingresso</label>
              <input name="prezzo" className="input" placeholder="es. Gratuito, €12, da €5" />
            </div>
            <div>
              <label className="label">Città *</label>
              <input name="citta" className="input" required />
            </div>
            <div>
              <label className="label">Regione *</label>
              <select name="regione" className="input" required>
                <option value="">— Seleziona —</option>
                {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Indirizzo / Luogo</label>
              <input name="indirizzo" className="input" placeholder="es. Parco Sempione, Milano" />
            </div>
            <div>
              <label className="label">Luogo (nome venue)</label>
              <input name="luogo" className="input" placeholder="es. Teatro Sistina" />
            </div>
          </div>
        </div>

        {/* Link */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Link e biglietti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">URL evento</label>
              <input name="urlEvento" type="url" className="input" placeholder="https://" />
            </div>
            <div>
              <label className="label">URL biglietti</label>
              <input name="urlBiglietti" type="url" className="input" placeholder="https://ticketone.it/..." />
            </div>
          </div>
        </div>

        {errore && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errore}</div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg">
          ℹ️ Il tuo evento verrà inviato in revisione al team Otium Week prima di essere pubblicato.
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Invio in corso...' : 'Invia per revisione'}
          </button>
          <Link href="/host/eventi" className="btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
