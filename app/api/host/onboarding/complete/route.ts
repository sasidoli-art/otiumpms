import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * POST /api/host/onboarding/complete
 *
 * Finalizes onboarding: creates Struttura + UnitaPrenotabile + updates Host.
 * All in a single Prisma $transaction.
 */

const unitaSchema = z.object({
  nome: z.string().min(1),
  capacita: z.number().int().min(1).default(2),
  prezzo: z.number().min(0).default(0),
})

const schema = z.object({
  // Step 1 — Struttura
  strutturaNome: z.string().min(1),
  strutturaTipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).default('ALLOGGIO'),
  strutturaIndirizzo: z.string().optional(),
  strutturaCitta: z.string().optional(),
  strutturaRegione: z.string().optional(),

  // Step 2 — Unità
  unita: z.array(unitaSchema).min(1),

  // Step 3 — Dati host
  nomeAzienda: z.string().min(1),
  partitaIva: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  // Fatturazione
  fattDiversa: z.boolean().optional(),
  fattNomeAzienda: z.string().optional(),
  fattPartitaIva: z.string().optional(),
  fattIndirizzo: z.string().optional(),
  fattCitta: z.string().optional(),
  fattCap: z.string().optional(),
  fattProvincia: z.string().optional(),

  // Moduli
  moduliAttivi: z.record(z.boolean()).optional(),
})

export async function POST(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const d = parsed.data
  const hostId = auth.user.hostId

  // $transaction: Host update + Struttura create + UnitaPrenotabile creates + Notifica
  const [host, struttura] = await prisma.$transaction(async (tx) => {
    // 1. Update Host
    const updatedHost = await tx.host.update({
      where: { id: hostId },
      data: {
        nomeAzienda: d.nomeAzienda,
        partitaIva: d.partitaIva || undefined,
        telefono: d.telefono || undefined,
        moduliAttivi: d.moduliAttivi ?? {},
        onboardingCompletato: true,
        onboardingStep: 5,
        onboardingData: {},
        // Billing fields (only if fattDiversa)
        ...(d.fattDiversa && {
          fattNomeAzienda: d.fattNomeAzienda || undefined,
          fattPartitaIva: d.fattPartitaIva || undefined,
          fattIndirizzo: d.fattIndirizzo || undefined,
          fattCitta: d.fattCitta || undefined,
          fattCap: d.fattCap || undefined,
          fattProvincia: d.fattProvincia || undefined,
        }),
      },
    })

    // 2. Create Struttura
    const newStruttura = await tx.struttura.create({
      data: {
        hostId,
        nome: d.strutturaNome,
        tipo: d.strutturaTipo,
        capacitaTotale: d.unita.reduce((sum, u) => sum + u.capacita, 0),
        prezzoBase: d.unita[0]?.prezzo ?? 0,
        citta: d.strutturaCitta || undefined,
        indirizzo: d.strutturaIndirizzo || undefined,
        regione: d.strutturaRegione || undefined,
        attiva: true,
      },
    })

    // 3. Create UnitaPrenotabile (bulk)
    if (d.unita.length > 0) {
      await tx.unitaPrenotabile.createMany({
        data: d.unita.map(u => ({
          strutturaId: newStruttura.id,
          nome: u.nome,
          capacita: u.capacita,
          prezzoBase: u.prezzo,
          attiva: true,
        })),
      })
    }

    // 4. Create welcome notification
    await tx.notifica.create({
      data: {
        hostId,
        tipo: 'sistema',
        titolo: 'Benvenuto su Otium!',
        messaggio: `La tua struttura "${d.strutturaNome}" è pronta. Esplora la dashboard per iniziare.`,
        linkUrl: '/host/dashboard',
      },
    })

    return [updatedHost, newStruttura]
  })

  return NextResponse.json({
    ok: true,
    hostId: host.id,
    strutturaId: struttura.id,
    redirect: '/host/dashboard',
  })
}
