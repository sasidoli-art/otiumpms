'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function NuovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')
  const t = useTranslations('admin.clients')
  const tc = useTranslations('common')

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
        setErrore(json.error || tc('unexpectedError'))
      } else {
        router.push(`/admin/clienti/${json.id}`)
      }
    } catch {
      setErrore(tc('networkError'))
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
          <h1 className="text-2xl font-bold text-gray-900">{t('newClient')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Registra un nuovo host sulla piattaforma</p>{/* TODO: i18n */}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dati accesso */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Dati di accesso</h2>{/* TODO: i18n */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{tc('name')} *</label>
              <input name="nome" className="input" required />
            </div>
            <div>
              <label className="label">{tc('surname')} *</label>
              <input name="cognome" className="input" required />
            </div>
            <div>
              <label className="label">{tc('email')} *</label>
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
          <h2 className="font-semibold text-gray-900 mb-4">Dati azienda</h2>{/* TODO: i18n */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome azienda / organizzazione *</label>{/* TODO: i18n */}
              <input name="nomeAzienda" className="input" required />
            </div>
            <div>
              <label className="label">Partita IVA</label>{/* TODO: i18n */}
              <input name="partitaIva" className="input" />
            </div>
            <div>
              <label className="label">Codice Fiscale</label>{/* TODO: i18n */}
              <input name="codiceFiscale" className="input" />
            </div>
            <div>
              <label className="label">{tc('phone')}</label>
              <input name="telefono" type="tel" className="input" />
            </div>
            <div>
              <label className="label">Sito Web</label>{/* TODO: i18n */}
              <input name="sitoWeb" type="url" className="input" placeholder="https://" />
            </div>
            <div className="md:col-span-2">
              <label className="label">{tc('address')}</label>
              <input name="indirizzo" className="input" />
            </div>
            <div>
              <label className="label">{tc('city')}</label>
              <input name="citta" className="input" />
            </div>
            <div>
              <label className="label">{tc('province')}</label>
              <input name="provincia" className="input" maxLength={2} />
            </div>
            <div>
              <label className="label">{tc('cap')}</label>
              <input name="cap" className="input" maxLength={5} />
            </div>
            <div>
              <label className="label">{tc('region')}</label>
              <input name="regione" className="input" />
            </div>
          </div>
        </div>

        {/* Piano abbonamento */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Piano abbonamento</h2>{/* TODO: i18n */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Piano *</label>{/* TODO: i18n */}
              <select name="piano" className="input" required>
                <option value="EVENTO_SINGOLO">{t('singleEvent')} — €49</option>
                <option value="VISIBILITA_MENSILE">{t('monthlyVisibility')} — €149/mese</option>
                <option value="PARTNER_PREMIUM">{t('premiumPartner')} — €349/mese</option>
              </select>
            </div>
            <div>
              <label className="label">{tc('status')}</label>
              <select name="statoAbbonamento" className="input">
                <option value="IN_PROVA">{t('trial')}</option>
                <option value="ATTIVO">{t('active')}</option>
                <option value="SOSPESO">{t('suspended')}</option>
              </select>
            </div>
            <div>
              <label className="label">Data inizio</label>{/* TODO: i18n */}
              <input name="dataInizioAbb" type="date" className="input" />
            </div>
            <div>
              <label className="label">Data fine / scadenza</label>{/* TODO: i18n */}
              <input name="dataFineAbb" type="date" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">{tc('notes')}</label>
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
            {loading ? 'Creazione...' : `${tc('create')} ${t('title').toLowerCase()}`}
          </button>
          <Link href="/admin/clienti" className="btn-secondary">{tc('cancel')}</Link>
        </div>
      </form>
    </div>
  )
}
