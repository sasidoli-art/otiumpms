import { getServerSession } from 'next-auth'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// PATCH /api/host/manutenzione/[id]
export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const seg = await prisma.segnalazioneManutenzione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!seg) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const body = await req.json()

  const data: Record<string, unknown> = {}
  const fields = ['titolo', 'descrizione', 'categoria', 'stato', 'priorita', 'assegnatoA', 'costoStimato', 'costoReale', 'note', 'immagineUrl']
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]
  }
  if (body.dataScadenza !== undefined) data.dataScadenza = body.dataScadenza ? new Date(body.dataScadenza) : null
  if (body.stato === 'RISOLTA' && seg.stato !== 'RISOLTA') data.dataRisoluzione = new Date()
  if (body.stato && body.stato !== 'RISOLTA' && seg.stato === 'RISOLTA') data.dataRisoluzione = null

  const aggiornata = await prisma.segnalazioneManutenzione.update({
    where: { id: params.id },
    data,
    include: {
      struttura: { select: { id: true, nome: true } },
      unita: { select: { id: true, nome: true } },
    },
  })

  // Notifica in-app su cambio stato rilevante
  if (body.stato && body.stato !== seg.stato) {
    const label: Record<string, string> = {
      RISOLTA: 'risolta',
      IN_LAVORAZIONE: 'presa in carico',
      IN_ATTESA_PARTI: 'in attesa parti',
      ANNULLATA: 'annullata',
    }
    if (label[body.stato]) {
      await prisma.notifica.create({
        data: {
          hostId: auth.user.hostId,
          tipo: 'manutenzione',
          titolo: `Segnalazione ${label[body.stato]}`,
          messaggio: `"${seg.titolo}" ${aggiornata.struttura ? `(${aggiornata.struttura.nome})` : ''} — ${label[body.stato]}`,
          linkUrl: '/host/manutenzione',
        },
      })
    }
  }

  return NextResponse.json(aggiornata)
}

// DELETE /api/host/manutenzione/[id]
export async function DELETE(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const session = auth
  const params = await paramsPromise

  const seg = await prisma.segnalazioneManutenzione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!seg) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  await prisma.segnalazioneManutenzione.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
