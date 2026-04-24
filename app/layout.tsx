import type { Metadata, Viewport } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import './globals.css'

// Sans-serif: UI, body, dashboard. Unica famiglia per la dashboard host.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
})

// Serif: SOLO per pagine pubbliche (booking/check-in/landing) + heading email.
// NON usato nella dashboard host.
const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-serif',
  display: 'swap',
})
import { Providers } from './providers'
import { PwaProvider } from '@/components/pwa-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { ToastProvider } from '@/components/ui/toast'
import PublicCookieBanner from '@/components/privacy/public-cookie-banner'

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

// Force dynamic rendering — never prerender statically
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} ${dmSerif.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers><ThemeProvider>{children}</ThemeProvider></Providers>
          <PwaProvider />
          <ToastProvider />
          <PublicCookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
