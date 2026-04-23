import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import {
  generaSuggerimentiUpselling, registraConversione, registraVisualizzazione,
  type UpsellingTouchpoint,
} from '@/lib/upselling'
import { verifyResourceToken } from '@/lib/signed-token'

/**
 * Public API (ospite) — richiede token HMAC firmato sulla prenotazioneId
 * (stesso pattern dei feed iCal). Token generabile con
 * `signResourceToken('upselling', prenotazioneId)` lato server al momento
 * di servire la pagina/email.
 *
 *   GET  /api/upselling/[prenotazioneId]?token=...&touchpoint=POST_PRENOTAZIONE
 *   POST /api/upselling/[prenotazioneId]?token=...&touchpoint=...
 *     body: { suggerimentoId: string, importo: number }
 *       → registra conversione + applica side-effect
 *
 *   PATCH /api/upselling/[prenotazioneId]?token=...&touchpoint=...
 *     body: { suggerimentoId: string }
 *       → registra solo la visualizzazione (skip ulteriori click)
 */

const VALID_TOUCHPOINTS: UpsellingTouchpoint[] = [
  'POST_PRENOTAZIONE', 'EMAIL_PRE_ARRIVO', 'CHECKIN_ONLINE',
  'BENVENUTO_WHATSAPP', 'IN_HOUSE',
]

async function requireValidToken(
  req: NextRequest,
  prenotazioneId: string,
): Promise<{ hostId: string } | NextResponse> {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (!verifyResourceToken(token, 'upselling', prenotazioneId)) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }
  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, deletedAt: null },
    select: { hostId: true },
  })
  if (!pren) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
  return { hostId: pren.hostId }
}

function readTouchpoint(req: NextRequest): UpsellingTouchpoint | NextResponse {
  const tp = req.nextUrl.searchParams.get('touchpoint') ?? ''
  if (!(VALID_TOUCHPOINTS as readonly string[]).includes(tp)) {
    return NextResponse.json({ error: 'Touchpoint non valido' }, { status: 400 })
  }
  return tp as UpsellingTouchpoint
}

/** GET — lista offerte targettate per il touchpoint */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ prenotazioneId: string }> },
) {
  const { prenotazioneId } = await params
  const auth = await requireValidToken(req, prenotazioneId)
  if (auth instanceof NextResponse) return auth
  const touchpoint = readTouchpoint(req)
  if (touchpoint instanceof NextResponse) return touchpoint

  const offerte = await generaSuggerimentiUpselling({
    hostId: auth.hostId,
    prenotazioneId,
    touchpoint,
    registraViews: true, // traccia impressions
  })

  return NextResponse.json({ offerte })
}

/** POST — ospite accetta un suggerimento */
const acceptSchema = z.object({
  suggerimentoId: z.string().min(1),
  importo: z.number().nonnegative(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ prenotazioneId: string }> },
) {
  const { prenotazioneId } = await params
  const auth = await requireValidToken(req, prenotazioneId)
  if (auth instanceof NextResponse) return auth
  const touchpoint = readTouchpoint(req)
  if (touchpoint instanceof NextResponse) return touchpoint

  const parsed = acceptSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }

  try {
    const res = await registraConversione({
      suggerimentoId: parsed.data.suggerimentoId,
      prenotazioneId,
      touchpoint,
      importo: parsed.data.importo,
    })
    return NextResponse.json(res)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errMsg }, { status: 400 })
  }
}

/** PATCH — tracking "visto ma non cliccato" (es. analytics scroll) */
const viewSchema = z.object({ suggerimentoId: z.string().min(1) })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ prenotazioneId: string }> },
) {
  const { prenotazioneId } = await params
  const auth = await requireValidToken(req, prenotazioneId)
  if (auth instanceof NextResponse) return auth
  const touchpoint = readTouchpoint(req)
  if (touchpoint instanceof NextResponse) return touchpoint

  const parsed = viewSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })

  await registraVisualizzazione({
    suggerimentoId: parsed.data.suggerimentoId,
    prenotazioneId,
    touchpoint,
  })
  return NextResponse.json({ ok: true })
}
