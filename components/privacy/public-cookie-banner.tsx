'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const CookieBanner = dynamic(() => import('./cookie-banner'), { ssr: false })

const PUBLIC_PREFIXES = ['/book', '/checkin', '/privacy', '/registrazione', '/kiosk']

/**
 * Mostra il cookie banner solo sulle route pubbliche guest-facing.
 * Le route host/admin/superadmin hanno il loro flusso di consenso GDPR.
 */
export default function PublicCookieBanner() {
  const pathname = usePathname()
  if (!pathname) return null
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!isPublic) return null
  return <CookieBanner />
}
