import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const categoria = sp.get('categoria')
  const strutturaId = sp.get('strutturaId')

  const servizi = await prisma.servizioStruttura.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(categoria ? { categoria } : {}),
      ...(strutturaId ? { OR: [{ strutturaId }, { strutturaId: null }] } : {}),
    },
    include: { struttura: { select: { nome: true } } },
    orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
  })

  return NextResponse.json(servizi)
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, descrizione, categoria, sottocategoria, prezzo, aliquotaIva, unitaMisura, strutturaId, attivo, prenotabileOnline, ricorrente, orarioInizio, orarioFine, luogo } = body

  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const servizio = await prisma.servizioStruttura.create({
    data: {
      hostId: auth.user.hostId,
      strutturaId: strutturaId || null,
      nome,
      descrizione: descrizione || null,
      categoria: categoria || 'ALTRO',
      sottocategoria: sottocategoria || null,
      prezzo: prezzo ?? 0,
      aliquotaIva: aliquotaIva ?? 22,
      unitaMisura: unitaMisura || 'a persona',
      attivo: attivo ?? true,
      prenotabileOnline: prenotabileOnline ?? false,
      ricorrente: ricorrente ?? false,
      orarioInizio: orarioInizio || null,
      orarioFine: orarioFine || null,
      luogo: luogo || null,
    },
  })

  return NextResponse.json(servizio, { status: 201 })
}
