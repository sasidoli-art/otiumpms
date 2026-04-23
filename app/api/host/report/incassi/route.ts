import { NextRequest, NextResponse } from 'next/server'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { startOfMonth, addDays, startOfDay, format } from 'date-fns'

/**
 * GET /api/host/report/incassi
 *
 * Elenco incassi (Incasso + PagamentoSpa RISCOSSO + TransazionePOS COMPLETATA).
 * Filtrabile per metodo. Include totali per metodo e riconciliazione vs fatturato.
 *
 * Query:
 *   da=YYYY-MM-DD (default: primo del mese)
 *   a=YYYY-MM-DD (default: oggi)
 *   metodo=CONTANTI|CARTA|CAMERA_CREDIT|GIFT_CARD|BONIFICO|TRANSFERWISE
 *   strutturaId=xxx (opzionale — filtra via prenotazione)
 */

type RigaIncasso = {
  id: string
  data: string
  descrizione: string
  cameraOspite: string | null
  metodo: string
  importo: number
  operatore: string | null
  origine: 'INCASSO' | 'SPA' | 'POS'
}

export async function GET(req: NextRequest) {
  const auth = await requireHostOrAdmin(req.nextUrl.searchParams)
  if (isUnauthorized(auth)) return auth
  const hostId = auth.user.hostId

  const sp = req.nextUrl.searchParams
  const oggi = startOfDay(new Date())
  const inizio = sp.get('da') ? startOfDay(new Date(sp.get('da')!)) : startOfMonth(oggi)
  const fine = sp.get('a') ? addDays(startOfDay(new Date(sp.get('a')!)), 1) : addDays(oggi, 1)
  if (isNaN(inizio.getTime()) || isNaN(fine.getTime()) || fine <= inizio) {
    return NextResponse.json({ error: 'Range non valido' }, { status: 400 })
  }
  const metodoFiltro = sp.get('metodo') || undefined
  const strutturaId = sp.get('strutturaId') || undefined

  // ─── Incassi (tabella primaria) ─────────────────────────────────────────
  const incassi = await prisma.incasso.findMany({
    where: {
      hostId,
      data: { gte: inizio, lt: fine },
      ...(metodoFiltro ? { metodo: metodoFiltro as 'CONTANTI' | 'CARTA' | 'CAMERA_CREDIT' | 'GIFT_CARD' | 'BONIFICO' | 'MISTO' } : {}),
      ...(strutturaId ? { prenotazione: { strutturaId } } : {}),
    },
    select: {
      id: true,
      data: true,
      importo: true,
      metodo: true,
      descrizione: true,
      operatore: true,
      prenotazione: {
        select: { guestNome: true, guestCognome: true, unita: { select: { nome: true } } },
      },
    },
    orderBy: { data: 'desc' },
    take: 500,
  })

  // ─── Pagamenti SPA riscossi ─────────────────────────────────────────────
  const spaMetodoFiltro = metodoFiltro && ['CONTANTI', 'CARTA', 'CAMERA_CREDIT', 'TRANSFERWISE'].includes(metodoFiltro)
    ? { metodo: metodoFiltro as 'CONTANTI' | 'CARTA' | 'CAMERA_CREDIT' | 'TRANSFERWISE' }
    : {}

  const spa = await prisma.pagamentoSpa.findMany({
    where: {
      stato: 'RISCOSSO',
      dataRiscossione: { gte: inizio, lt: fine },
      appuntamento: { hostId },
      ...spaMetodoFiltro,
    },
    select: {
      id: true,
      importo: true,
      metodo: true,
      dataRiscossione: true,
      noteRiscossione: true,
      unita: { select: { nome: true } },
      appuntamento: {
        select: {
          guestNome: true,
          guestCognome: true,
          trattamento: { select: { nome: true } },
        },
      },
    },
    orderBy: { dataRiscossione: 'desc' },
    take: 500,
  })

  // ─── Transazioni POS completate ─────────────────────────────────────────
  const pos = await prisma.transazionePOS.findMany({
    where: {
      hostId,
      stato: 'COMPLETATA',
      createdAt: { gte: inizio, lt: fine },
      ...(metodoFiltro ? { metodoPagamento: metodoFiltro as 'CONTANTI' | 'CARTA' | 'CAMERA_CREDIT' | 'GIFT_CARD' | 'BONIFICO' | 'MISTO' } : {}),
      ...(strutturaId ? { prenotazione: { strutturaId } } : {}),
    },
    select: {
      id: true,
      createdAt: true,
      totale: true,
      metodoPagamento: true,
      numero: true,
      operatore: true,
      guestNome: true,
      prenotazione: {
        select: { guestNome: true, guestCognome: true, unita: { select: { nome: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const righe: RigaIncasso[] = []

  for (const i of incassi) {
    const camOsp = i.prenotazione
      ? [i.prenotazione.unita?.nome, `${i.prenotazione.guestCognome} ${i.prenotazione.guestNome}`].filter(Boolean).join(' · ') || null
      : null
    righe.push({
      id: i.id,
      data: i.data.toISOString(),
      descrizione: i.descrizione,
      cameraOspite: camOsp,
      metodo: i.metodo,
      importo: i.importo,
      operatore: i.operatore ?? null,
      origine: 'INCASSO',
    })
  }

  for (const s of spa) {
    if (!s.dataRiscossione) continue
    const osp = s.appuntamento
      ? `${s.appuntamento.guestCognome ?? ''} ${s.appuntamento.guestNome}`.trim()
      : ''
    const cam = s.unita?.nome ? `${s.unita.nome} · ${osp}`.trim() : osp || null
    righe.push({
      id: `spa:${s.id}`,
      data: s.dataRiscossione.toISOString(),
      descrizione: `SPA — ${s.appuntamento?.trattamento?.nome ?? 'trattamento'}`,
      cameraOspite: cam,
      metodo: s.metodo,
      importo: s.importo,
      operatore: null,
      origine: 'SPA',
    })
  }

  for (const t of pos) {
    const camOsp = t.prenotazione
      ? [t.prenotazione.unita?.nome, `${t.prenotazione.guestCognome} ${t.prenotazione.guestNome}`].filter(Boolean).join(' · ') || null
      : t.guestNome || null
    righe.push({
      id: `pos:${t.id}`,
      data: t.createdAt.toISOString(),
      descrizione: `POS ${t.numero ? `#${t.numero}` : ''}`.trim(),
      cameraOspite: camOsp,
      metodo: t.metodoPagamento,
      importo: t.totale,
      operatore: t.operatore,
      origine: 'POS',
    })
  }

  righe.sort((a, b) => b.data.localeCompare(a.data))

  // ─── Totali per metodo ──────────────────────────────────────────────────
  const perMetodo = new Map<string, { count: number; totale: number }>()
  for (const r of righe) {
    const cur = perMetodo.get(r.metodo) ?? { count: 0, totale: 0 }
    cur.count += 1
    cur.totale += r.importo
    perMetodo.set(r.metodo, cur)
  }
  const totaleIncassato = Array.from(perMetodo.values()).reduce((s, v) => s + v.totale, 0)

  // ─── Riconciliazione: totale fatture emesse nel periodo ────────────────
  const fatture = await prisma.fattura.findMany({
    where: {
      hostId,
      deletedAt: null,
      stato: { in: ['INVIATA', 'PAGATA'] as Array<'INVIATA' | 'PAGATA'> },
      dataEmissione: { gte: inizio, lt: fine },
    },
    select: { totale: true },
  })
  const totaleFatturato = fatture.reduce((s, f) => s + f.totale, 0)

  const round2 = (n: number) => Math.round(n * 100) / 100
  const discrepanza = round2(totaleIncassato - totaleFatturato)

  return NextResponse.json({
    periodo: {
      da: format(inizio, 'yyyy-MM-dd'),
      a: format(addDays(fine, -1), 'yyyy-MM-dd'),
    },
    righe,
    perMetodo: Array.from(perMetodo.entries())
      .map(([metodo, v]) => ({ metodo, count: v.count, totale: round2(v.totale) }))
      .sort((a, b) => b.totale - a.totale),
    riconciliazione: {
      totaleIncassato: round2(totaleIncassato),
      totaleFatturato: round2(totaleFatturato),
      discrepanza,
      quadrato: Math.abs(discrepanza) < 0.5,
    },
  }, { headers: { 'Cache-Control': 'private, max-age=60' } })
}
