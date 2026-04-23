import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { fetchAndParseIcal } from '@/lib/ical-import'

/**
 * POST /api/host/canali/verifica
 *
 * Verifica un URL iCal prima di salvarlo: fetch + parse, ritorna numero di eventi trovati.
 * Body: { url: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { url } = await req.json().catch(() => ({ url: '' }))
  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ ok: false, error: 'URL non valido' }, { status: 400 })
  }

  try {
    const eventi = await fetchAndParseIcal(url)
    const dates = eventi.map((e) => e.dtstart.getTime())
    const futuri = eventi.filter((e) => e.dtend.getTime() >= Date.now()).length
    return NextResponse.json({
      ok: true,
      totale: eventi.length,
      futuri,
      primoEvento: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
      ultimoEvento: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: errMsg }, { status: 200 })
  }
}
