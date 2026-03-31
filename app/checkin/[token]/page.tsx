import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Sparkles, MapPin, Calendar, Users } from 'lucide-react'
import CheckInPortaleForm from './checkin-portale-form'

export async function generateMetadata({ params: p }: { params: Promise<{ token: string }> }) {
  const { token } = await p
  const pr = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: { guestNome: true, guestCognome: true },
  })
  if (!pr) return { title: 'Check-in non trovato' }
  return { title: `Check-in ${pr.guestNome} ${pr.guestCognome} — Otium Week` }
}

export default async function CheckInPortalePage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const { token } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      prezzoTotale: true,
      stato: true,
      checkInCompletato: true,
      guestSesso: true,
      guestDataNascita: true,
      guestLuogoNascita: true,
      guestProvinciaNascita: true,
      guestTipoDocumento: true,
      guestNumeroDocumento: true,
      guestLuogoRilascio: true,
      guestProvinciaRilascio: true,
      struttura: { select: { nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, telefono: true } },
    },
  })

  if (!prenotazione || prenotazione.stato === 'ANNULLATA') notFound()

  const serialized = {
    ...prenotazione,
    dataArrivo: prenotazione.dataArrivo.toISOString(),
    dataPartenza: prenotazione.dataPartenza?.toISOString() ?? null,
    guestDataNascita: prenotazione.guestDataNascita?.toISOString() ?? null,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-indigo-700 text-sm">Otium Week</span>
          </div>
          <span className="text-xs text-gray-400">{prenotazione.host?.nomeAzienda}</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Card prenotazione */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">
              {prenotazione.guestNome[0]}{prenotazione.guestCognome[0]}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">{prenotazione.guestNome} {prenotazione.guestCognome}</p>
              <p className="text-sm text-gray-400">{prenotazione.guestEmail}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="font-medium">{prenotazione.struttura?.nome ?? '—'}</p>
                {prenotazione.struttura?.citta && <p className="text-xs text-gray-400">{prenotazione.struttura.citta}</p>}
              </div>
            </div>
            {prenotazione.unita && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-xl">🛏</span>
                <p className="font-medium">{prenotazione.unita.nome}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="font-medium">
                  {format(new Date(prenotazione.dataArrivo), 'd MMM yyyy', { locale: it })}
                  {prenotazione.dataPartenza && ` → ${format(new Date(prenotazione.dataPartenza), 'd MMM', { locale: it })}`}
                </p>
                {prenotazione.dataPartenza && (() => {
                  const n = Math.round((new Date(prenotazione.dataPartenza).getTime() - new Date(prenotazione.dataArrivo).getTime()) / 86400000)
                  return <p className="text-xs text-gray-400">{n} nott{n === 1 ? 'e' : 'i'}</p>
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 text-indigo-400 shrink-0" />
              <p className="font-medium">{prenotazione.numOspiti} ospite{prenotazione.numOspiti > 1 ? 'i' : ''}</p>
            </div>
          </div>

          {prenotazione.prezzoTotale && (
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Totale</span>
              <span className="font-bold text-gray-900">
                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(prenotazione.prezzoTotale)}
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <CheckInPortaleForm token={token} prenotazione={serialized} />
      </div>
    </div>
  )
}
