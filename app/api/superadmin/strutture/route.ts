import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { z } from 'zod'

/**
 * POST /api/superadmin/strutture
 * Crea una struttura su un host selezionato (white-glove onboarding).
 *
 * Body:
 *   hostId         string  obbligatorio
 *   nome           string  obbligatorio
 *   tipo           enum    default EVENTO
 *   descrizione    string?
 *   indirizzo      string?
 *   citta          string?
 *   regione        string?
 *   capacitaTotale int?    default 1
 *   prezzoBase     number? default 0
 *   numeroUnita    int?    se >0, crea automaticamente N unita' con nome "Camera 1", ...
 */
const bodySchema = z.object({
  hostId: z.string().min(1),
  nome: z.string().min(1).max(255),
  tipo: z.enum(['EVENTO', 'VENUE', 'ESPERIENZA', 'ALLOGGIO', 'SERVIZIO']).default('ALLOGGIO'),
  descrizione: z.string().max(4096).optional().nullable(),
  indirizzo: z.string().max(255).optional().nullable(),
  citta: z.string().max(100).optional().nullable(),
  regione: z.string().max(100).optional().nullable(),
  capacitaTotale: z.coerce.number().int().min(1).max(10000).optional(),
  prezzoBase: z.coerce.number().min(0).optional(),
  numeroUnita: z.coerce.number().int().min(0).max(200).optional(),
  prefissoUnita: z.string().max(50).optional().nullable(),
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

  // Verifica host esista
  const host = await prisma.host.findUnique({
    where: { id: d.hostId },
    select: { id: true, nomeAzienda: true },
  })
  if (!host) {
    return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })
  }

  // Crea struttura + eventuali unità in transazione
  const result = await prisma.$transaction(async (tx) => {
    const struttura = await tx.struttura.create({
      data: {
        hostId: d.hostId,
        nome: d.nome,
        tipo: d.tipo,
        descrizione: d.descrizione ?? null,
        indirizzo: d.indirizzo ?? null,
        citta: d.citta ?? null,
        regione: d.regione ?? null,
        capacitaTotale: d.capacitaTotale ?? 1,
        prezzoBase: d.prezzoBase ?? 0,
      },
    })

    let unitaCreate = 0
    if (d.numeroUnita && d.numeroUnita > 0) {
      const prefisso = d.prefissoUnita?.trim() || 'Camera'
      const unitaData = Array.from({ length: d.numeroUnita }, (_, i) => ({
        strutturaId: struttura.id,
        nome: `${prefisso} ${i + 1}`,
        prezzoBase: d.prezzoBase ?? 0,
        attiva: true,
      }))
      await tx.unitaPrenotabile.createMany({ data: unitaData })
      unitaCreate = d.numeroUnita
    }

    return { struttura, unitaCreate }
  })

  await audit({
    hostId: host.id,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'superadmin.struttura.creata',
    entita: 'Struttura',
    entitaId: result.struttura.id,
    dettagli: `SuperAdmin ha creato struttura "${d.nome}" per host "${host.nomeAzienda}" (${result.unitaCreate} unità)`,
  })

  return NextResponse.json({
    id: result.struttura.id,
    nome: result.struttura.nome,
    tipo: result.struttura.tipo,
    unitaCreate: result.unitaCreate,
  }, { status: 201 })
}
