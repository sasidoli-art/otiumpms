'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NuovoPagamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hostIdParam = searchParams.get('hostId') ?? ''
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [clienti, setClienti] = useState<{ id: string; nomeAzienda: string }[]>([])

  useEffect(() => {
    fetch('/api/admin/clienti?lista=true')
      .then(r => r.json())
      .then(data => setClienti(data))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore('')
    setLoading(true)
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      const res = await fetch('/api/admin/pagamenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) setErrore(json.error || 'Errore')
      else router.push('/admin/pagamenti')
    } catch {
      setErrore('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/pagamenti" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuovo pagamento</h1>
          <p className="text-gray-500 text-sm">Registra un pagamento manuale</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Cliente *</label>
          <select name="hostId" className="input" required defaultValue={hostIdParam}>
            <option value="">Seleziona cliente</option>
            {clienti.map(c => (
              <option key={c.id} value={c.id}>{c.nomeAzienda}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Descrizione</label>
          <input name="descrizione" className="input" placeholder="es. Abbonamento Mensile Aprile 2026" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Importo € *</label>
            <input name="importo" type="number" step="0.01" min="0" className="input" required />
          </div>
          <div>
            <label className="label">Metodo</label>
            <select name="metodo" className="input">
              <option value="">—</option>
              <option value="Bonifico">Bonifico</option>
              <option value="Carta">Carta</option>
              <option value="Contanti">Contanti</option>
              <option value="PayPal">PayPal</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data scadenza</label>
            <input name="dataScadenza" type="date" className="input" />
          </div>
          <div>
            <label className="label">Stato</label>
            <select name="stato" className="input">
              <option value="IN_ATTESA">In attesa</option>
              <option value="PAGATO">Pagato</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Riferimento (CRO / transazione)</label>
          <input name="riferimento" className="input" />
        </div>
        <div>
          <label className="label">Note</label>
          <textarea name="note" className="input" rows={2} />
        </div>

        {errore && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errore}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Salvataggio...' : 'Salva pagamento'}
          </button>
          <Link href="/admin/pagamenti" className="btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
