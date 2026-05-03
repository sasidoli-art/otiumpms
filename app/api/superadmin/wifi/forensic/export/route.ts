import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import {
  buildForensicPdfReport,
  buildForensicCsv,
  type ForensicSessionRow,
} from '@/lib/wifi/forensic-export'
import { z } from 'zod'

/**
 * POST /api/superadmin/wifi/forensic/export
 *
 * Genera un report PDF o CSV delle sessioni Wi-Fi che matchano i filtri,
 * pronto da consegnare alle autorità (Polizia Postale, magistratura).
 *
 * Body:
 *   filters: { hostId?, strutturaId?, dataInizio?, dataFine?, macClient?, ipClient?, ... }
 *   format: 'pdf' | 'csv'
 *   protocolNumber?: string
 *   protocolDate?: ISO string
 *   requestingAuthority?: string
 *   caseReference?: string
 *
 * Response (PDF/CSV):
 *   Content-Type: application/pdf | text/csv
 *   X-Otium-Forensic-Sha256: <hash> (solo PDF)
 *   X-Otium-Forensic-Records: <count>
 *
 * Auth: SuperAdmin only.
 * Audit: ogni esportazione produce una entry in audit_log con i metadati
 * della richiesta + numero record + SHA256 del PDF (chain of custody).
 */

const exportSchema = z.object({
  filters: z.object({
    hostId: z.string().optional(),
    strutturaId: z.string().optional(),
    dataInizio: z.string().datetime().optional(),
    dataFine: z.string().datetime().optional(),
    macClient: z.string().optional(),
    ipClient: z.string().optional(),
    guestNome: z.string().optional(),
    guestCognome: z.string().optional(),
    guestEmail: z.string().optional(),
    tipo: z.enum(['PRENOTAZIONE', 'CODICE', 'COMPLIMENTARY', 'USER_FORM', 'EMAIL_ONLY']).optional(),
    limit: z.coerce.number().int().min(1).max(5000).default(1000),
  }),
  format: z.enum(['pdf', 'csv']),
  protocolNumber: z.string().max(200).optional(),
  protocolDate: z.string().datetime().optional(),
  requestingAuthority: z.string().max(200).optional(),
  caseReference: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json().catch(() => null)
  const parsed = exportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validazione fallita', issues: parsed.error.format() },
      { status: 422 },
    )
  }
  const { filters, format, protocolNumber, protocolDate, requestingAuthority, caseReference } =
    parsed.data

  // Costruisci la stessa query del search endpoint
  const where: Record<string, unknown> = {}
  if (filters.hostId) where.hostId = filters.hostId
  if (filters.macClient) {
    where.macClient = { equals: filters.macClient.toUpperCase(), mode: 'insensitive' }
  }
  if (filters.ipClient) where.ipClient = filters.ipClient
  if (filters.guestNome) {
    where.guestNome = { contains: filters.guestNome, mode: 'insensitive' }
  }
  if (filters.guestCognome) {
    where.guestCognome = { contains: filters.guestCognome, mode: 'insensitive' }
  }
  if (filters.tipo) where.tipo = filters.tipo
  if (filters.dataInizio || filters.dataFine) {
    where.startAt = {}
    if (filters.dataInizio) (where.startAt as Record<string, Date>).gte = new Date(filters.dataInizio)
    if (filters.dataFine) (where.startAt as Record<string, Date>).lte = new Date(filters.dataFine)
  }

  const sessions = await prisma.wifiSession.findMany({
    where,
    take: filters.limit,
    orderBy: { startAt: 'desc' },
    select: {
      id: true,
      hostId: true,
      tipo: true,
      prenotazioneId: true,
      accessCodeId: true,
      guestNome: true,
      guestCognome: true,
      numeroCamera: true,
      macClient: true,
      ipClient: true,
      userAgent: true,
      startAt: true,
      expiresAt: true,
      revokedAt: true,
      host: { select: { nomeAzienda: true } },
    },
  })

  const prenotazioneIds = sessions
    .map((s) => s.prenotazioneId)
    .filter((x): x is string => Boolean(x))

  const prenotazioni = prenotazioneIds.length
    ? await prisma.prenotazione.findMany({
        where: { id: { in: prenotazioneIds } },
        select: {
          id: true,
          guestEmail: true,
          guestTelefono: true,
          guestTipoDocumento: true,
          guestNumeroDocumento: true,
          guestCodiceFiscale: true,
          guestDataNascita: true,
          guestLuogoNascita: true,
          guestCittadinanzaIstat: true,
          strutturaId: true,
          unita: { select: { nome: true, struttura: { select: { id: true, nome: true } } } },
        },
      })
    : []
  const prenIndex = new Map(prenotazioni.map((p) => [p.id, p]))

  let filtered = sessions
  if (filters.strutturaId) {
    filtered = filtered.filter((s) => {
      if (!s.prenotazioneId) return false
      const p = prenIndex.get(s.prenotazioneId)
      return p?.strutturaId === filters.strutturaId
    })
  }
  if (filters.guestEmail) {
    const needle = filters.guestEmail.toLowerCase()
    filtered = filtered.filter((s) => {
      if (!s.prenotazioneId) return false
      const p = prenIndex.get(s.prenotazioneId)
      return p?.guestEmail?.toLowerCase().includes(needle)
    })
  }

  const rows: ForensicSessionRow[] = filtered.map((s) => {
    const p = s.prenotazioneId ? prenIndex.get(s.prenotazioneId) : undefined
    return {
      sessionId: s.id,
      tipoLogin: s.tipo,
      hostNome: s.host.nomeAzienda,
      strutturaNome: p?.unita?.struttura?.nome ?? null,
      numeroCamera: s.numeroCamera ?? p?.unita?.nome ?? null,
      guestNome: s.guestNome,
      guestCognome: s.guestCognome,
      guestEmail: p?.guestEmail ?? null,
      guestTelefono: p?.guestTelefono ?? null,
      guestTipoDocumento: p?.guestTipoDocumento ?? null,
      guestNumeroDocumento: p?.guestNumeroDocumento ?? null,
      guestCodiceFiscale: p?.guestCodiceFiscale ?? null,
      guestDataNascita: p?.guestDataNascita?.toISOString().slice(0, 10) ?? null,
      guestLuogoNascita: p?.guestLuogoNascita ?? null,
      guestCittadinanza: p?.guestCittadinanzaIstat ?? null,
      macClient: s.macClient,
      ipClient: s.ipClient,
      userAgent: s.userAgent,
      sessionStart: s.startAt.toISOString(),
      sessionExpire: s.expiresAt.toISOString(),
      sessionRevoked: s.revokedAt?.toISOString() ?? null,
    }
  })

  const operatorIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null
  const filename = buildFilename(format, protocolNumber)

  // Audit BEFORE export (chain of custody anche se l'export crash)
  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'wifi.forensic.export',
    entita: 'wifi_session',
    dettagli: `Export forense ${format.toUpperCase()}: ${rows.length} record${
      protocolNumber ? ` (Prot. ${protocolNumber})` : ''
    }${requestingAuthority ? ` per ${requestingAuthority}` : ''}`,
    ip: operatorIp,
    datiJson: {
      filters,
      format,
      recordCount: rows.length,
      protocolNumber: protocolNumber ?? null,
      protocolDate: protocolDate ?? null,
      requestingAuthority: requestingAuthority ?? null,
      caseReference: caseReference ?? null,
      filename,
    },
  })

  if (format === 'csv') {
    const csv = buildForensicCsv(rows)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Otium-Forensic-Records': String(rows.length),
        'Cache-Control': 'no-store',
      },
    })
  }

  // PDF
  const { buffer, sha256 } = await buildForensicPdfReport(rows, {
    protocolNumber,
    protocolDate,
    requestingAuthority,
    caseReference,
    operatorName: auth.user.name,
    operatorEmail: auth.user.email,
    operatorIp,
    filters,
  })

  // Audit secondario col SHA256 per chain of custody completa
  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    azione: 'wifi.forensic.export.completed',
    entita: 'wifi_session',
    dettagli: `Export PDF emesso, SHA256=${sha256}`,
    ip: operatorIp,
    datiJson: {
      filename,
      recordCount: rows.length,
      sha256,
      protocolNumber: protocolNumber ?? null,
    },
  })

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Otium-Forensic-Sha256': sha256,
      'X-Otium-Forensic-Records': String(rows.length),
      'Cache-Control': 'no-store',
    },
  })
}

function buildFilename(format: 'pdf' | 'csv', protocolNumber?: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const proto = protocolNumber
    ? '-' + protocolNumber.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
    : ''
  return `otium-wifi-forensic${proto}-${ts}.${format}`
}
