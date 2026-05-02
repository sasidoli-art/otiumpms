import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { audit } from '@/lib/audit'
import { generateWifiToken, hashWifiToken } from '@/lib/wifi/auth'
import {
  buildPatchedBackup,
  generatePlaceholderMac,
  structureToSlug,
} from '@/lib/wifi/backup-builder'
import { z } from 'zod'

/**
 * POST /api/superadmin/wifi/onboard
 *
 * Crea un nuovo WifiDevice + genera il backup .tar.gz patchato pronto da
 * caricare via Web UI Restore sul router factory-default.
 *
 * Flow self-service:
 *   1. Operator sceglie struttura + customizza nome SSID/staff password
 *   2. Endpoint crea WifiDevice (MAC = placeholder PENDING-XXXXXXXX)
 *   3. Builda tar.gz con tutto (auth, network, dual SSID, agent, wifidog)
 *   4. Ritorna { backupBase64, filename, apiToken (one-time), placeholderMac, deviceId }
 *   5. Operator carica il file su un router fresh (Web UI → Manage Config → Restore)
 *   6. Router reboota, agent fa heartbeat, requireWifiDeviceWithBootstrap binda
 *      il MAC reale al device (PENDING-XXXXXXXX → AABBCCDDEEFF)
 *   7. Device appare ONLINE su /superadmin/wifi
 */

const bodySchema = z.object({
  strutturaId: z.string().min(1),
  alias: z.string().min(1).max(100).optional(),
  modello: z.enum(['CF-AC50', 'CF-AC100', 'CF-AC101', 'CF-AC300']).default('CF-AC101'),
  staffPassword: z
    .string()
    .min(8, 'Password staff deve avere almeno 8 caratteri (WPA2 minimum)')
    .max(63, 'Password staff massimo 63 caratteri (WPA2 maximum)'),
  splashUrl: z.string().url().optional().nullable(),
  /** Override SSID guest (default = nome struttura sanitizzato) */
  ssidGuestOverride: z.string().min(1).max(32).optional(),
  /** Override SSID staff (default = "<guest>-Staff") */
  ssidStaffOverride: z.string().min(1).max(32).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  // Parse & validate body
  const json = await req.json().catch(() => null)
  if (!json) {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validazione fallita', issues: parsed.error.format() },
      { status: 422 },
    )
  }
  const data = parsed.data

  // Lookup struttura + host (per hostId univoco)
  const struttura = await prisma.struttura.findUnique({
    where: { id: data.strutturaId },
    select: {
      id: true,
      nome: true,
      hostId: true,
      host: { select: { id: true, nomeAzienda: true, moduliAttivi: true } },
    },
  })
  if (!struttura) {
    return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })
  }

  // SSID + hostname defaults derivati dal nome struttura
  const slug = structureToSlug(struttura.nome) || `Struttura${struttura.id.slice(-4)}`
  const ssidGuest = data.ssidGuestOverride ?? slug
  const ssidStaff = data.ssidStaffOverride ?? `${slug}-Staff`
  const hostname = `COMFAST-${slug}`
  const alias = data.alias ?? `${struttura.nome} - ${data.modello}`

  // SSH pubkey: usa quella dell'operatore Otium (claude@desktop, id_router)
  // È embedded come constant per evitare dipendenze runtime fragili.
  const sshPubkey = OTIUM_OPERATOR_SSH_PUBKEY

  // Genera token + hash + placeholder MAC
  const apiToken = generateWifiToken()
  const apiTokenHash = hashWifiToken(apiToken)
  const placeholderMac = generatePlaceholderMac(apiTokenHash)

  // Crea WifiDevice in DB
  const splashConfig = data.splashUrl ? { linkRedirect: data.splashUrl } : undefined
  let device
  try {
    device = await prisma.wifiDevice.create({
      data: {
        hostId: struttura.hostId,
        strutturaId: struttura.id,
        alias,
        mac: placeholderMac,
        modello: data.modello,
        apiTokenHash,
        stato: 'PENDING',
        note: `Self-service onboarding — staff WPA2 password: ${data.staffPassword}`,
        ...(splashConfig ? { splashConfig } : {}),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Creazione WifiDevice fallita', detail: String(err) },
      { status: 500 },
    )
  }

  // Build backup .tar.gz in memoria
  let backup: Buffer
  try {
    backup = await buildPatchedBackup({
      apiToken,
      deviceMacPlaceholder: placeholderMac,
      ssidGuest,
      ssidStaff,
      staffPassword: data.staffPassword,
      hostname,
      sshPubkey,
    })
  } catch (err) {
    // Rollback device
    await prisma.wifiDevice.delete({ where: { id: device.id } }).catch(() => {})
    return NextResponse.json(
      { error: 'Build backup fallita', detail: String(err) },
      { status: 500 },
    )
  }

  await audit({
    userId: auth.user.id,
    userEmail: auth.user.email,
    hostId: struttura.hostId,
    azione: 'wifi.device.onboard',
    entita: 'wifi_device',
    entitaId: device.id,
    dettagli: `Onboarding self-service "${alias}" per ${struttura.host.nomeAzienda} → ${struttura.nome}`,
    datiJson: {
      strutturaId: struttura.id,
      modello: data.modello,
      ssidGuest,
      ssidStaff,
      placeholderMac,
      hostname,
    },
  })

  // Filename pulito (usato come Content-Disposition + suggerimento browser)
  const safeFilename = `otium-wifi-${slug}-${data.modello}-${device.id.slice(-6)}.file`

  return NextResponse.json({
    ok: true,
    device: {
      id: device.id,
      placeholderMac,
      alias,
      modello: data.modello,
      hostId: struttura.hostId,
      strutturaId: struttura.id,
      strutturaNome: struttura.nome,
      hostNome: struttura.host.nomeAzienda,
    },
    config: {
      ssidGuest,
      ssidStaff,
      hostname,
      apiUrlBase: 'https://otium-pms.vercel.app/api/wifi',
      gatewayIp: '172.20.0.1',
      gatewaySubnet: '172.20.0.0/24',
    },
    apiToken,
    apiTokenWarning: 'Salva questo token: viene mostrato solo una volta.',
    staffWifiPassword: data.staffPassword,
    backup: {
      filename: safeFilename,
      size: backup.length,
      base64: backup.toString('base64'),
    },
  })
}

// ─── SSH pubkey embedded (operator Otium master key) ──────────────────────────
// Tenuta come constant per evitare fs/env. Se mai si vuole rotare, basta
// riemettere e fare provisioning di tutti i device con backup nuovo. Non è un
// segreto: è SOLO una pubkey, la corrispondente privata sta sul PC di Mirko.
const OTIUM_OPERATOR_SSH_PUBKEY =
  'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC1MlWS5PqljcmdkGsElzYp9/rQFdot/AyV3F5v8UHvQHxM/yHU/UPtJYyX/rJ94dO+TXCiPvXjqlLdw+YudY0luzTzx4b+8rPQccBzTW+BjxAru4Ab6R3KGa2oJ1iE4q2hiyXmT1MxEosd4J0piHY5x+XbUvpHP4VXdtL9i9y9BRwkZAXk4MKswTQKeokCdAnTtBePfkvBoQwTxRD9vvu10TE96v2GgU1yZ59TUFzleXtB1hT4Zot6TibbFZQ+k5kfuHd6vwACFJGj6J3HagTAx5i5hIJ9CdbwsERdlUHjAmR5/kZrDXq/GRCY4+B047pdazX7K5Zi5Csd/EAaLPLf claude@desktop'
