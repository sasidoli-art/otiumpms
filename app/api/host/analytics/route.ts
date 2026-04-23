import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import {
  differenceInCalendarDays, startOfDay, startOfMonth,
  startOfISOWeek, format, addDays, subDays,
} from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * GET /api/host/analytics
 *
 * Business performance analytics: KPI (Revenue, Occupazione, ADR, RevPAR, LoS),
 * serie temporali, distribuzione canali, top camere, dettaglio mensile.
 *
 * Query:
 *   da=YYYY-MM-DD           inizio periodo (default: primo del mese corrente)
 *   a=YYYY-MM-DD            fine periodo (default: oggi)
 *   strutturaId=xxx         filtra su una sola struttura
 *   granularita=giorno|settimana|mese (default auto: <=40gg=giorno, <=180gg=settimana, else=mese)
 *   confronto=true|false    include dati periodo precedente (default true)
 */

type Granularita = 'giorno' | 'settimana' | 'mese'

type PrenotazioneCompatta = {
  id: string
  unitaId: string | null
  strutturaId: string | null
  dataArrivo: Date
  dataPartenza: Date | null
  prezzoTotale: number | null
  fonte: string | null
  unita: { id: string; nome: string } | null
}

function bucketKey(d: Date, g: Granularita): string {
  if (g === 'giorno') return format(d, 'yyyy-MM-dd')
  if (g === 'settimana') return format(startOfISOWeek(d), "yyyy-'W'II")
  return format(startOfMonth(d), 'yyyy-MM')
}

function bucketLabel(key: string, g: Granularita): string {
  if (g === 'giorno') {
    const d = new Date(key)
    return format(d, 'd MMM', { locale: it })
  }
  if (g === 'settimana') {
    const [anno, week] = key.split('-W')
    return `S${week} ${anno}`
  }
  const [anno, mese] = key.split('-')
  return format(new Date(Number(anno), Number(mese) - 1, 1), 'MMM yyyy', { locale: it })
}

function autoGranularita(giorni: number): Granularita {
  if (giorni <= 40) return 'giorno'
  if (giorni <= 180) return 'settimana'
  return 'mese'
}

/**
 * Per ogni prenotazione, ripartisci il prezzoTotale sulle notti cadute nel range,
 * e distribuisci le notti sui bucket (giorno/settimana/mese).
 */
function accumulaSuBucket(
  prenotazioni: PrenotazioneCompatta[],
  inizio: Date,
  fine: Date, // esclusivo
  g: Granularita,
): Map<string, { revenue: number; notti: number; prenotazioni: number }> {
  const buckets = new Map<string, { revenue: number; notti: number; prenotazioni: number }>()

  for (const p of prenotazioni) {
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(arrivo, 1)
    const nottiTotali = Math.max(1, differenceInCalendarDays(partenza, arrivo))
    const prezzoPerNotte = (p.prezzoTotale ?? 0) / nottiTotali

    const soggiornoInizio = arrivo < inizio ? inizio : arrivo
    const soggiornoFine = partenza > fine ? fine : partenza

    let contatoComePrenotazione = false
    for (let d = new Date(soggiornoInizio); d < soggiornoFine; d = addDays(d, 1)) {
      const key = bucketKey(d, g)
      const cur = buckets.get(key) ?? { revenue: 0, notti: 0, prenotazioni: 0 }
      cur.revenue += prezzoPerNotte
      cur.notti += 1
      if (!contatoComePrenotazione) {
        cur.prenotazioni += 1
        contatoComePrenotazione = true
      }
      buckets.set(key, cur)
    }
  }

  return buckets
}

/**
 * Calcola notti totali per unità dall'insieme di prenotazioni.
 */
function aggregaPerUnita(prenotazioni: PrenotazioneCompatta[], inizio: Date, fine: Date) {
  const perUnita = new Map<string, { nome: string; notti: number; revenue: number }>()
  for (const p of prenotazioni) {
    if (!p.unita) continue
    const arrivo = startOfDay(new Date(p.dataArrivo))
    const partenza = p.dataPartenza ? startOfDay(new Date(p.dataPartenza)) : addDays(arrivo, 1)
    const nottiTotali = Math.max(1, differenceInCalendarDays(partenza, arrivo))
    const prezzoPerNotte = (p.prezzoTotale ?? 0) / nottiTotali

    const soggiornoInizio = arrivo < inizio ? inizio : arrivo
    const soggiornoFine = partenza > fine ? fine : partenza
    const nottiNelRange = Math.max(0, differenceInCalendarDays(soggiornoFine, soggiornoInizio))
    if (nottiNelRange === 0) continue

    const cur = perUnita.get(p.unita.id) ?? { nome: p.unita.nome, notti: 0, revenue: 0 }
    cur.notti += nottiNelRange
    cur.revenue += prezzoPerNotte * nottiNelRange
    perUnita.set(p.unita.id, cur)
  }
  return perUnita
}

/**
 * Normalizza la fonte in categoria canale.
 */
function normalizzaCanale(fonte: string | null): string {
  if (!fonte) return 'Diretto'
  const f = fonte.toLowerCase()
  if (f.includes('booking')) return 'Booking.com'
  if (f.includes('airbnb')) return 'Airbnb'
  if (f.includes('vrbo') || f.includes('homeaway')) return 'VRBO'
  if (f.includes('expedia')) return 'Expedia'
  if (f === 'diretto' || f === 'web' || f === 'tel' || f === 'email') return 'Diretto'
  return 'Altro'
}

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin(req.nextUrl.searchParams)
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const sp = req.nextUrl.searchParams
  const daStr = sp.get('da')
  const aStr = sp.get('a')
  const strutturaId = sp.get('strutturaId') || undefined
  const granParam = sp.get('granularita') as Granularita | null
  const confronto = (sp.get('confronto') ?? 'true') !== 'false'

  const oggi = startOfDay(new Date())
  const inizio = daStr ? startOfDay(new Date(daStr)) : startOfMonth(oggi)
  const fine = aStr ? addDays(startOfDay(new Date(aStr)), 1) : addDays(oggi, 1) // fine esclusivo
  if (isNaN(inizio.getTime()) || isNaN(fine.getTime()) || fine <= inizio) {
    return NextResponse.json({ error: 'Range date non valido' }, { status: 400 })
  }

  const giorniPeriodo = differenceInCalendarDays(fine, inizio)
  const granularita: Granularita = granParam ?? autoGranularita(giorniPeriodo)

  // Periodo precedente (stessa lunghezza, subito prima)
  const finePrec = inizio
  const inizioPrec = subDays(inizio, giorniPeriodo)

  // ─── Unità totali per calcolo occupazione ───────────────────────────────
  const unitaWhere: {
    attiva: boolean
    struttura: { hostId: string; id?: string }
  } = {
    attiva: true,
    struttura: { hostId },
  }
  if (strutturaId) unitaWhere.struttura.id = strutturaId
  const unitaTotali = await prisma.unitaPrenotabile.count({ where: unitaWhere })

  // ─── Fetch prenotazioni periodo ─────────────────────────────────────────
  const selectPren = {
    id: true,
    unitaId: true,
    strutturaId: true,
    dataArrivo: true,
    dataPartenza: true,
    prezzoTotale: true,
    fonte: true,
    unita: { select: { id: true, nome: true } },
  } as const

  const whereBase = {
    hostId,
    deletedAt: null,
    stato: { in: ['CONFERMATA', 'COMPLETATA'] as Array<'CONFERMATA' | 'COMPLETATA'> },
    ...(strutturaId ? { strutturaId } : {}),
  }

  const prenPeriodo: PrenotazioneCompatta[] = await prisma.prenotazione.findMany({
    where: {
      ...whereBase,
      dataArrivo: { lt: fine },
      OR: [
        { dataPartenza: null, dataArrivo: { gte: inizio } },
        { dataPartenza: { gt: inizio } },
      ],
    },
    select: selectPren,
  })

  const prenPrec: PrenotazioneCompatta[] = confronto
    ? await prisma.prenotazione.findMany({
        where: {
          ...whereBase,
          dataArrivo: { lt: finePrec },
          OR: [
            { dataPartenza: null, dataArrivo: { gte: inizioPrec } },
            { dataPartenza: { gt: inizioPrec } },
          ],
        },
        select: selectPren,
      })
    : []

  // ─── Aggregazione periodo corrente ──────────────────────────────────────
  const bucketsCurrent = accumulaSuBucket(prenPeriodo, inizio, fine, granularita)
  const bucketsPrev = confronto
    ? accumulaSuBucket(prenPrec, inizioPrec, finePrec, granularita)
    : new Map<string, { revenue: number; notti: number; prenotazioni: number }>()

  // Revenue & notti totali
  let revenueTot = 0
  let nottiTot = 0
  for (const v of bucketsCurrent.values()) {
    revenueTot += v.revenue
    nottiTot += v.notti
  }
  let revenuePrev = 0
  let nottiPrev = 0
  for (const v of bucketsPrev.values()) {
    revenuePrev += v.revenue
    nottiPrev += v.notti
  }

  const capacitaTotale = unitaTotali * giorniPeriodo
  const occupazionePct = capacitaTotale > 0 ? (nottiTot / capacitaTotale) * 100 : 0
  const capacitaPrev = unitaTotali * giorniPeriodo
  const occupazionePrevPct = capacitaPrev > 0 ? (nottiPrev / capacitaPrev) * 100 : 0

  const adr = nottiTot > 0 ? revenueTot / nottiTot : 0
  const adrPrev = nottiPrev > 0 ? revenuePrev / nottiPrev : 0
  const revpar = capacitaTotale > 0 ? revenueTot / capacitaTotale : 0
  const revparPrev = capacitaPrev > 0 ? revenuePrev / capacitaPrev : 0

  // Durata media soggiorno (solo prenotazioni che toccano il periodo)
  const totDurata = prenPeriodo.reduce((sum, p) => {
    if (!p.dataPartenza) return sum + 1
    return sum + Math.max(1, differenceInCalendarDays(new Date(p.dataPartenza), new Date(p.dataArrivo)))
  }, 0)
  const durataMedia = prenPeriodo.length > 0 ? totDurata / prenPeriodo.length : 0

  const totDurataPrev = prenPrec.reduce((sum, p) => {
    if (!p.dataPartenza) return sum + 1
    return sum + Math.max(1, differenceInCalendarDays(new Date(p.dataPartenza), new Date(p.dataArrivo)))
  }, 0)
  const durataMediaPrev = prenPrec.length > 0 ? totDurataPrev / prenPrec.length : 0

  const pct = (cur: number, prev: number) => {
    if (prev <= 0) return cur > 0 ? 100 : 0
    return ((cur - prev) / prev) * 100
  }

  // ─── Serie revenue (bucket ordinati) ────────────────────────────────────
  const keysOrdinate: string[] = []
  {
    const seen = new Set<string>()
    for (let d = new Date(inizio); d < fine; d = addDays(d, 1)) {
      const k = bucketKey(d, granularita)
      if (!seen.has(k)) {
        seen.add(k)
        keysOrdinate.push(k)
      }
    }
  }
  const keysPrevOrdinate: string[] = []
  if (confronto) {
    const seen = new Set<string>()
    for (let d = new Date(inizioPrec); d < finePrec; d = addDays(d, 1)) {
      const k = bucketKey(d, granularita)
      if (!seen.has(k)) {
        seen.add(k)
        keysPrevOrdinate.push(k)
      }
    }
  }

  const serieRevenue = keysOrdinate.map((k, i) => ({
    data: k,
    label: bucketLabel(k, granularita),
    valore: Math.round((bucketsCurrent.get(k)?.revenue ?? 0) * 100) / 100,
    valorePrecedente: confronto
      ? Math.round((bucketsPrev.get(keysPrevOrdinate[i] ?? '')?.revenue ?? 0) * 100) / 100
      : undefined,
  }))

  const serieOccupazione = keysOrdinate.map((k) => {
    const b = bucketsCurrent.get(k)
    const notti = b?.notti ?? 0
    // giorni del bucket: se granularità = giorno → 1, altrimenti approssimazione per range
    const giorniBucket =
      granularita === 'giorno' ? 1 : granularita === 'settimana' ? 7 : 30
    const cap = unitaTotali * giorniBucket
    const pctVal = cap > 0 ? (notti / cap) * 100 : 0
    return {
      data: k,
      label: bucketLabel(k, granularita),
      percentuale: Math.round(pctVal * 10) / 10,
    }
  })
  const mediaOccupazione = serieOccupazione.length > 0
    ? serieOccupazione.reduce((s, r) => s + r.percentuale, 0) / serieOccupazione.length
    : 0

  // ─── Distribuzione canali ───────────────────────────────────────────────
  const perCanaleMap = new Map<string, { prenotazioni: number; revenue: number }>()
  for (const p of prenPeriodo) {
    const c = normalizzaCanale(p.fonte ?? null)
    const cur = perCanaleMap.get(c) ?? { prenotazioni: 0, revenue: 0 }
    cur.prenotazioni += 1
    cur.revenue += p.prezzoTotale ?? 0
    perCanaleMap.set(c, cur)
  }
  const totalePrenCanali = Array.from(perCanaleMap.values()).reduce((s, v) => s + v.prenotazioni, 0)
  const perCanale = Array.from(perCanaleMap.entries())
    .map(([canale, v]) => ({
      canale,
      prenotazioni: v.prenotazioni,
      revenue: Math.round(v.revenue * 100) / 100,
      percentuale: totalePrenCanali > 0
        ? Math.round((v.prenotazioni / totalePrenCanali) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.prenotazioni - a.prenotazioni)

  // ─── Top 10 camere ──────────────────────────────────────────────────────
  const perUnitaMap = aggregaPerUnita(prenPeriodo, inizio, fine)
  const topCamere = Array.from(perUnitaMap.values())
    .map((v) => ({
      unitaNome: v.nome,
      notti: v.notti,
      revenue: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.notti - a.notti)
    .slice(0, 10)

  // ─── Dettaglio mensile (sempre per mese, indipendente dalla granularità scelta) ─
  const bucketsMese = accumulaSuBucket(prenPeriodo, inizio, fine, 'mese')
  const mesiOrdinati: string[] = []
  {
    const seen = new Set<string>()
    for (let d = new Date(inizio); d < fine; d = addDays(d, 1)) {
      const k = format(startOfMonth(d), 'yyyy-MM')
      if (!seen.has(k)) {
        seen.add(k)
        mesiOrdinati.push(k)
      }
    }
  }
  const dettaglioMensile = mesiOrdinati.map((k) => {
    const b = bucketsMese.get(k) ?? { revenue: 0, notti: 0, prenotazioni: 0 }
    const [anno, mese] = k.split('-')
    const primoGiornoMese = new Date(Number(anno), Number(mese) - 1, 1)
    const inizioEffettivo = primoGiornoMese < inizio ? inizio : primoGiornoMese
    const primoGiornoMeseSucc = new Date(Number(anno), Number(mese), 1)
    const fineEffettiva = primoGiornoMeseSucc > fine ? fine : primoGiornoMeseSucc
    const giorniMese = differenceInCalendarDays(fineEffettiva, inizioEffettivo)
    const capMese = unitaTotali * giorniMese
    const occupazione = capMese > 0 ? (b.notti / capMese) * 100 : 0
    const adrMese = b.notti > 0 ? b.revenue / b.notti : 0
    const revparMese = capMese > 0 ? b.revenue / capMese : 0
    return {
      mese: k,
      label: bucketLabel(k, 'mese'),
      prenotazioni: b.prenotazioni,
      notti: b.notti,
      revenue: Math.round(b.revenue * 100) / 100,
      occupazione: Math.round(occupazione * 10) / 10,
      adr: Math.round(adrMese * 100) / 100,
      revpar: Math.round(revparMese * 100) / 100,
    }
  })

  const body = {
    periodo: {
      da: format(inizio, 'yyyy-MM-dd'),
      a: format(subDays(fine, 1), 'yyyy-MM-dd'),
      giorni: giorniPeriodo,
      granularita,
      confronto,
    },
    strutturaId: strutturaId ?? null,
    unitaTotali,
    kpi: {
      revenue: Math.round(revenueTot * 100) / 100,
      occupazione: Math.round(occupazionePct * 10) / 10,
      adr: Math.round(adr * 100) / 100,
      revpar: Math.round(revpar * 100) / 100,
      durataMedia: Math.round(durataMedia * 10) / 10,
      prenotazioni: prenPeriodo.length,
      delta: {
        revenue: Math.round(pct(revenueTot, revenuePrev) * 10) / 10,
        occupazione: Math.round(pct(occupazionePct, occupazionePrevPct) * 10) / 10,
        adr: Math.round(pct(adr, adrPrev) * 10) / 10,
        revpar: Math.round(pct(revpar, revparPrev) * 10) / 10,
        durataMedia: Math.round(pct(durataMedia, durataMediaPrev) * 10) / 10,
        prenotazioni: Math.round(pct(prenPeriodo.length, prenPrec.length) * 10) / 10,
      },
      precedente: {
        revenue: Math.round(revenuePrev * 100) / 100,
        occupazione: Math.round(occupazionePrevPct * 10) / 10,
        adr: Math.round(adrPrev * 100) / 100,
        revpar: Math.round(revparPrev * 100) / 100,
        durataMedia: Math.round(durataMediaPrev * 10) / 10,
        prenotazioni: prenPrec.length,
      },
    },
    mediaOccupazione: Math.round(mediaOccupazione * 10) / 10,
    serieRevenue,
    serieOccupazione,
    perCanale,
    topCamere,
    dettaglioMensile,
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, max-age=300' },
  })
}
