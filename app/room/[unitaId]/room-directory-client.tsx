'use client'

import { useState } from 'react'
import {
  Wifi, UtensilsCrossed, Waves, Phone, Mail, MapPin, Clock,
  Loader2, KeyRound, Bot, Sparkles, Shirt, Wrench, CalendarDays,
  Coffee, Wine, Dumbbell, Car, Sun, Shield, ChevronRight,
  ScrollText, Bus, ShoppingBag, Utensils, ExternalLink,
} from 'lucide-react'
import { isModuloAttivo } from '@/lib/moduli'
import { PublicConciergeWidget } from '@/components/book/public-concierge-widget'

type GuestData = {
  nome: string
  cognome: string
  prenotazioneId: string
  camera: { nome: string } | null
  soggiorno: { dataArrivo: string; dataPartenza: string; numOspiti: number }
  servizi: Record<string, boolean>
}

type GuidaEntry = {
  id: string
  categoria: 'REGOLE_CASA' | 'COME_FUNZIONA' | 'RISTORANTI' | 'ATTRAZIONI' | 'EMERGENZE' | 'TRASPORTI' | 'SERVIZI_ZONA'
  titolo: string
  descrizione: string | null
  fotoUrl: string | null
  indirizzo: string | null
  distanzaKm: number | null
  mapsLink: string | null
  telefono: string | null
  orari: string | null
  websiteUrl: string | null
}

const CATEGORIA_META: Record<GuidaEntry['categoria'], { titolo: string; icon: typeof ScrollText; color: string }> = {
  REGOLE_CASA:   { titolo: 'Regole della casa',   icon: ScrollText,  color: 'text-slate-600' },
  COME_FUNZIONA: { titolo: 'Come funziona',       icon: Wrench,      color: 'text-orange-600' },
  RISTORANTI:    { titolo: 'Ristoranti consigliati', icon: Utensils, color: 'text-rose-600' },
  ATTRAZIONI:    { titolo: 'Cosa fare in zona',   icon: MapPin,      color: 'text-emerald-600' },
  EMERGENZE:     { titolo: 'Numeri utili',        icon: Phone,       color: 'text-red-600' },
  TRASPORTI:     { titolo: 'Trasporti',           icon: Bus,         color: 'text-blue-600' },
  SERVIZI_ZONA:  { titolo: 'Servizi nella zona',  icon: ShoppingBag, color: 'text-purple-600' },
}

export default function RoomDirectoryClient({
  unitaId, unitaNome, unitaDescrizione,
  hostId, hostNome, strutturaNome, strutturaCitta, strutturaIndirizzo,
  telefono, email, moduliAttivi, conciergeAttivo, strutturaId, guida,
}: {
  unitaId: string
  unitaNome: string
  unitaDescrizione: string | null
  hostId: string
  hostNome: string
  strutturaNome: string
  strutturaCitta: string | null
  strutturaIndirizzo: string | null
  telefono: string | null
  email: string | null
  moduliAttivi: unknown
  conciergeAttivo: boolean
  strutturaId: string
  guida: GuidaEntry[]
}) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guest, setGuest] = useState<GuestData | null>(null)

  async function authenticate(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/guest/auth-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, pin }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'PIN non valido'); return }
      setGuest({
        nome: data.guest.nome,
        cognome: data.guest.cognome,
        prenotazioneId: data.guest.prenotazioneId,
        camera: data.camera,
        soggiorno: data.soggiorno,
        servizi: data.servizi,
      })
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  // ─── PIN Screen ──────────────────────────────────────────────────────────
  if (!guest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center text-white mb-8">
            <div className="w-16 h-16 mx-auto bg-white/10 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold">{hostNome}</h1>
            <p className="text-white/60 text-sm mt-1">{unitaNome}</p>
          </div>

          <form onSubmit={authenticate} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Inserisci il tuo PIN</p>
              <p className="text-xs text-gray-500 mt-1">Lo trovi nella email di conferma prenotazione</p>
            </div>
            <input
              type="text" inputMode="numeric" maxLength={5}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              className="w-full px-4 py-4 text-center text-3xl font-mono tracking-[0.7em] border-2 border-gray-200 rounded-xl focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {error && <p className="text-xs text-red-600 text-center">{error}</p>}
            <button type="submit" disabled={loading || pin.length < 4}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {loading ? 'Verifica...' : 'Accedi ai servizi'}
            </button>
          </form>

          <p className="text-center text-white/40 text-[10px] mt-6">
            {strutturaNome} · {strutturaCitta}
          </p>
        </div>
      </div>
    )
  }

  // ─── Guest Directory ──────────────────────────────────────────────────────
  const hasSpa = isModuloAttivo(moduliAttivi, 'spa')
  const hasRistorazione = isModuloAttivo(moduliAttivi, 'ristorazione')
  const hasEventi = isModuloAttivo(moduliAttivi, 'eventi')
  const hasHK = isModuloAttivo(moduliAttivi, 'housekeeping')
  const hasManutenzione = isModuloAttivo(moduliAttivi, 'manutenzione')
  const hasConcierge = isModuloAttivo(moduliAttivi, 'concierge') && conciergeAttivo

  const checkout = guest.soggiorno.dataPartenza
    ? new Date(guest.soggiorno.dataPartenza).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 pt-8 pb-12 rounded-b-3xl">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">{hostNome}</p>
        <h1 className="text-2xl font-bold mt-1">Benvenuto, {guest.nome}</h1>
        <p className="text-white/60 text-sm mt-1">
          {unitaNome} · {strutturaNome}
        </p>
        {checkout && (
          <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Check-out: <strong>{checkout}</strong> entro le 10:00</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="px-5 -mt-6">
        <div className="grid grid-cols-3 gap-3">
          <QuickAction icon={<Phone className="w-5 h-5" />} label="Reception" color="blue"
            onClick={() => telefono && (window.location.href = `tel:${telefono}`)} />
          <QuickAction icon={<Wifi className="w-5 h-5" />} label="Wi-Fi" color="indigo"
            onClick={() => window.open(`/wifi/login?h=${hostId}`, '_blank')} />
          {hasConcierge && (
            <QuickAction icon={<Bot className="w-5 h-5" />} label="Concierge AI" color="purple"
              onClick={() => {
                const el = document.getElementById('concierge-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }} />
          )}
          {!hasConcierge && email && (
            <QuickAction icon={<Mail className="w-5 h-5" />} label="Email" color="purple"
              onClick={() => window.location.href = `mailto:${email}`} />
          )}
        </div>
      </div>

      {/* Services */}
      <div className="px-5 mt-6 space-y-3 pb-24">
        {/* Info struttura */}
        <ServiceCard icon={<MapPin className="w-5 h-5 text-green-600" />} title="La struttura">
          <p className="text-sm text-gray-700">{strutturaNome}</p>
          {strutturaIndirizzo && <p className="text-xs text-gray-500 mt-0.5">{strutturaIndirizzo}, {strutturaCitta}</p>}
          {unitaDescrizione && <p className="text-xs text-gray-500 mt-2 italic">{unitaDescrizione}</p>}
          {telefono && (
            <a href={`tel:${telefono}`} className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 font-semibold">
              <Phone className="w-3 h-3" /> {telefono}
            </a>
          )}
        </ServiceCard>

        {/* Colazione / Ristorazione */}
        {hasRistorazione && (
          <ServiceCard icon={<Coffee className="w-5 h-5 text-amber-600" />} title="Colazione & Ristorazione">
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span><strong>Colazione</strong>: 7:30 — 10:30 (salone piano terra)</span>
              </div>
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-3 h-3 text-gray-400" />
                <span><strong>Ristorante</strong>: 19:30 — 22:00 (chiuso lunedi)</span>
              </div>
              <div className="flex items-center gap-2">
                <Wine className="w-3 h-3 text-gray-400" />
                <span><strong>Bar</strong>: 11:00 — 23:00 (terrazza panoramica)</span>
              </div>
            </div>
            <a href={`/book/${strutturaId}/pasti?prenotazione=${guest.prenotazioneId}`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
              Scegli i tuoi pasti <ChevronRight className="w-3 h-3" />
            </a>
          </ServiceCard>
        )}

        {/* SPA */}
        {hasSpa && (
          <ServiceCard icon={<Waves className="w-5 h-5 text-cyan-600" />} title="SPA & Benessere">
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <span><strong>Orari</strong>: 10:00 — 20:00 (tutti i giorni)</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-gray-400" />
                <span>Massaggio rilassante 50min da €70</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-gray-400" />
                <span>Percorso benessere 2h da €40/persona</span>
              </div>
            </div>
            <a href={`/book/${strutturaId}/spa`}
              className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-600 font-semibold">
              Prenota trattamento <ChevronRight className="w-3 h-3" />
            </a>
          </ServiceCard>
        )}

        {/* Servizi camera */}
        {hasHK && (
          <ServiceCard icon={<Shirt className="w-5 h-5 text-indigo-600" />} title="Servizi in camera">
            <div className="grid grid-cols-2 gap-2">
              <ServiceButton label="Asciugamani extra" emoji="🛁" />
              <ServiceButton label="Cuscini extra" emoji="🛏️" />
              <ServiceButton label="Servizio in camera" emoji="🍽️" />
              <ServiceButton label="Minibar refill" emoji="🧊" />
            </div>
          </ServiceCard>
        )}

        {/* Manutenzione */}
        {hasManutenzione && (
          <ServiceCard icon={<Wrench className="w-5 h-5 text-orange-600" />} title="Segnala un problema">
            <p className="text-xs text-gray-500">Qualcosa non funziona in camera? Segnalalo qui e interveniamo subito.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ServiceButton label="Aria condizionata" emoji="❄️" />
              <ServiceButton label="Acqua calda" emoji="🚿" />
              <ServiceButton label="TV / WiFi" emoji="📺" />
              <ServiceButton label="Altro" emoji="🔧" />
            </div>
          </ServiceCard>
        )}

        {/* Eventi locali — fallback se host non ha popolato la guida ATTRAZIONI */}
        {hasEventi && !guida.some(g => g.categoria === 'ATTRAZIONI') && (
          <ServiceCard icon={<CalendarDays className="w-5 h-5 text-purple-600" />} title="Cosa fare in zona">
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <Sun className="w-3 h-3 text-gray-400" />
                <span>Gite a cavallo — martedi e giovedi, €45/persona</span>
              </div>
              <div className="flex items-center gap-2">
                <Dumbbell className="w-3 h-3 text-gray-400" />
                <span>Noleggio biciclette — €15/giorno alla reception</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>Visite guidate centro storico — sabato mattina, €20/persona</span>
              </div>
            </div>
          </ServiceCard>
        )}

        {/* Guida dinamica dal DB — una card per categoria con almeno una entry attiva */}
        {(['REGOLE_CASA', 'COME_FUNZIONA', 'RISTORANTI', 'ATTRAZIONI', 'EMERGENZE', 'TRASPORTI', 'SERVIZI_ZONA'] as const).map(cat => {
          const entries = guida.filter(g => g.categoria === cat)
          if (entries.length === 0) return null
          const meta = CATEGORIA_META[cat]
          const Icon = meta.icon
          return (
            <ServiceCard key={cat} icon={<Icon className={`w-5 h-5 ${meta.color}`} />} title={meta.titolo}>
              <ul className="space-y-3">
                {entries.map(e => <GuidaRow key={e.id} entry={e} />)}
              </ul>
            </ServiceCard>
          )
        })}

        {/* Info utili */}
        <ServiceCard icon={<Shield className="w-5 h-5 text-gray-600" />} title="Info utili">
          <div className="space-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-gray-400" />
              <span><strong>Wi-Fi</strong>: rete &quot;{hostNome}&quot;, usa il tuo PIN per connetterti</span>
            </div>
            <div className="flex items-center gap-2">
              <Car className="w-3 h-3 text-gray-400" />
              <span><strong>Parcheggio</strong>: gratuito, 20 posti disponibili</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span><strong>Reception</strong>: 24/7 — interno 0 dal telefono in camera</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-gray-400" />
              <span><strong>Emergenze</strong>: guardia medica a 5 min, chiamiamo noi</span>
            </div>
          </div>
        </ServiceCard>

        {/* Concierge AI */}
        {hasConcierge && (
          <div id="concierge-section">
            <ServiceCard icon={<Bot className="w-5 h-5 text-purple-600" />} title="Concierge AI">
              <p className="text-xs text-gray-500">Hai domande? Il nostro assistente virtuale e disponibile 24/7.</p>
            </ServiceCard>
          </div>
        )}
      </div>

      {/* Chat AI widget */}
      {hasConcierge && (
        <PublicConciergeWidget strutturaId={strutturaId} strutturaNome={strutturaNome} />
      )}
    </div>
  )
}

function QuickAction({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick?: () => void }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  }
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border shadow-sm ${colors[color] || colors.blue} active:scale-95 transition-transform`}>
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  )
}

function ServiceCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ServiceButton({ label, emoji }: { label: string; emoji: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">
      <span>{emoji}</span> {label}
    </button>
  )
}

function GuidaRow({ entry }: { entry: GuidaEntry }) {
  const hasMeta = entry.indirizzo || entry.distanzaKm != null || entry.telefono || entry.orari || entry.mapsLink || entry.websiteUrl
  return (
    <li className="flex gap-3">
      {entry.fotoUrl && (
         
        <img src={entry.fotoUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-800">{entry.titolo}</p>
        {entry.descrizione && (
          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{entry.descrizione}</p>
        )}
        {hasMeta && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
            {entry.indirizzo && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3 text-gray-400" />{entry.indirizzo}</span>}
            {entry.distanzaKm != null && <span>{entry.distanzaKm} km</span>}
            {entry.orari && <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3 text-gray-400" />{entry.orari}</span>}
            {entry.telefono && (
              <a href={`tel:${entry.telefono}`} className="inline-flex items-center gap-0.5 text-blue-600 font-medium">
                <Phone className="w-3 h-3" />{entry.telefono}
              </a>
            )}
            {entry.mapsLink && (
              <a href={entry.mapsLink} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                Maps <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {entry.websiteUrl && (
              <a href={entry.websiteUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-indigo-600 font-medium">
                Sito <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
