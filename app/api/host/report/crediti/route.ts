import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/report/crediti
 * Report crediti scaduti (AR Aging) — 30/60/90+ giorni.
 * Mostra prenotazioni completate con prezzoTotale > acconto versato.
 */
export async function GET(_: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const hostId = auth.user.hostId
  const oggi = new Date()
  const gg30 = new Date(oggi.getTime() - 30 * 86400000)
  const gg60 = new Date(oggi.getTime() - 60 * 86400000)
  const gg90 = new Date(oggi.getTime() - 90 * 86400000)

  // Prenotazioni completate con saldo residuo (prezzoTotale - acconto > 0)
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      prezzoTotale: { gt: 0 },
    },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      dataArrivo: true,
      dataPartenza: true,
      prezzoTotale: true,
      acconto: true,
      stato: true,
      createdAt: true,
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
    },
    orderBy: { dataPartenza: 'asc' },
  })

  const crediti = prenotazioni
    .map(p => {
      const totale = p.prezzoTotale ?? 0
      const acconto = p.acconto ?? 0
      const saldo = Math.round((totale - acconto) * 100) / 100
      if (saldo <= 0) return null

      // Data di riferimento per aging: partenza o creazione
      const dataRif = p.dataPartenza ?? p.createdAt
      const giorniScaduto = Math.floor((oggi.getTime() - new Date(dataRif).getTime()) / 86400000)

      let fascia: 'corrente' | '30gg' | '60gg' | '90gg+'
      if (giorniScaduto < 0) fascia = 'corrente'
      else if (giorniScaduto < 30) fascia = 'corrente'
      else if (giorniScaduto < 60) fascia = '30gg'
      else if (giorniScaduto < 90) fascia = '60gg'
      else fascia = '90gg+'

      return {
        id: p.id,
        ospite: `${p.guestCognome} ${p.guestNome}`,
        email: p.guestEmail,
        telefono: p.guestTelefono,
        struttura: p.struttura?.nome ?? '—',
        unita: p.unita?.nome ?? null,
        dataArrivo: p.dataArrivo,
        dataPartenza: p.dataPartenza,
        totale,
        acconto,
        saldo,
        giorniScaduto: Math.max(0, giorniScaduto),
        fascia,
        stato: p.stato,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  // Aggregazione per fascia
  const aging = {
    corrente: { count: 0, totale: 0 },
    '30gg': { count: 0, totale: 0 },
    '60gg': { count: 0, totale: 0 },
    '90gg+': { count: 0, totale: 0 },
  }

  for (const c of crediti) {
    aging[c.fascia].count++
    aging[c.fascia].totale += c.saldo
  }

  // Round
  for (const k of Object.keys(aging) as Array<keyof typeof aging>) {
    aging[k].totale = Math.round(aging[k].totale * 100) / 100
  }

  const totaleCrediti = crediti.reduce((s, c) => s + c.saldo, 0)

  return NextResponse.json({
    crediti: crediti.sort((a, b) => b.giorniScaduto - a.giorniScaduto),
    aging,
    riepilogo: {
      totaleCrediti: Math.round(totaleCrediti * 100) / 100,
      numCrediti: crediti.length,
      mediaSaldo: crediti.length > 0 ? Math.round((totaleCrediti / crediti.length) * 100) / 100 : 0,
    },
  })
}
