import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import bcrypt from 'bcryptjs'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * POST /api/superadmin/host
 * White-glove onboarding completo: crea User + Host + (opzionale) prima
 * Struttura con unità + attiva moduli + system prompt concierge, tutto in
 * un'unica transazione.
 */

const bodySchema = z.object({
  // Account
  email: z.string().email().max(254),
  password: z.string().min(6).max(128),
  nome: z.string().min(1).max(100),
  cognome: z.string().min(1).max(100),

  // Azienda
  nomeAzienda: z.string().min(1).max(255),
  partitaIva: z.string().max(20).optional().nullable(),
  codiceFiscale: z.string().max(20).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  sitoWeb: z.string().max(255).optional().nullable(),
  indirizzo: z.string().max(255).optional().nullable(),
  citta: z.string().max(100).optional().nullable(),
  provincia: z.string().max(10).optional().nullable(),
  cap: z.string().max(10).optional().nullable(),
  regione: z.string().max(100).optional().nullable(),

  // Fatturazione
  fattPec: z.string().email().max(254).optional().nullable().or(z.literal('')),
  fattCodiceSDI: z.string().max(20).optional().nullable(),
  regimeFiscale: z.string().max(20).optional().nullable(),

  // Piano + moduli
  piano: z.enum(['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM']).default('LIGHT'),
  moduliAttivi: z.record(z.string(), z.boolean()).optional(),

  // Prima struttura (opzionale)
  strutturaNome: z.string().max(255).optional().nullable(),
  strutturaTipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).optional(),
  strutturaCitta: z.string().max(100).optional().nullable(),
  strutturaPrezzoBase: z.coerce.number().min(0).optional(),
  numeroUnita: z.coerce.number().int().min(0).max(200).optional(),
  prefissoUnita: z.string().max(50).optional().nullable(),

  // Concierge
  conciergeAttivo: z.boolean().optional(),
  conciergeSystemPrompt: z.string().max(4096).optional().nullable(),
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

  const hashedPassword = await bcrypt.hash(d.password, 12)

  // Transazione: User + Host + (opzionale) Struttura + Unità
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
        partitaIva: d.partitaIva?.trim() || null,
        codiceFiscale: d.codiceFiscale?.trim() || null,
        telefono: d.telefono?.trim() || null,
        sitoWeb: d.sitoWeb?.trim() || null,
        indirizzo: d.indirizzo?.trim() || null,
        citta: d.citta?.trim() || null,
        provincia: d.provincia?.trim() || null,
        cap: d.cap?.trim() || null,
        regione: d.regione?.trim() || null,
        fattPec: d.fattPec?.trim() || null,
        fattCodiceSDI: d.fattCodiceSDI?.trim() || null,
        regimeFiscale: d.regimeFiscale?.trim() || null,
        piano: d.piano,
        statoAbbonamento: 'ATTIVO',
        dataFineAbb: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        moduliAttivi: d.moduliAttivi ?? {},
        conciergeAttivo: d.conciergeAttivo ?? false,
        conciergeSystemPrompt: d.conciergeSystemPrompt?.trim() || null,
        // White-glove: setup completato dal SuperAdmin, skip wizard
        onboardingCompletato: true,
      },
    })

    let strutturaId: string | null = null
    let unitaCreate = 0

    if (d.strutturaNome) {
      const struttura = await tx.struttura.create({
        data: {
          hostId: host.id,
          nome: d.strutturaNome.trim(),
          tipo: d.strutturaTipo ?? 'ALLOGGIO',
          citta: d.strutturaCitta?.trim() || d.citta?.trim() || null,
          regione: d.regione?.trim() || null,
          prezzoBase: d.strutturaPrezzoBase ?? 0,
          attiva: true,
        },
      })
      strutturaId = struttura.id

      if (d.numeroUnita && d.numeroUnita > 0) {
        const prefisso = d.prefissoUnita?.trim() || 'Camera'
        const unitaData = Array.from({ length: d.numeroUnita }, (_, i) => ({
          strutturaId: struttura.id,
          nome: `${prefisso} ${i + 1}`,
          prezzoBase: d.strutturaPrezzoBase ?? 0,
          attiva: true,
        }))
        await tx.unitaPrenotabile.createMany({ data: unitaData })
        unitaCreate = d.numeroUnita
      }
    }

    return { user, host, strutturaId, unitaCreate }
  })

  await audit({
    hostId: result.host.id,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.host.creato',
    entita: 'Host',
    entitaId: result.host.id,
    dettagli: `White-glove: host "${d.nomeAzienda}" (${d.email}), piano ${d.piano}, struttura=${result.strutturaId ? 'SI' : 'NO'}, unità=${result.unitaCreate}`,
  })

  return NextResponse.json({
    id: result.host.id,
    nomeAzienda: result.host.nomeAzienda,
    email: result.user.email,
    strutturaCreata: !!result.strutturaId,
    unitaCreate: result.unitaCreate,
  })
}
