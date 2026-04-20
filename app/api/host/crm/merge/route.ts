import { z } from 'zod'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const mergeSchema = z.object({
  keepId: z.string().min(1),
  mergeId: z.string().min(1),
  // Quali campi conservare dal record da unire (quando nel keep sono vuoti)
  // Se omessi: usa keep, fallback su merge solo se keep e' null/empty
  overrides: z.object({
    nome: z.string().optional(),
    cognome: z.string().optional(),
    email: z.string().email().optional(),
    telefono: z.string().nullable().optional(),
    nazionalita: z.string().nullable().optional(),
    lingua: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    preferenze: z.string().nullable().optional(),
    vip: z.boolean().optional(),
    blacklist: z.boolean().optional(),
    blacklistMotivo: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
})

// POST /api/host/crm/merge — unisce due schede CRM in una
// 1. Sposta i link da mergeId -> keepId (SPA appuntamenti, WhatsApp, loyalty)
// 2. Applica gli override sui campi del keep
// 3. Somma le statistiche (numSoggiorni, totaleSpeso) e prende la data piu recente
// 4. Anonimizza la scheda mergeId (non hard delete: GDPR art.17 + preserva log)
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = mergeSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const { keepId, mergeId, overrides } = parsed.data

  if (keepId === mergeId) {
    return NextResponse.json({ error: 'keepId e mergeId coincidono' }, { status: 400 })
  }

  const [keep, toMerge] = await Promise.all([
    prisma.ospiteCRM.findFirst({ where: { id: keepId, hostId: auth.user.hostId } }),
    prisma.ospiteCRM.findFirst({ where: { id: mergeId, hostId: auth.user.hostId } }),
  ])
  if (!keep || !toMerge) {
    return NextResponse.json({ error: 'Ospite non trovato' }, { status: 404 })
  }

  // Campi finali: override esplicito > keep non vuoto > merge
  const pick = <T,>(ov: T | undefined, a: T, b: T): T => {
    if (ov !== undefined) return ov
    if (a === null || a === '' || a === undefined) return b
    return a
  }

  const nome = pick(overrides?.nome, keep.nome, toMerge.nome)
  const cognome = pick(overrides?.cognome, keep.cognome, toMerge.cognome)
  const email = pick(overrides?.email, keep.email, toMerge.email)
  const telefono = pick(overrides?.telefono, keep.telefono, toMerge.telefono)
  const nazionalita = pick(overrides?.nazionalita, keep.nazionalita, toMerge.nazionalita)
  const lingua = pick(overrides?.lingua, keep.lingua, toMerge.lingua)
  const note = pick(overrides?.note, keep.note, toMerge.note)
  const preferenze = pick(overrides?.preferenze, keep.preferenze, toMerge.preferenze)
  const vip = overrides?.vip ?? (keep.vip || toMerge.vip)
  const blacklist = overrides?.blacklist ?? (keep.blacklist || toMerge.blacklist)
  const blacklistMotivo = pick(overrides?.blacklistMotivo, keep.blacklistMotivo, toMerge.blacklistMotivo)
  const tags = overrides?.tags ?? Array.from(new Set([...(keep.tags ?? []), ...(toMerge.tags ?? [])]))

  // Statistiche aggregate
  const numSoggiorni = keep.numSoggiorni + toMerge.numSoggiorni
  const totaleSpeso = Math.round((keep.totaleSpeso + toMerge.totaleSpeso) * 100) / 100
  const dataUltimoSoggiorno = [keep.dataUltimoSoggiorno, toMerge.dataUltimoSoggiorno]
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null

  // Se l'email del keep cambia, assicurati che non collida con altri record
  if (email !== keep.email) {
    const exists = await prisma.ospiteCRM.findFirst({
      where: { hostId: auth.user.hostId, email, id: { not: keep.id } },
    })
    if (exists && exists.id !== toMerge.id) {
      return NextResponse.json(
        { error: `Email ${email} gia usata da un altro contatto CRM` },
        { status: 409 },
      )
    }
  }

  // Transazione: sposta link + aggiorna keep + anonimizza merge
  const anonEmail = `merged-${toMerge.id.slice(0, 8)}@removed.local`

  const result = await prisma.$transaction(async (tx) => {
    // 1. SPA appuntamenti
    const spa = await tx.appuntamentoSpa.updateMany({
      where: { ospiteId: toMerge.id },
      data: { ospiteId: keep.id },
    })

    // 2. WhatsApp conversazioni
    const wa = await tx.conversazioneWhatsApp.updateMany({
      where: { ospiteCrmId: toMerge.id },
      data: { ospiteCrmId: keep.id },
    })

    // 3. Loyalty: piu delicato per unique(programmaId, ospiteId)
    // Prendi i membri di toMerge e, per ogni programma, unisci i punti nel membro
    // keep corrispondente (se esiste) oppure trasferisci il membro.
    const membriMerge = await tx.membroFedelta.findMany({
      where: { ospiteId: toMerge.id },
    })
    let loyaltyTrasferiti = 0
    let loyaltyUniti = 0
    for (const m of membriMerge) {
      const esistente = await tx.membroFedelta.findUnique({
        where: { programmaId_ospiteId: { programmaId: m.programmaId, ospiteId: keep.id } },
      })
      if (esistente) {
        // Unisci: somma punti, aggiorna ultimaAttivita, sposta movimenti
        await tx.movimentoPunti.updateMany({
          where: { membroId: m.id },
          data: { membroId: esistente.id },
        })
        await tx.membroFedelta.update({
          where: { id: esistente.id },
          data: {
            puntiAccumulati: esistente.puntiAccumulati + m.puntiAccumulati,
            puntiUtilizzati: esistente.puntiUtilizzati + m.puntiUtilizzati,
            ultimaAttivita: [esistente.ultimaAttivita, m.ultimaAttivita]
              .filter((d): d is Date => d !== null)
              .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
          },
        })
        await tx.membroFedelta.delete({ where: { id: m.id } })
        loyaltyUniti++
      } else {
        await tx.membroFedelta.update({
          where: { id: m.id },
          data: { ospiteId: keep.id },
        })
        loyaltyTrasferiti++
      }
    }

    // 4. Aggiorna keep
    const aggiornato = await tx.ospiteCRM.update({
      where: { id: keep.id },
      data: {
        nome, cognome, email, telefono, nazionalita, lingua,
        note, preferenze, vip, blacklist, blacklistMotivo, tags,
        numSoggiorni, totaleSpeso, dataUltimoSoggiorno,
        // SPA: unisci preferenze se il keep non le ha
        spaAllergie: keep.spaAllergie ?? toMerge.spaAllergie,
        spaNote: keep.spaNote ?? toMerge.spaNote,
        spaTrattamentiPreferiti: Array.from(new Set([
          ...(keep.spaTrattamentiPreferiti ?? []),
          ...(toMerge.spaTrattamentiPreferiti ?? []),
        ])),
        spaPreferenzeTerapistaId: keep.spaPreferenzeTerapistaId ?? toMerge.spaPreferenzeTerapistaId,
      },
    })

    // 5. Anonimizza la scheda unita (non hard delete)
    await tx.ospiteCRM.update({
      where: { id: toMerge.id },
      data: {
        nome: 'Unito', cognome: `in ${keep.id.slice(0, 6)}`,
        email: anonEmail, telefono: null, nazionalita: null,
        note: null, preferenze: null, tags: [],
        vip: false, blacklist: false, blacklistMotivo: null,
        numSoggiorni: 0, totaleSpeso: 0, dataUltimoSoggiorno: null,
        spaAllergie: null, spaNote: null, spaTrattamentiPreferiti: [],
        spaPreferenzeTerapistaId: null,
      },
    })

    return {
      aggiornato,
      spaSpostati: spa.count,
      waSpostati: wa.count,
      loyaltyTrasferiti,
      loyaltyUniti,
    }
  })

  await auditFromAuth(auth, {
    azione: 'ospite_crm.unito',
    entita: 'ospiteCRM',
    entitaId: keep.id,
    dettagli: `Scheda ${toMerge.email} unita in ${keep.email}. SPA: ${result.spaSpostati}, WA: ${result.waSpostati}, Loyalty trasferiti: ${result.loyaltyTrasferiti}, uniti: ${result.loyaltyUniti}`,
  })

  return NextResponse.json({
    ok: true,
    ospite: result.aggiornato,
    statistiche: {
      spaSpostati: result.spaSpostati,
      whatsappSpostati: result.waSpostati,
      loyaltyTrasferiti: result.loyaltyTrasferiti,
      loyaltyUniti: result.loyaltyUniti,
    },
  })
}
