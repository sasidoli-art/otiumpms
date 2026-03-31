'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatValuta } from '@/lib/utils'

interface RigaFattura {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva: number
  totale: number
}

export default function NuovaFatturaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hostIdParam = searchParams.get('hostId') ?? ''

  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const [clienti, setClienti] = useState<{ id: string; nomeAzienda: string; fattEmail?: string; fattPartitaIva?: string; fattIndirizzo?: string; fattCitta?: string; fattCap?: string; fattProvincia?: string; fattPec?: string; fattCodiceSDI?: string }[]>([])
  const [hostSelezionato, setHostSelezionato] = useState<typeof clienti[0] | null>(null)
  const [righe, setRighe] = useState<RigaFattura[]>([
    { descrizione: '', quantita: 1, prezzoUnitario: 0, iva: 22, totale: 0 }
  ])

  useEffect(() => {
    fetch('/api/admin/clienti?lista=true&fatturazione=true')
      .then(r => r.json())
      .then(data => {
        setClienti(data)
        if (hostIdParam) {
          const h = data.find((c: { id: string }) => c.id === hostIdParam)
          if (h) setHostSelezionato(h)
        }
      })
  }, [hostIdParam])

  function aggiornaRiga(i: number, campo: keyof RigaFattura, valore: string | number) {
    const nuoveRighe = [...righe]
    nuoveRighe[i] = { ...nuoveRighe[i], [campo]: valore }
    const r = nuoveRighe[i]
    nuoveRighe[i].totale = r.quantita * r.prezzoUnitario * (1 + r.iva / 100)
    setRighe(nuoveRighe)
  }

  function aggiungiRiga() {
    setRighe([...righe, { descrizione: '', quantita: 1, prezzoUnitario: 0, iva: 22, totale: 0 }])
  }

  function rimuoviRiga(i: number) {
    setRighe(righe.filter((_, idx) => idx !== i))
  }

  const imponibile = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0)
  const iva = righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario * (r.iva / 100), 0)
  const totale = imponibile + iva

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrore('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      hostId: formData.get('hostId'),
      clienteNome: formData.get('clienteNome'),
      clientePIva: formData.get('clientePIva'),
      clienteIndirizzo: formData.get('clienteIndirizzo'),
      clienteCitta: formData.get('clienteCitta'),
      clienteCap: formData.get('clienteCap'),
      clienteProvincia: formData.get('clienteProvincia'),
      clienteEmail: formData.get('clienteEmail'),
      clientePec: formData.get('clientePec'),
      clienteSDI: formData.get('clienteSDI'),
      dataEmissione: formData.get('dataEmissione'),
      dataScadenza: formData.get('dataScadenza'),
      note: formData.get('note'),
      righe,
      imponibile,
      iva,
      totale,
    }

    try {
      const res = await fetch('/api/admin/fatture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) setErrore(json.error || 'Errore')
      else router.push(`/admin/fatture/${json.id}`)
    } catch {
      setErrore('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/fatture" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuova fattura</h1>
          <p className="text-gray-500 text-sm">Crea una fattura per un cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selezione cliente */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Cliente</h2>
          <div className="mb-4">
            <label className="label">Seleziona cliente *</label>
            <select
              name="hostId"
              className="input"
              required
              defaultValue={hostIdParam}
              onChange={e => {
                const h = clienti.find(c => c.id === e.target.value)
                setHostSelezionato(h || null)
              }}
            >
              <option value="">— Seleziona —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nomeAzienda}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Ragione sociale / Nome *</label>
              <input name="clienteNome" className="input" required defaultValue={hostSelezionato?.nomeAzienda ?? ''} key={hostSelezionato?.id + '_nome'} />
            </div>
            <div>
              <label className="label">Partita IVA</label>
              <input name="clientePIva" className="input" defaultValue={hostSelezionato?.fattPartitaIva ?? ''} key={hostSelezionato?.id + '_piva'} />
            </div>
            <div>
              <label className="label">Email fatturazione</label>
              <input name="clienteEmail" type="email" className="input" defaultValue={hostSelezionato?.fattEmail ?? ''} key={hostSelezionato?.id + '_email'} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Indirizzo</label>
              <input name="clienteIndirizzo" className="input" defaultValue={hostSelezionato?.fattIndirizzo ?? ''} key={hostSelezionato?.id + '_ind'} />
            </div>
            <div>
              <label className="label">Città</label>
              <input name="clienteCitta" className="input" defaultValue={hostSelezionato?.fattCitta ?? ''} key={hostSelezionato?.id + '_citta'} />
            </div>
            <div>
              <label className="label">CAP</label>
              <input name="clienteCap" className="input" defaultValue={hostSelezionato?.fattCap ?? ''} key={hostSelezionato?.id + '_cap'} />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input name="clienteProvincia" className="input" defaultValue={hostSelezionato?.fattProvincia ?? ''} key={hostSelezionato?.id + '_prov'} maxLength={2} />
            </div>
            <div>
              <label className="label">PEC</label>
              <input name="clientePec" type="email" className="input" defaultValue={hostSelezionato?.fattPec ?? ''} key={hostSelezionato?.id + '_pec'} />
            </div>
            <div>
              <label className="label">Codice SDI</label>
              <input name="clienteSDI" className="input" defaultValue={hostSelezionato?.fattCodiceSDI ?? ''} key={hostSelezionato?.id + '_sdi'} maxLength={7} />
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Date fattura</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data emissione *</label>
              <input name="dataEmissione" type="date" className="input" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Data scadenza</label>
              <input name="dataScadenza" type="date" className="input" />
            </div>
          </div>
        </div>

        {/* Righe */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Righe fattura</h2>
            <button type="button" onClick={aggiungiRiga} className="btn-secondary flex items-center gap-1 text-sm py-1.5">
              <Plus size={14} />
              Aggiungi riga
            </button>
          </div>

          <div className="space-y-3">
            {righe.map((riga, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="label">Descrizione</label>}
                  <input
                    value={riga.descrizione}
                    onChange={e => aggiornaRiga(i, 'descrizione', e.target.value)}
                    className="input"
                    placeholder="Abbonamento Mensile — Maggio 2026"
                    required
                  />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="label">Qtà</label>}
                  <input
                    type="number"
                    value={riga.quantita}
                    onChange={e => aggiornaRiga(i, 'quantita', parseFloat(e.target.value) || 0)}
                    className="input text-center"
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Prezzo €</label>}
                  <input
                    type="number"
                    step="0.01"
                    value={riga.prezzoUnitario}
                    onChange={e => aggiornaRiga(i, 'prezzoUnitario', parseFloat(e.target.value) || 0)}
                    className="input"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">IVA %</label>}
                  <select
                    value={riga.iva}
                    onChange={e => aggiornaRiga(i, 'iva', parseFloat(e.target.value))}
                    className="input"
                  >
                    <option value={0}>0%</option>
                    <option value={4}>4%</option>
                    <option value={10}>10%</option>
                    <option value={22}>22%</option>
                  </select>
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="label">Totale</label>}
                  <p className="text-sm font-medium text-gray-700 py-2">{formatValuta(riga.totale)}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  {righe.length > 1 && (
                    <button
                      type="button"
                      onClick={() => rimuoviRiga(i)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totali */}
          <div className="mt-6 border-t border-gray-100 pt-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Imponibile</span>
                <span>{formatValuta(imponibile)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA</span>
                <span>{formatValuta(iva)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                <span>Totale</span>
                <span>{formatValuta(totale)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="card p-6">
          <label className="label">Note (opzionale)</label>
          <textarea name="note" className="input" rows={3} placeholder="Note aggiuntive sulla fattura..." />
        </div>

        {errore && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errore}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Creazione...' : 'Crea fattura'}
          </button>
          <Link href="/admin/fatture" className="btn-secondary">Annulla</Link>
        </div>
      </form>
    </div>
  )
}
