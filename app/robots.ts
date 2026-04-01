import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/host/', '/admin/', '/superadmin/', '/api/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://otiumweek.it'}/sitemap.xml`,
  }
}
