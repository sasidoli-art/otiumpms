import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { validatePassword, isPasswordPwned } from '@/lib/password-policy'

// ─── GET: Validate token and return invite details ───────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
    include: {
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
  }

  if (invite.stato !== 'INVIATO') {
    return NextResponse.json({ error: 'Invito non più valido' }, { status: 410 })
  }

  if (new Date() > invite.scadenzaAt) {
    // Mark as expired
    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { stato: 'SCADUTO' },
    })
    return NextResponse.json({ error: 'Invito scaduto' }, { status: 410 })
  }

  return NextResponse.json({
    nome: invite.nome,
    cognome: invite.cognome,
    email: invite.email,
    ruolo: invite.ruolo,
    hostName: invite.host.nomeAzienda,
  })
}

// ─── POST: Complete registration ─────────────────────────────────────────────

const registerSchema = z.object({
  password: z.string().min(10, 'La password deve essere di almeno 10 caratteri'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  // Rate limit: 5 attempts per minute per IP
  const ip = getClientIp(req)
  const limit = rateLimit(`registrazione:${ip}`, { windowMs: 60_000, max: 5 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Troppe richieste, riprova tra poco' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const { token } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 422 },
    )
  }

  const { password } = parsed.data

  const invite = await prisma.staffInvite.findUnique({
    where: { token },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
  }

  if (invite.stato !== 'INVIATO') {
    return NextResponse.json({ error: 'Invito non più valido' }, { status: 410 })
  }

  if (new Date() > invite.scadenzaAt) {
    await prisma.staffInvite.update({
      where: { id: invite.id },
      data: { stato: 'SCADUTO' },
    })
    return NextResponse.json({ error: 'Invito scaduto' }, { status: 410 })
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  })

  if (existingUser) {
    // User exists — just create the StaffMember link
    const existingMembership = await prisma.staffMember.findFirst({
      where: { userId: existingUser.id, hostId: invite.hostId },
    })

    if (existingMembership) {
      // Already a member — just mark invite as accepted
      await prisma.staffInvite.update({
        where: { id: invite.id },
        data: { stato: 'ACCETTATO', accettatoAt: new Date() },
      })
      return NextResponse.json({ error: 'Utente già registrato come staff' }, { status: 409 })
    }

    // Create StaffMember + update invite in a transaction
    await prisma.$transaction([
      prisma.staffMember.create({
        data: {
          userId: existingUser.id,
          hostId: invite.hostId,
          ruolo: invite.ruolo,
        },
      }),
      prisma.staffInvite.update({
        where: { id: invite.id },
        data: { stato: 'ACCETTATO', accettatoAt: new Date() },
      }),
    ])

    return NextResponse.json({ success: true })
  }

  // Policy check: la lunghezza minima è già validata dallo schema, qui controlliamo
  // complessità + breach DB online (best effort).
  const policy = validatePassword(password)
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 })
  }
  if (await isPasswordPwned(password)) {
    return NextResponse.json(
      { error: 'Questa password è apparsa in un data breach noto. Scegline una diversa.' },
      { status: 400 },
    )
  }

  // Create new User + StaffMember + update invite in a transaction
  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invite.email,
        password: hashedPassword,
        nome: invite.nome,
        cognome: invite.cognome,
        role: 'STAFF',
      },
    })

    await tx.staffMember.create({
      data: {
        userId: user.id,
        hostId: invite.hostId,
        ruolo: invite.ruolo,
      },
    })

    await tx.staffInvite.update({
      where: { id: invite.id },
      data: { stato: 'ACCETTATO', accettatoAt: new Date() },
    })
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
