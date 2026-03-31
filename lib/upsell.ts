/**
 * Upselling Engine — calcola upgrade disponibili per una prenotazione.
 *
 * Al check-in (o via AI), il sistema propone camere superiori
 * con supplemento e incentivo per l'operatore.
 */

import { prisma } from '@/lib/db'

export interface UpgradeDisponibile {
  regolaId: string
  nome: string
  daCameraNome: string
  aCameraId: string
  aCameraNome: string
  supplementoNotte: number
  supplementoTotale: number
  incentivoOperatore: number
  disponibile: boolean     // camera target è libera e pulita?
  motivoNonDisp?: string
}

export async function calcolaUpgradeDisponibili(
  hostId: string,
  prenotazioneId: string,
): Promise<UpgradeDisponibile[]> {
  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId },
    select: {
      unitaId: true, strutturaId: true, dataArrivo: true, dataPartenza: true,
      unita: { select: { nome: true } },
    },
  })
  if (!pren || !pren.unitaId || !pren.strutturaId) return []

  const notti = pren.dataPartenza
    ? Math.max(1, Math.round((new Date(pren.dataPartenza).getTime() - new Date(pren.dataArrivo).getTime()) / 86400000))
    : 1

  // Calcola occupazione attuale
  const unitaTotali = await prisma.unitaPrenotabile.count({
    where: { struttura: { hostId }, attiva: true },
  })
  const oggi = new Date()
  const occupateOggi = await prisma.prenotazione.count({
    where: {
      hostId,
      stato: { in: ['CONFERMATA'] },
      dataArrivo: { lte: oggi },
      OR: [{ dataPartenza: { gt: oggi } }, { dataPartenza: null }],
    },
  })
  const occupazionePct = unitaTotali > 0 ? (occupateOggi / unitaTotali) * 100 : 0

  // Regole attive per questa struttura
  const regole = await prisma.regolaUpsell.findMany({
    where: {
      hostId,
      attiva: true,
      AND: [
        { OR: [{ strutturaId: pren.strutturaId }, { strutturaId: null }] },
        { OR: [{ daUnitaId: pren.unitaId }, { daUnitaId: null }] },
      ],
    },
  })

  const risultati: UpgradeDisponibile[] = []

  for (const regola of regole) {
    // Check limiti
    if (regola.maxOccupazione && occupazionePct > regola.maxOccupazione) continue
    if (regola.maxNotti && notti > regola.maxNotti) continue

    // Camera target
    const target = await prisma.unitaPrenotabile.findUnique({
      where: { id: regola.aUnitaId },
      select: { id: true, nome: true, statoHK: true, prezzoBase: true },
    })
    if (!target) continue

    // Check disponibilità camera target
    const occupata = await prisma.prenotazione.count({
      where: {
        unitaId: target.id,
        stato: { in: ['CONFERMATA', 'RICHIESTA'] },
        dataArrivo: { lt: pren.dataPartenza || new Date(pren.dataArrivo.getTime() + 86400000) },
        OR: [{ dataPartenza: { gt: pren.dataArrivo } }, { dataPartenza: null }],
      },
    })

    const disponibile = occupata === 0 && (target.statoHK === 'PULITA' || target.statoHK === 'IN_PULIZIA')

    // Calcola supplemento
    let supplementoNotte = regola.supplemento
    if (regola.tipoSupplemento === 'PERCENTUALE') {
      supplementoNotte = (target.prezzoBase * regola.supplemento) / 100
    }
    supplementoNotte = Math.round(supplementoNotte * 100) / 100
    const supplementoTotale = Math.round(supplementoNotte * notti * 100) / 100

    // Calcola incentivo
    let incentivo = regola.incentivo
    if (regola.incentivoPct) {
      incentivo = Math.round(supplementoTotale * regola.incentivoPct / 100 * 100) / 100
    }

    risultati.push({
      regolaId: regola.id,
      nome: regola.nome,
      daCameraNome: pren.unita?.nome || '—',
      aCameraId: target.id,
      aCameraNome: target.nome,
      supplementoNotte,
      supplementoTotale,
      incentivoOperatore: incentivo,
      disponibile,
      motivoNonDisp: !disponibile
        ? (occupata > 0 ? 'Camera occupata' : `Stato HK: ${target.statoHK}`)
        : undefined,
    })
  }

  return risultati.sort((a, b) => (b.disponibile ? 1 : 0) - (a.disponibile ? 1 : 0) || a.supplementoNotte - b.supplementoNotte)
}
