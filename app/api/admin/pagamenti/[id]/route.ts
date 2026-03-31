import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// PATCH /api/admin/pagamenti/[id]  — segna come pagato, annullato, ecc.
export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const pagamento = await prisma.pagamento.findUnique({ where: { id: params.id } })
  if (!pagamento) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.pagamento.update({
    where: { id: params.id },
    data: {
      stato: body.stato ?? pagamento.stato,
      dataPagamento: body.stato === 'PAGATO' ? new Date() : pagamento.dataPagamento,
      metodo: body.metodo ?? pagamento.metodo,
    },
  })

  return NextResponse.json(updated)
}
