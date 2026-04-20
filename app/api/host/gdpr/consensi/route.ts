import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { CONSENT_TYPES, type ConsentType } from '@/lib/consent'

/**
 * GET /api/host/gdpr/consensi
 * Overview dei consensi per host + CSV export se ?export=csv
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId
  const isCsv = new URL(req.url).searchParams.get('export') === 'csv'

  // Tutti i record di consenso per host, ordine desc per prendere l'ultimo per (email, tipo)
  const records = await prisma.userConsent.findMany({
    where: { hostId },
    orderBy: { createdAt: 'desc' },
    select: {
      guestEmail: true, tipo: true, accettato: true, versione: true,
      revocatoAt: true, createdAt: true,
    },
  })

  // Per ogni (email, tipo): tieni solo il più recente
  const ultimoPer = new Map<string, (typeof records)[number]>()
  for (const r of records) {
    if (!r.guestEmail) continue
    const k = `${r.guestEmail}|${r.tipo}`
    if (!ultimoPer.has(k)) ultimoPer.set(k, r)
  }

  // Aggregate per tipo
  const perTipo: Record<string, { attivi: number; revocati: number }> = {}
  const emails = new Set<string>()
  for (const [k, r] of ultimoPer) {
    const [email] = k.split('|')
    emails.add(email)
    const attivo = r.accettato && !r.revocatoAt
    perTipo[r.tipo] ??= { attivi: 0, revocati: 0 }
    if (attivo) perTipo[r.tipo].attivi++
    else perTipo[r.tipo].revocati++
  }

  if (isCsv) {
    const rows: string[][] = [['email', 'tipo', 'attivo', 'versione', 'data']]
    for (const [k, r] of ultimoPer) {
      const [email] = k.split('|')
      rows.push([
        email,
        r.tipo,
        r.accettato && !r.revocatoAt ? 'SI' : 'NO',
        r.versione ?? '',
        r.createdAt.toISOString(),
      ])
    }
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="consensi-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const overview = (Object.keys(CONSENT_TYPES) as ConsentType[]).map((tipo) => {
    const meta = CONSENT_TYPES[tipo]
    const counts = perTipo[tipo] ?? { attivi: 0, revocati: 0 }
    const totale = counts.attivi + counts.revocati
    return {
      tipo,
      label: meta.label,
      obbligatorio: meta.obbligatorio,
      revocabile: meta.revocabile,
      attivi: counts.attivi,
      revocati: counts.revocati,
      totale,
      percOptIn: totale > 0 ? Math.round((counts.attivi / totale) * 100) : null,
    }
  })

  return NextResponse.json({ overview, totaleOspiti: emails.size })
}
