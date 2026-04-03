import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { format, eachDayOfInterval, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { generateContoOspitePdf } from '@/lib/pdf-generator'
import { calcolaPrezzo } from '@/lib/pricing'

/**
 * GET /api/host/prenotazioni/[id]/conto
 * Genera il Conto Ospite PDF con dettaglio notte per notte,
 * tassa di soggiorno e saldo.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const pren = await prisma.prenotazione.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      struttura: { select: { id: true, nome: true, indirizzo: true, citta: true } },
      unita: {
        select: {
          id: true, nome: true, prezzoBase: true,
          tariffe: true,
        },
      },
      host: { select: { nomeAzienda: true, partitaIva: true, telefono: true, indirizzo: true, citta: true } },
    },
  })

  if (!pren) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const fmtDate = (d: Date) => format(new Date(d), 'd MMM yyyy', { locale: it })
  const arrivo = new Date(pren.dataArrivo)
  const partenza = pren.dataPartenza ? new Date(pren.dataPartenza) : new Date(arrivo.getTime() + 86400000)
  const notti = Math.max(1, Math.round((partenza.getTime() - arrivo.getTime()) / 86400000))

  // Costruisci voci dettagliate notte per notte
  const voci: { data: string; descrizione: string; importo: number }[] = []

  if (pren.unita && pren.struttura) {
    // Calcola prezzo per notte con tariffe dinamiche
    const regole = await prisma.regolaTariffa.findMany({
      where: { strutturaId: pren.struttura.id, attiva: true },
    })

    const calc = calcolaPrezzo({
      arrivo,
      partenza,
      prezzoBase: pren.unita.prezzoBase,
      unitaId: pren.unita.id,
      tariffePeriodo: pren.unita.tariffe.map(t => ({
        nome: t.nome,
        colore: t.colore,
        prezzo: t.prezzo,
        dataInizio: t.dataInizio,
        dataFine: t.dataFine,
      })),
      regole: regole.map(r => ({
        id: r.id,
        nome: r.nome,
        tipo: (['WEEKEND', 'STAGIONE', 'FESTIVO', 'DURATA'].includes(r.tipo) ? r.tipo : 'DURATA') as 'WEEKEND' | 'STAGIONE' | 'FESTIVO' | 'DURATA',
        attiva: r.attiva,
        priorita: r.priorita,
        modificatore: (['PERCENTUALE', 'FISSO'].includes(r.modificatore) ? r.modificatore : 'PERCENTUALE') as 'PERCENTUALE' | 'FISSO',
        valore: r.valore,
        unitaId: r.unitaId,
        meseInizio: r.meseInizio,
        giornoInizio: r.giornoInizio,
        meseFine: r.meseFine,
        giornoFine: r.giornoFine,
        giorniSettimana: r.giorniSettimana,
      })),
    })

    if (calc.dettaglioNotti) {
      for (const n of calc.dettaglioNotti) {
        const dataLabel = format(new Date(n.data + 'T12:00'), 'EEE d MMM', { locale: it })
        let desc = `Soggiorno — ${pren.unita.nome}`
        if (n.tariffaPeriodo) desc += ` (${n.tariffaPeriodo.nome})`
        if (n.regoleApplicate?.length > 0) desc += ` [${n.regoleApplicate.map((r: { nome: string }) => r.nome).join(', ')}]`
        voci.push({ data: dataLabel, descrizione: desc, importo: n.prezzoFinale })
      }
    } else {
      // Fallback: prezzo uniforme
      const prezzoNotte = pren.prezzoTotale ? pren.prezzoTotale / notti : pren.unita.prezzoBase
      const giorni = eachDayOfInterval({ start: startOfDay(arrivo), end: startOfDay(new Date(partenza.getTime() - 86400000)) })
      for (const g of giorni) {
        voci.push({
          data: format(g, 'EEE d MMM', { locale: it }),
          descrizione: `Soggiorno — ${pren.unita.nome}`,
          importo: Math.round(prezzoNotte * 100) / 100,
        })
      }
    }
  } else if (pren.prezzoTotale) {
    // Nessuna unità — voce singola
    voci.push({
      data: fmtDate(arrivo),
      descrizione: `Soggiorno ${notti} notti`,
      importo: pren.prezzoTotale,
    })
  }

  const subtotale = voci.reduce((s, v) => s + v.importo, 0)
  const tassaPerNotte = pren.tassaSoggiorno ?? 0
  const tassaTotale = tassaPerNotte > 0 ? tassaPerNotte * notti * pren.numOspiti : 0
  const totale = Math.round((subtotale + tassaTotale) * 100) / 100
  const acconto = pren.acconto ?? 0
  const saldo = Math.round((totale - acconto) * 100) / 100

  try {
    const pdf = await generateContoOspitePdf({
      nomeAzienda: pren.host?.nomeAzienda || 'Struttura',
      strutturaInfo: [pren.struttura?.nome, pren.struttura?.indirizzo, pren.struttura?.citta].filter(Boolean).join(' — '),
      partitaIva: pren.host?.partitaIva || '',
      telefono: pren.host?.telefono || '',
      cognomeNome: `${pren.guestCognome} ${pren.guestNome}`,
      email: pren.guestEmail,
      checkIn: fmtDate(arrivo),
      checkOut: fmtDate(partenza),
      notti,
      unita: pren.unita?.nome || '—',
      voci,
      subtotale: Math.round(subtotale * 100) / 100,
      tassaSoggiorno: tassaTotale > 0 ? Math.round(tassaTotale * 100) / 100 : null,
      tassaSoggiornoDettaglio: tassaPerNotte > 0
        ? `€${tassaPerNotte.toFixed(2)}/notte × ${notti} notti × ${pren.numOspiti} ospiti`
        : null,
      totale,
      acconto,
      saldo,
    })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="conto_${pren.guestCognome}_${pren.guestNome}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Conto ospite PDF error:', err)
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
}
