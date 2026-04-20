import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { sendEmailGeneric } from '@/lib/email'

const MOTIVI_VALIDI = [
  'obbligo_legale_conservazione',
  'richiesta_incompleta',
  'identita_non_verificata',
] as const

/**
 * POST /api/host/gdpr/richieste/[id]/rifiuta
 * Body: { motivo, dettagli? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  const body = (await req.json().catch(() => ({}))) as { motivo?: string; dettagli?: string }
  const motivoKey = body.motivo
  if (!motivoKey || !MOTIVI_VALIDI.includes(motivoKey as (typeof MOTIVI_VALIDI)[number])) {
    return NextResponse.json({ error: 'motivo non valido' }, { status: 400 })
  }

  const richiesta = await prisma.richiestaCancellazione.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  if (richiesta.stato === 'COMPLETATA' || richiesta.stato === 'RIFIUTATA') {
    return NextResponse.json({ error: `Gia' ${richiesta.stato.toLowerCase()}` }, { status: 422 })
  }

  const motivoFull = body.dettagli ? `${motivoKey}: ${body.dettagli.substring(0, 1000)}` : motivoKey

  const aggiornata = await prisma.richiestaCancellazione.update({
    where: { id },
    data: { stato: 'RIFIUTATA', motivoRifiuto: motivoFull, completataAt: new Date(), completataDa: auth.user.id },
  })

  await audit({
    hostId: auth.user.hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'gdpr.art17.richiesta_rifiutata',
    entita: 'richiestaCancellazione',
    entitaId: id,
    dettagli: `Richiesta di ${richiesta.guestEmail} rifiutata: ${motivoFull}`,
  })

  // Email ospite
  try {
    const label: Record<string, string> = {
      obbligo_legale_conservazione: 'Obbligo legale di conservazione (es. Art. 2220 CC, Art. 109 TULPS)',
      richiesta_incompleta: 'Richiesta incompleta',
      identita_non_verificata: 'Identità non verificata',
    }
    await sendEmailGeneric({
      to: richiesta.guestEmail,
      subject: 'Richiesta cancellazione dati — rifiutata',
      text: `La tua richiesta di cancellazione dati è stata esaminata e NON può essere eseguita.\n\nMotivo: ${label[motivoKey] ?? motivoKey}\n${body.dettagli ? `\nDettagli: ${body.dettagli}\n` : ''}\nSe ritieni che la decisione sia errata, puoi rivolgerti al Garante per la protezione dei dati personali (garanteprivacy.it).\n`,
      hostId: auth.user.hostId,
    })
  } catch { /* non blocca */ }

  return NextResponse.json({ ok: true, richiesta: aggiornata })
}
