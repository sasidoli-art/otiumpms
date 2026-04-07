/**
 * Helper per la "struttura attiva" lato host.
 *
 * Quando un host gestisce più strutture, l'utente ne sceglie una alla volta.
 * La selezione è persistita in un cookie (`otm_struttura_id`).
 *
 * - Se l'host ha 1 sola struttura, viene auto-selezionata.
 * - Se ne ha 2+ e il cookie non è settato (o non valido) → la pagina/layout
 *   deve fare redirect a `/host/seleziona-struttura`.
 */

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export const STRUTTURA_COOKIE = 'otm_struttura_id'

export interface StrutturaInfo {
  id: string
  nome: string
}

export interface StrutturaAttivaResult {
  /** Strutture appartenenti all'host */
  strutture: StrutturaInfo[]
  /** Struttura correntemente selezionata (null se non scelta o non valida) */
  attiva: StrutturaInfo | null
}

/**
 * Carica la lista delle strutture dell'host e determina quella attiva
 * basandosi sul cookie. Se l'host ha 1 sola struttura, la attiva sempre.
 */
export async function getStruttureHost(hostId: string): Promise<StrutturaAttivaResult> {
  const strutture = await prisma.struttura.findMany({
    where: { hostId },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  if (strutture.length === 0) {
    return { strutture: [], attiva: null }
  }

  // Una sola struttura → sempre attiva
  if (strutture.length === 1) {
    return { strutture, attiva: strutture[0] }
  }

  // Più strutture → leggi cookie
  const store = await cookies()
  const cookieId = store.get(STRUTTURA_COOKIE)?.value
  const attiva = cookieId ? strutture.find(s => s.id === cookieId) ?? null : null
  return { strutture, attiva }
}

/**
 * Restituisce solo l'id della struttura attiva (o null).
 * Da usare nelle pagine/API host per scopare le query.
 */
export async function getStrutturaAttivaId(hostId: string): Promise<string | null> {
  const { attiva } = await getStruttureHost(hostId)
  return attiva?.id ?? null
}
