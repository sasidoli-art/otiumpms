import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { reportConversioni } from '@/lib/upselling'
import { subDays } from 'date-fns'

/**
 * GET /api/host/upselling/conversioni?da=YYYY-MM-DD&a=YYYY-MM-DD
 *
 * Report aggregato per suggerimento:
 *   - visualizzazioni (include accettate + solo viste)
 *   - conversioni (accettate)
 *   - tassoConversione (percent)
 *   - revenue (somma `importo` delle accettate)
 *
 * Default range: ultimi 90 giorni.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const da = sp.get('da') ? new Date(sp.get('da')!) : subDays(new Date(), 90)
  const a = sp.get('a') ? new Date(sp.get('a')!) : new Date()

  const report = await reportConversioni(auth.user.hostId, { da, a })

  const totali = report.reduce(
    (acc, r) => ({
      visualizzazioni: acc.visualizzazioni + r.visualizzazioni,
      conversioni: acc.conversioni + r.conversioni,
      revenue: acc.revenue + r.revenue,
    }),
    { visualizzazioni: 0, conversioni: 0, revenue: 0 },
  )

  return NextResponse.json({
    periodo: { da: da.toISOString().slice(0, 10), a: a.toISOString().slice(0, 10) },
    righe: report,
    totali: {
      ...totali,
      tassoConversione: totali.visualizzazioni > 0
        ? Math.round((totali.conversioni / totali.visualizzazioni) * 1000) / 10
        : 0,
      revenue: Math.round(totali.revenue * 100) / 100,
    },
  })
}
