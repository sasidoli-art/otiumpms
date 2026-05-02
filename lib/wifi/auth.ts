/**
 * Auth bearer token per le route agent-facing Wi-Fi.
 *
 * Gli agent installati sui controller Comfast si autenticano con un token
 * random generato al provisioning. Il token in chiaro non è mai salvato a DB:
 * lo memorizziamo come hash (sha256) in `WifiDevice.apiTokenHash`.
 *
 * Uso nel route handler:
 *   const device = await requireWifiDevice(req, mac)
 *   if (device instanceof NextResponse) return device
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import type { WifiDevice } from '@prisma/client'

export function hashWifiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateWifiToken(): string {
  // 32 byte = 64 hex char, ampiamente sufficiente per bearer random
  return randomBytes(32).toString('hex')
}

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

/**
 * Verifica che la richiesta venga dall'agent registrato per il MAC dato.
 * Ritorna il device o una NextResponse 401/404 da restituire direttamente.
 */
export async function requireWifiDevice(
  req: NextRequest,
  mac: string,
): Promise<WifiDevice | NextResponse> {
  const token = extractBearer(req)
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }

  const device = await prisma.wifiDevice.findUnique({ where: { mac } })
  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  if (device.apiTokenHash !== hashWifiToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  return device
}

/**
 * Variante con bootstrap: se il MAC nell'URL non corrisponde a nessun device,
 * cerca un device con `mac` che inizia per "PENDING-" e bearer token corrispondente.
 * Se trovato, aggiorna il MAC del device col valore reale ricevuto e ritorna il device.
 *
 * Usato dall'endpoint heartbeat: il flow "self-service" produce un backup con
 * placeholder MAC nel `agent.conf` (es. "PENDING-AB12CD34"). Al primo boot
 * l'agent rileva il proprio MAC reale dal kernel e lo usa nelle chiamate.
 * Backend riconosce la prima volta tramite il token e fa il "binding" del MAC.
 */
export async function requireWifiDeviceWithBootstrap(
  req: NextRequest,
  mac: string,
): Promise<WifiDevice | NextResponse> {
  const token = extractBearer(req)
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 })
  }

  // Match diretto MAC reale → device già registrato
  let device = await prisma.wifiDevice.findUnique({ where: { mac } })

  if (!device) {
    // Bootstrap: cerca un device PENDING-* con stesso token
    const tokenHash = hashWifiToken(token)
    const pending = await prisma.wifiDevice.findFirst({
      where: {
        apiTokenHash: tokenHash,
        mac: { startsWith: 'PENDING-' },
      },
    })
    if (pending) {
      // Bind: sostituisci placeholder con MAC reale
      device = await prisma.wifiDevice.update({
        where: { id: pending.id },
        data: { mac, stato: 'ONLINE', ultimoHeartbeatAt: new Date() },
      })
    }
  }

  if (!device) {
    return NextResponse.json({ error: 'Device not found' }, { status: 404 })
  }

  if (device.apiTokenHash !== hashWifiToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  return device
}
