import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verificaPortaleToken, consensoAttivo, getConsensiOspite } from '@/lib/consent'

/**
 * GET /api/privacy/[token]/export
 *
 * Diritto alla portabilità (Art. 20 GDPR): genera un JSON con tutti i dati
 * dell'ospite presso questa struttura. Se il consenso spa_art9 è revocato,
 * i dati sanitari SPA sono esclusi.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const subject = verificaPortaleToken(token)
  if (!subject) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }
  const { email, hostId } = subject

  const spaArt9 = await consensoAttivo(
    { guestEmail: email, hostId },
    'spa_art9',
  )

  const [host, prenotazioni, ospiteCRM, appuntamentiSpa, messaggiChat, consensi] = await Promise.all([
    prisma.host.findUnique({
      where: { id: hostId },
      select: { nomeAzienda: true, partitaIva: true, indirizzo: true },
    }),
    prisma.prenotazione.findMany({
      where: { hostId, guestEmail: email },
      orderBy: { dataArrivo: 'desc' },
      include: {
        struttura: { select: { nome: true, citta: true } },
        unita: { select: { nome: true } },
        sceltePasto: true,
        accompagnatori: true,
      },
    }),
    prisma.ospiteCRM.findUnique({
      where: { hostId_email: { hostId, email } },
    }),
    prisma.appuntamentoSpa.findMany({
      where: { hostId, guestEmail: email },
      orderBy: { dataOra: 'desc' },
      include: {
        trattamento: { select: { nome: true, durata: true } },
        percorso: { select: { nome: true } },
        // Waiver incluso solo se consenso Art.9 attivo
        waiver: spaArt9 ? true : false,
        pagamento: true,
      },
    }),
    prisma.messaggio.findMany({
      where: { chat: { prenotazione: { hostId, guestEmail: email } } },
      orderBy: { createdAt: 'asc' },
      select: {
        mittente: true,
        testo: true,
        canale: true,
        createdAt: true,
      },
    }),
    getConsensiOspite(email, hostId),
  ])

  const payload = {
    generatedAt: new Date().toISOString(),
    titolare: host
      ? { nome: host.nomeAzienda, partitaIva: host.partitaIva, indirizzo: host.indirizzo }
      : null,
    ospite: { email },
    crm: ospiteCRM,
    prenotazioni,
    appuntamentiSpa: spaArt9
      ? appuntamentiSpa
      : appuntamentiSpa.map(({ waiver: _w, ...rest }) => rest),
    spaArt9ConsensoAttivo: spaArt9,
    messaggiChat,
    consensi,
    note: spaArt9
      ? 'Export completo'
      : 'Dati sanitari SPA (waiver) esclusi perché il consenso Art. 9 GDPR non è attivo.',
  }

  const filename = `otium-privacy-export-${email.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
