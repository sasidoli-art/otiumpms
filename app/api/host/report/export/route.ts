import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import {
  generateReportRevenueCsvPdf,
  generateReportIncassiCsvPdf,
  generateReportIvaCsvPdf,
  generateReportTassaCsvPdf,
} from '@/lib/report-export'

/**
 * GET /api/host/report/export
 *
 * Proxy unificato per export. Richiama internamente l'endpoint dati
 * corrispondente e genera CSV o PDF.
 *
 * Query:
 *   tipo=revenue|incassi|tassa|iva        (obbligatorio)
 *   formato=csv|pdf                        (default: csv)
 *   ...parametri specifici dell'endpoint passati through (da, a, anno, mese, ...)
 */

type Tipo = 'revenue' | 'incassi' | 'tassa' | 'iva'

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin(req.nextUrl.searchParams)
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const tipo = sp.get('tipo') as Tipo | null
  const formato = (sp.get('formato') ?? 'csv').toLowerCase()

  if (!tipo || !['revenue', 'incassi', 'tassa', 'iva'].includes(tipo)) {
    return NextResponse.json({ error: 'Parametro "tipo" mancante o non valido' }, { status: 400 })
  }
  if (!['csv', 'pdf'].includes(formato)) {
    return NextResponse.json({ error: 'Formato deve essere csv o pdf' }, { status: 400 })
  }

  // Richiama endpoint dati internamente (proxy sulla stessa origin)
  const endpointMap: Record<Tipo, string> = {
    revenue: '/api/host/report/revenue',
    incassi: '/api/host/report/incassi',
    tassa: '/api/host/report/tassa-soggiorno',
    iva: '/api/host/report/iva',
  }
  const passthrough = new URLSearchParams(sp)
  passthrough.delete('tipo')
  passthrough.delete('formato')

  const url = new URL(endpointMap[tipo] + (passthrough.toString() ? `?${passthrough}` : ''), req.url)
  const res = await fetch(url, { headers: { cookie: req.headers.get('cookie') ?? '' } })
  if (!res.ok) {
    return NextResponse.json({ error: 'Errore nel caricamento dei dati report' }, { status: 502 })
  }
  const data = await res.json()

  if (tipo === 'revenue') {
    return await generateReportRevenueCsvPdf(data, formato as 'csv' | 'pdf')
  }
  if (tipo === 'incassi') {
    return await generateReportIncassiCsvPdf(data, formato as 'csv' | 'pdf')
  }
  if (tipo === 'iva') {
    return await generateReportIvaCsvPdf(data, formato as 'csv' | 'pdf')
  }
  return await generateReportTassaCsvPdf(data, formato as 'csv' | 'pdf')
}
