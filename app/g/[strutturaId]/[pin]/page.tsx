import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Wifi, Utensils, Sparkles, MessageSquare, MapPin, LogOut,
  BedDouble, Clock, Info, ChevronRight,
} from 'lucide-react'
import { parseModuli } from '@/lib/moduli'

export const dynamic = 'force-dynamic'

/**
 * Guest portal pubblico — accesso tramite QR code in camera.
 * URL: /g/{strutturaId}/{pin}
 *
 * Il PIN e` generato alla conferma della prenotazione (4 cifre, unique per host).
 * Ogni camera ha un QR stampato con URL fisso al checkin/onboarding dell'ospite.
 */
export default async function GuestPortalPage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string; pin: string }>
}) {
  const { strutturaId, pin } = await paramsPromise

  if (!/^\d{4}$/.test(pin)) notFound()

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: {
      id: true, nome: true, hostId: true,
      logo: true, colorePrimario: true, fotoHero: true,
      indirizzo: true, citta: true,
      host: { select: { nomeAzienda: true, telefono: true, moduliAttivi: true } },
    },
  })
  if (!struttura) notFound()

  // Cerca prenotazione attiva (oggi compresa tra arrivo e partenza)
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const prenotazione = await prisma.prenotazione.findFirst({
    where: {
      hostId: struttura.hostId,
      strutturaId,
      pin,
      deletedAt: null,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { lte: oggi },
      OR: [
        { dataPartenza: null },
        { dataPartenza: { gte: oggi } },
      ],
    },
    select: {
      id: true,
      guestNome: true, guestCognome: true,
      dataArrivo: true, dataPartenza: true,
      unita: { select: { nome: true } },
      chat: { select: { id: true } },
    },
  })

  const moduli = parseModuli(struttura.host.moduliAttivi)
  const colore = struttura.colorePrimario ?? '#4f46e5'

  if (!prenotazione) {
    return <InvalidPin strutturaNome={struttura.nome} colore={colore} />
  }

  // Tiles attivi in base a moduli + funzionalita` disponibili
  type LucideIcon = typeof Wifi
  const tiles: { href: string; icon: LucideIcon; label: string; desc?: string; tone: string }[] = []

  tiles.push({
    href: `/g/${strutturaId}/${pin}/wifi`,
    icon: Wifi, label: 'Wi-Fi', desc: 'Connettiti alla rete',
    tone: 'blue',
  })

  if (moduli.ristorazione) {
    tiles.push({
      href: `/book/${strutturaId}/pasti?prenotazione=${prenotazione.id}`,
      icon: Utensils, label: 'Ristorante', desc: 'Menu e prenotazioni',
      tone: 'orange',
    })
  }

  if (moduli.spa) {
    tiles.push({
      href: `/book/${strutturaId}/spa`,
      icon: Sparkles, label: 'SPA', desc: 'Trattamenti e benessere',
      tone: 'violet',
    })
  }

  tiles.push({
    href: prenotazione.chat
      ? `/book/chat/${prenotazione.chat.id}`
      : `/book/${strutturaId}/chat?prenotazione=${prenotazione.id}`,
    icon: MessageSquare, label: 'Chat', desc: 'Scrivi alla reception',
    tone: 'emerald',
  })

  tiles.push({
    href: `/g/${strutturaId}/${pin}/directory`,
    icon: MapPin, label: 'Struttura', desc: 'Orari e servizi',
    tone: 'teal',
  })

  tiles.push({
    href: `/checkin/${prenotazione.id}?mode=checkout`,
    icon: LogOut, label: 'Checkout', desc: 'Firma e paga',
    tone: 'amber',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero branded */}
      <div
        className="relative h-40 md:h-48 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colore}, ${colore}ee)` }}
      >
        {struttura.fotoHero && (
          <img
            src={struttura.fotoHero}
            alt={struttura.nome}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="relative h-full flex items-end p-5 md:p-6">
          <div className="text-white">
            {struttura.logo ? (
              <img src={struttura.logo} alt={struttura.nome} className="h-10 mb-2 drop-shadow" />
            ) : null}
            <h1 className="text-xl md:text-2xl font-extrabold drop-shadow">{struttura.nome}</h1>
            <p className="text-sm text-white/85 mt-1">
              Benvenuto, <strong>{prenotazione.guestNome}</strong>
              {prenotazione.unita?.nome ? ` · ${prenotazione.unita.nome}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Info soggiorno */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-slate-100">
            <BedDouble className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold text-slate-900 truncate">
              {prenotazione.guestNome} {prenotazione.guestCognome}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              Dal {fmtData(prenotazione.dataArrivo)}
              {prenotazione.dataPartenza ? ` al ${fmtData(prenotazione.dataPartenza)}` : ''}
            </p>
          </div>
        </div>

        {/* Tiles principali */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`group relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 ${TONE_BG[t.tone] ?? 'bg-slate-100'}`}>
                <t.icon size={22} className={TONE_ICON[t.tone] ?? 'text-slate-600'} />
              </div>
              <p className="text-sm font-bold text-slate-900">{t.label}</p>
              {t.desc && <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>}
              <ChevronRight size={14} className="absolute top-3 right-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>
          ))}
        </div>

        {/* Footer contatti */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800">Hai bisogno di aiuto?</p>
            <p>
              Chiama {struttura.host.nomeAzienda}
              {struttura.host.telefono ? ` al ${struttura.host.telefono}` : ''}.
              {' '}O scrivi nella chat qui sopra.
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 pt-2">
          Powered by Otium PMS
        </p>
      </div>
    </div>
  )
}

const TONE_BG: Record<string, string> = {
  blue: 'bg-blue-50',
  orange: 'bg-orange-50',
  violet: 'bg-violet-50',
  emerald: 'bg-emerald-50',
  teal: 'bg-teal-50',
  amber: 'bg-amber-50',
}
const TONE_ICON: Record<string, string> = {
  blue: 'text-blue-600',
  orange: 'text-orange-600',
  violet: 'text-violet-600',
  emerald: 'text-emerald-600',
  teal: 'text-teal-600',
  amber: 'text-amber-600',
}

function fmtData(d: Date): string {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function InvalidPin({ strutturaNome, colore }: { strutturaNome: string; colore: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: `${colore}20`, color: colore }}
        >
          <Info size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">{strutturaNome}</h1>
        <p className="text-sm text-slate-600">
          Nessun soggiorno attivo trovato con questo PIN.<br />
          Se il tuo arrivo è previsto a breve, contatta la reception.
        </p>
      </div>
    </div>
  )
}
