import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { promises as dns } from 'node:dns'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'
import { audit } from '@/lib/audit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // node:dns non e` disponibile su Edge

/**
 * POST /api/host/booking-engine/verify-domain
 *
 * Verifica la configurazione DNS del custom domain: cerca un record CNAME
 * che punti a CNAME_TARGET. Se trovato, salva `customDomain` +
 * `customDomainVerificatoAt` sulla struttura.
 *
 * NB: il CNAME verifica e` solo la meta` del lavoro. L'altra meta` e` la
 * configurazione del dominio su Vercel (dashboard o API). Questa API
 * conferma solo che il DNS e` pronto; la UI deve istruire l'host a
 * contattare il supporto o configurare il dominio su Vercel.
 */

const CNAME_TARGET = process.env.BOOKING_CNAME_TARGET || 'cname.otiumweek.com'

const schema = z.object({
  strutturaId: z.string().cuid(),
  domain: z.string().trim().toLowerCase()
    // Validazione dominio basica: lettere/numeri/trattini e almeno un punto.
    .regex(/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/, 'Dominio non valido'),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { hostId } = auth.user

  const raw = await req.json().catch(() => null)
  const parsed = parseBody(schema, raw)
  if (parsed.error) return parsed.error
  const { strutturaId, domain } = parsed.data

  // Blocca domini riservati
  if (/otiumweek\.(com|it|net)$/i.test(domain) || /vercel\.app$/i.test(domain)) {
    return NextResponse.json({ error: 'Dominio non ammesso' }, { status: 422 })
  }

  // Multi-tenant
  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId },
    select: { id: true },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  // Unicita` custom domain (gia` garantita dall'@unique, ma diamo messaggio chiaro)
  const conflict = await prisma.struttura.findFirst({
    where: { customDomain: domain, NOT: { id: strutturaId } },
    select: { id: true },
  })
  if (conflict) {
    return NextResponse.json({ error: 'Dominio già usato da un\'altra struttura' }, { status: 409 })
  }

  // ─── Lookup CNAME ─────────────────────────────────────────────────────
  let records: string[] = []
  try {
    records = await dns.resolveCname(domain)
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    // ENOTFOUND / ENODATA = il dominio non ha CNAME (potrebbe avere A/AAAA, non ci va bene)
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return NextResponse.json({
        verified: false,
        cnameTarget: CNAME_TARGET,
        error: 'Nessun record CNAME trovato per questo dominio. Configura il CNAME e riprova fra qualche minuto.',
      }, { status: 200 })
    }
    logger.warn('DNS lookup fallito', 'booking-engine/verify-domain', {
      domain, error: err.message, code: err.code,
    })
    return NextResponse.json({
      verified: false,
      cnameTarget: CNAME_TARGET,
      error: 'Impossibile verificare il DNS in questo momento.',
    }, { status: 200 })
  }

  const matched = records.some(
    (r) => r.replace(/\.$/, '').toLowerCase() === CNAME_TARGET.toLowerCase(),
  )

  if (!matched) {
    return NextResponse.json({
      verified: false,
      cnameTarget: CNAME_TARGET,
      foundRecords: records,
      error: `Il CNAME trovato non punta a ${CNAME_TARGET}. Correggi il record DNS e riprova.`,
    }, { status: 200 })
  }

  // Salva
  const now = new Date()
  await prisma.struttura.update({
    where: { id: strutturaId },
    data: { customDomain: domain, customDomainVerificatoAt: now },
  })

  await audit({
    hostId,
    azione: 'booking_engine.custom_domain_verificato',
    entita: 'struttura',
    entitaId: strutturaId,
    dettagli: `Custom domain verificato: ${domain}`,
  }).catch(() => { /* non blocca */ })

  return NextResponse.json({
    verified: true,
    cnameTarget: CNAME_TARGET,
    domain,
    verificatoAt: now.toISOString(),
    // Promemoria lato prodotto
    prossimiPassi: `Il DNS è configurato. Contatta il supporto per aggiungere ${domain} ai domini gestiti su Vercel (operazione una tantum).`,
  })
}
