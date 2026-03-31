import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { parseBody } from '@/lib/validations'
import { prisma } from '@/lib/db'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password attuale obbligatoria'),
  newPassword: z.string().min(8, 'La nuova password deve avere almeno 8 caratteri'),
  confirmPassword: z.string().min(1, 'Conferma password obbligatoria'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(passwordSchema, await req.json())
  if (parsed.error) return parsed.error
  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { password: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const passwordOk = await bcrypt.compare(currentPassword, user.password)
  if (!passwordOk) {
    return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { password: hashed },
  })

  return NextResponse.json({ ok: true })
}
