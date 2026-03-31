import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'

/**
 * GET /api/host/gdpr?email=xxx@email.com
 * Export completo dati personali di un ospite (art. 15 GDPR — diritto di accesso).
 * Raccoglie dati da: Prenotazioni, OspiteCRM, Accompagnatori, Chat, WaiverSpa, AppuntamentiSpa.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Parametro email obbligatorio' }, { status: 400 })

  const hostId = auth.user.hostId

  // Raccolta dati da tutte le tabelle
  const [prenotazioni, ospiteCrm, accompagnatori, appuntamentiSpa] = await Promise.all([
    prisma.prenotazione.findMany({
      where: { hostId, guestEmail: email },
      include: {
        struttura: { select: { nome: true } },
        unita: { select: { nome: true } },
        accompagnatori: true,
        pianoPasto: true,
        chat: { include: { messaggi: true } },
      },
    }),
    prisma.ospiteCRM.findMany({
      where: { hostId, email },
    }),
    prisma.accompagnatore.findMany({
      where: { prenotazione: { hostId, guestEmail: email } },
    }),
    prisma.appuntamentoSpa.findMany({
      where: { hostId, guestEmail: email },
      include: {
        waiver: true,
        pagamento: true,
        trattamento: { select: { nome: true } },
      },
    }),
  ])

  await audit({
    hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'gdpr.export',
    entita: 'ospite',
    dettagli: `Export dati personali per ${email}`,
  })

  return NextResponse.json({
    esportazione: {
      data: new Date().toISOString(),
      richiestaDa: auth.user.email,
      emailOspite: email,
      normativa: 'Art. 15 Regolamento UE 2016/679 (GDPR) — Diritto di accesso',
    },
    prenotazioni: prenotazioni.map(p => ({
      id: p.id,
      stato: p.stato,
      dataArrivo: p.dataArrivo,
      dataPartenza: p.dataPartenza,
      numOspiti: p.numOspiti,
      struttura: p.struttura?.nome,
      unita: p.unita?.nome,
      datiPersonali: {
        nome: p.guestNome,
        cognome: p.guestCognome,
        email: p.guestEmail,
        telefono: p.guestTelefono,
        sesso: p.guestSesso,
        dataNascita: p.guestDataNascita,
        luogoNascita: p.guestLuogoNascita,
        tipoDocumento: p.guestTipoDocumento,
        numeroDocumento: p.guestNumeroDocumento,
        lingua: p.guestLingua,
        note: p.guestNote,
      },
      accompagnatori: p.accompagnatori,
      pianoPasto: p.pianoPasto,
      messaggiChat: p.chat?.messaggi.map(m => ({
        mittente: m.mittente,
        testo: m.testo,
        data: m.createdAt,
      })),
      createdAt: p.createdAt,
    })),
    profiloCrm: ospiteCrm.map(o => ({
      id: o.id,
      nome: o.nome,
      cognome: o.cognome,
      email: o.email,
      telefono: o.telefono,
      nazionalita: o.nazionalita,
      lingua: o.lingua,
      preferenze: o.preferenze,
      note: o.note,
      tags: o.tags,
      vip: o.vip,
      numSoggiorni: o.numSoggiorni,
      totaleSpeso: o.totaleSpeso,
      spaAllergie: o.spaAllergie,
      spaNote: o.spaNote,
    })),
    appuntamentiSpa: appuntamentiSpa.map(a => ({
      id: a.id,
      dataOra: a.dataOra,
      trattamento: a.trattamento?.nome,
      stato: a.stato,
      waiver: a.waiver ? {
        incinta: a.waiver.incinta,
        condizioni: a.waiver.condizioni,
        allergieSelezionate: a.waiver.allergieSelezionate,
        farmaci: a.waiver.farmaci,
        pressioneMassaggio: a.waiver.pressioneMassaggio,
      } : null,
    })),
  })
}

/**
 * DELETE /api/host/gdpr?email=xxx@email.com
 * Diritto all'oblio (art. 17 GDPR) — anonimizza tutti i dati personali.
 * NON elimina i record (servono per contabilità/fiscale), ma anonimizza i dati.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const email = req.nextUrl.searchParams.get('email')
  const conferma = req.nextUrl.searchParams.get('conferma')

  if (!email) return NextResponse.json({ error: 'Parametro email obbligatorio' }, { status: 400 })
  if (conferma !== 'true') {
    return NextResponse.json({
      error: 'Aggiungi &conferma=true per confermare. Questa azione è irreversibile.',
      warning: 'I dati personali saranno anonimizzati in tutte le prenotazioni, CRM e appuntamenti SPA.',
    }, { status: 400 })
  }

  const hostId = auth.user.hostId
  const anonimo = '[DATI RIMOSSI PER GDPR]'

  // Anonimizza prenotazioni
  const prenCount = await prisma.prenotazione.updateMany({
    where: { hostId, guestEmail: email },
    data: {
      guestNome: 'Anonimo',
      guestCognome: 'GDPR',
      guestEmail: `gdpr-${Date.now()}@anonimizzato.local`,
      guestTelefono: null,
      guestNote: null,
      guestSesso: null,
      guestDataNascita: null,
      guestLuogoNascita: null,
      guestComuneNascitaIstat: null,
      guestProvinciaNascita: null,
      guestTipoDocumento: null,
      guestNumeroDocumento: null,
      guestLuogoRilascio: null,
      guestComuneRilascioIstat: null,
      guestProvinciaRilascio: null,
      noteInterne: anonimo,
    },
  })

  // Anonimizza CRM
  const crmCount = await prisma.ospiteCRM.updateMany({
    where: { hostId, email },
    data: {
      nome: 'Anonimo',
      cognome: 'GDPR',
      email: `gdpr-${Date.now()}@anonimizzato.local`,
      telefono: null,
      note: null,
      preferenze: null,
      spaAllergie: null,
      spaNote: null,
    },
  })

  // Elimina accompagnatori (dati di terzi collegati)
  const prenotazioniIds = await prisma.prenotazione.findMany({
    where: { hostId, guestCognome: 'GDPR', guestNome: 'Anonimo' },
    select: { id: true },
  })
  const accCount = await prisma.accompagnatore.deleteMany({
    where: { prenotazioneId: { in: prenotazioniIds.map(p => p.id) } },
  })

  // Anonimizza appuntamenti SPA
  const spaCount = await prisma.appuntamentoSpa.updateMany({
    where: { hostId, guestEmail: email },
    data: {
      guestNome: 'Anonimo',
      guestCognome: 'GDPR',
      guestEmail: null,
      guestTelefono: null,
      note: null,
    },
  })

  // Elimina messaggi chat
  const chats = await prisma.chat.findMany({
    where: { hostId, prenotazione: { guestCognome: 'GDPR', guestNome: 'Anonimo' } },
    select: { id: true },
  })
  const msgCount = await prisma.messaggio.deleteMany({
    where: { chatId: { in: chats.map(c => c.id) } },
  })

  await audit({
    hostId,
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'gdpr.oblio',
    entita: 'ospite',
    dettagli: `Diritto all'oblio esercitato per ${email} — ${prenCount.count} prenotazioni, ${crmCount.count} profili CRM, ${accCount.count} accompagnatori, ${spaCount.count} appuntamenti SPA, ${msgCount.count} messaggi anonimizzati/eliminati`,
  })

  return NextResponse.json({
    esito: 'Dati anonimizzati con successo',
    normativa: 'Art. 17 Regolamento UE 2016/679 (GDPR) — Diritto alla cancellazione',
    dettaglio: {
      prenotazioniAnonimizzate: prenCount.count,
      profiliCrmAnonimizzati: crmCount.count,
      accompagnatoriEliminati: accCount.count,
      appuntamentiSpaAnonimizzati: spaCount.count,
      messaggiEliminati: msgCount.count,
    },
  })
}
