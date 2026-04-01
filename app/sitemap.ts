import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otiumweek.it'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pagine statiche
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/book`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/cookie-policy`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Pagine dinamiche: strutture attive
  let strutturePages: MetadataRoute.Sitemap = []
  try {
    const strutture = await prisma.struttura.findMany({
      where: { attiva: true },
      select: { id: true, updatedAt: true },
    })

    strutturePages = strutture.map((s) => ({
      url: `${BASE_URL}/book/${s.id}`,
      lastModified: s.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // Se il DB non è raggiungibile, restituisci solo le pagine statiche
  }

  return [...staticPages, ...strutturePages]
}
