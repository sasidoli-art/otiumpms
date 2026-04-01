import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createUserSchema = z.object({
  nome: z.string().min(1, 'Nome richiesto'),
  cognome: z.string().min(1, 'Cognome richiesto'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password minimo 6 caratteri'),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'HOST']),
})

/**
 * POST /api/superadmin/utenti
 * Crea un nuovo utente (solo SUPERADMIN)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Dati non validi' },
      { status: 422 },
    )
  }

  const { nome, cognome, email, password, role } = parsed.data

  // Verifica email unica
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email già registrata' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      nome,
      cognome,
      email,
      password: hashedPassword,
      role: role as 'SUPERADMIN' | 'ADMIN' | 'HOST',
    },
    select: {
      id: true,
      nome: true,
      cognome: true,
      email: true,
      role: true,
      attivo: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
