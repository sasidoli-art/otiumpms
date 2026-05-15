import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'

export const dynamic = 'force-dynamic'

/**
 * GET /api/host/wifi/sessions/export
 *
 * Export CSV delle sessioni per audit Pisanu (Decreto Pisanu 27/07/2005:
 * obbligo conservazione dati accesso Wi-Fi per 6 mesi).
 *
 * Query params:
 *   - range: 7|30|90|180 giorni (default 30, max 180 = Pisanu)
 *   - from / to: ISO date custom (alternativa a range)
 *
 * Output: text/csv, scaricabile come allegato.
 * Colonne: data ora, tipo auth, nome, cognome, camera, MAC, IP, UA, durata min, scaduta.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const hostId = await getHostId()
  if (!hostId) return NextResponse.json({ error: 'no host' }, { status: 401 })

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  if (!host) return NextResponse.json({ error: 'host not found' }, { status: 404 })
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) {
    return NextResponse.json({ error: 'modulo wifi disattivato' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams

  let startDate: Date
  let endDate: Date = new Date()

  if (sp.get('from') && sp.get('to')) {
    startDate = new Date(sp.get('from')!)
    endDate = new Date(sp.get('to')!)
  } else {
    const range = Number(sp.get('range') ?? 30)
    const allowed = [7, 30, 90, 180].includes(range) ? range : 30
    startDate = new Date()
    startDate.setUTCDate(startDate.getUTCDate() - allowed)
  }

  const sessions = await prisma.wifiSession.findMany({
    where: {
      hostId,
      startAt: { gte: startDate, lte: endDate },
    },
    select: {
      startAt: true,
      expiresAt: true,
      revokedAt: true,
      tipo: true,
      guestNome: true,
      guestCognome: true,
      numeroCamera: true,
      macClient: true,
      ipClient: true,
      userAgent: true,
    },
    orderBy: { startAt: 'desc' },
    take: 100000,
  })

  // CSV builder con escape RFC 4180
  const escape = (v: string | null | undefined): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }

  const headers = [
    'data',
    'ora',
    'tipo_auth',
    'nome',
    'cognome',
    'camera',
    'mac',
    'ip',
    'user_agent',
    'durata_min',
    'stato',
  ]
  const lines = [headers.join(',')]

  const now = new Date()
  for (const s of sessions) {
    const endAt = s.revokedAt ?? s.expiresAt
    const durataMin = endAt && endAt > s.startAt ? Math.round((endAt.getTime() - s.startAt.getTime()) / 60_000) : ''
    const stato = s.revokedAt ? 'revocata' : s.expiresAt > now ? 'attiva' : 'scaduta'
    const dataStr = s.startAt.toISOString().slice(0, 10)
    const oraStr = s.startAt.toISOString().slice(11, 19)
    lines.push([
      dataStr,
      oraStr,
      s.tipo,
      escape(s.guestNome),
      escape(s.guestCognome),
      escape(s.numeroCamera),
      escape(s.macClient),
      escape(s.ipClient),
      escape(s.userAgent),
      String(durataMin),
      stato,
    ].join(','))
  }

  // BOM UTF-8 per Excel (interpreta correttamente accenti)
  const csv = '﻿' + lines.join('\r\n') + '\r\n'

  const slug = host.nomeAzienda.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
  const filename = `wifi_sessions_${slug}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
