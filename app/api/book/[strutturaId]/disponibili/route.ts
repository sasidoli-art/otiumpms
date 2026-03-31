import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { calcolaPrezzo } from '@/lib/pricing'

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const params = await paramsPromise
  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const arrivoStr = searchParams.get('arrivo')
  const partenzaStr = searchParams.get('partenza')

  if (!arrivoStr || !partenzaStr) {
    return NextResponse.json({ error: 'Parametri arrivo e partenza obbligatori' }, { status: 400 })
  }

  const arrivo = new Date(arrivoStr)
  const partenza = new Date(partenzaStr)

  if (isNaN(arrivo.getTime()) || isNaN(partenza.getTime()) || partenza <= arrivo) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 })
  }

  // Load units with tariffs, availability, and bookings
  const [unita, regole] = await Promise.all([
    prisma.unitaPrenotabile.findMany({
      where: { strutturaId: params.strutturaId, attiva: true },
      include: {
        tariffe: {
          where: { dataInizio: { lte: partenza }, dataFine: { gte: arrivo } },
          orderBy: { dataInizio: 'asc' },
        },
        disponibilita: {
          where: { data: { gte: arrivo, lt: partenza } },
        },
        prenotazioni: {
          where: {
            stato: { notIn: ['ANNULLATA', 'NO_SHOW'] },
            dataArrivo: { lt: partenza },
            OR: [{ dataPartenza: { gt: arrivo } }, { dataPartenza: null }],
          },
          select: { id: true },
        },
      },
      orderBy: { prezzoBase: 'asc' },
    }),
    // Load automatic tariff rules for this struttura
    prisma.regolaTariffa.findMany({
      where: { strutturaId: params.strutturaId, attiva: true },
      orderBy: [{ priorita: 'desc' }, { createdAt: 'asc' }],
    }),
  ])

  const stanze = unita.map(u => {
    const hasChiusoDay = u.disponibilita.some(d => d.chiuso)
    const hasPrenotazione = u.prenotazioni.length > 0
    const disponibile = !hasChiusoDay && !hasPrenotazione

    // Calculate price using shared pricing engine
    const calc = calcolaPrezzo({
      arrivo,
      partenza,
      prezzoBase: u.prezzoBase,
      unitaId: u.id,
      tariffePeriodo: u.tariffe.map(t => ({
        nome: t.nome,
        colore: t.colore,
        prezzo: t.prezzo,
        dataInizio: t.dataInizio,
        dataFine: t.dataFine,
      })),
      regole: regole.map(r => ({
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
      })),
    })

    return {
      id: u.id,
      nome: u.nome,
      descrizione: u.descrizione,
      capacita: u.capacita,
      prezzoBase: u.prezzoBase,
      prezzoNotte: calc.prezzoMedioNotte,
      prezzoTotale: calc.prezzoTotale,
      notti: calc.notti,
      haRegoleDinamiche: calc.haRegoleDinamiche,
      dettaglioNotti: calc.dettaglioNotti,
      disponibile,
      tariffe: u.tariffe.map(t => ({
        id: t.id, nome: t.nome, prezzo: t.prezzo, colore: t.colore,
        dataInizio: format(new Date(t.dataInizio), 'yyyy-MM-dd'),
        dataFine: format(new Date(t.dataFine), 'yyyy-MM-dd'),
      })),
    }
  })

  return NextResponse.json({
    arrivo: arrivoStr,
    partenza: partenzaStr,
    notti: stanze[0]?.notti ?? 0,
    stanze,
  })
}
