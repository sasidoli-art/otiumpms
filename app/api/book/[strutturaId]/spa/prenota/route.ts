import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { assegnaCabina } from '@/lib/spa-availability'
import { syncOspiteCRM } from '@/lib/crm-sync'
import { registraConsenso } from '@/lib/consent'
import { audit } from '@/lib/audit'
import { sendEmailConfermaAppuntamentoSpa, sendEmailNotificaNuovoAppuntamentoSpa } from '@/lib/email'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// ─── Zod ─────────────────────────────────────────────────────────────────────

const prenotaSpaSchema = z.object({
  trattamentoId: z.string().cuid().optional().nullable(),
  percorsoId: z.string().cuid().optional().nullable(),
  terapistaId: z.string().cuid().optional().nullable(),
  dataOra: z.string(),
  guestNome: z.string().trim().min(2).max(80),
  guestCognome: z.string().trim().min(2).max(80),
  guestEmail: z.string().trim().toLowerCase().email(),
  guestTelefono: z.string().trim().max(30).optional().nullable(),
  guestLingua: z.enum(['it', 'en', 'de', 'fr', 'es']).default('it'),
  note: z.string().trim().max(1000).optional().nullable(),
  prenotazioneId: z.string().cuid().optional().nullable(),
  unitaId: z.string().cuid().optional().nullable(),
  waiver: z.object({
    zoneTrattate: z.array(z.string()).default([]),
    zoneEvitare: z.array(z.string()).default([]),
    incinta: z.boolean().default(false),
    incintaMesi: z.number().int().min(1).max(9).optional().nullable(),
    condizioni: z.array(z.string()).default([]),
    allergie: z.string().max(500).optional().nullable(),
    patologie: z.string().max(500).optional().nullable(),
    farmaci: z.string().max(500).optional().nullable(),
    accettazioneTermini: z.literal(true),
    accettazionePrivacy: z.literal(true),
    consensoFoto: z.boolean().default(false),
  }),
  pagamento: z.object({
    metodo: z.enum(['CAMERA_CREDIT', 'CONTANTI', 'CARTA', 'TRANSFERWISE']),
    ultime4Cifre: z.string().max(4).optional().nullable(),
  }),
  consensi: z.object({
    privacy: z.literal(true),
    tos: z.literal(true),
    salute: z.literal(true),
  }),
})

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const blocked = checkRateLimit(req, 'public:booking')
  if (blocked) return blocked

  const { strutturaId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }
  const parsed = prenotaSpaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.issues }, { status: 422 })
  }
  const data = parsed.data

  if (!data.trattamentoId && !data.percorsoId) {
    return NextResponse.json({ error: 'Specificare trattamentoId o percorsoId' }, { status: 422 })
  }

  const dataOra = new Date(data.dataOra)
  if (isNaN(dataOra.getTime())) {
    return NextResponse.json({ error: 'dataOra non valida' }, { status: 400 })
  }
  if (dataOra < new Date()) {
    return NextResponse.json({ error: 'Non è possibile prenotare nel passato' }, { status: 400 })
  }

  // Carica struttura
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      hostId: true, nome: true,
      host: { select: { nomeAzienda: true, user: { select: { email: true } } } },
    },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  // Carica trattamento / percorso e ottieni durata + prezzo
  let durata = 60
  let prezzoTotale = 0
  let servizioNome = 'Trattamento SPA'

  if (data.trattamentoId) {
    const t = await prisma.trattamentoSpa.findFirst({
      where: { id: data.trattamentoId, hostId: struttura.hostId, attivo: true, prenotabileOnline: true },
    })
    if (!t) return NextResponse.json({ error: 'Trattamento non disponibile' }, { status: 404 })
    durata = t.durata
    prezzoTotale = t.prezzo
    servizioNome = t.nome
  } else if (data.percorsoId) {
    const p = await prisma.percorsoBenessere.findFirst({
      where: { id: data.percorsoId, hostId: struttura.hostId, attivo: true },
    })
    if (!p) return NextResponse.json({ error: 'Percorso non disponibile' }, { status: 404 })
    durata = p.durataMinuti
    prezzoTotale = p.prezzo
    servizioNome = p.nome
  }

  const dataOraFine = new Date(dataOra.getTime() + durata * 60_000)

  // Assegna cabina (prima della tx, best-effort — cabina assegnata se non specificata)
  const cabinaId = await assegnaCabina({
    hostId: struttura.hostId,
    dataOra,
    durata,
  })

  // ─── TRANSAZIONE ──────────────────────────────────────────────────────────

  let appuntamentoId: string
  try {
    appuntamentoId = await prisma.$transaction(async (tx) => {
      // Lock ottimistico: ri-verifica conflitti terapista + cabina dentro la tx
      if (data.terapistaId) {
        const conflittoTerapista = await tx.appuntamentoSpa.findFirst({
          where: {
            hostId: struttura.hostId,
            terapistaId: data.terapistaId,
            stato: { in: ['CONFERMATO', 'PRENOTATO'] },
            dataOra: { lt: dataOraFine, gte: new Date(dataOra.getTime() - 8 * 3600_000) },
          },
          select: { dataOra: true, durata: true },
        })
        if (conflittoTerapista) {
          const cFine = new Date(conflittoTerapista.dataOra.getTime() + conflittoTerapista.durata * 60_000)
          if (conflittoTerapista.dataOra < dataOraFine && cFine > dataOra) {
            throw new ConflictError('Il terapista non è disponibile in questo orario')
          }
        }
      }

      if (cabinaId) {
        const conflittoCabina = await tx.appuntamentoSpa.findFirst({
          where: {
            hostId: struttura.hostId,
            cabinaId,
            stato: { in: ['CONFERMATO', 'PRENOTATO'] },
            dataOra: { lt: dataOraFine, gte: new Date(dataOra.getTime() - 8 * 3600_000) },
          },
          select: { dataOra: true, durata: true },
        })
        if (conflittoCabina) {
          const cFine = new Date(conflittoCabina.dataOra.getTime() + conflittoCabina.durata * 60_000)
          if (conflittoCabina.dataOra < dataOraFine && cFine > dataOra) {
            throw new ConflictError('La cabina non è più disponibile')
          }
        }
      }

      // Crea AppuntamentoSpa
      const appt = await tx.appuntamentoSpa.create({
        data: {
          hostId: struttura.hostId,
          trattamentoId: data.trattamentoId ?? null,
          percorsoId: data.percorsoId ?? null,
          terapistaId: data.terapistaId ?? null,
          cabinaId: cabinaId ?? null,
          dataOra,
          durata,
          prezzoTotale,
          guestNome: data.guestNome,
          guestCognome: data.guestCognome,
          guestEmail: data.guestEmail,
          guestTelefono: data.guestTelefono ?? null,
          note: data.note ?? null,
          stato: 'PRENOTATO',
          ...(data.prenotazioneId ? { prenotazioneId: data.prenotazioneId } : {}),
        },
        select: { id: true },
      })

      // Crea WaiverSpa (dati Art.9 — consenso salute obbligatorio)
      await tx.waiverSpa.create({
        data: {
          appuntamentoId: appt.id,
          zoneTrattate: data.waiver.zoneTrattate,
          zoneEvitare: data.waiver.zoneEvitare,
          incinta: data.waiver.incinta,
          incintaMesi: data.waiver.incintaMesi ?? null,
          condizioni: data.waiver.condizioni,
          allergie: data.waiver.allergie ?? null,
          patologie: data.waiver.patologie ?? null,
          farmaci: data.waiver.farmaci ?? null,
          accettazioneTermini: true,
          accettazionePrivacy: true,
          consensoFoto: data.waiver.consensoFoto,
          confermato: false,
        },
      })

      // Crea PagamentoSpa (PENDENTE — riscosso alla struttura)
      await tx.pagamentoSpa.create({
        data: {
          appuntamentoId: appt.id,
          importo: prezzoTotale,
          metodo: data.pagamento.metodo,
          stato: 'PENDENTE',
          ...(data.pagamento.ultime4Cifre ? { ultime4Cifre: data.pagamento.ultime4Cifre } : {}),
          ...(data.unitaId && data.pagamento.metodo === 'CAMERA_CREDIT' ? { unitaId: data.unitaId } : {}),
        },
      })

      return appt.id
    }, { timeout: 15_000 })
  } catch (e) {
    if (e instanceof ConflictError) {
      return NextResponse.json({ error: e.message, code: 'CONFLICT' }, { status: 409 })
    }
    logger.error('Errore creazione appuntamento SPA', 'spa/prenota', {
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }

  // ─── Side effects ─────────────────────────────────────────────────────────

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const versione = '2026-04-01'

  // CRM sync
  syncOspiteCRM({
    hostId: struttura.hostId,
    guestEmail: data.guestEmail,
    guestNome: data.guestNome,
    guestCognome: data.guestCognome,
    guestTelefono: data.guestTelefono ?? null,
    guestLingua: data.guestLingua,
    prenotazioneId: data.prenotazioneId ?? appuntamentoId,
    importo: prezzoTotale,
  }).catch(() => { /* non blocca */ })

  // Consensi GDPR (incluso Art.9 per dati sanitari SPA)
  await Promise.allSettled([
    registraConsenso({
      hostId: struttura.hostId, tipo: 'privacy_ospite', versione,
      accettato: true, guestEmail: data.guestEmail, ip, userAgent, metodo: 'checkbox',
    }),
    registraConsenso({
      hostId: struttura.hostId, tipo: 'termini_servizio', versione,
      accettato: true, guestEmail: data.guestEmail, ip, userAgent, metodo: 'checkbox',
    }),
    registraConsenso({
      hostId: struttura.hostId, tipo: 'spa_art9', versione,
      accettato: true, guestEmail: data.guestEmail, ip, userAgent, metodo: 'checkbox',
    }),
  ])

  // Notifica host in-app
  const oraFmt = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const dataFmt = dataOra.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  prisma.notifica.create({
    data: {
      hostId: struttura.hostId,
      tipo: 'spa',
      titolo: 'Nuovo appuntamento SPA',
      messaggio: `${data.guestNome} ${data.guestCognome} ha prenotato "${servizioNome}" per il ${dataFmt} alle ${oraFmt}`,
      linkUrl: `/host/spa/appuntamenti`,
    },
  }).catch(() => { /* non blocca */ })

  // Audit
  await audit({
    hostId: struttura.hostId,
    azione: 'appuntamento_spa.creato_da_booking',
    entita: 'appuntamentoSpa',
    entitaId: appuntamentoId,
    dettagli: `${data.guestNome} ${data.guestCognome} (${data.guestEmail}), ${servizioNome}, €${prezzoTotale.toFixed(2)}`,
    ip, userAgent,
  })

  // Email conferma ospite + notifica host
  const hostNome = struttura.host.nomeAzienda
  const hostEmail = struttura.host.user.email
  await Promise.allSettled([
    sendEmailConfermaAppuntamentoSpa({
      guestEmail: data.guestEmail,
      guestNome: data.guestNome,
      hostNome,
      servizioNome,
      dataOra,
      durata,
      prezzoTotale,
    }).catch(err => logger.warn('Email conferma SPA ospite', 'spa/prenota', { error: String(err) })),
    sendEmailNotificaNuovoAppuntamentoSpa({
      hostEmail,
      hostNome,
      guestNome: data.guestNome,
      guestCognome: data.guestCognome,
      guestEmail: data.guestEmail,
      guestTelefono: data.guestTelefono ?? undefined,
      servizioNome,
      dataOra,
      durata,
      prezzoTotale,
      note: data.note ?? undefined,
    }).catch(err => logger.warn('Email notifica SPA host', 'spa/prenota', { error: String(err) })),
  ])

  return NextResponse.json({ id: appuntamentoId }, { status: 201 })
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
