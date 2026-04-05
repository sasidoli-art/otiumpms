import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { sendEmailGeneric } from '@/lib/email'
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'

/**
 * POST /api/host/prenotazioni/[id]/conto-email
 *
 * Invia il conto/riepilogo della prenotazione via email all'ospite.
 */
export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const p = await prisma.prenotazione.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
    include: {
      struttura: { select: { nome: true } },
      unita: { select: { nome: true } },
      addebiti: true,
    },
  })
  if (!p) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (!p.guestEmail) return NextResponse.json({ error: 'Email ospite mancante' }, { status: 400 })

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { nomeAzienda: true },
  })

  // Build bill text
  const fmtDate = (d: Date) => format(d, 'd MMMM yyyy', { locale: itLocale })
  const struttura = p.struttura?.nome ?? 'Struttura'
  const notti = p.dataPartenza
    ? Math.round((p.dataPartenza.getTime() - p.dataArrivo.getTime()) / 86400000)
    : null

  let righe = `Struttura: ${struttura}`
  if (p.unita) righe += ` (${p.unita.nome})`
  righe += `\nArrivo: ${fmtDate(p.dataArrivo)}`
  if (p.dataPartenza) righe += `\nPartenza: ${fmtDate(p.dataPartenza)}`
  if (notti) righe += `\nNotti: ${notti}`
  righe += `\nOspiti: ${p.numOspiti}`

  if (p.prezzoTotale != null) righe += `\n\nTotale soggiorno: €${p.prezzoTotale.toFixed(2)}`
  if (p.acconto != null && p.acconto > 0) righe += `\nAcconto versato: €${p.acconto.toFixed(2)}`
  if (p.tassaSoggiorno != null) righe += `\nTassa di soggiorno: €${p.tassaSoggiorno.toFixed(2)}/notte`

  // Addebiti extra
  if (p.addebiti && p.addebiti.length > 0) {
    righe += '\n\nAddebiti extra:'
    let totAddebiti = 0
    for (const a of p.addebiti) {
      righe += `\n  - ${a.descrizione}: €${a.totale.toFixed(2)}`
      totAddebiti += a.totale
    }
    righe += `\nTotale addebiti: €${totAddebiti.toFixed(2)}`
  }

  const saldo = (p.prezzoTotale ?? 0) - (p.acconto ?? 0)
  if (saldo > 0) righe += `\n\nSaldo da pagare: €${saldo.toFixed(2)}`
  else righe += '\n\nSaldo: PAGATO'

  const subject = `Riepilogo conto — ${struttura}`
  const body = `Gentile ${p.guestNome} ${p.guestCognome},\n\necco il riepilogo del tuo soggiorno:\n\n${righe}\n\nGrazie per averci scelto!\n${host?.nomeAzienda ?? 'Lo staff'}`

  try {
    console.log('[conto-email] to:', p.guestEmail, 'hostId:', auth.user.hostId)
    await sendEmailGeneric({ to: p.guestEmail, subject, text: body, hostId: auth.user.hostId })
    console.log('[conto-email] email sent OK')

    // Registra nella chat
    const chat = await prisma.chat.findFirst({ where: { prenotazioneId: p.id } })
    if (chat) {
      await prisma.messaggio.create({
        data: {
          chatId: chat.id,
          mittente: 'HOST',
          canale: 'EMAIL',
          testo: `📧 Conto inviato via email\n\n${righe}`,
          letto: false,
        },
      })
      await prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })
    }

    await auditFromAuth(auth, { azione: 'conto.email.inviato', entita: 'prenotazione', entitaId: p.id, dettagli: `Conto inviato a ${p.guestEmail}` })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[conto-email]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Errore invio email' }, { status: 500 })
  }
}
