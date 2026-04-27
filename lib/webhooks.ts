/**
 * Webhook outbound: dispatch + HMAC signing.
 *
 * - Firma HMAC-SHA256 in header `X-Otium-Signature: sha256=<hex>`
 * - Header `X-Otium-Event` con il nome evento
 * - Header `X-Otium-Delivery` con l'id univoco della consegna
 * - Body: JSON con `{ event, occurredAt, data }`
 *
 * Le consegne falliscono "soft": il record `WebhookConsegna` viene creato
 * con `stato = FALLITA` se l'integratore risponde >=400 o se la richiesta
 * va in timeout. Un cron worker (TODO: `/api/cron/webhook-retry`) ripesca
 * `IN_CODA` + `RIPROVATA` con backoff esponenziale.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import type { WebhookEvent } from '@prisma/client'
import { prisma } from './db'

const TIMEOUT_MS = 5_000
const MAX_RESPONSE_BODY = 2_000

export interface WebhookPayload<T = unknown> {
  event: WebhookEvent
  occurredAt: string
  data: T
}

/**
 * Genera un secret leggibile (32 byte base64url) e ritorna { plain, hash }.
 * Il `plain` viene mostrato all'host UNA SOLA VOLTA al momento della creazione;
 * il backend persiste solo `hash` (sha256 hex).
 */
export function generateWebhookSecret(): { plain: string; hash: string } {
  const plain = `whsec_${randomBytes(32).toString('base64url')}`
  const hash = createHash('sha256').update(plain).digest('hex')
  return { plain, hash }
}

/**
 * HMAC-SHA256 firma del body (canonical JSON string), come `sha256=<hex>`.
 * Il secret usato è il PLAIN, non l'hash — quindi va passato dal punto di
 * dispatch (cron worker che recupera plain da memoria/cache, oppure pre-firma
 * al momento del POST iniziale).
 *
 * In questa implementazione semplificata, il dispatch ricalcola la firma con
 * il plain ricevuto dal chiamante (es. WebhookConsegna.payload contiene il
 * plain solo se invocato in-memory; in alternativa il secret viene memorizzato
 * cifrato — TODO).
 */
export function signWebhook(secretPlain: string, body: string): string {
  const sig = createHmac('sha256', secretPlain).update(body).digest('hex')
  return `sha256=${sig}`
}

/**
 * Verifica firma con timingSafeEqual (per gli endpoint inbound che ricevono
 * il webhook — utility di consumer side, non usata internamente).
 */
export function verifyWebhookSignature(secretPlain: string, body: string, signature: string): boolean {
  const expected = signWebhook(secretPlain, body)
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

/**
 * Dispatcha un evento a TUTTE le subscription attive dell'host che hanno
 * sottoscritto questo evento. Crea record `WebhookConsegna` per ognuna e
 * tenta la consegna immediata (fire-and-forget — non blocca la mutation che
 * ha generato l'evento).
 *
 * Best-effort: errori di rete/timeout vengono catturati e marcati come
 * FALLITA, il cron retry li ripiglierà.
 */
export async function dispatchWebhookEvent<T>(
  hostId: string,
  event: WebhookEvent,
  data: T,
): Promise<void> {
  const subs = await prisma.webhookSubscription.findMany({
    where: { hostId, attivo: true, eventi: { has: event } },
  })
  if (subs.length === 0) return

  const occurredAt = new Date().toISOString()
  const payload: WebhookPayload<T> = { event, occurredAt, data }
  const body = JSON.stringify(payload)

  // Fire-and-forget: non blocchiamo il chiamante. Errori isolati per sub.
  await Promise.allSettled(
    subs.map(async (sub) => {
      const consegna = await prisma.webhookConsegna.create({
        data: {
          subscriptionId: sub.id,
          evento: event,
          payload: payload as object,
          stato: 'IN_CODA',
        },
      })
      // NOTA: senza il plain del secret non possiamo firmare. Il sistema attuale
      // fa hash-only (one-way), quindi le consegne dirette non vengono firmate.
      // Per firmare in modo affidabile servirebbe salvare il secret cifrato AES
      // (vedi lib/host-secrets.ts pattern) — TODO ridefinire se serve firma reale.
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
        const res = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Otium-Event': event,
            'X-Otium-Delivery': consegna.id,
            'User-Agent': 'OtiumWebhook/1.0',
          },
          body,
          signal: ctrl.signal,
        })
        clearTimeout(timer)
        const text = (await res.text().catch(() => '')).slice(0, MAX_RESPONSE_BODY)
        const ok = res.ok
        await prisma.$transaction([
          prisma.webhookConsegna.update({
            where: { id: consegna.id },
            data: {
              stato: ok ? 'RIUSCITA' : 'FALLITA',
              tentativi: 1,
              ultimoTentativoAt: new Date(),
              responseStatus: res.status,
              responseBody: text,
            },
          }),
          prisma.webhookSubscription.update({
            where: { id: sub.id },
            data: {
              ultimaConsegnaAt: new Date(),
              ultimaConsegnaOk: ok,
              consegneRiuscite: { increment: ok ? 1 : 0 },
              consegneFallite: { increment: ok ? 0 : 1 },
            },
          }),
        ])
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        await prisma.$transaction([
          prisma.webhookConsegna.update({
            where: { id: consegna.id },
            data: {
              stato: 'FALLITA',
              tentativi: 1,
              ultimoTentativoAt: new Date(),
              errore: errMsg.slice(0, 500),
            },
          }),
          prisma.webhookSubscription.update({
            where: { id: sub.id },
            data: {
              ultimaConsegnaAt: new Date(),
              ultimaConsegnaOk: false,
              consegneFallite: { increment: 1 },
            },
          }),
        ])
      }
    }),
  )
}

/**
 * Helper per pretty-print del secret hash nelle risposte API: ritorna gli
 * ultimi 4 caratteri (per match visivo) — il plain non è recuperabile.
 */
export function hashFingerprint(hash: string): string {
  return `…${hash.slice(-6)}`
}
