'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function PasswordForm() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [successo, setSuccesso] = useState(false)
  const t = useTranslations('admin.settings')
  const tc = useTranslations('common')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrore(null)
    setSuccesso(false)

    if (form.newPassword.length < 8) {
      setErrore(t('minCharsError'))
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setErrore(t('passwordsMismatch'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErrore(j.error || `${tc('error')} (${res.status})`)
        setLoading(false)
        return
      }
      setSuccesso(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setErrore(tc('networkError'))
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errore && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {errore}
        </p>
      )}
      {successo && (
        <p className="text-sm text-green-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {t('passwordUpdated')}
        </p>
      )}

      <div>
        <label className="label">{t('currentPassword')}</label>
        <input
          type="password"
          value={form.currentPassword}
          onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
          className="input"
          placeholder="••••••••"
          required
        />
      </div>
      <div>
        <label className="label">{t('newPassword')}</label>
        <input
          type="password"
          value={form.newPassword}
          onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
          className="input"
          placeholder={t('minChars')}
          required
          minLength={8}
        />
      </div>
      <div>
        <label className="label">{t('confirmPassword')}</label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          className="input"
          placeholder="••••••••"
          required
        />
      </div>

      <div className="pt-1">
        <button type="submit" disabled={loading} className="btn-danger text-sm flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {loading ? t('updating') : t('changePassword')}
        </button>
      </div>
    </form>
  )
}
