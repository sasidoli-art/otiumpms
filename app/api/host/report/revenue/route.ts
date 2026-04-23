import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import {
  startOfMonth, addDays, startOfDay, format,
  differenceInCalendarDays,
} from 'date-fns'

/**
 * GET /api/host/report/revenue
 *
 * Report revenue dettagliato per il commercialista.
 * Include: revenue camere (prorata), SPA, POS, F&B (da VocePOS/AddebitoPrenotazione),
 * tassa soggiorno. Tab 1 + Tab 2 del report frontend.
 *
 * Query:
 *   da=YYYY-MM-DD             (default: primo del mese)
 *   a=YYYY-MM-DD              (default: oggi)
 *   granularita=giorno|mese   (default: giorno)
 *   strutturaId=xxx           (opzionale)
 *   view=periodo|camera       (default: periodo)
 */

type Granularita = 'giorno' | 'mese'
type Vista = 'periodo' | 'camera'

function bucketKey(d: Date, g: Granularita): string {
  return g === 'giorno' ? format(d, 'yyyy-MM-dd') : format(startOfMonth(d), 'yyyy-MM')
}

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin(req.nextUrl.searchParams)
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const sp = req.nextUrl.searchParams
  const oggi = startOfDay(new Date())
  const inizio = sp.get('da') ? startOfDay(new Date(sp.get('da')!)) : startOfMonth(oggi)
  const fine = sp.get('a') ? addDays(startOfDay(new Date(sp.get('a')!)), 1) : addDays(oggi, 1)
  if (isNaN(inizio.getTime()) || isNaN(fine.getTime()) || fine <= inizio) {
    return NextResponse.json({ error: 'Range non valido' }, { status: 400 })
  }
  const granularita = (sp.get('granularita') ?? 'giorno') as Granularita
  const vista = (sp.get('view') ?? 'periodo') as Vista
  const strutturaId = sp.get('strutturaId') || undefined

  const wherePrenBase = {
    hostId,
    deletedAt: null,
    stato: { in: ['CONFERMATA', 'COMPLETATA'] as Array<'CONFERMATA' | 'COMPLETATA'> },
    ...(strutturaId ? { strutturaId } : {}),
  }

  // ─── Prenotazioni che toccano il periodo ────────────────────────────────
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      ...wherePrenBase,
      dataArrivo: { lt: fine },
      OR: [
        { dataPartenza: null, dataArrivo: { gte: inizio } },
        { dataPartenza: { gt: inizio } },
      ],
    },
    select: {
      id: true,
      strutturaId: true,
      unitaId: true,
      dataArrivo: true,
      dataPartenza: true,
      prezzoTotale: true,
      tassaSoggiorno: true,
      numOspiti: true,
      unita: { select: { id: true, nome: true } },
    },
  })

  // ─── SPA pagamenti (data riscossione) ──────────────────────────────────
  const spaPagamenti = await prisma.pagamentoSpa.findMany({
    where: {
      stato: 'RISCOSSO',
      dataRiscossione: { gte: inizio, lt: fine },
      appuntamento: { hostId },
    },
    select: {
      importo: true,
      dataRiscossione: true,
    },
  })

  // ─── POS transazioni ───────────────────────────────────────────────────
  const posTransazioni = await prisma.transazionePOS.findMany({
    where: {
      hostId,
      stato: 'COMPLETATA',
      createdAt: { gte: inizio, lt: fine },
      ...(strutturaId
        ? { prenotazione: { strutturaId } }
        : {}),
    },
    select: {
      createdAt: true,
      totale: true,
      voci: { select: { tipo: true, prezzoUnitario: true, quantita: true, totale: true } },
    },
  })

  // ─── Pasti (F&B) addebitati via AddebitoPrenotazione ───────────────────
  // Usiamo categoria "food" / "pasto" + descrizioni tipiche o serviziId nullo con testo
  const addebitiFB = await prisma.addebitoPrenotazione.findMany({
    where: {
      data: { gte: inizio, lt: fine },
      prenotazione: {
        hostId,
        ...(strutturaId ? { strutturaId } : {}),
      },
      OR: [
        { descrizione: { contains: 'past', mode: 'insensitive' } },
        { descrizione: { contains: 'colazione', mode: 'insensitive' } },
        { descrizione: { contains: 'pranzo', mode: 'insensitive' } },
        { descrizione: { contains: 'cena', mode: 'insensitive' } },
        { descrizione: { contains: 'bar', mode: 'insensitive' } },
        { addebitatoDa: { contains: 'ristorant', mode: 'insensitive' } },
      ],
    },
    select: { data: true, totale: true },
  })

  // ────────────────────────────────────────────────────────────────────────
  // Prorata prenotazione per-notte sul periodo
  // ────────────────────────────────────────────────────────────────────────

  type Bucket = {
    prenotazioni: number
    notti: number
    revenueCamere: number
    revenueSpa: number
    revenuePOS: number
    revenueFB: number
    tassaSoggiorno: number
  }
  const buckets = new Map<string, Bucket>()
  const ensure = (k: string): Bucket => {
    const cur = buckets.get(k) ?? {
      prenotazioni: 0, notti: 0,
      revenueCamere: 0, revenueSpa: 0, revenuePOS: 0, revenueFB: 0,
      tassaSoggiorno: 0,
    }
    buckets.set(k, cur)
    return cur
  }

  type BucketCamera = {
    unitaNome: string
    notti: number
    revenue: number
  }
  const perCamera = new Map<string, BucketCamera>()

  for (const p of prenotazioni) {
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(arrivo, 1)
    const nottiTot = Math.max(1, differenceInCalendarDays(partenza, arrivo))
    const prezzoPerNotte = (p.prezzoTotale ?? 0) / nottiTot
    const tassaPerNotte = (p.tassaSoggiorno ?? 0) * (p.numOspiti ?? 1)

    const soggiornoInizio = arrivo < inizio ? inizio : arrivo
    const soggiornoFine = partenza > fine ? fine : partenza

    let contata = false
    for (let d = new Date(soggiornoInizio); d < soggiornoFine; d = addDays(d, 1)) {
      const k = bucketKey(d, granularita)
      const b = ensure(k)
      b.notti += 1
      b.revenueCamere += prezzoPerNotte
      b.tassaSoggiorno += tassaPerNotte
      if (!contata) { b.prenotazioni += 1; contata = true }
    }

    // Aggregazione camera (per vista 2)
    if (p.unita) {
      const nottiNelRange = differenceInCalendarDays(soggiornoFine, soggiornoInizio)
      if (nottiNelRange > 0) {
        const cur = perCamera.get(p.unita.id) ?? { unitaNome: p.unita.nome, notti: 0, revenue: 0 }
        cur.notti += nottiNelRange
        cur.revenue += prezzoPerNotte * nottiNelRange
        perCamera.set(p.unita.id, cur)
      }
    }
  }

  // SPA → bucket per data riscossione
  for (const s of spaPagamenti) {
    if (!s.dataRiscossione) continue
    const k = bucketKey(new Date(s.dataRiscossione), granularita)
    ensure(k).revenueSpa += s.importo
  }

  // POS → bucket per data creazione
  // Se una transazione ha voci SPA o cibo, potremmo scorporarle, ma tipicamente TipoVocePOS è per prodotto.
  // Per semplicità: totale transazione → POS. Le pastiprenotazioni verranno via addebitiFB.
  for (const t of posTransazioni) {
    const k = bucketKey(new Date(t.createdAt), granularita)
    ensure(k).revenuePOS += t.totale
  }

  // F&B da addebiti
  for (const a of addebitiFB) {
    const k = bucketKey(new Date(a.data), granularita)
    ensure(k).revenueFB += a.totale
  }

  // ─── Costruisci righe ordinate ─────────────────────────────────────────
  const keys: string[] = []
  {
    const seen = new Set<string>()
    for (let d = new Date(inizio); d < fine; d = addDays(d, 1)) {
      const k = bucketKey(d, granularita)
      if (!seen.has(k)) { seen.add(k); keys.push(k) }
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100
  const righe = keys.map((k) => {
    const b = buckets.get(k) ?? {
      prenotazioni: 0, notti: 0, revenueCamere: 0,
      revenueSpa: 0, revenuePOS: 0, revenueFB: 0, tassaSoggiorno: 0,
    }
    return {
      periodo: k,
      prenotazioni: b.prenotazioni,
      notti: b.notti,
      revenueCamere: round2(b.revenueCamere),
      revenueSpa: round2(b.revenueSpa),
      revenuePOS: round2(b.revenuePOS),
      revenueFB: round2(b.revenueFB),
      tassaSoggiorno: round2(b.tassaSoggiorno),
      totale: round2(
        b.revenueCamere + b.revenueSpa + b.revenuePOS + b.revenueFB + b.tassaSoggiorno,
      ),
    }
  })

  const totali = righe.reduce(
    (acc, r) => ({
      prenotazioni: acc.prenotazioni + r.prenotazioni,
      notti: acc.notti + r.notti,
      revenueCamere: acc.revenueCamere + r.revenueCamere,
      revenueSpa: acc.revenueSpa + r.revenueSpa,
      revenuePOS: acc.revenuePOS + r.revenuePOS,
      revenueFB: acc.revenueFB + r.revenueFB,
      tassaSoggiorno: acc.tassaSoggiorno + r.tassaSoggiorno,
      totale: acc.totale + r.totale,
    }),
    { prenotazioni: 0, notti: 0, revenueCamere: 0, revenueSpa: 0, revenuePOS: 0, revenueFB: 0, tassaSoggiorno: 0, totale: 0 },
  )

  // ─── Vista "camera" ────────────────────────────────────────────────────
  const giorniPeriodo = differenceInCalendarDays(fine, inizio)
  const camere = Array.from(perCamera.values())
    .map((c) => {
      const occupazione = giorniPeriodo > 0 ? (c.notti / giorniPeriodo) * 100 : 0
      const adr = c.notti > 0 ? c.revenue / c.notti : 0
      const revpar = giorniPeriodo > 0 ? c.revenue / giorniPeriodo : 0
      return {
        unitaNome: c.unitaNome,
        notti: c.notti,
        occupazione: Math.round(occupazione * 10) / 10,
        revenue: round2(c.revenue),
        adr: round2(adr),
        revpar: round2(revpar),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json(
    {
      periodo: {
        da: format(inizio, 'yyyy-MM-dd'),
        a: format(addDays(fine, -1), 'yyyy-MM-dd'),
        giorni: giorniPeriodo,
        granularita,
        vista,
      },
      righe,
      totali: {
        ...totali,
        revenueCamere: round2(totali.revenueCamere),
        revenueSpa: round2(totali.revenueSpa),
        revenuePOS: round2(totali.revenuePOS),
        revenueFB: round2(totali.revenueFB),
        tassaSoggiorno: round2(totali.tassaSoggiorno),
        totale: round2(totali.totale),
      },
      camere,
    },
    { headers: { 'Cache-Control': 'private, max-age=180' } },
  )
}

