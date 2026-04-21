import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { createApiKey } from '@/lib/api-key'

// GET /api/host/api-keys — lista chiavi per host (mostra solo prefix)
export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const keys = await prisma.apiKey.findMany({
    where: { hostId: auth.user.hostId },
    select: {
      id: true, nome: true, prefix: true, scopes: true,
      ultimaUsata: true, scadenza: true, revocata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ keys })
}

// POST /api/host/api-keys — crea nuova chiave
// Ritorna il token completo UNA SOLA VOLTA (da copiare)
const createSchema = z.object({
  nome: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional().default(['prenotazioni:read']),
  scadenza: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const { token, prefix, id } = await createApiKey({
    hostId: auth.user.hostId,
    nome: parsed.data.nome,
    scopes: parsed.data.scopes,
    scadenza: parsed.data.scadenza ? new Date(parsed.data.scadenza) : null,
  })

  await auditFromAuth(auth, {
    azione: 'api_key.creata',
    entita: 'apiKey',
    entitaId: id,
    dettagli: `API key "${parsed.data.nome}" creata (prefix ${prefix})`,
  })

  return NextResponse.json({ id, nome: parsed.data.nome, prefix, token }, { status: 201 })
}
