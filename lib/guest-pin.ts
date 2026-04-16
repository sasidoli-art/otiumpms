/**
 * Guest PIN — chiave universale del soggiorno.
 *
 * PIN a 4 cifre, unico per host, generato alla conferma prenotazione.
 * L'ospite lo usa per: WiFi, directory camera, concierge, richieste, SPA, checkout.
 */

import { prisma } from '@/lib/db'

/**
 * Genera un PIN a 4 cifre unico per l'host dato.
 * Prova fino a 20 volte per evitare collisioni (probabilità bassissima con <100 prenotazioni attive).
 */
export async function generateUniquePin(hostId: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000)) // 1000-9999
    const exists = await prisma.prenotazione.findFirst({
      where: {
        hostId,
        pin,
        stato: { in: ['CONFERMATA', 'RICHIESTA'] },
      },
      select: { id: true },
    })
    if (!exists) return pin
  }
  // Fallback: 5 cifre se 4 non bastano (>9000 prenotazioni attive, improbabile)
  return String(Math.floor(10000 + Math.random() * 90000))
}

/**
 * Assegna un PIN a una prenotazione se non ne ha già uno.
 * Idempotente: se la prenotazione ha già un PIN, lo restituisce senza modificarlo.
 */
export async function ensurePin(prenotazioneId: string, hostId: string): Promise<string> {
  const pren = await prisma.prenotazione.findUnique({
    where: { id: prenotazioneId },
    select: { pin: true },
  })
  if (pren?.pin) return pren.pin

  const pin = await generateUniquePin(hostId)
  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: { pin },
  })
  return pin
}

/**
 * Valida un PIN per un host e restituisce il contesto ospite.
 * Cerca solo prenotazioni attive (CONFERMATA) con date valide.
 */
export async function validatePin(hostId: string, pin: string) {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)

  return prisma.prenotazione.findFirst({
    where: {
      hostId,
      pin,
      stato: 'CONFERMATA',
      dataArrivo: { lte: domani },
      OR: [
        { dataPartenza: null },
        { dataPartenza: { gt: oggi } },
      ],
    },
    include: {
      unita: { select: { id: true, nome: true, descrizione: true, capacita: true } },
      struttura: { select: { id: true, nome: true, citta: true, indirizzo: true, descrizione: true } },
      host: {
        select: {
          nomeAzienda: true,
          telefono: true,
          emailMittente: true,
          conciergeAttivo: true,
          moduliAttivi: true,
          wifiRedirectUrl: true,
        },
      },
    },
  })
}
