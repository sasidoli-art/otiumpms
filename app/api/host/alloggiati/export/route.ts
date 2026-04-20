import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth, logAccessoAsync } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import {
  generaFileAlloggiati, validaPrenotazioneAlloggiati,
} from '@/lib/alloggiati'

const exportSchema = z.object({
  strutturaId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  // se true, include anche ospiti con campi non critici mancanti
  forzaIncompleti: z.boolean().optional().default(false),
})

// POST /api/host/alloggiati/export
// Genera file + crea ExportAlloggiati + ritorna file per download.
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = exportSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }
  const { strutturaId, data, forzaIncompleti } = parsed.data

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  if (!struttura.alloggiatiCodiceStruttura) {
    return NextResponse.json(
      { error: 'Codice struttura Alloggiati Web non configurato' },
      { status: 400 },
    )
  }

  const dataInizio = new Date(data); dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(data); dataFine.setHours(23, 59, 59, 999)

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      strutturaId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { gte: dataInizio, lte: dataFine },
      deletedAt: null,
    },
    select: {
      id: true,
      dataArrivo: true, dataPartenza: true,
      guestNome: true, guestCognome: true,
      guestSesso: true, guestDataNascita: true,
      guestLuogoNascita: true, guestComuneNascitaIstat: true,
      guestProvinciaNascita: true, guestStatoNascitaIstat: true,
      guestCittadinanzaIstat: true,
      guestTipoDocumento: true, guestNumeroDocumento: true,
      guestLuogoRilascio: true, guestComuneRilascioIstat: true,
      guestProvinciaRilascio: true,
      accompagnatori: {
        select: {
          nome: true, cognome: true, sesso: true, dataNascita: true,
          luogoNascita: true, provinciaNascita: true,
          comuneNascitaIstat: true, statoNascitaIstat: true, cittadinanzaIstat: true,
          tipoDocumento: true, numeroDocumento: true,
          comuneRilascioIstat: true, provinciaRilascio: true,
        },
      },
    },
    orderBy: { dataArrivo: 'asc' },
  })

  if (prenotazioni.length === 0) {
    return NextResponse.json({ error: 'Nessuna prenotazione per la data selezionata' }, { status: 400 })
  }

  // Conta incompleti (non bloccanti se non hanno dati minimi)
  let validi = prenotazioni.filter((p) => validaPrenotazioneAlloggiati(p).valido)
  let incompleti = prenotazioni.length - validi.length

  // Blocca se ci sono ospiti con dati minimi mancanti
  const mancantiDatiMinimi = prenotazioni.filter((p) =>
    !p.guestCognome?.trim() || !p.guestNome?.trim() || !p.guestNumeroDocumento?.trim(),
  )
  if (mancantiDatiMinimi.length > 0) {
    return NextResponse.json(
      {
        error: 'Ci sono ospiti con dati minimi mancanti (cognome/nome/documento). Completa i dati prima di esportare.',
        prenotazioniMancanti: mancantiDatiMinimi.map((p) => ({ id: p.id, cognome: p.guestCognome, nome: p.guestNome })),
      },
      { status: 400 },
    )
  }

  if (!forzaIncompleti && incompleti > 0) {
    return NextResponse.json(
      {
        error: `${incompleti} ospiti hanno dati incompleti. Conferma con forzaIncompleti=true per esportare solo i validi.`,
        incompleti,
      },
      { status: 409 },
    )
  }

  // Se forzaIncompleti: esportiamo solo i validi ma segnaliamo nell'export il numero di incompleti
  const txt = generaFileAlloggiati(struttura, validi)

  const numOspiti = validi.length
  const numAccompagnatori = validi.reduce((sum, p) => sum + p.accompagnatori.length, 0)
  const fileNome = `Alloggiati_${struttura.alloggiatiCodiceStruttura}_${data.replace(/-/g, '')}.txt`

  // Salva record dello storico
  const record = await prisma.exportAlloggiati.create({
    data: {
      hostId: auth.user.hostId,
      strutturaId: struttura.id,
      dataExport: dataInizio,
      numOspiti,
      numAccompagnatori,
      numIncompleti: incompleti,
      fileNome,
      fileContenuto: txt,
      esportatoDa: auth.user.id,
    },
  })

  // GDPR: log accesso per ogni prenotazione esportata
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent')
  for (const p of validi) {
    logAccessoAsync({
      hostId: auth.user.hostId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      entita: 'prenotazione',
      entitaId: p.id,
      tipoAccesso: 'export',
      ip,
      userAgent: ua,
    })
  }

  await auditFromAuth(auth, {
    azione: 'alloggiati.esportato',
    entita: 'exportAlloggiati',
    entitaId: record.id,
    dettagli: `Export Alloggiati ${fileNome}: ${numOspiti} ospiti + ${numAccompagnatori} accompagnatori (${incompleti} incompleti esclusi)`,
  })

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileNome}"`,
      'X-Export-Id': record.id,
      'X-Num-Ospiti': String(numOspiti),
      'X-Num-Accompagnatori': String(numAccompagnatori),
      'X-Num-Incompleti': String(incompleti),
    },
  })
}
