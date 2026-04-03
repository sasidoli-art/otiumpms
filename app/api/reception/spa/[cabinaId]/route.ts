import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/reception/spa/[cabinaId]
 * Endpoint PUBBLICO — usato dal tablet in cabina SPA.
 * Ritorna il prossimo appuntamento e la scheda ospite completa.
 */
export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ cabinaId: string }> }) {
  const { cabinaId } = await paramsPromise

  const cabina = await prisma.cabinaSpa.findUnique({
    where: { id: cabinaId },
    select: {
      id: true, nome: true, colore: true, fotoSfondo: true, minutiPreAttivazione: true,
      host: { select: { nomeAzienda: true, logo: true } },
    },
  })

  if (!cabina) return NextResponse.json({ error: 'Cabina non trovata' }, { status: 404 })

  const now = new Date()
  const preActivation = new Date(now.getTime() + (cabina.minutiPreAttivazione ?? 10) * 60 * 1000)
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)

  // Cerca prossimo appuntamento per questa cabina (da adesso + pre-attivazione fino a fine giornata)
  const appuntamento = await prisma.appuntamentoSpa.findFirst({
    where: {
      cabinaId,
      stato: { in: ['CONFERMATO', 'PRENOTATO'] },
      dataOra: { lte: preActivation, gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // max 2h nel passato (in corso)
    },
    orderBy: { dataOra: 'asc' },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      guestTelefono: true,
      dataOra: true,
      durata: true,
      prezzoTotale: true,
      note: true,
      stato: true,
      trattamento: { select: { nome: true, descrizione: true, durata: true, categoria: true } },
      percorso: { select: { nome: true, descrizione: true } },
      terapista: { select: { nome: true } },
      waiver: {
        select: {
          zoneTrattate: true, zoneEvitare: true,
          incinta: true, incintaMesi: true,
          condizioni: true, condizioneAltro: true,
          allergieSelezionate: true, allergieAltro: true,
          allergie: true, patologie: true, farmaci: true,
          pressioneMassaggio: true, temperaturaPreferita: true,
          musicaPreferita: true, aromiPreferiti: true, notePreferenze: true,
          firmaBase64: true, confermato: true,
        },
      },
      ospite: { select: { id: true, nome: true, cognome: true, lingua: true, note: true } },
      prenotazione: { select: { id: true, guestLingua: true, unita: { select: { nome: true } } } },
    },
  })

  // Se nessun appuntamento prossimo → idle
  if (!appuntamento) {
    // Cerca prossimo della giornata per mostrare countdown
    const prossimo = await prisma.appuntamentoSpa.findFirst({
      where: { cabinaId, stato: { in: ['CONFERMATO', 'PRENOTATO'] }, dataOra: { gt: now, lte: endOfDay } },
      orderBy: { dataOra: 'asc' },
      select: { dataOra: true, guestNome: true, trattamento: { select: { nome: true } } },
    })

    return NextResponse.json({
      stato: 'idle',
      cabina: { nome: cabina.nome, colore: cabina.colore, fotoSfondo: cabina.fotoSfondo, hostNome: cabina.host.nomeAzienda, hostLogo: cabina.host.logo },
      prossimo: prossimo ? {
        dataOra: prossimo.dataOra,
        guestNome: prossimo.guestNome,
        trattamento: prossimo.trattamento?.nome ?? null,
      } : null,
    })
  }

  // Cerca storico ospite (repeater)
  let storico: { trattamento: string; data: string; note: string | null }[] = []
  let visitePrecedenti = 0
  if (appuntamento.guestEmail) {
    const precedenti = await prisma.appuntamentoSpa.findMany({
      where: {
        guestEmail: appuntamento.guestEmail,
        stato: 'COMPLETATO',
        id: { not: appuntamento.id },
      },
      orderBy: { dataOra: 'desc' },
      take: 10,
      select: {
        dataOra: true,
        note: true,
        trattamento: { select: { nome: true } },
      },
    })
    visitePrecedenti = precedenti.length
    storico = precedenti.map(p => ({
      trattamento: p.trattamento?.nome ?? 'Trattamento',
      data: p.dataOra.toISOString(),
      note: p.note,
    }))
  }

  const servizioNome = appuntamento.trattamento?.nome ?? appuntamento.percorso?.nome ?? 'Trattamento'
  const lingua = appuntamento.prenotazione?.guestLingua ?? appuntamento.ospite?.lingua ?? 'it'

  return NextResponse.json({
    stato: 'attivo',
    cabina: { nome: cabina.nome, colore: cabina.colore, fotoSfondo: cabina.fotoSfondo, hostNome: cabina.host.nomeAzienda, hostLogo: cabina.host.logo },
    appuntamento: {
      id: appuntamento.id,
      guestNome: `${appuntamento.guestNome} ${appuntamento.guestCognome ?? ''}`.trim(),
      lingua,
      dataOra: appuntamento.dataOra,
      durata: appuntamento.durata,
      servizio: servizioNome,
      servizioDescrizione: appuntamento.trattamento?.descrizione ?? appuntamento.percorso?.descrizione ?? null,
      terapista: appuntamento.terapista?.nome ?? null,
      note: appuntamento.note,
      camera: appuntamento.prenotazione?.unita?.nome ?? null,
      repeater: visitePrecedenti > 0,
      visitePrecedenti,
      storico,
      waiver: appuntamento.waiver ? {
        firmato: appuntamento.waiver.confermato,
        zoneTrattate: appuntamento.waiver.zoneTrattate,
        zoneEvitare: appuntamento.waiver.zoneEvitare,
        incinta: appuntamento.waiver.incinta,
        incintaMesi: appuntamento.waiver.incintaMesi,
        condizioni: appuntamento.waiver.condizioni,
        allergie: [...(appuntamento.waiver.allergieSelezionate ?? []), appuntamento.waiver.allergieAltro].filter(Boolean),
        patologie: appuntamento.waiver.patologie,
        farmaci: appuntamento.waiver.farmaci,
        pressione: appuntamento.waiver.pressioneMassaggio,
        temperatura: appuntamento.waiver.temperaturaPreferita,
        musica: appuntamento.waiver.musicaPreferita,
        aromi: appuntamento.waiver.aromiPreferiti,
        notePreferenze: appuntamento.waiver.notePreferenze,
      } : null,
    },
  })
}
