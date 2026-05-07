import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/host/report/statistiche-istat?anno=2026&mese=3
 * Statistiche arrivi per nazionalità/provenienza — formato ISTAT.
 * Utilizzato per la comunicazione periodica alle autorità statistiche.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const sp = req.nextUrl.searchParams
  const anno = parseInt(sp.get('anno') ?? String(new Date().getFullYear()))
  const mese = parseInt(sp.get('mese') ?? String(new Date().getMonth() + 1))

  if (isNaN(anno) || isNaN(mese) || mese < 1 || mese > 12) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const hostId = auth.user.hostId
  const inizio = startOfMonth(new Date(anno, mese - 1, 1))
  const fine = endOfMonth(new Date(anno, mese - 1, 1))

  // Prenotazioni + accompagnatori nel periodo
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId,
      stato: { in: ['CONFERMATA', 'COMPLETATA'] },
      dataArrivo: { gte: inizio, lte: fine },
    },
    select: {
      id: true,
      dataArrivo: true,
      dataPartenza: true,
      numOspiti: true,
      guestNome: true,
      guestCognome: true,
      guestStatoNascitaIstat: true,
      guestCittadinanzaIstat: true,
      guestProvinciaNascita: true,
      struttura: { select: { nome: true } },
      accompagnatori: {
        select: {
          statoNascitaIstat: true,
          cittadinanzaIstat: true,
          provinciaNascita: true,
          nazionalita: true,
        },
      },
    },
    orderBy: { dataArrivo: 'asc' },
  })

  // Mappa codici ISTAT stato → nome (principali)
  const STATI_ISTAT: Record<string, string> = {
    '100000100': 'Italia',
    '100000203': 'Germania',
    '100000208': 'Francia',
    '100000219': 'Regno Unito',
    '100000227': 'Spagna',
    '100000211': 'Paesi Bassi',
    '100000206': 'Austria',
    '100000215': 'Svizzera',
    '100000209': 'Belgio',
    '100000225': 'Polonia',
    '100000229': 'Portogallo',
    '100000220': 'Irlanda',
    '100000210': 'Danimarca',
    '100000226': 'Svezia',
    '100000222': 'Norvegia',
    '100000212': 'Lussemburgo',
    '100000223': 'Finlandia',
    '100000214': 'Grecia',
    '100000404': 'Stati Uniti',
    '100000302': 'Cina',
    '100000303': 'Giappone',
    '100000306': 'India',
    '100000419': 'Brasile',
    '100000407': 'Canada',
    '100000502': 'Australia',
    '100000405': 'Argentina',
    '100000301': 'Russia',
  }

  // Province italiane per provenienza interna
  const perNazionalita: Record<string, { nome: string; arrivi: number; notti: number; ospiti: number }> = {}
  const perProvincia: Record<string, { provincia: string; arrivi: number; notti: number }> = {}

  let totaleArrivi = 0
  let totaleNotti = 0
  let totaleOspiti = 0
  let italiani = 0
  let stranieri = 0

  for (const p of prenotazioni) {
    const notti = p.dataPartenza
      ? Math.max(1, Math.round((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))
      : 1

    // Titolare
    const cittadinanza = p.guestCittadinanzaIstat || p.guestStatoNascitaIstat || '100000100'
    const nomeStato = STATI_ISTAT[cittadinanza] || `Codice ${cittadinanza}`
    const isItaliano = cittadinanza === '100000100'

    if (!perNazionalita[cittadinanza]) {
      perNazionalita[cittadinanza] = { nome: nomeStato, arrivi: 0, notti: 0, ospiti: 0 }
    }
    perNazionalita[cittadinanza].arrivi++
    perNazionalita[cittadinanza].notti += notti
    perNazionalita[cittadinanza].ospiti++
    totaleArrivi++
    totaleNotti += notti
    totaleOspiti++

    if (isItaliano) {
      italiani++
      const prov = p.guestProvinciaNascita || '??'
      if (!perProvincia[prov]) perProvincia[prov] = { provincia: prov, arrivi: 0, notti: 0 }
      perProvincia[prov].arrivi++
      perProvincia[prov].notti += notti
    } else {
      stranieri++
    }

    // Accompagnatori
    for (const a of p.accompagnatori) {
      const accCitt = a.cittadinanzaIstat || a.statoNascitaIstat || '100000100'
      const accNome = STATI_ISTAT[accCitt] || a.nazionalita || `Codice ${accCitt}`
      const accItaliano = accCitt === '100000100'

      if (!perNazionalita[accCitt]) {
        perNazionalita[accCitt] = { nome: accNome, arrivi: 0, notti: 0, ospiti: 0 }
      }
      perNazionalita[accCitt].ospiti++
      perNazionalita[accCitt].notti += notti
      totaleOspiti++

      if (accItaliano) {
        italiani++
        const prov = a.provinciaNascita || '??'
        if (!perProvincia[prov]) perProvincia[prov] = { provincia: prov, arrivi: 0, notti: 0 }
        perProvincia[prov].notti += notti
      } else {
        stranieri++
      }
    }
  }

  return NextResponse.json({
    anno,
    mese,
    riepilogo: {
      totaleArrivi,
      totaleNotti,
      totaleOspiti,
      italiani,
      stranieri,
      percentualeStranieri: totaleOspiti > 0 ? Math.round((stranieri / totaleOspiti) * 1000) / 10 : 0,
    },
    perNazionalita: Object.values(perNazionalita)
      .sort((a, b) => b.ospiti - a.ospiti),
    perProvinciaItalia: Object.values(perProvincia)
      .sort((a, b) => b.arrivi - a.arrivi),
  })
}
