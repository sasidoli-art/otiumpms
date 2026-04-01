'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Bell, Check, CheckCheck, X, Loader2, Calendar, Wrench, LogIn, Info, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { it, enUS } from 'date-fns/locale'

type Notifica = {
  id: string
  tipo: string
  titolo: string
  messaggio: string | null
  letta: boolean
  linkUrl: string | null
  createdAt: string
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  prenotazione: <Calendar className="w-4 h-4 text-indigo-500" />,
  checkin:      <LogIn className="w-4 h-4 text-green-500" />,
  spa:          <Sparkles className="w-4 h-4 text-purple-500" />,
  manutenzione: <Wrench className="w-4 h-4 text-orange-500" />,
  sistema:      <Info className="w-4 h-4 text-blue-500" />,
}

const DATE_LOCALES: Record<string, typeof it> = { it, en: enUS }

export function NotificheBell() {
  const t = useTranslations('notifications')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [nonLette, setNonLette] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  async function fetchNotifiche() {
    setLoading(true)
    const res = await fetch('/api/host/notifiche?limit=20', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setNotifiche(data.notifiche)
      setNonLette(data.nonLette)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifiche()
    const interval = setInterval(fetchNotifiche, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function leggiTutte() {
    await fetch('/api/host/notifiche?leggiTutte=true', { method: 'DELETE' })
    setNotifiche(p => p.map(n => ({ ...n, letta: true })))
    setNonLette(0)
  }

  async function leggiUna(id: string, linkUrl: string | null) {
    await fetch(`/api/host/notifiche/${id}`, { method: 'PATCH' })
    setNotifiche(p => p.map(n => n.id === id ? { ...n, letta: true } : n))
    setNonLette(p => Math.max(0, p - 1))
    if (linkUrl) {
      setOpen(false)
      router.push(linkUrl)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifiche() }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        title={t('title')}
      >
        <Bell className="w-5 h-5" />
        {nonLette > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1">
            {nonLette > 99 ? '99+' : nonLette}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{t('title')}</p>
              {nonLette > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">{nonLette} {t('new')}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {nonLette > 0 && (
                <button onClick={leggiTutte} className="text-xs text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1" title={t('readAll')}>
                  <CheckCheck className="w-3.5 h-3.5" /> {t('readAll')}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifiche.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : notifiche.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-gray-300">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-xs">{t('none')}</p>
              </div>
            ) : notifiche.map(n => (
              <button
                key={n.id}
                onClick={() => leggiUna(n.id, n.linkUrl)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${n.letta ? 'opacity-60' : ''}`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${n.letta ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                  {TIPO_ICON[n.tipo] ?? <Bell className="w-4 h-4 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-semibold text-gray-800 truncate ${!n.letta ? 'font-bold' : ''}`}>
                      {n.titolo}
                    </p>
                    {!n.letta && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />}
                  </div>
                  {n.messaggio && <p className="text-xs text-gray-400 truncate mt-0.5">{n.messaggio}</p>}
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: DATE_LOCALES[locale] ?? it })}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href="/host/notifiche"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1"
            >
              {t('viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
