import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'
import { Calendar, Users, MapPin, Euro, MessageSquare, LogIn, ExternalLink } from 'lucide-react'
import Link from 'next/link'

/**
 * /book/conferma/[token] — Landing page pubblica conferma prenotazione.
 * L'ospite ci arriva dal link nell'email di conferma.
 * Mostra: branding struttura, riepilogo, foto, link chat, link check-in.
 */
export default async function ConfermaPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const { token } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { checkInToken: token },
    include: {
      struttura: {
        select: {
          nome: true, citta: true, regione: true, indirizzo: true,
          immagini: true, descrizione: true,
          logo: true, colorePrimario: true, coloreSecondario: true,
          fotoHero: true, messaggioChiusura: true,
          linkFacebook: true, linkInstagram: true, linkSitoWeb: true,
        },
      },
      unita: { select: { nome: true, descrizione: true } },
      chat: { select: { id: true } },
      host: { select: { nomeAzienda: true, logo: true } },
    },
  })

  if (!prenotazione) notFound()

  const s = prenotazione.struttura
  const color = s?.colorePrimario ?? '#4f46e5'
  const logo = s?.logo ?? prenotazione.host?.logo
  const hero = s?.fotoHero ?? (s?.immagini?.[0] || null)
  const baseUrl = process.env.NEXTAUTH_URL ?? ''

  const fmtDate = (d: Date) => format(d, "EEEE d MMMM yyyy", { locale: itLocale })
  const notti = prenotazione.dataPartenza
    ? Math.round((prenotazione.dataPartenza.getTime() - prenotazione.dataArrivo.getTime()) / 86400000)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative">
        {hero ? (
          <div className="h-56 sm:h-72 relative">
            <img src={hero} alt={s?.nome ?? ''} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-40" style={{ background: `linear-gradient(135deg, ${color}, ${s?.coloreSecondario ?? color}88)` }} />
        )}

        {/* Logo overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          {logo ? (
            <img src={logo} alt={s?.nome ?? ''} className="h-14 mb-2" />
          ) : (
            <h1 className="text-2xl font-bold">{s?.nome ?? prenotazione.host?.nomeAzienda}</h1>
          )}
          {s?.citta && (
            <p className="text-sm opacity-80 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {s.indirizzo ? `${s.indirizzo}, ` : ''}{s.citta}{s.regione ? `, ${s.regione}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10 pb-12">
        {/* Status card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
          <div className="p-1.5" style={{ background: color }}>
            <p className="text-center text-white text-xs font-bold uppercase tracking-wider">
              Prenotazione {prenotazione.stato === 'CONFERMATA' ? 'confermata' : prenotazione.stato === 'RICHIESTA' ? 'in attesa' : prenotazione.stato.toLowerCase()}
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                Ciao {prenotazione.guestNome}!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {prenotazione.stato === 'CONFERMATA'
                  ? 'Siamo pronti ad accoglierti con grande piacere.'
                  : 'La tua richiesta è stata ricevuta e sarà confermata a breve.'}
              </p>
            </div>

            {/* Dettagli */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-gray-400" />
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{fmtDate(prenotazione.dataArrivo)}</p>
                  {prenotazione.dataPartenza && (
                    <p className="text-gray-500">{fmtDate(prenotazione.dataPartenza)} · {notti} {notti === 1 ? 'notte' : 'notti'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-700">{prenotazione.numOspiti} {prenotazione.numOspiti === 1 ? 'ospite' : 'ospiti'}</p>
              </div>

              {prenotazione.unita && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-700">{prenotazione.unita.nome}</p>
                </div>
              )}

              {prenotazione.prezzoTotale != null && (
                <div className="flex items-center gap-3">
                  <Euro className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold" style={{ color }}>€{prenotazione.prezzoTotale.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* CTA buttons */}
            <div className="space-y-2.5">
              {!prenotazione.checkInCompletato && (
                <a
                  href={`${baseUrl}/checkin/${token}`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide transition-colors"
                  style={{ background: color }}
                >
                  <LogIn className="w-4 h-4" />
                  Check-in online
                </a>
              )}

              {prenotazione.chat && (
                <a
                  href={`${baseUrl}/book/chat/${prenotazione.chat.id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors"
                  style={{ borderColor: color, color }}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chatta con la struttura
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Info struttura */}
        {s?.descrizione && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Info sulla struttura</h3>
            <p className="text-sm text-gray-600 line-clamp-4">{s.descrizione}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-3 pt-4">
          {s?.messaggioChiusura && (
            <p className="text-sm italic text-gray-500">{s.messaggioChiusura}</p>
          )}
          <p className="font-semibold text-gray-700">{s?.nome ?? prenotazione.host?.nomeAzienda}</p>

          {/* Social */}
          <div className="flex items-center justify-center gap-4">
            {s?.linkSitoWeb && (
              <a href={s.linkSitoWeb} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            {s?.linkFacebook && (
              <a href={s.linkFacebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {s?.linkInstagram && (
              <a href={s.linkInstagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            )}
          </div>

          <p className="text-[10px] text-gray-300 pt-2">
            Powered by <a href="https://otiumpms.com" className="underline">OtiumPMS</a>
          </p>
        </div>
      </div>
    </div>
  )
}
