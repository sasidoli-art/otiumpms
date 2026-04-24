import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// Font whitelist — allinearsi a quanto offerto nella UI + alle Google Fonts
// caricabili nel layout booking (se in futuro si vuole embeddare @font-face).
const FONT_WHITELIST = [
  'Inter, system-ui, sans-serif',
  'Montserrat, system-ui, sans-serif',
  '"Playfair Display", Georgia, serif',
  'system-ui, sans-serif',
] as const

const RADIUS_WHITELIST = ['4px', '8px', '16px'] as const

const brandingSchema = z.object({
  strutturaId: z.string().cuid(),
  colorePrimario: z.string().regex(HEX_REGEX).optional().nullable(),
  coloreSecondario: z.string().regex(HEX_REGEX).optional().nullable(),
  coloreSfondo: z.string().regex(HEX_REGEX).optional().nullable(),
  coloreTesto: z.string().regex(HEX_REGEX).optional().nullable(),
  fontFamily: z.enum(FONT_WHITELIST).optional().nullable(),
  borderRadius: z.enum(RADIUS_WHITELIST).optional().nullable(),
  // URL immagini: accettiamo http(s) URL oppure data URL (upload base64)
  logo: z.string().url().or(z.string().startsWith('data:image/')).nullable().optional(),
  fotoHero: z.string().url().or(z.string().startsWith('data:image/')).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { hostId } = auth.user

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(brandingSchema, raw)
  if (parsed.error) return parsed.error
  const { strutturaId, ...updates } = parsed.data

  // Multi-tenant: verifica che la struttura appartenga all'host
  const existing = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  // Costruisci patch: solo i campi realmente presenti nel body (undefined = non toccare)
  const data: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) data[k] = v
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 422 })
  }

  const updated = await prisma.struttura.update({
    where: { id: strutturaId },
    data,
    select: {
      id: true, nome: true,
      colorePrimario: true, coloreSecondario: true, coloreSfondo: true, coloreTesto: true,
      fontFamily: true, borderRadius: true, logo: true, fotoHero: true,
    },
  })

  await audit({
    hostId,
    azione: 'booking_engine.branding_aggiornato',
    entita: 'struttura',
    entitaId: strutturaId,
    dettagli: `Aggiornati: ${Object.keys(data).join(', ')}`,
  }).catch(() => { /* non blocca */ })

  return NextResponse.json({ struttura: updated })
}
