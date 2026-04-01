'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useState } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCALE_LABELS: Record<string, { flag: string; short: string }> = {
  it: { flag: '🇮🇹', short: 'IT' },
  en: { flag: '🇬🇧', short: 'EN' },
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function switchLocale(newLocale: string) {
    setOpen(false)
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })
    router.refresh()
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors text-sm"
        title="Language"
      >
        <Globe size={15} />
        <span className="text-xs font-medium">{LOCALE_LABELS[locale]?.short ?? 'IT'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 py-1 z-50 min-w-[120px]">
          {Object.entries(LOCALE_LABELS).map(([key, { flag, short }]) => (
            <button
              key={key}
              onClick={() => switchLocale(key)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                key === locale
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              <span>{flag}</span>
              <span>{short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
