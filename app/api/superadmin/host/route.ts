import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import bcrypt from 'bcryptjs'
import { audit } from '@/lib/audit'
import { validatePassword, isPasswordPwned } from '@/lib/password-policy'
import { z } from 'zod'

/**
 * POST /api/superadmin/host
 * White-glove onboarding completo: crea User + Host + (opzionale) prima
 * Struttura con unità + attiva moduli + system prompt concierge, tutto in
 * un'unica transazione.
 */

const strutturaSchema = z.object({
  nome: z.string().min(1).max(255),
  tipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).default('ALLOGGIO'),
  citta: z.string().max(100).optional().nullable(),
  numeroUnita: z.coerce.number().int().min(0).max(200).optional(),
  prefissoUnita: z.string().max(50).optional().nullable(),
})

const bodySchema = z.object({
  // Account
  email: z.string().email().max(254),
  password: z.string().min(6).max(128),
  nome: z.string().min(1).max(100),
  cognome: z.string().min(1).max(100),

  // Azienda (minimal)
  nomeAzienda: z.string().min(1).max(255),
  citta: z.string().max(100).optional().nullable(),

  // Piano
  piano: z.enum(['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']).default('VISIBILITA_MENSILE'),

  // Strutture (array)
  strutture: z.array(strutturaSchema).optional().default([]),

  // Concierge
  conciergeAttivo: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => null)
  if (!raw) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dati non validi', details: parsed.error.flatten() },
      { status: 422 }
    )
  }
  const d = parsed.data

  // Check email duplicata
  const existing = await prisma.user.findUnique({
    where: { email: d.email.toLowerCase().trim() },
  })
  if (existing) {
    return NextResponse.json({ error: 'Email già registrata' }, { status: 409 })
  }

  const policy = validatePassword(d.password)
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 })
  }
  if (await isPasswordPwned(d.password)) {
    return NextResponse.json(
      { error: 'Questa password è apparsa in un data breach noto. Scegline una diversa.' },
      { status: 400 },
    )
  }

  const hashedPassword = await bcrypt.hash(d.password, 12)

  // Transazione: User + Host + array Strutture + array Unità
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: d.email.toLowerCase().trim(),
        password: hashedPassword,
        nome: d.nome.trim(),
        cognome: d.cognome.trim(),
        role: 'HOST',
        attivo: true,
      },
    })

    const host = await tx.host.create({
      data: {
        userId: user.id,
        nomeAzienda: d.nomeAzienda.trim(),
        citta: d.citta?.trim() || null,
        piano: d.piano,
        statoAbbonamento: 'ATTIVO',
        dataFineAbb: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        // moduliAttivi intenzionalmente vuoto: il SuperAdmin attiva i singoli
        // moduli per host da /superadmin/moduli dopo la creazione (eccetto i
        // moduli base forniti dal piano).
        moduliAttivi: {},
        conciergeAttivo: d.conciergeAttivo,
        onboardingCompletato: true,
        onboardingStep: 5,
      },
    })

    // Crea tutte le strutture + relative unità
    const struttureCreate: string[] = []
    let unitaTotali = 0

    for (const s of d.strutture) {
      const struttura = await tx.struttura.create({
        data: {
          hostId: host.id,
          nome: s.nome.trim(),
          tipo: s.tipo,
          citta: s.citta?.trim() || d.citta?.trim() || null,
          attiva: true,
        },
      })
      struttureCreate.push(struttura.id)

      if (s.numeroUnita && s.numeroUnita > 0) {
        const prefisso = s.prefissoUnita?.trim() || 'Camera'
        const unitaData = Array.from({ length: s.numeroUnita }, (_, i) => ({
          strutturaId: struttura.id,
          nome: `${prefisso} ${i + 1}`,
          prezzoBase: 0,
          attiva: true,
        }))
        await tx.unitaPrenotabile.createMany({ data: unitaData })
        unitaTotali += s.numeroUnita
      }
    }

    return { user, host, struttureCreate, unitaTotali }
  })

  await audit({
    hostId: result.host.id,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.host.creato',
    entita: 'Host',
    entitaId: result.host.id,
    dettagli: `White-glove: host "${d.nomeAzienda}" (${d.email}), piano ${d.piano}, ${result.struttureCreate.length} strutture, ${result.unitaTotali} unità totali`,
  })

  return NextResponse.json({
    id: result.host.id,
    nomeAzienda: result.host.nomeAzienda,
    email: result.user.email,
    struttureCreate: result.struttureCreate.length,
    unitaTotali: result.unitaTotali,
  })
}
