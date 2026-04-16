import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isModuloAttivo } from '@/lib/moduli'
import { logger } from '@/lib/logger'

/**
 * POST /api/wifi/auth
 *
 * Endpoint pubblico di autenticazione per il portale Wi-Fi ospiti.
 * Supporta due modalita' di login:
 *   1) PRENOTAZIONE: guestNome + (guestCognome?) + numeroCamera + hostId
 *      -> verifica contro una Prenotazione attiva oggi nel dato host.
 *   2) CODICE: codice + hostId
 *      -> verifica contro WifiAccessCode valido e non revocato.
 *
 * Crea una WifiSession con scadenza calcolata e ritorna i dettagli di sessione.
 * Rate-limited per IP.
 *
 * Body (JSON):
 *   { mode: 'prenotazione' | 'codice', hostId: string,
 *     guestNome?, guestCognome?, numeroCamera?, codice? }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const limit = rateLimit(`wifi-auth:${ip}`, { windowMs: 60_000, max: 10 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Troppi tentativi. Riprova tra poco.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { mode, hostId } = body as { mode?: string; hostId?: string }
  if (!hostId || typeof hostId !== 'string') {
    return NextResponse.json({ error: 'hostId obbligatorio' }, { status: 422 })
  }

  // Verifica che l'host esista e il modulo sia attivo
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  if (!host) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'Wi-Fi non disponibile per questa struttura' }, { status: 403 })
  }

  const userAgent = req.headers.get('user-agent') ?? null
  const macClient = typeof body.macClient === 'string' ? body.macClient : null

  // ─── Modalita' 1: PRENOTAZIONE ─────────────────────────────────────────────
  if (mode === 'prenotazione') {
    const guestNome = typeof body.guestNome === 'string' ? body.guestNome.trim() : ''
    const guestCognome = typeof body.guestCognome === 'string' ? body.guestCognome.trim() : ''
    const numeroCamera = typeof body.numeroCamera === 'string' ? body.numeroCamera.trim() : ''

    if (!guestNome || !numeroCamera) {
      return NextResponse.json(
        { error: 'Nome e numero camera sono obbligatori' },
        { status: 422 }
      )
    }

    const oggi = new Date()
    oggi.setHours(0, 0, 0, 0)
    const domani = new Date(oggi)
    domani.setDate(domani.getDate() + 1)

    // Cerca prenotazione attiva: dataArrivo <= oggi < dataPartenza
    const prenotazione = await prisma.prenotazione.findFirst({
      where: {
        hostId: host.id,
        stato: 'CONFERMATA',
        dataArrivo: { lte: domani },
        OR: [
          { dataPartenza: null },
          { dataPartenza: { gt: oggi } },
        ],
        guestNome: { equals: guestNome, mode: 'insensitive' },
        ...(guestCognome
          ? { guestCognome: { equals: guestCognome, mode: 'insensitive' } }
          : {}),
        unita: { nome: { equals: numeroCamera, mode: 'insensitive' } },
      },
      include: { unita: { select: { nome: true } } },
    })

    if (!prenotazione) {
      logger.warn('Wi-Fi login prenotazione fallito', 'wifi/auth', { hostId, guestNome, numeroCamera, ip })
      return NextResponse.json(
        { error: 'Nessuna prenotazione trovata con questi dati' },
        { status: 401 }
      )
    }

    // Durata sessione = fino al check-out (o 24h se non c'e' dataPartenza)
    const expiresAt = prenotazione.dataPartenza
      ? new Date(prenotazione.dataPartenza.getTime())
      : new Date(Date.now() + 24 * 60 * 60 * 1000)

    const session = await prisma.wifiSession.create({
      data: {
        hostId: host.id,
        tipo: 'PRENOTAZIONE',
        prenotazioneId: prenotazione.id,
        guestNome,
        guestCognome: guestCognome || null,
        numeroCamera,
        macClient,
        ipClient: ip,
        userAgent,
        expiresAt,
      },
    })

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      hostNome: host.nomeAzienda,
    })
  }

  // ─── Modalita' 2: CODICE ───────────────────────────────────────────────────
  if (mode === 'codice') {
    const codice = typeof body.codice === 'string' ? body.codice.trim().toUpperCase() : ''
    if (!codice || codice.length < 4) {
      return NextResponse.json({ error: 'Codice non valido' }, { status: 422 })
    }

    const code = await prisma.wifiAccessCode.findUnique({
      where: { codice },
    })

    if (!code || code.hostId !== host.id) {
      logger.warn('Wi-Fi codice non trovato', 'wifi/auth', { hostId, codice, ip })
      return NextResponse.json({ error: 'Codice non valido' }, { status: 401 })
    }
    if (code.revocatoAt) {
      return NextResponse.json({ error: 'Codice revocato' }, { status: 401 })
    }
    if (code.validoFino < new Date()) {
      return NextResponse.json({ error: 'Codice scaduto' }, { status: 401 })
    }
    if (code.usiMax > 0 && code.usiEffettuati >= code.usiMax) {
      return NextResponse.json({ error: 'Codice esaurito' }, { status: 401 })
    }

    const guestNome = typeof body.guestNome === 'string' ? body.guestNome.trim() : 'Walk-in'
    const guestCognome = typeof body.guestCognome === 'string' ? body.guestCognome.trim() : null

    const expiresAt = new Date(Date.now() + code.durataMinuti * 60 * 1000)

    // Transazione: incremento usi + crea sessione
    const session = await prisma.$transaction(async (tx) => {
      await tx.wifiAccessCode.update({
        where: { id: code.id },
        data: { usiEffettuati: { increment: 1 } },
      })
      return tx.wifiSession.create({
        data: {
          hostId: host.id,
          tipo: 'CODICE',
          accessCodeId: code.id,
          guestNome,
          guestCognome,
          macClient,
          ipClient: ip,
          userAgent,
          expiresAt,
        },
      })
    })

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      hostNome: host.nomeAzienda,
    })
  }

  // ─── Modalita' 3: COMPLIMENTARY (accesso gratuito a tempo) ──────────────────
  if (mode === 'complimentary') {
    const guestNome = typeof body.guestNome === 'string' ? body.guestNome.trim() : 'Visitatore'

    // Controlla se l'host ha abilitato complimentary
    const hostFull = await prisma.host.findUnique({
      where: { id: hostId },
      select: { wifiAuthComplimentary: true, wifiComplimentaryMins: true },
    })
    if (!hostFull?.wifiAuthComplimentary) {
      return NextResponse.json({ error: 'Accesso gratuito non disponibile' }, { status: 403 })
    }

    const durataMin = hostFull.wifiComplimentaryMins || 120
    const expiresAt = new Date(Date.now() + durataMin * 60 * 1000)

    const session = await prisma.wifiSession.create({
      data: {
        hostId: host.id,
        tipo: 'COMPLIMENTARY',
        guestNome,
        macClient,
        ipClient: ip,
        userAgent,
        expiresAt,
      },
    })

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      hostNome: host.nomeAzienda,
      durataMinuti: durataMin,
    })
  }

  // ─── Modalita' 4: USER_FORM (registrazione con email) ─────────────────────
  if (mode === 'user_form') {
    const guestNome = typeof body.guestNome === 'string' ? body.guestNome.trim() : ''
    const guestEmail = typeof body.guestEmail === 'string' ? body.guestEmail.trim().toLowerCase() : ''

    if (!guestNome || !guestEmail) {
      return NextResponse.json({ error: 'Nome e email obbligatori' }, { status: 422 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 422 })
    }

    const hostFull = await prisma.host.findUnique({
      where: { id: hostId },
      select: { wifiAuthUserForm: true },
    })
    if (!hostFull?.wifiAuthUserForm) {
      return NextResponse.json({ error: 'Registrazione non disponibile' }, { status: 403 })
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    const session = await prisma.wifiSession.create({
      data: {
        hostId: host.id,
        tipo: 'USER_FORM',
        guestNome,
        guestCognome: guestEmail, // salva email nel campo cognome per audit
        macClient,
        ipClient: ip,
        userAgent,
        expiresAt,
      },
    })

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      expiresAt: session.expiresAt,
      hostNome: host.nomeAzienda,
    })
  }

  return NextResponse.json(
    { error: 'mode deve essere "prenotazione", "codice", "complimentary" o "user_form"' },
    { status: 422 }
  )
}
