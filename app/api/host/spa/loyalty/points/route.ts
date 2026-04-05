import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'



const addPointsSchema = z.object({
  membroId: z.string().min(1, 'ID membro obbligatorio'),
  tipo: z.enum(['ACCUMULO', 'UTILIZZO', 'BONUS', 'SCADENZA']),
  punti: z.coerce.number().int().min(1, 'Punti devono essere > 0'),
  descrizione: z.string().min(1).max(500).trim(),
})

// ─── POST: aggiungi/deduci punti manualmente ────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = parseBody(addPointsSchema, await req.json())
  if (parsed.error) return parsed.error

  const { membroId, tipo, punti, descrizione } = parsed.data

  // Verifica ownership
  const membro = await prisma.membroFedelta.findFirst({
    where: {
      id: membroId,
      programma: { hostId: auth.user.hostId },
    },
  })
  if (!membro) {
    return NextResponse.json({ error: 'Membro non trovato' }, { status: 404 })
  }

  // Calcola delta punti (negativo per UTILIZZO e SCADENZA)
  const isDeduction = tipo === 'UTILIZZO' || tipo === 'SCADENZA'
  const delta = isDeduction ? -Math.abs(punti) : Math.abs(punti)

  // Per deduzioni, verifica saldo sufficiente
  const saldoAttuale = membro.puntiAccumulati - membro.puntiUtilizzati
  if (isDeduction && saldoAttuale < Math.abs(punti)) {
    return NextResponse.json({ error: `Saldo insufficiente: ${saldoAttuale} punti disponibili` }, { status: 400 })
  }

  // Aggiorna membro e crea movimento in transazione
  const newAccumulati = isDeduction ? membro.puntiAccumulati : membro.puntiAccumulati + Math.abs(punti)
  const newUtilizzati = isDeduction ? membro.puntiUtilizzati + Math.abs(punti) : membro.puntiUtilizzati
  const saldoDopo = newAccumulati - newUtilizzati

  const [updatedMembro, movimento] = await prisma.$transaction([
    prisma.membroFedelta.update({
      where: { id: membroId },
      data: {
        puntiAccumulati: newAccumulati,
        puntiUtilizzati: newUtilizzati,
        ultimaAttivita: new Date(),
      },
    }),
    prisma.movimentoPunti.create({
      data: {
        membroId,
        tipo,
        punti: delta,
        saldoDopo,
        descrizione,
      },
    }),
  ])

  return NextResponse.json({ membro: updatedMembro, movimento })
}
