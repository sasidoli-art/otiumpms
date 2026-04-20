/**
 * Consent Management — Art. 7 GDPR.
 *
 * Storico immutabile dei consensi: ogni cambio di stato (accetta → revoca) è
 * un nuovo record in UserConsent. Non esistono UPDATE sui record di consenso.
 * Il consenso "attivo" è l'ultimo record per (subject, hostId, tipo).
 *
 * Subject identificato da UNO di: userId | guestEmail | guestToken.
 * guestToken è un HMAC-SHA256 di (email + hostId) con ENCRYPTION_KEY — permette
 * a un ospite non autenticato di gestire i propri consensi tramite link magico.
 */

import crypto from 'crypto'
import type { UserConsent } from '@prisma/client'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { logger } from '@/lib/logger'

// ─── Tipologie di consenso ───────────────────────────────────────────────────

export type ConsentBaseGiuridica =
  | 'contratto' // non è un consenso, è un'informativa obbligatoria per eseguire il contratto
  | 'consenso' // consenso libero revocabile (marketing, profilazione)
  | 'consenso_esplicito' // Art. 9 GDPR — dati particolari (sanitari)
  | 'obbligo_legale'

export type ConsentTypeDef = {
  label: string
  obbligatorio: boolean
  baseGiuridica: ConsentBaseGiuridica
  revocabile: boolean
  riferimentoNormativo?: string
}

export const CONSENT_TYPES = {
  privacy_ospite: {
    label: 'Informativa privacy',
    obbligatorio: true,
    baseGiuridica: 'contratto',
    revocabile: false,
  },
  termini_servizio: {
    label: 'Termini e condizioni',
    obbligatorio: true,
    baseGiuridica: 'contratto',
    revocabile: false,
  },
  marketing_email: {
    label: 'Comunicazioni marketing via email',
    obbligatorio: false,
    baseGiuridica: 'consenso',
    revocabile: true,
  },
  marketing_sms: {
    label: 'Comunicazioni marketing via SMS',
    obbligatorio: false,
    baseGiuridica: 'consenso',
    revocabile: true,
  },
  spa_art9: {
    label: 'Trattamento dati sanitari SPA',
    obbligatorio: true, // per usare la SPA (non per il soggiorno)
    baseGiuridica: 'consenso_esplicito',
    revocabile: true, // revoca → cancellazione dati sanitari
    riferimentoNormativo: 'Art. 9 GDPR',
  },
  profilazione_crm: {
    label: 'Profilazione per personalizzazione del servizio',
    obbligatorio: false,
    baseGiuridica: 'consenso',
    revocabile: true,
  },
  cookie_analytics: {
    label: 'Cookie di analisi',
    obbligatorio: false,
    baseGiuridica: 'consenso',
    revocabile: true,
  },
  cookie_marketing: {
    label: 'Cookie di marketing',
    obbligatorio: false,
    baseGiuridica: 'consenso',
    revocabile: true,
  },
} as const satisfies Record<string, ConsentTypeDef>

export type ConsentType = keyof typeof CONSENT_TYPES

// ─── Subject identification ──────────────────────────────────────────────────

type ConsentSubject =
  | { userId: string; hostId?: string | null }
  | { guestEmail: string; hostId: string }
  | { guestToken: string; hostId: string }

// ─── Helpers interni ─────────────────────────────────────────────────────────

function subjectWhere(s: ConsentSubject, tipo: ConsentType): Record<string, unknown> {
  const where: Record<string, unknown> = { tipo }
  if ('userId' in s) {
    where.userId = s.userId
    if (s.hostId) where.hostId = s.hostId
  } else if ('guestEmail' in s) {
    where.guestEmail = s.guestEmail.trim().toLowerCase()
    where.hostId = s.hostId
  } else {
    where.guestToken = s.guestToken
    where.hostId = s.hostId
  }
  return where
}

// ─── Registra / revoca consenso ──────────────────────────────────────────────

export type RegistraConsensoInput = {
  hostId: string
  tipo: ConsentType
  versione: string
  accettato: boolean
  // subject identity (almeno uno)
  guestEmail?: string | null
  guestToken?: string | null
  userId?: string | null
  // prova
  ip?: string | null
  userAgent?: string | null
  metodo?: 'checkbox' | 'firma_digitale' | 'double_opt_in' | 'api' | null
  // revoca
  revocaMotivo?: 'richiesta_ospite' | 'scadenza' | 'cambio_versione' | null
}

/**
 * Registra un nuovo record di consenso (sempre INSERT, mai UPDATE).
 * Se `accettato=false` e c'è un consenso attivo precedente, lo marca come
 * revocato (revocatoAt). L'INSERT nuovo preserva la storia audit-ready.
 *
 * Side effects:
 *  - Audit log "consenso.dato" / "consenso.revocato"
 *  - Se revoca di spa_art9: cancella i dati sanitari associati via policy
 */
export async function registraConsenso(input: RegistraConsensoInput): Promise<UserConsent> {
  const meta = CONSENT_TYPES[input.tipo]
  if (!meta) {
    throw new Error(`Tipo consenso sconosciuto: ${input.tipo}`)
  }
  if (!input.accettato && !meta.revocabile) {
    throw new Error(`Il consenso ${input.tipo} non è revocabile (${meta.baseGiuridica})`)
  }
  if (!input.guestEmail && !input.guestToken && !input.userId) {
    throw new Error('Subject mancante: serve guestEmail, guestToken o userId')
  }

  const emailNorm = input.guestEmail?.trim().toLowerCase() ?? null

  // Se stiamo revocando, marca l'ultimo record attivo come revocato (best effort).
  if (!input.accettato) {
    const subject: ConsentSubject = input.userId
      ? { userId: input.userId, hostId: input.hostId }
      : input.guestEmail
        ? { guestEmail: input.guestEmail, hostId: input.hostId }
        : { guestToken: input.guestToken!, hostId: input.hostId }
    const ultimoAttivo = await prisma.userConsent.findFirst({
      where: { ...subjectWhere(subject, input.tipo), accettato: true, revocatoAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (ultimoAttivo) {
      await prisma.userConsent.update({
        where: { id: ultimoAttivo.id },
        data: { revocatoAt: new Date(), revocaMotivo: input.revocaMotivo ?? 'richiesta_ospite' },
      })
    }
  }

  const consent = await prisma.userConsent.create({
    data: {
      hostId: input.hostId,
      userId: input.userId ?? null,
      guestEmail: emailNorm,
      guestToken: input.guestToken ?? null,
      tipo: input.tipo,
      versione: input.versione,
      accettato: input.accettato,
      ip: input.ip ?? null,
      userAgent: input.userAgent?.substring(0, 500) ?? null,
      metodo: input.metodo ?? 'checkbox',
    },
  })

  await audit({
    hostId: input.hostId,
    userId: input.userId ?? null,
    azione: input.accettato ? 'consenso.dato' : 'consenso.revocato',
    entita: 'UserConsent',
    entitaId: consent.id,
    dettagli: `${input.tipo} v${input.versione} ${input.accettato ? 'accettato' : 'revocato'} da ${emailNorm ?? input.userId ?? 'token'}`,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  })

  // Revoca spa_art9 → cancella dati sanitari collegati
  if (input.tipo === 'spa_art9' && !input.accettato && emailNorm) {
    await cancellaDatiSanitariOspite(input.hostId, emailNorm).catch((e) =>
      logger.error('Cancellazione dati sanitari post-revoca fallita', 'consent', {
        error: e instanceof Error ? e.message : String(e),
      }),
    )
  }

  return consent
}

// ─── Query stato consenso ────────────────────────────────────────────────────

/**
 * Verifica se il consenso per (subject, hostId, tipo) è attivo ORA.
 * Attivo = ultimo record ha accettato=true AND revocatoAt=null.
 */
export async function consensoAttivo(
  subject: ConsentSubject,
  tipo: ConsentType,
): Promise<boolean> {
  const where = subjectWhere(subject, tipo)
  const ultimo = await prisma.userConsent.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
    select: { accettato: true, revocatoAt: true },
  })
  return !!ultimo && ultimo.accettato && ultimo.revocatoAt === null
}

export type ConsensoStato = {
  tipo: ConsentType
  label: string
  obbligatorio: boolean
  revocabile: boolean
  baseGiuridica: ConsentBaseGiuridica
  attivo: boolean
  versione: string | null
  dataUltimoCambio: Date | null
}

/** Ritorna lo stato di tutti i tipi di consenso per un ospite. */
export async function getConsensiOspite(
  guestEmail: string,
  hostId: string,
): Promise<ConsensoStato[]> {
  const emailNorm = guestEmail.trim().toLowerCase()
  const records = await prisma.userConsent.findMany({
    where: { guestEmail: emailNorm, hostId },
    orderBy: { createdAt: 'desc' },
    select: { tipo: true, accettato: true, versione: true, revocatoAt: true, createdAt: true },
  })

  // Raggruppa per tipo e prendi l'ultimo per tipo
  const ultimoPerTipo = new Map<string, (typeof records)[number]>()
  for (const r of records) {
    if (!ultimoPerTipo.has(r.tipo)) ultimoPerTipo.set(r.tipo, r)
  }

  return (Object.keys(CONSENT_TYPES) as ConsentType[]).map((tipo) => {
    const meta = CONSENT_TYPES[tipo]
    const r = ultimoPerTipo.get(tipo)
    return {
      tipo,
      label: meta.label,
      obbligatorio: meta.obbligatorio,
      revocabile: meta.revocabile,
      baseGiuridica: meta.baseGiuridica,
      attivo: !!r && r.accettato && r.revocatoAt === null,
      versione: r?.versione ?? null,
      dataUltimoCambio: r?.createdAt ?? null,
    }
  })
}

// ─── Guest token (HMAC) ──────────────────────────────────────────────────────

function getHmacKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY env var required to generate guest tokens')
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Genera un token HMAC per identificare un ospite senza login.
 * Il token è determinista (stesso input → stesso output) → può essere
 * rigenerato in qualsiasi momento e non serve conservarlo.
 *
 * Formato: primi 32 char hex di HMAC-SHA256(email+hostId, ENCRYPTION_KEY).
 */
export function generaGuestToken(email: string, hostId: string): string {
  const emailNorm = email.trim().toLowerCase()
  const h = crypto.createHmac('sha256', getHmacKey())
  h.update(`${emailNorm}:${hostId}`)
  return h.digest('hex').substring(0, 32)
}

/** Verifica l'HMAC con timing-safe compare per evitare side-channel attacks. */
export function verificaGuestToken(token: string, email: string, hostId: string): boolean {
  try {
    const expected = generaGuestToken(email, hostId)
    if (expected.length !== token.length) return false
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

// ─── Portale ospite token (reversibile, firmato) ─────────────────────────────
//
// Formato: {payload_b64url}.{hmac_b64url}
// Payload: JSON { email, hostId, iat } — è ricavabile dal token senza DB
// (firma garantisce tamper-proof). L'URL del portale ha solo il token.

type PortalePayload = { email: string; hostId: string; iat: number }

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function signPayload(payloadB64: string): string {
  const h = crypto.createHmac('sha256', getHmacKey())
  h.update(payloadB64)
  return b64urlEncode(h.digest())
}

/** Genera un token firmato che contiene email + hostId (reversibile via verifica HMAC). */
export function generaPortaleToken(email: string, hostId: string): string {
  const payload: PortalePayload = {
    email: email.trim().toLowerCase(),
    hostId,
    iat: Math.floor(Date.now() / 1000),
  }
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), 'utf8'))
  const sig = signPayload(payloadB64)
  return `${payloadB64}.${sig}`
}

/**
 * Verifica e decodifica un portale token. Ritorna null se invalido o scaduto.
 * Scadenza opzionale — di default il token non scade (link email permanenti
 * sono comodi, la sicurezza è nell'HMAC che richiede ENCRYPTION_KEY).
 */
export function verificaPortaleToken(
  token: string,
  opts: { maxAgeSec?: number } = {},
): { email: string; hostId: string } | null {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return null
    const expectedSig = signPayload(payloadB64)
    if (
      expectedSig.length !== sig.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))
    ) {
      return null
    }
    const payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as PortalePayload
    if (opts.maxAgeSec && Date.now() / 1000 - payload.iat > opts.maxAgeSec) {
      return null
    }
    if (!payload.email || !payload.hostId) return null
    return { email: payload.email, hostId: payload.hostId }
  } catch {
    return null
  }
}

// ─── Side effect: revoca spa_art9 ────────────────────────────────────────────

/**
 * Se un ospite revoca il consenso al trattamento dati sanitari SPA, i
 * WaiverSpa collegati devono essere cancellati immediatamente (Art. 17 GDPR
 * - diritto all'oblio sui dati Art. 9).
 */
async function cancellaDatiSanitariOspite(hostId: string, emailNorm: string): Promise<number> {
  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where: { hostId, guestEmail: emailNorm },
    select: { id: true },
  })
  if (appuntamenti.length === 0) return 0

  const result = await prisma.waiverSpa.deleteMany({
    where: { appuntamentoId: { in: appuntamenti.map((a) => a.id) } },
  })

  await audit({
    hostId,
    azione: 'gdpr.art17.waiver_spa_cancellati',
    entita: 'waiverSpa',
    dettagli: `${result.count} waiver SPA cancellati per revoca consenso Art. 9 (ospite ${emailNorm.substring(0, 3)}***)`,
  })

  return result.count
}
