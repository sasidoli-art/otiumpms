'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface InitialData {
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  emailMittente: string | null
}

interface Props {
  hostId: string
  initialData: InitialData
}

export function AdminCanaliForm({ hostId, initialData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errore, setErrore] = useState('')
  const tc = useTranslations('common')
  const ts = useTranslations('admin.settings')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setErrore('')

    const fd = new FormData(e.currentTarget)
    const payload = {
      emailMittente: fd.get('emailMittente') || null,
      smtpHost: fd.get('smtpHost') || null,
      smtpPort: fd.get('smtpPort') ? Number(fd.get('smtpPort')) : null,
      smtpUser: fd.get('smtpUser') || null,
      // Solo aggiorna la password se il campo non è vuoto
      ...(fd.get('smtpPass') ? { smtpPass: fd.get('smtpPass') } : {}),
    }

    try {
      const res = await fetch(`/api/admin/hosts/${hostId}/canali`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setStatus('success')
        router.refresh()
      } else {
        const json = await res.json()
        setErrore(json.error || tc('unexpectedError'))
        setStatus('error')
      }
    } catch {
      setErrore(tc('networkError'))
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email SMTP */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span className="text-sm font-medium text-gray-700">{ts('smtp')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3.5 border-l-2 border-indigo-100">
          <div className="md:col-span-2">
            <label className="label">
              Indirizzo mittente{' '}{/* TODO: i18n */}
              <span className="text-gray-400 font-normal">(es. Villa Otium &lt;info@villa.it&gt;)</span>
            </label>
            <input
              name="emailMittente"
              className="input"
              defaultValue={initialData.emailMittente ?? ''}
              placeholder='"Nome Azienda" <info@azienda.it>'
            />
          </div>
          <div>
            <label className="label">{ts('smtpHost')}</label>
            <input
              name="smtpHost"
              className="input"
              defaultValue={initialData.smtpHost ?? ''}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="label">{ts('port')}</label>
            <input
              name="smtpPort"
              type="number"
              className="input"
              defaultValue={initialData.smtpPort ?? 587}
              placeholder="587"
              min={1}
              max={65535}
            />
          </div>
          <div>
            <label className="label">{ts('user')}</label>
            <input
              name="smtpUser"
              className="input"
              defaultValue={initialData.smtpUser ?? ''}
              placeholder="info@azienda.it"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label">
              {ts('password')}{' '}
              {initialData.smtpPass && (
                <span className="text-green-600 font-normal text-xs">● Configurata</span>
              )}
            </label>
            <input
              name="smtpPass"
              type="password"
              className="input"
              placeholder={initialData.smtpPass ? 'Lascia vuoto per non modificare' : '••••••••'}
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {/* Canali futuri */}
      <div className="space-y-2 pt-2">
        {['WhatsApp Business', 'SMS (Twilio)'].map((canale) => (
          <div
            key={canale}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-400">{canale}</span>
            <span className="text-xs bg-gray-100 text-gray-400 font-medium px-2.5 py-0.5 rounded-full">
              {tc('comingSoon')}
            </span>
          </div>
        ))}
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          <AlertCircle size={15} className="shrink-0" />
          {errore}
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          <CheckCircle2 size={15} className="shrink-0" />
          {tc('savedSuccess')}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {loading ? tc('saving') : tc('save')}
      </button>
    </form>
  )
}
