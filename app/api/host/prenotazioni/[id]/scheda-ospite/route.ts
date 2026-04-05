import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { generateSchedaOspitePdf } from '@/lib/pdf-generator'

/**
 * GET /api/host/prenotazioni/[id]/scheda-ospite
 * Genera la Scheda Ospite PDF per check-in in reception.
 * Conforme art. 109 TULPS per identificazione.
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
      struttura: { select: { nome: true, indirizzo: true, citta: true } },
      unita: { select: { nome: true } },
      host: { select: { nomeAzienda: true, partitaIva: true, telefono: true } },
      accompagnatori: true,
    },
  })

  if (!pren) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const fmtDate = (d: Date | null) => d ? format(new Date(d), 'd MMMM yyyy', { locale: it }) : '—'
  const notti = pren.dataPartenza
    ? Math.round((new Date(pren.dataPartenza).getTime() - new Date(pren.dataArrivo).getTime()) / 86400000)
    : 1

  const TIPI_DOC: Record<string, string> = { PPORT: 'Passaporto', IDENTE: "Carta d'identità", PATEN: 'Patente', PERMSOS: 'Permesso soggiorno' }

  try {
    const pdf = await generateSchedaOspitePdf({
      nomeAzienda: pren.host?.nomeAzienda || 'Struttura',
      strutturaInfo: [pren.struttura?.nome, pren.struttura?.indirizzo, pren.struttura?.citta].filter(Boolean).join(' — '),
      partitaIva: pren.host?.partitaIva || '',
      checkIn: fmtDate(pren.dataArrivo),
      checkOut: fmtDate(pren.dataPartenza),
      notti,
      unita: pren.unita?.nome || '—',
      numOspiti: pren.numOspiti,
      prezzo: pren.prezzoTotale ? `€${pren.prezzoTotale.toFixed(2)}` : null,
      tassa: pren.tassaSoggiorno ? `€${pren.tassaSoggiorno.toFixed(2)}/notte` : null,
      cognomeNome: `${pren.guestCognome} ${pren.guestNome}`,
      email: pren.guestEmail,
      telefono: pren.guestTelefono,
      sesso: pren.guestSesso,
      dataNascita: pren.guestDataNascita ? fmtDate(pren.guestDataNascita) : null,
      luogoNascita: pren.guestLuogoNascita
        ? `${pren.guestLuogoNascita}${pren.guestProvinciaNascita ? ` (${pren.guestProvinciaNascita})` : ''}`
        : null,
      documento: pren.guestTipoDocumento
        ? `${TIPI_DOC[pren.guestTipoDocumento] || pren.guestTipoDocumento} n. ${pren.guestNumeroDocumento || '—'}`
        : null,
      luogoRilascio: pren.guestLuogoRilascio
        ? `${pren.guestLuogoRilascio}${pren.guestProvinciaRilascio ? ` (${pren.guestProvinciaRilascio})` : ''}`
        : null,
      accompagnatori: (pren.accompagnatori || []).map(a => ({
        cognomeNome: `${a.cognome} ${a.nome}`,
        sesso: a.sesso,
        dataNascita: a.dataNascita ? fmtDate(a.dataNascita) : null,
        nazionalita: a.nazionalita,
        documento: a.tipoDocumento
          ? `${TIPI_DOC[a.tipoDocumento] || a.tipoDocumento} n. ${a.numeroDocumento || '—'}`
          : null,
        isMinore: a.isMinore,
      })),
    })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="scheda_ospite_${pren.guestCognome}_${pren.guestNome}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Scheda ospite PDF error:', err)
    return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })
  }
}
