import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { cancellaTuttiDatiOspite } from '@/lib/gdpr-retention'
import { sendEmailGeneric } from '@/lib/email'
import { logger } from '@/lib/logger'
import { audit } from '@/lib/audit'

/**
 * POST /api/host/gdpr/richieste/[id]/esegui
 * Esegue la cancellazione effettiva. Solo MANAGER / DIREZIONE / HOST.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await params

  // requireHost già ammette solo role=HOST con hostId. Se in futuro i token
  // staff vengono emessi, aggiungere guardia staff=MANAGER qui.

  const richiesta = await prisma.richiestaCancellazione.findFirst({
    where: { id, hostId: auth.user.hostId },
  })
  if (!richiesta) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  if (richiesta.stato === 'COMPLETATA') {
    return NextResponse.json({ error: 'Richiesta già completata' }, { status: 422 })
  }
  if (richiesta.stato === 'RIFIUTATA') {
    return NextResponse.json({ error: 'Richiesta rifiutata, non eseguibile' }, { status: 422 })
  }

  try {
    const report = await cancellaTuttiDatiOspite(auth.user.hostId, richiesta.guestEmail, {
      dryRun: false,
      attoreUserId: auth.user.id,
    })

    const aggiornata = await prisma.richiestaCancellazione.update({
      where: { id },
      data: {
        stato: 'COMPLETATA',
        completataAt: new Date(),
        completataDa: auth.user.id,
        datiCancellati: report as unknown as object,
      },
    })

    await audit({
      hostId: auth.user.hostId,
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'gdpr.art17.cancellazione_eseguita',
      entita: 'richiestaCancellazione',
      entitaId: id,
      dettagli: `Cancellazione eseguita per ${richiesta.guestEmail} — ${report.daCancellare.prenotazioni} prenotazioni, ${report.daCancellare.waiverSpa} waiver`,
    })

    // Email conferma all'ospite (best effort)
    try {
      const conservati: string[] = []
      if (report.conservatiPerLegge.fatture > 0) {
        conservati.push(`${report.conservatiPerLegge.fatture} fatture (Art. 2220 CC, 10 anni)`)
      }
      if (report.conservatiPerLegge.prenotazioniAlloggiati > 0) {
        conservati.push(`dati Alloggiati (Art. 109 TULPS, 5 anni)`)
      }
      await sendEmailGeneric({
        to: richiesta.guestEmail,
        subject: 'Richiesta cancellazione dati — completata',
        text: `La tua richiesta di cancellazione dati è stata eseguita.\n\nSono stati cancellati/anonimizzati:\n- ${report.daCancellare.prenotazioni} prenotazioni\n- ${report.daCancellare.messaggiChat} messaggi chat\n- ${report.daCancellare.waiverSpa} waiver SPA\n- ${report.daCancellare.accompagnatori} accompagnatori\n${report.daCancellare.crm ? '- profilo CRM\n' : ''}\n${conservati.length > 0 ? `Sono conservati per obbligo di legge:\n- ${conservati.join('\n- ')}\n` : ''}\nGrazie.`,
        hostId: auth.user.hostId,
      })
    } catch (e) {
      logger.warn('Email conferma cancellazione non inviata', 'gdpr/esegui', {
        error: e instanceof Error ? e.message : String(e),
      })
    }

    return NextResponse.json({ ok: true, richiesta: aggiornata, report })
  } catch (e) {
    logger.error('Errore esecuzione cancellazione', 'gdpr/esegui', {
      error: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore' },
      { status: 500 },
    )
  }
}
