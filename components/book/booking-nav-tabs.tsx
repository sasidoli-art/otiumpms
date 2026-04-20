'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BedDouble, Sparkles, UtensilsCrossed, Package } from 'lucide-react'
import type { StrutturaPubblica } from '@/lib/book/get-struttura-pubblica'

type Tab = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

export default function BookingNavTabs({ struttura }: { struttura: StrutturaPubblica }) {
  const pathname = usePathname() ?? ''
  const base = `/book/${struttura.id}`

  const tabs: Tab[] = []
  if (struttura.moduli.prenotazioni) {
    tabs.push({ href: `${base}/camere`, label: 'Camere', icon: BedDouble })
  }
  if (struttura.moduli.spa) {
    tabs.push({ href: `${base}/spa`, label: 'SPA', icon: Sparkles })
  }
  if (struttura.moduli.ristorazione) {
    tabs.push({ href: `${base}/ristorante`, label: 'Ristorante', icon: UtensilsCrossed })
  }
  if (struttura.moduli.pacchetti) {
    tabs.push({ href: `${base}/pacchetti`, label: 'Pacchetti', icon: Package })
  }

  if (tabs.length < 2) return null // niente tab se c'è solo un servizio

  return (
    <>
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={active ? { backgroundColor: 'var(--brand-primary)' } : undefined}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </Link>
        )
      })}
    </>
  )
}
