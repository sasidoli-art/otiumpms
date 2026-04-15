import { prisma } from '@/lib/db'

/**
 * Platform Settings — configurazione globale della piattaforma Otium.
 * Singleton: esiste una sola riga con id="singleton".
 *
 * Uso tipico:
 *   const settings = await getPlatformSettings()
 *   const provider = settings.aiProvider ?? 'claude'
 */

export type PlatformSettingsData = {
  id: string
  aiProvider: string | null
  aiModel: string | null
  aiApiKey: string | null
  aiBaseUrl: string | null
  updatedAt: Date
  createdAt: Date
}

/**
 * Legge (o crea) la riga singleton delle impostazioni piattaforma.
 * Non lancia mai: se il DB non ha la riga, la crea con default sicuri.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  const existing = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
  })

  if (existing) return existing

  return prisma.platformSettings.create({
    data: {
      id: 'singleton',
      aiProvider: 'claude',
      aiModel: 'claude-haiku-4-5-20251001',
    },
  })
}

/**
 * Aggiorna le impostazioni piattaforma. Se la riga non esiste, la crea.
 */
export async function updatePlatformSettings(
  data: Partial<Omit<PlatformSettingsData, 'id' | 'updatedAt' | 'createdAt'>>
): Promise<PlatformSettingsData> {
  return prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      aiProvider: data.aiProvider ?? 'claude',
      aiModel: data.aiModel ?? 'claude-haiku-4-5-20251001',
      aiApiKey: data.aiApiKey ?? null,
      aiBaseUrl: data.aiBaseUrl ?? null,
    },
    update: data,
  })
}
