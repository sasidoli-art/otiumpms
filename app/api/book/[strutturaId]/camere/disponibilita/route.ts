import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcolaPrezzo, type RegolaTariffa as PricingRegola } from '@/lib/pricing'
import { calcolaTassaSuggerita } from '@/lib/comuni-tassa-soggiorno'

export const dynamic = 'force-dynamic'

type UnitaDisponibile = {
  unitaId: string
  nome: string
  descrizione: string | null
  immagine: string | null
  capacita: number
  lettiExtra: number
  piano: number | null
  prezzoNotte: number
  prezzoTotale: number
  prezzoLettoExtra: number | null
  tariffaNome: string | null
  scontoApplicato: { regola: string; percentuale?: number; nottiMinime: number } | null
  prezzoTotaleScontato: number | null
  tassaSoggiornoNotte: number | null
}

/**
 * GET /api/book/[strutturaId]/camere/disponibilita
 * Query: ?arrivo=YYYY-MM-DD&partenza=YYYY-MM-DD&adulti=2&bambini=0
 *
 * Per ogni unità della struttura verifica:
 *  - Disponibilita per ogni giorno (postiDisponibili > postiOccupati, !chiuso)
 *  - PrenotazioneCanale (OTA) non sovrapposte
 *  - Prenotazione locali (CONFERMATA/RICHIESTA) non sovrapposte
 *  - capacita + lettiExtra >= adulti + bambini
 *  - Pricing via lib/pricing.ts + regola DURATA se applicabile
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ strutturaId: string }> },
) {
  const { strutturaId } = await params
  const sp = req.nextUrl.searchParams
  const arrivoStr = sp.get('arrivo')
  const partenzaStr = sp.get('partenza')
  const adulti = Math.max(1, parseInt(sp.get('adulti') ?? '1'))
  const bambini = Math.max(0, parseInt(sp.get('bambini') ?? '0'))

  if (!arrivoStr || !partenzaStr) {
    return NextResponse.json({ error: 'arrivo e partenza richiesti' }, { status: 400 })
  }

  const arrivo = parseYMD(arrivoStr)
  const partenza = parseYMD(partenzaStr)
  if (!arrivo || !partenza) {
    return NextResponse.json({ error: 'date non valide' }, { status: 400 })
  }
  const notti = Math.round((partenza.getTime() - arrivo.getTime()) / 86400000)
  if (notti < 1 || notti > 30) {
    return NextResponse.json({ error: 'durata soggiorno non valida (1-30 notti)' }, { status: 400 })
  }
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  if (arrivo < oggi) {
    return NextResponse.json({ error: 'data di arrivo nel passato' }, { status: 400 })
  }

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, attiva: true },
    select: { id: true, citta: true },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  const totOspiti = adulti + bambini

  // Carica unità + tariffe periodo + regole tariffa (struttura o per-unita) + blocchi OTA
  const unita = await prisma.unitaPrenotabile.findMany({
    where: {
      strutturaId,
      attiva: true,
      // Capacità: almeno senza lettiExtra deve poter contenere gli adulti
      // (check fine: capacita+lettiExtra >= totOspiti)
    },
    include: {
      tariffe: {
        where: {
          dataInizio: { lte: partenza },
          dataFine: { gte: arrivo },
        },
      },
      disponibilita: {
        where: { data: { gte: arrivo, lt: partenza } },
      },
      prenotazioni: {
        where: {
          stato: { in: ['CONFERMATA', 'RICHIESTA'] },
          dataArrivo: { lt: partenza },
          OR: [
            { dataPartenza: null, dataArrivo: { gte: arrivo } },
            { dataPartenza: { gt: arrivo } },
          ],
        },
        select: { id: true },
      },
    },
    orderBy: { prezzoBase: 'asc' },
  })

  // Regole tariffa (struttura-wide + unit-specific)
  const regoleDb = await prisma.regolaTariffa.findMany({
    where: { strutturaId, attiva: true },
  })
  const regolePricing: PricingRegola[] = regoleDb
    .filter((r) => r.tipo !== 'DURATA')
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo as 'WEEKEND' | 'STAGIONE' | 'FESTIVO',
      attiva: r.attiva,
      priorita: r.priorita,
      modificatore: r.modificatore as 'PERCENTUALE' | 'FISSO',
      valore: r.valore,
      unitaId: r.unitaId,
      meseInizio: r.meseInizio,
      giornoInizio: r.giornoInizio,
      meseFine: r.meseFine,
      giornoFine: r.giornoFine,
      giorniSettimana: r.giorniSettimana,
    }))

  // Regole DURATA per lo sconto post-calcolo
  const regoleDurata = regoleDb
    .filter((r) => r.tipo === 'DURATA' && r.nottiMinime && r.nottiMinime > 0)
    .sort((a, b) => (b.nottiMinime ?? 0) - (a.nottiMinime ?? 0)) // più lunga prima

  // Tassa soggiorno per notte (media su range)
  const tassaMedia = calcolaTassaSuggerita(struttura.citta ?? undefined, arrivo, partenza)

  const risultati: UnitaDisponibile[] = []

  for (const u of unita) {
    // Capacità insufficiente
    if (u.capacita + u.lettiExtra < totOspiti) continue

    // Check Disponibilita giorno-per-giorno
    const giorniRichiesti = enumDays(arrivo, partenza) // notti (senza checkout day)
    let disponibile = true
    for (const g of giorniRichiesti) {
      const d = u.disponibilita.find((x) => sameDay(x.data, g))
      if (d) {
        if (d.chiuso) { disponibile = false; break }
        if (d.postiOccupati >= d.postiDisponibili) { disponibile = false; break }
      }
      // Se manca il record Disponibilita: per default assumiamo disponibile
      // (l'host non ha fatto override manuale)
    }
    if (!disponibile) continue

    // Check blocchi OTA (qualsiasi canale con unitaId = u.id o unitaId null a livello struttura)
    const canaliRilevanti = await prisma.canaleEsterno.findMany({
      where: { strutturaId, attivo: true, OR: [{ unitaId: u.id }, { unitaId: null }] },
      include: {
        prenotazioniImportate: {
          where: { dataInizio: { lt: partenza }, dataFine: { gt: arrivo } },
          take: 1,
        },
      },
    })
    const haBloccoOta = canaliRilevanti.some((c) => c.prenotazioniImportate.length > 0)
    if (haBloccoOta) continue

    // Check prenotazioni interne sovrapposte (già filtrate, conta)
    if (u.prenotazioni.length > 0) continue

    // Calcola prezzo
    const calc = calcolaPrezzo({
      arrivo,
      partenza,
      prezzoBase: u.prezzoBase,
      unitaId: u.id,
      tariffePeriodo: u.tariffe.map((t) => ({
        nome: t.nome,
        colore: t.colore,
        prezzo: t.prezzo,
        dataInizio: t.dataInizio,
        dataFine: t.dataFine,
      })),
      regole: regolePricing,
    })

    // Applica regola DURATA (sconto) se applicabile
    let prezzoScontato: number | null = null
    let scontoInfo: UnitaDisponibile['scontoApplicato'] = null
    for (const r of regoleDurata) {
      if ((r.nottiMinime ?? 0) <= notti) {
        // Prima regola matchante (più lunga) vince
        let delta: number
        if (r.modificatore === 'PERCENTUALE') {
          delta = -Math.round((calc.prezzoTotale * r.valore) / 100 * 100) / 100
        } else {
          delta = -r.valore
        }
        prezzoScontato = Math.max(0, calc.prezzoTotale + delta)
        scontoInfo = {
          regola: r.nome,
          percentuale: r.modificatore === 'PERCENTUALE' ? r.valore : undefined,
          nottiMinime: r.nottiMinime ?? 0,
        }
        break
      }
    }

    // Nome tariffa (se almeno una notte è in TariffaPeriodo)
    const tariffaNome = calc.dettaglioNotti.find((d) => d.tariffaPeriodo)?.tariffaPeriodo?.nome ?? null

    risultati.push({
      unitaId: u.id,
      nome: u.nome,
      descrizione: u.descrizione,
      immagine: u.immagine,
      capacita: u.capacita,
      lettiExtra: u.lettiExtra,
      piano: u.piano,
      prezzoNotte: calc.prezzoMedioNotte,
      prezzoTotale: calc.prezzoTotale,
      prezzoLettoExtra: u.prezzoLettoExtra,
      tariffaNome,
      scontoApplicato: scontoInfo,
      prezzoTotaleScontato: prezzoScontato,
      tassaSoggiornoNotte: tassaMedia,
    })
  }

  return NextResponse.json({
    arrivo: arrivoStr,
    partenza: partenzaStr,
    notti,
    adulti,
    bambini,
    unita: risultati,
  })
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function parseYMD(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  if (isNaN(d.getTime())) return null
  return d
}

function enumDays(start: Date, endExcl: Date): Date[] {
  const out: Date[] = []
  const d = new Date(start)
  d.setHours(0, 0, 0, 0)
  while (d < endExcl) {
    out.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
