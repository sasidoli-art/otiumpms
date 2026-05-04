import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { parseBody, profiloUpdateSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { maskHostSecrets } from '@/lib/secrets'
import { setConciergeConfig, setSmtpConfig, setWhatsAppConfig } from '@/lib/host-config'

// GET /api/host/profilo
export async function GET() {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    include: { user: { select: { email: true, nome: true, cognome: true } } },
  })

  if (!host) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  return NextResponse.json(maskHostSecrets(host))
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
  // Campi WiFi passano fuori dallo schema Zod (opzionali, tipizzati manualmente)
  const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

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
      // Canali email — i 5 campi SMTP sono routati a setSmtpConfig() dopo la
      // mega-update di Host. Il facade fa dual-write su HostSmtpConfig + Host.
      // Multi-valuta
      valutaBase: data.valutaBase !== undefined ? data.valutaBase : host.valutaBase,
      valuteAccettate: data.valuteAccettate !== undefined ? data.valuteAccettate : host.valuteAccettate,
      // Modalita check-in
      modalitaCheckin: data.modalitaCheckin !== undefined ? data.modalitaCheckin : host.modalitaCheckin,
      // AI Concierge — i 7 campi sono routati alla satellite HostConciergeConfig
      // tramite setConciergeConfig() chiamato sotto. Il facade fa dual-write
      // verso Host per mantenere coerenti i lettori legacy.
      // WhatsApp Business — i 3 campi sono routati alla satellite HostWhatsAppConfig
      // tramite setWhatsAppConfig() chiamato sotto. Il dual-write nel facade
      // mantiene allineati anche host.whatsapp* e HostConciergeConfig.whatsapp*.
      // Wi-Fi Captive Portal auth methods (passano via rawObj, fuori dallo schema Zod)
      wifiAuthPms: rawObj.wifiAuthPms !== undefined ? !!rawObj.wifiAuthPms : host.wifiAuthPms,
      wifiAuthCode: rawObj.wifiAuthCode !== undefined ? !!rawObj.wifiAuthCode : host.wifiAuthCode,
      wifiAuthComplimentary: rawObj.wifiAuthComplimentary !== undefined ? !!rawObj.wifiAuthComplimentary : host.wifiAuthComplimentary,
      wifiComplimentaryMins: rawObj.wifiComplimentaryMins !== undefined ? (Number(rawObj.wifiComplimentaryMins) || 120) : host.wifiComplimentaryMins,
      wifiAuthUserForm: rawObj.wifiAuthUserForm !== undefined ? !!rawObj.wifiAuthUserForm : host.wifiAuthUserForm,
      wifiAuthEmailOnly: rawObj.wifiAuthEmailOnly !== undefined ? !!rawObj.wifiAuthEmailOnly : host.wifiAuthEmailOnly,
      wifiAuthSocial: rawObj.wifiAuthSocial !== undefined ? !!rawObj.wifiAuthSocial : host.wifiAuthSocial,
      wifiRedirectUrl: rawObj.wifiRedirectUrl !== undefined ? (String(rawObj.wifiRedirectUrl) || null) : host.wifiRedirectUrl,
      wifiWelcomeMessage: rawObj.wifiWelcomeMessage !== undefined ? (String(rawObj.wifiWelcomeMessage) || null) : host.wifiWelcomeMessage,
    },
  })

  // Concierge: routato alla satellite HostConciergeConfig.
  // Toggle ON richiede accettazione GDPR (già presente o in arrivo nello stesso
  // PATCH). Evita il bug della prima attivazione in cui il check leggeva solo
  // il vecchio host.conciergeGdprAcceptedAt.
  const conciergePatch: Record<string, unknown> = {}
  if (data.conciergeAttivo !== undefined) {
    const blockActivation =
      data.conciergeAttivo === true &&
      !host.conciergeGdprAcceptedAt &&
      !data.conciergeGdprAcceptedAt
    conciergePatch.conciergeAttivo = blockActivation ? false : data.conciergeAttivo
  }
  if (data.conciergeGdprAcceptedAt !== undefined) {
    conciergePatch.conciergeGdprAcceptedAt =
      data.conciergeGdprAcceptedAt === null ? null : new Date(data.conciergeGdprAcceptedAt)
  }
  if (data.conciergeProvider !== undefined) conciergePatch.conciergeProvider = data.conciergeProvider
  if (data.conciergeApiKey !== undefined) conciergePatch.conciergeApiKey = data.conciergeApiKey
  if (data.conciergeModel !== undefined) conciergePatch.conciergeModel = data.conciergeModel || null
  if (data.conciergeBaseUrl !== undefined) conciergePatch.conciergeBaseUrl = data.conciergeBaseUrl || null
  if (data.conciergeSystemPrompt !== undefined) conciergePatch.conciergeSystemPrompt = data.conciergeSystemPrompt || null
  if (Object.keys(conciergePatch).length > 0) {
    await setConciergeConfig(auth.user.hostId, conciergePatch)
  }

  // SMTP: routato alla satellite HostSmtpConfig (dual-write su Host).
  const smtpPatch: Record<string, unknown> = {}
  if (data.smtpHost !== undefined) smtpPatch.smtpHost = data.smtpHost || null
  if (data.smtpPort !== undefined) smtpPatch.smtpPort = data.smtpPort ?? null
  if (data.smtpUser !== undefined) smtpPatch.smtpUser = data.smtpUser || null
  if (data.smtpPass !== undefined) smtpPatch.smtpPass = data.smtpPass
  if (data.emailMittente !== undefined) smtpPatch.emailMittente = data.emailMittente || null
  if (Object.keys(smtpPatch).length > 0) {
    await setSmtpConfig(auth.user.hostId, smtpPatch)
  }

  // WhatsApp: routato alla satellite. Il facade fa dual-write su Host +
  // HostConciergeConfig + HostWhatsAppConfig.
  const waPatch: Record<string, unknown> = {}
  if (data.whatsappNumeroId !== undefined) waPatch.phoneNumberId = data.whatsappNumeroId || null
  if (data.whatsappVerifyToken !== undefined) waPatch.verifyToken = data.whatsappVerifyToken || null
  if (data.whatsappAccessToken !== undefined) waPatch.accessToken = data.whatsappAccessToken
  if (Object.keys(waPatch).length > 0) {
    await setWhatsAppConfig(auth.user.hostId, waPatch)
  }

  logger.info('Profilo host aggiornato', 'host/profilo', { hostId: auth.user.hostId })

  await auditFromAuth(auth, { azione: 'profilo.aggiornato', entita: 'host', dettagli: 'Profilo aggiornato' })

  // Log separato se l'update ha toccato secret (senza i valori)
  const updatedSecrets: string[] = []
  if (data.smtpPass !== undefined && data.smtpPass !== null && !(data.smtpPass === '••••••••')) updatedSecrets.push('smtpPass')
  if (data.conciergeApiKey !== undefined && data.conciergeApiKey !== null && !(data.conciergeApiKey === '••••••••')) updatedSecrets.push('conciergeApiKey')
  if (data.whatsappAccessToken !== undefined && data.whatsappAccessToken !== null && !(data.whatsappAccessToken === '••••••••')) updatedSecrets.push('whatsappAccessToken')
  if (updatedSecrets.length > 0) {
    await auditFromAuth(auth, {
      azione: 'host.secret.updated',
      entita: 'host',
      dettagli: `Secrets updated: ${updatedSecrets.join(', ')}`,
    })
  }

  return NextResponse.json(updated)
}
