import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import bcrypt from 'bcryptjs'
import { audit } from '@/lib/audit'

/**
 * POST /api/superadmin/host
 * Crea un nuovo host con utente associato.
 *
 * Body: { email, password, nome, cognome, nomeAzienda, citta?, piano? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { email, password, nome, cognome, nomeAzienda, citta, piano } = body

  if (!email || !password || !nome || !cognome || !nomeAzienda) {
    return NextResponse.json({ error: 'Campi obbligatori: email, password, nome, cognome, nomeAzienda' }, { status: 400 })
  }

  // Check email duplicata
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Email già registrata' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  // Crea utente + host in una transazione
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        nome: nome.trim(),
        cognome: cognome.trim(),
        role: 'HOST',
        attivo: true,
      },
    })

    const host = await tx.host.create({
      data: {
        userId: user.id,
        nomeAzienda: nomeAzienda.trim(),
        citta: citta?.trim() || null,
        piano: piano || 'LIGHT',
        statoAbbonamento: 'ATTIVO',
        dataFineAbb: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 anno
      },
    })

    return { user, host }
  })

  await audit({
    hostId: result.host.id,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.host.creato',
    entita: 'Host',
    entitaId: result.host.id,
    dettagli: `Nuovo host ${nomeAzienda} (${email}) creato da SuperAdmin`,
  })

  return NextResponse.json({
    id: result.host.id,
    nomeAzienda: result.host.nomeAzienda,
    email: result.user.email,
  })
}
