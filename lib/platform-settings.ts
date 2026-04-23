import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * Platform Settings — configurazione globale della piattaforma Otium.
 * Singleton: esiste una sola riga con id="singleton".
 *
 * Include: dati generali, SMTP piattaforma, AI, piani override, maintenance mode.
 * Secret (smtpPass, aiApiKey) da cifrare con lib/crypto.ts prima del save.
 */

export type PlatformSettingsData = {
  id: string
  // Generale
  nomePiattaforma: string | null
  urlBase: string | null
  emailSupporto: string | null
  emailNoreply: string | null
  // SMTP
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  smtpFrom: string | null
  // AI
  aiProvider: string | null
  aiModel: string | null
  aiApiKey: string | null
  aiBaseUrl: string | null
  // Piani
  pianiOverride: unknown
  // Maintenance
  maintenanceMode: boolean
  maintenanceMessage: string | null
  // Tracking
  ultimaEsecuzioneRetentionAt: Date | null
  ultimaEsecuzioneRetentionCompletata: boolean
  ultimaEsecuzioneRetentionReport: unknown
  updatedAt: Date
  createdAt: Date
}

/**
 * Legge (o crea) la riga singleton. Non lancia: crea con default sicuri se mancante.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
  if (existing) return existing as PlatformSettingsData

  return (await prisma.platformSettings.create({
    data: {
      id: 'singleton',
      aiProvider: 'claude',
      aiModel: 'claude-haiku-4-5-20251001',
    },
  })) as PlatformSettingsData
}

/** Aggiorna (o crea) singleton con i campi passati. */
export async function updatePlatformSettings(
  data: Partial<Omit<PlatformSettingsData,
    'id' | 'updatedAt' | 'createdAt'
    | 'ultimaEsecuzioneRetentionAt' | 'ultimaEsecuzioneRetentionCompletata' | 'ultimaEsecuzioneRetentionReport'>>,
): Promise<PlatformSettingsData> {
  const { pianiOverride, ...rest } = data
  const jsonValue =
    pianiOverride === undefined
      ? undefined
      : pianiOverride === null
        ? Prisma.JsonNull
        : (pianiOverride as Prisma.InputJsonValue)
  const payload = {
    ...rest,
    ...(jsonValue !== undefined ? { pianiOverride: jsonValue } : {}),
  }
  return (await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...payload },
    update: payload,
  })) as PlatformSettingsData
}

/**
 * Maintenance mode check — middleware lo usa per bloccare pagine pubbliche.
 */
export async function isMaintenanceActive(): Promise<{ active: boolean; message: string }> {
  try {
    const s = await getPlatformSettings()
    return {
      active: s.maintenanceMode,
      message: s.maintenanceMessage ?? 'Stiamo aggiornando la piattaforma. Torniamo presto.',
    }
  } catch {
    return { active: false, message: '' }
  }
}
