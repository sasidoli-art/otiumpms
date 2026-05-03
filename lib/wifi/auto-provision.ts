/**
 * Auto-provisioning Wi-Fi credentials per prenotazione.
 *
 * Quando arriva una prenotazione confermata (tramite manual entry, booking
 * channel, walk-in al check-in), genera automaticamente un WifiAccessCode
 * legato al periodo di soggiorno. Il codice viene incluso nell'email di
 * conferma o consegnato dalla reception.
 *
 * Usage:
 *   import { autoProvisionWifiForBooking } from '@/lib/wifi/auto-provision'
 *
 *   // Subito dopo creazione/conferma di una prenotazione:
 *   const code = await autoProvisionWifiForBooking(prenotazione)
 *   if (code) {
 *     // include code.codice nell'email guest
 *   }
 *
 * Filosofia: best-effort, NON-blocking. Se qualcosa va male (modulo wifi
 * inattivo, prenotazione senza date valide, errore DB transient), ritorna
 * `null` senza bloccare il flow principale di creazione prenotazione.
 */

import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'

interface BookingMinimal {
  id: string
  hostId: string
  dataArrivo: Date | null
  dataPartenza: Date | null
  guestNome: string | null
  guestCognome: string | null
  stato: string
}

export interface AutoProvisionResult {
  codice: string
  validoFino: Date
  durataMinuti: number
  usiMax: number
}

/**
 * Genera un codice 8 char alphanum (no ambigui 0/O/1/I/L).
 * Versione duplicata da app/api/host/wifi/access-codes/route.ts per evitare
 * import circolari tra route e libreria.
 */
function generateCodice(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/**
 * Quanto deve durare una sessione Wi-Fi per ospite di una prenotazione?
 * 1440 min = 24h, ragionevole per riconnettersi anche dopo notte.
 */
const DEFAULT_SESSION_DURATION_MIN = 1440

/**
 * Quanti device max può autenticare un ospite con lo stesso codice?
 * 5 = phone + tablet + laptop + altri 2 device famiglia.
 */
const DEFAULT_DEVICE_LIMIT = 5

/**
 * Verifica se la prenotazione è candidato per auto-provisioning Wi-Fi:
 *   - hostId valido
 *   - dataArrivo e dataPartenza presenti (no day-use senza date)
 *   - stato CONFERMATA
 *   - host ha modulo wifi attivo
 *   - dataPartenza in futuro (no provisioning per prenotazioni passate)
 */
export async function shouldProvisionWifi(p: BookingMinimal): Promise<boolean> {
  if (p.stato !== 'CONFERMATA') return false
  if (!p.dataArrivo || !p.dataPartenza) return false
  if (p.dataPartenza.getTime() < Date.now()) return false

  const host = await prisma.host.findUnique({
    where: { id: p.hostId },
    select: { moduliAttivi: true },
  })
  if (!host) return false
  return isModuloAttivo(host.moduliAttivi, 'wifi')
}

/**
 * Crea un WifiAccessCode legato a questa prenotazione.
 * Idempotente: se esiste già un codice non revocato per questa
 * prenotazione (matchato sul `note` field), lo ritorna invece di duplicarlo.
 */
export async function autoProvisionWifiForBooking(
  p: BookingMinimal,
): Promise<AutoProvisionResult | null> {
  try {
    if (!(await shouldProvisionWifi(p))) return null
    if (!p.dataArrivo || !p.dataPartenza) return null // type guard

    const noteMarker = `auto:prenotazione:${p.id}`

    // Idempotency: se c'è già un codice per questa prenotazione, ritornalo
    const existing = await prisma.wifiAccessCode.findFirst({
      where: {
        hostId: p.hostId,
        revocatoAt: null,
        note: { contains: noteMarker },
      },
      select: { codice: true, validoFino: true, durataMinuti: true, usiMax: true },
    })
    if (existing) return existing

    // Validità del codice = dal check-in al giorno DOPO il check-out
    // (margine di 24h per partenze tardive). Sessione singola = 24h.
    const validoFino = new Date(p.dataPartenza.getTime() + 24 * 60 * 60 * 1000)

    // Genera codice univoco. In caso di collisione (~10^-12 probabilità con 8 char
    // su 32 charset = 32^8 ≈ 10^12), retry una volta.
    let codice = generateCodice()
    let attempt = 0
    while (attempt < 3) {
      const collision = await prisma.wifiAccessCode.findUnique({ where: { codice } })
      if (!collision) break
      codice = generateCodice()
      attempt++
    }

    const guestLabel =
      [p.guestNome, p.guestCognome].filter(Boolean).join(' ') || 'Ospite'

    const code = await prisma.wifiAccessCode.create({
      data: {
        hostId: p.hostId,
        codice,
        durataMinuti: DEFAULT_SESSION_DURATION_MIN,
        usiMax: DEFAULT_DEVICE_LIMIT,
        validoFino,
        note: `[${noteMarker}] ${guestLabel} (${p.dataArrivo.toISOString().slice(0, 10)} → ${p.dataPartenza.toISOString().slice(0, 10)})`,
        createdByUserId: null, // sistema-generato
      },
    })

    return {
      codice: code.codice,
      validoFino: code.validoFino,
      durataMinuti: code.durataMinuti,
      usiMax: code.usiMax,
    }
  } catch (err) {
    // Best-effort: log e ritorna null, non bloccare il flow chiamante
    console.error('[autoProvisionWifiForBooking] failed:', err)
    return null
  }
}

/**
 * Variante che accetta solo l'id e fa il lookup. Utile da chiamare da webhook
 * o cron senza dover passare l'oggetto completo.
 */
export async function autoProvisionWifiByPrenotazioneId(
  prenotazioneId: string,
): Promise<AutoProvisionResult | null> {
  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    select: {
      id: true,
      hostId: true,
      dataArrivo: true,
      dataPartenza: true,
      guestNome: true,
      guestCognome: true,
      stato: true,
    },
  })
  if (!prenotazione) return null
  return autoProvisionWifiForBooking(prenotazione as BookingMinimal)
}

/**
 * Revoca un codice auto-provisionato (es. al cancel della prenotazione).
 * Idempotent.
 */
export async function revokeAutoProvisionedWifi(prenotazioneId: string): Promise<number> {
  const noteMarker = `auto:prenotazione:${prenotazioneId}`
  const result = await prisma.wifiAccessCode.updateMany({
    where: {
      revocatoAt: null,
      note: { contains: noteMarker },
    },
    data: { revocatoAt: new Date() },
  })
  return result.count
}
