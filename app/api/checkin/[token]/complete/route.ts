import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { registraConsenso } from '@/lib/consent'
import { syncOspiteCRM } from '@/lib/crm-sync'
import { audit } from '@/lib/audit'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ─── Zod ─────────────────────────────────────────────────────────────────────

const accompagnatoreSchema = z.object({
  nome: z.string().trim().min(1).max(80),
  cognome: z.string().trim().min(1).max(80),
  sesso: z.enum(['M', 'F']).optional().nullable(),
  dataNascita: z.string().optional().nullable(),
  luogoNascita: z.string().max(100).optional().nullable(),
  provinciaNascita: z.string().max(10).optional().nullable(),
  tipoDocumento: z.string().max(50).optional().nullable(),
  numeroDocumento: z.string().max(50).optional().nullable(),
  isMinore: z.boolean().default(false),
})

const checkinCompleteSchema = z.object({
  // Dati personali
  guestNome: z.string().trim().min(1).max(80).optional(),
  guestCognome: z.string().trim().min(1).max(80).optional(),
  guestTelefono: z.string().trim().max(30).optional().nullable(),
  guestSesso: z.enum(['M', 'F']).optional().nullable(),
  guestDataNascita: z.string().optional().nullable(),
  guestLuogoNascita: z.string().max(100).optional().nullable(),
  guestComuneNascitaIstat: z.string().max(20).optional().nullable(),
  guestProvinciaNascita: z.string().max(10).optional().nullable(),
  guestStatoNascitaIstat: z.string().max(20).optional().nullable(),
  guestCittadinanzaIstat: z.string().max(20).optional().nullable(),
  guestCodiceFiscale: z.string().max(16).optional().nullable(),
  // Documento
  guestTipoDocumento: z.string().min(1).max(50),
  guestNumeroDocumento: z.string().min(1).max(50),
  guestLuogoRilascio: z.string().max(100).optional().nullable(),
  guestComuneRilascioIstat: z.string().max(20).optional().nullable(),
  guestProvinciaRilascio: z.string().max(10).optional().nullable(),
  fotoDocumentoFronte: z.string().optional().nullable(),
  fotoDocumentoRetro: z.string().optional().nullable(),
  // Accompagnatori
  accompagnatori: z.array(accompagnatoreSchema).default([]),
  // Firma + consensi
  firmaBase64: z.string().min(1),
  accTermini: z.literal(true),
  accPrivacy: z.literal(true),
  accMarketing: z.boolean().default(false),
  // Campi extra liberi (key-value)
  campiExtra: z.record(z.string()).optional(),
})

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const blocked = checkRateLimit(req, 'public:checkin')
  if (blocked) return blocked

  const { token } = await params

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { checkInToken: token },
    select: {
      id: true, hostId: true, stato: true, statoCheckIn: true, pin: true,
      guestNome: true, guestCognome: true, guestEmail: true,
      struttura: { select: { id: true, nome: true } },
      unita: { select: { nome: true } },
    },
  })

  if (!prenotazione) return NextResponse.json({ error: 'Link non valido' }, { status: 404 })
  if (prenotazione.stato === 'ANNULLATA') {
    return NextResponse.json({ error: 'Prenotazione annullata' }, { status: 410 })
  }
  if (prenotazione.statoCheckIn === 'VERIFICATO') {
    return NextResponse.json({ error: 'Check-in già verificato dal reception' }, { status: 409 })
  }

  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }
  const parsed = checkinCompleteSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.issues }, { status: 422 })
  }
  const data = parsed.data

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')

  // ─── TRANSAZIONE ──────────────────────────────────────────────────────────

  let pin: string | null = null
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Aggiorna prenotazione con tutti i dati
      const updated = await tx.prenotazione.update({
        where: { id: prenotazione.id },
        data: {
          ...(data.guestNome ? { guestNome: data.guestNome } : {}),
          ...(data.guestCognome ? { guestCognome: data.guestCognome } : {}),
          guestTelefono: data.guestTelefono ?? undefined,
          guestSesso: data.guestSesso ?? null,
          guestDataNascita: data.guestDataNascita ? new Date(data.guestDataNascita) : null,
          guestLuogoNascita: data.guestLuogoNascita ?? null,
          guestComuneNascitaIstat: data.guestComuneNascitaIstat ?? null,
          guestProvinciaNascita: data.guestProvinciaNascita ?? null,
          guestStatoNascitaIstat: data.guestStatoNascitaIstat ?? '100000100',
          guestCittadinanzaIstat: data.guestCittadinanzaIstat ?? '100000100',
          guestCodiceFiscale: data.guestCodiceFiscale ?? null,
          // Documento + foto
          guestTipoDocumento: data.guestTipoDocumento,
          guestNumeroDocumento: data.guestNumeroDocumento,
          guestLuogoRilascio: data.guestLuogoRilascio ?? null,
          guestComuneRilascioIstat: data.guestComuneRilascioIstat ?? null,
          guestProvinciaRilascio: data.guestProvinciaRilascio ?? null,
          fotoDocumentoFronte: data.fotoDocumentoFronte ?? null,
          fotoDocumentoRetro: data.fotoDocumentoRetro ?? null,
          // Firma + stato
          regCardFirmata: true,
          regCardFirmaBase64: data.firmaBase64,
          regCardAccTermini: true,
          regCardAccPrivacy: true,
          regCardAccMarketing: data.accMarketing,
          regCardDataFirma: new Date(),
          statoCheckIn: 'ONLINE_COMPLETATO',
          checkInCompletato: true,
        },
        select: { pin: true },
      })
      pin = updated.pin

      // 2. Accompagnatori (delete + recreate)
      await tx.accompagnatore.deleteMany({ where: { prenotazioneId: prenotazione.id } })
      for (const acc of data.accompagnatori) {
        if (!acc.nome || !acc.cognome) continue
        await tx.accompagnatore.create({
          data: {
            prenotazioneId: prenotazione.id,
            nome: acc.nome,
            cognome: acc.cognome,
            sesso: acc.sesso ?? null,
            dataNascita: acc.dataNascita ? new Date(acc.dataNascita) : null,
            luogoNascita: acc.luogoNascita ?? null,
            provinciaNascita: acc.provinciaNascita ?? null,
            tipoDocumento: acc.tipoDocumento ?? null,
            numeroDocumento: acc.numeroDocumento ?? null,
            isMinore: acc.isMinore,
          },
        })
      }

      // 3. Notifica host
      const numAcc = data.accompagnatori.length
      await tx.notifica.create({
        data: {
          hostId: prenotazione.hostId,
          tipo: 'checkin',
          titolo: `Check-in online: ${data.guestNome ?? prenotazione.guestNome} ${data.guestCognome ?? prenotazione.guestCognome}`,
          messaggio: `Check-in completato${numAcc > 0 ? ` con ${numAcc} accompagnator${numAcc === 1 ? 'e' : 'i'}` : ''}. Documento e firma acquisiti.`,
          linkUrl: `/host/prenotazioni/${prenotazione.id}`,
          letta: false,
        },
      })
    }, { timeout: 15_000 })
  } catch (err) {
    logger.error('Errore check-in complete', 'checkin/complete', {
      error: String(err), prenotazioneId: prenotazione.id,
    })
    return NextResponse.json({ error: 'Errore interno. Riprova o contatta la struttura.' }, { status: 500 })
  }

  // ─── Side effects ─────────────────────────────────────────────────────────

  const guestEmail = prenotazione.guestEmail
  const versione = '2026-04-01'

  // Consensi GDPR
  const consentPromises = [
    registraConsenso({
      hostId: prenotazione.hostId, tipo: 'termini_servizio', versione,
      accettato: true, guestEmail, ip, userAgent, metodo: 'firma_digitale',
    }),
    registraConsenso({
      hostId: prenotazione.hostId, tipo: 'privacy_ospite', versione,
      accettato: true, guestEmail, ip, userAgent, metodo: 'firma_digitale',
    }),
  ]
  if (data.accMarketing) {
    consentPromises.push(
      registraConsenso({
        hostId: prenotazione.hostId, tipo: 'marketing_email', versione,
        accettato: true, guestEmail, ip, userAgent, metodo: 'firma_digitale',
      }),
    )
  }
  await Promise.allSettled(consentPromises)

  // CRM sync
  syncOspiteCRM({
    hostId: prenotazione.hostId,
    guestEmail,
    guestNome: data.guestNome ?? prenotazione.guestNome,
    guestCognome: data.guestCognome ?? prenotazione.guestCognome,
    guestTelefono: data.guestTelefono ?? null,
    prenotazioneId: prenotazione.id,
  }).catch(() => { /* non blocca */ })

  // Audit
  await audit({
    hostId: prenotazione.hostId,
    azione: 'checkin.completato_online',
    entita: 'prenotazione',
    entitaId: prenotazione.id,
    dettagli: `Check-in online con documento ${data.guestTipoDocumento} ${data.guestNumeroDocumento}`,
    ip, userAgent,
  })

  logger.info('Check-in online completato', {
    prenotazioneId: prenotazione.id, guestEmail,
  })

  return NextResponse.json({
    success: true,
    pin,
    messaggio: 'Check-in completato. A presto in struttura!',
  })
}
