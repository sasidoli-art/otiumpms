/**
 * lib/crm-sync.ts — CRM sync, deduplication e merge (Prompt 13).
 *
 * Complementa lib/crm.ts (upsert base + lookup) con:
 *   - syncOspiteCRM: upsert completo + aggiornamento stats + link prenotazione
 *   - cercaDuplicatiCRM: ricerca fuzzy per email/nome/telefono
 *   - mergeCRM: unifica due record CRM in $transaction
 */
import { prisma } from '@/lib/db'

// ─── syncOspiteCRM ─────────────────────────────────────────────────────────

export type SyncOspiteInput = {
  hostId: string
  guestEmail: string
  guestNome: string
  guestCognome: string
  guestTelefono?: string | null
  guestLingua?: string | null
  prenotazioneId: string
  importo?: number | null
}

export type SyncOspiteResult = {
  ospiteId: string
  isNew: boolean
}

/**
 * Crea o aggiorna l'OspiteCRM e collega la prenotazione.
 * - Se esiste per hostId+email: aggiorna solo campi non nulli, incrementa stats
 * - Se non esiste: crea da zero
 * - Setta sempre Prenotazione.ospiteCrmId
 */
export async function syncOspiteCRM(input: SyncOspiteInput): Promise<SyncOspiteResult> {
  const { hostId, guestEmail, guestNome, guestCognome, guestTelefono, guestLingua, prenotazioneId, importo } = input
  const email = guestEmail.trim().toLowerCase()

  const esistente = await prisma.ospiteCRM.findUnique({
    where: { hostId_email: { hostId, email } },
    select: { id: true },
  })

  let ospiteId: string
  let isNew: boolean

  if (esistente) {
    ospiteId = esistente.id
    isNew = false
    await prisma.ospiteCRM.update({
      where: { id: ospiteId },
      data: {
        // Non sovrascriviamo nome/cognome: il CRM è canonico
        ...(guestTelefono ? { telefono: guestTelefono } : {}),
        ...(guestLingua ? { lingua: guestLingua } : {}),
        numSoggiorni: { increment: 1 },
        totaleSpeso: { increment: importo ?? 0 },
        dataUltimoSoggiorno: new Date(),
      },
    })
  } else {
    const nuovo = await prisma.ospiteCRM.create({
      data: {
        hostId,
        email,
        nome: guestNome,
        cognome: guestCognome,
        telefono: guestTelefono ?? null,
        lingua: guestLingua ?? 'it',
        numSoggiorni: 1,
        totaleSpeso: importo ?? 0,
        dataUltimoSoggiorno: new Date(),
      },
      select: { id: true },
    })
    ospiteId = nuovo.id
    isNew = true
  }

  // Collega la prenotazione
  await prisma.prenotazione.update({
    where: { id: prenotazioneId },
    data: { ospiteCrmId: ospiteId },
  })

  return { ospiteId, isNew }
}

// ─── cercaDuplicatiCRM ─────────────────────────────────────────────────────

export type DuplicatoCRM = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  numSoggiorni: number
  motivoSimilitudine: ('email' | 'nome_cognome' | 'telefono')[]
}

/**
 * Cerca possibili duplicati dell'ospite per email simile, nome+cognome simile
 * o telefono uguale. Esclude il record stesso e i record soft-deleted.
 */
export async function cercaDuplicatiCRM(
  hostId: string,
  ospiteId: string,
): Promise<DuplicatoCRM[]> {
  const ospite = await prisma.ospiteCRM.findUnique({
    where: { id: ospiteId },
    select: { email: true, nome: true, cognome: true, telefono: true },
  })
  if (!ospite) return []

  // Prefisso email (tutto prima di @) per match parziale
  const emailPrefix = ospite.email.split('@')[0]

  const candidati = await prisma.ospiteCRM.findMany({
    where: {
      hostId,
      deletedAt: null,
      id: { not: ospiteId },
      OR: [
        { email: { contains: emailPrefix, mode: 'insensitive' } },
        { nome: { equals: ospite.nome, mode: 'insensitive' }, cognome: { equals: ospite.cognome, mode: 'insensitive' } },
        ...(ospite.telefono ? [{ telefono: ospite.telefono }] : []),
      ],
    },
    select: { id: true, nome: true, cognome: true, email: true, telefono: true, numSoggiorni: true },
  })

  return candidati.map(c => {
    const motivi: DuplicatoCRM['motivoSimilitudine'] = []
    if (c.email.includes(emailPrefix)) motivi.push('email')
    if (
      c.nome.toLowerCase() === ospite.nome.toLowerCase() &&
      c.cognome.toLowerCase() === ospite.cognome.toLowerCase()
    ) motivi.push('nome_cognome')
    if (ospite.telefono && c.telefono === ospite.telefono) motivi.push('telefono')
    return { ...c, motivoSimilitudine: motivi }
  })
}

// ─── mergeCRM ──────────────────────────────────────────────────────────────

export type MergeResult = {
  keepId: string
  campiAggiornati: string[]
  relazioniSpostate: { modello: string; count: number }[]
}

/**
 * Unifica mergeId in keepId dentro una singola $transaction.
 * - Somma numSoggiorni e totaleSpeso
 * - Aggiorna dataUltimoSoggiorno con la più recente
 * - Sposta relazioni: Prenotazione, AppuntamentoSpa, ConversazioneWhatsApp
 * - Per MembroFedelta: sposta solo i programmi che keepId non ha già
 * - Soft-delete del record mergeId
 */
export async function mergeCRM(
  hostId: string,
  keepId: string,
  mergeId: string,
  campiDaMerge?: Partial<{ note: string; preferenze: string; tags: string[]; vip: boolean }>,
): Promise<MergeResult> {
  const [keep, merge] = await Promise.all([
    prisma.ospiteCRM.findUniqueOrThrow({
      where: { id: keepId },
      select: { hostId: true, numSoggiorni: true, totaleSpeso: true, dataUltimoSoggiorno: true, membriFedelta: { select: { programmaId: true } } },
    }),
    prisma.ospiteCRM.findUniqueOrThrow({
      where: { id: mergeId },
      select: { hostId: true, numSoggiorni: true, totaleSpeso: true, dataUltimoSoggiorno: true, membriFedelta: { select: { id: true, programmaId: true } } },
    }),
  ])

  if (keep.hostId !== hostId || merge.hostId !== hostId) {
    throw new Error('mergeCRM: ospiti non appartengono allo stesso host')
  }

  const keepProgrammi = new Set(keep.membriFedelta.map(m => m.programmaId))
  const membriDaSpostare = merge.membriFedelta
    .filter(m => !keepProgrammi.has(m.programmaId))
    .map(m => m.id)
  const membriDaEliminare = merge.membriFedelta
    .filter(m => keepProgrammi.has(m.programmaId))
    .map(m => m.id)

  const nuovaDataUltimo = [keep.dataUltimoSoggiorno, merge.dataUltimoSoggiorno]
    .filter(Boolean)
    .reduce((max, d) => (d! > max! ? d : max), null as Date | null)

  const relazioniSpostate: { modello: string; count: number }[] = []
  const campiAggiornati: string[] = ['numSoggiorni', 'totaleSpeso']
  if (nuovaDataUltimo) campiAggiornati.push('dataUltimoSoggiorno')
  if (campiDaMerge) campiAggiornati.push(...Object.keys(campiDaMerge))

  await prisma.$transaction(async (tx) => {
    // Sposta prenotazioni
    const prenRes = await tx.prenotazione.updateMany({
      where: { ospiteCrmId: mergeId },
      data: { ospiteCrmId: keepId },
    })
    relazioniSpostate.push({ modello: 'Prenotazione', count: prenRes.count })

    // Sposta appuntamenti SPA
    const spaRes = await tx.appuntamentoSpa.updateMany({
      where: { ospiteId: mergeId },
      data: { ospiteId: keepId },
    })
    relazioniSpostate.push({ modello: 'AppuntamentoSpa', count: spaRes.count })

    // Sposta conversazioni WhatsApp
    const waRes = await tx.conversazioneWhatsApp.updateMany({
      where: { ospiteCrmId: mergeId },
      data: { ospiteCrmId: keepId },
    })
    relazioniSpostate.push({ modello: 'ConversazioneWhatsApp', count: waRes.count })

    // Sposta memberships fedelta (solo programmi senza conflitto)
    if (membriDaSpostare.length > 0) {
      const fedRes = await tx.membroFedelta.updateMany({
        where: { id: { in: membriDaSpostare } },
        data: { ospiteId: keepId },
      })
      relazioniSpostate.push({ modello: 'MembroFedelta', count: fedRes.count })
    }

    // Elimina memberships duplicate (keepId già ha quel programma)
    if (membriDaEliminare.length > 0) {
      await tx.membroFedelta.deleteMany({ where: { id: { in: membriDaEliminare } } })
    }

    // Aggiorna keepId con stats sommate
    await tx.ospiteCRM.update({
      where: { id: keepId },
      data: {
        numSoggiorni: keep.numSoggiorni + merge.numSoggiorni,
        totaleSpeso: keep.totaleSpeso + merge.totaleSpeso,
        ...(nuovaDataUltimo ? { dataUltimoSoggiorno: nuovaDataUltimo } : {}),
        ...(campiDaMerge ?? {}),
      },
    })

    // Soft-delete mergeId
    await tx.ospiteCRM.update({
      where: { id: mergeId },
      data: { deletedAt: new Date() },
    })
  })

  return { keepId, campiAggiornati, relazioniSpostate }
}
