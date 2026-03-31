import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sendEmailConfermaAppuntamentoSpa, sendEmailNotificaNuovoAppuntamentoSpa } from '@/lib/email'
import { logger } from '@/lib/logger'

const schema = z.object({
  trattamentoId: z.string().optional(),
  percorsoId: z.string().optional(),
  terapistaId: z.string().optional(),
  cabinaId: z.string().optional(),
  dataOra: z.string(),
  durata: z.number().int().min(15),
  prezzoTotale: z.number().min(0),
  guestNome: z.string().min(1).max(100),
  guestCognome: z.string().min(1).max(100),
  guestEmail: z.string().email().max(200),
  guestTelefono: z.string().max(30).optional(),
  note: z.string().max(1000).optional(),
})

export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }
) {
  const params = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: {
      hostId: true,
      host: { select: { nomeAzienda: true, user: { select: { email: true } } } },
    },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body non valido' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data
  if (!data.trattamentoId && !data.percorsoId) {
    return NextResponse.json({ error: 'Specificare trattamentoId o percorsoId' }, { status: 422 })
  }

  const dataOra = new Date(data.dataOra)
  if (isNaN(dataOra.getTime())) return NextResponse.json({ error: 'Data non valida' }, { status: 400 })
  if (dataOra < new Date()) return NextResponse.json({ error: 'Non è possibile prenotare nel passato' }, { status: 400 })

  const dataFine = new Date(dataOra.getTime() + data.durata * 60_000)

  // Verify treatment belongs to this host and is bookable online — also fetch name for email
  let servizioNome = 'Trattamento SPA'
  if (data.trattamentoId) {
    const t = await prisma.trattamentoSpa.findFirst({
      where: { id: data.trattamentoId, hostId: struttura.hostId, attivo: true, prenotabileOnline: true },
    })
    if (!t) return NextResponse.json({ error: 'Trattamento non disponibile per prenotazione online' }, { status: 404 })
    servizioNome = t.nome
  }
  if (data.percorsoId) {
    const p = await prisma.percorsoBenessere.findFirst({
      where: { id: data.percorsoId, hostId: struttura.hostId, attivo: true },
    })
    if (p) servizioNome = p.nome
  }

  // Verify therapist conflict
  if (data.terapistaId) {
    const conflitto = await prisma.appuntamentoSpa.findFirst({
      where: {
        hostId: struttura.hostId,
        terapistaId: data.terapistaId,
        stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
        dataOra: { lt: dataFine },
        AND: [{ dataOra: { gte: new Date(dataOra.getTime() - 24 * 3600_000) } }],
      },
    })
    if (conflitto) {
      const cInizio = new Date(conflitto.dataOra)
      const cFine = new Date(cInizio.getTime() + conflitto.durata * 60_000)
      if (cInizio < dataFine && cFine > dataOra) {
        return NextResponse.json({ error: 'Il terapista selezionato non è disponibile in questo orario' }, { status: 409 })
      }
    }
  }

  // Verify cabin conflict
  if (data.cabinaId) {
    const conflitto = await prisma.appuntamentoSpa.findFirst({
      where: {
        hostId: struttura.hostId,
        cabinaId: data.cabinaId,
        stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
        dataOra: { lt: dataFine },
        AND: [{ dataOra: { gte: new Date(dataOra.getTime() - 24 * 3600_000) } }],
      },
    })
    if (conflitto) {
      const cInizio = new Date(conflitto.dataOra)
      const cFine = new Date(cInizio.getTime() + conflitto.durata * 60_000)
      if (cInizio < dataFine && cFine > dataOra) {
        return NextResponse.json({ error: 'La cabina selezionata non è disponibile in questo orario' }, { status: 409 })
      }
    }
  }

  const appuntamento = await prisma.appuntamentoSpa.create({
    data: {
      hostId: struttura.hostId,
      trattamentoId: data.trattamentoId ?? null,
      percorsoId: data.percorsoId ?? null,
      terapistaId: data.terapistaId ?? null,
      cabinaId: data.cabinaId ?? null,
      dataOra,
      durata: data.durata,
      prezzoTotale: data.prezzoTotale,
      guestNome: data.guestNome.trim(),
      guestCognome: data.guestCognome.trim(),
      guestEmail: data.guestEmail.trim().toLowerCase(),
      guestTelefono: data.guestTelefono?.trim() ?? null,
      note: data.note?.trim() ?? null,
      stato: 'PRENOTATO',
    },
  })

  // ── Notifica in-app per l'host ────────────────────────────────────────────
  const oraFmt = dataOra.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const dataFmt = dataOra.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  await prisma.notifica.create({
    data: {
      hostId: struttura.hostId,
      tipo: 'spa',
      titolo: 'Nuovo appuntamento SPA',
      messaggio: `${data.guestNome} ${data.guestCognome} ha prenotato "${servizioNome}" per il ${dataFmt} alle ${oraFmt}`,
      linkUrl: '/host/spa/appuntamenti',
    },
  })

  // ── Email notifiche (non bloccanti) ──────────────────────────────────────
  const hostNome = struttura.host.nomeAzienda
  const hostEmail = struttura.host.user.email

  await Promise.allSettled([
    sendEmailConfermaAppuntamentoSpa({
      guestEmail: data.guestEmail,
      guestNome: data.guestNome,
      hostNome,
      servizioNome,
      dataOra,
      durata: data.durata,
      prezzoTotale: data.prezzoTotale,
    }).catch(err => logger.error('Email conferma SPA (guest) fallita', 'prenota/route', { error: String(err) })),

    sendEmailNotificaNuovoAppuntamentoSpa({
      hostEmail,
      hostNome,
      guestNome: data.guestNome,
      guestCognome: data.guestCognome,
      guestEmail: data.guestEmail,
      guestTelefono: data.guestTelefono,
      servizioNome,
      dataOra,
      durata: data.durata,
      prezzoTotale: data.prezzoTotale,
      note: data.note,
    }).catch(err => logger.error('Email notifica SPA (host) fallita', 'prenota/route', { error: String(err) })),
  ])

  return NextResponse.json({ id: appuntamento.id }, { status: 201 })
}
