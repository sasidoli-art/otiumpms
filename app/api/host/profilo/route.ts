import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { parseBody, profiloUpdateSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

// GET /api/host/profilo
export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    include: { user: { select: { email: true, nome: true, cognome: true } } },
  })

  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(host)
}

// PATCH /api/host/profilo
export async function PATCH(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({ where: { id: auth.user.hostId } })
  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo della richiesta malformato' }, { status: 400 })
  }

  const parsed = parseBody(profiloUpdateSchema, raw)
  if (parsed.error) return parsed.error
  const data = parsed.data

  const updated = await prisma.host.update({
    where: { id: auth.user.hostId },
    data: {
      nomeAzienda: data.nomeAzienda ?? host.nomeAzienda,
      partitaIva: data.partitaIva !== undefined ? data.partitaIva : host.partitaIva,
      codiceFiscale: data.codiceFiscale !== undefined ? data.codiceFiscale : host.codiceFiscale,
      telefono: data.telefono !== undefined ? data.telefono : host.telefono,
      sitoWeb: data.sitoWeb !== undefined ? (data.sitoWeb || null) : host.sitoWeb,
      indirizzo: data.indirizzo !== undefined ? data.indirizzo : host.indirizzo,
      citta: data.citta !== undefined ? data.citta : host.citta,
      provincia: data.provincia !== undefined ? data.provincia : host.provincia,
      cap: data.cap !== undefined ? data.cap : host.cap,
      regione: data.regione !== undefined ? data.regione : host.regione,
      fattNomeAzienda: data.fattNomeAzienda !== undefined ? data.fattNomeAzienda : host.fattNomeAzienda,
      fattPartitaIva: data.fattPartitaIva !== undefined ? data.fattPartitaIva : host.fattPartitaIva,
      fattIndirizzo: data.fattIndirizzo !== undefined ? data.fattIndirizzo : host.fattIndirizzo,
      fattCitta: data.fattCitta !== undefined ? data.fattCitta : host.fattCitta,
      fattCap: data.fattCap !== undefined ? data.fattCap : host.fattCap,
      fattProvincia: data.fattProvincia !== undefined ? data.fattProvincia : host.fattProvincia,
      fattPaese: data.fattPaese !== undefined ? data.fattPaese : host.fattPaese,
      fattEmail: data.fattEmail !== undefined ? (data.fattEmail || null) : host.fattEmail,
      fattPec: data.fattPec !== undefined ? (data.fattPec || null) : host.fattPec,
      fattCodiceSDI: data.fattCodiceSDI !== undefined ? data.fattCodiceSDI : host.fattCodiceSDI,
      regimeFiscale: data.regimeFiscale !== undefined ? data.regimeFiscale : host.regimeFiscale,
      // Canali email
      smtpHost: data.smtpHost !== undefined ? (data.smtpHost || null) : host.smtpHost,
      smtpPort: data.smtpPort !== undefined ? (data.smtpPort ?? null) : host.smtpPort,
      smtpUser: data.smtpUser !== undefined ? (data.smtpUser || null) : host.smtpUser,
      smtpPass: data.smtpPass !== undefined ? (data.smtpPass || null) : host.smtpPass,
      emailMittente: data.emailMittente !== undefined ? (data.emailMittente || null) : host.emailMittente,
      // Multi-valuta
      valutaBase: data.valutaBase !== undefined ? data.valutaBase : host.valutaBase,
      valuteAccettate: data.valuteAccettate !== undefined ? data.valuteAccettate : host.valuteAccettate,
      // Modalita check-in
      modalitaCheckin: data.modalitaCheckin !== undefined ? data.modalitaCheckin : host.modalitaCheckin,
      // AI Concierge
      conciergeAttivo: data.conciergeAttivo !== undefined ? data.conciergeAttivo : host.conciergeAttivo,
      conciergeProvider: data.conciergeProvider !== undefined ? data.conciergeProvider : host.conciergeProvider,
      conciergeApiKey: data.conciergeApiKey !== undefined ? (data.conciergeApiKey || null) : host.conciergeApiKey,
      conciergeModel: data.conciergeModel !== undefined ? (data.conciergeModel || null) : host.conciergeModel,
      conciergeBaseUrl: data.conciergeBaseUrl !== undefined ? (data.conciergeBaseUrl || null) : host.conciergeBaseUrl,
      conciergeSystemPrompt: data.conciergeSystemPrompt !== undefined ? (data.conciergeSystemPrompt || null) : host.conciergeSystemPrompt,
      // WhatsApp Business
      whatsappNumeroId: data.whatsappNumeroId !== undefined ? (data.whatsappNumeroId || null) : host.whatsappNumeroId,
      whatsappAccessToken: data.whatsappAccessToken !== undefined ? (data.whatsappAccessToken || null) : host.whatsappAccessToken,
      whatsappVerifyToken: data.whatsappVerifyToken !== undefined ? (data.whatsappVerifyToken || null) : host.whatsappVerifyToken,
    },
  })

  logger.info('Profilo host aggiornato', 'host/profilo', { hostId: auth.user.hostId })

    await auditFromAuth(auth, { azione: 'profilo.aggiornato', entita: 'host', dettagli: 'Profilo aggiornato' })

return NextResponse.json(updated)
}
