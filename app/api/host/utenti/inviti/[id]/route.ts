import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sendEmailGeneric } from '@/lib/email'

// ─── DELETE: Revoke invitation ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  const invite = await prisma.staffInvite.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
  }
  if (invite.stato !== 'INVIATO') {
    return NextResponse.json({ error: 'Invito non revocabile' }, { status: 400 })
  }

  const updated = await prisma.staffInvite.update({
    where: { id },
    data: { stato: 'REVOCATO' },
  })

  return NextResponse.json(updated)
}

// ─── POST: Resend invitation email ───────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await params

  const invite = await prisma.staffInvite.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Invito non trovato' }, { status: 404 })
  }
  if (invite.stato !== 'INVIATO') {
    return NextResponse.json(
      { error: 'Solo gli inviti in sospeso possono essere reinviati' },
      { status: 400 },
    )
  }

  // Extend expiration by 7 days from now
  const scadenzaAt = new Date()
  scadenzaAt.setDate(scadenzaAt.getDate() + 7)

  await prisma.staffInvite.update({
    where: { id },
    data: { scadenzaAt },
  })

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { nomeAzienda: true },
  })

  const registrationUrl = `${process.env.NEXTAUTH_URL}/registrazione/${invite.token}`
  const hostName = host?.nomeAzienda ?? 'Otium Week'

  try {
    await sendEmailGeneric({
      to: invite.email,
      subject: `Sei stato invitato come ${invite.ruolo} su ${hostName}`,
      text: `Ciao ${invite.nome},\n\nSei stato invitato da ${hostName} come ${invite.ruolo}.\n\nClicca sul link seguente per registrarti:\n${registrationUrl}\n\nL'invito scade tra 7 giorni.\n\nA presto,\n${hostName}`,
      hostId: auth.user.hostId,
    })
  } catch {
    return NextResponse.json({ error: 'Errore nell\'invio dell\'email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
