import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { buildPatchedBackup } from '@/lib/wifi/backup-builder'
import { generateWifiToken, hashWifiToken } from '@/lib/wifi/auth'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/superadmin/wifi/onboard-device
 *
 * Riceve un factory backup `.file` + parametri device, crea WifiDevice nel DB,
 * patcha il backup con SSH key + agent + token, restituisce il file patchato
 * come download binario.
 *
 * Header response (in caso di successo):
 *   - Content-Type: application/octet-stream
 *   - Content-Disposition: attachment; filename="..."
 *   - X-Otium-Device-Id: <id WifiDevice creato>
 *   - X-Otium-Mac: <MAC normalizzato>
 *   - X-Otium-Token: <bearer in CHIARO — l'unica volta che viene esposto>
 *
 * Body multipart/form-data:
 *   - file: factory backup .file (richiesto)
 *   - hostId: ID host destinatario (richiesto)
 *   - alias: nome leggibile (richiesto, es. "Reception Mastroberardino")
 *   - mac: MAC LAN del device se noto, altrimenti omettere → usa PENDING-* (auto-detect)
 *   - modello: es. "CF-AC101" (richiesto)
 *   - strutturaId: opzionale, struttura associata
 *   - sshPubkey: opzionale, default da env OTIUM_SSH_PUBKEY
 *   - note: opzionale
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  try {
    const form = await req.formData()

    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'file mancante o vuoto' }, { status: 400 })
    }
    const factoryBuf = Buffer.from(await file.arrayBuffer())

    const hostId = String(form.get('hostId') ?? '').trim()
    const alias = String(form.get('alias') ?? '').trim()
    const modello = String(form.get('modello') ?? '').trim()
    const macRaw = String(form.get('mac') ?? '').trim()
    const strutturaId = String(form.get('strutturaId') ?? '').trim() || null
    const sshPubkeyRaw = String(form.get('sshPubkey') ?? '').trim() || process.env.OTIUM_SSH_PUBKEY || ''
    const note = String(form.get('note') ?? '').trim() || null

    if (!hostId || !alias || !modello) {
      return NextResponse.json({ error: 'hostId, alias, modello obbligatori' }, { status: 400 })
    }
    if (!sshPubkeyRaw || !sshPubkeyRaw.startsWith('ssh-')) {
      return NextResponse.json({ error: 'sshPubkey mancante o invalida (richiede prefisso ssh-rsa/ssh-ed25519/ecc.)' }, { status: 400 })
    }

    // Normalizza MAC
    let macNorm: string
    if (macRaw) {
      macNorm = macRaw.toUpperCase().replace(/[^0-9A-F]/g, '')
      if (macNorm.length !== 12) {
        return NextResponse.json({ error: 'MAC deve essere 12 hex char' }, { status: 400 })
      }
    } else {
      // Placeholder casuale: 8 hex random → "PENDING-XXXXXXXX"
      const rand = Math.random().toString(16).slice(2, 10).toUpperCase().padStart(8, '0')
      macNorm = `PENDING-${rand}`
    }

    // Verifica host esiste + modulo wifi attivo
    const host = await prisma.host.findUnique({
      where: { id: hostId },
      select: { id: true, nomeAzienda: true, moduliAttivi: true },
    })
    if (!host) {
      return NextResponse.json({ error: 'host non trovato' }, { status: 404 })
    }

    // Verifica struttura se passata
    if (strutturaId) {
      const struttura = await prisma.struttura.findFirst({
        where: { id: strutturaId, hostId },
        select: { id: true },
      })
      if (!struttura) {
        return NextResponse.json({ error: 'struttura non valida per questo host' }, { status: 400 })
      }
    }

    // Verifica MAC unico (solo se non placeholder)
    if (!macNorm.startsWith('PENDING-')) {
      const existing = await prisma.wifiDevice.findUnique({ where: { mac: macNorm } })
      if (existing) {
        return NextResponse.json({ error: `MAC ${macNorm} già registrato (device ${existing.id})` }, { status: 409 })
      }
    }

    // Genera token + hash
    const apiToken = generateWifiToken()
    const apiTokenHash = hashWifiToken(apiToken)

    // Crea WifiDevice nel DB
    const device = await prisma.wifiDevice.create({
      data: {
        hostId,
        strutturaId,
        alias,
        mac: macNorm,
        modello,
        apiTokenHash,
        stato: 'PENDING',
        note,
      },
    })

    // Patcha backup
    const patched = await buildPatchedBackup({
      factoryBuf,
      apiToken,
      deviceMac: macNorm,
      sshPubkey: sshPubkeyRaw,
    })

    const slugAlias = alias.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
    const filename = `otium_${slugAlias}_${macNorm}.file`

    logger.info('WifiDevice onboarded via portal', 'superadmin/wifi/onboard', {
      deviceId: device.id,
      hostId,
      alias,
      mac: macNorm,
      fileSize: patched.length,
    })

    return new NextResponse(patched as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Otium-Device-Id': device.id,
        'X-Otium-Mac': macNorm,
        'X-Otium-Token': apiToken,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('onboard-device error', 'superadmin/wifi/onboard', { msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
