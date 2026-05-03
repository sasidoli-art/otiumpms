import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * Endpoint di ricerca forense per richieste autorità (Polizia Postale, magistratura).
 *
 *   POST /api/superadmin/wifi/forensic
 *   Body: filtri di ricerca → JSON paginato di sessioni matching
 *
 *   GET  /api/superadmin/wifi/forensic?filtri…
 *   (versione stesso filtro via query params, comoda per linkare/condividere
 *   la ricerca)
 *
 * Filtri supportati:
 *   - hostId / strutturaId (segregazione per cliente)
 *   - dataInizio / dataFine (range timestamp)
 *   - macClient (search exact normalizzato)
 *   - ipClient (exact match)
 *   - guestNome / guestCognome / guestEmail (substring case-insensitive)
 *   - tipo (PRENOTAZIONE | CODICE | ...)
 *
 * NB: ogni chiamata viene tracciata in audit_log con i filtri usati e il numero
 * di record ritornati. Chain of custody = chi ha cercato cosa, quando.
 *
 * Auth: SuperAdmin only.
 */

const filtersSchema = z.object({
  hostId: z.string().optional(),
  strutturaId: z.string().optional(),
  dataInizio: z.string().datetime().optional(),
  dataFine: z.string().datetime().optional(),
  macClient: z.string().optional(),
  ipClient: z.string().optional(),
  guestNome: z.string().optional(),
  guestCognome: z.string().optional(),
  guestEmail: z.string().optional(),
  tipo: z.enum(['PRENOTAZIONE', 'CODICE', 'COMPLIMENTARY', 'USER_FORM', 'EMAIL_ONLY']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
})

type Filters = z.infer<typeof filtersSchema>

function buildWhere(filters: Filters): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  if (filters.hostId) where.hostId = filters.hostId
  if (filters.strutturaId) {
    // strutturaId non c'è su WifiSession; passa per Prenotazione.strutturaId quando tipo=PRENOTAZIONE
    where.OR = [
      { prenotazioneId: { not: null } }, // filtro applicato lato JS sul join (vedi sotto)
    ]
  }
  if (filters.macClient) {
    where.macClient = { equals: filters.macClient.toUpperCase(), mode: 'insensitive' }
  }
  if (filters.ipClient) where.ipClient = filters.ipClient
  if (filters.guestNome) {
    where.guestNome = { contains: filters.guestNome, mode: 'insensitive' }
  }
  if (filters.guestCognome) {
    where.guestCognome = { contains: filters.guestCognome, mode: 'insensitive' }
  }
  if (filters.tipo) where.tipo = filters.tipo
  if (filters.dataInizio || filters.dataFine) {
    where.startAt = {}
    if (filters.dataInizio) (where.startAt as Record<string, Date>).gte = new Date(filters.dataInizio)
    if (filters.dataFine) (where.startAt as Record<string, Date>).lte = new Date(filters.dataFine)
  }
  return where
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json().catch(() => null)
  const parsed = filtersSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Filtri non validi', issues: parsed.error.format() },
      { status: 422 },
    )
  }
  const filters = parsed.data

  const where = buildWhere(filters)

  // Query principale + join Prenotazione/AccessCode per dati identità
  const sessions = await prisma.wifiSession.findMany({
    where,
    take: filters.limit,
    orderBy: { startAt: 'desc' },
    select: {
      id: true,
      hostId: true,
      tipo: true,
      prenotazioneId: true,
      accessCodeId: true,
      guestNome: true,
      guestCognome: true,
      numeroCamera: true,
      macClient: true,
      ipClient: true,
      userAgent: true,
      startAt: true,
      expiresAt: true,
      revokedAt: true,
      host: { select: { id: true, nomeAzienda: true } },
    },
  })

  // Hydrate guest email + struttura via prenotazione (se presente)
  const prenotazioneIds = sessions
    .map((s) => s.prenotazioneId)
    .filter((x): x is string => Boolean(x))

  const prenotazioni = prenotazioneIds.length
    ? await prisma.prenotazione.findMany({
        where: { id: { in: prenotazioneIds } },
        select: {
          id: true,
          guestEmail: true,
          guestTelefono: true,
          guestTipoDocumento: true,
          guestNumeroDocumento: true,
          guestCodiceFiscale: true,
          guestDataNascita: true,
          guestLuogoNascita: true,
          guestCittadinanzaIstat: true,
          strutturaId: true,
          unita: {
            select: {
              nome: true,
              struttura: { select: { id: true, nome: true } },
            },
          },
        },
      })
    : []
  const prenIndex = new Map(prenotazioni.map((p) => [p.id, p]))

  // Filtra by strutturaId se richiesto (post-query, perché la relazione è indirect)
  let filtered = sessions
  if (filters.strutturaId) {
    filtered = filtered.filter((s) => {
      if (!s.prenotazioneId) return false
      const p = prenIndex.get(s.prenotazioneId)
      return p?.strutturaId === filters.strutturaId
    })
  }
  if (filters.guestEmail) {
    const needle = filters.guestEmail.toLowerCase()
    filtered = filtered.filter((s) => {
      if (!s.prenotazioneId) return false
      const p = prenIndex.get(s.prenotazioneId)
      return p?.guestEmail?.toLowerCase().includes(needle)
    })
  }

  const enriched = filtered.map((s) => {
    const p = s.prenotazioneId ? prenIndex.get(s.prenotazioneId) : undefined
    return {
      sessionId: s.id,
      tipoLogin: s.tipo,
      hostId: s.hostId,
      hostNome: s.host.nomeAzienda,
      strutturaId: p?.unita?.struttura?.id ?? null,
      strutturaNome: p?.unita?.struttura?.nome ?? null,
      numeroCamera: s.numeroCamera ?? p?.unita?.nome ?? null,
      guestNome: s.guestNome,
      guestCognome: s.guestCognome,
      guestEmail: p?.guestEmail ?? null,
      guestTelefono: p?.guestTelefono ?? null,
      guestTipoDocumento: p?.guestTipoDocumento ?? null,
      guestNumeroDocumento: p?.guestNumeroDocumento ?? null,
      guestCodiceFiscale: p?.guestCodiceFiscale ?? null,
      guestDataNascita: p?.guestDataNascita?.toISOString().slice(0, 10) ?? null,
      guestLuogoNascita: p?.guestLuogoNascita ?? null,
      guestCittadinanza: p?.guestCittadinanzaIstat ?? null,
      macClient: s.macClient,
      ipClient: s.ipClient,
      userAgent: s.userAgent,
      sessionStart: s.startAt.toISOString(),
      sessionExpire: s.expiresAt.toISOString(),
      sessionRevoked: s.revokedAt?.toISOString() ?? null,
      prenotazioneId: s.prenotazioneId,
      accessCodeId: s.accessCodeId,
    }
  })

  // Audit log
  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'wifi.forensic.search',
    entita: 'wifi_session',
    dettagli: `Ricerca forense: ${enriched.length} risultati`,
    datiJson: {
      filters,
      resultCount: enriched.length,
    },
  })

  return NextResponse.json({
    ok: true,
    count: enriched.length,
    truncated: enriched.length === filters.limit,
    filters,
    results: enriched,
  })
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const obj = Object.fromEntries(sp.entries())
  const parsed = filtersSchema.safeParse(obj)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Filtri non validi' }, { status: 422 })
  }

  // Riusa la logica POST chiamando con i parametri parsati
  const fakeReq = new Request(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  })
  return POST(fakeReq as NextRequest)
}
