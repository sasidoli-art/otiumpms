import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const pacchetti = await prisma.pacchettoServizio.findMany({
    where: { hostId: auth.user.hostId },
    include: {
      struttura: { select: { nome: true } },
      voci: { include: { servizio: { select: { nome: true, prezzo: true, aliquotaIva: true, categoria: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(pacchetti)
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, descrizione, prezzo, prezzoOriginale, strutturaId, attivo, prenotabileOnline, dataInizio, dataFine, voci } = body

  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const pacchetto = await prisma.pacchettoServizio.create({
    data: {
      hostId: auth.user.hostId,
      strutturaId: strutturaId || null,
      nome,
      descrizione: descrizione || null,
      prezzo: prezzo ?? 0,
      prezzoOriginale: prezzoOriginale ?? null,
      attivo: attivo ?? true,
      prenotabileOnline: prenotabileOnline ?? false,
      dataInizio: dataInizio ? new Date(dataInizio) : null,
      dataFine: dataFine ? new Date(dataFine) : null,
      voci: voci?.length > 0 ? {
        create: voci.map((v: { servizioId: string; quantita?: number; incluso?: boolean }) => ({
          servizioId: v.servizioId,
          quantita: v.quantita ?? 1,
          incluso: v.incluso ?? true,
        })),
      } : undefined,
    },
    include: { voci: { include: { servizio: { select: { nome: true, prezzo: true } } } } },
  })

  return NextResponse.json(pacchetto, { status: 201 })
}
