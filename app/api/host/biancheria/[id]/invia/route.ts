import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { generaTestoRichiesta, type RigaBiancheria } from '@/lib/biancheria'
import { sendEmailGeneric } from '@/lib/email'

/**
 * POST /api/host/biancheria/[id]/invia
 * Invia la richiesta biancheria tramite il canale scelto.
 * Body: { canale: "EMAIL"|"WHATSAPP"|"SMS"|"CHAT", destinatario: string }
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const richiesta = await prisma.richiestaBiancheria.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const body = await req.json()
  const { canale, destinatario } = body

  if (!canale || !['EMAIL', 'WHATSAPP', 'SMS', 'CHAT'].includes(canale)) {
    return NextResponse.json({ error: 'Canale deve essere EMAIL, WHATSAPP, SMS o CHAT' }, { status: 400 })
  }
  if (!destinatario) {
    return NextResponse.json({ error: 'Destinatario obbligatorio' }, { status: 400 })
  }

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { nomeAzienda: true },
  })

  const riepilogo = {
    dataConsegna: richiesta.dataConsegna.toISOString().split('T')[0],
    righe: richiesta.righe as unknown as RigaBiancheria[],
    totaleCamere: richiesta.totaleCamere,
    totaleArticoli: richiesta.totaleArticoli,
    riepilogoArticoli: calcolaRiepilogoArticoli(richiesta.righe as unknown as RigaBiancheria[]),
  }

  const testo = generaTestoRichiesta(riepilogo, host?.nomeAzienda || 'Struttura')

  let inviatoOk = false

  switch (canale) {
    case 'EMAIL':
      try {
        await sendEmailGeneric({
          to: destinatario,
          subject: `Richiesta biancheria — ${riepilogo.dataConsegna} — ${host?.nomeAzienda}`,
          text: testo,
          hostId: auth.user.hostId,
        })
        inviatoOk = true
      } catch (err) {
        return NextResponse.json({ error: `Errore invio email: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
      }
      break

    case 'WHATSAPP':
      // Placeholder: in futuro userà lib/whatsapp.ts sendWhatsAppMessage
      return NextResponse.json({
        canale: 'WHATSAPP',
        messaggio: testo,
        destinatario,
        nota: 'Canale WhatsApp: il testo è pronto. Integrazione invio automatico disponibile con modulo AI Concierge.',
      })

    case 'SMS':
      // Placeholder: invio SMS via provider esterno
      return NextResponse.json({
        canale: 'SMS',
        messaggio: testo.slice(0, 160) + (testo.length > 160 ? '...' : ''),
        destinatario,
        nota: 'Canale SMS: richiede integrazione con provider SMS (Twilio, ecc.)',
      })

    case 'CHAT':
      // Crea una comunicazione staff interna
      await prisma.comunicazioneStaff.create({
        data: {
          hostId: auth.user.hostId,
          tipo: 'TASK',
          titolo: `Biancheria per ${riepilogo.dataConsegna}`,
          testo,
          autore: 'Sistema',
          destinatari: destinatario ? [destinatario] : [],
          fissato: true,
        },
      })
      inviatoOk = true
      break
  }

  // Aggiorna stato richiesta
  if (inviatoOk) {
    await prisma.richiestaBiancheria.update({
      where: { id },
      data: {
        stato: 'INVIATA',
        canaleInvio: canale,
        inviatoA: destinatario,
        inviatoIl: new Date(),
      },
    })
  }

  return NextResponse.json({ ok: true, canale, destinatario, stato: 'INVIATA' })
}

function calcolaRiepilogoArticoli(righe: RigaBiancheria[]) {
  const totali: Record<string, { quantita: number; categoria: string }> = {}
  for (const r of righe) {
    for (const a of r.articoli) {
      if (!totali[a.nome]) totali[a.nome] = { quantita: 0, categoria: a.categoria }
      totali[a.nome].quantita += a.quantita
    }
  }
  return Object.entries(totali).map(([nome, { quantita, categoria }]) => ({ nome, quantita, categoria }))
}
