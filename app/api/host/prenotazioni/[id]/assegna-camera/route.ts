import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { trovaCamereDisponibili, assegnaAutomaticamente, assegnaCamera } from '@/lib/assegnazione-camera'

const assegnaCameraSchema = z.object({
  unitaId: z.string().min(1).optional(),
  modalita: z.enum(['MANUALE', 'AUTOMATICA', 'AI']).default('MANUALE'),
})

/**
 * GET /api/host/prenotazioni/[id]/assegna-camera
 * Restituisce le camere disponibili per questa prenotazione, ordinate per idoneità.
 * Usato sia dall'operatore (scelta manuale) che dall'AI.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: {
      id: true, strutturaId: true, unitaId: true, dataArrivo: true,
      dataPartenza: true, numOspiti: true, guestNome: true, guestCognome: true,
      struttura: { select: { modalitaAssegnazione: true } },
    },
  })
  if (!pren || !pren.strutturaId) {
    return NextResponse.json({ error: 'Prenotazione non trovata o senza struttura' }, { status: 404 })
  }

  const camere = await trovaCamereDisponibili({
    strutturaId: pren.strutturaId,
    dataArrivo: pren.dataArrivo,
    dataPartenza: pren.dataPartenza,
    numOspiti: pren.numOspiti,
    unitaEscluse: [], // non escludiamo la camera attuale
  })

  return NextResponse.json({
    prenotazione: {
      id: pren.id,
      ospite: `${pren.guestNome} ${pren.guestCognome}`,
      cameraAttuale: pren.unitaId,
      numOspiti: pren.numOspiti,
      dataArrivo: pren.dataArrivo,
      dataPartenza: pren.dataPartenza,
    },
    modalitaStruttura: pren.struttura?.modalitaAssegnazione || 'MANUALE',
    camereDisponibili: camere,
    consigliata: camere.length > 0 ? camere[0] : null,
  })
}

/**
 * POST /api/host/prenotazioni/[id]/assegna-camera
 * Assegna una camera alla prenotazione.
 * Body: { unitaId?: string, modalita: "MANUALE" | "AUTOMATICA" | "AI" }
 * Se modalita=AUTOMATICA e unitaId non fornito, sceglie la migliore automaticamente.
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    select: { id: true, strutturaId: true, dataArrivo: true, dataPartenza: true, numOspiti: true, hostId: true },
  })
  if (!pren || !pren.strutturaId) {
    return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  }

  const raw = await req.json()
  const parsed = assegnaCameraSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const { unitaId, modalita } = parsed.data

  let cameraScelta: string | null = unitaId || null

  if (!cameraScelta && (modalita === 'AUTOMATICA' || modalita === 'AI')) {
    const migliore = await assegnaAutomaticamente({
      strutturaId: pren.strutturaId,
      dataArrivo: pren.dataArrivo,
      dataPartenza: pren.dataPartenza,
      numOspiti: pren.numOspiti,
    })

    if (!migliore) {
      return NextResponse.json({ error: 'Nessuna camera disponibile per questo periodo' }, { status: 409 })
    }
    cameraScelta = migliore.id
  }

  if (!cameraScelta) {
    return NextResponse.json({ error: 'unitaId obbligatorio per assegnazione manuale' }, { status: 400 })
  }

  const assegnatoDa = modalita === 'AI' ? 'AI Concierge' : modalita === 'AUTOMATICA' ? 'Sistema automatico' : (auth.user.name || auth.user.email)
  await assegnaCamera(pren.id, cameraScelta, assegnatoDa)

  // Crea notifica
  await prisma.notifica.create({
    data: {
      hostId: pren.hostId,
      tipo: 'prenotazione',
      titolo: `Camera assegnata (${modalita.toLowerCase()})`,
      messaggio: `Prenotazione ${id.slice(0, 8)} → camera assegnata da ${assegnatoDa}`,
      linkUrl: `/host/prenotazioni/${id}`,
    },
  })

  const camera = await prisma.unitaPrenotabile.findUnique({
    where: { id: cameraScelta },
    select: { nome: true, statoHK: true },
  })

  return NextResponse.json({
    ok: true,
    modalita,
    cameraAssegnata: { id: cameraScelta, nome: camera?.nome, statoHK: camera?.statoHK },
    assegnatoDa,
  })
}
