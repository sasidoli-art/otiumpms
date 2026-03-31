import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import { PwaProvider } from '@/components/pwa-provider'

export const metadata: Metadata = {
  title: 'Otium Week — Gestionale',
  description: 'Pannello di gestione per host e admin di Otium Week',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Otium Week',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>{children}</Providers>
        <PwaProvider />
      </body>
    </html>
  )
}
