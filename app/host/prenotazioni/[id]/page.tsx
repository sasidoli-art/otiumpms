import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Calendar, Users, Euro } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import PrenotazioneActions from './prenotazione-actions'
import CheckInForm from './checkin-form'
import ChatBox from './chat-box-wrapper'
import AccompagnatoriSection from './accompagnatori-section'

function statoColor(stato: string): BadgeVariant {
  switch (stato) {
    case 'RICHIESTA': return 'yellow'
    case 'CONFERMATA': return 'green'
    case 'ANNULLATA': return 'red'
    case 'COMPLETATA': return 'blue'
    case 'NO_SHOW': return 'gray'
    default: return 'gray'
  }
}

function statoLabel(stato: string) {
  switch (stato) {
    case 'RICHIESTA': return 'In attesa'
    case 'CONFERMATA': return 'Confermata'
    case 'ANNULLATA': return 'Annullata'
    case 'COMPLETATA': return 'Completata'
    case 'NO_SHOW': return 'No show'
    default: return stato
  }
}

export default async function PrenotazioneDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: hostId },
    include: {
      struttura: { select: { id: true, nome: true, citta: true } },
      unita: { select: { nome: true } },
      chat: {
        include: {
          messaggi: { orderBy: { createdAt: 'asc' } },
        },
      },
      accompagnatori: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!prenotazione) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/host/prenotazioni" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {prenotazione.guestNome} {prenotazione.guestCognome}
            </h1>
            <Badge variant={statoColor(prenotazione.stato)}>
              {statoLabel(prenotazione.stato)}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Prenotazione · {format(new Date(prenotazione.createdAt), 'd MMM yyyy HH:mm', { locale: it })}
            {prenotazione.fonte ? ` · ${prenotazione.fonte}` : ''}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonna principale */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dettagli prenotazione */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Dettagli prenotazione</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Struttura</dt>
                <dd className="font-medium text-gray-900">
                  {prenotazione.struttura ? (
                    <Link href={`/host/strutture/${prenotazione.struttura.id}`} className="text-brand-600 hover:underline">
                      {prenotazione.struttura.nome}
                    </Link>
                  ) : '—'}
                  {prenotazione.unita && (
                    <span className="text-gray-400 text-xs ml-1">({prenotazione.unita.nome})</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Ospiti</dt>
                <dd className="font-medium text-gray-900 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> {prenotazione.numOspiti}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-gray-500"><Calendar className="w-3.5 h-3.5" /> Arrivo</dt>
                <dd className="font-medium text-gray-900">
                  {format(new Date(prenotazione.dataArrivo), 'd MMMM yyyy', { locale: it })}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-gray-500"><Calendar className="w-3.5 h-3.5" /> Partenza</dt>
                <dd className="font-medium text-gray-900">
                  {prenotazione.dataPartenza
                    ? format(new Date(prenotazione.dataPartenza), 'd MMMM yyyy', { locale: it })
                    : '—'}
                </dd>
              </div>
              {prenotazione.prezzoTotale != null && (
                <div>
                  <dt className="flex items-center gap-1 text-gray-500"><Euro className="w-3.5 h-3.5" /> Totale</dt>
                  <dd className="font-semibold text-brand-600">€{prenotazione.prezzoTotale.toFixed(2)}</dd>
                </div>
              )}
              {prenotazione.acconto != null && (
                <div>
                  <dt className="text-gray-500">Acconto</dt>
                  <dd className="font-medium text-gray-900">€{prenotazione.acconto.toFixed(2)}</dd>
                </div>
              )}
              {prenotazione.tassaSoggiorno != null && (
                <div>
                  <dt className="text-gray-500">Tassa soggiorno</dt>
                  <dd className="font-medium text-gray-900">€{prenotazione.tassaSoggiorno.toFixed(2)}/notte</dd>
                </div>
              )}
            </dl>

            {prenotazione.guestNote && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Note ospite</p>
                <p className="text-sm text-gray-700">{prenotazione.guestNote}</p>
              </div>
            )}
          </div>

          {/* Accompagnatori */}
          <AccompagnatoriSection
            prenotazioneId={prenotazione.id}
            accompagnatoriIniziali={prenotazione.accompagnatori.map(a => ({
              ...a,
              dataNascita: a.dataNascita?.toISOString() ?? null,
            }))}
            numOspiti={prenotazione.numOspiti}
          />

          {/* Chat */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Chat con l&apos;ospite</h2>
            {prenotazione.chat ? (
              <ChatBox chatId={prenotazione.chat.id} messaggiIniziali={prenotazione.chat.messaggi} />
            ) : (
              <AprChat prenotazioneId={prenotazione.id} />
            )}
          </div>
        </div>

        {/* Sidebar destra */}
        <div className="space-y-4">
          {/* Dati ospite */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Ospite</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <a href={`mailto:${prenotazione.guestEmail}`} className="text-brand-600 hover:underline truncate">
                  {prenotazione.guestEmail}
                </a>
              </div>
              {prenotazione.guestTelefono && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={`tel:${prenotazione.guestTelefono}`} className="hover:underline">
                    {prenotazione.guestTelefono}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Check-in / Check-out */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Check-in / Check-out</h2>
            <CheckInForm
              prenotazioneId={prenotazione.id}
              stato={prenotazione.stato}
              datiEsistenti={{
                guestSesso: prenotazione.guestSesso,
                guestDataNascita: prenotazione.guestDataNascita,
                guestLuogoNascita: prenotazione.guestLuogoNascita,
                guestComuneNascitaIstat: prenotazione.guestComuneNascitaIstat,
                guestProvinciaNascita: prenotazione.guestProvinciaNascita,
                guestStatoNascitaIstat: prenotazione.guestStatoNascitaIstat,
                guestCittadinanzaIstat: prenotazione.guestCittadinanzaIstat,
                guestTipoDocumento: prenotazione.guestTipoDocumento,
                guestNumeroDocumento: prenotazione.guestNumeroDocumento,
                guestLuogoRilascio: prenotazione.guestLuogoRilascio,
                guestComuneRilascioIstat: prenotazione.guestComuneRilascioIstat,
                guestProvinciaRilascio: prenotazione.guestProvinciaRilascio,
                guestStatoRilascioIstat: prenotazione.guestStatoRilascioIstat,
              }}
            />
          </div>

          {/* Azioni stato */}
          <PrenotazioneActions prenotazione={{
            id: prenotazione.id,
            stato: prenotazione.stato,
            prezzoTotale: prenotazione.prezzoTotale,
            acconto: prenotazione.acconto,
            tassaSoggiorno: prenotazione.tassaSoggiorno,
            noteInterne: prenotazione.noteInterne,
            guestNome: prenotazione.guestNome ?? undefined,
            guestCognome: prenotazione.guestCognome ?? undefined,
            guestEmail: prenotazione.guestEmail ?? undefined,
            dataArrivo: prenotazione.dataArrivo.toISOString(),
            dataPartenza: prenotazione.dataPartenza?.toISOString() ?? null,
            numOspiti: prenotazione.numOspiti,
            strutturaNome: prenotazione.struttura?.nome ?? undefined,
            strutturaCitta: prenotazione.struttura?.citta ?? undefined,
            unitaNome: prenotazione.unita?.nome ?? null,
            guestLingua: prenotazione.guestLingua ?? null,
            checkInCompletato: prenotazione.checkInCompletato,
          }} />

          {/* Note interne */}
          {prenotazione.noteInterne && (
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Note interne</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{prenotazione.noteInterne}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Client component per aprire chat
import AprChat from './apri-chat'
