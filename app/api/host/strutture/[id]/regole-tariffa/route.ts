import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/host/strutture/[id]/regole-tariffa
export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const regole = await prisma.regolaTariffa.findMany({
    where: { strutturaId: params.id },
    include: { unita: { select: { nome: true } } },
    orderBy: [{ priorita: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(regole)
}

// POST /api/host/strutture/[id]/regole-tariffa
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const { unitaId, nome, tipo, modificatore, valore, meseInizio, giornoInizio, meseFine, giornoFine, giorniSettimana, priorita } = body

  if (!nome || !tipo || !modificatore || valore == null) {
    return NextResponse.json({ error: 'Campi obbligatori: nome, tipo, modificatore, valore' }, { status: 400 })
  }

  if (!['WEEKEND', 'STAGIONE', 'FESTIVO'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
  }
  if (!['PERCENTUALE', 'FISSO'].includes(modificatore)) {
    return NextResponse.json({ error: 'Modificatore non valido' }, { status: 400 })
  }

  if (unitaId) {
    const unita = await prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id } })
    if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })
  }

  if (tipo === 'WEEKEND' && (!Array.isArray(giorniSettimana) || giorniSettimana.length === 0)) {
    return NextResponse.json({ error: 'Seleziona almeno un giorno della settimana' }, { status: 400 })
  }

  if (tipo === 'STAGIONE' && (meseInizio == null || meseFine == null)) {
    return NextResponse.json({ error: 'Mese inizio e fine sono obbligatori per tipo STAGIONE' }, { status: 400 })
  }

  const regola = await prisma.regolaTariffa.create({
    data: {
      strutturaId: params.id,
      unitaId: unitaId || null,
      nome,
      tipo,
      modificatore,
      valore: Number(valore),
      meseInizio: meseInizio != null ? Number(meseInizio) : null,
      giornoInizio: giornoInizio != null ? Number(giornoInizio) : null,
      meseFine: meseFine != null ? Number(meseFine) : null,
      giornoFine: giornoFine != null ? Number(giornoFine) : null,
      giorniSettimana: giorniSettimana ?? [],
      priorita: priorita != null ? Number(priorita) : 0,
    },
    include: { unita: { select: { nome: true } } },
  })

  return NextResponse.json(regola, { status: 201 })
}

// PUT /api/host/strutture/[id]/regole-tariffa?regolaId=xxx
export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const regolaId = searchParams.get('regolaId')
  if (!regolaId) return NextResponse.json({ error: 'regolaId mancante' }, { status: 400 })

  const existing = await prisma.regolaTariffa.findFirst({ where: { id: regolaId, strutturaId: params.id } })
  if (!existing) return NextResponse.json({ error: 'Regola non trovata' }, { status: 404 })

  const body = await req.json()
  const { unitaId, nome, tipo, modificatore, valore, meseInizio, giornoInizio, meseFine, giornoFine, giorniSettimana, priorita, attiva } = body

  if (unitaId) {
    const unita = await prisma.unitaPrenotabile.findFirst({ where: { id: unitaId, strutturaId: params.id } })
    if (!unita) return NextResponse.json({ error: 'Unità non trovata' }, { status: 404 })
  }

  const aggiornata = await prisma.regolaTariffa.update({
    where: { id: regolaId },
    data: {
      ...(unitaId !== undefined ? { unitaId: unitaId || null } : {}),
      ...(nome ? { nome } : {}),
      ...(tipo ? { tipo } : {}),
      ...(modificatore ? { modificatore } : {}),
      ...(valore != null ? { valore: Number(valore) } : {}),
      ...(meseInizio !== undefined ? { meseInizio: meseInizio != null ? Number(meseInizio) : null } : {}),
      ...(giornoInizio !== undefined ? { giornoInizio: giornoInizio != null ? Number(giornoInizio) : null } : {}),
      ...(meseFine !== undefined ? { meseFine: meseFine != null ? Number(meseFine) : null } : {}),
      ...(giornoFine !== undefined ? { giornoFine: giornoFine != null ? Number(giornoFine) : null } : {}),
      ...(giorniSettimana !== undefined ? { giorniSettimana } : {}),
      ...(priorita != null ? { priorita: Number(priorita) } : {}),
      ...(attiva != null ? { attiva } : {}),
    },
    include: { unita: { select: { nome: true } } },
  })

  return NextResponse.json(aggiornata)
}

// DELETE /api/host/strutture/[id]/regole-tariffa?regolaId=xxx
export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const struttura = await prisma.struttura.findFirst({ where: { id: params.id, hostId: auth.user.hostId } })
  if (!struttura) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const regolaId = searchParams.get('regolaId')
  if (!regolaId) return NextResponse.json({ error: 'regolaId mancante' }, { status: 400 })

  const existing = await prisma.regolaTariffa.findFirst({ where: { id: regolaId, strutturaId: params.id } })
  if (!existing) return NextResponse.json({ error: 'Regola non trovata' }, { status: 404 })

  await prisma.regolaTariffa.delete({ where: { id: regolaId } })
  return new NextResponse(null, { status: 204 })
}
