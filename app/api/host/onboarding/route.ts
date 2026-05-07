import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const onboardingSchema = z.object({
  // Step 1 — Profilo azienda
  nomeAzienda: z.string().min(1),
  indirizzo: z.string().optional(),
  citta: z.string().optional(),
  provincia: z.string().optional(),
  cap: z.string().optional(),
  regione: z.string().optional(),
  telefono: z.string().optional(),
  partitaIva: z.string().optional(),

  // Step 2 — Prima struttura
  strutturaNome: z.string().min(1),
  strutturaTipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).default('ALLOGGIO'),
  strutturaCapacita: z.number().int().min(1).default(1),
  strutturaPrezzo: z.number().min(0).default(0),
  strutturaCitta: z.string().optional(),
  strutturaDescrizione: z.string().optional(),

  // Step 3 — Moduli
  moduliAttivi: z.record(z.boolean()).optional(),
})

export async function POST(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const d = parsed.data

  // Update host profile + create first structure + mark onboarding complete
  const [host] = await prisma.$transaction([
    prisma.host.update({
      where: { id: auth.user.hostId },
      data: {
        nomeAzienda: d.nomeAzienda,
        indirizzo: d.indirizzo || undefined,
        citta: d.citta || undefined,
        provincia: d.provincia || undefined,
        cap: d.cap || undefined,
        regione: d.regione || undefined,
        telefono: d.telefono || undefined,
        partitaIva: d.partitaIva || undefined,
        moduliAttivi: d.moduliAttivi ?? {},
        onboardingCompletato: true,
        onboardingStep: 5,
      },
    }),
    prisma.struttura.create({
      data: {
        hostId: auth.user.hostId,
        nome: d.strutturaNome,
        tipo: d.strutturaTipo,
        capacitaTotale: d.strutturaCapacita,
        prezzoBase: d.strutturaPrezzo,
        citta: d.strutturaCitta || d.citta || undefined,
        descrizione: d.strutturaDescrizione || undefined,
        attiva: true,
      },
    }),
  ])

  return NextResponse.json({ ok: true, hostId: host.id })
}

// GET — check onboarding status
export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { onboardingCompletato: true, onboardingStep: true, nomeAzienda: true },
  })

  return NextResponse.json({
    completato: host?.onboardingCompletato ?? false,
    step: host?.onboardingStep ?? 0,
    nomeAzienda: host?.nomeAzienda ?? '',
  })
}
