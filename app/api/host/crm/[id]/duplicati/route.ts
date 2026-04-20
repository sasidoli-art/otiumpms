import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/host/crm/[id]/duplicati
// Trova potenziali duplicati per lo stesso host:
//  - email uguale (normalizzata)
//  - telefono uguale (solo cifre)
//  - nome+cognome identici (case-insensitive, spazi normalizzati)
// Ritorna massimo 20 candidati con motivazione del match.
export async function GET(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const emailNorm = ospite.email.trim().toLowerCase()
  const telefonoNorm = (ospite.telefono ?? '').replace(/\D/g, '')
  const nomeNorm = ospite.nome.trim().toLowerCase()
  const cognomeNorm = ospite.cognome.trim().toLowerCase()

  // Query candidates via OR
  const orFilters: Record<string, unknown>[] = [
    { email: { equals: emailNorm, mode: 'insensitive' } },
  ]
  if (telefonoNorm.length >= 6) {
    orFilters.push({ telefono: { contains: telefonoNorm.slice(-8) } })
  }
  orFilters.push({
    AND: [
      { nome: { equals: nomeNorm, mode: 'insensitive' } },
      { cognome: { equals: cognomeNorm, mode: 'insensitive' } },
    ],
  })

  const candidati = await prisma.ospiteCRM.findMany({
    where: {
      hostId: auth.user.hostId,
      id: { not: ospite.id },
      OR: orFilters,
    },
    take: 20,
    orderBy: { dataUltimoSoggiorno: 'desc' },
  })

  // Calcola motivazione + score per ogni match
  const risultati = candidati.map((c) => {
    const motivi: string[] = []
    let score = 0
    if (c.email.trim().toLowerCase() === emailNorm) {
      motivi.push('email')
      score += 50
    }
    const cTel = (c.telefono ?? '').replace(/\D/g, '')
    if (telefonoNorm && cTel && cTel.slice(-8) === telefonoNorm.slice(-8)) {
      motivi.push('telefono')
      score += 30
    }
    if (
      c.nome.trim().toLowerCase() === nomeNorm
      && c.cognome.trim().toLowerCase() === cognomeNorm
    ) {
      motivi.push('nome_cognome')
      score += 20
    }
    return {
      ospite: {
        ...c,
        dataUltimoSoggiorno: c.dataUltimoSoggiorno?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      },
      motivi,
      score,
    }
  }).sort((a, b) => b.score - a.score)

  return NextResponse.json({
    ospite: {
      ...ospite,
      dataUltimoSoggiorno: ospite.dataUltimoSoggiorno?.toISOString() ?? null,
      createdAt: ospite.createdAt.toISOString(),
      updatedAt: ospite.updatedAt.toISOString(),
    },
    duplicati: risultati,
  })
}
