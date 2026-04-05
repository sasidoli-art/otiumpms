import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const categoria = sp.get('categoria')
  const sottoScorta = sp.get('sottoScorta') === 'true'

  const articoli = await prisma.articoloMagazzino.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(categoria ? { categoria } : {}),
      ...(sottoScorta ? { quantita: { lte: prisma.articoloMagazzino.fields.scorteMinime } } : {}),
    },
    include: {
      movimenti: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
  })

  // Fix: filtra sotto scorta manualmente perché Prisma non supporta campo vs campo
  const filtrati = sottoScorta
    ? articoli.filter(a => a.quantita <= a.scorteMinime)
    : articoli

  const kpi = {
    totaleArticoli: articoli.length,
    sottoScortaCount: articoli.filter(a => a.scorteMinime > 0 && a.quantita <= a.scorteMinime).length,
    valoreStimato: articoli.reduce((s, a) => s + (a.quantita * (a.costoUnitario || 0)), 0),
  }

  return NextResponse.json({ articoli: filtrati, kpi })
}

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { nome, categoria, unita, quantita, scorteMinime, scorteOttimali, costoUnitario, fornitore, codiceArticolo, ubicazione, note } = body

  if (!nome) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

  const articolo = await prisma.articoloMagazzino.create({
    data: {
      hostId: auth.user.hostId,
      nome,
      categoria: categoria || 'ALTRO',
      unita: unita || 'pz',
      quantita: quantita ?? 0,
      scorteMinime: scorteMinime ?? 0,
      scorteOttimali: scorteOttimali ?? null,
      costoUnitario: costoUnitario ?? null,
      fornitore: fornitore || null,
      codiceArticolo: codiceArticolo || null,
      ubicazione: ubicazione || null,
      note: note || null,
    },
  })

  // Se ha quantità iniziale, crea movimento di carico
  if (quantita && quantita > 0) {
    await prisma.movimentoMagazzino.create({
      data: {
        articoloId: articolo.id,
        tipo: 'CARICO',
        quantita,
        motivo: 'Giacenza iniziale',
        operatore: auth.user.name || auth.user.email,
      },
    })
  }

  return NextResponse.json(articolo, { status: 201 })
}
