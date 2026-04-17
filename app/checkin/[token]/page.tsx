import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import CheckinFlow from './checkin-flow'

export async function generateMetadata({ params: p }: { params: Promise<{ token: string }> }) {
  const { token } = await p
  const pr = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: { guestNome: true, guestCognome: true, struttura: { select: { nome: true } } },
  })
  if (!pr) return { title: 'Check-in non trovato' }
  return { title: `Check-in ${pr.guestNome} ${pr.guestCognome} — ${pr.struttura?.nome || 'Otium'}` }
}

export default async function CheckInPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const { token } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      guestSesso: true,
      guestDataNascita: true,
      guestLuogoNascita: true,
      guestComuneNascitaIstat: true,
      guestProvinciaNascita: true,
      guestStatoNascitaIstat: true,
      guestCittadinanzaIstat: true,
      guestCodiceFiscale: true,
      guestTipoDocumento: true,
      guestNumeroDocumento: true,
      guestLuogoRilascio: true,
      guestComuneRilascioIstat: true,
      guestProvinciaRilascio: true,
      fotoDocumentoFronte: true,
      fotoDocumentoRetro: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      stato: true,
      statoCheckIn: true,
      checkInCompletato: true,
      regCardFirmata: true,
      pin: true,
      struttura: {
        select: {
          id: true, nome: true, indirizzo: true, citta: true,
          logo: true, colorePrimario: true, messaggioChiusura: true,
        },
      },
      unita: { select: { nome: true } },
      host: {
        select: {
          nomeAzienda: true, telefono: true, modalitaCheckin: true,
          regCardTerminiHtml: true, regCardPrivacyHtml: true, regCardCampiExtra: true,
          moduliAttivi: true,
        },
      },
      accompagnatori: {
        select: {
          nome: true, cognome: true, sesso: true, dataNascita: true,
          luogoNascita: true, provinciaNascita: true, tipoDocumento: true,
          numeroDocumento: true, isMinore: true,
        },
      },
    },
  })

  // ─── Guards ────────────────────────────────────────────────────────────
  if (!prenotazione || prenotazione.stato === 'ANNULLATA') notFound()

  // Link scaduto (check-out passato)
  if (prenotazione.dataPartenza && new Date(prenotazione.dataPartenza) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <p className="text-4xl mb-4">⏰</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link scaduto</h1>
          <p className="text-sm text-gray-500">Questo link di check-in non è più valido perché il soggiorno è terminato.</p>
        </div>
      </div>
    )
  }

  // Check-in già completato
  if (prenotazione.statoCheckIn !== 'NON_INIZIATO') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check-in già completato</h1>
          <p className="text-sm text-gray-500 mb-4">
            Hai già completato il check-in online per il soggiorno presso {prenotazione.struttura?.nome}.
          </p>
          {prenotazione.pin && (
            <div className="bg-white rounded-xl border p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Il tuo PIN soggiorno</p>
              <p className="text-3xl font-mono font-bold tracking-[0.5em] text-indigo-600">{prenotazione.pin}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">Presentati in reception con il documento per la verifica finale.</p>
        </div>
      </div>
    )
  }

  // ─── Serialize dates for client component ──────────────────────────────
  const serialized = {
    ...prenotazione,
    dataArrivo: prenotazione.dataArrivo.toISOString(),
    dataPartenza: prenotazione.dataPartenza?.toISOString() ?? null,
    guestDataNascita: prenotazione.guestDataNascita?.toISOString() ?? null,
    accompagnatori: prenotazione.accompagnatori.map(a => ({
      ...a,
      dataNascita: a.dataNascita?.toISOString() ?? null,
    })),
    regCardCampiExtra: prenotazione.host?.regCardCampiExtra ?? null,
  }

  return (
    <CheckinFlow
      token={token}
      prenotazione={serialized}
      struttura={{
        nome: prenotazione.struttura?.nome ?? '',
        indirizzo: prenotazione.struttura?.indirizzo ?? null,
        citta: prenotazione.struttura?.citta ?? null,
        logo: prenotazione.struttura?.logo ?? null,
        colorePrimario: prenotazione.struttura?.colorePrimario ?? null,
        messaggioChiusura: prenotazione.struttura?.messaggioChiusura ?? null,
      }}
      host={{
        nomeAzienda: prenotazione.host?.nomeAzienda ?? '',
        telefono: prenotazione.host?.telefono ?? null,
        regCardTerminiHtml: prenotazione.host?.regCardTerminiHtml ?? null,
        regCardPrivacyHtml: prenotazione.host?.regCardPrivacyHtml ?? null,
        regCardCampiExtra: prenotazione.host?.regCardCampiExtra as Record<string, unknown>[] | null,
      }}
    />
  )
}
