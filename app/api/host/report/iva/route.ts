import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfYear, startOfMonth, startOfQuarter, endOfYear, endOfMonth, endOfQuarter, format } from 'date-fns'

/**
 * GET /api/host/report/iva
 *
 * Riepilogo IVA per il commercialista. Aggrega per aliquota imponibile + imposta.
 * Sorgente primaria: RigaFattura (canonica). Fallback: JSON Fattura.righe (legacy).
 *
 * Query:
 *   periodo=mese|trimestre|anno (default: mese)
 *   anno=YYYY (default: anno corrente)
 *   mese=1..12 (se periodo=mese)
 *   trimestre=1..4 (se periodo=trimestre)
 */

type TipoPeriodo = 'mese' | 'trimestre' | 'anno'

type RigaLegacy = {
  descrizione?: string
  quantita?: number
  prezzoUnitario?: number
  iva?: number
  totale?: number
  aliquotaIva?: number
  categoria?: string
}

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin(req.nextUrl.searchParams)
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const sp = req.nextUrl.searchParams
  const periodo = (sp.get('periodo') ?? 'mese') as TipoPeriodo
  const anno = Number(sp.get('anno') ?? new Date().getFullYear())
  const mese = Number(sp.get('mese') ?? (new Date().getMonth() + 1))
  const trimestre = Number(sp.get('trimestre') ?? (Math.floor(new Date().getMonth() / 3) + 1))

  let inizio: Date
  let fine: Date
  if (periodo === 'anno') {
    inizio = startOfYear(new Date(anno, 0, 1))
    fine = endOfYear(new Date(anno, 0, 1))
  } else if (periodo === 'trimestre') {
    const baseMese = (trimestre - 1) * 3
    inizio = startOfQuarter(new Date(anno, baseMese, 1))
    fine = endOfQuarter(new Date(anno, baseMese, 1))
  } else {
    inizio = startOfMonth(new Date(anno, mese - 1, 1))
    fine = endOfMonth(new Date(anno, mese - 1, 1))
  }

  const fatture = await prisma.fattura.findMany({
    where: {
      hostId,
      deletedAt: null,
      stato: { in: ['INVIATA', 'PAGATA'] as Array<'INVIATA' | 'PAGATA'> },
      dataEmissione: { gte: inizio, lte: fine },
    },
    select: {
      id: true,
      numero: true,
      aliquotaIva: true,
      imponibile: true,
      iva: true,
      totale: true,
      righe: true, // JSON legacy
      rigeRel: {
        select: {
          descrizione: true,
          totale: true,
          aliquotaIva: true,
          naturaEsenzione: true,
          categoria: true,
        },
      },
    },
    orderBy: { dataEmissione: 'asc' },
  })

  // Aggregato per aliquota
  const perAliquota = new Map<string, { aliquota: number; imponibile: number; iva: number; totale: number; natura?: string }>()
  const ensure = (aliquota: number, natura?: string) => {
    const key = natura ?? String(aliquota)
    const cur = perAliquota.get(key) ?? { aliquota, imponibile: 0, iva: 0, totale: 0, natura }
    perAliquota.set(key, cur)
    return cur
  }

  for (const f of fatture) {
    if (f.rigeRel && f.rigeRel.length > 0) {
      for (const r of f.rigeRel) {
        const imponibile = r.totale
        const aliquota = r.aliquotaIva
        const natura = r.naturaEsenzione ?? undefined
        const ivaCalc = natura ? 0 : Math.round(imponibile * aliquota) / 100
        const row = ensure(aliquota, natura)
        row.imponibile += imponibile
        row.iva += ivaCalc
        row.totale += imponibile + ivaCalc
      }
    } else if (Array.isArray(f.righe)) {
      // Fallback legacy
      for (const r of f.righe as unknown as RigaLegacy[]) {
        const imponibile = r.totale ?? ((r.prezzoUnitario ?? 0) * (r.quantita ?? 1))
        const aliquota = r.aliquotaIva ?? r.iva ?? f.aliquotaIva
        const ivaCalc = Math.round(imponibile * aliquota) / 100
        const row = ensure(aliquota)
        row.imponibile += imponibile
        row.iva += ivaCalc
        row.totale += imponibile + ivaCalc
      }
    } else {
      // Nessuna riga — usa totali fattura
      const row = ensure(f.aliquotaIva)
      row.imponibile += f.imponibile
      row.iva += f.iva
      row.totale += f.totale
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100
  const righe = Array.from(perAliquota.values())
    .map((r) => ({
      aliquota: r.aliquota,
      natura: r.natura ?? null,
      imponibile: round2(r.imponibile),
      iva: round2(r.iva),
      totale: round2(r.totale),
    }))
    .sort((a, b) => b.aliquota - a.aliquota)

  const totali = righe.reduce(
    (s, r) => ({ imponibile: s.imponibile + r.imponibile, iva: s.iva + r.iva, totale: s.totale + r.totale }),
    { imponibile: 0, iva: 0, totale: 0 },
  )

  return NextResponse.json({
    periodo: {
      tipo: periodo,
      anno,
      mese: periodo === 'mese' ? mese : null,
      trimestre: periodo === 'trimestre' ? trimestre : null,
      da: format(inizio, 'yyyy-MM-dd'),
      a: format(fine, 'yyyy-MM-dd'),
    },
    fattureEsaminate: fatture.length,
    righe,
    totali: {
      imponibile: round2(totali.imponibile),
      iva: round2(totali.iva),
      totale: round2(totali.totale),
    },
  }, { headers: { 'Cache-Control': 'private, max-age=300' } })
}
