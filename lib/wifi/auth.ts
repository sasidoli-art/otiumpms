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
