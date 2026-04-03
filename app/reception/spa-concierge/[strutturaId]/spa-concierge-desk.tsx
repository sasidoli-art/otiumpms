'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, CheckCircle2, AlertCircle, FileCheck, Send, QrCode, X, Sparkles, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import QRCode from 'qrcode'

type Appuntamento = {
  id: string
  guestNome: string
  guestEmail: string | null
  orario: string
  durata: number
  stato: string
  servizio: string
  cabina: string | null
  cabinaId: string | null
  terapista: string | null
  note: string | null
  camera: string | null
  wellnessCardCompilata: boolean
  checkedIn: boolean
}

type Struttura = { nome: string; logo: string | null; colorePrimario: string | null }

export default function SpaConciergeDesk({ strutturaId, strutturaNome, logo, colore }: { strutturaId: string; strutturaNome: string; logo: string | null; colore: string }) {
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([])
  const [struttura, setStruttura] = useState<Struttura | null>(null)
  const [selezionato, setSelezionato] = useState<Appuntamento | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/reception/spa-concierge/${strutturaId}`)
      if (res.ok) {
        const d = await res.json()
        setAppuntamenti(d.appuntamenti)
        setStruttura(d.struttura)
        // Aggiorna selezionato se attivo
        setSelezionato(prev => {
          if (!prev) return null
          const aggiornato = d.appuntamenti.find((a: Appuntamento) => a.id === prev.id)
          return aggiornato ?? prev
        })
      }
    } catch (err) { console.error('[spa-concierge poll]', err) }
  }, [strutturaId])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [poll])

  async function generaQR(appId: string) {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/spa/wellness-card/${appId}`
    const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: '#4c1d95' } })
    setQrUrl(dataUrl)
  }

  async function checkinSpa(appId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/reception/spa-concierge/${strutturaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appuntamentoId: appId }),
      })
      if (res.ok) {
        await poll()
        setSelezionato(null)
      } else {
        console.error('[spa-concierge checkin] failed:', res.status)
      }
    } catch (err) {
      console.error('[spa-concierge checkin]', err)
    }
    setLoading(false)
  }

  const prossimi = appuntamenti.filter(a => !a.checkedIn)
  const inCorso = appuntamenti.filter(a => a.checkedIn)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${colore}08, #faf5ff)` }}>
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-purple-100">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="h-10" />
          ) : (
            <Sparkles className="w-8 h-8" style={{ color: colore }} />
          )}
          <div>
            <h1 className="text-xl font-heading font-bold text-gray-900">SPA Concierge</h1>
            <p className="text-xs text-gray-400">{strutturaNome} · {format(new Date(), 'EEEE d MMMM', { locale: it })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Online
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* In attesa */}
        {prossimi.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">In arrivo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {prossimi.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelezionato(a); setQrUrl(null) }}
                  className={`text-left bg-white rounded-2xl p-5 shadow-sm border-2 transition-all hover:shadow-md active:scale-[0.98] ${
                    selezionato?.id === a.id ? 'border-purple-400 shadow-purple-100' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{a.guestNome}</p>
                      <p className="text-sm text-gray-400">{a.servizio}</p>
                    </div>
                    {a.wellnessCardCompilata ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <FileCheck className="w-3 h-3" /> Wellness Card
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Da compilare
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(new Date(a.orario), 'HH:mm')}</span>
                    <span>{a.durata} min</span>
                    {a.cabina && <span>{a.cabina}</span>}
                    {a.terapista && <span>{a.terapista}</span>}
                    {a.camera && <span>Camera {a.camera}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* In corso */}
        {inCorso.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">In trattamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inCorso.map(a => (
                <div key={a.id} className="bg-purple-50 rounded-2xl p-5 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">{a.guestNome}</p>
                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">In corso</span>
                  </div>
                  <p className="text-sm text-gray-500">{a.servizio} · {a.cabina} · {a.terapista}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(a.orario), 'HH:mm')} — {a.durata} min</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vuoto */}
        {appuntamenti.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Sparkles className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nessun appuntamento oggi</p>
          </div>
        )}
      </div>

      {/* Modal dettaglio appuntamento */}
      {selezionato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-heading font-bold text-gray-900">{selezionato.guestNome}</h2>
                <p className="text-sm text-gray-400">{selezionato.servizio} · {format(new Date(selezionato.orario), 'HH:mm')} · {selezionato.durata} min</p>
              </div>
              <button onClick={() => { setSelezionato(null); setQrUrl(null) }} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selezionato.cabina && <div><p className="text-xs text-gray-400">Cabina</p><p className="font-semibold">{selezionato.cabina}</p></div>}
                {selezionato.terapista && <div><p className="text-xs text-gray-400">Terapista</p><p className="font-semibold">{selezionato.terapista}</p></div>}
                {selezionato.camera && <div><p className="text-xs text-gray-400">Camera hotel</p><p className="font-semibold">{selezionato.camera}</p></div>}
              </div>

              {selezionato.note && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-800">
                  <p className="text-xs font-bold text-amber-600 mb-1">Note</p>
                  {selezionato.note}
                </div>
              )}

              {/* Wellness Card status */}
              {selezionato.wellnessCardCompilata ? (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-green-700">Wellness Card compilata</p>
                  <p className="text-xs text-green-600 mt-1">L&apos;ospite ha completato la dichiarazione</p>
                </div>
              ) : (
                <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-amber-700">Wellness Card da compilare</p>
                  </div>

                  {/* QR code */}
                  {qrUrl ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <img src={qrUrl} alt="QR Wellness Card" className="w-44 h-44" />
                      <p className="text-xs text-gray-400 text-center">L&apos;ospite scansiona con il telefono</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => generaQR(selezionato.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                        style={{ background: colore }}
                      >
                        <QrCode className="w-4 h-4" /> Mostra QR
                      </button>
                      <a
                        href={`/spa/wellness-card/${selezionato.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all"
                        style={{ borderColor: colore, color: colore }}
                      >
                        <Send className="w-4 h-4" /> Compila qui
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Check-in SPA */}
              {selezionato.wellnessCardCompilata && !selezionato.checkedIn && (
                <button
                  onClick={() => checkinSpa(selezionato.id)}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: colore }}
                >
                  <UserCheck className="w-5 h-5" />
                  {loading ? 'Check-in...' : 'Accompagna in cabina'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
