'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NuovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore('')
    setLoading(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/admin/clienti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setErrore(json.error || 'Errore durante la creazione')
      } else {
        router.push(`/admin/clienti/${json.id}`)
      }
    } catch {
      setErrore('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/clienti" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuovo cliente</h1>
          <p className="text-gray-500 text-sm mt-0.5">Registra un nuovo host sulla piattaforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dati accesso */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Dati di accesso</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input name="nome" className="input" required />
            </div>
            <div>
              <label className="label">Cognome *</label>
              <input name="cognome" className="input" required />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" className="input" required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input name="password" type="password" className="input" required minLength={8} />
            </div>
          </div>
        </div>

        {/* Dati azienda */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Dati azienda</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome azienda / organizzazione *</label>
              <input name="nomeAzienda" className="input" required />
            </div>
            <div>
              <label className="label">Partita IVA</label>
              <input name="partitaIva" className="input" />
            </div>
            <div>
              <label className="label">Codice Fiscale</label>
              <input name="codiceFiscale" className="input" />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input name="telefono" type="tel" className="input" />
            </div>
            <div>
              <label className="label">Sito Web</label>
              <input name="sitoWeb" type="url" className="input" placeholder="https://" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Indirizzo</label>
              <input name="indirizzo" className="input" />
            </div>
            <div>
              <label className="label">Città</label>
              <input name="citta" className="input" />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input name="provincia" className="input" maxLength={2} />
            </div>
            <div>
              <label className="label">CAP</label>
              <input name="cap" className="input" maxLength={5} />
            </div>
            <div>
              <label className="label">Regione</label>
              <input name="regione" className="input" />
            </div>
          </div>
        </div>

        {/* Piano abbonamento */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Piano abbonamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Piano *</label>
              <select name="piano" className="input" required>
                <option value="EVENTO_SINGOLO">Evento Singolo — €49</option>
                <option value="VISIBILITA_MENSILE">Visibilità Mensile — €149/mese</option>
                <option value="PARTNER_PREMIUM">Partner Premium — €349/mese</option>
              </select>
            </div>
            <div>
              <label className="label">Stato abbonamento</label>
              <select name="statoAbbonamento" className="input">
                <option value="IN_PROVA">In prova</option>
                <option value="ATTIVO">Attivo</option>
                <option value="SOSPESO">Sospeso</option>
              </select>
            </div>
            <div>
              <label className="label">Data inizio</label>
              <input name="dataInizioAbb" type="date" className="input" />
            </div>
            <div>
              <label className="label">Data fine / scadenza</label>
              <input name="dataFineAbb" type="date" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Note interne</label>
              <textarea name="note" className="input" rows={3} />
            </div>
          </div>
        </div>

        {errore && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {errore}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Creazione...' : 'Crea cliente'}
          </button>
          <Link href="/admin/clienti" className="btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
