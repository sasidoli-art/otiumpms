import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { parseModuli } from '@/lib/moduli'
import { combineDateTime, getSlotsDisponibilita } from '@/lib/book/ristorante'
import { sendEmailGeneric } from '@/lib/email'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { syncOspiteCRM } from '@/lib/crm-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

const prenotaSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ora: z.string().regex(/^\d{2}:\d{2}$/),
  numPersone: z.number().int().min(1).max(20),
  note: z.string().trim().max(500).optional().nullable(),
  guestNome: z.string().trim().min(2).max(80),
  guestCognome: z.string().trim().min(2).max(80),
  guestEmail: z.string().trim().toLowerCase().email(),
  guestTelefono: z.string().trim().max(30).optional().nullable(),
  // Se ospite in-house: PIN del soggiorno (opzionale)
  pin: z.string().trim().min(4).max(16).optional().nullable(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const blocked = checkRateLimit(req, 'public:booking')
  if (blocked) return blocked

  const { strutturaId } = await params

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }
  const parsed = prenotaSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.issues }, { status: 422 })
  }
  const data = parsed.data

  // Verifica struttura + modulo
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: {
      id: true, hostId: true, nome: true,
      host: { select: { moduliAttivi: true, user: { select: { email: true } } } },
    },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }
  const moduli = parseModuli(struttura.host.moduliAttivi)
  if (!moduli.ristorazione) {
    return NextResponse.json({ error: 'Ristorazione non attiva' }, { status: 404 })
  }

  // Valida data nel futuro e slot esistente
  const dataOra = combineDateTime(data.data, data.ora)
  if (Number.isNaN(dataOra.getTime()) || dataOra < new Date()) {
    return NextResponse.json({ error: 'Data/ora non valida' }, { status: 422 })
  }

  const { slots } = await getSlotsDisponibilita({
    strutturaId,
    dataYMD: data.data,
    numPersone: data.numPersone,
  })
  const slot = slots.find((s) => s.ora === data.ora)
  if (!slot) {
    return NextResponse.json({ error: 'Orario non valido' }, { status: 422 })
  }
  if (!slot.disponibile) {
    return NextResponse.json({ error: 'Orario al completo', code: 'UNAVAILABLE' }, { status: 409 })
  }

  // Matching opzionale soggiorno in-house tramite PIN
  let prenotazioneId: string | null = null
  if (data.pin) {
    const soggiorno = await prisma.prenotazione.findFirst({
      where: { hostId: struttura.hostId, pin: data.pin, deletedAt: null },
      select: { id: true },
    })
    if (soggiorno) prenotazioneId = soggiorno.id
  }

  // Crea prenotazione
  const creata = await prisma.prenotazioneRistorante.create({
    data: {
      hostId: struttura.hostId,
      strutturaId,
      guestNome: data.guestNome,
      guestCognome: data.guestCognome,
      guestEmail: data.guestEmail,
      guestTelefono: data.guestTelefono ?? null,
      dataOra,
      numPersone: data.numPersone,
      note: data.note ?? null,
      stato: 'CONFERMATA',
      prenotazioneId,
    },
  })

  // ── Side effects non bloccanti ──────────────────────────────────────────

  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent')

  // CRM sync
  syncOspiteCRM({
    hostId: struttura.hostId,
    guestEmail: data.guestEmail,
    guestNome: data.guestNome,
    guestCognome: data.guestCognome,
    guestTelefono: data.guestTelefono ?? null,
    prenotazioneId: prenotazioneId ?? creata.id,
    importo: null,
  }).catch(() => { /* non blocca */ })

  await audit({
    hostId: struttura.hostId,
    azione: 'ristorante.prenotazione_creata_da_booking_engine',
    entita: 'prenotazione_ristorante',
    entitaId: creata.id,
    dettagli: `${data.guestNome} ${data.guestCognome} · ${data.data} ${data.ora} · ${data.numPersone} pax`,
    ip, userAgent,
  }).catch(() => { /* non blocca */ })

  prisma.notifica.create({
    data: {
      hostId: struttura.hostId,
      tipo: 'prenotazione',
      titolo: `Nuovo tavolo: ${data.guestNome} ${data.guestCognome}`,
      messaggio: `${data.data} ore ${data.ora} · ${data.numPersone} pax${data.note ? ` · ${data.note}` : ''}`,
      linkUrl: `/host/ristorazione/prenotazioni`,
    },
  }).catch(() => { /* non blocca */ })

  // Email ospite (conferma)
  try {
    await sendEmailGeneric({
      to: data.guestEmail,
      subject: `Tavolo confermato al ristorante ${struttura.nome}`,
      text: `Ciao ${data.guestNome},

Abbiamo registrato la tua prenotazione al ristorante ${struttura.nome}:

📅 Data: ${data.data}
🕐 Ora: ${data.ora}
👥 Persone: ${data.numPersone}
${data.note ? `📝 Note: ${data.note}\n` : ''}
A presto!`,
      hostId: struttura.hostId,
      strutturaId,
    })
  } catch (e) {
    logger.warn('Email conferma ristorante non inviata', 'book/ristorante', { error: String(e) })
  }

  // Email host notifica
  if (struttura.host.user?.email) {
    try {
      await sendEmailGeneric({
        to: struttura.host.user.email,
        subject: `Nuova prenotazione tavolo — ${data.data} ore ${data.ora}`,
        text: `Nuova prenotazione ristorante:

Ospite: ${data.guestNome} ${data.guestCognome}
Email: ${data.guestEmail}
${data.guestTelefono ? `Telefono: ${data.guestTelefono}\n` : ''}Data: ${data.data}
Ora: ${data.ora}
Persone: ${data.numPersone}
${data.note ? `Note: ${data.note}\n` : ''}${prenotazioneId ? `\n(Ospite in-house — soggiorno ${prenotazioneId})` : ''}`,
        hostId: struttura.hostId,
      })
    } catch (e) {
      logger.warn('Email notifica host ristorante non inviata', 'book/ristorante', { error: String(e) })
    }
  }

  return NextResponse.json({
    prenotazione: {
      id: creata.id,
      stato: 'CONFERMATA',
      data: data.data,
      ora: data.ora,
      numPersone: data.numPersone,
      inHouse: prenotazioneId != null,
    },
    messaggio: 'Il tuo tavolo è prenotato. Riceverai conferma via email.',
  }, { status: 201 })
}
