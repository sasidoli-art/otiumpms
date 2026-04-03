'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, User, Star, AlertTriangle, Heart, Droplets, Music, Thermometer, MapPin, History, Sparkles } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

type CabinaData = {
  stato: 'idle' | 'attivo'
  cabina: { nome: string; colore: string; fotoSfondo: string | null; hostNome: string; hostLogo: string | null }
  prossimo?: { dataOra: string; guestNome: string; trattamento: string | null } | null
  appuntamento?: {
    id: string
    guestNome: string
    lingua: string
    dataOra: string
    durata: number
    servizio: string
    servizioDescrizione: string | null
    terapista: string | null
    note: string | null
    camera: string | null
    repeater: boolean
    visitePrecedenti: number
    storico: { trattamento: string; data: string; note: string | null }[]
    waiver: {
      firmato: boolean
      zoneTrattate: string[]
      zoneEvitare: string[]
      incinta: boolean
      incintaMesi: number | null
      condizioni: string[]
      allergie: string[]
      patologie: string | null
      farmaci: string | null
      pressione: string | null
      temperatura: string | null
      musica: string | null
      aromi: string | null
      notePreferenze: string | null
    } | null
  }
}

const ZONE_LABELS: Record<string, string> = {
  testa: 'Testa', collo: 'Collo', spalle: 'Spalle', braccia: 'Braccia', mani: 'Mani',
  petto: 'Petto', addome: 'Addome', schienaAlta: 'Schiena alta', schienaBassa: 'Schiena bassa',
  glutei: 'Glutei', gambe: 'Gambe', ginocchia: 'Ginocchia', piedi: 'Piedi', viso: 'Viso',
}

export default function CabinaDisplay({ cabinaId, cabinaNome, colore, fotoSfondo }: { cabinaId: string; cabinaNome: string; colore: string; fotoSfondo: string | null }) {
  const [data, setData] = useState<CabinaData | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/reception/spa/${cabinaId}`)
      if (res.ok) setData(await res.json())
    } catch { /* retry */ }
  }, [cabinaId])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [poll])

  const bgStyle = fotoSfondo
    ? { backgroundImage: `url(${fotoSfondo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, ${colore}15, ${colore}05)` }

  // ─── IDLE ─────────────────────────────────────────────────
  if (!data || data.stato === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={bgStyle}>
        {fotoSfondo && <div className="absolute inset-0 bg-black/30" />}
        <div className="relative z-10 text-center space-y-6 animate-fadeIn">
          {data?.cabina.hostLogo ? (
            <img src={data.cabina.hostLogo} alt="" className="h-16 mx-auto opacity-80" />
          ) : (
            <Sparkles className="w-12 h-12 mx-auto opacity-40" style={{ color: colore }} />
          )}
          <h1 className={`text-3xl font-heading font-bold ${fotoSfondo ? 'text-white' : 'text-gray-800'}`}>{cabinaNome}</h1>

          {data?.prossimo ? (
            <div className={`space-y-2 ${fotoSfondo ? 'text-white/80' : 'text-gray-400'}`}>
              <p className="text-sm">Prossimo appuntamento</p>
              <p className="text-lg font-semibold">{data.prossimo.guestNome}</p>
              <p className="text-sm">{data.prossimo.trattamento}</p>
              <p className="text-sm flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(data.prossimo.dataOra), 'HH:mm', { locale: it })}
                {' — '}
                {formatDistanceToNow(new Date(data.prossimo.dataOra), { addSuffix: true, locale: it })}
              </p>
            </div>
          ) : (
            <p className={`text-lg ${fotoSfondo ? 'text-white/60' : 'text-gray-300'}`}>Nessun appuntamento</p>
          )}

          <div className={`flex items-center justify-center gap-2 text-xs ${fotoSfondo ? 'text-white/40' : 'text-gray-300'}`}>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Display attivo
          </div>
        </div>
      </div>
    )
  }

  // ─── ATTIVO — Scheda ospite ───────────────────────────────
  const app = data.appuntamento!
  const w = app.waiver

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(180deg, ${colore}10, white)` }}>
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: colore }}>
            {app.guestNome.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-gray-900">{app.guestNome}</h1>
              {app.repeater && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3" /> Repeater · {app.visitePrecedenti}x
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {app.camera && `Camera ${app.camera} · `}
              {app.lingua !== 'it' && `${app.lingua.toUpperCase()} · `}
              {format(new Date(app.dataOra), 'HH:mm')} — {app.durata} min
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{cabinaNome}</p>
          {app.terapista && <p className="text-sm font-semibold text-gray-600">{app.terapista}</p>}
        </div>
      </div>

      <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto">
        {/* Colonna SX — Trattamento + Note */}
        <div className="space-y-4">
          {/* Trattamento */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: colore }} /> Trattamento
            </h2>
            <p className="text-lg font-bold text-gray-900">{app.servizio}</p>
            {app.servizioDescrizione && <p className="text-sm text-gray-500 mt-1">{app.servizioDescrizione}</p>}
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {app.durata} min</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {app.terapista ?? 'Da assegnare'}</span>
            </div>
          </div>

          {/* Note */}
          {app.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Note dell&apos;ospite</p>
              <p className="text-sm text-amber-800">{app.note}</p>
            </div>
          )}

          {/* Preferenze */}
          {w && (w.pressione || w.temperatura || w.musica || w.aromi || w.notePreferenze) && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Preferenze</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {w.pressione && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Heart className="w-4 h-4 text-pink-400" /> Pressione: <strong>{w.pressione}</strong>
                  </div>
                )}
                {w.temperatura && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Thermometer className="w-4 h-4 text-orange-400" /> Temp: <strong>{w.temperatura}</strong>
                  </div>
                )}
                {w.musica && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Music className="w-4 h-4 text-indigo-400" /> Musica: <strong>{w.musica}</strong>
                  </div>
                )}
                {w.aromi && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Droplets className="w-4 h-4 text-teal-400" /> Aromi: <strong>{w.aromi}</strong>
                  </div>
                )}
              </div>
              {w.notePreferenze && <p className="text-xs text-gray-500 mt-2 italic">{w.notePreferenze}</p>}
            </div>
          )}

          {/* Storico */}
          {app.storico.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> Storico ({app.visitePrecedenti} visite)
              </h2>
              <div className="space-y-2">
                {app.storico.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700 font-medium">{s.trattamento}</span>
                    <span className="text-gray-400">{format(new Date(s.data), 'd MMM yyyy', { locale: it })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonna DX — Waiver / Salute */}
        <div className="space-y-4">
          {/* Alert salute */}
          {w && (w.incinta || w.condizioni.length > 0 || w.allergie.length > 0 || w.patologie || w.farmaci) ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Attenzione — Condizioni mediche
              </h2>
              <div className="space-y-2 text-sm">
                {w.incinta && (
                  <p className="text-red-700 font-semibold">
                    Incinta{w.incintaMesi ? ` (${w.incintaMesi} mesi)` : ''}
                  </p>
                )}
                {w.condizioni.length > 0 && (
                  <div>
                    <p className="text-red-600 font-medium">Condizioni:</p>
                    <p className="text-red-700">{w.condizioni.join(', ')}</p>
                  </div>
                )}
                {w.allergie.length > 0 && (
                  <div>
                    <p className="text-red-600 font-medium">Allergie:</p>
                    <p className="text-red-700">{w.allergie.join(', ')}</p>
                  </div>
                )}
                {w.patologie && <p className="text-red-700"><strong>Patologie:</strong> {w.patologie}</p>}
                {w.farmaci && <p className="text-red-700"><strong>Farmaci:</strong> {w.farmaci}</p>}
              </div>
            </div>
          ) : w?.firmato ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-sm text-green-700 font-semibold">Waiver firmato — Nessuna condizione segnalata</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-700 font-semibold">Waiver non ancora compilato</p>
            </div>
          )}

          {/* Body map — zone */}
          {w && (w.zoneTrattate.length > 0 || w.zoneEvitare.length > 0) && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Zone corpo
              </h2>
              {w.zoneTrattate.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-green-600 mb-1">Da trattare</p>
                  <div className="flex flex-wrap gap-1.5">
                    {w.zoneTrattate.map(z => (
                      <span key={z} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {ZONE_LABELS[z] ?? z}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {w.zoneEvitare.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Da evitare</p>
                  <div className="flex flex-wrap gap-1.5">
                    {w.zoneEvitare.map(z => (
                      <span key={z} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {ZONE_LABELS[z] ?? z}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
