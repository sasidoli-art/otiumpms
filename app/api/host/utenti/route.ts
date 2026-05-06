import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { sendEmailGeneric } from '@/lib/email'
import { notDeleted } from '@/lib/prisma-helpers'

// ─── GET: List staff members + pending invites ───────────────────────────────

export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const [members, invites] = await Promise.all([
    prisma.staffMember.findMany({
      where: { hostId: auth.user.hostId, ...notDeleted },
      include: {
        user: {
          select: { id: true, nome: true, cognome: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staffInvite.findMany({
      where: {
        hostId: auth.user.hostId,
        stato: 'INVIATO',
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ members, invites })
}

// ─── POST: Create staff invitation ───────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email('Email non valida'),
  nome: z.string().min(1, 'Nome obbligatorio'),
  cognome: z.string().min(1, 'Cognome obbligatorio'),
  ruolo: z.enum([
    'MANAGER',
    'RECEPTIONIST',
    'HOUSEKEEPING',
    'SPA_OPERATOR',
    'RESTAURANT',
    'CONCIERGE',
    'READONLY',
  ]),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 422 },
    )
  }

  const { email, nome, cognome, ruolo } = parsed.data

  // Check if email already exists as staff for this host
  const existingMember = await prisma.staffMember.findFirst({
    where: {
      hostId: auth.user.hostId,
      ...notDeleted,
      user: { email },
    },
  })
  if (existingMember) {
    return NextResponse.json(
      { error: 'Questo utente è già membro dello staff' },
      { status: 409 },
    )
  }

  // Check if there's already a pending invite for this email
  const existingInvite = await prisma.staffInvite.findFirst({
    where: {
      hostId: auth.user.hostId,
      email,
      stato: 'INVIATO',
    },
  })
  if (existingInvite) {
    return NextResponse.json(
      { error: 'Esiste già un invito in sospeso per questa email' },
      { status: 409 },
    )
  }

  // Get host name for the invitation email
  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { nomeAzienda: true },
  })

  const scadenzaAt = new Date()
  scadenzaAt.setDate(scadenzaAt.getDate() + 7)

  const invite = await prisma.staffInvite.create({
    data: {
      hostId: auth.user.hostId,
      email,
      nome,
      cognome,
      ruolo,
      invitatoDa: auth.user.name,
      scadenzaAt,
    },
  })

  await auditFromAuth(auth, {
    azione: 'staff.invito.creato',
    entita: 'staffInvite',
    entitaId: invite.id,
    dettagli: `Invito staff ${cognome} ${nome} <${email}> ruolo=${ruolo}`,
  })

  // Send invitation email
  const registrationUrl = `${process.env.NEXTAUTH_URL}/registrazione/${invite.token}`
  const hostName = host?.nomeAzienda ?? 'Otium Week'

  try {
    await sendEmailGeneric({
      to: email,
      subject: `Sei stato invitato come ${ruolo} su ${hostName}`,
      text: `Ciao ${nome},\n\nSei stato invitato da ${hostName} come ${ruolo}.\n\nClicca sul link seguente per registrarti:\n${registrationUrl}\n\nL'invito scade tra 7 giorni.\n\nA presto,\n${hostName}`,
      hostId: auth.user.hostId,
    })
  } catch {
    // Email send failure is non-blocking — invite is still created
  }

  return NextResponse.json(invite, { status: 201 })
}
