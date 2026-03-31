import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// GET /api/book/[strutturaId]/spa — public SPA catalog (treatments, pathways, therapists)
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> },
) {
  const params = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: {
      id: true, nome: true, descrizione: true, citta: true,
      host: { select: { id: true, nomeAzienda: true, sitoWeb: true } },
    },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const hostId = struttura.host.id

  const [trattamenti, percorsi, terapisti] = await Promise.all([
    prisma.trattamentoSpa.findMany({
      where: { hostId, attivo: true },
      select: {
        id: true, nome: true, categoria: true, durata: true,
        prezzo: true, descrizione: true, colore: true,
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    }),
    prisma.percorsoBenessere.findMany({
      where: { hostId, attivo: true },
      select: {
        id: true, nome: true, descrizione: true, prezzo: true,
        durataMinuti: true, colore: true,
        passaggi: {
          select: {
            ordine: true, durata: true, note: true,
            trattamento: { select: { nome: true, categoria: true } },
          },
          orderBy: { ordine: 'asc' },
        },
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.terapistaSpa.findMany({
      where: { hostId, attivo: true, profiloPublico: true },
      select: {
        id: true, nome: true, cognome: true, bio: true,
        specializzazioni: true, colore: true,
      },
      orderBy: [{ nome: 'asc' }],
    }),
  ])

  return NextResponse.json({
    struttura: {
      id: struttura.id,
      nome: struttura.nome,
      descrizione: struttura.descrizione,
      citta: struttura.citta,
      nomeAzienda: struttura.host.nomeAzienda,
    },
    trattamenti,
    percorsi,
    terapisti,
  })
}

// POST /api/book/[strutturaId]/spa — public SPA booking
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ strutturaId: string }> },
) {
  const params = await paramsPromise

  // Rate limiting
  const ip = getClientIp(req)
  const rl = rateLimit(ip, { max: 10, windowMs: 10 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { id: true, hostId: true, nome: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const {
    guestNome, guestCognome, guestEmail, guestTelefono,
    trattamentoId, percorsoId, terapistaId,
    dataOra, note,
  } = body as Record<string, string | undefined>

  // Validate required fields
  if (!guestNome || !guestCognome || !guestEmail || !dataOra) {
    return NextResponse.json({ error: 'Nome, cognome, email e data/ora sono obbligatori' }, { status: 400 })
  }
  if (!trattamentoId && !percorsoId) {
    return NextResponse.json({ error: 'Seleziona un trattamento o un percorso' }, { status: 400 })
  }

  // Load treatment/pathway for duration + price
  let durata = 0
  let prezzo = 0
  let servizioNome = ''

  if (trattamentoId) {
    const trattamento = await prisma.trattamentoSpa.findFirst({
      where: { id: trattamentoId, hostId: struttura.hostId, attivo: true },
    })
    if (!trattamento) return NextResponse.json({ error: 'Trattamento non trovato' }, { status: 404 })
    durata = trattamento.durata
    prezzo = trattamento.prezzo
    servizioNome = trattamento.nome
  } else if (percorsoId) {
    const percorso = await prisma.percorsoBenessere.findFirst({
      where: { id: percorsoId, hostId: struttura.hostId, attivo: true },
    })
    if (!percorso) return NextResponse.json({ error: 'Percorso non trovato' }, { status: 404 })
    durata = percorso.durataMinuti
    prezzo = percorso.prezzo
    servizioNome = percorso.nome
  }

  const dtStart = new Date(dataOra)
  if (isNaN(dtStart.getTime())) {
    return NextResponse.json({ error: 'Data/ora non valida' }, { status: 400 })
  }

  // Check if date is in the future
  if (dtStart < new Date()) {
    return NextResponse.json({ error: 'Non è possibile prenotare nel passato' }, { status: 400 })
  }

  const dtEnd = new Date(dtStart.getTime() + durata * 60_000)

  // ── Availability check ──────────────────────────────────────────
  const giornoJs = dtStart.getDay()
  const giorno = giornoJs === 0 ? 6 : giornoJs - 1
  const iniMins = dtStart.getHours() * 60 + dtStart.getMinutes()
  const finMins = dtEnd.getHours() * 60 + dtEnd.getMinutes()
  const toMins = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }

  // Find available therapist
  const terapistiWhere: Record<string, unknown> = {
    hostId: struttura.hostId, attivo: true,
  }
  if (terapistaId) terapistiWhere.id = terapistaId

  const terapisti = await prisma.terapistaSpa.findMany({
    where: terapistiWhere,
    include: { disponibilita: { where: { attiva: true } } },
  })

  // Find conflicting appointments
  const conflitti = await prisma.appuntamentoSpa.findMany({
    where: {
      hostId: struttura.hostId,
      stato: { notIn: ['ANNULLATO', 'NO_SHOW'] },
      dataOra: { lt: dtEnd },
    },
    select: { terapistaId: true, cabinaId: true, dataOra: true, durata: true },
  })
  const realConflitti = conflitti.filter(a => {
    const aFine = new Date(a.dataOra.getTime() + a.durata * 60_000)
    return aFine > dtStart
  })
  const terapistiBusy = new Set(realConflitti.map(a => a.terapistaId).filter(Boolean))
  const cabineBusy = new Set(realConflitti.map(a => a.cabinaId).filter(Boolean))

  // Find first available therapist
  let terapistaAssegnato: string | null = null
  for (const ter of terapisti) {
    if (terapistiBusy.has(ter.id)) continue
    const fasce = ter.disponibilita
    if (fasce.length === 0) continue

    // Check blocks
    const blocco = fasce.some(f => {
      if (f.tipo !== 'BLOCCO' || !f.data) return false
      const d = new Date(f.data)
      return d.getFullYear() === dtStart.getFullYear() &&
        d.getMonth() === dtStart.getMonth() && d.getDate() === dtStart.getDate() &&
        toMins(f.orarioInizio) <= iniMins && toMins(f.orarioFine) >= finMins
    })
    if (blocco) continue

    // Check coverage
    const specificaCheck = fasce.filter(f => {
      if (f.tipo !== 'SPECIFICA' || !f.data) return false
      const d = new Date(f.data)
      return d.getFullYear() === dtStart.getFullYear() &&
        d.getMonth() === dtStart.getMonth() && d.getDate() === dtStart.getDate()
    })
    const fasciaApplicabile = specificaCheck.length > 0
      ? specificaCheck
      : fasce.filter(f => f.tipo === 'SETTIMANALE' && f.giorno === giorno)

    const coperto = fasciaApplicabile.some(f =>
      toMins(f.orarioInizio) <= iniMins && toMins(f.orarioFine) >= finMins
    )
    if (!coperto) continue

    terapistaAssegnato = ter.id
    break
  }

  if (!terapistaAssegnato) {
    return NextResponse.json({ error: 'Nessun terapista disponibile per la data e ora selezionate. Prova un altro orario.' }, { status: 409 })
  }

  // Find available cabin
  const cabine = await prisma.cabinaSpa.findMany({
    where: { hostId: struttura.hostId, attiva: true },
  })
  const cabinaAssegnata = cabine.find(c => !cabineBusy.has(c.id))?.id ?? null

  // ── Create appointment ──────────────────────────────────────────
  const appuntamento = await prisma.appuntamentoSpa.create({
    data: {
      hostId: struttura.hostId,
      guestNome: guestNome.trim(),
      guestCognome: guestCognome.trim(),
      guestEmail: guestEmail.trim(),
      guestTelefono: (guestTelefono as string)?.trim() || null,
      trattamentoId: trattamentoId || null,
      percorsoId: percorsoId || null,
      terapistaId: terapistaAssegnato,
      cabinaId: cabinaAssegnata,
      dataOra: dtStart,
      durata,
      prezzoTotale: prezzo,
      stato: 'PRENOTATO',
      note: (note as string)?.trim() || null,
    },
  })

  // Create notification for host
  await prisma.notifica.create({
    data: {
      hostId: struttura.hostId,
      tipo: 'prenotazione',
      titolo: 'Nuovo appuntamento SPA',
      messaggio: `${guestNome} ${guestCognome} ha prenotato "${servizioNome}" per il ${dtStart.toLocaleDateString('it-IT')} alle ${dtStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
      linkUrl: `/host/spa/appuntamenti`,
    },
  })

  logger.info('Appuntamento SPA pubblico creato', 'book/spa', {
    appuntamentoId: appuntamento.id,
    hostId: struttura.hostId,
    servizio: servizioNome,
  })

  return NextResponse.json({
    id: appuntamento.id,
    servizio: servizioNome,
    dataOra: dtStart.toISOString(),
    durata,
    prezzo,
  }, { status: 201 })
}
