import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { sendEmailGeneric } from '@/lib/email'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * POST /api/host/report/crediti/sollecito
 * Invia email di sollecito pagamento a un ospite.
 * Body: { prenotazioneId: string, lingua?: "it" | "en" }
 */
export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { prenotazioneId, lingua = 'it' } = body

  if (!prenotazioneId) {
    return NextResponse.json({ error: 'prenotazioneId obbligatorio' }, { status: 400 })
  }

  const pren = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      guestEmail: true,
      prezzoTotale: true,
      acconto: true,
      dataArrivo: true,
      dataPartenza: true,
      struttura: { select: { nome: true } },
      host: { select: { nomeAzienda: true, telefono: true, emailMittente: true } },
    },
  })

  if (!pren) return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })

  const saldo = Math.round(((pren.prezzoTotale ?? 0) - (pren.acconto ?? 0)) * 100) / 100
  if (saldo <= 0) {
    return NextResponse.json({ error: 'Nessun saldo da sollecitare' }, { status: 400 })
  }

  const strutturaNome = pren.struttura?.nome ?? ''
  const nomeAzienda = pren.host?.nomeAzienda ?? ''
  const telefono = pren.host?.telefono ?? ''
  const arrivo = format(new Date(pren.dataArrivo), 'd MMMM yyyy', { locale: it })
  const partenza = pren.dataPartenza ? format(new Date(pren.dataPartenza), 'd MMMM yyyy', { locale: it }) : '—'

  const templates = {
    it: {
      oggetto: `Sollecito pagamento — ${strutturaNome}`,
      corpo: `Gentile ${pren.guestNome} ${pren.guestCognome},\n\n` +
        `Le scriviamo per ricordarLe che risulta un saldo in sospeso relativo al Suo soggiorno:\n\n` +
        `Struttura: ${strutturaNome}\n` +
        `Periodo: ${arrivo} — ${partenza}\n` +
        `Importo totale: €${(pren.prezzoTotale ?? 0).toFixed(2)}\n` +
        `Acconto versato: €${(pren.acconto ?? 0).toFixed(2)}\n` +
        `Saldo residuo: €${saldo.toFixed(2)}\n\n` +
        `La preghiamo di provvedere al saldo al più presto.\n` +
        `Per qualsiasi chiarimento, non esiti a contattarci.\n\n` +
        `Cordiali saluti,\n${nomeAzienda}\n${telefono}`,
    },
    en: {
      oggetto: `Payment reminder — ${strutturaNome}`,
      corpo: `Dear ${pren.guestNome} ${pren.guestCognome},\n\n` +
        `We are writing to remind you of an outstanding balance regarding your stay:\n\n` +
        `Property: ${strutturaNome}\n` +
        `Period: ${arrivo} — ${partenza}\n` +
        `Total amount: €${(pren.prezzoTotale ?? 0).toFixed(2)}\n` +
        `Deposit paid: €${(pren.acconto ?? 0).toFixed(2)}\n` +
        `Balance due: €${saldo.toFixed(2)}\n\n` +
        `Please arrange payment at your earliest convenience.\n` +
        `Should you have any questions, please do not hesitate to contact us.\n\n` +
        `Best regards,\n${nomeAzienda}\n${telefono}`,
    },
  }

  const tpl = templates[lingua as 'it' | 'en'] ?? templates.it

  try {
    await sendEmailGeneric({
      to: pren.guestEmail,
      subject: tpl.oggetto,
      text: tpl.corpo,
      hostId: auth.user.hostId,
    })

    // Log notifica
    await prisma.notifica.create({
      data: {
        hostId: auth.user.hostId,
        tipo: 'sistema',
        titolo: `Sollecito inviato a ${pren.guestNome} ${pren.guestCognome}`,
        messaggio: `Saldo €${saldo.toFixed(2)} — ${strutturaNome}`,
        linkUrl: `/host/prenotazioni/${pren.id}`,
      },
    })

    return NextResponse.json({ ok: true, saldo, email: pren.guestEmail })
  } catch (err) {
    console.error('Sollecito email error:', err)
    return NextResponse.json({ error: 'Errore invio email' }, { status: 500 })
  }
}
