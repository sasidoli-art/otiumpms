import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * GET /api/superadmin/host/[id]
 * Ritorna l'host completo con strutture, unità, user, moduli attivi.
 * Usato dalla pagina dettaglio SuperAdmin.
 */
export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise

  const host = await prisma.host.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, nome: true, cognome: true, attivo: true },
      },
      strutture: {
        orderBy: { createdAt: 'asc' },
        include: {
          unita: {
            orderBy: { nome: 'asc' },
            select: {
              id: true,
              nome: true,
              capacita: true,
              lettiExtra: true,
              prezzoBase: true,
              attiva: true,
              piano: true,
            },
          },
          _count: { select: { prenotazioni: true } },
        },
      },
      _count: { select: { strutture: true, prenotazioni: true, fatture: true } },
    },
  })

  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  return NextResponse.json(host)
}

/**
 * PATCH /api/superadmin/host/[id]
 * Aggiorna i dati azienda/referente di un host.
 *
 * Body: qualunque combinazione di campi Host modificabili.
 */
const patchSchema = z.object({
  // Azienda
  nomeAzienda: z.string().min(1).max(255).optional(),
  partitaIva: z.string().max(20).optional().nullable(),
  codiceFiscale: z.string().max(20).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  sitoWeb: z.string().max(255).optional().nullable(),
  indirizzo: z.string().max(255).optional().nullable(),
  citta: z.string().max(100).optional().nullable(),
  provincia: z.string().max(10).optional().nullable(),
  cap: z.string().max(10).optional().nullable(),
  regione: z.string().max(100).optional().nullable(),

  // Fatturazione
  fattNomeAzienda: z.string().max(255).optional().nullable(),
  fattPartitaIva: z.string().max(20).optional().nullable(),
  fattPec: z.string().email().max(254).optional().nullable().or(z.literal('')),
  fattCodiceSDI: z.string().max(20).optional().nullable(),
  regimeFiscale: z.string().max(20).optional().nullable(),

  // Piano + stato
  piano: z.enum(['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']).optional(),
  statoAbbonamento: z.enum(['ATTIVO', 'IN_PROVA', 'SOSPESO', 'SCADUTO']).optional(),

  // Concierge
  conciergeAttivo: z.boolean().optional(),
  conciergeSystemPrompt: z.string().max(4096).optional().nullable(),

  // Referente (user relation)
  userNome: z.string().min(1).max(100).optional(),
  userCognome: z.string().min(1).max(100).optional(),
  userEmail: z.string().email().max(254).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise
  const host = await prisma.host.findUnique({ where: { id }, include: { user: true } })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const d = parsed.data

  // Aggiorna Host
  const hostData: Record<string, unknown> = {}
  const hostFields = [
    'nomeAzienda', 'partitaIva', 'codiceFiscale', 'telefono', 'sitoWeb',
    'indirizzo', 'citta', 'provincia', 'cap', 'regione',
    'fattNomeAzienda', 'fattPartitaIva', 'fattPec', 'fattCodiceSDI', 'regimeFiscale',
    'piano', 'statoAbbonamento', 'conciergeAttivo', 'conciergeSystemPrompt',
  ] as const
  for (const f of hostFields) {
    if ((d as Record<string, unknown>)[f] !== undefined) {
      const v = (d as Record<string, unknown>)[f]
      hostData[f] = v === '' ? null : v
    }
  }

  // Aggiorna User (nome, cognome, email) se richiesto
  const userData: Record<string, unknown> = {}
  if (d.userNome !== undefined) userData.nome = d.userNome
  if (d.userCognome !== undefined) userData.cognome = d.userCognome
  if (d.userEmail !== undefined) userData.email = d.userEmail.toLowerCase()

  await prisma.$transaction(async (tx) => {
    if (Object.keys(hostData).length > 0) {
      await tx.host.update({ where: { id }, data: hostData })
    }
    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: host.userId }, data: userData })
    }
  })

  await audit({
    hostId: id,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.host.aggiornato',
    entita: 'Host',
    entitaId: id,
    dettagli: `Campi modificati: ${Object.keys(hostData).concat(Object.keys(userData)).join(', ')}`,
  })

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/superadmin/host/[id]
 * Cancella completamente un host (CASCADE su strutture, unità, prenotazioni,
 * fatture, ecc.). Richiede conferma query param ?confirm=NOME_AZIENDA.
 */
export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { id } = await paramsPromise
  const host = await prisma.host.findUnique({ where: { id }, select: { id: true, nomeAzienda: true, userId: true } })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const url = new URL(req.url)
  const confirm = url.searchParams.get('confirm')
  if (confirm !== host.nomeAzienda) {
    return NextResponse.json(
      { error: `Per confermare la cancellazione, aggiungi ?confirm=${host.nomeAzienda}` },
      { status: 400 }
    )
  }

  // Cancella user (cascade elimina anche host e tutto il resto)
  await prisma.user.delete({ where: { id: host.userId } })

  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.host.eliminato',
    entita: 'Host',
    entitaId: id,
    dettagli: `Eliminato host "${host.nomeAzienda}" (CASCADE su tutto)`,
  })

  return NextResponse.json({ ok: true })
}
