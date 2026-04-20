import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verificaPortaleToken } from '@/lib/consent'
import { audit } from '@/lib/audit'
import { sendEmailGeneric } from '@/lib/email'
import { logger } from '@/lib/logger'

/**
 * POST /api/privacy/[token]/cancellazione
 * Body: { motivo? }
 *
 * Crea una richiesta di cancellazione (Art. 17 GDPR).
 * L'host ha 30 giorni per processarla.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const subject = verificaPortaleToken(token)
  if (!subject) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }
  const { email, hostId } = subject

  let body: { motivo?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* body opzionale */
  }

  const [host, ospiteCRM, primaPrenotazione] = await Promise.all([
    prisma.host.findUnique({ where: { id: hostId }, select: { nomeAzienda: true } }),
    prisma.ospiteCRM.findUnique({
      where: { hostId_email: { hostId, email } },
      select: { nome: true, cognome: true },
    }),
    prisma.prenotazione.findFirst({
      where: { hostId, guestEmail: email },
      select: { guestNome: true, guestCognome: true },
      orderBy: { dataArrivo: 'desc' },
    }),
  ])

  const guestNome = ospiteCRM
    ? `${ospiteCRM.nome} ${ospiteCRM.cognome}`
    : primaPrenotazione
      ? `${primaPrenotazione.guestNome} ${primaPrenotazione.guestCognome}`
      : 'Ospite'

  // Dedup: se esiste già una richiesta pendente per questo ospite, non duplicare
  const esistente = await prisma.richiestaCancellazione.findFirst({
    where: {
      hostId,
      guestEmail: email,
      stato: { in: ['PENDENTE', 'IN_LAVORAZIONE'] },
    },
  })
  if (esistente) {
    return NextResponse.json(
      { ok: true, id: esistente.id, alreadyPending: true, scadenzaAt: esistente.scadenzaAt },
      { status: 200 },
    )
  }

  const scadenzaAt = new Date()
  scadenzaAt.setDate(scadenzaAt.getDate() + 30)

  const richiesta = await prisma.richiestaCancellazione.create({
    data: {
      hostId,
      guestEmail: email,
      guestNome,
      motivo: body.motivo?.substring(0, 2000) ?? null,
      scadenzaAt,
    },
  })

  await audit({
    hostId,
    azione: 'gdpr.art17.richiesta_cancellazione.ricevuta',
    entita: 'richiestaCancellazione',
    entitaId: richiesta.id,
    dettagli: `Richiesta cancellazione dati da ${email}. Scadenza: ${scadenzaAt.toISOString().slice(0, 10)}.`,
  })

  // Notifica in-app all'host
  await prisma.notifica.create({
    data: {
      hostId,
      tipo: 'sistema',
      titolo: 'Richiesta cancellazione dati (GDPR Art. 17)',
      messaggio: `${guestNome} (${email}) ha richiesto la cancellazione dei propri dati. Scadenza legale: 30 giorni.`,
      linkUrl: `/host/gdpr?tab=richieste`,
    },
  })

  // Email host (best effort)
  try {
    const hostUser = await prisma.user.findFirst({
      where: { host: { id: hostId } },
      select: { email: true },
    })
    if (hostUser) {
      await sendEmailGeneric({
        to: hostUser.email,
        subject: '[GDPR] Richiesta cancellazione dati ricevuta',
        text: `Un ospite (${guestNome}, ${email}) ha richiesto la cancellazione dei propri dati.\n\nMotivo fornito: ${body.motivo ?? '(non specificato)'}\n\nSei tenuto a processare la richiesta entro il ${scadenzaAt.toLocaleDateString('it-IT')} (Art. 17 GDPR).\n\nVai su /host/gdpr per gestirla.\n\n${host?.nomeAzienda ?? ''}`,
        hostId,
      })
    }
  } catch (e) {
    logger.warn('Email notifica cancellazione non inviata', 'privacy/cancellazione', {
      error: e instanceof Error ? e.message : String(e),
    })
  }

  return NextResponse.json({
    ok: true,
    id: richiesta.id,
    scadenzaAt: richiesta.scadenzaAt,
  })
}
