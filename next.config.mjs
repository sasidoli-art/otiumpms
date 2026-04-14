import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit'],

  skipTrailingSlashRedirect: true,

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
        source: '/((?!api/wifi/wifidog).*)',
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

export default withNextIntl(nextConfig)
