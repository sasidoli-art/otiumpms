import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { format } from 'date-fns'

// GET /api/host/prenotazioni/export?formato=csv&stato=CONFERMATA&da=2025-01-01&a=2025-12-31
export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato') || undefined
  const da = searchParams.get('da') || undefined
  const a = searchParams.get('a') || undefined

  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hostId: auth.user.hostId,
      ...(stato ? { stato: stato as never } : {}),
      ...(da || a
        ? {
            dataArrivo: {
              ...(da ? { gte: new Date(da) } : {}),
              ...(a ? { lte: new Date(a) } : {}),
            },
          }
        : {}),
    },
    include: {
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
    },
    orderBy: { dataArrivo: 'asc' },
  })

  // CSV headers
  const headers = [
    'ID', 'Stato', 'Nome', 'Cognome', 'Email', 'Telefono',
    'Struttura', 'Unita', 'Data Arrivo', 'Data Partenza',
    'Num Ospiti', 'Prezzo Totale', 'Acconto', 'Fonte',
    'Sesso', 'Data Nascita', 'Luogo Nascita', 'Tipo Documento', 'Numero Documento',
    'Lingua', 'Note Ospite', 'Note Interne', 'Check-in Completato',
    'Creata il',
  ]

  const rows = prenotazioni.map((p) => [
    p.id,
    p.stato,
    p.guestNome,
    p.guestCognome,
    p.guestEmail,
    p.guestTelefono ?? '',
    p.struttura?.nome ?? '',
    p.unita?.nome ?? '',
    format(new Date(p.dataArrivo), 'yyyy-MM-dd'),
    p.dataPartenza ? format(new Date(p.dataPartenza), 'yyyy-MM-dd') : '',
    String(p.numOspiti),
    p.prezzoTotale != null ? String(p.prezzoTotale) : '',
    p.acconto != null ? String(p.acconto) : '',
    p.fonte ?? '',
    p.guestSesso ?? '',
    p.guestDataNascita ? format(new Date(p.guestDataNascita), 'yyyy-MM-dd') : '',
    p.guestLuogoNascita ?? '',
    p.guestTipoDocumento ?? '',
    p.guestNumeroDocumento ?? '',
    p.guestLingua ?? '',
    p.guestNote ?? '',
    p.noteInterne ?? '',
    p.checkInCompletato ? 'Si' : 'No',
    format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm'),
  ])

  // Escape CSV fields
  function esc(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const csv = BOM + [
    headers.map(esc).join(','),
    ...rows.map((r) => r.map(esc).join(',')),
  ].join('\n')

  const filename = `prenotazioni_${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
