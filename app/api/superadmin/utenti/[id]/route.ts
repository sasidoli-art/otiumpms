import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { validatePassword, isPasswordPwned } from '@/lib/password-policy'

const updateUserSchema = z.object({
  nome: z.string().min(1).optional(),
  cognome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(10).optional(),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'HOST']).optional(),
  attivo: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Nessun campo da aggiornare' })

/**
 * PATCH /api/superadmin/utenti/[id]
 * Aggiorna un utente (solo SUPERADMIN)
 */
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await paramsPromise
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Dati non validi' },
      { status: 422 },
    )
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const data: Record<string, unknown> = { ...parsed.data }

  // Hash password se presente
  if (data.password && typeof data.password === 'string') {
    const policy = validatePassword(data.password)
    if (!policy.ok) {
      return NextResponse.json({ error: policy.reason }, { status: 400 })
    }
    if (await isPasswordPwned(data.password)) {
      return NextResponse.json(
        { error: 'Questa password è apparsa in un data breach noto. Scegline una diversa.' },
        { status: 400 },
      )
    }
    data.password = await bcrypt.hash(data.password, 12)
  }

  // Verifica email unica se modificata
  if (data.email && data.email !== existing.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: data.email as string } })
    if (emailExists) {
      return NextResponse.json({ error: 'Email già registrata' }, { status: 409 })
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
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

  return NextResponse.json(user)
}

/**
 * DELETE /api/superadmin/utenti/[id]
 * Disattiva un utente (soft delete — imposta attivo=false)
 */
export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await paramsPromise

  // Non permettere di disattivare se stessi
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Non puoi disattivare il tuo account' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id },
    data: { attivo: false },
  })

  return NextResponse.json({ ok: true })
}
