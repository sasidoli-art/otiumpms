import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parseBody } from '@/lib/validations'

type RouteParams = { params: Promise<{ id: string }> }

const notaCreditoSchema = z.object({
  // Optional: partial credit note (only some righe/amounts)
  righe: z.array(z.object({
    descrizione: z.string().min(1),
    quantita: z.number().positive(),
    prezzoUnitario: z.number().min(0),
    iva: z.number().min(0).default(22),
  })).optional(),
  note: z.string().optional().nullable(),
})

/**
 * POST /api/host/fatture/[id]/nota-credito
 *
 * Creates a nota di credito (TipoDocumento=TD04) referencing the original fattura.
 * If no righe are provided, creates a full reversal of the original invoice.
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const parsed = parseBody(notaCreditoSchema, await req.json())
  if (parsed.error) return parsed.error
  const data = parsed.data

  // Load original fattura
  const originale = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId },
  })

  if (!originale) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  if (originale.stato === 'BOZZA' || originale.stato === 'ANNULLATA' || originale.stato === 'STORNATA') {
    return NextResponse.json(
      { error: `Non è possibile creare una nota credito per una fattura in stato ${originale.stato}` },
      { status: 422 },
    )
  }

  // Prevent creating a credit note for a credit note
  if (originale.tipoDocumento === 'TD04') {
    return NextResponse.json(
      { error: 'Non è possibile creare una nota credito per una nota credito' },
      { status: 422 },
    )
  }

  // Determine righe for the credit note
  let righeNC: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    iva: number
    totale: number
  }>

  if (data.righe && data.righe.length > 0) {
    // Partial credit note
    righeNC = data.righe.map(r => ({
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
      iva: r.iva ?? 22,
      totale: r.quantita * r.prezzoUnitario,
    }))
  } else {
    // Full reversal: mirror all original righe
    const righeOriginali = originale.righe as Array<{
      descrizione: string
      quantita: number
      prezzoUnitario: number
      iva?: number
      totale: number
    }>
    righeNC = righeOriginali.map(r => ({
      descrizione: `Storno: ${r.descrizione}`,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
      iva: r.iva !== undefined ? r.iva : originale.aliquotaIva,
      totale: r.totale,
    }))
  }

  // Calculate totals (stored as positive values, tipoDocumento=TD04 signals it's a credit)
  const imponibile = righeNC.reduce((sum, r) => sum + r.totale, 0)
  const ivaAmount = righeNC.reduce((sum, r) => sum + r.totale * (r.iva / 100), 0)
  const totale = Math.round((imponibile + ivaAmount) * 100) / 100

  // Generate progressive number
  const anno = new Date().getFullYear()
  const lastFattura = await prisma.fattura.findFirst({
    where: { hostId: auth.user.hostId, anno },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  })

  let nextNum = 1
  if (lastFattura) {
    const match = lastFattura.numero.match(/\/(\d+)$/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }
  const numero = `${anno}/${String(nextNum).padStart(3, '0')}`

  // Create the nota di credito
  const notaCredito = await prisma.fattura.create({
    data: {
      hostId: auth.user.hostId,
      numero,
      anno,
      stato: 'BOZZA',
      tipoDocumento: 'TD04',
      riferimentoFatturaId: originale.id,
      clienteNome: originale.clienteNome,
      clientePIva: originale.clientePIva,
      clienteCF: originale.clienteCF,
      clienteIndirizzo: originale.clienteIndirizzo,
      clienteCitta: originale.clienteCitta,
      clienteCap: originale.clienteCap,
      clienteProvincia: originale.clienteProvincia,
      clientePaese: originale.clientePaese,
      clienteEmail: originale.clienteEmail,
      clientePec: originale.clientePec,
      clienteSDI: originale.clienteSDI,
      righe: righeNC,
      imponibile: Math.round(imponibile * 100) / 100,
      iva: Math.round(ivaAmount * 100) / 100,
      totale,
      aliquotaIva: originale.aliquotaIva,
      note: data.note || `Nota di credito rif. fattura ${originale.numero}`,
    },
  })

  // Mark original as STORNATA if full reversal
  if (!data.righe || data.righe.length === 0) {
    await prisma.fattura.update({
      where: { id: originale.id },
      data: { stato: 'STORNATA' },
    })
  }

  return NextResponse.json(notaCredito, { status: 201 })
}
