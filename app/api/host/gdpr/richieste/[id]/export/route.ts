import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { consensoAttivo, getConsensiOspite } from '@/lib/consent'
import { audit } from '@/lib/audit'

/**
 * GET /api/host/gdpr/richieste/[id]/export
 *
 * Scarica il pacchetto completo dati dell'ospite collegato alla richiesta
 * (Art. 15 GDPR - diritto di accesso). L'host può allegare questo file
 * alla risposta se l'ospite lo richiede.
 *
 * Se il consenso spa_art9 è revocato, i waiver SPA sono esclusi.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params
  const hostId = auth.user.hostId

  const richiesta = await prisma.richiestaCancellazione.findFirst({
    where: { id, hostId },
    select: { guestEmail: true, guestNome: true },
  })
  if (!richiesta) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })

  const email = richiesta.guestEmail.toLowerCase()

  const spaArt9 = await consensoAttivo({ guestEmail: email, hostId }, 'spa_art9')

  const [host, prenotazioni, ospiteCRM, appuntamentiSpa, messaggi, consensi] = await Promise.all([
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
    prisma.ospiteCRM.findUnique({ where: { hostId_email: { hostId, email } } }),
    prisma.appuntamentoSpa.findMany({
      where: { hostId, guestEmail: email },
      orderBy: { dataOra: 'desc' },
      include: {
        trattamento: { select: { nome: true, durata: true } },
        percorso: { select: { nome: true } },
        waiver: spaArt9 ? true : false,
        pagamento: true,
      },
    }),
    prisma.messaggio.findMany({
      where: { chat: { prenotazione: { hostId, guestEmail: email } } },
      orderBy: { createdAt: 'asc' },
      select: { mittente: true, testo: true, canale: true, createdAt: true },
    }),
    getConsensiOspite(email, hostId),
  ])

  await audit({
    hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'gdpr.art15.export_richiesta',
    entita: 'richiestaCancellazione',
    entitaId: id,
    dettagli: `Export dati per richiesta di ${email}`,
  })

  const payload = {
    generatedAt: new Date().toISOString(),
    richiestaId: id,
    titolare: host,
    ospite: { email, nome: richiesta.guestNome },
    crm: ospiteCRM,
    prenotazioni,
    appuntamentiSpa: spaArt9
      ? appuntamentiSpa
      : appuntamentiSpa.map(({ waiver: _w, ...rest }) => rest),
    spaArt9ConsensoAttivo: spaArt9,
    messaggiChat: messaggi,
    consensi,
    note: spaArt9
      ? 'Export completo'
      : 'Dati sanitari SPA (waiver) esclusi per revoca consenso Art. 9 GDPR.',
  }

  const filename = `export-ospite-${email.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
