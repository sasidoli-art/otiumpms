import createNextIntlPlugin from 'next-intl/plugin'
import createBundleAnalyzer from '@next/bundle-analyzer'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false, // genera HTML ma non apre browser (CI-friendly)
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit'],

  skipTrailingSlashRedirect: true,

  // Ottimizza tree-shaking di librerie "barrel" pesanti. Riduce il bundle
  // importando solo le icone/componenti usati invece dell'intera lib.
  experimental: {
    optimizePackageImports: [
      'lucide-react',    // ~800 icone; usare solo quelle importate
      'recharts',        // charting lib, solo i chart usati
      'framer-motion',   // animation lib
      'date-fns',        // date utils, solo le funzioni usate
    ],
  },

  // Immagini: AVIF/WebP + pattern per sorgenti remote ammesse
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Foto caricate via Supabase Storage (upload ospite/host)
      { protocol: 'https', hostname: '**.supabase.co' },
      // Foto Envato/stock per OtiumWeek (vetrina pubblica del brand)
      { protocol: 'https', hostname: 'elements-cover-images-0.imgix.net' },
      // Avatar host caricati su hosting esterno
      { protocol: 'https', hostname: 'i.imgur.com' },
    ],
  },

  async rewrites() {
    return [
      { source: '/api/wifi/wifidog/ping/', destination: '/api/wifi/wifidog/ping' },
      { source: '/api/wifi/wifidog/auth/', destination: '/api/wifi/wifidog/auth' },
      { source: '/api/wifi/wifidog/login/', destination: '/api/wifi/wifidog/login' },
      { source: '/api/wifi/wifidog/portal/', destination: '/api/wifi/wifidog/portal' },
    ]
  },

  // Headers di sicurezza HTTP
  async headers() {
    return [
      {
        // Escludi /api/wifi/wifidog/* dai security headers: il WebView Samsung
        // CaptivePortalLogin rifiuta pagine con X-Frame-Options DENY e mostra
        // data:text/html vuoto.
        source: '/:path((?!api/wifi/wifidog).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }] : []),
        ],
      },
      // Nota: Next.js 16 applica di default `Cache-Control: public, max-age=31536000, immutable`
      // agli asset `/_next/static/*` (hashed). Non serve header custom — Next avvisa
      // che override di quella regola può rompere il dev behavior.
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || ''
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(withNextIntl(nextConfig))
