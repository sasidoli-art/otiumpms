import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth, logAccessoAsync } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// ─── GET /api/host/crm/[id] ─────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Prenotazioni collegate via email
  const prenotazioni = await prisma.prenotazione.findMany({
    where: { hostId: auth.user.hostId, guestEmail: ospite.email, deletedAt: null },
    include: {
      unita: { select: { nome: true } },
      struttura: { select: { nome: true } },
    },
    orderBy: { dataArrivo: 'desc' },
    take: 30,
  })

  // Statistiche
  const spesaMediaHost = await prisma.ospiteCRM.aggregate({
    where: { hostId: auth.user.hostId },
    _avg: { totaleSpeso: true },
  })
  const avgSpesa = spesaMediaHost._avg.totaleSpeso ?? 0
  const primaVisita = prenotazioni.length > 0
    ? prenotazioni[prenotazioni.length - 1].dataArrivo
    : null
  const speseMedia = ospite.numSoggiorni > 0
    ? Math.round((ospite.totaleSpeso / ospite.numSoggiorni) * 100) / 100
    : 0

  // Segmenti auto-calcolati
  const segmenti: string[] = []
  if (ospite.numSoggiorni === 1) segmenti.push('Nuovo')
  else if (ospite.numSoggiorni >= 2 && ospite.numSoggiorni <= 4) segmenti.push('Ricorrente')
  else if (ospite.numSoggiorni >= 5) segmenti.push('Fedele')
  if (avgSpesa > 0 && ospite.totaleSpeso > avgSpesa * 2) segmenti.push('Alto spendente')
  if (ospite.dataUltimoSoggiorno) {
    const giorni = Math.floor((Date.now() - ospite.dataUltimoSoggiorno.getTime()) / 86400000)
    if (giorni > 365) segmenti.push('Dormiente')
  }

  // Ultimi messaggi chat con l'ospite (via prenotazioni)
  const ultimiMessaggi = await prisma.messaggio.findMany({
    where: {
      chat: { prenotazione: { hostId: auth.user.hostId, guestEmail: ospite.email } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true, mittente: true, testo: true, canale: true, createdAt: true,
      chat: { select: { prenotazioneId: true } },
    },
  })

  // SPA: terapista preferito + appuntamenti recenti (se modulo attivo, fallisce gracefully)
  let spaData: {
    terapistaPreferito: { nome: string; cognome: string } | null
    trattamentiPreferiti: string[]
    appuntamenti: Array<{ id: string; dataOra: Date; trattamentoNome: string | null }>
  } = { terapistaPreferito: null, trattamentiPreferiti: [], appuntamenti: [] }
  try {
    const spaOspite = await prisma.ospiteCRM.findUnique({
      where: { id: params.id },
      select: {
        spaPreferenzeTerapista: { select: { nome: true, cognome: true } },
        spaTrattamentiPreferiti: true,
      },
    })
    const appuntamenti = await prisma.appuntamentoSpa.findMany({
      where: { hostId: auth.user.hostId, guestEmail: ospite.email },
      orderBy: { dataOra: 'desc' },
      take: 5,
      select: {
        id: true, dataOra: true,
        trattamento: { select: { nome: true } },
        percorso: { select: { nome: true } },
      },
    })
    spaData = {
      terapistaPreferito: spaOspite?.spaPreferenzeTerapista ?? null,
      trattamentiPreferiti: spaOspite?.spaTrattamentiPreferiti ?? [],
      appuntamenti: appuntamenti.map((a) => ({
        id: a.id,
        dataOra: a.dataOra,
        trattamentoNome: a.trattamento?.nome ?? a.percorso?.nome ?? null,
      })),
    }
  } catch { /* modulo SPA non attivo */ }

  // GDPR: log accesso
  logAccessoAsync({
    hostId: auth.user.hostId!,
    userId: auth.user.id,
    userEmail: auth.user.email,
    entita: 'ospite_crm',
    entitaId: ospite.id,
    tipoAccesso: 'visualizzazione',
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    ospite,
    prenotazioni,
    statistiche: {
      spesaMedia: speseMedia,
      primaVisita,
      segmenti,
    },
    messaggi: ultimiMessaggi,
    spa: spaData,
  })
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const body = await req.json()
  const aggiornato = await prisma.ospiteCRM.update({
    where: { id: params.id },
    data: {
      nome: body.nome ?? ospite.nome,
      cognome: body.cognome ?? ospite.cognome,
      telefono: body.telefono !== undefined ? body.telefono : ospite.telefono,
      nazionalita: body.nazionalita !== undefined ? body.nazionalita : ospite.nazionalita,
      lingua: body.lingua !== undefined ? body.lingua : ospite.lingua,
      note: body.note !== undefined ? body.note : ospite.note,
      preferenze: body.preferenze !== undefined ? body.preferenze : ospite.preferenze,
      vip: body.vip !== undefined ? body.vip : ospite.vip,
      blacklist: body.blacklist !== undefined ? body.blacklist : ospite.blacklist,
      blacklistMotivo: body.blacklistMotivo !== undefined ? body.blacklistMotivo : ospite.blacklistMotivo,
      tags: body.tags !== undefined ? body.tags : ospite.tags,
    },
  })

  await auditFromAuth(auth, {
    azione: 'ospite_crm.modificato',
    entita: 'ospiteCRM',
    entitaId: ospite.id,
    dettagli: `Scheda ${ospite.email} aggiornata`,
  })

  return NextResponse.json(aggiornato)
}

// ─── DELETE (GDPR anonimizzazione scheda CRM) ───────────────────────────────

export async function DELETE(
  _req: Request,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth
  const params = await paramsPromise

  const ospite = await prisma.ospiteCRM.findFirst({
    where: { id: params.id, hostId: auth.user.hostId },
  })
  if (!ospite) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Anonimizza la scheda CRM (non elimina: Art. 17 GDPR permette conservazione
  // con dati anonimizzati per statistiche aggregate. Prenotazioni e fatture
  // NON vengono toccate — soggette a obblighi fiscali/Alloggiati).
  const anonEmail = `deleted-${ospite.id.slice(0, 8)}@removed.local`
  await prisma.ospiteCRM.update({
    where: { id: ospite.id },
    data: {
      nome: 'Cliente', cognome: 'Rimosso', email: anonEmail,
      telefono: null, nazionalita: null, note: null, preferenze: null,
      blacklistMotivo: null, tags: [],
      spaAllergie: null, spaNote: null, spaTrattamentiPreferiti: [],
      spaPreferenzeTerapistaId: null,
    },
  })

  await auditFromAuth(auth, {
    azione: 'gdpr.ospite_crm.anonimizzato_dall_host',
    entita: 'ospiteCRM',
    entitaId: ospite.id,
    dettagli: `Scheda CRM di ${ospite.email.substring(0, 3)}*** anonimizzata. Prenotazioni e fatture mantenute per obblighi di legge.`,
  })

  return NextResponse.json({ ok: true, anonimizzato: true })
}
