import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { calcolaPrezzo, type RegolaTariffa as PricingRegola } from '@/lib/pricing'
import { calcolaTassaSuggerita } from '@/lib/comuni-tassa-soggiorno'
import { registraConsenso } from '@/lib/consent'
import { upsertOspiteFromBooking } from '@/lib/crm'
import { audit } from '@/lib/audit'
import { sendEmailConfermaRicezione, sendEmailNuovaPrenotazione } from '@/lib/email'
import { logger } from '@/lib/logger'
import { getClientIp } from '@/lib/rate-limit'
import { generateUniquePin } from '@/lib/guest-pin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ─── Zod ─────────────────────────────────────────────────────────────────────

const prenotaSchema = z.object({
  unitaId: z.string().cuid(),
  dataArrivo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataPartenza: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adulti: z.number().int().min(1).max(20),
  bambini: z.number().int().min(0).max(10).default(0),
  etaBambini: z.array(z.number().int().min(0).max(17)).default([]),
  lettoExtra: z.boolean().default(false),
  guestNome: z.string().trim().min(2).max(80),
  guestCognome: z.string().trim().min(2).max(80),
  guestEmail: z.string().trim().toLowerCase().email(),
  guestTelefono: z.string().trim().max(30).optional().nullable(),
  guestNote: z.string().trim().max(500).optional().nullable(),
  guestLingua: z.enum(['it', 'en', 'de', 'fr', 'es']).default('it'),
  consensi: z.object({
    tos: z.literal(true),
    privacy: z.literal(true),
    marketing: z.boolean().default(false),
  }),
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function enumDays(start: Date, endExcl: Date): Date[] {
  const out: Date[] = []
  const d = new Date(start)
  d.setHours(0, 0, 0, 0)
  while (d < endExcl) {
    out.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const { strutturaId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }
  const parsed = prenotaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.issues },
      { status: 422 },
    )
  }
  const data = parsed.data
  const arrivo = parseYMD(data.dataArrivo)
  const partenza = parseYMD(data.dataPartenza)
  const notti = Math.round((partenza.getTime() - arrivo.getTime()) / 86400000)
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  if (notti < 1 || notti > 30 || arrivo < oggi) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 422 })
  }

  // Carico struttura + unità + regole
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      id: true, hostId: true, nome: true, citta: true, autoConferma: true,
    },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const unita = await prisma.unitaPrenotabile.findFirst({
    where: { id: data.unitaId, strutturaId, attiva: true },
    include: {
      tariffe: {
        where: { dataInizio: { lte: partenza }, dataFine: { gte: arrivo } },
      },
    },
  })
  if (!unita) {
    return NextResponse.json({ error: 'Camera non disponibile' }, { status: 404 })
  }

  const totOspiti = data.adulti + data.bambini
  if (unita.capacita + (data.lettoExtra ? unita.lettiExtra : 0) < totOspiti) {
    return NextResponse.json({ error: 'Capacità camera insufficiente' }, { status: 422 })
  }

  // Regole tariffa per pricing
  const regoleDb = await prisma.regolaTariffa.findMany({
    where: { strutturaId, attiva: true },
  })
  const regolePricing: PricingRegola[] = regoleDb.map((r) => ({
    id: r.id, nome: r.nome, tipo: r.tipo as PricingRegola['tipo'],
    attiva: r.attiva, priorita: r.priorita,
    modificatore: r.modificatore as 'PERCENTUALE' | 'FISSO', valore: r.valore,
    unitaId: r.unitaId,
    meseInizio: r.meseInizio, giornoInizio: r.giornoInizio,
    meseFine: r.meseFine, giornoFine: r.giornoFine,
    giorniSettimana: r.giorniSettimana,
    nottiMinime: r.nottiMinime ?? null,
    giorniMinimi: r.giorniMinimi ?? null,
    giorniMassimi: r.giorniMassimi ?? null,
  }))

  const calc = calcolaPrezzo({
    arrivo, partenza, prezzoBase: unita.prezzoBase, unitaId: unita.id,
    tariffePeriodo: unita.tariffe.map((t) => ({
      nome: t.nome, colore: t.colore, prezzo: t.prezzo,
      dataInizio: t.dataInizio, dataFine: t.dataFine,
    })),
    regole: regolePricing,
  })

  // Sconto DURATA
  let prezzoFinale = calc.prezzoTotale
  const regoleDurata = regoleDb
    .filter((r) => r.tipo === 'DURATA' && r.nottiMinime && r.nottiMinime > 0)
    .sort((a, b) => (b.nottiMinime ?? 0) - (a.nottiMinime ?? 0))
  for (const r of regoleDurata) {
    if ((r.nottiMinime ?? 0) <= notti) {
      const delta = r.modificatore === 'PERCENTUALE'
        ? -Math.round((calc.prezzoTotale * r.valore) / 100 * 100) / 100
        : -r.valore
      prezzoFinale = Math.max(0, calc.prezzoTotale + delta)
      break
    }
  }

  // Letto extra
  if (data.lettoExtra && unita.prezzoLettoExtra) {
    prezzoFinale += unita.prezzoLettoExtra * notti
  }

  // Tassa soggiorno
  const tassaMedia = calcolaTassaSuggerita(struttura.citta ?? undefined, arrivo, partenza) ?? 0
  const tassaTotale = Math.round(tassaMedia * notti * totOspiti * 100) / 100

  // ─── TRANSAZIONE: ricontrolla disponibilità + crea prenotazione ────────────

  const giorni = enumDays(arrivo, partenza)
  const checkInToken = crypto.randomUUID()

  let prenotazioneId: string
  try {
    prenotazioneId = await prisma.$transaction(async (tx) => {
      // 1. Ricontrolla blocchi OTA (non si aggiornano in tx ma possono essere stati modificati)
      const bloccoOta = await tx.prenotazioneCanale.findFirst({
        where: {
          canale: { strutturaId, attivo: true, OR: [{ unitaId: unita.id }, { unitaId: null }] },
          dataInizio: { lt: partenza },
          dataFine: { gt: arrivo },
        },
      })
      if (bloccoOta) throw new UnavailableError('Camera prenotata da un altro canale (OTA)')

      // 2. Ricontrolla prenotazioni interne sovrapposte
      const overlap = await tx.prenotazione.findFirst({
        where: {
          unitaId: unita.id,
          stato: { in: ['CONFERMATA', 'RICHIESTA'] },
          dataArrivo: { lt: partenza },
          OR: [
            { dataPartenza: null, dataArrivo: { gte: arrivo } },
            { dataPartenza: { gt: arrivo } },
          ],
        },
      })
      if (overlap) throw new UnavailableError('Camera appena prenotata da un altro ospite')

      // 3. Ricontrolla Disponibilita per ogni giorno + lock ottimistico
      for (const g of giorni) {
        const d = await tx.disponibilita.findUnique({
          where: { unitaId_data: { unitaId: unita.id, data: g } },
        })
        if (d) {
          if (d.chiuso) throw new UnavailableError(`Camera chiusa il ${g.toISOString().slice(0, 10)}`)
          if (d.postiOccupati >= d.postiDisponibili) {
            throw new UnavailableError(`Nessun posto disponibile il ${g.toISOString().slice(0, 10)}`)
          }
          // Incrementa postiOccupati
          await tx.disponibilita.update({
            where: { id: d.id },
            data: { postiOccupati: { increment: 1 } },
          })
        } else {
          // Crea record con postiOccupati=1
          await tx.disponibilita.create({
            data: { unitaId: unita.id, data: g, postiDisponibili: 1, postiOccupati: 1 },
          })
        }
      }

      // 4. Crea prenotazione
      const stato = struttura.autoConferma ? 'CONFERMATA' : 'RICHIESTA'
      const pren = await tx.prenotazione.create({
        data: {
          hostId: struttura.hostId,
          strutturaId,
          unitaId: unita.id,
          guestNome: data.guestNome,
          guestCognome: data.guestCognome,
          guestEmail: data.guestEmail,
          guestTelefono: data.guestTelefono ?? null,
          guestNote: data.guestNote ?? null,
          guestLingua: data.guestLingua,
          dataArrivo: arrivo,
          dataPartenza: partenza,
          numOspiti: totOspiti,
          stato,
          fonte: 'Web',
          prezzoTotale: Math.round(prezzoFinale * 100) / 100,
          tassaSoggiorno: tassaMedia > 0 ? Math.round(tassaMedia * 100) / 100 : null,
          checkInToken,
        },
      })
      return pren.id
    }, { timeout: 15_000 })
  } catch (e) {
    if (e instanceof UnavailableError) {
      return NextResponse.json({ error: e.message, code: 'UNAVAILABLE' }, { status: 409 })
    }
    logger.error('Errore creazione prenotazione', 'book/prenota', {
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  // ─── Side effects (non bloccanti ma awaited per consistenza) ────────────────

  // PIN univoco
  let pin: string | null = null
  try {
    pin = await generateUniquePin(struttura.hostId)
    await prisma.prenotazione.update({
      where: { id: prenotazioneId },
      data: { pin },
    })
  } catch (e) {
    logger.warn('PIN non generato', 'book/prenota', { error: String(e) })
  }

  // Chat per l'ospite
  try {
    await prisma.chat.create({
      data: { prenotazioneId, hostId: struttura.hostId },
    })
  } catch { /* idempotent fallback */ }

  // CRM sync
  upsertOspiteFromBooking(struttura.hostId, {
    guestEmail: data.guestEmail,
    guestNome: data.guestNome,
    guestCognome: data.guestCognome,
    guestTelefono: data.guestTelefono ?? null,
  }).catch(() => { /* non blocca */ })

  // Consensi GDPR
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const versione = '2026-04-01'
  const consentPromises: Promise<unknown>[] = [
    registraConsenso({
      hostId: struttura.hostId, tipo: 'termini_servizio', versione,
      accettato: true, guestEmail: data.guestEmail,
      ip, userAgent, metodo: 'checkbox',
    }),
    registraConsenso({
      hostId: struttura.hostId, tipo: 'privacy_ospite', versione,
      accettato: true, guestEmail: data.guestEmail,
      ip, userAgent, metodo: 'checkbox',
    }),
  ]
  if (data.consensi.marketing) {
    consentPromises.push(
      registraConsenso({
        hostId: struttura.hostId, tipo: 'marketing_email', versione,
        accettato: true, guestEmail: data.guestEmail,
        ip, userAgent, metodo: 'checkbox',
      }),
    )
  }
  await Promise.allSettled(consentPromises)

  // Notifica host in-app
  const guestFull = `${data.guestNome} ${data.guestCognome}`
  await prisma.notifica.create({
    data: {
      hostId: struttura.hostId,
      tipo: 'prenotazione',
      titolo: `Nuova prenotazione: ${guestFull}`,
      messaggio: `${arrivo.toISOString().slice(0, 10)} → ${partenza.toISOString().slice(0, 10)} · ${unita.nome} · €${prezzoFinale.toFixed(0)}`,
      linkUrl: `/host/prenotazioni/${prenotazioneId}`,
    },
  }).catch(() => { /* non blocca */ })

  // Audit
  await audit({
    hostId: struttura.hostId,
    azione: 'prenotazione.creata_da_booking_engine',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: `Prenotazione da booking pubblico: ${guestFull} (${data.guestEmail}), ${notti} notti, €${prezzoFinale.toFixed(2)}`,
    ip, userAgent,
  })

  // Email conferma ricezione all'ospite (queued)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://otiumpms.com'
  try {
    await sendEmailConfermaRicezione({
      guestEmail: data.guestEmail,
      guestNome: data.guestNome,
      hostNome: struttura.nome,
      strutturaNome: struttura.nome,
      dataArrivo: arrivo,
      dataPartenza: partenza,
      numOspiti: totOspiti,
      prezzoTotale: Math.round(prezzoFinale * 100) / 100,
      chatUrl: `${baseUrl}/book/chat/${prenotazioneId}`,
      checkInUrl: `${baseUrl}/checkin/${checkInToken}`,
      hostId: struttura.hostId,
    })
  } catch (e) {
    logger.warn('Email conferma ricezione non inviata', 'book/prenota', { error: String(e) })
  }

  // Email host notifica
  try {
    const hostUser = await prisma.user.findFirst({
      where: { host: { id: struttura.hostId } },
      select: { email: true },
    })
    if (hostUser) {
      await sendEmailNuovaPrenotazione({
        hostEmail: hostUser.email,
        hostNome: struttura.nome,
        prenotazioneId,
        guestNome: data.guestNome,
        guestCognome: data.guestCognome,
        guestEmail: data.guestEmail,
        guestTelefono: data.guestTelefono ?? null,
        strutturaNome: struttura.nome,
        dataArrivo: arrivo,
        dataPartenza: partenza,
        numOspiti: totOspiti,
        guestNote: data.guestNote ?? null,
        hostId: struttura.hostId,
      })
    }
  } catch (e) {
    logger.warn('Email notifica host non inviata', 'book/prenota', { error: String(e) })
  }

  return NextResponse.json({
    prenotazione: {
      id: prenotazioneId,
      stato: struttura.autoConferma ? 'CONFERMATA' : 'RICHIESTA',
      pin,
      checkInToken,
    },
    messaggio: struttura.autoConferma
      ? 'Prenotazione confermata. Riceverai una email con tutti i dettagli.'
      : 'Richiesta ricevuta. La struttura confermerà entro 24 ore.',
  }, { status: 201 })
}

class UnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnavailableError'
  }
}
