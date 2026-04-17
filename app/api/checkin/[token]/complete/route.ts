import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * POST /api/checkin/[token]/complete
 * Completa il check-in online in una sola transazione:
 * - Salva dati personali, documento, foto, accompagnatori, firma, consensi
 * - Setta statoCheckIn = ONLINE_COMPLETATO
 * - Setta regCardFirmata, regCardDataFirma, checkInCompletato
 * - Crea notifica per l'host
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ token: string }> },
) {
  const { token } = await paramsPromise

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: {
      id: true,
      hostId: true,
      stato: true,
      statoCheckIn: true,
      pin: true,
      guestNome: true,
      guestCognome: true,
      struttura: { select: { id: true, nome: true, messaggioChiusura: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, telefono: true, moduliAttivi: true } },
    },
  })

  if (!prenotazione) return NextResponse.json({ error: 'Link non valido' }, { status: 404 })
  if (prenotazione.stato === 'ANNULLATA') return NextResponse.json({ error: 'Prenotazione annullata' }, { status: 410 })
  if (prenotazione.statoCheckIn === 'VERIFICATO') return NextResponse.json({ error: 'Check-in già verificato' }, { status: 409 })

  const body = await req.json()
  const {
    // Step 1 — Dati personali
    guestNome, guestCognome, guestTelefono,
    guestSesso, guestDataNascita,
    guestLuogoNascita, guestComuneNascitaIstat, guestProvinciaNascita,
    guestStatoNascitaIstat, guestCittadinanzaIstat, guestCodiceFiscale,
    // Step 2 — Documento
    guestTipoDocumento, guestNumeroDocumento,
    guestLuogoRilascio, guestComuneRilascioIstat, guestProvinciaRilascio,
    fotoDocumentoFronte, fotoDocumentoRetro,
    // Step 3 — Accompagnatori
    accompagnatori,
    // Step 4 — Firma + consensi
    firmaBase64, accTermini, accPrivacy, accMarketing,
  } = body

  if (!guestTipoDocumento || !guestNumeroDocumento) {
    return NextResponse.json({ error: 'Documento obbligatorio' }, { status: 400 })
  }
  if (!firmaBase64) {
    return NextResponse.json({ error: 'Firma obbligatoria' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aggiorna prenotazione con tutti i dati
      const updated = await tx.prenotazione.update({
        where: { id: prenotazione.id },
        data: {
          // Dati personali
          ...(guestNome && { guestNome: String(guestNome).trim() }),
          ...(guestCognome && { guestCognome: String(guestCognome).trim() }),
          guestTelefono: guestTelefono || undefined,
          guestSesso: guestSesso || null,
          guestDataNascita: guestDataNascita ? new Date(guestDataNascita) : null,
          guestLuogoNascita: guestLuogoNascita || null,
          guestComuneNascitaIstat: guestComuneNascitaIstat || null,
          guestProvinciaNascita: guestProvinciaNascita || null,
          guestStatoNascitaIstat: guestStatoNascitaIstat || '100000100',
          guestCittadinanzaIstat: guestCittadinanzaIstat || '100000100',
          guestCodiceFiscale: guestCodiceFiscale || null,
          // Documento
          guestTipoDocumento,
          guestNumeroDocumento,
          guestLuogoRilascio: guestLuogoRilascio || null,
          guestComuneRilascioIstat: guestComuneRilascioIstat || null,
          guestProvinciaRilascio: guestProvinciaRilascio || null,
          fotoDocumentoFronte: fotoDocumentoFronte || null,
          fotoDocumentoRetro: fotoDocumentoRetro || null,
          // Firma + consensi
          regCardFirmata: true,
          regCardFirmaBase64: firmaBase64,
          regCardAccTermini: !!accTermini,
          regCardAccPrivacy: !!accPrivacy,
          regCardAccMarketing: !!accMarketing,
          regCardDataFirma: new Date(),
          // Stato
          statoCheckIn: 'ONLINE_COMPLETATO',
          checkInCompletato: true,
        },
        select: {
          id: true,
          guestNome: true,
          guestCognome: true,
          dataArrivo: true,
          dataPartenza: true,
          numOspiti: true,
          pin: true,
          unita: { select: { nome: true } },
          struttura: { select: { nome: true, messaggioChiusura: true, indirizzo: true, citta: true } },
          host: { select: { nomeAzienda: true, telefono: true, moduliAttivi: true } },
        },
      })

      // 2. Accompagnatori — rimuovi esistenti e ricrea
      if (Array.isArray(accompagnatori) && accompagnatori.length > 0) {
        await tx.accompagnatore.deleteMany({ where: { prenotazioneId: prenotazione.id } })
        for (const acc of accompagnatori) {
          if (!acc.nome || !acc.cognome) continue
          await tx.accompagnatore.create({
            data: {
              prenotazioneId: prenotazione.id,
              nome: String(acc.nome).trim(),
              cognome: String(acc.cognome).trim(),
              sesso: acc.sesso || null,
              dataNascita: acc.dataNascita ? new Date(acc.dataNascita) : null,
              luogoNascita: acc.luogoNascita || null,
              provinciaNascita: acc.provinciaNascita || null,
              tipoDocumento: acc.tipoDocumento || null,
              numeroDocumento: acc.numeroDocumento || null,
              isMinore: !!acc.isMinore,
            },
          })
        }
      }

      // 3. Notifica per l'host
      const numAcc = Array.isArray(accompagnatori) ? accompagnatori.filter((a: { nome?: string }) => a.nome).length : 0
      await tx.notifica.create({
        data: {
          hostId: prenotazione.hostId,
          tipo: 'checkin',
          titolo: `Check-in online: ${updated.guestNome} ${updated.guestCognome}`,
          messaggio: `L'ospite ha completato il check-in online${numAcc > 0 ? ` con ${numAcc} accompagnator${numAcc === 1 ? 'e' : 'i'}` : ''}. Documento e firma acquisiti. Verifica in reception.`,
          linkUrl: `/host/prenotazioni/${prenotazione.id}`,
          letta: false,
        },
      })

      return updated
    })

    logger.info('[checkin/complete] Check-in completato', {
      prenotazioneId: prenotazione.id,
      guestNome: result.guestNome,
    })

    return NextResponse.json({
      ok: true,
      prenotazione: {
        guestNome: result.guestNome,
        guestCognome: result.guestCognome,
        dataArrivo: result.dataArrivo,
        dataPartenza: result.dataPartenza,
        numOspiti: result.numOspiti,
        pin: result.pin,
        unitaNome: result.unita?.nome,
        strutturaNome: result.struttura?.nome,
        strutturaIndirizzo: result.struttura?.indirizzo,
        strutturaCitta: result.struttura?.citta,
        messaggioChiusura: result.struttura?.messaggioChiusura,
        hostNome: result.host?.nomeAzienda,
        hostTelefono: result.host?.telefono,
        moduliAttivi: result.host?.moduliAttivi,
      },
    })
  } catch (err) {
    logger.error('[checkin/complete] Errore', { err: String(err), prenotazioneId: prenotazione.id })
    return NextResponse.json(
      { error: 'Si è verificato un errore. Riprova o contatta la struttura.' },
      { status: 500 },
    )
  }
}
