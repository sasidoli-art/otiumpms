import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/kiosk/spa/[cabinaId] — appuntamenti di oggi per questa cabina
 * Pubblico (il cabinaId è il segreto — il tablet della cabina lo conosce)
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ cabinaId: string }> }
) {
  const { cabinaId } = await params

  const cabina = await prisma.cabinaSpa.findUnique({
    where: { id: cabinaId },
    select: { id: true, nome: true, hostId: true },
  })

  if (!cabina) {
    return NextResponse.json({ error: 'Cabina non trovata' }, { status: 404 })
  }

  // Appuntamenti di oggi per questa cabina
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const domani = new Date(oggi)
  domani.setDate(domani.getDate() + 1)

  const appuntamenti = await prisma.appuntamentoSpa.findMany({
    where: {
      cabinaId,
      dataOra: { gte: oggi, lt: domani },
      stato: { in: ['CONFERMATO', 'PRENOTATO'] },
    },
    include: {
      trattamento: { select: { nome: true, durata: true, categoria: true } },
      terapista: { select: { nome: true, cognome: true } },
      waiver: {
        select: {
          confermato: true,
          incinta: true,
          incintaMesi: true,
          allergie: true,
          patologie: true,
          farmaci: true,
          condizioni: true,
          allergieSelezionate: true,
          zoneTrattate: true,
          zoneEvitare: true,
          pressioneMassaggio: true,
          temperaturaPreferita: true,
          notePreferenze: true,
          firmaBase64: true,
        },
      },
      prenotazione: { select: { id: true, checkInToken: true } },
    },
    orderBy: { dataOra: 'asc' },
  })

  return NextResponse.json({
    cabina: cabina.nome,
    appuntamenti: appuntamenti.map(a => ({
      id: a.id,
      dataOra: a.dataOra.toISOString(),
      durata: a.durata,
      stato: a.stato,
      guestNome: a.guestNome,
      guestCognome: a.guestCognome,
      guestEmail: a.guestEmail,
      guestTelefono: a.guestTelefono,
      trattamento: a.trattamento,
      terapista: a.terapista,
      waiver: a.waiver,
      prenotazione: a.prenotazione,
    })),
  })
}
