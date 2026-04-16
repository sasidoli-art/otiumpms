'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, Calendar, LogIn, Wrench, Info, Sparkles,
  CheckCheck, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'

type Notifica = {
  id: string
  tipo: string
  titolo: string
  messaggio: string | null
  letta: boolean
  linkUrl: string | null
  createdAt: string
}

const TIPO_ICON: Record<string, { icon: React.ReactNode; label: string }> = {
  prenotazione: { icon: <Calendar className="w-4 h-4 text-indigo-500" />, label: 'Prenotazione' },
  checkin:      { icon: <LogIn className="w-4 h-4 text-green-500" />, label: 'Check-in' },
  manutenzione: { icon: <Wrench className="w-4 h-4 text-orange-500" />, label: 'Manutenzione' },
  spa:          { icon: <Sparkles className="w-4 h-4 text-purple-500" />, label: 'SPA' },
  sistema:      { icon: <Info className="w-4 h-4 text-blue-500" />, label: 'Sistema' },
}

const FILTRI_TIPO = [
  { value: '', label: 'Tutte' },
  { value: 'prenotazione', label: 'Prenotazioni' },
  { value: 'checkin', label: 'Check-in' },
  { value: 'spa', label: 'SPA' },
  { value: 'manutenzione', label: 'Manutenzione' },
  { value: 'sistema', label: 'Sistema' },
]

export default function NotificheClient({
  notifiche: iniziali,
  totale,
  nonLette,
  tipiCount,
  filtroTipo,
  pagina,
  perPage,
}: {
  notifiche: Notifica[]
  totale: number
  nonLette: number
  tipiCount: Record<string, number>
  filtroTipo: string
  pagina: number
  perPage: number
}) {
  const [notifiche, setNotifiche] = useState(iniziali)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const totalPages = Math.ceil(totale / perPage)

  async function leggiTutte() {
    setLoading('leggiTutte')
    await fetch('/api/host/notifiche?leggiTutte=true', { method: 'DELETE' })
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })))
    setLoading(null)
    router.refresh()
  }

  async function eliminaLette() {
    if (!confirm('Eliminare tutte le notifiche lette?')) return
    setLoading('elimina')
    await fetch('/api/host/notifiche', { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  async function leggiUna(id: string, linkUrl: string | null) {
    await fetch(`/api/host/notifiche/${id}`, { method: 'PATCH' })
    setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letta: true } : n))
    if (linkUrl) router.push(linkUrl)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totale} totali · {nonLette} non lette
          </p>
        </div>
        <div className="flex items-center gap-2">
          {nonLette > 0 && (
            <button
              onClick={leggiTutte}
              disabled={loading === 'leggiTutte'}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              {loading === 'leggiTutte' ? 'Aggiornamento...' : 'Segna tutte lette'}
            </button>
          )}
          <button
            onClick={eliminaLette}
            disabled={loading === 'elimina'}
            className="btn-secondary flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            {loading === 'elimina' ? 'Eliminazione...' : 'Pulisci lette'}
          </button>
        </div>
      </div>

      {/* Filtri tipo */}
      <div className="flex gap-2 flex-wrap">
        {FILTRI_TIPO.map(f => (
          <Link
            key={f.value}
            href={`/host/notifiche${f.value ? `?tipo=${f.value}` : ''}`}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              filtroTipo === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.value && tipiCount[f.value] ? ` (${tipiCount[f.value]})` : ''}
          </Link>
        ))}
      </div>

      {/* Lista notifiche */}
      {notifiche.length === 0 ? (
        <div className="card py-16 text-center">
          <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessuna notifica trovata</p>
          <p className="text-sm text-gray-400 mt-1">
            Qui appariranno le notifiche su prenotazioni, check-in, SPA, manutenzione e aggiornamenti di sistema.
          </p>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-gray-50">
          {notifiche.map(n => {
            const tipoInfo = TIPO_ICON[n.tipo] ?? { icon: <Bell className="w-4 h-4 text-gray-500" />, label: n.tipo }
            return (
              <button
                key={n.id}
                onClick={() => leggiUna(n.id, n.linkUrl)}
                className={`w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${
                  n.letta ? 'opacity-50' : ''
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${n.letta ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                  {tipoInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm text-gray-900 ${!n.letta ? 'font-bold' : 'font-medium'}`}>
                      {n.titolo}
                    </p>
                    {!n.letta && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />}
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-50 rounded-full ml-auto shrink-0">
                      {tipoInfo.label}
                    </span>
                  </div>
                  {n.messaggio && (
                    <p className="text-sm text-gray-500 mt-0.5">{n.messaggio}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(n.createdAt), 'd MMM yyyy HH:mm', { locale: it })}
                    {' · '}
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Pagina {pagina} di {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {pagina > 1 && (
              <Link
                href={`/host/notifiche?${filtroTipo ? `tipo=${filtroTipo}&` : ''}pagina=${pagina - 1}`}
                className="btn-secondary flex items-center gap-1 text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Precedente
              </Link>
            )}
            {pagina < totalPages && (
              <Link
                href={`/host/notifiche?${filtroTipo ? `tipo=${filtroTipo}&` : ''}pagina=${pagina + 1}`}
                className="btn-secondary flex items-center gap-1 text-sm"
              >
                Successiva <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
